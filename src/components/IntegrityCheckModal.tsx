import React, { useState } from 'react';
import { ReleaseStore } from '../services/releaseStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const IntegrityCheckModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [inputHash, setInputHash] = useState('');
  const [result, setResult] = useState<'match' | 'mismatch' | null>(null);
  const [matchedFile, setMatchedFile] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputHash.trim().toLowerCase();
    if (!clean) {
      setResult(null);
      return;
    }

    const allReleases = ReleaseStore.getAllReleases();
    const match = allReleases.find(
      (r) => r.artifact?.sha256.toLowerCase() === clean
    );

    if (match && match.artifact) {
      setResult('match');
      setMatchedFile(`${match.artifact.fileName} (v${match.version})`);
    } else {
      setResult('mismatch');
      setMatchedFile(null);
    }
  };

  const windowsLatest = ReleaseStore.getLatestRelease('windows', 'stable');
  const androidLatest = ReleaseStore.getLatestRelease('android', 'stable');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Kiểm tra tính toàn vẹn SHA-256</h3>
            <small style={{ color: '#8aa6ce', font: '9px var(--mono)' }}>PACKAGE INTEGRITY & CHECKSUM VERIFIER</small>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <p style={{ color: '#9cb0cc', fontSize: 11, lineHeight: 1.8 }}>
          So sánh mã băm SHA-256 của tệp cài đặt bạn đã tải về với chữ ký băm chính thức từ Hendy Update Server nhằm đảm bảo tệp không bị chỉnh sửa hay hỏng hóc trong quá trình truyền tải.
        </p>

        <div style={{ background: '#061122', border: '1px solid var(--line)', borderRadius: 10, padding: 14, margin: '16px 0' }}>
          <div style={{ color: '#7ea9e8', font: '9px var(--mono)', marginBottom: 8 }}>CHECKSUM CHÍNH THỨC HIỆN TẠI</div>
          {windowsLatest?.artifact && (
            <div style={{ marginBottom: 10 }}>
              <small style={{ color: '#82b7ff', font: '9px var(--mono)' }}>WINDOWS ({windowsLatest.artifact.fileName})</small>
              <div style={{ font: '10px var(--mono)', color: '#dbe9fa', wordBreak: 'break-all', marginTop: 3 }}>
                {windowsLatest.artifact.sha256}
              </div>
            </div>
          )}
          {androidLatest?.artifact && (
            <div>
              <small style={{ color: '#73e4d0', font: '9px var(--mono)' }}>ANDROID ({androidLatest.artifact.fileName})</small>
              <div style={{ font: '10px var(--mono)', color: '#dbe9fa', wordBreak: 'break-all', marginTop: 3 }}>
                {androidLatest.artifact.sha256}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label>DÁN MÃ SHA-256 CẦN ĐỐI CHIẾU</label>
            <input
              type="text"
              className="form-control"
              value={inputHash}
              onChange={(e) => {
                setInputHash(e.target.value);
                setResult(null);
              }}
              placeholder="Nhập 64 ký tự mã băm SHA-256..."
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
            <button type="submit" className="button button-primary" style={{ flex: 1 }}>
              Kiểm tra mã băm
            </button>
            {windowsLatest?.artifact && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setInputHash(windowsLatest.artifact!.sha256)}
              >
                Mẫu Windows
              </button>
            )}
            {androidLatest?.artifact && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setInputHash(androidLatest.artifact!.sha256)}
              >
                Mẫu Android
              </button>
            )}
          </div>
        </form>

        {result === 'match' && (
          <div style={{ marginTop: 18, padding: 13, borderRadius: 10, background: 'rgba(115, 228, 208, 0.1)', border: '1px solid rgba(115, 228, 208, 0.3)', color: '#73e4d0', fontSize: 11 }}>
            ✓ <b>Xác thực thành công!</b> Mã băm khớp hoàn toàn với bản phát hành chính thức <strong>{matchedFile}</strong>.
          </div>
        )}

        {result === 'mismatch' && (
          <div style={{ marginTop: 18, padding: 13, borderRadius: 10, background: 'rgba(255, 156, 168, 0.1)', border: '1px solid rgba(255, 156, 168, 0.3)', color: '#ff9ca8', fontSize: 11 }}>
            ✕ <b>Không khớp!</b> Mã băm này không trùng với bất kỳ gói phát hành chính thức nào của Hendy Tools trong hệ thống.
          </div>
        )}
      </div>
    </div>
  );
};
