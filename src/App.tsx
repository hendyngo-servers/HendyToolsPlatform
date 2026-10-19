import React, { useState, useEffect } from 'react';
import { DownloadPortal } from './client/portal/DownloadPortal';
import { AdminPanelPlus } from './client/admin/AdminPanelPlus';
import { IntegrityModal } from './client/shared/IntegrityModal';
import { ProductionStore } from './client/shared/store';

export type AppView = 'download' | 'admin';

export const App: React.FC = () => {
  const [view, setView] = useState<AppView>('download');
  const [adminTab, setAdminTab] = useState<string>('telemetry');
  const [isIntegrityOpen, setIsIntegrityOpen] = useState(false);

  useEffect(() => {
    ProductionStore.initialize();

    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (['#admin', '#server', '#console', '#manage', '#panel'].includes(hash)) {
        setView('admin');
        setAdminTab('telemetry');
      } else if (hash === '#services') {
        setView('admin');
        setAdminTab('services');
      } else if (hash === '#processes') {
        setView('admin');
        setAdminTab('processes');
      } else if (hash === '#ports' || hash === '#firewall') {
        setView('admin');
        setAdminTab('ports');
      } else if (hash === '#cli' || hash === '#terminal') {
        setView('admin');
        setAdminTab('cli');
      } else if (hash === '#env') {
        setView('admin');
        setAdminTab('env');
      } else if (['#channels', '#releases', '#release-channels'].includes(hash)) {
        setView('admin');
        setAdminTab('channels');
      } else if (['#archive', '#changelog', '#history'].includes(hash)) {
        setView('admin');
        setAdminTab('archive');
      } else if (['#pipeline', '#cicd', '#build'].includes(hash)) {
        setView('admin');
        setAdminTab('pipeline');
      } else if (['#debugger', '#api-test'].includes(hash)) {
        setView('admin');
        setAdminTab('debugger');
      } else if (['#downloads', '#updates', '#help', '#top'].includes(hash) || !hash) {
        setView('download');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleOpenAdmin = (tab: string = 'telemetry') => {
    setAdminTab(tab);
    setView('admin');
    window.location.hash = `#${tab}`;
  };

  const handleBackToPortal = () => {
    setView('download');
    window.location.hash = '#top';
  };

  return (
    <div className="hendy-app-root">
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
