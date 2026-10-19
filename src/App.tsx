import React, { useState, useEffect } from 'react';
import { DownloadCenter } from './components/DownloadCenter';
import { ReleaseConsole } from './components/ReleaseConsole';
import { ServerManagementPanel } from './components/ServerManagementPanel';
import { IntegrityCheckModal } from './components/IntegrityCheckModal';
import { ReleaseStore } from './services/releaseStore';

export type AppView = 'download' | 'console' | 'server';

export const App: React.FC = () => {
  const [view, setView] = useState<AppView>('download');
  const [isIntegrityOpen, setIsIntegrityOpen] = useState(false);

  useEffect(() => {
    ReleaseStore.initialize();

    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (['#server', '#server-panel', '#nodes'].includes(hash)) {
        setView('server');
      } else if (['#admin', '#console', '#overview', '#releases', '#history', '#publish'].includes(hash)) {
        setView('console');
      } else if (['#downloads', '#updates', '#help', '#top'].includes(hash) || !hash) {
        setView('download');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  return (
    <div className="app-container">
      {view === 'download' && (
        <DownloadCenter
          onOpenConsole={() => {
            setView('console');
            window.location.hash = '#overview';
          }}
          onOpenServerPanel={() => {
            setView('server');
            window.location.hash = '#server';
          }}
          onOpenIntegrity={() => setIsIntegrityOpen(true)}
        />
      )}

      {view === 'console' && (
        <ReleaseConsole
          onOpenPublicSite={() => {
            setView('download');
            window.location.hash = '#top';
          }}
          onOpenServerPanel={() => {
            setView('server');
            window.location.hash = '#server';
          }}
        />
      )}

      {view === 'server' && (
        <ServerManagementPanel
          onBackToDownload={() => {
            setView('download');
            window.location.hash = '#top';
          }}
          onOpenConsole={() => {
            setView('console');
            window.location.hash = '#overview';
          }}
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
