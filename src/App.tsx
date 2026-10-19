import React, { useState, useEffect, useCallback } from 'react';
import { DownloadPortal } from './client/portal/DownloadPortal';
import { AdminPanelPlus } from './client/admin/AdminPanelPlus';
import { IntegrityModal } from './client/shared/IntegrityModal';
import { ProductionStore } from './client/shared/store';

export type AppView = 'download' | 'admin';

export const App: React.FC = () => {
  const [view, setView] = useState<AppView>('download');
  const [adminTab, setAdminTab] = useState<string>('telemetry');
  const [isIntegrityOpen, setIsIntegrityOpen] = useState(false);
  const [routingInfo, setRoutingInfo] = useState<{
    matchedSource: string;
    hostname: string;
    pathname: string;
    hash: string;
  }>({
    matchedSource: 'Đang khởi tạo...',
    hostname: '',
    pathname: '',
    hash: '',
  });
  const [showDomainBar, setShowDomainBar] = useState(true);

  // Synchronize route resolution based on domain, pathname, search, and hash
  const evaluateRouting = useCallback(() => {
    const host = window.location.hostname || 'localhost';
    const path = window.location.pathname || '/';
    const search = window.location.search || '';
    const hash = window.location.hash || '';

    const resolved = ProductionStore.resolveTargetInterface(host, path, search, hash);

    setView(resolved.view);
    if (resolved.defaultTab) {
      setAdminTab(resolved.defaultTab);
    }
    setRoutingInfo({
      matchedSource: resolved.matchedSource,
      hostname: host,
      pathname: path,
      hash: hash,
    });
  }, []);

  useEffect(() => {
    ProductionStore.initialize();
    evaluateRouting();

    const handleLocationChange = () => {
      evaluateRouting();
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [evaluateRouting]);

  const handleOpenAdmin = (tab: string = 'telemetry') => {
    setAdminTab(tab);
    setView('admin');
    window.location.hash = `#${tab}`;
  };

  const handleBackToPortal = () => {
    setView('download');
    window.location.hash = '#top';
  };

  // Switcher simulation helper for developers/users to test domains
  const simulateDomainRoute = (testDomain: string, targetInterface: AppView, tab?: string) => {
    if (targetInterface === 'admin') {
      handleOpenAdmin(tab || 'domains');
    } else {
      handleBackToPortal();
    }
    setRoutingInfo((prev) => ({
      ...prev,
      hostname: testDomain,
      matchedSource: `Mô phỏng tên miền: ${testDomain} → ${targetInterface === 'admin' ? 'Bảng Quản Trị Plus' : 'Cổng Tải'}`,
    }));
  };

  return (
    <div className="hendy-app-root">
      {/* Top Multi-Platform Domain & Navigation Dispatcher Bar */}
      {showDomainBar && (
        <div
          style={{
            background: 'linear-gradient(90deg, #020712, #06152b 50%, #030d1e)',
            borderBottom: '1px solid rgba(115, 228, 208, 0.25)',
            padding: '7px 16px',
            fontSize: '11px',
            color: '#c2d7f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            position: 'sticky',
            top: 0,
            zIndex: 9999,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {/* Left: Active Domain & Detected Interface */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(115, 228, 208, 0.12)',
                color: '#73e4d0',
                padding: '2px 8px',
                borderRadius: '5px',
                fontWeight: 700,
                fontFamily: 'var(--mono)',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#73e4d0' }} />
              DOMAIN ROUTER
            </span>

            <span style={{ fontFamily: 'var(--mono)', color: '#ffffff', fontWeight: 600 }}>
              {routingInfo.hostname || 'production-endpoint'}
            </span>

            <span style={{ color: '#687f9d' }}>→</span>

            <span
              style={{
                color: view === 'admin' ? '#73e4d0' : '#88b8f2',
                fontWeight: 700,
                background: view === 'admin' ? 'rgba(115, 228, 208, 0.1)' : 'rgba(136, 184, 242, 0.1)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              {view === 'admin' ? '🛡 BẢNG QUẢN TRỊ SERVER PLUS' : '👥 CỔNG TẢI CÔNG KHAI'}
            </span>

            <span style={{ fontSize: '10px', color: '#88a3cb', display: 'none', md: 'inline' } as any}>
              ({routingInfo.matchedSource})
            </span>
          </div>

          {/* Right: Quick Multi-Platform Domain Simulators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', color: '#88a3cb' }}>Thử nghiệm nhanh:</span>

            <button
              type="button"
              style={{
                background: 'rgba(243, 128, 32, 0.12)',
                border: '1px solid rgba(243, 128, 32, 0.3)',
                color: '#ff9800',
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '10px',
                fontFamily: 'var(--mono)',
                cursor: 'pointer',
              }}
              title="Cloudflare Pages - Cổng tải"
              onClick={() => simulateDomainRoute('hendytools.pages.dev', 'download')}
            >
              pages.dev (Portal)
            </button>

            <button
              type="button"
              style={{
                background: 'rgba(115, 228, 208, 0.12)',
                border: '1px solid rgba(115, 228, 208, 0.3)',
                color: '#73e4d0',
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '10px',
                fontFamily: 'var(--mono)',
                cursor: 'pointer',
              }}
              title="Cloudflare Pages - Quản trị"
              onClick={() => simulateDomainRoute('admin-hendytools.pages.dev', 'admin', 'domains')}
            >
              admin.pages.dev (Admin)
            </button>

            <button
              type="button"
              style={{
                background: 'rgba(70, 227, 183, 0.12)',
                border: '1px solid rgba(70, 227, 183, 0.3)',
                color: '#73e4d0',
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '10px',
                fontFamily: 'var(--mono)',
                cursor: 'pointer',
              }}
              title="Render.com - Quản trị máy chủ"
              onClick={() => simulateDomainRoute('hendy-admin.onrender.com', 'admin', 'telemetry')}
            >
              onrender.com (Admin)
            </button>

            <button
              type="button"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#e2e8f0',
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '10px',
                fontFamily: 'var(--mono)',
                cursor: 'pointer',
              }}
              title="GitHub Pages - Cổng người dùng"
              onClick={() => simulateDomainRoute('ngogiaidy3.github.io', 'download')}
            >
              github.io (Portal)
            </button>

            {/* Direct Switcher */}
            {view === 'download' ? (
              <button
                type="button"
                style={{
                  background: '#73e4d0',
                  color: '#030a16',
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: '5px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  marginLeft: '4px',
                }}
                onClick={() => handleOpenAdmin('domains')}
              >
                Vào Admin Plus ⚙
              </button>
            ) : (
              <button
                type="button"
                style={{
                  background: '#38bdf8',
                  color: '#030a16',
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: '5px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  marginLeft: '4px',
                }}
                onClick={handleBackToPortal}
              >
                Về Cổng Tải ↗
              </button>
            )}

            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#687f9d',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '0 4px',
              }}
              title="Ẩn thanh điều hướng domain"
              onClick={() => setShowDomainBar(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Render Respective Independent Entity */}
      {view === 'download' ? (
        <DownloadPortal
          onOpenAdmin={() => handleOpenAdmin('telemetry')}
          onOpenIntegrity={() => setIsIntegrityOpen(true)}
        />
      ) : (
        <AdminPanelPlus
          initialTab={adminTab}
          onBackToPortal={handleBackToPortal}
        />
      )}

      <IntegrityModal
        isOpen={isIntegrityOpen}
        onClose={() => setIsIntegrityOpen(false)}
      />
    </div>
  );
};

export default App;
