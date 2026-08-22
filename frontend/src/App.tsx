import React, { useState, useEffect } from 'react';
import { Navigation, ActiveTab } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { LoginModal } from '@/components/LoginModal';
import { HomeownerView } from '@/views/HomeownerView';
import { DashboardView } from '@/views/DashboardView';
import { AgenticView } from '@/views/AgenticView';
import { RagView } from '@/views/RagView';
import { EvidenceView } from '@/views/EvidenceView';
import { AlertsView } from '@/views/AlertsView';
import { AuthProvider, useAuth } from '@/context/AuthContext';

const getInitialTab = (): ActiveTab => {
  if (typeof window !== 'undefined') {
    const p = window.location.pathname.toLowerCase();
    if (p === '/alerts' || p === '/subscribe' || p === '/user' || p === '/notify') return 'alerts';
    if (p === '/agentic' || p === '/multi-agent') return 'agentic';
    if (p === '/rag') return 'rag';
    if (p === '/evidence' || p === '/models') return 'evidence';
  }
  return 'dashboard';
};

function AppContent() {
  const { role, switchRole } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTab);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('color-theme') === 'dark' ||
        (!('color-theme' in localStorage) &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)
      );
    }
    return false;
  });
  const [isAudioOn, setIsAudioOn] = useState<boolean>(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getInitialTab());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div className="bg-[#FDFBF7] text-stone-900 dark:bg-[#151210] text-stone-900 dark:text-stone-100 font-sans antialiased min-h-screen flex flex-col transition-colors duration-200 tech-grid-bg">
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        setIsDark={setIsDark}
        isAudioOn={isAudioOn}
        setIsAudioOn={setIsAudioOn}
      />

      <div className="flex-1 w-full pb-4">
        {role === 'homeowner' ? (
          <HomeownerView onSwitchToTechView={() => switchRole('technician')} />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView onTriggerAgentic={() => setActiveTab('agentic')} />
            )}
            {activeTab === 'agentic' && (
              <AgenticView onNavigateEvidence={() => setActiveTab('evidence')} />
            )}
            {activeTab === 'rag' && <RagView />}
            {activeTab === 'evidence' && <EvidenceView />}
            {activeTab === 'alerts' && <AlertsView />}
          </>
        )}
      </div>

      <Footer />
      <LoginModal />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

