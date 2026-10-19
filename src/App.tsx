import React, { useState, useEffect } from 'react';
import { DownloadCenter } from './components/DownloadCenter';
import { ReleaseConsole } from './components/ReleaseConsole';
import { IntegrityCheckModal } from './components/IntegrityCheckModal';
import { ReleaseStore } from './services/releaseStore';

export const App: React.FC = () => {
  const [view, setView] = useState<'download' | 'console'>('download');
  const [isIntegrityOpen, setIsIntegrityOpen] = useState(false);

  useEffect(() => {
    ReleaseStore.initialize();

    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (['#admin', '#console', '#overview', '#releases', '#history', '#publish'].includes(hash)) {
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
      {view === 'download' ? (
        <DownloadCenter
          onOpenConsole={() => {
            setView('console');
            window.location.hash = '#overview';
          }}
          onOpenIntegrity={() => setIsIntegrityOpen(true)}
        />
      ) : (
        <ReleaseConsole
          onOpenPublicSite={() => {
            setView('download');
            window.location.hash = '#top';
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
