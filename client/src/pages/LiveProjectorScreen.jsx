import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { 
  Clock, 
  Users, 
  UserCheck, 
  Trophy, 
  Bell, 
  Radio, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  Code2, 
  Check, 
  ChevronRight,
  ShieldAlert,
  Flame,
  Layers
} from 'lucide-react';

export default function LiveProjectorScreen({ onExit, onViewRound }) {
  const { timerState, announcements } = useSocket();
  const { user, isAdmin, isCoordinator } = useAuth();
  const [eventData, setEventData] = useState(null);
  const [topThree, setTopThree] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Poll event status & winners every 3.5 seconds
  const loadData = () => {
    fetch('/api/event/status')
      .then(r => r.json())
      .then(d => setEventData(d))
      .catch(() => {});

    fetch('/api/results/winners')
      .then(r => r.json())
      .then(d => setTopThree(d.podium || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3500);
    return () => clearInterval(interval);
  }, []);

  // Track fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatTimer = (sec) => {
    if (sec === undefined || sec === null || sec < 0) return '00:00';
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Derive rounds and active round data safely from backend
  const rounds = eventData?.rounds || [
    { id: 1, name: 'BUGBUSTER', subtitle: 'Code Debugging Championship', durationMinutes: 30, totalQuestions: 20, status: 'upcoming' },
    { id: 2, name: 'TRACE & RACE', subtitle: 'Speed Output Prediction & Logic Sprint', durationMinutes: 15, totalQuestions: 20, status: 'upcoming' },
    { id: 3, name: 'CODE CHALLENGE', subtitle: 'Full-Scale Competitive Programming', durationMinutes: 30, totalQuestions: 5, status: 'upcoming' }
  ];

  // Active round resolution
  const activeRoundId = timerState.roundId || eventData?.settings?.currentRoundId || 1;
  const activeRound = rounds.find(r => r.id === activeRoundId) || rounds[0];

  // Determine current round display status
  const currentStatus = timerState.status || activeRound?.status || 'upcoming';
  const isLive = currentStatus === 'live';
  const isPaused = timerState.isPaused || activeRound?.isPaused;
  const isCompleted = currentStatus === 'completed';

  // Compute Next Round
  const nextRound = rounds.find(r => r.id === activeRoundId + 1) || null;

  // Real backend statistics
  const stats = eventData?.stats || {};
  const totalParticipants = stats.totalParticipants || 0;
  const checkedInCount = stats.checkedInParticipants || 0;
  const submittedCount = stats.submittedParticipants || 0;
  const remainingCount = Math.max(0, checkedInCount - submittedCount);

  // Timer Progress Percentage (Server-Authoritative Duration)
  const roundDurationSec = (activeRound?.durationMinutes || 30) * 60;
  const remainingSec = timerState.remainingSeconds !== undefined ? timerState.remainingSeconds : (activeRound?.remainingSeconds || 0);
  const timeProgressPct = roundDurationSec > 0 ? Math.min(100, Math.max(0, (remainingSec / roundDurationSec) * 100)) : 0;

  const isLeaderboardVisible = eventData?.settings?.leaderboardVisible;
  const latestAnnouncement = announcements && announcements.length > 0 ? announcements[0] : null;

  return (
    <div className="live-stage-root">
      {/* Scoped CSS micro-animations and responsive styling */}
      <style>{`
        .live-stage-root {
          min-height: 100vh;
          background: linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%);
          color: #1a2d5a;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          padding: 1.5rem 2rem 2.5rem;
          position: relative;
          box-sizing: border-box;
          overflow-x: hidden;
        }

        @keyframes pulse-live {
          0% { transform: scale(0.95); opacity: 0.8; box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
          70% { transform: scale(1.15); opacity: 1; box-shadow: 0 0 0 8px rgba(22, 163, 74, 0); }
          100% { transform: scale(0.95); opacity: 0.8; box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
        }

        @keyframes pulse-timer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }

        @keyframes fade-slide-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .stage-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          box-shadow: 0 8px 30px rgba(26, 45, 90, 0.05);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fade-slide-in 0.4s ease-out;
        }

        .stage-card:hover {
          box-shadow: 0 12px 36px rgba(26, 45, 90, 0.09);
        }

        .live-badge-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #16a34a;
          display: inline-block;
          animation: pulse-live 1.8s infinite;
        }

        .timer-digits {
          font-family: 'Fira Code', 'Courier New', monospace;
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .urgent-timer {
          color: #ef4444 !important;
          animation: pulse-timer 1s infinite;
        }

        /* Responsive Layout Grid */
        .stage-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-top: 1.5rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        .progress-indicator-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin: 1.25rem 0;
        }

        @media (max-width: 1080px) {
          .stage-grid {
            grid-template-columns: 1fr;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .live-stage-root {
            padding: 1rem;
          }
          .progress-indicator-grid {
            grid-template-columns: 1fr;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      {/* TOP INSTITUTIONAL BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #e2e8f0'
      }}>
        {/* Brand identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: '#1a2d5a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(26, 45, 90, 0.25)',
            flexShrink: 0
          }}>
            <svg width="26" height="26" viewBox="0 0 36 36" fill="none">
              <path d="M10 13L6 18L10 23" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M26 13L30 18L26 23" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 10L15 26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{
              fontSize: '1.45rem',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: '#1a2d5a',
              lineHeight: 1.1
            }}>
              CODESTORM <span style={{ color: '#f97316' }}>2026</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
              Malla Reddy Engineering College & Management Sciences • CSE (Data Science)
            </div>
          </div>
        </div>

        {/* Right Action Controls: Fullscreen & Exit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Live Synchronized Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.85rem',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#1e293b'
          }}>
            <span className="live-badge-dot" /> LIVE ARENA SYNC
          </div>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#1a2d5a',
              padding: '0.4rem 0.85rem',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700,
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullscreen ? 'Normal' : 'Fullscreen'}</span>
          </button>

          {onExit && (
            <button
              onClick={onExit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#1a2d5a',
                border: 'none',
                color: '#ffffff',
                padding: '0.4rem 1rem',
                borderRadius: '9999px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(26, 45, 90, 0.2)'
              }}
            >
              ✕ Exit Stage
            </button>
          )}
        </div>
      </div>

      {/* HERO SECTION: CURRENT STAGE & STATUS */}
      <div style={{
        marginTop: '1.25rem',
        textAlign: 'center',
        padding: '1.5rem 1rem 1rem',
        position: 'relative'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.35rem 1.1rem',
          background: isLive ? '#dcfce7' : (isPaused ? '#fef3c7' : '#f1f5f9'),
          border: `1.5px solid ${isLive ? '#86efac' : (isPaused ? '#fde68a' : '#cbd5e1')}`,
          borderRadius: '9999px',
          color: isLive ? '#15803d' : (isPaused ? '#b45309' : '#64748b'),
          fontWeight: 800,
          fontSize: '0.85rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '0.75rem',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          {isLive ? <Radio size={15} color="#15803d" /> : <Clock size={15} />}
          <span>{isLive ? '● LIVE STAGE' : (isPaused ? '⏸ STAGE PAUSED' : (isCompleted ? '✓ STAGE COMPLETED' : 'OFFICIAL LIVE STAGE'))}</span>
        </div>

        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 900,
          color: '#1a2d5a',
          letterSpacing: '-0.03em',
          margin: '0 0 0.4rem'
        }}>
          CODESTORM <span style={{ color: '#f97316' }}>2026</span>
        </h1>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.65rem',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '1.15rem', color: '#64748b', fontWeight: 600 }}>
            Current Round:
          </span>
          <span style={{
            fontSize: '1.35rem',
            fontWeight: 900,
            color: '#1a2d5a',
            padding: '0.2rem 0.85rem',
            background: '#ffffff',
            border: '2px solid #1a2d5a',
            borderRadius: '10px'
          }}>
            {activeRound.name}
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.85rem',
            background: isLive ? '#dcfce7' : '#f1f5f9',
            color: isLive ? '#166534' : '#64748b',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            fontWeight: 800
          }}>
            {isLive ? <span className="live-badge-dot" /> : null}
            {isLive ? 'LIVE' : (currentStatus || 'UPCOMING').toUpperCase()}
          </span>
        </div>
      </div>

      {/* THREE-STAGE ROUND PROGRESS INDICATOR */}
      <div className="progress-indicator-grid">
        {rounds.map((round, idx) => {
          const isThisActive = round.id === activeRoundId;
          const isThisCompleted = round.status === 'completed';
          const isThisLive = round.status === 'live';

          let borderColor = '#e2e8f0';
          let bgColor = '#ffffff';
          let statusBadgeBg = '#f1f5f9';
          let statusBadgeColor = '#64748b';
          let statusLabel = 'UPCOMING';

          if (isThisCompleted) {
            borderColor = '#bbf7d0';
            bgColor = '#f0fdf4';
            statusBadgeBg = '#dcfce7';
            statusBadgeColor = '#166534';
            statusLabel = 'COMPLETED';
          } else if (isThisActive || isThisLive) {
            borderColor = '#f97316';
            bgColor = '#ffffff';
            statusBadgeBg = '#ffedd5';
            statusBadgeColor = '#c2410c';
            statusLabel = isThisLive ? 'CURRENT / LIVE' : 'CURRENT ROUND';
          }

          return (
            <div
              key={round.id}
              className="stage-card"
              style={{
                padding: '1.25rem 1.5rem',
                border: `2px solid ${borderColor}`,
                background: bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: isThisActive ? '#1a2d5a' : (isThisCompleted ? '#166534' : '#f1f5f9'),
                  color: (isThisActive || isThisCompleted) ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1rem',
                  flexShrink: 0
                }}>
                  {isThisCompleted ? <Check size={20} /> : `0${idx + 1}`}
                </div>
                <div>
                  <div style={{
                    fontSize: '1.05rem',
                    fontWeight: 900,
                    color: isThisActive ? '#1a2d5a' : (isThisCompleted ? '#166534' : '#475569'),
                    letterSpacing: '-0.01em'
                  }}>
                    {round.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                    {round.totalQuestions || (round.id === 3 ? 5 : 20)} Questions • {round.durationMinutes} Mins
                  </div>
                </div>
              </div>

              <div style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                background: statusBadgeBg,
                color: statusBadgeColor,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                flexShrink: 0
              }}>
                {isThisLive && <span className="live-badge-dot" />}
                {statusLabel}
              </div>
            </div>
          );
        })}
      </div>

      {/* CENTRAL ARENA DASHBOARD: LIVE TIMER + CURRENT & NEXT ROUND CARDS */}
      <div className="stage-grid">
        {/* LEFT COLUMN: HERO COUNTDOWN TIMER & LIVE COMPETITOR STATS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* MASSIVE PROJECTION TIMER CARD */}
          <div className="stage-card" style={{
            padding: '2.5rem 2rem',
            textAlign: 'center',
            border: `3px solid ${isLive ? '#1a2d5a' : '#cbd5e1'}`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Top status indicator inside timer */}
            <div style={{ marginBottom: '1rem' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.4rem 1.15rem',
                borderRadius: '9999px',
                background: isLive ? '#fee2e2' : (isPaused ? '#fef3c7' : '#f1f5f9'),
                color: isLive ? '#b91c1c' : (isPaused ? '#b45309' : '#64748b'),
                fontSize: '0.88rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                {isLive ? (
                  <>
                    <span style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      animation: 'pulse-timer 1s infinite'
                    }} />
                    ROUND LIVE
                  </>
                ) : (isPaused ? '⏸ ROUND PAUSED' : 'OFFICIAL ARENA TIMER')}
              </span>
            </div>

            {/* Giant Monospace Timer */}
            <div className={`timer-digits ${remainingSec <= 60 && remainingSec > 0 ? 'urgent-timer' : ''}`} style={{
              fontSize: 'clamp(4.2rem, 8vw, 6.2rem)',
              color: remainingSec <= 60 && remainingSec > 0 ? '#ef4444' : '#1a2d5a',
              marginBottom: '0.5rem'
            }}>
              {formatTimer(remainingSec)}
            </div>

            <div style={{
              fontSize: '0.92rem',
              color: '#f97316',
              fontWeight: 800,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '1.5rem'
            }}>
              {isPaused ? 'TIMER TEMPORARILY PAUSED BY ORGANIZERS' : 'TIME REMAINING'}
            </div>

            {/* Visual Progress Bar Indicator */}
            <div style={{
              maxWidth: '520px',
              margin: '0 auto',
              background: '#f1f5f9',
              borderRadius: '9999px',
              height: '10px',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              position: 'relative'
            }}>
              <div style={{
                width: `${timeProgressPct}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #f97316 0%, #1a2d5a 100%)',
                borderRadius: '9999px',
                transition: 'width 1s linear'
              }} />
            </div>

            <div style={{
              fontSize: '0.75rem',
              color: '#94a3b8',
              fontWeight: 600,
              marginTop: '0.5rem'
            }}>
              Configured Round Duration: {activeRound?.durationMinutes || 30} Minutes
            </div>
          </div>

          {/* LIVE STATS SECTION */}
          <div className="stats-grid">
            {/* Participants */}
            <div className="stage-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.4rem', color: '#64748b' }}>
                <Users size={20} />
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                PARTICIPANTS
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#1a2d5a', marginTop: '0.2rem' }}>
                {totalParticipants}
              </div>
            </div>

            {/* Checked In */}
            <div className="stage-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.4rem', color: '#0d9488' }}>
                <UserCheck size={20} />
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                CHECKED IN
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0d9488', marginTop: '0.2rem' }}>
                {checkedInCount}
              </div>
            </div>

            {/* Submitted */}
            <div className="stage-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.4rem', color: '#7c3aed' }}>
                <CheckCircle2 size={20} />
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                SUBMITTED
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#7c3aed', marginTop: '0.2rem' }}>
                {submittedCount}
              </div>
            </div>

            {/* Remaining */}
            <div className="stage-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.4rem', color: '#f97316' }}>
                <Clock size={20} />
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                REMAINING
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#f97316', marginTop: '0.2rem' }}>
                {remainingCount}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CURRENT ROUND DETAILS, UP NEXT & LIVE ACTIVITY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* CURRENT ACTIVE ROUND POLISHED CARD */}
          <div className="stage-card" style={{ padding: '1.75rem 2rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#f97316',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}>
                  ACTIVE COMPETITION ROUND
                </span>
                <h2 style={{
                  fontSize: '1.85rem',
                  fontWeight: 900,
                  color: '#1a2d5a',
                  letterSpacing: '-0.02em',
                  margin: '0.25rem 0 0.35rem'
                }}>
                  {activeRound.name}
                </h2>
                <div style={{ fontSize: '0.92rem', color: '#64748b', fontWeight: 600 }}>
                  {activeRound.subtitle}
                </div>
              </div>

              <div style={{
                padding: '0.35rem 0.95rem',
                borderRadius: '9999px',
                background: isLive ? '#dcfce7' : '#f1f5f9',
                color: isLive ? '#166534' : '#64748b',
                fontWeight: 800,
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                {isLive && <span className="live-badge-dot" />}
                {isLive ? 'LIVE NOW' : (currentStatus || 'UPCOMING').toUpperCase()}
              </div>
            </div>

            <p style={{
              fontSize: '0.9rem',
              color: '#334155',
              lineHeight: 1.5,
              marginBottom: '1.25rem'
            }}>
              {activeRound.description}
            </p>

            {/* Round Specs Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '1.5rem' }}>
              <span style={{
                padding: '0.35rem 0.85rem',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#1a2d5a'
              }}>
                📋 {activeRound.totalQuestions || (activeRound.id === 3 ? 5 : 20)} Questions
              </span>
              <span style={{
                padding: '0.35rem 0.85rem',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#1a2d5a'
              }}>
                ⏱ {activeRound.durationMinutes} Minutes
              </span>
              <span style={{
                padding: '0.35rem 0.85rem',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#065f46'
              }}>
                ⭐ +10 Positive Marks / 0 Negative
              </span>
            </div>

            {/* View Round Action Button */}
            {onViewRound && (
              <button
                onClick={() => onViewRound(activeRound.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.35rem',
                  background: '#1a2d5a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(26, 45, 90, 0.2)'
                }}
              >
                <span>VIEW ROUND ARENA</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>

          {/* UP NEXT SECTION */}
          <div className="stage-card" style={{
            padding: '1.35rem 1.75rem',
            background: '#fafafa',
            border: '1.5px dashed #cbd5e1'
          }}>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#f97316',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '0.4rem'
            }}>
              UP NEXT
            </div>

            {nextRound ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1a2d5a' }}>
                    {nextRound.name}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    {nextRound.subtitle}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{
                    padding: '0.25rem 0.65rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#475569'
                  }}>
                    {nextRound.totalQuestions || (nextRound.id === 3 ? 5 : 20)} Questions
                  </span>
                  <span style={{
                    padding: '0.25rem 0.65rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#475569'
                  }}>
                    {nextRound.durationMinutes} Minutes
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
                <Sparkles size={18} color="#f97316" />
                <span>Final Round of CodeStorm 2026 • Official Winner Felicitation & Ceremony to follow</span>
              </div>
            )}
          </div>

          {/* LIVE ACTIVITY STATUS PANEL */}
          <div className="stage-card" style={{ padding: '1.35rem 1.75rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.85rem'
            }}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#1a2d5a',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}>
                <Radio size={14} color="#f97316" /> LIVE COMPETITION STATUS
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                REAL-TIME STREAM
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {/* Event 1: Round State */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                fontSize: '0.85rem',
                color: '#1e293b'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isLive ? '#dcfce7' : '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Check size={14} color={isLive ? '#166534' : '#64748b'} />
                </div>
                <span>
                  <strong>Round {activeRound.id} ({activeRound.name}):</strong> {isLive ? 'Currently LIVE and accepting submissions' : (isCompleted ? 'Round has officially concluded' : 'Scheduled and awaiting start')}
                </span>
              </div>

              {/* Event 2: Checked in Competitors */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                fontSize: '0.85rem',
                color: '#1e293b'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#e0f2fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <UserCheck size={14} color="#0369a1" />
                </div>
                <span>
                  <strong>Participants Connected:</strong> {checkedInCount} verified competitors present in arena
                </span>
              </div>

              {/* Event 3: Submissions */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                fontSize: '0.85rem',
                color: '#1e293b'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#f3e8ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Code2 size={14} color="#7e22ce" />
                </div>
                <span>
                  <strong>Submissions Logged:</strong> {submittedCount} unique participants submitted in this round
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: LEADERBOARD PODIUM IF REVEALED OR STRICT PRIVACY BANNER */}
      <div style={{ marginTop: '1.75rem' }}>
        {isLeaderboardVisible ? (
          /* Leaderboard revealed: Show podium */
          <div style={{ maxWidth: '960px', margin: '0 auto 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {topThree.map((p, idx) => (
              <div
                key={p.id || idx}
                className="stage-card"
                style={{
                  border: `2px solid ${idx === 0 ? '#f59e0b' : (idx === 1 ? '#94a3b8' : '#d97706')}`,
                  padding: '1.25rem',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '2.25rem', marginBottom: '0.25rem' }}>
                  {idx === 0 ? '🥇' : (idx === 1 ? '🥈' : '🥉')}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: idx === 0 ? '#d97706' : '#64748b', textTransform: 'uppercase' }}>
                  {idx === 0 ? 'RANK 1' : (idx === 1 ? 'RANK 2' : 'RANK 3')}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1a2d5a', margin: '0.25rem 0' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', fontFamily: 'monospace' }}>
                  {p.participantId} • {p.branch}
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#f97316', marginTop: '0.5rem', fontFamily: 'monospace' }}>
                  {p.score} PTS
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Leaderboard hidden: Informative Privacy Banner */
          <div className="stage-card" style={{
            maxWidth: '850px',
            margin: '0 auto 1.5rem',
            border: '2px dashed #cbd5e1',
            padding: '1.25rem 2rem',
            textAlign: 'center',
            background: '#ffffff'
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#b45309', fontWeight: 800, fontSize: '0.92rem', marginBottom: '0.25rem' }}>
              <Lock size={16} /> LEADERBOARD STANDINGS HIDDEN BY EVENT MANAGEMENT
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Individual scores are computed automatically with ZERO negative marking. Standings will be unveiled on this screen upon official announcement.
            </div>
          </div>
        )}

        {/* Latest Announcement Marquee Ticker */}
        {latestAnnouncement && (
          <div className="stage-card" style={{
            border: '1px solid #fed7aa',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            maxWidth: '960px',
            margin: '0 auto',
            background: '#fffaf0'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#ffedd5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Bell size={18} color="#ea580c" />
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1a2d5a', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              <strong style={{ color: '#ea580c' }}>ANNOUNCEMENT:</strong> {latestAnnouncement.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
