import React, { useState, useEffect } from 'react';
import { ReleaseStore, formatFileSize, formatSimpleDate } from '../services/releaseStore';
import { ReleaseManifest } from '../types';

interface Props {
  onOpenConsole: () => void;
  onOpenServerPanel: () => void;
  onOpenIntegrity: () => void;
}

export const DownloadCenter: React.FC<Props> = ({ onOpenConsole, onOpenServerPanel, onOpenIntegrity }) => {
  const [windowsRelease, setWindowsRelease] = useState<ReleaseManifest | null>(null);
  const [androidRelease, setAndroidRelease] = useState<ReleaseManifest | null>(null);
  const [iosRelease, setIosRelease] = useState<ReleaseManifest | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  const loadData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setWindowsRelease(ReleaseStore.getLatestRelease('windows', 'stable'));
      setAndroidRelease(ReleaseStore.getLatestRelease('android', 'stable'));
      setIosRelease(ReleaseStore.getLatestRelease('ios', 'stable'));
      const now = new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(new Date());
      setLastChecked(`Làm mới lúc ${now}`);
      setIsRefreshing(false);
    }, 250);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDownload = (platform: 'windows' | 'android') => {
    const release = platform === 'windows' ? windowsRelease : androidRelease;
    if (release && release.artifact) {
      ReleaseStore.triggerSimulatedDownload(platform, release.version, release.artifact.fileName);
      setDownloadToast(`Đang tải gói ${release.artifact.fileName}... Kiểm tra thư mục Downloads của bạn.`);
      setTimeout(() => setDownloadToast(null), 4500);
    }
  };

  return (
    <div className="download-page">
      <div className="ambient ambient-blue" aria-hidden="true" />
      <div className="ambient ambient-teal" aria-hidden="true" />
      <div className="grid-texture" aria-hidden="true" />

      {downloadToast && (
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
          <span>{downloadToast}</span>
        </div>
      )}

      {/* Header */}
      <header className="site-header shell">
        <a className="brand" href="#top" aria-label="Hendy Tools trang chủ">
          <span className="brand-mark">
            <svg viewBox="0 0 42 42" aria-hidden="true">
              <path d="M8 8h8v10h10V8h8v26h-8V25H16v9H8z" fill="currentColor" />
              <path d="M27 4h11v11" fill="none" stroke="#73E4D0" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
          <span className="brand-copy">
            <strong>HENDY<span>TOOLS</span></strong>
            <small>SOFTWARE, DELIVERED BETTER</small>
          </span>
        </a>

        <nav className="main-nav" aria-label="Điều hướng chính">
          <a href="#downloads">Ứng dụng</a>
          <a href="#updates">Có gì mới</a>
          <a href="#help">Hướng dẫn</a>
          <button type="button" onClick={onOpenIntegrity}>Kiểm tra Hash</button>
        </nav>

        <div className="header-cta-group">
          <button
            type="button"
            className="header-admin-cta"
            style={{ color: '#82baff', borderColor: 'rgba(52, 125, 255, 0.3)', background: 'rgba(52, 125, 255, 0.08)' }}
            onClick={onOpenServerPanel}
          >
            Server Panel Plus <span>⚙</span>
          </button>
          <button type="button" className="header-admin-cta" onClick={onOpenConsole}>
            Release Console <span>↗</span>
          </button>
          <a className="header-cta" href="#downloads">
            Tải ứng dụng <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main id="top" className="shell">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="status-orb" />
              <span>HENDY RELEASE CHANNEL</span>
              <b id="release-state">ĐÃ ĐỒNG BỘ</b>
            </div>
            <h1>
              Công nghệ tốt hơn.<br />
              <span>Trải nghiệm mượt hơn.</span>
            </h1>
            <p className="hero-description">
              Một điểm đến cho bộ công cụ Hendy. Tải đúng phiên bản, xem rõ lịch sử thay đổi và kiểm tra thông tin phát hành trước khi cài đặt.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#downloads">
                Khám phá ứng dụng <span>↓</span>
              </a>
              <a className="button button-quiet" href="#updates">
                Xem bản mới nhất <span>↗</span>
              </a>
            </div>
            <div className="trust-row">
              <span><i>✓</i> Phân phối HTTPS</span>
              <span><i>✓</i> SHA-256</span>
              <span><i>✓</i> Changelog rõ ràng</span>
            </div>
            <div className="hero-footnote">
              <span className="tiny-line" />
              <span>Được phát hành theo phiên bản · cập nhật từ Hendy Update Server</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="Minh họa giao diện Hendy Tools">
            <div className="visual-glow" />
            <div className="visual-ring ring-outer" />
            <div className="visual-ring ring-inner" />

            <div className="dashboard-window">
              <div className="window-titlebar">
                <div className="traffic-lights">
                  <i /><i /><i />
                </div>
                <span>HENDY / SYSTEM OVERVIEW</span>
                <span className="window-status">
                  <b /> LIVE
                </span>
              </div>
              <div className="dashboard-body">
                <aside className="dashboard-rail">
                  <div className="rail-brand">H+</div>
                  <span className="rail-active">⌂</span>
                  <span>◈</span>
                  <span>▤</span>
                  <span>⌘</span>
                  <div className="rail-bottom">⚙</div>
                </aside>
                <div className="dashboard-main">
                  <div className="dash-greeting">
                    <div>
                      <small>SYSTEM OVERVIEW</small>
                      <h3>Chào mừng trở lại.</h3>
                    </div>
                    <span className="dash-avatar">H</span>
                  </div>
                  <div className="metric-cards">
                    <div className="metric-card">
                      <small>HIỆU NĂNG</small>
                      <b>Optimal</b>
                      <div className="metric-chart chart-blue">
                        <i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i />
                      </div>
                    </div>
                    <div className="metric-card">
                      <small>TRẠNG THÁI</small>
                      <b><span className="green-dot" /> Stable</b>
                      <div className="health-track">
                        <i />
                      </div>
                    </div>
                  </div>
                  <div className="activity-card">
                    <div className="activity-heading">
                      <b>Hoạt động gần đây</b>
                      <span>LAST 24H</span>
                    </div>
                    <div className="activity-row">
                      <span className="activity-icon blue-icon">↻</span>
                      <div>
                        <b>System scan</b>
                        <small>Kiểm tra hoàn tất</small>
                      </div>
                      <em>Vừa xong</em>
                    </div>
                    <div className="activity-row">
                      <span className="activity-icon teal-icon">⬡</span>
                      <div>
                        <b>Release verified</b>
                        <small>Checksum đã sẵn sàng</small>
                      </div>
                      <em className="success-label">Tốt</em>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="floating-label floating-release">
              <span className="floating-check">✓</span>
              <span>
                <b>Release verified</b>
                <small>Integrity first</small>
              </span>
            </div>

            <div className="floating-label floating-download">
              <span className="download-glyph">↓</span>
              <span>
                <b>Direct download</b>
                <small>Không qua trung gian</small>
              </span>
            </div>

            <div className="visual-caption">
              <span>01</span>
              <i />
              <span>TOOLS THAT WORK WITH YOU</span>
            </div>
          </div>
        </section>

        {/* Downloads Section */}
        <section id="downloads" className="downloads-section section-block">
          <div className="section-heading">
            <div>
              <div className="section-kicker">01 <span>—</span> CHỌN NỀN TẢNG</div>
              <h2>Công cụ dành cho bạn.</h2>
              <p>Chọn thiết bị, tải đúng gói và kiểm tra thông tin phiên bản trước khi cài.</p>
            </div>
            <div className="sync-status">
              <span className="status-orb" />
              <div>
                <small>UPDATE SERVER</small>
                <b>{lastChecked || 'Đang kết nối…'}</b>
              </div>
            </div>
          </div>

          <div className="download-grid">
            {/* Windows Card */}
            <article className="download-card windows-card" id="windows-card">
              <div className="card-top">
                <span className="platform-name">
                  <span className="platform-symbol windows-symbol">⊞</span> WINDOWS
                </span>
                <span className="channel-badge">{windowsRelease ? windowsRelease.channel.toUpperCase() : 'STABLE'}</span>
              </div>
              <div className="product-art windows-art">
                <div className="art-orbit" />
                <div className="windows-mark-large">
                  <i /><i /><i /><i />
                </div>
                <span className="art-version">DESKTOP EDITION</span>
              </div>
              <div className="product-copy">
                <div className="product-index">HENDY / 01</div>
                <h3>Hendy Tools <span>Pro</span></h3>
                <p>Công cụ tối ưu, chẩn đoán và quản lý Windows — tập trung vào sự rõ ràng và kiểm soát.</p>
              </div>
              <div className="release-details">
                <div>
                  <small>PHIÊN BẢN</small>
                  <b>{windowsRelease ? `v${windowsRelease.version}` : 'Đang tải…'}</b>
                </div>
                <div>
                  <small>DUNG LƯỢNG</small>
                  <b>{windowsRelease?.artifact ? formatFileSize(windowsRelease.artifact.size) : '—'}</b>
                </div>
              </div>
              <button
                type="button"
                className="button button-primary product-download"
                onClick={() => handleDownload('windows')}
              >
                <span>Tải bộ cài Windows</span>
                <b>↓</b>
              </button>
              <div className="product-foot">
                <span className="file-label"><i /> EXE INSTALLER</span>
                <span title={windowsRelease?.artifact?.sha256}>
                  {windowsRelease?.artifact?.sha256 ? `SHA-256: ${windowsRelease.artifact.sha256.slice(0, 10)}…` : 'SHA-256 sẵn có'}
                </span>
              </div>
            </article>

            {/* Android Card */}
            <article className="download-card android-card" id="android-card">
              <div className="card-top">
                <span className="platform-name">
                  <span className="platform-symbol android-symbol">◉</span> ANDROID
                </span>
                <span className="channel-badge">{androidRelease ? androidRelease.channel.toUpperCase() : 'STABLE'}</span>
              </div>
              <div className="product-art android-art">
                <div className="phone-halo" />
                <div className="phone-device">
                  <div className="phone-camera" />
                  <div className="phone-screen">
                    <div className="phone-app-mark">H<span>+</span></div>
                    <b>HENDY</b>
                    <small>TOOLS MOBILE</small>
                    <div className="phone-bars"><i /><i /><i /></div>
                    <span className="phone-status"><i /> DEVICE HEALTHY</span>
                  </div>
                </div>
                <span className="art-version">MOBILE COMPANION</span>
              </div>
              <div className="product-copy">
                <div className="product-index">HENDY / 02</div>
                <h3>Hendy Tools <span>Mobile</span></h3>
                <p>Thông tin thiết bị, trạng thái pin và tiện ích bảo trì trong phạm vi ứng dụng Android.</p>
              </div>
              <div className="release-details">
                <div>
                  <small>PHIÊN BẢN</small>
                  <b>{androidRelease ? `v${androidRelease.version}` : 'Đang tải…'}</b>
                </div>
                <div>
                  <small>DUNG LƯỢNG</small>
                  <b>{androidRelease?.artifact ? formatFileSize(androidRelease.artifact.size) : '—'}</b>
                </div>
              </div>
              <button
                type="button"
                className="button button-secondary product-download"
                onClick={() => handleDownload('android')}
              >
                <span>Tải APK Android</span>
                <b>↓</b>
              </button>
              <div className="product-foot">
                <span className="file-label"><i /> ANDROID APK</span>
                <span>Cài từ trình duyệt</span>
              </div>
            </article>

            {/* iOS Card */}
            <article className="download-card ios-card" id="ios-card">
              <div className="card-top">
                <span className="platform-name">
                  <span className="platform-symbol ios-symbol">✳</span> IOS / IPADOS
                </span>
                <span className="channel-badge muted-channel">APPLE</span>
              </div>
              <div className="product-art ios-art">
                <div className="ios-orbit ios-orbit-a" />
                <div className="ios-orbit ios-orbit-b" />
                <div className="ios-device">
                  <div className="ios-island" />
                  <div className="ios-brand-mark">H<span>+</span></div>
                  <b>HENDY</b>
                  <small>TOOLS MOBILE</small>
                </div>
                <span className="art-version">IOS EDITION</span>
              </div>
              <div className="product-copy">
                <div className="product-index">HENDY / 03</div>
                <h3>Hendy Tools <span>iOS</span></h3>
                <p>Trang thông tin dành cho iPhone. Phân phối cần tuân thủ chữ ký và phương thức được Apple cho phép.</p>
              </div>
              <div className="release-details">
                <div>
                  <small>PHIÊN BẢN</small>
                  <b>{iosRelease ? `v${iosRelease.version}` : 'Chưa phát hành'}</b>
                </div>
                <div>
                  <small>PHÂN PHỐI</small>
                  <b>Theo Apple</b>
                </div>
              </div>
              <div className="ios-note">
                {iosRelease?.storeUrl
                  ? 'Có liên kết phân phối TestFlight được cấu hình.'
                  : 'Chưa có liên kết phân phối iOS được cấu hình.'}
              </div>
              {iosRelease?.storeUrl ? (
                <a
                  className="button button-quiet product-download"
                  href={iosRelease.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Mở kênh TestFlight</span>
                  <b>↗</b>
                </a>
              ) : (
                <a className="button button-quiet product-download disabled" href="#help">
                  <span>Thông tin phân phối iOS</span>
                  <b>↗</b>
                </a>
              )}
              <div className="product-foot">
                <span className="file-label"><i /> IOS / IPADOS</span>
                <span>Phụ thuộc khu vực & chữ ký</span>
              </div>
            </article>
          </div>

          {/* Integrity Banner */}
          <div className="integrity-banner">
            <div className="integrity-emblem">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="m8.5 12 2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <b>Kiểm tra tính toàn vẹn trước khi cài</b>
              <p>
                So sánh phiên bản và SHA-256 khi cần. Chỉ cài bộ phát hành từ nguồn bạn tin tưởng; hash giúp phát hiện sai lệch nhưng không thay thế chữ ký số.
              </p>
            </div>
            <button type="button" onClick={onOpenIntegrity}>
              Kiểm tra mã SHA-256 <span>↗</span>
            </button>
          </div>
        </section>

        {/* Updates / Release Notes Section */}
        <section id="updates" className="updates-section section-block">
          <div className="section-heading">
            <div>
              <div className="section-kicker">02 <span>—</span> RELEASE NOTES</div>
              <h2>Mới trong Hendy.</h2>
              <p>Các thay đổi được hiển thị từ manifest phát hành do Update Server cung cấp.</p>
            </div>
            <button
              className="refresh-button"
              type="button"
              disabled={isRefreshing}
              onClick={loadData}
            >
              <span>↻</span> {isRefreshing ? 'Đang tải…' : 'Làm mới'}
            </button>
          </div>

          <div className="release-notes-grid">
            {/* Windows Notes */}
            <article className="notes-card">
              <div className="notes-top">
                <span className="notes-platform windows-notes-icon">⊞</span>
                <span className="notes-label">DESKTOP / WINDOWS</span>
                <span className="notes-line" />
              </div>
              <div className="notes-product">
                <div>
                  <h3>Hendy Tools Pro</h3>
                  <small>{windowsRelease ? `Phát hành ${formatSimpleDate(windowsRelease.publishedAt)}` : 'Đang kiểm tra…'}</small>
                </div>
                <b className="notes-version">
                  {windowsRelease ? `v${windowsRelease.version} · B${windowsRelease.build}` : '—'}
                </b>
              </div>
              <ul>
                {windowsRelease?.releaseNotes.map((note, index) => (
                  <li key={index}>{note}</li>
                )) || <li>Đang tải ghi chú phát hành…</li>}
              </ul>
            </article>

            {/* Android Notes */}
            <article className="notes-card">
              <div className="notes-top">
                <span className="notes-platform android-notes-icon">◉</span>
                <span className="notes-label">MOBILE / ANDROID</span>
                <span className="notes-line" />
              </div>
              <div className="notes-product">
                <div>
                  <h3>Hendy Tools Mobile</h3>
                  <small>{androidRelease ? `Phát hành ${formatSimpleDate(androidRelease.publishedAt)}` : 'Đang kiểm tra…'}</small>
                </div>
                <b className="notes-version">
                  {androidRelease ? `v${androidRelease.version} · B${androidRelease.build}` : '—'}
                </b>
              </div>
              <ul>
                {androidRelease?.releaseNotes.map((note, index) => (
                  <li key={index}>{note}</li>
                )) || <li>Đang tải ghi chú phát hành…</li>}
              </ul>
            </article>
          </div>

          <div className="archive-card">
            <div className="archive-symbol">↗</div>
            <div className="archive-copy">
              <small>RELEASE ARCHIVE</small>
              <h3>Mỗi phiên bản đều có lịch sử.</h3>
              <p>Tra cứu changelog và phiên bản cũ qua Release Console.</p>
            </div>
            <button type="button" className="button button-secondary" onClick={onOpenConsole}>
              Mở lịch sử phát hành <span>↗</span>
            </button>
          </div>
        </section>

        {/* Installation Help Section */}
        <section id="help" className="help-section section-block">
          <div className="section-heading">
            <div>
              <div className="section-kicker">03 <span>—</span> CÀI ĐẶT</div>
              <h2>Bắt đầu trong vài bước.</h2>
              <p>Quy trình tải và cài đặt minh bạch, bạn luôn kiểm soát bước cài cuối cùng.</p>
            </div>
          </div>
          <div className="help-grid">
            <article>
              <span className="help-number">01</span>
              <div>
                <h3>Tải đúng gói</h3>
                <p>Windows tải EXE; Android tải APK. Kiểm tra phiên bản và nền tảng trước khi mở tệp.</p>
              </div>
              <span className="help-arrow">↗</span>
            </article>
            <article>
              <span className="help-number">02</span>
              <div>
                <h3>Xác nhận cài đặt</h3>
                <p>Windows có thể yêu cầu xác nhận hệ thống. Android có thể yêu cầu cho phép trình duyệt cài APK.</p>
              </div>
              <span className="help-arrow">↗</span>
            </article>
            <article>
              <span className="help-number">03</span>
              <div>
                <h3>Luôn được cập nhật</h3>
                <p>Ứng dụng có thể kiểm tra phiên bản mới và hướng bạn tới luồng cập nhật phù hợp của nền tảng.</p>
              </div>
              <span className="help-arrow">↗</span>
            </article>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="site-footer shell">
        <a className="brand footer-brand" href="#top">
          <span className="brand-mark">
            <svg viewBox="0 0 42 42" aria-hidden="true">
              <path d="M8 8h8v10h10V8h8v26h-8V25H16v9H8z" fill="currentColor" />
              <path d="M27 4h11v11" fill="none" stroke="#73E4D0" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
          <span className="brand-copy">
            <strong>HENDY<span>TOOLS</span></strong>
            <small>SOFTWARE, DELIVERED BETTER</small>
          </span>
        </a>
        <p>Phần mềm được phát hành theo phiên bản. Hãy luôn dùng nguồn tải chính thức.</p>
        <div className="footer-status">
          <i className="status-orb" /> Máy chủ phát hành phản hồi
        </div>
        <button type="button" className="footer-admin" onClick={onOpenConsole}>
          Release Console ↗
        </button>
      </footer>
    </div>
  );
};
