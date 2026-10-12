# HendyToolsApp — Premium UI Redesign (2 HTML pages)

## Mục tiêu
Bản cập nhật tập trung vào giao diện, giữ tách riêng hai trang HTML:

- `site/index.html`: website công khai cho tải ứng dụng, phiên bản, changelog và hướng dẫn.
- `site/admin.html`: Release Console để xem trạng thái Windows/Android/iOS, lịch sử phát hành và mở workflow phát hành.

## Các file trong gói

| File | Vai trò |
| --- | --- |
| `site/index.html` | Giao diện tải ứng dụng mới |
| `site/styles.css` | Thiết kế responsive cho trang tải |
| `site/app.js` | Kết nối API phiên bản và liên kết tải hiện có |
| `site/admin.html` | Giao diện quản trị phát hành riêng |
| `site/admin.css` | Thiết kế dashboard quản trị |
| `site/admin.js` | Lấy trạng thái API, phiên bản, checksum/changelog và lịch sử |
| `site/favicon.svg` | Biểu tượng thương hiệu |

## Phong cách mới
- Nền midnight navy, điểm nhấn xanh điện và xanh mint.
- Trang tải có hero giới thiệu, mô phỏng giao diện sản phẩm, thẻ Windows/Android/iOS, thông tin checksum và changelog.
- Trang quản trị có sidebar điều hướng, trạng thái từng kênh phát hành, thẻ tóm tắt, lịch sử và CTA GitHub Actions.
- Responsive cho màn hình máy tính, tablet và điện thoại; hỗ trợ `prefers-reduced-motion`.
- Không còn form đăng nhập với tài khoản/mật khẩu hardcode ở phía trình duyệt. Quyền phát hành thật phải được kiểm soát bởi GitHub.

## Đưa lên GitHub bằng trình duyệt

### Cách A — GitHub Codespaces (khuyến nghị)
1. Mở repository: <https://github.com/ngogiaidy56-eng/HendyToolsApp>.
2. Tạo Codespace từ nhánh `main` (nếu tài khoản có Codespaces).
3. Tải gói overlay về, upload vào workspace Codespaces.
4. Giải nén overlay tại thư mục gốc của repository, sao cho file ghi đè vào `site/` hiện có.
5. Kiểm tra `git status`, commit các thay đổi `site/` và push lên `main`.
6. Mở Cloudflare Workers & Pages → `hendytoolsplatform` → Deployments, theo dõi lần deploy tự động.

Terminal sử dụng trong bước giải nén là terminal chạy trên Codespaces, không phải CMD trên máy Windows cá nhân.

### Cách B — chỉnh từng file trong GitHub web
Mở thư mục `site/`, chọn file như `index.html`, `styles.css`, `admin.html`, `admin.css`, `app.js`, `admin.js`, nhấn biểu tượng bút chì, thay nội dung bằng file tương ứng trong gói, rồi Commit changes. Mỗi commit có thể kích hoạt một lần deploy, vì vậy Codespaces hiệu quả hơn khi cập nhật nhiều file.

## URLs sau khi deploy
- Website tải công khai: `/`
- Release Console: `/admin.html`
- Health check: `/healthz`
- API latest release: `/api/v1/releases/latest?platform=windows&channel=stable&current=0.0.0&build=0`
- API lịch sử: `/api/v1/releases/history?platform=windows&channel=stable&limit=20`

## Phân biệt giao diện và việc phát hành app

### Có thể deploy tự động sau khi commit
- HTML, CSS, JavaScript giao diện.
- Worker API nếu cấu hình Workers Builds đang deploy đúng repository và `wrangler.toml` không đổi.

### Vẫn cần cấu hình/phát hành riêng
- Bộ cài Windows mới cần workflow build EXE/installer.
- APK mới cần workflow Flutter/Android và khóa ký ổn định được lưu trong GitHub Secrets.
- Cập nhật manifest chỉ hoạt động khi artifact đã build và upload thành công lên R2.
- Trang admin là dashboard vận hành; quyền ghi phát hành đến từ GitHub Actions. Không đặt Cloudflare API token trong HTML/JS.
- iOS cần quy trình build/ký/phân phối được Apple cho phép.

## Những gì đã kiểm tra
- Cú pháp JavaScript bằng `node --check`.
- Các trang HTML không có ID trùng; ID mà script truy cập đều tồn tại.
- Các stylesheet/script nội bộ được tham chiếu đều có trong gói.
- Ngoặc CSS cân bằng.

Không nên coi kiểm tra tĩnh này là xác nhận đã deploy production; cần xác nhận trong Cloudflare sau khi commit.
