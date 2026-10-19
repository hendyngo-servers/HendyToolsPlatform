# Hendy Tools Platform — Production Suite

Nền tảng chính thức của **Hendy Tools** dành cho Windows, Android và iOS, được tối ưu hóa toàn diện theo chuẩn Production-Ready, hỗ trợ triển khai trực tiếp thông qua **Cloudflare Pages / Workers** (https://dash.cloudflare.com/) và **Render.com** (https://render.com/) tích hợp tự động với **GitHub**.

---

## Kiến trúc 2 Thực thể Độc lập (Distinct Entities Architecture)

Hệ thống được tái cấu trúc thành hai thực thể độc lập hoàn toàn về mặt logic, giao diện, CSS và quyền truy cập:

```text
/
├── render.yaml                      # Render Blueprint (Infrastructure as Code)
├── wrangler.toml                    # Cloudflare Pages / Workers Manifest
├── package.json                     # Scripts & Dependencies (React, Vite, TypeScript)
├── tsconfig.json                    # Cấu hình TypeScript Strict & Bundler
├── vite.config.ts                   # Cấu hình Vite Production Build
├── public/
│   ├── favicon.svg                  # Biểu tượng thương hiệu Hendy Tools
│   ├── _redirects                   # SPA routing fallback cho Cloudflare Pages
│   └── _headers                     # Security headers (nosniff, SAMEORIGIN, CSP)
├── .github/workflows/
│   ├── deploy-cloudflare.yml        # CI/CD tự động deploy lên Cloudflare Pages
│   └── build-and-publish-release.yml# CI/CD đóng gói bản phát hành Windows & APK
└── src/
    ├── index.html                   # HTML entry point với meta tags chuẩn SEO
    ├── main.tsx                     # Entry point React
    ├── App.tsx                      # Bộ định tuyến độc lập giữa Portal & Admin Panel
    ├── index.css                    # Toàn cục CSS & Thiết lập Base Fonts
    └── client/
        ├── portal/                  # THỰC THỂ A: TRUNG TÂM TẢI VỀ CÔNG KHAI
        │   ├── DownloadPortal.tsx   # Giao diện tải ứng dụng Windows, Android, iOS
        │   └── DownloadPortal.css   # Giao diện Midnight Aerodynamic công khai
        │
        ├── admin/                   # THỰC THỂ B: BẢNG QUẢN TRỊ MÁY CHỦ PLUS
        │   ├── AdminPanelPlus.tsx   # Quản trị Server + Tích hợp Release Console
        │   └── AdminPanelPlus.css   # Giao diện Command Center chuyên dụng
        │
        └── shared/                  # TẦNG DỮ LIỆU & TIỆN ÍCH DÙNG CHUNG
            ├── store.ts             # Production Store & API Engine
            ├── types.ts             # Strict TypeScript Data Models
            ├── IntegrityModal.tsx   # Modal đối chiếu mã băm SHA-256 Authenticode
            └── PublishModal.tsx     # Modal công bố bản phát hành mới
```

---

## 1. Thực thể A: Trung tâm Tải về Công khai (Download Portal)
- **Đường dẫn truy cập**: `/` hoặc `#top`, `#downloads`, `#updates`, `#help`
- **Mục tiêu**: Người dùng cuối (Consumers & IT Administrators) tải về phần mềm chính thức không qua trung gian.
- **Tính năng nổi bật**:
  - Tải trực tiếp **Hendy Tools Pro (Windows 64-bit EXE)** và **Hendy Tools Mobile (Android APK)**.
  - Thông tin phân phối bản iOS Enterprise / TestFlight.
  - Công cụ **Kiểm tra tính toàn vẹn SHA-256** tự động đối chiếu mã băm với chữ ký số Authenticode.
  - Nhật ký thay đổi (Release Notes & Changelog) hiển thị minh bạch các tính năng mới theo từng phiên bản.
  - Hướng dẫn cài đặt và bảo đảm an toàn hệ thống 3 bước.

---

## 2. Thực thể B: Bảng Quản trị Máy chủ Plus (Server Management Panel Plus)
- **Đường dẫn truy cập**: `#admin` (hoặc `#server`, `#telemetry`, `#channels`, `#archive`, v.v.)
- **Mục tiêu**: Đội ngũ DevOps và Release Managers giám sát hạ tầng và quản lý chu kỳ phát hành sản phẩm.
- **Gộp độc lập Bảng điều khiển Quản lý Phát hành (Release Console)**:
  - **Giám sát hạ tầng thời gian thực**: Đo lường % CPU (8 vCPU), RAM (16 GB), SSD NVMe I/O, và Băng thông mạng.
  - **Quản lý dịch vụ Systemd**: Điều khiển trạng thái Start / Stop / Restart của các daemon (`hendy-tools-api`, `nginx-reverse-proxy`, `r2-storage-sync`, `docker-engine`, `redis-cache`, `ssh-daemon`).
  - **Giám sát tiến trình (Process Monitor)**: Tìm kiếm tiến trình theo PID/User, ngắt tiến trình (Kill PID).
  - **Bảo mật cổng & Tường lửa**: Giám sát các cổng mạng đang mở (:80, :443, :3000, :22, :6379) và chính sách tường lửa.
  - **Cloud Shell Terminal**: Dòng lệnh CLI tương tác hỗ trợ các lệnh: `uptime`, `free -h`, `df -h`, `docker ps`, `releases`, `ping`, `clear`.
  - **Quản lý kênh phát hành**: Quản lý các kênh Windows Stable, Android Stable, iOS TestFlight.
  - **Lịch sử Changelog & Archive Cloudflare R2**: Danh sách toàn bộ các bản phát hành đã công bố.
  - **Công bố bản phát hành mới**: Modal tạo manifest với chuẩn SemVer, SHA-256, kích thước tệp và ghi chú phát hành.
  - **Trình gỡ lỗi API cập nhật (API Debugger)**: Kiểm tra phản hồi API phân phối cập nhật theo phiên bản của thiết bị.

---

## Hướng dẫn Triển khai Production (Deployment Guides)

### A. Triển khai trên Cloudflare (https://dash.cloudflare.com/)

1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Chọn **Workers & Pages** → **Create application** → tab **Pages** → **Connect to Git**.
3. Chọn kho lưu trữ GitHub của dự án.
4. Thiết lập cấu hình Build:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node.js version**: `22` (hoặc đặt biến môi trường `NODE_VERSION=22`)
5. Nhấn **Save and Deploy**. Dự án sẽ tự động kích hoạt tính năng SPA Routing từ file `public/_redirects` và triển khai trên mạng lưới Edge toàn cầu của Cloudflare.

### B. Triển khai trên Render (https://render.com/)

1. Đăng nhập vào [Render Dashboard](https://dashboard.render.com/).
2. Nhấn **New +** → **Blueprint**.
3. Kết nối với kho lưu trữ GitHub. Render sẽ tự động đọc tệp `render.yaml` trong thư mục gốc:
   - **Loại dịch vụ**: Static Site
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `./dist`
   - **Routes**: SPA rewrite tự động `/*` -> `/index.html`
4. Nhấn **Apply**. Dịch vụ sẽ tự động build và cấp phát tên miền HTTPS với chứng chỉ SSL/TLS miễn phí.

---

## Hướng dẫn Phát triển Nội bộ (Local Development)

```bash
# Cài đặt thư viện phụ thuộc
npm install

# Khởi chạy môi trường phát triển (Port 3000)
npm run dev

# Kiểm tra cú pháp và kiểu dữ liệu TypeScript
npm run lint

# Đóng gói sản phẩm cho môi trường Production
npm run build

# Xem trước bản đóng gói
npm run preview
```
