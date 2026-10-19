import React, { useState } from 'react';
import { Platform, Channel, ReleaseManifest } from './types';
import { ProductionStore, VERSION_REGEX, SHA256_REGEX } from './store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPublished: () => void;
}

export const PublishModal: React.FC<Props> = ({ isOpen, onClose, onPublished }) => {
  const [platform, setPlatform] = useState<Platform>('windows');
  const [channel, setChannel] = useState<Channel>('stable');
  const [version, setVersion] = useState('3.2.0');
  const [build, setBuild] = useState('30200');
  const [minSupportedVersion, setMinSupportedVersion] = useState('2.8.0');
  const [mandatory, setMandatory] = useState(false);
  const [notes, setNotes] = useState('Tối ưu hóa hiệu năng vi xử lý và quản lý tài nguyên.\nCập nhật giao diện và tăng cường bảo mật hệ thống.');
  const [storeUrl, setStoreUrl] = useState('https://testflight.apple.com/join/hendytools');
  const [sha256, setSha256] = useState('9f833a69a3b684cb3e0a2944b02927e163533446955a8f57297ff055f10667e8');
  const [fileSizeMb, setFileSizeMb] = useState('49.5');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!VERSION_REGEX.test(version)) {
      setErrorMessage('Phiên bản phải tuân thủ Semantic Versioning (ví dụ: 3.2.0 hoặc 3.2.0-beta.1)');
      return;
    }
    const buildNum = Number.parseInt(build, 10);
    if (!Number.isSafeInteger(buildNum) || buildNum <= 0) {
      setErrorMessage('Số hiệu build phải là số nguyên dương hợp lệ.');
      return;
    }
    if (!VERSION_REGEX.test(minSupportedVersion)) {
      setErrorMessage('Phiên bản tối thiểu phải có dạng x.y.z (ví dụ: 2.0.0)');
      return;
    }

    const noteRows = notes
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const sizeBytes = Math.round((parseFloat(fileSizeMb) || 10) * 1024 * 1024);

    let fileName = '';
    let contentType = '';
    if (platform === 'windows') {
      fileName = `HendyToolsPro-${version}-Setup.exe`;
      contentType = 'application/vnd.microsoft.portable-executable';
    } else if (platform === 'android') {
      fileName = `HendyToolsMobile-${version}.apk`;
      contentType = 'application/vnd.android.package-archive';
    }

    if (platform !== 'ios' && !SHA256_REGEX.test(sha256)) {
      setErrorMessage('Mã băm SHA-256 bắt buộc phải gồm đúng 64 ký tự hex hợp lệ.');
      return;
    }

    const manifest: ReleaseManifest = {
      schemaVersion: 1,
      appId: platform === 'windows' ? 'hendy-tools-pro' : 'hendy-tools-mobile',
      platform,
      channel,
      version,
      build: buildNum,
      publishedAt: new Date().toISOString(),
      mandatory,
      minSupportedVersion,
      releaseNotes: noteRows.length > 0 ? noteRows : ['Cập nhật ổn định và cải thiện bảo mật.'],
      storeUrl: platform === 'ios' ? storeUrl : null,
      artifact: platform !== 'ios' ? {
        key: `packages/${platform}/${fileName}`,
        fileName,
        sha256,
        size: sizeBytes,
        contentType,
        signerThumbprint: platform === 'windows' ? 'A9F23B817E4C0D6E5A28190B38914F26C9E8A731' : undefined,
      } : null,
      downloadUrl: platform !== 'ios' ? `/api/v1/releases/download?platform=${platform}&channel=${channel}` : null,
    };

    ProductionStore.saveRelease(manifest);
    onPublished();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Xuất bản Manifest phát hành mới</h3>
            <small style={{ color: '#82baff', font: '9px var(--mono)' }}>
              PUBLISH PRODUCTION RELEASE MANIFEST
            </small>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        {errorMessage && (
          <div className="server-error" style={{ marginBottom: 15, marginTop: 0 }}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>NỀN TẢNG MỤC TIÊU</label>
              <select
                className="form-control"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
              >
                <option value="windows">Windows (Hendy Tools Pro)</option>
                <option value="android">Android (Hendy Tools Mobile)</option>
                <option value="ios">iOS (Apple / TestFlight)</option>
              </select>
            </div>
            <div className="form-group">
              <label>KÊNH PHÁT HÀNH</label>
              <select
                className="form-control"
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
              >
                <option value="stable">Stable (Chính thức)</option>
                <option value="beta">Beta (Thử nghiệm)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>PHIÊN BẢN (SEMVER x.y.z)</label>
              <input
                type="text"
                className="form-control"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="3.2.0"
                required
              />
            </div>
            <div className="form-group">
              <label>SỐ HIỆU BUILD (SỐ NGUYÊN DƯƠNG)</label>
              <input
                type="number"
                className="form-control"
                value={build}
                onChange={(e) => setBuild(e.target.value)}
                placeholder="30200"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>PHIÊN BẢN TỐI THIỂU HỖ TRỢ</label>
              <input
                type="text"
                className="form-control"
                value={minSupportedVersion}
                onChange={(e) => setMinSupportedVersion(e.target.value)}
                placeholder="2.8.0"
                required
              />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: 22 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0, color: '#e0edff' }}>
                <input
                  type="checkbox"
                  checked={mandatory}
                  onChange={(e) => setMandatory(e.target.checked)}
                  style={{ accentColor: '#73e4d0' }}
                />
                Cập nhật bắt buộc (Mandatory)
              </label>
            </div>
          </div>

          {platform !== 'ios' ? (
            <>
              <div className="form-group">
                <label>SHA-256 CHECKSUM (64 HEX)</label>
                <input
                  type="text"
                  className="form-control"
                  value={sha256}
                  onChange={(e) => setSha256(e.target.value)}
                  placeholder="Chuỗi 64 ký tự hex"
                  required
                />
              </div>
              <div className="form-group">
                <label>DUNG LƯỢNG GÓI CÀI ĐẶT (MB)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  value={fileSizeMb}
                  onChange={(e) => setFileSizeMb(e.target.value)}
                  placeholder="49.5"
                  required
                />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label>STORE / TESTFLIGHT DISTRIBUTION URL (HTTPS)</label>
              <input
                type="url"
                className="form-control"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="https://testflight.apple.com/join/..."
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>GHI CHÚ PHÁT HÀNH / CHANGELOG (MỖI DÒNG MỘT Ý)</label>
            <textarea
              className="form-control"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nội dung thay đổi trong bản phát hành này..."
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
            <button type="button" className="button button-quiet" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="button button-primary">
              Xuất bản lên hệ thống <span>↗</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
