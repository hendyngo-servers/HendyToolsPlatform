import React, { useState } from 'react';
import { Platform, Channel, ReleaseManifest } from '../types';
import { ReleaseStore, VERSION_RE, SHA256_RE } from '../services/releaseStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewReleaseModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [platform, setPlatform] = useState<Platform>('windows');
  const [channel, setChannel] = useState<Channel>('stable');
  const [version, setVersion] = useState('3.2.0');
  const [build, setBuild] = useState('30200');
  const [minSupportedVersion, setMinSupportedVersion] = useState('2.5.0');
  const [mandatory, setMandatory] = useState(false);
  const [notes, setNotes] = useState('Nâng cấp hiệu năng xử lý tác vụ.\nCập nhật giao diện và cải thiện bảo mật.');
  const [storeUrl, setStoreUrl] = useState('https://testflight.apple.com/join/hendytools');
  const [sha256, setSha256] = useState('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  const [fileSizeMb, setFileSizeMb] = useState('48.5');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!VERSION_RE.test(version)) {
      setError('Phiên bản không đúng định dạng (ví dụ: 3.2.0 hoặc 3.2.0-beta.1)');
      return;
    }
    const buildNum = Number.parseInt(build, 10);
    if (!Number.isSafeInteger(buildNum) || buildNum <= 0) {
      setError('Build number phải là số nguyên dương.');
      return;
    }
    if (!VERSION_RE.test(minSupportedVersion)) {
      setError('Phiên bản tối thiểu không đúng định dạng (ví dụ: 2.0.0)');
      return;
    }

    const noteList = notes
      .split('\n')
      .map((n) => n.trim())
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

    if (platform !== 'ios') {
      if (!SHA256_RE.test(sha256)) {
        setError('SHA-256 hash phải có đủ 64 ký tự hex.');
        return;
      }
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
      releaseNotes: noteList.length > 0 ? noteList : ['Cập nhật và tối ưu hóa hệ thống.'],
      storeUrl: platform === 'ios' ? storeUrl : null,
      artifact: platform !== 'ios' ? {
        key: `packages/${platform}/${fileName}`,
        fileName,
        sha256,
        size: sizeBytes,
        contentType,
      } : null,
      downloadUrl: platform !== 'ios' ? `/api/v1/releases/download?platform=${platform}&channel=${channel}` : null,
    };

    ReleaseStore.addOrUpdateRelease(manifest);
    onSuccess();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Tạo & công bố bản phát hành mới</h3>
            <small style={{ color: '#8aa6ce', font: '9px var(--mono)' }}>PUBLISH RELEASE MANIFEST TO LOCAL ENGINE</small>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        {error && (
          <div className="server-error" style={{ marginBottom: 15, marginTop: 0 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>NỀN TẢNG (PLATFORM)</label>
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
              <label>KÊNH PHÁT HÀNH (CHANNEL)</label>
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
              <label>PHIÊN BẢN (VERSION)</label>
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
              <label>MÃ BUILD (BUILD NUMBER)</label>
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
              <label>PHIÊN BẢN HỖ TRỢ TỐI THIỂU</label>
              <input
                type="text"
                className="form-control"
                value={minSupportedVersion}
                onChange={(e) => setMinSupportedVersion(e.target.value)}
                placeholder="2.0.0"
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
                  placeholder="64 ký tự hex"
                  required
                />
              </div>
              <div className="form-group">
                <label>DUNG LƯỢNG TỆP (MB)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  value={fileSizeMb}
                  onChange={(e) => setFileSizeMb(e.target.value)}
                  placeholder="48.5"
                  required
                />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label>URL PHÂN PHỐI TESTFLIGHT / STORE (HTTPS)</label>
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
              placeholder="Nội dung thay đổi..."
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
            <button type="button" className="button button-quiet" onClick={onClose}>
              Hủy bỏ
            </button>
            <button type="submit" className="button button-primary">
              Công bố bản phát hành <span>↗</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
