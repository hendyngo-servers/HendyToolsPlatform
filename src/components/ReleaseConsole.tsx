import React, { useState, useEffect } from 'react';
import { ReleaseStore, formatFileSize, formatReleaseDate } from '../services/releaseStore';
import { ReleaseManifest, Platform } from '../types';
import { NewReleaseModal } from './NewReleaseModal';

interface Props {
  onOpenPublicSite: () => void;
}

export const ReleaseConsole: React.FC<Props> = ({ onOpenPublicSite }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'releases' | 'history' | 'publish'>('overview');
  const [activeFilter, setActiveFilter] = useState<'all' | 'windows' | 'android'>('all');
  const [windowsLatest, setWindowsLatest] = useState<ReleaseManifest | null>(null);
  const [androidLatest, setAndroidLatest] = useState<ReleaseManifest | null>(null);
  const [iosLatest, setIosLatest] = useState<ReleaseManifest | null>(null);
  const [historyList, setHistoryList] = useState<ReleaseManifest[]>([]);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const syncData = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setWindowsLatest(ReleaseStore.getLatestRelease('windows', 'stable'));
      setAndroidLatest(ReleaseStore.getLatestRelease('android', 'stable'));
      setIosLatest(ReleaseStore.getLatestRelease('ios', 'stable'));
      setHistoryList(ReleaseStore.getAllReleases());
      const now = new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(new Date());
      setLastSyncedTime(now);
      setIsSyncing(false);
    }, 200);
  };

  useEffect(() => {
    syncData();
  }, []);

  const handleDownload = (platform: Platform) => {
    const rel = platform === 'windows' ? windowsLatest : platform === 'android' ? androidLatest : null;
    if (rel?.artifact) {
      ReleaseStore.triggerSimulatedDownload(platform, rel.version, rel.artifact.fileName);
      setToastMessage(`Đang tải gói ${rel.artifact.fileName}...`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Bạn có muốn đặt lại dữ liệu phát hành về mặc định ban đầu không?')) {
      ReleaseStore.resetToDefaults();
      syncData();
      setToastMessage('Đã khôi phục dữ liệu phát hành về mặc định.');
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const filteredHistory = historyList.filter(
    (item) => activeFilter === 'all' || item.platform === activeFilter
  );

  return (
    <div className="admin-layout">
      <div className="admin-ambient ambient-a" aria-hidden="true" />
      <div className="admin-ambient ambient-b" aria-hidden="true" />

      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 1000,
            background: 'linear-gradient(135deg, #102948, #0a1b32)',
            border: '1px solid #73e4d0',
            color: '#e5f8f5',
            padding: '14px 18px',
            borderRadius: 12,
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ color: '#73e4d0', fontSize: 18 }}>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="admin-sidebar">
        <button
          type="button"
          className="admin-brand"
          onClick={onOpenPublicSite}
          aria-label="Về trang chủ Hendy Tools"
        >
          <span className="admin-brand-mark">
            H<span>+</span>
          </span>
          <span>
            <b>HENDY<span>TOOLS</span></b>
            <small>RELEASE CONTROL</small>
          </span>
        </button>

        <div className="sidebar-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Quản trị">
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="nav-icon">◫</span>
            <span>Tổng quan</span>
            <i />
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'releases' ? 'active' : ''}`}
            onClick={() => setActiveTab('releases')}
          >
            <span className="nav-icon">◷</span>
            <span>Bản phát hành</span>
            <i />
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <span className="nav-icon">≋</span>
            <span>Changelog & lịch sử</span>
            <i />
          </button>
          <button
            type="button"
            className={`sidebar-link ${activeTab === 'publish' ? 'active' : ''}`}
            onClick={() => setActiveTab('publish')}
          >
            <span className="nav-icon">↗</span>
            <span>Build & xuất bản</span>
            <i />
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-health">
            <span className="health-indicator" />
            <div>
              <b>Release API</b>
              <small id="api-status">API hoạt động · Hendy Engine</small>
            </div>
          </div>
          <a
            className="source-link"
            href="https://github.com/ngogiaidy56-eng/HendyToolsApp"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>↗</span> Mở repository GitHub
          </a>
          <div className="sidebar-version">
            HENDY CONSOLE <span>V1.0</span>
          </div>
        </div>
      </aside>

      {/* Main Admin Area */}
      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="breadcrumb">
            <span>Hendy Tools</span>
            <i>/</i>
            <b>Release Console</b>
          </div>
          <div className="topbar-actions">
            <span className="environment">
              <i /> PRODUCTION
            </span>
            <button type="button" className="topbar-public" onClick={onOpenPublicSite}>
              Xem website công khai <span>↗</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="admin-content">
          {/* Hero */}
          <section className="admin-hero">
            <div>
              <div className="admin-eyebrow">
                <span className="eyebrow-line" /> RELEASE OPERATIONS
                <span className="eyebrow-tag">HENDY / CONTROL</span>
              </div>
              <h1>
                Phát hành, <span>trong tầm kiểm soát.</span>
              </h1>
              <p>
                Một bảng điều khiển duy nhất để theo dõi phiên bản, đọc changelog và khởi chạy quy trình build có xác thực qua GitHub Actions.
              </p>
            </div>
            <div className="admin-hero-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => setIsModalOpen(true)}
              >
                <span className="button-plus">＋</span> Tạo bản phát hành <span>↗</span>
              </button>
              <a
                className="button button-soft"
                href="https://github.com/ngogiaidy56-eng/HendyToolsApp/actions/workflows/deploy-cloudflare.yml"
                target="_blank"
                rel="noopener noreferrer"
              >
                Deploy website / API <span>↗</span>
              </a>
            </div>
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-watermark">H+</div>
          </section>

          {/* Summary Grid */}
          <section className="summary-grid" aria-label="Tóm tắt phát hành">
            <article className="summary-card">
              <div className="summary-top">
                <span>WINDOWS RELEASE</span>
                <span className="summary-icon icon-blue">⊞</span>
              </div>
              <div className="summary-value">
                {windowsLatest ? `v${windowsLatest.version}` : '—'}
              </div>
              <div className="summary-bottom">
                <span>Hendy Tools Pro</span>
                <b>{windowsLatest?.mandatory ? 'Cần cập nhật' : 'Đã công bố'}</b>
              </div>
              <div className="summary-rail">
                <i />
              </div>
            </article>

            <article className="summary-card">
              <div className="summary-top">
                <span>ANDROID RELEASE</span>
                <span className="summary-icon icon-teal">◉</span>
              </div>
              <div className="summary-value">
                {androidLatest ? `v${androidLatest.version}` : '—'}
              </div>
              <div className="summary-bottom">
                <span>Hendy Tools Mobile</span>
                <b>{androidLatest?.mandatory ? 'Cần cập nhật' : 'Đã công bố'}</b>
              </div>
              <div className="summary-rail teal-rail">
                <i />
              </div>
            </article>

            <article className="summary-card">
              <div className="summary-top">
                <span>RELEASE ARCHIVE</span>
                <span className="summary-icon icon-violet">≋</span>
              </div>
              <div className="summary-value">{historyList.length}</div>
              <div className="summary-bottom">
                <span>Phiên bản đã lưu</span>
                <b>{historyList.length ? 'Bản đã lưu' : 'Đang đồng bộ'}</b>
              </div>
              <div className="summary-rail violet-rail">
                <i />
              </div>
            </article>

            <article className="summary-card">
              <div className="summary-top">
                <span>UPDATE SERVER</span>
                <span className="summary-icon icon-green">⌁</span>
              </div>
              <div className="summary-value server-summary-value">Online</div>
              <div className="summary-bottom">
                <span>Worker / API</span>
                <b>{lastSyncedTime ? `Đồng bộ ${lastSyncedTime}` : 'Checking'}</b>
              </div>
              <div className="summary-rail green-rail">
                <i />
              </div>
            </article>
          </section>

          {/* Release Channels Section */}
          <section id="releases" className="content-section">
            <div className="section-heading">
              <div>
                <div className="section-index">01 <span>/</span> RELEASE CHANNELS</div>
                <h2>Phiên bản theo nền tảng</h2>
                <p>Manifest mới nhất và đường dẫn tải được đọc từ Hendy Update Server.</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="button button-soft button-refresh"
                  type="button"
                  disabled={isSyncing}
                  onClick={syncData}
                >
                  <span>↻</span> {isSyncing ? 'Đang đồng bộ…' : 'Đồng bộ dữ liệu'}
                </button>
              </div>
            </div>

            <div className="release-grid">
              {/* Windows Card */}
              <article className="release-card release-windows">
                <div className="release-card-top">
                  <span className="release-app-icon windows-app-icon">⊞</span>
                  <span className={`state-chip ${windowsLatest?.mandatory ? 'state-loading' : 'state-ok'}`}>
                    {windowsLatest?.mandatory ? 'CẬP NHẬT BẮT BUỘC' : 'ĐÃ CÔNG BỐ'}
                  </span>
                </div>
                <div className="release-platform-label">DESKTOP SOFTWARE / 01</div>
                <h3>Hendy Tools <span>Pro</span></h3>
                <div className="release-version">
                  {windowsLatest ? `v${windowsLatest.version}` : '—'}
                </div>
                <div className="release-metrics">
                  <div>
                    <small>BUILD NUMBER</small>
                    <b>{windowsLatest?.build ?? '—'}</b>
                  </div>
                  <div>
                    <small>FILE SIZE</small>
                    <b>{windowsLatest?.artifact ? formatFileSize(windowsLatest.artifact.size) : '—'}</b>
                  </div>
                </div>
                <div className="release-date">
                  {windowsLatest ? `Phát hành ${formatReleaseDate(windowsLatest.publishedAt)}` : 'Đang tải ngày phát hành…'}
                </div>
                <div className="release-changelog">
                  <div className="subheading">
                    <span>RECENT CHANGES</span>
                    <i />
                  </div>
                  <ul className="notes-list">
                    {windowsLatest?.releaseNotes.slice(0, 4).map((note, idx) => (
                      <li key={idx}>{note}</li>
                    )) || <li>Không có ghi chú phát hành.</li>}
                  </ul>
                </div>
                <button
                  type="button"
                  className="button button-soft release-download"
                  onClick={() => handleDownload('windows')}
                >
                  Tải bộ cài Windows <span>↓</span>
                </button>
              </article>

              {/* Android Card */}
              <article className="release-card release-android">
                <div className="release-card-top">
                  <span className="release-app-icon android-app-icon">◉</span>
                  <span className={`state-chip ${androidLatest?.mandatory ? 'state-loading' : 'state-ok'}`}>
                    {androidLatest?.mandatory ? 'CẬP NHẬT BẮT BUỘC' : 'ĐÃ CÔNG BỐ'}
                  </span>
                </div>
                <div className="release-platform-label">MOBILE SOFTWARE / 02</div>
                <h3>Hendy Tools <span>Mobile</span></h3>
                <div className="release-version">
                  {androidLatest ? `v${androidLatest.version}` : '—'}
                </div>
                <div className="release-metrics">
                  <div>
                    <small>BUILD NUMBER</small>
                    <b>{androidLatest?.build ?? '—'}</b>
                  </div>
                  <div>
                    <small>FILE SIZE</small>
                    <b>{androidLatest?.artifact ? formatFileSize(androidLatest.artifact.size) : '—'}</b>
                  </div>
                </div>
                <div className="release-date">
                  {androidLatest ? `Phát hành ${formatReleaseDate(androidLatest.publishedAt)}` : 'Đang tải ngày phát hành…'}
                </div>
                <div className="release-changelog">
                  <div className="subheading">
                    <span>RECENT CHANGES</span>
                    <i />
                  </div>
                  <ul className="notes-list">
                    {androidLatest?.releaseNotes.slice(0, 4).map((note, idx) => (
                      <li key={idx}>{note}</li>
                    )) || <li>Không có ghi chú phát hành.</li>}
                  </ul>
                </div>
                <button
                  type="button"
                  className="button button-soft release-download"
                  onClick={() => handleDownload('android')}
                >
                  Tải APK Android <span>↓</span>
                </button>
              </article>

              {/* iOS Card */}
              <article className="release-card release-ios">
                <div className="release-card-top">
                  <span className="release-app-icon ios-app-icon">✳</span>
                  <span className="state-chip state-muted">PHỤ THUỘC APPLE</span>
                </div>
                <div className="release-platform-label">MOBILE SOFTWARE / 03</div>
                <h3>Hendy Tools <span>iOS</span></h3>
                <div className="release-version">
                  {iosLatest ? `v${iosLatest.version}` : 'Chưa phát hành'}
                </div>
                <div className="release-metrics">
                  <div>
                    <small>BUILD NUMBER</small>
                    <b>{iosLatest?.build ?? '—'}</b>
                  </div>
                  <div>
                    <small>DISTRIBUTION</small>
                    <b>Apple</b>
                  </div>
                </div>
                <div className="release-date">
                  Cần cấu hình phương thức phân phối hợp lệ.
                </div>
                <div className="release-changelog">
                  <div className="subheading">
                    <span>DISTRIBUTION NOTES</span>
                    <i />
                  </div>
                  <ul className="notes-list">
                    {iosLatest?.releaseNotes.slice(0, 4).map((note, idx) => (
                      <li key={idx}>{note}</li>
                    )) || <li>iOS cần chữ ký và phương thức phân phối được Apple cho phép.</li>}
                  </ul>
                </div>
                {iosLatest?.storeUrl ? (
                  <a
                    className="button button-soft release-download"
                    href={iosLatest.storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Mở trang phân phối iOS <span>↗</span>
                  </a>
                ) : (
                  <a
                    className="button button-soft release-download"
                    href="https://developer.apple.com/programs/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Thông tin phân phối iOS <span>↗</span>
                  </a>
                )}
              </article>
            </div>
          </section>

          {/* History Section */}
          <section id="history" className="content-section history-section">
            <div className="section-heading">
              <div>
                <div className="section-index">02 <span>/</span> CHANGELOG ARCHIVE</div>
                <h2>Lịch sử phát hành</h2>
                <p>Theo dõi từng phiên bản và nội dung thay đổi đã được lưu trong R2.</p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="history-filters" role="group" aria-label="Lọc nền tảng">
                  <button
                    type="button"
                    className={`filter ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    className={`filter ${activeFilter === 'windows' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('windows')}
                  >
                    Windows
                  </button>
                  <button
                    type="button"
                    className={`filter ${activeFilter === 'android' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('android')}
                  >
                    Android
                  </button>
                </div>
                <button
                  type="button"
                  className="filter"
                  style={{ color: '#829ab8' }}
                  onClick={handleResetDefaults}
                  title="Khôi phục dữ liệu ban đầu"
                >
                  ↺ Reset
                </button>
              </div>
            </div>

            <div className="history-shell">
              <div className="history-table-head">
                <span>VERSION / BUILD</span>
                <span>PLATFORM</span>
                <span>PUBLISHED</span>
                <span>RELEASE NOTES</span>
              </div>
              <div id="history-list">
                {filteredHistory.length === 0 ? (
                  <div className="empty-state">
                    Không có phiên bản nào cho bộ lọc này.
                  </div>
                ) : (
                  filteredHistory.map((item, index) => (
                    <div key={index} className="history-row">
                      <div>
                        <div className="history-version">v{item.version}</div>
                        <span className="history-build">BUILD {item.build}</span>
                      </div>
                      <div>
                        <span className="platform-badge">{item.platform.toUpperCase()}</span>
                      </div>
                      <div className="history-date">
                        {formatReleaseDate(item.publishedAt)}
                      </div>
                      <div className="history-notes">
                        <ul>
                          {item.releaseNotes.slice(0, 3).map((note, noteIdx) => (
                            <li key={noteIdx}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Publish Section */}
          <section id="publish" className="publish-section">
            <div className="publish-symbol">
              <span>↗</span>
            </div>
            <div className="publish-copy">
              <div className="section-index">03 <span>/</span> BUILD & PUBLISH</div>
              <h2>Chuẩn bị bản phát hành tiếp theo.</h2>
              <p>
                Mở workflow có xác thực trên GitHub để build Windows installer, Android APK, tính checksum và cập nhật manifest. Website này không lưu khóa ký hoặc Cloudflare token.
              </p>
              <div className="publish-steps">
                <span><b>01</b> Build trên cloud</span>
                <span><b>02</b> Upload R2</span>
                <span><b>03</b> Publish manifest</span>
              </div>
            </div>
            <div className="publish-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => setIsModalOpen(true)}
              >
                + Xuất bản manifest trực tiếp <span>↗</span>
              </button>
              <a
                className="button button-soft"
                href="https://github.com/ngogiaidy56-eng/HendyToolsApp/actions/workflows/build-and-publish-release.yml"
                target="_blank"
                rel="noopener noreferrer"
              >
                Mở release workflow <span>↗</span>
              </a>
            </div>
          </section>

          {/* Security Note */}
          <section className="security-note">
            <span className="security-icon">◇</span>
            <div>
              <b>Quyền phát hành được bảo vệ</b>
              <p>
                Trang này chỉ đọc metadata công khai. Các thao tác ghi lên R2 và tạo bản phát hành phải chạy trong GitHub Actions với quyền truy cập đã cấu hình.
              </p>
            </div>
            <span className="security-badge">NO PUBLIC WRITE TOKEN</span>
          </section>
        </main>

        {/* Footer */}
        <footer className="admin-footer">
          <button
            type="button"
            className="admin-brand footer-admin-brand"
            onClick={onOpenPublicSite}
          >
            <span className="admin-brand-mark">
              H<span>+</span>
            </span>
            <span>
              <b>HENDY<span>TOOLS</span></b>
              <small>RELEASE CONTROL</small>
            </span>
          </button>
          <span>Metadata công khai · Publishing bảo vệ bằng quyền GitHub</span>
          <button type="button" onClick={onOpenPublicSite}>
            Về trang tải ↗
          </button>
        </footer>
      </div>

      <NewReleaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          syncData();
          setToastMessage('Bản phát hành mới đã được công bố thành công vào hệ thống!');
          setTimeout(() => setToastMessage(null), 4000);
        }}
      />
    </div>
  );
};
