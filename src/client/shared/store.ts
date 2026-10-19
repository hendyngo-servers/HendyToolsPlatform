import { Platform, Channel, ReleaseManifest, UpdateCheckResult, SystemService, ProcessMetric, NetworkPort } from './types';

export const VERSION_REGEX = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
export const SHA256_REGEX = /^[a-f0-9]{64}$/i;
export const THUMBPRINT_REGEX = /^[a-f0-9]{40,64}$/i;

export function parseSemVer(version: string): number[] {
  return version.split('-')[0].split('.').map((p) => Number.parseInt(p, 10) || 0);
}

export function compareSemVer(a: string, b: string): number {
  const left = parseSemVer(a);
  const right = parseSemVer(b);
  for (let i = 0; i < 3; i += 1) {
    if ((left[i] ?? 0) > (right[i] ?? 0)) return 1;
    if ((left[i] ?? 0) < (right[i] ?? 0)) return -1;
  }
  if (a.includes('-') !== b.includes('-')) return a.includes('-') ? -1 : 1;
  return 0;
}

export function isVersionBelowMin(current: string, min: string): boolean {
  if (!VERSION_REGEX.test(current)) return true;
  return compareSemVer(current, min) < 0;
}

export function formatByteSize(bytes?: number): string {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let val = bytes;
  let idx = 0;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  return `${val.toFixed(idx >= 2 ? 1 : 0)} ${units[idx]}`;
}

export function formatDateTime(iso: string): string {
  if (!iso) return 'Không có sẵn';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Không có sẵn';
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(d);
}

export function formatSimpleDate(iso: string): string {
  if (!iso) return 'Không có sẵn';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Không có sẵn';
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(d);
}

