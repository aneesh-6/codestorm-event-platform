import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import AnnouncementBanner from './components/AnnouncementBanner';
import LoginPage from './pages/LoginPage';
import ParticipantDashboard from './pages/ParticipantDashboard';
import BugBusterRound from './pages/BugBusterRound';
import TraceRaceRound from './pages/TraceRaceRound';
import CodeChallengeRound from './pages/CodeChallengeRound';
import PrivateManagementCenter from './pages/PrivateManagementCenter';
import LiveProjectorScreen from './pages/LiveProjectorScreen';
import LeaderboardPage from './pages/LeaderboardPage';
import WinnerDisplayPage from './pages/WinnerDisplayPage';
import CertificatePage from './pages/CertificatePage';
import FirstLoginModal from './components/FirstLoginModal';

function AppContent() {
  const { user, loading, isAdmin, isCoordinator, isParticipant } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);

  // Automatic routing by role on login and check if forced password change is required
  useEffect(() => {
    if (user) {
      if (isAdmin || isCoordinator) {
        setCurrentView('manage');
      } else {
        setCurrentView('dashboard');
      }

      if (user.mustChangePassword) {
        setShowPasswordChangeModal(true);
      }
    }
  }, [user, isAdmin, isCoordinator]);

  // Support direct internal access for organizers e.g. window.location.pathname === '/manage'
  useEffect(() => {
    const handleUrlCheck = () => {
      const path = window.location.pathname;
      if (path === '/manage' && (isAdmin || isCoordinator)) {
        setCurrentView('manage');
      } else if (path === '/live') {
        setCurrentView('live');
      }
    };
    handleUrlCheck();
    window.addEventListener('popstate', handleUrlCheck);
    return () => window.removeEventListener('popstate', handleUrlCheck);
  }, [isAdmin, isCoordinator]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        color: '#1a2d5a',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 600,
        fontSize: '1.1rem'
      }}>
        Initializing CodeStorm 2026 Platform...
      </div>
    );
  }

  // Not authenticated: Show Login
  if (!user) {
    return <LoginPage />;
  }

  // Live Projector Screen (/live) operates in clean full screen mode
  if (currentView === 'live') {
    return (
      <LiveProjectorScreen 
        onExit={() => setCurrentView((isAdmin || isCoordinator) ? 'manage' : 'dashboard')} 
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />
      <AnnouncementBanner />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Participant Dashboard */}
        {currentView === 'dashboard' && (
          <ParticipantDashboard
            onSelectRound={(roundId) => {
              if (roundId === 1) setCurrentView('round1');
              else if (roundId === 2) setCurrentView('round2');
              else if (roundId === 3) setCurrentView('round3');
            }}
          />
        )}

        {/* Round 1: BugBuster */}
        {currentView === 'round1' && (
          <BugBusterRound onBackToDashboard={() => setCurrentView('dashboard')} />
        )}

        {/* Round 2: Trace & Race */}
        {currentView === 'round2' && (
          <TraceRaceRound onBackToDashboard={() => setCurrentView('dashboard')} />
        )}

        {/* Round 3: Code Challenge */}
        {currentView === 'round3' && (
          <CodeChallengeRound onBackToDashboard={() => setCurrentView('dashboard')} />
        )}

        {/* Private Event Management Center (Protected route for organizers) */}
        {(currentView === 'manage' || currentView === 'admin' || currentView === 'coordinator' || currentView === 'checkin') && (
          <PrivateManagementCenter
            onNavigateToLive={() => setCurrentView('live')}
            onNavigateToWinners={() => setCurrentView('winners')}
          />
        )}

        {/* Live Leaderboard (Strictly privacy-controlled) */}
        {currentView === 'leaderboard' && (
          <LeaderboardPage />
        )}

        {/* Final Results & Winners Podium */}
        {currentView === 'winners' && (
          <WinnerDisplayPage onBackToDashboard={() => setCurrentView(isParticipant ? 'dashboard' : 'manage')} />
        )}

        {/* Official Certificate Generator */}
        {currentView === 'certificate' && (
          <CertificatePage />
        )}
      </main>

      {/* Force Change Password Modal for First-Time Logins */}
      <FirstLoginModal
        isOpen={showPasswordChangeModal}
        onClose={() => setShowPasswordChangeModal(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}
