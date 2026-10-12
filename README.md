# Hendy Tools — GitHub → Cloudflare → Direct Download

Bộ khung phát hành dành cho người muốn quản lý source bằng giao diện GitHub và để cloud build/deploy. Không cần cài Node.js, Python, Flutter, Inno Setup hoặc chạy lệnh trên máy Windows để build bản phát hành.

## Kiến trúc

- `src/index.ts`: Cloudflare Worker API, đọc manifest và tải binary từ R2.
- `site/`: giao diện website tiếng Việt, công khai nút tải bộ cài Windows và APK Android.
- `wrangler.toml`: triển khai Worker và website assets cùng một lần.
- `hendy_tools_pro.py`: ứng dụng desktop Windows.
- `mobile_app/`: mã Flutter; workflow tạo thư mục native Android/iOS trong runner cloud.
- `.github/workflows/deploy-cloudflare.yml`: tự deploy website + API khi push lên `main`.
- `.github/workflows/build-and-publish-release.yml`: build Windows installer và Android APK trên GitHub-hosted runners, tải gói lên R2, rồi cập nhật manifest.

> iOS được cố ý xử lý khác Android. Website có thể giới thiệu bản iOS và mở URL phân phối, nhưng không thể biến một file IPA bất kỳ thành bản cài công khai cho mọi iPhone. Phân phối website của Apple yêu cầu đủ điều kiện, phê duyệt và giới hạn khu vực; luồng này chưa tự build/ký IPA.

## A. Thiết lập một lần (chỉ dùng trình duyệt)

### 1. Đưa source vào GitHub

1. Tạo repository mới trên GitHub, ví dụ `hendy-tools-release-platform` (khuyên dùng **Private** trong giai đoạn đầu).
2. Trên trang repo, chọn **Add file → Upload files** rồi tải lên file `Hendy_GitHub_Cloudflare_Direct_Download_Source.zip` (giữ nguyên tên tệp cũng được), sau đó commit.
3. Nhấn **Code → Codespaces → Create codespace on main**. Trong terminal bên trong Codespaces (chạy trên cloud, không phải CMD Windows), chạy:

   ```bash
   unzip -o Hendy_GitHub_Cloudflare_Direct_Download_Source.zip
   cp -a Hendy_GitHub_Cloudflare_Direct_Download/. .
   rm -rf Hendy_GitHub_Cloudflare_Direct_Download Hendy_GitHub_Cloudflare_Direct_Download_Source.zip
   git add -A
   git commit -m "Set up Hendy direct download platform"
   git push
   ```

   Nếu tên thư mục giải nén hiển thị khác, dùng đúng tên đó ở lệnh `cp` và `rm`. Sau bước này các file như `README.md`, `wrangler.toml`, `src/`, `site/`, `mobile_app/`, `scripts/` và `.github/` phải nằm ở thư mục gốc repo.
4. Không commit token, keystore, mật khẩu, file `credentials.json` hay `token.json`.

Từ sau đó, dùng GitHub web editor/Codespaces để sửa code. Mỗi commit vào `main` có thay đổi ở `src/`, `site/` hoặc file cấu hình sẽ kích hoạt workflow deploy.

### 2. Tạo R2 bucket

Trong Cloudflare Dashboard:

1. Mở **R2 Object Storage**.
2. Tạo bucket tên chính xác `hendy-tool-releases`.
3. Giữ bucket private. Website tải qua Worker API; không cần bật public bucket hoặc public `r2.dev`.

Workflow deploy cũng thử tạo bucket nếu bucket chưa tồn tại, nhưng cần quyền R2 phù hợp.

### 3. Thêm GitHub Actions secrets

Trong GitHub repo → **Settings → Secrets and variables → Actions → Secrets**, tạo:

- `CLOUDFLARE_API_TOKEN`: API Token cho phép quản lý Workers và ghi R2 của đúng tài khoản.
- `CLOUDFLARE_ACCOUNT_ID`: Account ID Cloudflare.

Tạo token có quyền tối thiểu thích hợp cho deploy Worker và R2 write/edit. Không đặt token trong source code hoặc file của website. Bật MFA trên tài khoản Cloudflare.

### 4. Deploy lần đầu

1. Mở tab **Actions** trong GitHub.
2. Chọn **Deploy Hendy Website + Update API**.
3. Nhấn **Run workflow** và chọn branch `main`.
4. Khi workflow thành công, mở URL `workers.dev` của Worker `hendy-tools-download` trong Cloudflare Dashboard.
5. Kiểm tra `<WORKER_URL>/healthz`. Kết quả phải có `"ok": true`.

Website tải ứng dụng và API cùng dùng một hostname. Không cần tạo Cloudflare Pages project riêng cho mẫu này; Worker Static Assets phục vụ website và API Worker trả manifest/download.

### 5. Tạo khóa ký Android (một lần, trong Codespaces)

APK direct-download phải dùng cùng một khóa ký giữa các phiên bản để Android cho phép cập nhật đè bản cũ. Tạo khóa một lần trong terminal Codespaces, **không đưa file keystore vào repository**:

```bash
keytool -genkeypair -v -keystore hendy-release-key.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias hendy_release
base64 -w 0 hendy-release-key.jks
```

Khi keytool hỏi mật khẩu, hãy đặt mật khẩu mạnh và lưu an toàn. Nên dùng cùng mật khẩu cho store và key password nếu muốn đơn giản hóa.

Trong GitHub repo → **Settings → Secrets and variables → Actions → Secrets**, tạo bốn secrets:

