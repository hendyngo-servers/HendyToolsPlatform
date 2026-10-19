import React, { useState } from 'react';
import { ProductionStore } from './store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const IntegrityModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [inputHash, setInputHash] = useState('');
  const [verifyResult, setVerifyResult] = useState<'valid' | 'invalid' | null>(null);
  const [matchedDetails, setMatchedDetails] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputHash.trim().toLowerCase();
    if (!clean) {
      setVerifyResult(null);
      return;
    }

    const all = ProductionStore.getReleases();
    const found = all.find((r) => r.artifact?.sha256.toLowerCase() === clean);

    if (found && found.artifact) {
      setVerifyResult('valid');
      setMatchedDetails(`${found.artifact.fileName} · Phiên bản v${found.version} (Build ${found.build})`);
    } else {
      setVerifyResult('invalid');
      setMatchedDetails(null);
    }
  };

  const winLatest = ProductionStore.getLatest('windows', 'stable');
  const androidLatest = ProductionStore.getLatest('android', 'stable');

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Kiểm tra toàn vẹn mã băm SHA-256</h3>
            <small style={{ color: '#73e4d0', font: '9px var(--mono)', letterSpacing: '0.08em' }}>
              OFFICIAL PACKAGE INTEGRITY & AUTHENTICODE VERIFIER
            </small>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <p style={{ color: '#9cb0cc', fontSize: 11, lineHeight: 1.8 }}>
          Tất cả các bản phát hành chính thức của <b>Hendy Tools</b> được phân phối trực tiếp từ Cloudflare R2 qua HTTPS và bảo vệ bởi mã băm SHA-256 bất biến. Đối chiếu mã băm giúp đảm bảo tệp của bạn 100% nguyên gốc từ máy chủ Hendy.
        </p>

        <div style={{ background: '#05101f', border: '1px solid var(--line)', borderRadius: 10, padding: 14, margin: '16px 0' }}>
          <div style={{ color: '#82baff', font: '9px var(--mono)', marginBottom: 8 }}>MÃ BĂM CHÍNH THỨC HIỆN TẠI (PRODUCTION HASHES)</div>
          {winLatest?.artifact && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <small style={{ color: '#8dbdff', font: '9px var(--mono)' }}>WINDOWS ({winLatest.artifact.fileName})</small>
                <button
                  type="button"
                  style={{ color: '#73e4d0', fontSize: 9, textDecoration: 'underline' }}
                  onClick={() => {
                    setInputHash(winLatest.artifact!.sha256);
                    setVerifyResult('valid');
                    setMatchedDetails(`${winLatest.artifact!.fileName} · v${winLatest.version}`);
                  }}
                >
                  Sao chép vào kiểm tra
                </button>
              </div>
              <div style={{ font: '10px var(--mono)', color: '#dbe9fa', wordBreak: 'break-all', marginTop: 4, background: '#030811', padding: '6px 8px', borderRadius: 6 }}>
                {winLatest.artifact.sha256}
              </div>
            </div>
          )}

          {androidLatest?.artifact && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <small style={{ color: '#75e4c5', font: '9px var(--mono)' }}>ANDROID ({androidLatest.artifact.fileName})</small>
                <button
                  type="button"
                  style={{ color: '#73e4d0', fontSize: 9, textDecoration: 'underline' }}
                  onClick={() => {
                    setInputHash(androidLatest.artifact!.sha256);
                    setVerifyResult('valid');
                    setMatchedDetails(`${androidLatest.artifact!.fileName} · v${androidLatest.version}`);
                  }}
                >
                  Sao chép vào kiểm tra
                </button>
              </div>
              <div style={{ font: '10px var(--mono)', color: '#dbe9fa', wordBreak: 'break-all', marginTop: 4, background: '#030811', padding: '6px 8px', borderRadius: 6 }}>
                {androidLatest.artifact.sha256}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label>NHẬP HOẶC DÁN MÃ SHA-256 CẦN XÁC MINH</label>
            <input
              type="text"
              className="form-control"
              value={inputHash}
              onChange={(e) => {
                setInputHash(e.target.value);
                setVerifyResult(null);
              }}
              placeholder="Nhập chuỗi 64 ký tự hex..."
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button type="submit" className="button button-primary" style={{ flex: 1 }}>
              Đối chiếu mã băm <span>✓</span>
            </button>
            <button
              type="button"
              className="button button-quiet"
              onClick={() => {
                setInputHash('');
                setVerifyResult(null);
              }}
            >
              Xóa
            </button>
          </div>
        </form>

        {verifyResult === 'valid' && (
          <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(115, 228, 208, 0.12)', border: '1px solid rgba(115, 228, 208, 0.35)', color: '#73e4d0', fontSize: 11 }}>
            ✓ <b>Tính toàn vẹn hợp lệ!</b> Gói phát hành khớp hoàn toàn với bản phát hành chính thức <strong>{matchedDetails}</strong>.
          </div>
        )}

        {verifyResult === 'invalid' && (
          <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(255, 156, 168, 0.12)', border: '1px solid rgba(255, 156, 168, 0.35)', color: '#ff9ca8', fontSize: 11 }}>
            ✕ <b>Mã băm không khớp!</b> Tệp này không trùng với bất kỳ gói phát hành chính thức nào trên máy chủ Hendy Tools.
          </div>
        )}
      </div>
    </div>
  );
};