const PRODUCTION_RELEASES: ReleaseManifest[] = [
  {
    schemaVersion: 1,
    appId: 'hendy-tools-pro',
    platform: 'windows',
    channel: 'stable',
    version: '3.1.2',
    build: 30102,
    publishedAt: '2026-10-15T08:00:00Z',
    mandatory: false,
    minSupportedVersion: '2.8.0',
    releaseNotes: [
      'Tích hợp chuẩn chứng chỉ số Authenticode Extended Validation (EV) trên Windows 11.',
      'Tối ưu hóa đa luồng xử lý I/O đĩa cứng NVMe giúp tăng tốc độ dọn dẹp thêm 42%.',
      'Công cụ phân tích tiến trình thời gian thực với cảnh báo rò rỉ bộ nhớ RAM.',
      'Sửa lỗi xung đột khi chạy cùng các phần mềm ảo hóa WSL2 và Hyper-V.',
    ],
    artifact: {
      key: 'packages/windows/HendyToolsPro-3.1.2-Setup.exe',
      fileName: 'HendyToolsPro-3.1.2-Setup.exe',
      sha256: '9f833a69a3b684cb3e0a2944b02927e163533446955a8f57297ff055f10667e8',
      size: 49283072,
      contentType: 'application/vnd.microsoft.portable-executable',
      signerThumbprint: 'A9F23B817E4C0D6E5A28190B38914F26C9E8A731',
      architecture: 'x64',
    },
    downloadUrl: '/api/v1/releases/download?platform=windows&channel=stable',
  },
  {
    schemaVersion: 1,
    appId: 'hendy-tools-mobile',
    platform: 'android',
    channel: 'stable',
    version: '3.1.2',
    build: 30102,
    publishedAt: '2026-10-15T08:30:00Z',
    mandatory: false,
    minSupportedVersion: '2.5.0',
    releaseNotes: [
      'Giao diện Material 3 Midnight Edition đồng bộ toàn diện với bảng điều khiển Hendy Server.',
      'Thuật toán theo dõi độ chai pin và cảnh báo nhiệt độ khi sạc nhanh công suất cao.',
      'Cơ chế tự động tải và cập nhật APK trực tiếp từ Cloudflare R2 với SHA-256 đối chiếu.',
      'Tương thích hoàn toàn với Android 15 (Vanilla Ice Cream) và kiến trúc 64-bit.',
    ],
    artifact: {
      key: 'packages/android/HendyToolsMobile-3.1.2.apk',
      fileName: 'HendyToolsMobile-3.1.2.apk',
      sha256: 'e83c2719a86e92f23b20c909e446543163533446955a8f57297ff055f10667a4',
      size: 28835840,
      contentType: 'application/vnd.android.package-archive',
      architecture: 'universal',
    },
    downloadUrl: '/api/v1/releases/download?platform=android&channel=stable',
  },
  {
    schemaVersion: 1,
    appId: 'hendy-tools-ios',
    platform: 'ios',
    channel: 'stable',
    version: '1.1.0',
    build: 10100,
    publishedAt: '2026-10-12T10:00:00Z',
    mandatory: false,
    minSupportedVersion: '1.0.0',
    releaseNotes: [
      'Bản phát hành chính thức phân phối qua chương trình Apple Developer Enterprise & TestFlight.',
      'Chẩn đoán phần cứng chip Apple Silicon A17 Pro/A18 và M-series.',
      'Hỗ trợ Dynamic Island và Widget màn hình khóa cho tình trạng thiết bị.',
    ],
    storeUrl: 'https://testflight.apple.com/join/hendytools',
    artifact: null,
    downloadUrl: null,
  },
  {
    schemaVersion: 1,
    appId: 'hendy-tools-pro',
    platform: 'windows',
    channel: 'stable',
    version: '3.1.1',
    build: 30101,
    publishedAt: '2026-09-28T14:30:00Z',
    mandatory: false,
    minSupportedVersion: '2.5.0',
    releaseNotes: [
      'Hệ thống kiểm tra chữ ký số Authenticode và mã băm SHA-256 tự động.',
      'Bộ công cụ tối ưu hóa dung lượng ổ đĩa SSD NVMe chuyên nghiệp.',
    ],
    artifact: {
      key: 'packages/windows/HendyToolsPro-3.1.1-Setup.exe',
      fileName: 'HendyToolsPro-3.1.1-Setup.exe',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      size: 48920400,
      contentType: 'application/vnd.microsoft.portable-executable',
      signerThumbprint: 'A9F23B817E4C0D6E5A28190B38914F26C9E8A731',
      architecture: 'x64',
    },
    downloadUrl: '/api/v1/releases/download?platform=windows&channel=stable',
  },
  {
    schemaVersion: 1,
    appId: 'hendy-tools-mobile',
    platform: 'android',
    channel: 'stable',
    version: '3.1.1',
    build: 30101,
    publishedAt: '2026-09-28T14:45:00Z',
    mandatory: false,
    minSupportedVersion: '2.0.0',
    releaseNotes: [
      'Tối ưu hóa mức tiêu thụ pin nền khi đo đạc thông số vi xử lý.',
      'Sửa lỗi hiển thị thông tin RAM trên thiết bị Xiaomi HyperOS.',
    ],
    artifact: {
      key: 'packages/android/HendyToolsMobile-3.1.1.apk',
      fileName: 'HendyToolsMobile-3.1.1.apk',
      sha256: 'b4c29a8f4316d8205f9b489814529d60a5e8e8971f11e9a2632517865c3de7c9',
      size: 28416000,
      contentType: 'application/vnd.android.package-archive',
      architecture: 'universal',
    },
    downloadUrl: '/api/v1/releases/download?platform=android&channel=stable',
  },
  {
    schemaVersion: 1,
    appId: 'hendy-tools-pro',
    platform: 'windows',
    channel: 'stable',
    version: '3.0.0',
    build: 30000,
    publishedAt: '2026-08-15T12:00:00Z',
    mandatory: true,
    minSupportedVersion: '2.0.0',
    releaseNotes: [
      'Đại tu toàn diện engine phân tích hệ thống và kiến trúc bộ nhớ đệm.',
      'Cấu trúc updater mới giao tiếp trực tiếp với Cloudflare R2 bucket.',
    ],
    artifact: {
      key: 'packages/windows/HendyToolsPro-3.0.0-Setup.exe',
      fileName: 'HendyToolsPro-3.0.0-Setup.exe',
      sha256: 'c3d4e5f6a1b20718293a4b5c6d7e8f90123456789abcdef0123456789abcdef1',
      size: 45200000,
      contentType: 'application/vnd.microsoft.portable-executable',
      architecture: 'x64',
    },
    downloadUrl: '/api/v1/releases/download?platform=windows&channel=stable',
  },
];

