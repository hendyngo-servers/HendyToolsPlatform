# Hendy Tools Platform — Windows + Android + Website + Update Server

Repository: `ngogiaidy56-eng/HendyToolsApp`  
Worker hiện tại: `https://hendytoolsplatform.ngogiaidy56.workers.dev`  
R2 bucket: `hendy-tool-releases`

Bản cập nhật này bổ sung giao diện Premium xanh đậm cho website, trang Release Console, API lịch sử phát hành/changelog và lưu manifest snapshot vào R2. Windows/Android được build trên GitHub-hosted runners; website + Worker được triển khai bằng Cloudflare Workers Builds đang liên kết với nhánh `main`.

## Cấu trúc các phần

- `site/index.html`, `site/styles.css`, `site/app.js`: website tải ứng dụng Premium.
- `site/admin.html`, `site/admin.css`, `site/admin.js`: Release Console chỉ đọc, trạng thái các nền tảng, history/changelog và link tới workflow phát hành đã được GitHub xác thực.
- `src/index.ts`: Worker API `/healthz`, `/api/v1/releases/latest`, `/api/v1/releases/history`, `/api/v1/releases/download`.
- `scripts/publish_release.py`: kiểm tra checksum, lưu file phát hành vào R2, ghi snapshot lịch sử rồi cập nhật manifest mới nhất.
- `.github/workflows/build-and-publish-release.yml`: build installer Windows + APK Android và xuất bản lên R2.
- `.github/workflows/deploy-cloudflare.yml`: tùy chọn deploy thủ công từ GitHub Actions. Nếu đã dùng Cloudflare Workers Builds tự deploy khi push `main`, không cần chạy đồng thời workflow này.
- `hendy_tools_pro.py`: ứng dụng Windows có kiểm tra cập nhật khi mở app và tùy chọn kiểm tra thủ công.
- `mobile_app/`: ứng dụng Flutter Android companion có kiểm tra bản mới và mở luồng tải/cài đặt APK do người dùng xác nhận.

## A. Cập nhật source vào repository hiện tại qua trình duyệt

### Cách khuyến nghị: GitHub Codespaces (không dùng CMD trên máy Windows)

1. Tải file `HendyToolsApp_Premium_ReleaseConsole_Update.zip` đi kèm với bản cập nhật này.
2. Mở `https://github.com/ngogiaidy56-eng/HendyToolsApp` → **Code** → **Codespaces** → tạo Codespace từ nhánh `main`.
3. Trong VS Code chạy trên trình duyệt, tải ZIP vào thư mục gốc Codespace bằng File Explorer (**Upload Files**). ZIP phải nằm ở thư mục gốc Codespace.
4. Mở Terminal bên trong Codespaces (đây là môi trường cloud, không phải CMD trên PC) và chạy:

   ```bash
   unzip -o HendyToolsApp_Premium_ReleaseConsole_Update.zip -d .
   rm -f HendyToolsApp_Premium_ReleaseConsole_Update.zip
   git status --short
   git add -A
   git commit -m "Add premium release console and release history"
   git push origin main
   ```

5. Kiểm tra **Actions** trên GitHub và **Workers & Pages → Deployments** trên Cloudflare. Nếu trang build của Cloudflare tự triển khai khi có commit mới, chờ deployment báo thành công.

ZIP overlay có file nằm đúng đường dẫn cần thay đổi; không upload ZIP như một file bình thường rồi để nó nguyên trong repository. Đừng thay toàn bộ repo bằng một thư mục con có tên ZIP.

## B. Cấu hình Cloudflare một lần

Trong Cloudflare Workers & Pages, Worker phải có tên `hendytoolsplatform`. File `wrangler.toml` cũng đặt `name = "hendytoolsplatform"` để tránh cảnh báo tên khác nhau.

R2 bucket cần khớp đúng:

```toml
[[r2_buckets]]
binding = "RELEASES"
bucket_name = "hendy-tool-releases"
```

Ảnh build hiện tại của bạn đã cho thấy Cloudflare nhận `env.RELEASES (hendy-tool-releases)` và `env.ASSETS`; chỉ cần giữ đúng các giá trị này.

Trong Cloudflare Workers Builds, build/deploy command tối giản có thể là:

```bash
npx wrangler deploy
```

Không cần `pip install -r requirements.txt` để deploy Worker: `requirements.txt` phục vụ ứng dụng desktop Python, không phải Worker TypeScript. Có thể bỏ lệnh pip khỏi cấu hình build Cloudflare để giảm thời gian và tránh cài thư viện desktop ở môi trường server.

## C. GitHub Actions Secrets / Variables

Để build và publish release từ GitHub Actions:

**Settings → Secrets and variables → Actions → Secrets** tạo:

