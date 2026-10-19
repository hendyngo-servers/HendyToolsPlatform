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

### 2. Bảng điều khiển quản lý phát hành (Release Console)
- **Workspace Sidebar**: Điều hướng nhanh qua Tổng quan, Bản phát hành, Lịch sử changelog, Build & xuất bản, trạng thái Release API.
- **Thẻ tóm tắt thông số**: Phiên bản phát hành hiện tại của từng nền tảng, tổng số bản lưu trữ, trạng thái máy chủ cập nhật.
- **Lịch sử phát hành & Bộ lọc**: Tra cứu tất cả các bản phát hành trong quá khứ theo từng nền tảng (All / Windows / Android).
- **Công cụ tạo & công bố Manifest (New Release Creator)**: Kiểm tra tính hợp lệ của phiên bản theo Semantic Versioning (`x.y.z`), số hiệu build, mã băm SHA-256 64-hex, phiên bản tối thiểu và ghi chú phát hành.
- **Liên kết CI/CD GitHub Actions**: Trực tiếp liên kết với các workflow build tự động trên đám mây.

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
    ├── App.tsx                 # Điều hướng giữa Download Center và Release Console
    ├── services/
    │   └── releaseStore.ts     # Bộ lưu trữ và thuật toán kiểm tra cập nhật Hendy
    └── components/
        ├── DownloadCenter.tsx  # Giao diện tải ứng dụng công khai
        ├── ReleaseConsole.tsx  # Bảng điều khiển quản trị phát hành
        ├── NewReleaseModal.tsx # Modal tạo và công bố manifest mới
        └── IntegrityCheckModal.tsx # Modal kiểm tra và so sánh SHA-256
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
