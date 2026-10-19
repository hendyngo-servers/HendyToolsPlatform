import { Platform, Channel, ReleaseManifest, UpdateCheckResult } from '../types';

export const VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
export const SHA256_RE = /^[a-f0-9]{64}$/i;
export const THUMBPRINT_RE = /^[a-f0-9]{40,64}$/i;

export function parseVersion(version: string): number[] {
  return version.split('-')[0].split('.').map((part) => Number.parseInt(part, 10) || 0);
}

export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  for (let i = 0; i < 3; i += 1) {
    if ((left[i] ?? 0) > (right[i] ?? 0)) return 1;
    if ((left[i] ?? 0) < (right[i] ?? 0)) return -1;
  }
  if (a.includes('-') !== b.includes('-')) return a.includes('-') ? -1 : 1;
  return 0;
}

export function versionIsBelowMinimum(current: string, minimum: string): boolean {
  if (!VERSION_RE.test(current)) return true;
  return compareVersions(current, minimum) < 0;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index >= 2 ? 1 : 0)} ${units[index]}`;
}

export function formatReleaseDate(isoDate: string): string {
  if (!isoDate) return 'Không có dữ liệu ngày';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Không có dữ liệu ngày';
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}

export function formatSimpleDate(isoDate: string): string {
  if (!isoDate) return 'Ngày phát hành không có sẵn';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Ngày phát hành không có sẵn';
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}

const DEFAULT_RELEASES: ReleaseManifest[] = [
  {
    schemaVersion: 1,
    appId: 'hendy-tools-pro',
    platform: 'windows',
    channel: 'stable',
    version: '3.1.1',
    build: 30101,
    publishedAt: '2026-10-12T14:30:00Z',
    mandatory: false,
    minSupportedVersion: '2.5.0',
    releaseNotes: [
      'Kiểm tra tính toàn vẹn và chữ ký số Authenticode tự động trước khi cập nhật.',
      'Tối ưu hóa quản lý tiến trình nền và giải phóng RAM thông minh.',
      'Hỗ trợ phân tích sức khỏe ổ đĩa SSD/HDD chi tiết và SMART log.',
      'Sửa lỗi kết nối proxy khi kiểm tra bản phát hành trên Windows 11.',
    ],
    artifact: {
      key: 'packages/windows/HendyToolsPro-3.1.1-Setup.exe',
      fileName: 'HendyToolsPro-3.1.1-Setup.exe',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      size: 48920400,
      contentType: 'application/vnd.microsoft.portable-executable',
      signerThumbprint: 'A9F23B817E4C0D6E5A28190B38914F26C9E8A731',
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
    publishedAt: '2026-10-12T14:45:00Z',
    mandatory: false,
    minSupportedVersion: '2.0.0',
    releaseNotes: [
      'Giao diện Material 3 dark palette đồng bộ với nền tảng Hendy Tools.',
      'Giám sát chu kỳ sạc, nhiệt độ pin và công suất theo thời gian thực.',
      'Tích hợp luồng tải APK trực tiếp với thông báo tiến trình rõ ràng.',
      'Cải thiện độ ổn định khi chạy ngầm trên Android 14/15.',
    ],
    artifact: {
      key: 'packages/android/HendyToolsMobile-3.1.1.apk',
      fileName: 'HendyToolsMobile-3.1.1.apk',
      sha256: 'b4c29a8f4316d8205f9b489814529d60a5e8e8971f11e9a2632517865c3de7c9',
      size: 28416000,
      contentType: 'application/vnd.android.package-archive',
    },
    downloadUrl: '/api/v1/releases/download?platform=android&channel=stable',
  },
  {
    schemaVersion: 1,
    appId: 'hendy-tools-mobile',
    platform: 'ios',
    channel: 'stable',
    version: '1.0.0',
    build: 10001,
    publishedAt: '2026-10-10T09:00:00Z',
    mandatory: false,
    minSupportedVersion: '1.0.0',
    releaseNotes: [
      'Bản phát hành chuẩn bị cho hệ sinh thái Apple iOS / iPadOS.',
      'Cần tuân thủ chứng chỉ ký số và phương thức được Apple cho phép.',
      'Liên kết TestFlight hoặc App Store Enterprise distribution.',
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
    version: '3.1.0',
    build: 30100,
    publishedAt: '2026-09-28T10:00:00Z',
    mandatory: false,
    minSupportedVersion: '2.5.0',
    releaseNotes: [
      'Nâng cấp giao diện người dùng theo phong cách navy/teal hiện đại.',
      'Bổ sung chức năng xuất báo cáo chẩn đoán hệ thống định dạng HTML.',
      'Cải thiện tốc độ khởi động ứng dụng thêm 35%.',
    ],
    artifact: {
      key: 'packages/windows/HendyToolsPro-3.1.0-Setup.exe',
      fileName: 'HendyToolsPro-3.1.0-Setup.exe',
      sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
      size: 47800000,
      contentType: 'application/vnd.microsoft.portable-executable',
    },
    downloadUrl: '/api/v1/releases/download?platform=windows&channel=stable',
  },
  {
    schemaVersion: 1,
    appId: 'hendy-tools-mobile',
    platform: 'android',
    channel: 'stable',
    version: '3.1.0',
    build: 30100,
    publishedAt: '2026-09-28T10:15:00Z',
    mandatory: false,
    minSupportedVersion: '2.0.0',
    releaseNotes: [
      'Tích hợp tính năng theo dõi sức khỏe phần cứng thiết bị chi tiết.',
      'Hỗ trợ chế độ tiết kiệm năng lượng thích ứng.',
    ],
    artifact: {
      key: 'packages/android/HendyToolsMobile-3.1.0.apk',
      fileName: 'HendyToolsMobile-3.1.0.apk',
      sha256: '9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
      size: 27900000,
      contentType: 'application/vnd.android.package-archive',
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
      'Đại tu toàn diện engine phân tích hệ thống và dọn dẹp bộ nhớ đệm.',
      'Cấu trúc updater mới giao tiếp trực tiếp với Cloudflare R2 bucket.',
      'Yêu cầu cập nhật bắt buộc từ các bản 2.x cũ.',
    ],
    artifact: {
      key: 'packages/windows/HendyToolsPro-3.0.0-Setup.exe',
      fileName: 'HendyToolsPro-3.0.0-Setup.exe',
      sha256: 'c3d4e5f6a1b20718293a4b5c6d7e8f90123456789abcdef0123456789abcdef1',
      size: 45200000,
      contentType: 'application/vnd.microsoft.portable-executable',
    },
    downloadUrl: '/api/v1/releases/download?platform=windows&channel=stable',
  },
  {
    schemaVersion: 1,
    appId: 'hendy-tools-mobile',
    platform: 'android',
    channel: 'stable',
    version: '3.0.0',
    build: 30000,
    publishedAt: '2026-08-15T12:20:00Z',
    mandatory: true,
    minSupportedVersion: '2.0.0',
    releaseNotes: [
      'Viết lại ứng dụng trên nền tảng Flutter 3.22 ổn định.',
      'Kiểm tra quyền truy cập hệ thống minh bạch theo quy chuẩn Android 14.',
    ],
    artifact: {
      key: 'packages/android/HendyToolsMobile-3.0.0.apk',
      fileName: 'HendyToolsMobile-3.0.0.apk',
      sha256: 'f6e5d4c3b2a10718293a4b5c6d7e8f90123456789abcdef0123456789abcdef2',
      size: 26500000,
      contentType: 'application/vnd.android.package-archive',
    },
    downloadUrl: '/api/v1/releases/download?platform=android&channel=stable',
  },
];

const STORAGE_KEY = 'hendy_tools_releases_v1';

export class ReleaseStore {
  private static releases: ReleaseManifest[] = [];

  public static initialize(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.releases = parsed;
          return;
        }
      }
    } catch {
      // ignore
    }
    this.releases = [...DEFAULT_RELEASES];
    this.save();
  }

  private static save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.releases));
    } catch {
      // ignore
    }
  }

  public static getAllReleases(): ReleaseManifest[] {
    if (this.releases.length === 0) this.initialize();
    return [...this.releases].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  public static getLatestRelease(platform: Platform, channel: Channel = 'stable'): ReleaseManifest | null {
    if (this.releases.length === 0) this.initialize();
    const matches = this.releases
      .filter((r) => r.platform === platform && r.channel === channel)
      .sort((a, b) => {
        const delta = compareVersions(b.version, a.version);
        if (delta !== 0) return delta;
        return b.build - a.build;
      });
    return matches[0] || null;
  }

  public static checkUpdate(params: {
    platform: Platform;
    channel?: Channel;
    currentVersion?: string;
    currentBuild?: number;
  }): UpdateCheckResult | null {
    const channel = params.channel || 'stable';
    const release = this.getLatestRelease(params.platform, channel);
    if (!release) return null;

    const currentVersion = params.currentVersion || '0.0.0';
    const currentBuild = params.currentBuild || 0;

    const versionDelta = VERSION_RE.test(currentVersion) ? compareVersions(release.version, currentVersion) : 1;
    const updateAvailable = versionDelta > 0 || (versionDelta === 0 && currentBuild < release.build);
    const mandatory = Boolean(
      release.mandatory && updateAvailable && versionIsBelowMinimum(currentVersion, release.minSupportedVersion)
    );
    const hasDirectArtifact = (params.platform === 'windows' || params.platform === 'android') && Boolean(release.artifact);

    return {
      appId: release.appId,
      platform: release.platform,
      channel: release.channel,
      version: release.version,
      build: release.build,
      publishedAt: release.publishedAt,
      updateAvailable,
      mandatory,
      minSupportedVersion: release.minSupportedVersion,
      releaseNotes: release.releaseNotes,
      storeUrl: release.storeUrl || null,
      artifact: hasDirectArtifact && release.artifact ? {
        fileName: release.artifact.fileName,
        sha256: release.artifact.sha256,
        size: release.artifact.size,
        contentType: release.artifact.contentType || 'application/octet-stream',
        signerThumbprint: release.artifact.signerThumbprint || null,
      } : null,
      downloadUrl: hasDirectArtifact ? `/api/v1/releases/download?platform=${release.platform}&channel=${release.channel}` : null,
    };
  }

  public static addOrUpdateRelease(manifest: ReleaseManifest): void {
    if (this.releases.length === 0) this.initialize();
    // remove duplicate if same platform + version + build
    this.releases = this.releases.filter(
      (r) => !(r.platform === manifest.platform && r.version === manifest.version && r.build === manifest.build)
    );
    this.releases.unshift(manifest);
    this.save();
  }

  public static resetToDefaults(): void {
    this.releases = [...DEFAULT_RELEASES];
    this.save();
  }

  public static triggerSimulatedDownload(platform: Platform, version: string, fileName: string): void {
    // Generate a small dummy file with correct name for realistic user experience
    const content = `Hendy Tools Platform - Simulated Release Package\nPlatform: ${platform}\nVersion: ${version}\nFile: ${fileName}\nIntegrity Check: Verified\n`;
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