- `ANDROID_KEYSTORE_BASE64`: toàn bộ chuỗi base64 mà lệnh thứ hai in ra.
- `ANDROID_KEY_ALIAS`: `hendy_release` (hoặc alias bạn đã dùng).
- `ANDROID_STORE_PASSWORD`: mật khẩu keystore.
- `ANDROID_KEY_PASSWORD`: mật khẩu key.

Sau khi đã lưu secrets, xóa `hendy-release-key.jks` khỏi Codespaces và không đưa chuỗi base64 vào issue, pull request, mã nguồn hoặc log. Không làm mất khóa/mật khẩu: các bản Android cập nhật phải được ký bằng cùng khóa. Nếu mất khóa, người dùng có thể phải gỡ bản cũ (và mất dữ liệu cục bộ) trước khi cài một ứng dụng được ký bằng khóa khác.

### 6. Thêm URL Worker vào GitHub Variables

Trong GitHub repo → **Settings → Secrets and variables → Actions → Variables → New repository variable**:

- Name: `HENDY_UPDATE_BASE_URL`
- Value: URL Worker thật, ví dụ `https://hendy-tools-download.<subdomain-tai-khoan>.workers.dev` (thay bằng URL hiển thị trong Dashboard, không dùng nguyên ví dụ).

Không thêm dấu `/` ở cuối. URL này được ghi vào bản Windows và truyền vào bản Flutter lúc build. Nếu đổi custom domain/Worker URL, cập nhật variable trước lần phát hành kế tiếp.

## B. Phát hành Windows + Android mà không dùng máy Windows để build

Sau khi deploy Worker và thêm variable nói trên:

1. Mở GitHub → **Actions**.
2. Chọn **Build and publish Hendy release** → **Run workflow**.
3. Nhập version, build number tăng dần và ghi chú; ví dụ `3.2.0`, build `30200`.
4. Nhấn **Run workflow**. GitHub-hosted runner sẽ build Windows `.exe`/installer và Android `.apk`; sau đó upload packages/manifest lên R2.
5. Mở website Worker để thấy phiên bản mới và nút tải trực tiếp.

Lần sau chỉ việc chọn **Run workflow** với version/build mới. Người dùng có thể tải `.exe` trực tiếp trên Windows và `.apk` trực tiếp trên Android mà không qua Microsoft Store/Google Play. Trên Android, người dùng có thể phải cho phép trình duyệt cài ứng dụng từ nguồn này và xác nhận cài đặt.

## C. Tải trực tiếp và cập nhật

- `GET /api/v1/releases/latest?platform=windows&channel=stable&current=0.0.0&build=0`
- `GET /api/v1/releases/latest?platform=android&channel=stable&current=0.0.0&build=0`
- `GET /api/v1/releases/download?platform=windows&channel=stable`
- `GET /api/v1/releases/download?platform=android&channel=stable`
- `GET /healthz`

Tải binary dùng tên file/manifest từ bản phát hành hiện hành. Worker chỉ chấp nhận đường dẫn object đã xác thực trong manifest. Publisher tải object trước rồi mới thay manifest latest để tránh trỏ tới file chưa tải xong.

## D. Ghi chú bảo mật và giới hạn

1. `SHA-256` kiểm tra tính toàn vẹn so với manifest; không thay thế chữ ký số nhà phát hành. Ký bộ cài Windows bằng Authenticode trước khi phân phối công khai để tăng khả năng xác minh nguồn phát hành.
2. APK tải trực tiếp vẫn cần chữ ký Android. Bản cập nhật phải được ký bằng cùng key phù hợp với bản đã cài và dùng package ID/version code nhất quán.
3. Workflow release chỉ nên chạy bởi chủ repository/người phát hành tin cậy. Bảo vệ branch `main`, bật MFA và giới hạn quyền ghi.
4. Mẫu này chưa cung cấp giao diện upload có mật khẩu trên website công khai. Việc phát hành file được chạy từ GitHub Actions, nơi Cloudflare token lưu dưới dạng encrypted secret; cách này tránh đưa quyền ghi R2 vào JavaScript công khai.
5. iOS: chỉ đặt URL iOS vào manifest khi đã có phương thức phân phối hợp lệ (ví dụ App Store/TestFlight hoặc website distribution đủ điều kiện và được Apple chấp thuận). File IPA không thể được cài tự do trên mọi thiết bị iOS chỉ nhờ hosting.
6. Android cho phép phát hành APK từ website, nhưng người dùng phải xác nhận cài ứng dụng ngoài cửa hàng. Google cũng đang triển khai xác minh nhà phát triển cho phân phối Android ngoài Google Play: từ 30/09/2026 ở một số khu vực và dự kiến mở rộng toàn cầu trong năm 2027. Hãy theo dõi hướng dẫn Android Developer Console nếu phân phối rộng rãi.
7. Chưa có tài khoản Cloudflare/GitHub được kết nối trong gói này; bạn vẫn cần thực hiện thiết lập một lần trên Dashboard. Mã nguồn không tự tạo tài nguyên trên tài khoản người dùng khi chưa được cấp quyền.

## Cấu trúc chính

```text
.
├── .github/workflows/
│   ├── deploy-cloudflare.yml
│   └── build-and-publish-release.yml
├── src/index.ts
├── site/                  # Download website
├── scripts/               # Stamp versions + publish manifests
├── installer/HendyTools.iss
├── mobile_app/            # Flutter source
├── hendy_tools_pro.py
├── requirements.txt
├── package.json
└── wrangler.toml
```
