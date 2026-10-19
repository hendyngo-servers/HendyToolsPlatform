import React, { useState, useEffect } from 'react';
import { ProductionStore, formatByteSize, formatSimpleDate } from '../shared/store';
import { ReleaseManifest } from '../shared/types';
import './DownloadPortal.css';

interface Props {
  onOpenAdmin: () => void;
  onOpenIntegrity: () => void;
}

export const DownloadPortal: React.FC<Props> = ({ onOpenAdmin, onOpenIntegrity }) => {
  const [winRelease, setWinRelease] = useState<ReleaseManifest | null>(null);
  const [androidRelease, setAndroidRelease] = useState<ReleaseManifest | null>(null);
  const [iosRelease, setIosRelease] = useState<ReleaseManifest | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<{ platform: string; file: string } | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const refreshData = () => {
    setWinRelease(ProductionStore.getLatest('windows', 'stable'));
    setAndroidRelease(ProductionStore.getLatest('android', 'stable'));
    setIosRelease(ProductionStore.getLatest('ios', 'stable'));
    const now = new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date());
    setLastCheckTime(now);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleDownload = (platform: 'windows' | 'android') => {
    const target = platform === 'windows' ? winRelease : androidRelease;
    if (target?.artifact) {
      setDownloadProgress({ platform, file: target.artifact.fileName });
      ProductionStore.triggerProductionDownload(platform, target.version, target.artifact.fileName);
      setTimeout(() => setDownloadProgress(null), 4000);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  return (
    <div className="portal-root">
      {/* Top Release Advisory Bar */}
      <div className="portal-top-banner">
        <span>
          <strong>BẢN PHÁT HÀNH CHÍNH THỨC 2026</strong> · Ký số xác thực Authenticode EV & Cloudflare R2 Edge Delivery
        </span>
      </div>

      {downloadProgress && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 1000,
            background: 'linear-gradient(135deg, #102d52, #07172c)',
            border: '1px solid #73e4d0',
            color: '#e2f9f4',
            padding: '14px 20px',
            borderRadius: 12,
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ color: '#73e4d0', fontSize: 18 }}>✓</span>
          <div>
            <b>Đang tải gói cài đặt chính thức:</b>
            <div style={{ color: '#88b8f2', font: '10px var(--mono)' }}>{downloadProgress.file}</div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="portal-header shell">
        <a className="portal-brand" href="#top" aria-label="Hendy Tools Home">
          <span className="portal-brand-icon">
            <svg viewBox="0 0 42 42" width="26" height="26" aria-hidden="true">
              <path d="M8 8h8v10h10V8h8v26h-8V25H16v9H8z" fill="currentColor" />
              <path d="M27 4h11v11" fill="none" stroke="#73E4D0" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
          <div className="portal-brand-text">
            <strong>HENDY<span>TOOLS</span></strong>
            <small>OFFICIAL DOWNLOAD CENTER</small>
          </div>
        </a>

        <nav className="portal-nav" aria-label="Điều hướng chính">
          <a href="#downloads">Ứng dụng</a>
          <a href="#integrity">Tính toàn vẹn</a>
          <a href="#changelog">Ghi chú phát hành</a>
          <a href="#guide">Hướng dẫn cài đặt</a>
          <button type="button" onClick={onOpenIntegrity}>Đối chiếu SHA-256</button>
        </nav>

        <div className="portal-header-actions">
          <button
            type="button"
            className="portal-admin-entry"
            onClick={onOpenAdmin}
            title="Dành cho Quản trị viên hệ thống & Kỹ sư phát hành"
          >
            <span>Bảng Quản Trị Server Plus</span>
            <span style={{ fontSize: 13 }}>⚙</span>
          </button>
          <a className="button button-primary" href="#downloads" style={{ minHeight: 38, padding: '0 14px' }}>
            Tải ngay <span>↓</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main id="top" className="shell">
        {/* Hero Section */}
        <section className="portal-hero">
          <div>
            <div className="eyebrow">
              <span className="status-orb" />
              <span>CHÍNH THỨC · HENDY RELEASE CHANNEL</span>
              <b>LIVE CLOUDFLARE R2</b>
            </div>
            <h1 className="portal-hero-title">
              Nền tảng công cụ tối ưu.<br />
              <span>Phân phối trực tiếp, an toàn.</span>
            </h1>
            <p className="portal-hero-p">
              Tải đúng phiên bản chính thức của Hendy Tools Pro (Windows) và Hendy Tools Mobile (Android). Toàn bộ gói phần mềm được đóng gói độc lập, kiểm tra mã băm SHA-256 và chữ ký số trước khi cài đặt.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#downloads">
                Tải ứng dụng <span>↓</span>
              </a>
              <button type="button" className="button button-secondary" onClick={onOpenIntegrity}>
                Kiểm tra mã SHA-256 <span>🛡</span>
              </button>
            </div>
            <div className="portal-trust-row">
              <span><i>✓</i> Ký số Authenticode EV</span>
              <span><i>✓</i> Phân phối HTTPS TLS 1.3</span>
              <span><i>✓</i> SHA-256 đối chiếu</span>
              <span><i>✓</i> Không phần mềm rác</span>
            </div>
          </div>

          {/* Interactive Software Showcase */}
          <div className="hero-visual" aria-label="Giao diện mô phỏng Hendy Tools">
            <div className="visual-glow" />
            <div className="visual-ring ring-outer" />
            <div className="visual-ring ring-inner" />

            <div className="dashboard-window">
              <div className="window-titlebar">
                <div className="traffic-lights">
                  <i /><i /><i />
                </div>
                <span>HENDY / PRODUCTION SYSTEM OVERVIEW</span>
                <span className="window-status">
                  <b /> STABLE
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
                      <small>ENGINE STATUS</small>
                      <h3>Hệ thống hoạt động tối ưu.</h3>
                    </div>
                    <span className="dash-avatar">H</span>
                  </div>
                  <div className="metric-cards">
                    <div className="metric-card">
                      <small>HIỆU SUẤT XỬ LÝ</small>
                      <b>99.98% Optimal</b>
                      <div className="metric-chart chart-blue">
                        <i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i />
                      </div>
                    </div>
                    <div className="metric-card">
                      <small>CHỮ KÝ BẢO MẬT</small>
                      <b><span className="green-dot" /> EV Signed</b>
                      <div className="health-track">
                        <i style={{ width: '92%' }} />
                      </div>
                    </div>
                  </div>
                  <div className="activity-card">
                    <div className="activity-heading">
                      <b>Kiểm định phát hành</b>
                      <span>PRODUCTION</span>
                    </div>
                    <div className="activity-row">
                      <span className="activity-icon blue-icon">✓</span>
                      <div>
                        <b>Authenticode Verification</b>
                        <small>Chữ ký số hợp lệ</small>
                      </div>
                      <em>Pass</em>
                    </div>
                    <div className="activity-row">
                      <span className="activity-icon teal-icon">⬡</span>
                      <div>
                        <b>R2 Edge Checksum</b>
                        <small>Mã băm SHA-256 đồng bộ</small>
                      </div>
                      <em className="success-label">Active</em>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="floating-label floating-release">
              <span className="floating-check">✓</span>
              <span>
                <b>Release Verified</b>
                <small>Cloudflare CDN</small>
              </span>
            </div>

            <div className="floating-label floating-download">
              <span className="download-glyph">↓</span>
              <span>
                <b>Direct Delivery</b>
                <small>Tốc độ cao</small>
              </span>
            </div>
          </div>
        </section>

        {/* Section 01: Download Matrix */}
        <section id="downloads" className="section-block" style={{ paddingTop: 40 }}>
          <div className="section-heading">
            <div>
              <div className="section-kicker">01 <span>—</span> PHÂN PHỐI NỀN TẢNG</div>
              <h2>Chọn phiên bản phù hợp với thiết bị</h2>
              <p>Các gói cài đặt chính thức được tải trực tiếp từ cụm máy chủ Cloudflare R2 an toàn.</p>
            </div>
            <div className="sync-status">
              <span className="status-orb" />
              <div>
                <small>UPDATE SERVER SYNC</small>
                <b>{lastCheckTime ? `Đồng bộ lúc ${lastCheckTime}` : 'Đang kết nối…'}</b>
              </div>
            </div>
          </div>

          <div className="portal-card-grid">
            {/* Windows Card */}
            <article className="portal-card" style={{ borderTop: '2px solid #377fff' }}>
              <div className="portal-card-header">
                <span className="portal-card-platform">
                  <span style={{ fontSize: 17, color: '#8dbdff' }}>⊞</span> WINDOWS DESKTOP
                </span>
                <span className="portal-card-badge">{winRelease ? winRelease.channel.toUpperCase() : 'STABLE'}</span>
              </div>
              <div className="portal-card-art">
                <div className="art-orbit" />
                <div className="windows-mark-large">
                  <i /><i /><i /><i />
                </div>
              </div>
              <h3 className="portal-card-title">Hendy Tools <span>Pro</span></h3>
              <p className="portal-card-desc">
                Công cụ tối ưu hóa, chẩn đoán phần cứng, dọn dẹp bộ nhớ đệm và giám sát hệ thống dành riêng cho Windows 10 & 11 (64-bit).
              </p>
              <div className="portal-card-meta">
                <div>
                  <small>PHIÊN BẢN</small>
                  <b>{winRelease ? `v${winRelease.version}` : 'Đang tải…'}</b>
                </div>
                <div>
                  <small>DUNG LƯỢNG GÓI</small>
                  <b>{winRelease?.artifact ? formatByteSize(winRelease.artifact.size) : '—'}</b>
                </div>
              </div>
              <button
                type="button"
                className="button button-primary portal-card-btn"
                onClick={() => handleDownload('windows')}
              >
                <span>Tải bộ cài Windows (.exe)</span>
                <b>↓</b>
              </button>
              <div className="portal-card-foot">
                <span className="file-label"><i /> EXE INSTALLER</span>
                <span
                  title={winRelease?.artifact?.sha256}
                  onClick={() => winRelease?.artifact?.sha256 && copyToClipboard(winRelease.artifact.sha256)}
                  style={{ cursor: 'pointer' }}
                >
                  {copiedHash === winRelease?.artifact?.sha256 ? '✓ Đã sao chép hash' : `SHA-256: ${winRelease?.artifact?.sha256.slice(0, 10)}…`}
                </span>
              </div>
            </article>

            {/* Android Card */}
            <article className="portal-card" style={{ borderTop: '2px solid #73e4d0' }}>
              <div className="portal-card-header">
                <span className="portal-card-platform">
                  <span style={{ fontSize: 17, color: '#73e4d0' }}>◉</span> ANDROID MOBILE
                </span>
                <span className="portal-card-badge" style={{ color: '#73e4d0', borderColor: 'rgba(115,228,208,0.3)', background: 'rgba(115,228,208,0.1)' }}>
                  {androidRelease ? androidRelease.channel.toUpperCase() : 'STABLE'}
                </span>
              </div>
              <div className="portal-card-art">
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
              </div>
              <h3 className="portal-card-title">Hendy Tools <span>Mobile</span></h3>
              <p className="portal-card-desc">
                Ứng dụng giám sát chu kỳ pin, nhiệt độ phần cứng, công suất sạc và bộ nhớ đệm cho Android 8.0 trở lên.
              </p>
              <div className="portal-card-meta">
                <div>
                  <small>PHIÊN BẢN</small>
                  <b>{androidRelease ? `v${androidRelease.version}` : 'Đang tải…'}</b>
                </div>
                <div>
                  <small>DUNG LƯỢNG GÓI</small>
                  <b>{androidRelease?.artifact ? formatByteSize(androidRelease.artifact.size) : '—'}</b>
                </div>
              </div>
              <button
                type="button"
                className="button button-secondary portal-card-btn"
                onClick={() => handleDownload('android')}
              >
                <span>Tải APK Android (.apk)</span>
                <b>↓</b>
              </button>
              <div className="portal-card-foot">
                <span className="file-label"><i /> ANDROID APK</span>
                <span
                  title={androidRelease?.artifact?.sha256}
                  onClick={() => androidRelease?.artifact?.sha256 && copyToClipboard(androidRelease.artifact.sha256)}
                  style={{ cursor: 'pointer' }}
                >
                  {copiedHash === androidRelease?.artifact?.sha256 ? '✓ Đã sao chép hash' : `SHA-256: ${androidRelease?.artifact?.sha256.slice(0, 10)}…`}
                </span>
              </div>
            </article>

            {/* iOS Card */}
            <article className="portal-card" style={{ borderTop: '2px solid #8fa5c4' }}>
              <div className="portal-card-header">
                <span className="portal-card-platform">
                  <span style={{ fontSize: 17, color: '#c4d6ed' }}>✳</span> APPLE IOS / IPADOS
                </span>
                <span className="portal-card-badge" style={{ color: '#c4d6ed', borderColor: 'rgba(200,220,245,0.2)', background: 'rgba(200,220,245,0.06)' }}>
                  ENTERPRISE
                </span>
              </div>
              <div className="portal-card-art">
                <div className="ios-orbit ios-orbit-a" />
                <div className="ios-orbit ios-orbit-b" />
                <div className="ios-device">
                  <div className="ios-island" />
                  <div className="ios-brand-mark">H<span>+</span></div>
                  <b>HENDY</b>
                  <small>TOOLS MOBILE</small>
                </div>
              </div>
              <h3 className="portal-card-title">Hendy Tools <span>iOS</span></h3>
              <p className="portal-card-desc">
                Phiên bản kiểm định phần cứng và kiểm tra pin chuyên sâu phân phối qua TestFlight và kênh Enterprise của Apple.
              </p>
              <div className="portal-card-meta">
                <div>
                  <small>PHIÊN BẢN</small>
                  <b>{iosRelease ? `v${iosRelease.version}` : 'v1.1.0'}</b>
                </div>
                <div>
                  <small>PHÂN PHỐI</small>
                  <b>Apple TestFlight</b>
                </div>
              </div>
              {iosRelease?.storeUrl ? (
                <a
                  className="button button-quiet portal-card-btn"
                  href={iosRelease.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textAlign: 'center' }}
                >
                  <span>Mở kênh TestFlight ↗</span>
                </a>
              ) : (
                <button type="button" className="button button-quiet portal-card-btn disabled">
                  <span>Theo quy chuẩn Apple ↗</span>
                </button>
              )}
              <div className="portal-card-foot">
                <span className="file-label"><i /> APPLE ECOSYSTEM</span>
                <span>Chữ ký số Apple Developer</span>
              </div>
            </article>
          </div>

          {/* Integrity Assurance Box */}
          <div className="portal-integrity-box" id="integrity">
            <div className="portal-integrity-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                <path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="m8.5 12 2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 13, color: '#ffffff' }}>Bảo chứng tính toàn vẹn gói phát hành</b>
              <p style={{ color: '#90a8c7', fontSize: 11, margin: '4px 0 0', lineHeight: 1.7 }}>
                Mỗi gói cài đặt sau khi build trên GitHub Actions được tính toán mã băm SHA-256 bất biến trước khi ghi vào Cloudflare R2. Bạn có thể sử dụng công cụ đối chiếu để bảo đảm không xảy ra lỗi truyền tải.
              </p>
            </div>
            <button type="button" className="button button-secondary" onClick={onOpenIntegrity}>
              Mở công cụ kiểm tra <span>🛡</span>
            </button>
          </div>
        </section>

        {/* Section 02: Release Notes & Changelogs */}
        <section id="changelog" className="section-block" style={{ paddingTop: 75 }}>
          <div className="section-heading">
            <div>
              <div className="section-kicker">02 <span>—</span> GHI CHÚ PHÁT HÀNH</div>
              <h2>Có gì mới trong phiên bản gần nhất</h2>
              <p>Chi tiết các cập nhật về tính năng, sửa lỗi và cải tiến hiệu năng.</p>
            </div>
            <button type="button" className="refresh-button" onClick={refreshData}>
              <span>↻</span> Đồng bộ lại
            </button>
          </div>

          <div className="portal-notes-grid">
            {/* Windows Changelog */}
            <article className="portal-note-card">
              <div className="notes-top">
                <span className="notes-platform windows-notes-icon">⊞</span>
                <span className="notes-label">WINDOWS DESKTOP</span>
                <span className="notes-line" />
              </div>
              <div className="notes-product">
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>Hendy Tools Pro</h3>
                  <small style={{ color: '#748baa', fontSize: 9 }}>
                    {winRelease ? `Công bố ${formatSimpleDate(winRelease.publishedAt)}` : 'Đang tải…'}
                  </small>
                </div>
                <b className="notes-version">
                  {winRelease ? `v${winRelease.version} · Build ${winRelease.build}` : '—'}
                </b>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0' }}>
                {winRelease?.releaseNotes.map((note, idx) => (
                  <li key={idx} style={{ position: 'relative', paddingLeft: 16, margin: '8px 0', color: '#9cb1cf', fontSize: 11, lineHeight: 1.6 }}>
                    <span style={{ position: 'absolute', left: 0, top: 6, width: 5, height: 5, borderRadius: '50%', background: '#70b7ff' }} />
                    {note}
                  </li>
                )) || <li>Không có ghi chú phát hành.</li>}
              </ul>
            </article>

            {/* Android Changelog */}
            <article className="portal-note-card">
              <div className="notes-top">
                <span className="notes-platform android-notes-icon">◉</span>
                <span className="notes-label">ANDROID MOBILE</span>
                <span className="notes-line" />
              </div>
              <div className="notes-product">
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>Hendy Tools Mobile</h3>
                  <small style={{ color: '#748baa', fontSize: 9 }}>
                    {androidRelease ? `Công bố ${formatSimpleDate(androidRelease.publishedAt)}` : 'Đang tải…'}
                  </small>
                </div>
                <b className="notes-version">
                  {androidRelease ? `v${androidRelease.version} · Build ${androidRelease.build}` : '—'}
                </b>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0' }}>
                {androidRelease?.releaseNotes.map((note, idx) => (
                  <li key={idx} style={{ position: 'relative', paddingLeft: 16, margin: '8px 0', color: '#9cb1cf', fontSize: 11, lineHeight: 1.6 }}>
                    <span style={{ position: 'absolute', left: 0, top: 6, width: 5, height: 5, borderRadius: '50%', background: '#73e4d0' }} />
                    {note}
                  </li>
                )) || <li>Không có ghi chú phát hành.</li>}
              </ul>
            </article>
          </div>
        </section>

        {/* Section 03: Installation Guide */}
        <section id="guide" className="section-block" style={{ paddingTop: 75 }}>
          <div className="section-heading">
            <div>
              <div className="section-kicker">03 <span>—</span> HƯỚNG DẪN CÀI ĐẶT</div>
              <h2>Quy trình cài đặt an toàn & minh bạch</h2>
              <p>Bạn luôn nắm quyền kiểm soát các bước cài đặt cuối cùng trên thiết bị.</p>
            </div>
          </div>
          <div className="help-grid">
            <article>
              <span className="help-number">01</span>
              <div>
                <h3>Tải gói từ nguồn chính thức</h3>
                <p>Windows chọn tệp .EXE; Android chọn tệp .APK. Luôn kiểm tra tên tệp trước khi mở.</p>
              </div>
              <span className="help-arrow">↗</span>
            </article>
            <article>
              <span className="help-number">02</span>
              <div>
                <h3>Xác nhận quyền hệ điều hành</h3>
                <p>Windows SmartScreen hiển thị chữ ký số hợp lệ. Android yêu cầu cho phép cài ứng dụng từ trình duyệt.</p>
              </div>
              <span className="help-arrow">↗</span>
            </article>
            <article>
              <span className="help-number">03</span>
              <div>
                <h3>Cập nhật tự động an toàn</h3>
                <p>Ứng dụng định kỳ kiểm tra manifest trên Cloudflare R2 để tải bản vá bảo mật mới nhất.</p>
              </div>
              <span className="help-arrow">↗</span>
            </article>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="portal-footer shell">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="portal-brand-icon" style={{ width: 32, height: 32 }}>
            <svg viewBox="0 0 42 42" width="20" height="20" aria-hidden="true">
              <path d="M8 8h8v10h10V8h8v26h-8V25H16v9H8z" fill="currentColor" />
              <path d="M27 4h11v11" fill="none" stroke="#73E4D0" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <b style={{ color: '#ffffff', fontSize: 12 }}>HENDY TOOLS PLATFORM</b>
            <div style={{ color: '#6882a4', fontSize: 9 }}>Enterprise Software Distribution Center</div>
          </div>
        </div>

        <div style={{ color: '#6680a1', fontSize: 10 }}>
          Phân phối HTTPS an toàn · Bảo vệ bởi Cloudflare CDN · Ký số Authenticode
        </div>

        <button
          type="button"
          onClick={onOpenAdmin}
          style={{
            color: '#73e4d0',
            fontSize: 11,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>Cổng Kỹ thuật & Quản trị Server Plus</span>
          <span>↗</span>
        </button>
      </footer>
    </div>
  );
};
