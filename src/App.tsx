import React, { useState, useEffect } from 'react';
import { DownloadCenter } from './components/DownloadCenter';
import { UnifiedServerPanelPlus } from './components/UnifiedServerPanelPlus';
import { IntegrityCheckModal } from './components/IntegrityCheckModal';
import { ReleaseStore } from './services/releaseStore';

export type AppView = 'download' | 'admin';

export const App: React.FC = () => {
  const [view, setView] = useState<AppView>('download');
  const [adminTab, setAdminTab] = useState<string>('server-overview');
  const [isIntegrityOpen, setIsIntegrityOpen] = useState(false);

  useEffect(() => {
    ReleaseStore.initialize();

    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (['#admin', '#server', '#console', '#manage', '#panel'].includes(hash)) {
        setView('admin');
        setAdminTab('server-overview');
      } else if (hash === '#releases' || hash === '#release-channels') {
        setView('admin');
        setAdminTab('release-overview');
      } else if (hash === '#history' || hash === '#changelog') {
        setView('admin');
        setAdminTab('history');
      } else if (hash === '#publish' || hash === '#build') {
        setView('admin');
        setAdminTab('publish');
      } else if (hash === '#services') {
        setView('admin');
        setAdminTab('services');
      } else if (hash === '#terminal') {
        setView('admin');
        setAdminTab('terminal');
      } else if (['#downloads', '#updates', '#help', '#top'].includes(hash) || !hash) {
        setView('download');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleOpenAdminPanel = (tab: string = 'server-overview') => {
    setAdminTab(tab);
    setView('admin');
    window.location.hash = `#${tab}`;
  };

  const handleBackToPublic = () => {
    setView('download');
    window.location.hash = '#top';
  };

  return (
    <div className="app-container">
      {view === 'download' ? (
        <DownloadCenter
          onOpenAdminPanel={handleOpenAdminPanel}
          onOpenIntegrity={() => setIsIntegrityOpen(true)}
        />
      ) : (
        <UnifiedServerPanelPlus
          initialTab={adminTab}
          onBackToPublic={handleBackToPublic}
        />
      )}

      <IntegrityCheckModal
        isOpen={isIntegrityOpen}
        onClose={() => setIsIntegrityOpen(false)}
      />
    </div>
  );
};

export default App;