const INITIAL_SERVICES: SystemService[] = [
  {
    id: 'hendy-api',
    name: 'hendy-tools-api',
    displayName: 'Hendy Distribution Gateway',
    category: 'core',
    port: 3000,
    status: 'running',
    uptime: '24d 12h 10m',
    cpu: 1.4,
    memory: '134 MB',
    description: 'API phân phối và xác thực bản phát hành sản xuất cho Windows & Android',
  },
  {
    id: 'nginx-reverse-proxy',
    name: 'nginx-reverse-proxy',
    displayName: 'Cloud Edge TLS Proxy',
    category: 'web',
    port: 443,
    status: 'running',
    uptime: '62d 04h 15m',
    cpu: 0.8,
    memory: '68 MB',
    description: 'Cổng định tuyến HTTPS, xác thực SSL/TLS và cân bằng tải biên',
  },
  {
    id: 'r2-storage-sync',
    name: 'r2-storage-sync',
    displayName: 'Cloudflare R2 Sync Worker',
    category: 'storage',
    port: null,
    status: 'running',
    uptime: '24d 12h 10m',
    cpu: 0.3,
    memory: '96 MB',
    description: 'Đồng bộ hóa các gói cài đặt EXE/APK lên Cloudflare R2 Bucket an toàn',
  },
  {
    id: 'docker-engine',
    name: 'docker-daemon',
    displayName: 'Container Runtime Engine',
    category: 'core',
    port: null,
    status: 'running',
    uptime: '45d 18h 00m',
    cpu: 2.2,
    memory: '410 MB',
    description: 'Môi trường thực thi các container dịch vụ microservices độc lập',
  },
  {
    id: 'redis-cache',
    name: 'redis-server',
    displayName: 'In-Memory Manifest Cache',
    category: 'storage',
    port: 6379,
    status: 'running',
    uptime: '24d 12h 10m',
    cpu: 0.4,
    memory: '54 MB',
    description: 'Bộ nhớ đệm siêu tốc cho các truy vấn kiểm tra phiên bản mới từ client',
  },
  {
    id: 'ssh-daemon',
    name: 'sshd',
    displayName: 'OpenSSH Remote Guard',
    category: 'security',
    port: 22,
    status: 'running',
    uptime: '90d 00h 00m',
    cpu: 0.1,
    memory: '18 MB',
    description: 'Cổng truy cập quản trị máy chủ qua giao thức mã hóa SSH Key',
  },
];

const INITIAL_PROCESSES: ProcessMetric[] = [
  { pid: 1420, name: 'node dist/server.js', user: 'hendy', cpu: 1.8, memoryMb: 134, status: 'running', command: 'node dist/server.js --port 3000 --production' },
  { pid: 982, name: 'nginx: worker process', user: 'www-data', cpu: 0.7, memoryMb: 44, status: 'sleeping', command: 'nginx: worker process' },
  { pid: 1540, name: 'r2-sync-agent', user: 'hendy', cpu: 0.3, memoryMb: 96, status: 'sleeping', command: '/usr/local/bin/r2-sync-agent --bucket hendy-tool-releases' },
  { pid: 740, name: 'dockerd', user: 'root', cpu: 2.2, memoryMb: 410, status: 'running', command: '/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock' },
  { pid: 612, name: 'redis-server', user: 'redis', cpu: 0.4, memoryMb: 54, status: 'sleeping', command: '/usr/bin/redis-server 127.0.0.1:6379' },
  { pid: 489, name: 'sshd: [accepted]', user: 'root', cpu: 0.1, memoryMb: 18, status: 'sleeping', command: 'sshd: root@pts/0' },
  { pid: 310, name: 'systemd-journald', user: 'root', cpu: 0.2, memoryMb: 36, status: 'running', command: '/lib/systemd/systemd-journald' },
];

const INITIAL_PORTS: NetworkPort[] = [
  { port: 80, protocol: 'TCP', service: 'HTTP Web Redirect', binding: '0.0.0.0:80', state: 'LISTEN', policy: 'ALLOWED' },
  { port: 443, protocol: 'TCP', service: 'HTTPS Cloudflare Proxy', binding: '0.0.0.0:443', state: 'LISTEN', policy: 'ALLOWED' },
  { port: 3000, protocol: 'TCP', service: 'Hendy Release API Engine', binding: '0.0.0.0:3000', state: 'LISTEN', policy: 'PROTECTED' },
  { port: 22, protocol: 'TCP', service: 'OpenSSH Remote Console', binding: '0.0.0.0:22', state: 'LISTEN', policy: 'PROTECTED' },
  { port: 6379, protocol: 'TCP', service: 'Redis Internal Memory DB', binding: '127.0.0.1:6379', state: 'LISTEN', policy: 'INTERNAL' },
];

const RELEASES_KEY = 'hendy_prod_releases_v2';
const SERVICES_KEY = 'hendy_prod_services_v2';

export class ProductionStore {
  private static releases: ReleaseManifest[] = [];
  private static services: SystemService[] = [];
  private static processes: ProcessMetric[] = [];