- `CLOUDFLARE_API_TOKEN`: token có quyền tối thiểu cần thiết để deploy Worker và ghi object vào R2.
- `CLOUDFLARE_ACCOUNT_ID`: Account ID Cloudflare.
- `ANDROID_KEYSTORE_BASE64`: keystore Android đã mã hóa base64.
- `ANDROID_KEY_ALIAS`: alias của khóa ký.
- `ANDROID_STORE_PASSWORD`: mật khẩu keystore.
- `ANDROID_KEY_PASSWORD`: mật khẩu khóa.

**Settings → Secrets and variables → Actions → Variables** tạo:

- `HENDY_UPDATE_BASE_URL` = `https://hendytoolsplatform.ngogiaidy56.workers.dev`

Thay URL ở trên nếu bạn dùng custom domain hoặc Worker URL khác. Không đưa API token, password, keystore hoặc chuỗi base64 của keystore vào source code, issue, log hay website.

### Khóa ký Android

APK tải trực tiếp phải được ký cùng một khóa qua các phiên bản để Android chấp nhận cài đè bản cũ. Nếu chưa có keystore, tạo một lần trong môi trường cloud an toàn (ví dụ Codespaces), lưu bốn giá trị trên thành GitHub Secrets và giữ bản dự phòng mã hóa ngoại tuyến. Không commit file `.jks`/`.keystore` vào repository. Không làm mất khóa ký.

## D. Phát hành phiên bản Windows + Android

1. Mở repository → **Actions** → **Build and publish Hendy release**.
2. Nhấn **Run workflow**.
3. Nhập phiên bản dạng `3.2.0`, build number lớn hơn bản trước, ghi chú changelog và minimum supported version; chọn mandatory chỉ khi thật sự cần.
4. Workflow tạo installer Windows trên runner Windows và APK trên runner Ubuntu, tính SHA-256, upload binary lên R2, lưu manifest snapshot trong `history/<platform>/<channel>/`, rồi cập nhật manifest mới nhất.
5. Mở `/admin.html` để kiểm tra release state, changelog và history; mở `/` để kiểm tra các nút tải xuống.

Ví dụ URL:

- Website: `https://hendytoolsplatform.ngogiaidy56.workers.dev/`
- Release Console: `https://hendytoolsplatform.ngogiaidy56.workers.dev/admin.html`
- Health: `https://hendytoolsplatform.ngogiaidy56.workers.dev/healthz`
- Latest Windows: `/api/v1/releases/latest?platform=windows&channel=stable&current=0.0.0&build=0`
- Latest Android: `/api/v1/releases/latest?platform=android&channel=stable&current=0.0.0&build=0`
- Windows download: `/api/v1/releases/download?platform=windows&channel=stable`
- Android download: `/api/v1/releases/download?platform=android&channel=stable`
- Release history: `/api/v1/releases/history?platform=windows&channel=stable&limit=20`

## E. Trang quản trị phát hành và bảo mật

`/admin.html` là Release Console: xem phiên bản/changelog/historic manifests và mở GitHub Actions để tạo bản phát hành. Bản này **không** chứa API token, keystore hay một endpoint upload công khai. Quyền phát hành thực sự được bảo vệ bởi quyền truy cập GitHub Actions của repository; người dùng cần đăng nhập GitHub và có quyền chạy workflow để publish.

Việc thay đổi metadata phiên bản/changelog diễn ra thông qua input của workflow, không qua JavaScript công khai. Đây là lựa chọn an toàn hơn so với nhúng một admin token cố định vào `admin.js`.

## F. Hạn chế nền tảng và xác minh

- Windows: website phân phối installer EXE trực tiếp. Nên ký Authenticode trước khi phân phối rộng; SHA-256 chỉ xác nhận file khớp với manifest, không chứng minh danh tính nhà phát hành.
- Android: website phân phối APK trực tiếp. Người dùng có thể phải cho phép cài ứng dụng từ trình duyệt và xác nhận cài đặt. Updater chỉ thông báo/tải/mở trình cài đặt; không tự cài lén trong nền.
- iOS: Release Console chỉ hiển thị thông tin/phương thức phân phối đã cấu hình. Không thể đảm bảo cài IPA trực tiếp cho mọi iPhone chỉ bằng hosting; cần phương thức phân phối và ký số được Apple cho phép.
- History: các release xuất bản từ sau khi có snapshot sẽ lưu lịch sử. Những phiên bản đã công bố trước đó không thể tự tái tạo snapshot nếu chưa có manifest cũ.
- Mã nguồn được kiểm tra cú pháp và cấu trúc trong môi trường làm việc; cần chạy workflow thật sau khi áp dụng và thêm secrets để xác nhận build EXE/APK và quyền R2 của tài khoản bạn.
