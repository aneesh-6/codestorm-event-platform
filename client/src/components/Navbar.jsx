import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  Clock, 
  Bell, 
  LogOut, 
  Trophy, 
  Award,
  Sliders,
  Tv,
  CheckCircle2,
  Lock
} from 'lucide-react';

export default function Navbar({ currentView, setCurrentView }) {
  const { user, participant, logout, isAdmin, isCoordinator, isParticipant } = useAuth();
  const { timerState, announcements } = useSocket();
  const [showAnnouncements, setShowAnnouncements] = useState(false);

  // Format seconds to MM:SS
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getTimerClass = (secs) => {
    if (timerState.isPaused) return 'timer-warning-10';
    if (secs <= 60 && secs > 0) return 'timer-critical-1';
    if (secs <= 300 && secs > 0) return 'timer-warning-5';
    if (secs <= 600 && secs > 0) return 'timer-warning-10';
    return '';
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 'var(--navbar-h)',
        gap: '16px'
      }}>
        {/* Left: CodeStorm Brand (Exact Match to Registration Website) */}
        <div 
          onClick={() => isParticipant ? setCurrentView('dashboard') : setCurrentView('manage')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', textDecoration: 'none' }}
        >
          <div style={{ flexShrink: 0 }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect width="36" height="36" rx="8" fill="#1a2d5a"/>
              <path d="M10 13L6 18L10 23" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M26 13L30 18L26 23" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 10L15 26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{
              fontSize: '1.0625rem',
              fontWeight: 800,
              color: 'var(--primary)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              CODESTORM <span style={{ color: 'var(--secondary)' }}>2026</span>
            </span>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 500,
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              MREM • CSE Data Science
            </span>
          </div>
        </div>

        {/* Center: Live Competition Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {timerState.roundName && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--bg-soft)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border)'
            }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: timerState.status === 'live' ? 'var(--teal)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: timerState.status === 'live' ? 'var(--teal)' : 'var(--text-muted)'
                }} />
                {timerState.roundName}
              </span>

              {timerState.status === 'live' && (
                <div className={`digital-timer ${getTimerClass(timerState.remainingSeconds)}`}>
                  <Clock size={14} style={{ marginRight: '5px' }} />
                  <span>{formatTimer(timerState.remainingSeconds)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Participant Navigation Tabs & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isParticipant && (
            <>
              <button 
                onClick={() => setCurrentView('dashboard')}
                className={`btn btn-sm ${currentView === 'dashboard' ? 'btn-primary' : 'btn-outline'}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setCurrentView('leaderboard')}
                className={`btn btn-sm ${currentView === 'leaderboard' ? 'btn-primary' : 'btn-outline'}`}
              >
                <Trophy size={14} /> Leaderboard
              </button>
              <button 
                onClick={() => setCurrentView('certificate')}
                className={`btn btn-sm ${currentView === 'certificate' ? 'btn-primary' : 'btn-outline'}`}
              >
                <Award size={14} /> Certificate
              </button>
            </>
          )}

          {/* Role-Specific Management Navigation */}
          {isAdmin && (
            <>
              <button 
                onClick={() => setCurrentView('manage')}
                className={`btn btn-sm ${currentView === 'manage' ? 'btn-primary' : 'btn-outline'}`}
              >
                <Sliders size={14} /> ADMIN DASHBOARD
              </button>
              <button 
                onClick={() => setCurrentView('live')}
                className="btn btn-sm btn-outline"
                title="Auditorium Projector Display"
              >
                <Tv size={14} /> Stage Screen
              </button>
            </>
          )}

          {isCoordinator && !isAdmin && (
            <>
              <button 
                onClick={() => setCurrentView('manage')}
                className={`btn btn-sm ${currentView === 'manage' ? 'btn-primary' : 'btn-outline'}`}
              >
                <Sliders size={14} /> FACULTY COORDINATOR DASHBOARD
              </button>
              <button 
                onClick={() => setCurrentView('live')}
                className="btn btn-sm btn-outline"
                title="Auditorium Projector Display"
              >
                <Tv size={14} /> Stage Screen
              </button>
            </>
          )}

          {/* Announcements Bell */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowAnnouncements(!showAnnouncements)}
              className="btn btn-sm btn-outline"
              style={{ padding: '8px 10px', position: 'relative' }}
              title="Announcements"
            >
              <Bell size={16} />
              {announcements.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--secondary)'
                }} />
              )}
            </button>

            {showAnnouncements && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                width: '320px',
                background: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-xl)',
                padding: '16px',
                zIndex: 2000
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>Official Announcements</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{announcements.length} updates</span>
                </div>
                <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {announcements.map((a) => (
                    <div key={a.id} style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-soft)',
                      borderLeft: `3px solid ${a.priority === 'urgent' ? 'var(--secondary)' : 'var(--teal)'}`
                    }}>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text)', marginBottom: '4px' }}>{a.message}</p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  {announcements.length === 0 && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                      No announcements posted yet.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Badge / Logout */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            paddingLeft: '12px',
            borderLeft: '1px solid var(--border)'
          }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)' }}>
                {isAdmin ? 'ADMIN' : (isCoordinator ? 'FACULTY COORDINATOR' : (participant?.name || 'PARTICIPANT'))}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--secondary-dark)', fontWeight: 600 }}>
                {isAdmin ? 'ADMIN' : (isCoordinator ? 'FACULTY COORDINATOR' : (participant?.participantId || 'PARTICIPANT'))}
              </div>
            </div>

            <button 
              onClick={logout} 
              className="btn btn-sm btn-outline" 
              title="Logout"
              style={{ color: '#ef4444', padding: '8px 10px' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
