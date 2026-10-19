# Hendy Tools — Download Center & Release Console (React)

Ứng dụng web React SPA hiện đại cho trung tâm tải về chính thức của **Hendy Tools** (Windows, Android, iOS) và bảng điều khiển quản lý phát hành **Release Console**.

## Tính năng chính

### 1. Trung tâm tải về công khai (Download Center)
- **Giao diện Hero tương tác**: Mô phỏng trực quan bảng điều khiển Hendy System Overview (traffic lights, biểu đồ hiệu năng, thanh sức khỏe hệ thống, hoạt động gần đây, huy hiệu xác minh SHA-256).
- **Thẻ tải theo nền tảng**:
  - **Windows (Hendy Tools Pro)**: Tải bộ cài đặt EXE, hiển thị phiên bản, dung lượng, kênh phát hành và mã băm SHA-256.
  - **Android (Hendy Tools Mobile)**: Tải APK trực tiếp, hỗ trợ cập nhật trình duyệt, trạng thái thiết bị.
  - **iOS (Hendy Tools iOS)**: Thông tin phân phối, liên kết TestFlight/App Store theo quy chuẩn Apple.
- **Xác thực toàn vẹn (Integrity Check)**: Công cụ đối chiếu mã băm SHA-256 thời gian thực nhằm đảm bảo tệp tải về không bị chỉnh sửa hay hỏng hóc.
- **Ghi chú phát hành (Release Notes)**: Hiển thị changelog chi tiết theo phiên bản và nút đồng bộ với máy chủ phát hành.
- **Hướng dẫn cài đặt 3 bước**: Quy trình minh bạch, an toàn từ tải gói đến xác nhận hệ thống.

### 2. Bảng quản trị máy chủ & Quản lý phát hành Plus (Unified Server Management Panel Plus)
Được gộp từ **Server Management Panel Plus** và **Release Console** thành một hệ thống quản trị chuyên nghiệp, độc lập và tách biệt với Cổng tải công khai:
- **Hạ tầng máy chủ (Server Infrastructure)**:
  - **Tài nguyên phần cứng thời gian thực**: Giám sát % CPU (8 vCPU), RAM (16 GB), Disk NVMe (250 GB), Băng thông mạng Network I/O.
  - **Quản lý Systemd Services**: Kiểm soát các dịch vụ nền (`hendy-tools-api`, `nginx-reverse-proxy`, `r2-storage-sync`, `docker-daemon`, `redis-server`, `ssh-daemon`) với thao tác Khởi động lại / Dừng / Bật.
  - **Giám sát tiến trình (Process Monitor)**: Tra cứu theo tên/PID, mức tiêu thụ tài nguyên và ngắt tiến trình (Kill).
  - **Cổng kết nối & Tường lửa**: Danh sách cổng TCP/UDP đang lắng nghe (:80, :443, :3000, :22, :6379).
  - **Cloud Shell CLI**: Terminal dòng lệnh tương tác hỗ trợ `uptime`, `free -h`, `df -h`, `docker ps`, `releases`, `ping`, `clear`.
  - **Cấu hình môi trường**: Trình xem mẫu biến môi trường `.env`.
- **Quản lý phát hành (Release Control)**:
  - **Kênh phát hành**: Theo dõi và cập nhật trực tiếp Windows Pro, Android Mobile, iOS TestFlight.
  - **Lịch sử Changelog & Archive**: Tra cứu toàn bộ phiên bản quá khứ, lọc theo nền tảng.
  - **Build & Xuất bản**: Tạo manifest mới với kiểm tra cú pháp SemVer, SHA-256, liên kết GitHub Actions CI/CD workflows.

## Cấu trúc mã nguồn

```text
.
├── index.html                  # HTML entry point (SEO, fonts, meta tags)
├── metadata.json               # AI Studio app metadata
├── package.json                # React 19, Vite, TypeScript
├── tsconfig.json               # Cấu hình TypeScript JSX
├── vite.config.ts              # Cấu hình Vite dev server
├── public/
│   └── favicon.svg             # Favicon thương hiệu Hendy Tools
└── src/
    ├── types.ts                # TypeScript interfaces (ReleaseManifest, Artifact, UpdateCheck)
    ├── index.css               # Bộ phong cách Midnight Navy & Teal Mint gốc
    ├── main.tsx                # React DOM render entry point
    ├── App.tsx                 # Điều hướng giữa Cổng Tải và Bảng Quản Trị Server Plus
    ├── services/
    │   └── releaseStore.ts     # Bộ lưu trữ và thuật toán kiểm tra cập nhật Hendy
    └── components/
        ├── DownloadCenter.tsx          # Cổng tải về công khai độc lập
        ├── UnifiedServerPanelPlus.tsx  # Bảng quản trị máy chủ & phát hành Plus hợp nhất
        ├── NewReleaseModal.tsx         # Modal tạo và công bố manifest mới
        └── IntegrityCheckModal.tsx     # Modal kiểm tra và so sánh SHA-256
```

## Khởi chạy & Phát triển

```bash
# Cài đặt phụ thuộc
npm install

# Khởi chạy máy chủ phát triển (cổng 3000)
npm run dev

# Kiểm tra kiểu dữ liệu
npm run lint

# Build cho môi trường sản xuất
npm run build
```
