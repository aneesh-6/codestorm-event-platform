import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { Zap, Clock, Users, UserCheck, Trophy, Bell, Radio, Lock, ShieldCheck } from 'lucide-react';

export default function LiveProjectorScreen({ onExit }) {
  const { timerState, announcements } = useSocket();
  const [eventData, setEventData] = useState(null);
  const [topThree, setTopThree] = useState([]);

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
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (sec) => {
    if (sec === undefined || sec === null || sec < 0) return '00:00';
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const latestAnnouncement = announcements[0];
  const isLeaderboardVisible = eventData?.settings?.leaderboardVisible;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%)',
      color: '#1a2d5a',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '2rem 3rem',
      position: 'relative',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Exit Button for Organizers */}
      {onExit && (
        <button
          onClick={onExit}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.5rem',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#64748b',
            padding: '0.4rem 0.85rem',
            borderRadius: '9999px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 700,
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          ✕ Exit Stage View
        </button>
      )}

      {/* TOP INSTITUTIONAL BRANDING HEADER */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.4rem' }}>
          {/* CodeStorm Official Logo Icon */}
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#1a2d5a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(26, 45, 90, 0.2)'
          }}>
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <path d="M10 13L6 18L10 23" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M26 13L30 18L26 23" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 10L15 26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>

          <h1 style={{
            fontSize: '2.75rem',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            color: '#1a2d5a',
            margin: 0
          }}>
            CODESTORM <span style={{ color: '#f97316' }}>2026</span>
          </h1>
        </div>

        <div style={{ fontSize: '1.05rem', color: '#64748b', fontWeight: 600 }}>
          Malla Reddy Engineering College & Management Sciences • Department of CSE - Data Science
        </div>
      </div>

      {/* MIDDLE SECTION: MAIN AUDITORIUM TIMER & ARENA STATUS */}
      <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <span style={{
            fontSize: '1rem',
            fontWeight: 800,
            padding: '0.4rem 1.15rem',
            borderRadius: '9999px',
            background: timerState.status === 'live' ? '#dcfce7' : '#f1f5f9',
            color: timerState.status === 'live' ? '#166534' : '#64748b',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Radio size={16} /> {timerState.status === 'live' ? 'ARENA IS LIVE' : (timerState.status || 'UPCOMING').toUpperCase()}
          </span>

          <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1a2d5a' }}>
            {timerState.roundName || 'COMPETITION ARENA'}
          </span>
        </div>

        {/* MASSIVE PROJECTION COUNTDOWN TIMER CARD */}
        <div style={{
          display: 'inline-block',
          padding: '2rem 5rem',
          background: '#ffffff',
          border: '3px solid #1a2d5a',
          borderRadius: '28px',
          boxShadow: '0 20px 45px rgba(26, 45, 90, 0.12)'
        }}>
          <div style={{
            fontSize: '7.5rem',
            fontWeight: 900,
            fontFamily: 'monospace',
            color: timerState.remainingSeconds <= 60 && timerState.remainingSeconds > 0 ? '#ef4444' : '#1a2d5a',
            letterSpacing: '0.04em',
            lineHeight: 1
          }}>
            {formatTimer(timerState.remainingSeconds)}
          </div>
          <div style={{
            fontSize: '1rem',
            color: '#f97316',
            fontWeight: 800,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginTop: '0.75rem'
          }}>
            {timerState.isPaused ? '⏸ ARENA PAUSED' : 'OFFICIAL TIME REMAINING'}
          </div>
        </div>

        {/* Live Attendance Counters Row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4rem', marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={26} color="#166534" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Checked In</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#1a2d5a' }}>
                {eventData?.stats?.checkedInParticipants || 0} / {eventData?.stats?.totalParticipants || 0}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={26} color="#0369a1" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Active Competitors</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0369a1' }}>
                {eventData?.stats?.activeParticipants || 0} Live
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: LEADERBOARD ONLY IF ENABLED, OTHERWISE STRICT PRIVACY LOCK */}
      <div>
        {isLeaderboardVisible ? (
          /* Leaderboard revealed: Show podium */
          <div style={{ maxWidth: '960px', margin: '0 auto 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {topThree.map((p, idx) => (
              <div
                key={p.id || idx}
                style={{
                  background: '#ffffff',
                  border: `2px solid ${idx === 0 ? '#f59e0b' : (idx === 1 ? '#94a3b8' : '#d97706')}`,
                  borderRadius: '16px',
                  padding: '1.25rem',
                  textAlign: 'center',
                  boxShadow: 'var(--shadow-md)'
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
          <div style={{
            maxWidth: '850px',
            margin: '0 auto 1.5rem',
            background: '#ffffff',
            border: '2px dashed #cbd5e1',
            borderRadius: '16px',
            padding: '1.25rem 2rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#b45309', fontWeight: 800, fontSize: '0.92rem', marginBottom: '0.25rem' }}>
              <Lock size={16} /> LEADERBOARD STANDINGS HIDDEN BY EVENT MANAGEMENT
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Individual scores are computed automatically. Standings will be unveiled on this screen upon official announcement.
            </div>
          </div>
        )}

        {/* Latest Announcement Marquee Ticker */}
        {latestAnnouncement && (
          <div style={{
            background: '#ffffff',
            border: '1px solid #fed7aa',
            borderRadius: '12px',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            maxWidth: '960px',
            margin: '0 auto',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={18} color="#f97316" />
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a2d5a', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              <strong style={{ color: '#f97316' }}>ANNOUNCEMENT:</strong> {latestAnnouncement.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
