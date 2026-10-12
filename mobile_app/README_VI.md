# Hendy Tools Mobile — Flutter scaffold

Đây là mã nguồn khởi đầu cho ứng dụng companion Android/iOS, dùng chung nhận diện giao diện với Hendy Tools Pro trên Windows.

## Chức năng đang có trong scaffold

- Trang tổng quan theo dõi phần trăm pin và trạng thái sạc.
- Hiển thị thông tin thiết bị và phiên bản hệ điều hành qua `device_info_plus`.
- Dọn **thư mục cache riêng do Hendy Tools tạo**; không xóa dữ liệu/cache của ứng dụng khác.
- Hướng dẫn bảo trì pin/lưu trữ và mở trang cài đặt ứng dụng.
- Giao diện tối, 3 tab: Tổng quan, Công cụ, Cài đặt.

## Công nghệ / yêu cầu

- Flutter 3.38.1+ và Dart 3.10+ theo yêu cầu phiên bản plugin trong `pubspec.yaml`.
- `battery_plus`, `device_info_plus`, `path_provider`, `permission_handler`.
- Flutter hỗ trợ tạo ứng dụng Android trên Windows; build iOS cần macOS/Xcode. Tham khảo: https://docs.flutter.dev/reference/supported-platforms

## Tạo dự án có thư mục nền tảng native

Trong thư mục `mobile_app`, chạy `bootstrap_mobile.bat` trên Windows. Tập lệnh tạo một project Flutter native trong `generated_flutter_project`, chép `pubspec.yaml` và `lib/main.dart` vào đó rồi chạy `flutter pub get`.

Sau đó chạy thiết bị giả lập/điện thoại Android:

```bat
cd generated_flutter_project
flutter run
```

Build APK thử nghiệm:

```bat
flutter build apk --release
```

APK ở `build\app\outputs\flutter-apk\app-release.apk` sau khi build thành công. Không thể build iOS trên Windows; cần mở project trên macOS với Xcode.

## Giới hạn nền tảng

Android/iOS không cho ứng dụng thông thường tắt hàng loạt tiến trình hệ thống, xóa dữ liệu của ứng dụng khác hoặc thay đổi sâu phần lõi. Scaffold không sử dụng root/jailbreak và không giả lập các quyền đó.

Để điều khiển PC Windows từ điện thoại, cần một backend riêng: ghép cặp thiết bị, xác thực mạnh, HTTPS, quyền theo tác vụ, nhật ký kiểm toán và cơ chế thu hồi thiết bị. Không nên mở một API nhận lệnh hệ thống không xác thực trực tiếp ra Internet.

## Hendy Auto Update (Cloudflare Worker)

Mã nguồn đã có kiểm tra phiên bản khi mở app và nút kiểm tra thủ công trong Cài đặt. Ứng dụng lấy metadata từ:

`GET {HENDY_UPDATE_BASE_URL}/api/v1/releases/latest?platform=android|ios&channel=stable&current=1.0.0&build=1`

Build phải truyền URL Worker thật bằng `--dart-define`; không hard-code URL placeholder khi phát hành:

```powershell
flutter build appbundle --release --dart-define=HENDY_UPDATE_BASE_URL=https://YOUR-WORKER-URL
```

Android/iOS không tải rồi tự cài binary từ Worker. Worker trả `storeUrl`; app mở Google Play hoặc App Store để người dùng cài bản phát hành chính thức. Trước khi phát hành lên cửa hàng, hãy cấu hình package ID / App Store ID thật trong `--store-url` khi tạo manifest. Tính năng update dùng các package `http`, `package_info_plus` và `url_launcher`.