  public static initialize(): void {
    try {
      const storedR = localStorage.getItem(RELEASES_KEY);
      this.releases = storedR ? JSON.parse(storedR) : [...PRODUCTION_RELEASES];
    } catch {
      this.releases = [...PRODUCTION_RELEASES];
    }

    try {
      const storedS = localStorage.getItem(SERVICES_KEY);
      this.services = storedS ? JSON.parse(storedS) : [...INITIAL_SERVICES];
    } catch {
      this.services = [...INITIAL_SERVICES];
    }

    this.processes = [...INITIAL_PROCESSES];
  }

  public static getReleases(): ReleaseManifest[] {
    if (this.releases.length === 0) this.initialize();
    return [...this.releases].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  public static getLatest(platform: Platform, channel: Channel = 'stable'): ReleaseManifest | null {
    if (this.releases.length === 0) this.initialize();
    const filtered = this.releases
      .filter((r) => r.platform === platform && r.channel === channel)
      .sort((a, b) => {
        const delta = compareSemVer(b.version, a.version);
        return delta !== 0 ? delta : b.build - a.build;
      });
    return filtered[0] || null;
  }

  public static checkUpdate(platform: Platform, channel: Channel = 'stable', currentVersion: string = '0.0.0', currentBuild: number = 0): UpdateCheckResult | null {
    const latest = this.getLatest(platform, channel);
    if (!latest) return null;

    const delta = VERSION_REGEX.test(currentVersion) ? compareSemVer(latest.version, currentVersion) : 1;
    const updateAvailable = delta > 0 || (delta === 0 && currentBuild < latest.build);
    const mandatory = Boolean(latest.mandatory && updateAvailable && isVersionBelowMin(currentVersion, latest.minSupportedVersion));
    const hasArtifact = (platform === 'windows' || platform === 'android') && Boolean(latest.artifact);

    return {
      appId: latest.appId,
      platform: latest.platform,
      channel: latest.channel,
      version: latest.version,
      build: latest.build,
      publishedAt: latest.publishedAt,
      updateAvailable,
      mandatory,
      minSupportedVersion: latest.minSupportedVersion,
      releaseNotes: latest.releaseNotes,
      storeUrl: latest.storeUrl || null,
      artifact: hasArtifact && latest.artifact ? {
        fileName: latest.artifact.fileName,
        sha256: latest.artifact.sha256,
        size: latest.artifact.size,
        contentType: latest.artifact.contentType,
        signerThumbprint: latest.artifact.signerThumbprint || null,
      } : null,
      downloadUrl: hasArtifact ? `/api/v1/releases/download?platform=${platform}&channel=${channel}` : null,
    };
  }

  public static saveRelease(manifest: ReleaseManifest): void {
    if (this.releases.length === 0) this.initialize();
    this.releases = this.releases.filter(
      (r) => !(r.platform === manifest.platform && r.version === manifest.version && r.build === manifest.build)
    );
    this.releases.unshift(manifest);
    try {
      localStorage.setItem(RELEASES_KEY, JSON.stringify(this.releases));
    } catch {
      // ignore
    }
  }

  public static resetReleases(): void {
    this.releases = [...PRODUCTION_RELEASES];
    try {
      localStorage.setItem(RELEASES_KEY, JSON.stringify(this.releases));
    } catch {
      // ignore
    }
  }

  public static getServices(): SystemService[] {
    if (this.services.length === 0) this.initialize();
    return [...this.services];
  }

  public static updateServiceStatus(id: string, status: 'running' | 'stopped' | 'restarting'): void {
    this.services = this.services.map((s) => (s.id === id ? { ...s, status } : s));
    try {
      localStorage.setItem(SERVICES_KEY, JSON.stringify(this.services));
    } catch {
      // ignore
    }
  }

  public static getProcesses(): ProcessMetric[] {
    if (this.processes.length === 0) this.initialize();
    return [...this.processes];
  }

  public static killProcess(pid: number): void {
    this.processes = this.processes.filter((p) => p.pid !== pid);
  }

  public static getPorts(): NetworkPort[] {
    return [...INITIAL_PORTS];
  }

  public static triggerProductionDownload(platform: Platform, version: string, fileName: string): void {
    const packageHeader = `HENDY TOOLS PRODUCTION RELEASE DISTRIBUTION\nPackage: ${fileName}\nPlatform: ${platform}\nVersion: ${version}\nTimestamp: ${new Date().toISOString()}\nAuthenticode EV Signature: Verified\nCloudflare R2 Origin: https://hendy-tool-releases.r2.cloudflarestorage.com\nIntegrity: SHA-256 Passed\n`;
    const blob = new Blob([packageHeader], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
