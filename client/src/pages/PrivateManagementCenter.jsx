import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Shield,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  StopCircle,
  Users,
  UserCheck,
  Trophy,
  AlertTriangle,
  Send,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Search,
  CheckCircle2,
  Radio,
  FileCheck2,
  Tv,
  KeyRound,
  UserX,
  UserCheck2,
  Clock,
  Layers,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  BarChart3,
  Sliders
} from 'lucide-react';

export default function PrivateManagementCenter({ onNavigateToLive, onNavigateToWinners }) {
  const { authFetch, user } = useAuth();
  const { timerState } = useSocket();

  const isAdmin = user?.role === 'admin';
  const isCoordinator = user?.role === 'coordinator';

  const [activeTab, setActiveTab] = useState(isAdmin ? 'dashboard' : 'participants');
  const [eventData, setEventData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [antiCheatLogs, setAntiCheatLogs] = useState([]);
  const [selectedRoundForControl, setSelectedRoundForControl] = useState(1);
  const [durationInput, setDurationInput] = useState(30);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [tempPasswordModal, setTempPasswordModal] = useState(null); // { participantId, name, tempPassword }

  // Check-In State
  const [checkInSearch, setCheckInSearch] = useState('');
  const [checkInMsg, setCheckInMsg] = useState(null);

  // Participant Management Search & Filter
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantStatusFilter, setParticipantStatusFilter] = useState('all');

  // Announcement State
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState('normal');

  const loadAll = () => {
    fetch('/api/event/status')
      .then(r => r.json())
      .then(d => setEventData(d))
      .catch(() => {});

    authFetch('/api/participants')
      .then(r => r.json())
      .then(p => {
        if (Array.isArray(p)) setParticipants(p);
      })
      .catch(() => {});

    authFetch('/api/submissions/all')
      .then(r => r.json())
      .then(s => {
        if (Array.isArray(s)) setSubmissions(s);
      })
      .catch(() => {});

    authFetch('/api/anticheat/logs')
      .then(r => r.json())
      .then(l => {
        if (Array.isArray(l)) setAntiCheatLogs(l);
      })
      .catch(() => {});

    authFetch('/api/questions/round/1')
      .then(r => r.json())
      .then(q1 => {
        authFetch('/api/questions/round/2').then(r => r.json()).then(q2 => {
          authFetch('/api/questions/round/3').then(r => r.json()).then(q3 => {
            const arr1 = Array.isArray(q1) ? q1 : [];
            const arr2 = Array.isArray(q2) ? q2 : [];
            const arr3 = Array.isArray(q3) ? q3 : [];
            setQuestions([...arr1, ...arr2, ...arr3]);
          });
        });
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (sec) => {
    if (sec === undefined || sec === null || sec < 0) return '00:00';
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // --- ROUND CONTROLS ---
  const handleStartRound = (roundId) => {
    authFetch('/api/event/round/start', {
      method: 'POST',
      body: JSON.stringify({ roundId, durationMinutes: Number(durationInput) })
    })
      .then(r => r.json())
      .then(() => loadAll())
      .catch(err => alert(err.message));
  };

  const handlePauseRound = () => {
    authFetch('/api/event/round/pause', { method: 'POST' })
      .then(() => loadAll())
      .catch(err => alert(err.message));
  };

  const handleResumeRound = () => {
    authFetch('/api/event/round/resume', { method: 'POST' })
      .then(() => loadAll())
      .catch(err => alert(err.message));
  };

  const handleEndRound = (roundId) => {
    setConfirmDialog({
      title: `Lock and End Round ${roundId}?`,
      message: 'Are you sure you want to end this round? All participant submission editors will be locked immediately.',
      onConfirm: () => {
        authFetch('/api/event/round/end', {
          method: 'POST',
          body: JSON.stringify({ roundId })
        }).then(() => {
          setConfirmDialog(null);
          loadAll();
        });
      }
    });
  };

  const handleNextRound = () => {
    setConfirmDialog({
      title: 'Advance to Next Competition Round?',
      message: 'This will automatically advance the active round to the subsequent stage for all participants.',
      onConfirm: () => {
        authFetch('/api/event/round/next', { method: 'POST' })
          .then(() => {
            setConfirmDialog(null);
            loadAll();
          });
      }
    });
  };

  // --- LEADERBOARD CONTROLS (Exact prompt spec: SHOW LIVE, HIDE, FREEZE, PUBLISH FINAL) ---
  const handleSetLeaderboardMode = (mode) => {
    if (mode === 'final') {
      setConfirmDialog({
        title: 'Publish Final CodeStorm 2026 Results?',
        message: 'This will reveal official final rankings and enable the winners podium and certificates for all participants.',
        onConfirm: () => {
          authFetch('/api/event/leaderboard-mode', {
            method: 'POST',
            body: JSON.stringify({ mode: 'final' })
          }).then(() => {
            setConfirmDialog(null);
            loadAll();
            if (onNavigateToWinners) onNavigateToWinners();
          });
        }
      });
      return;
    }

    authFetch('/api/event/leaderboard-mode', {
      method: 'POST',
      body: JSON.stringify({ mode })
    })
      .then(r => r.json())
      .then(() => loadAll())
      .catch(err => alert(err.message));
  };

  // --- CHECK-IN DESK ---
  const handleCheckIn = (participantId) => {
    authFetch(`/api/checkin/${participantId}`, { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setCheckInMsg({ type: 'error', text: d.error });
        } else {
          setCheckInMsg({ type: 'success', text: `Verified & Checked in ${d.participant.name} (${d.participant.participantId})!` });
          loadAll();
        }
        setTimeout(() => setCheckInMsg(null), 4000);
      });
  };

  // --- PARTICIPANT MANAGEMENT (Reset Password & Disable/Enable) ---
  const handleResetPassword = (p) => {
    setConfirmDialog({
      title: `Reset Password for ${p.name}?`,
      message: `A temporary password will be generated for ${p.participantId} (${p.email}). They will be required to change it on their next login.`,
      onConfirm: () => {
        authFetch(`/api/participants/${p.id}/reset-password`, { method: 'POST' })
          .then(r => r.json())
          .then(d => {
            setConfirmDialog(null);
            if (d.success) {
              setTempPasswordModal({
                participantId: d.participantId,
                name: p.name,
                tempPassword: d.temporaryPassword
              });
            } else {
              alert(d.error || 'Failed to reset password');
            }
          });
      }
    });
  };

  const handleToggleAccountStatus = (p) => {
    const newStatus = p.status === 'disabled' ? 'active' : 'disabled';
    authFetch(`/api/participants/${p.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    })
      .then(r => r.json())
      .then(() => loadAll());
  };

  // --- ANNOUNCEMENT BROADCAST ---
  const handleSendAnnouncement = (e) => {
    e.preventDefault();
    if (!announcementMsg.trim()) return;

    authFetch('/api/announcements', {
      method: 'POST',
      body: JSON.stringify({ message: announcementMsg, priority: announcementPriority })
    }).then(() => {
      setAnnouncementMsg('');
      loadAll();
    });
  };

  const rounds = eventData?.rounds || [];
  const currentRound = eventData?.currentRound;
  const settings = eventData?.settings || {};

  const checkedInCount = participants.filter(p => p.checkedIn).length;
  const totalCount = participants.length;
  const checkedInPct = totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;
  const acceptedSubs = submissions.filter(s => s.status === 'Accepted').length;

  // Determine current Leaderboard Mode string
  let currentLeaderboardMode = 'HIDDEN';
  if (settings.resultsPublished) {
    currentLeaderboardMode = 'FINAL';
  } else if (settings.leaderboardFrozen) {
    currentLeaderboardMode = 'FROZEN';
  } else if (settings.leaderboardVisible) {
    currentLeaderboardMode = 'LIVE';
  }

  // Filtered check-in search
  const checkInResults = participants.filter(p => {
    if (!checkInSearch.trim()) return false;
    const q = checkInSearch.toLowerCase().trim();
    return (
      p.participantId.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.rollNumber && p.rollNumber.toLowerCase().includes(q))
    );
  });

  // Filtered participant list
  const filteredParticipants = participants.filter(p => {
    const matchesSearch = !participantSearch.trim() || (
      p.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
      p.participantId.toLowerCase().includes(participantSearch.toLowerCase()) ||
      (p.branch && p.branch.toLowerCase().includes(participantSearch.toLowerCase())) ||
      (p.rollNumber && p.rollNumber.toLowerCase().includes(participantSearch.toLowerCase()))
    );

    if (participantStatusFilter === 'checkedIn') return matchesSearch && p.checkedIn;
    if (participantStatusFilter === 'notCheckedIn') return matchesSearch && !p.checkedIn;
    if (participantStatusFilter === 'disabled') return matchesSearch && p.status === 'disabled';
    return matchesSearch;
  });

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
      {/* Top Banner: Institutional Management Header */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #1a2d5a 0%, #0f1c3d 100%)',
        color: '#ffffff',
        padding: '1.75rem 2rem',
        borderRadius: '16px',
        marginBottom: '2rem',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(249, 115, 22, 0.2)', color: '#fb923c', padding: '0.25rem 0.85rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '0.6rem', border: '1px solid rgba(249, 115, 22, 0.35)' }}>
              <Shield size={14} /> {isAdmin ? 'ADMIN DASHBOARD' : 'FACULTY COORDINATOR DASHBOARD'}
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 900, margin: 0, color: '#ffffff', letterSpacing: '-0.01em' }}>
              CODESTORM 2026 {isAdmin ? 'ADMIN DASHBOARD' : 'FACULTY COORDINATOR DASHBOARD'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem', margin: '0.35rem 0 0' }}>
              Department of CSE – Data Science • Malla Reddy Engineering College and Management Sciences
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={onNavigateToLive}
              className="btn btn-outline"
              style={{
                borderColor: 'rgba(255,255,255,0.3)',
                color: '#ffffff',
                background: 'rgba(255,255,255,0.08)'
              }}
            >
              <Tv size={16} /> Live Stage Projector (/live)
            </button>
            <button
              onClick={onNavigateToWinners}
              className="btn btn-secondary"
            >
              <Trophy size={16} /> Podium & Results
            </button>
          </div>
        </div>

        {/* Quick Operational Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Checked In</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#38bdf8' }}>
              {checkedInCount} <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>/ {totalCount} ({checkedInPct}%)</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Active Round</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f97316' }}>
              {timerState.roundName || 'None Live'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Official Timer</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'monospace', color: timerState.status === 'live' ? '#4ade80' : '#ffffff' }}>
              {formatTimer(timerState.remainingSeconds)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leaderboard Privacy</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '1rem', fontWeight: 900, marginTop: '0.2rem', color: currentLeaderboardMode === 'HIDDEN' ? '#fbbf24' : '#4ade80' }}>
              {currentLeaderboardMode === 'HIDDEN' ? <Lock size={14} /> : <Eye size={14} />} {currentLeaderboardMode}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submissions (Accepted)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff' }}>
              {acceptedSubs} <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>/ {submissions.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Specific Feature Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        borderBottom: '2px solid var(--border-color)',
        marginBottom: '1.75rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem'
      }}>
        {(isAdmin ? [
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'participants', label: 'Participants', icon: Users },
          { id: 'checkin', label: 'Check-In', icon: UserCheck },
          { id: 'rounds', label: 'Rounds', icon: Radio },
          { id: 'questions', label: 'Question Bank', icon: Layers },
          { id: 'submissions', label: 'Submissions', icon: FileCheck2 },
          { id: 'leaderboard', label: 'Leaderboard Control', icon: Lock },
          { id: 'announcements', label: 'Announcements', icon: Send },
          { id: 'results', label: 'Results', icon: Trophy },
          { id: 'settings', label: 'Settings', icon: Sliders }
        ] : [
          { id: 'participants', label: 'Participants', icon: Users },
          { id: 'checkin', label: 'Check-In', icon: UserCheck },
          { id: 'currentRound', label: 'Current Round', icon: Radio },
          { id: 'submissions', label: 'Submissions', icon: FileCheck2 },
          { id: 'leaderboard', label: 'Leaderboard', icon: Lock },
          { id: 'announcements', label: 'Announcements', icon: Send },
          { id: 'results', label: 'Results', icon: Trophy }
        ]).map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn ${isActive ? 'btn-primary' : 'btn-outline'}`}
              style={{
                borderRadius: '9999px',
                padding: '0.5rem 1.15rem',
                fontSize: '0.88rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* 0. DASHBOARD OVERVIEW (Admin)                             */}
      {/* ========================================================= */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-orange)' }}>
                  EVENT PROGRESSION OVERVIEW
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-navy)', margin: '0.2rem 0' }}>
                  {timerState.roundName || 'No Round Live'}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                  Current Status: <strong style={{ textTransform: 'uppercase', color: timerState.status === 'live' ? '#059669' : '#64748b' }}>{timerState.status || 'Standby'}</strong> {timerState.isPaused ? ' (PAUSED)' : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button onClick={() => setActiveTab('rounds')} className="btn btn-primary btn-sm">
                  <Radio size={14} /> Round Controls
                </button>
                <button onClick={() => setActiveTab('leaderboard')} className="btn btn-outline btn-sm">
                  <Lock size={14} /> Leaderboard State
                </button>
                <button onClick={() => setActiveTab('announcements')} className="btn btn-outline btn-sm">
                  <Send size={14} /> Post Announcement
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Check-In Attendance</div>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--color-navy)', marginTop: '0.35rem' }}>
                  {checkedInCount} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ {totalCount} ({checkedInPct}%)</span>
                </div>
                <div style={{ background: '#e2e8f0', borderRadius: '9999px', height: '6px', width: '100%', marginTop: '0.65rem', overflow: 'hidden' }}>
                  <div style={{ background: '#0284c7', height: '100%', width: `${checkedInPct}%`, transition: 'width 0.3s' }} />
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Leaderboard Privacy</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: currentLeaderboardMode === 'HIDDEN' ? '#b45309' : '#059669', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {currentLeaderboardMode === 'HIDDEN' ? <Lock size={20} /> : <Eye size={20} />} {currentLeaderboardMode}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  {currentLeaderboardMode === 'HIDDEN' ? 'Default: Scores hidden from participants' : 'Scores currently visible'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Submissions Feed</div>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--color-navy)', marginTop: '0.35rem' }}>
                  {submissions.length}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, marginTop: '0.4rem' }}>
                  {acceptedSubs} Accepted Solutions
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Anti-Cheat Alerts</div>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: antiCheatLogs.length > 0 ? '#dc2626' : '#059669', marginTop: '0.35rem' }}>
                  {antiCheatLogs.length}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  {antiCheatLogs.filter(l => l.severity === 'high').length} High-severity warnings
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. ROUND CONTROLS                                         */}
      {/* ========================================================= */}
      {activeTab === 'rounds' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Master Round Command Card */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>
              Master Competition Round Orchestration
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Participants receive access ONLY to the round currently opened by event management. Ending a round locks all submission interfaces immediately.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {rounds.map(round => {
                const isCurrent = currentRound?.id === round.id;
                const isLive = round.status === 'live';
                const isCompleted = round.status === 'completed';

                let badgeColor = 'var(--text-muted)';
                let badgeBg = '#f1f5f9';
                if (isLive) {
                  badgeColor = '#059669';
                  badgeBg = '#d1fae5';
                } else if (isCompleted) {
                  badgeColor = '#2563eb';
                  badgeBg = '#dbeafe';
                }

                return (
                  <div
                    key={round.id}
                    style={{
                      border: isLive ? '2px solid var(--color-orange)' : '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      background: isLive ? '#fffaf5' : '#ffffff',
                      boxShadow: isLive ? 'var(--shadow-md)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-orange)' }}>
                        STAGE {round.id}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '0.25rem 0.65rem',
                        borderRadius: '9999px',
                        background: badgeBg,
                        color: badgeColor,
                        textTransform: 'uppercase'
                      }}>
                        {round.status}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
                      {round.name}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1rem', minHeight: '38px' }}>
                      {round.description}
                    </p>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                      <span>Scheduled Duration: <strong>{round.durationMinutes}m</strong></span>
                      {isLive && (
                        <span style={{ color: 'var(--color-orange)', fontWeight: 700 }}>
                          Remaining: {formatTimer(timerState.remainingSeconds)}
                        </span>
                      )}
                    </div>

                    {/* Round Actions */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {!isLive && !isCompleted && (
                        <button
                          onClick={() => handleStartRound(round.id)}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1 }}
                        >
                          <Play size={14} /> START ROUND
                        </button>
                      )}

                      {isLive && (
                        <>
                          {round.isPaused ? (
                            <button onClick={handleResumeRound} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                              <Play size={14} /> RESUME
                            </button>
                          ) : (
                            <button onClick={handlePauseRound} className="btn btn-outline btn-sm" style={{ flex: 1 }}>
                              <Pause size={14} /> PAUSE
                            </button>
                          )}
                          <button
                            onClick={() => handleEndRound(round.id)}
                            className="btn btn-sm"
                            style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                          >
                            <StopCircle size={14} /> END ROUND
                          </button>
                        </>
                      )}

                      {isCompleted && (
                        <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle2 size={16} /> Round Completed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Advance to next round bar */}
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                  Set Duration for Round Starts:
                </span>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={durationInput}
                  onChange={(e) => setDurationInput(e.target.value)}
                  className="input-field"
                  style={{ width: '90px', padding: '0.4rem 0.75rem' }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>minutes</span>
              </div>

              <button
                onClick={handleNextRound}
                className="btn btn-secondary"
              >
                <SkipForward size={16} /> START NEXT ROUND
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. LEADERBOARD CONTROL (Strict Section 14, 15, 19 Spec)    */}
      {/* ========================================================= */}
      {activeTab === 'leaderboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(26, 45, 90, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={22} color="var(--color-navy)" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-navy)', margin: 0 }}>
                  LEADERBOARD VISIBILITY CONTROL
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                  Backend-controlled privacy state. By default, participants cannot see other participants' scores or ranks.
                </p>
              </div>
            </div>

            {/* Current Status Callout */}
            <div style={{
              background: '#f8fafc',
              border: '2px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.5rem',
              margin: '1.75rem 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Current Status:
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: currentLeaderboardMode === 'HIDDEN' ? '#b45309' : (currentLeaderboardMode === 'LIVE' ? '#059669' : '#1a2d5a'), display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {currentLeaderboardMode === 'HIDDEN' && <Lock size={26} />}
                  {currentLeaderboardMode === 'LIVE' && <Eye size={26} />}
                  {currentLeaderboardMode === 'FROZEN' && <Pause size={26} />}
                  {currentLeaderboardMode === 'FINAL' && <Trophy size={26} />}
                  {currentLeaderboardMode}
                </div>
              </div>

              <div style={{ maxWidth: '480px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {currentLeaderboardMode === 'HIDDEN' && (
                  <span>🔒 <strong>Participants only see their personal score</strong> and solved count. Public standings and other participants' scores are strictly blocked.</span>
                )}
                {currentLeaderboardMode === 'LIVE' && (
                  <span>🟢 <strong>Live Leaderboard is visible.</strong> Scores and rankings update in real time across participant screens and the stage display.</span>
                )}
                {currentLeaderboardMode === 'FROZEN' && (
                  <span>❄️ <strong>Leaderboard is frozen.</strong> Participants can see current scores, but subsequent submissions and points will not update publicly.</span>
                )}
                {currentLeaderboardMode === 'FINAL' && (
                  <span>🏆 <strong>Final Published.</strong> Event concluded. Full verified podium, official rankings, and merit certificates are visible.</span>
                )}
              </div>
            </div>

            {/* Four Prompt-Specified Control Buttons */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Event Management Actions:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem' }}>
                <button
                  onClick={() => handleSetLeaderboardMode('live')}
                  className={`btn ${currentLeaderboardMode === 'LIVE' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ minWidth: '160px', padding: '0.75rem 1.25rem', fontWeight: 800 }}
                >
                  <Eye size={16} /> [ SHOW LIVE ]
                </button>

                <button
                  onClick={() => handleSetLeaderboardMode('hidden')}
                  className={`btn ${currentLeaderboardMode === 'HIDDEN' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ minWidth: '160px', padding: '0.75rem 1.25rem', fontWeight: 800 }}
                >
                  <Lock size={16} /> [ HIDE ]
                </button>

                <button
                  onClick={() => handleSetLeaderboardMode('frozen')}
                  className={`btn ${currentLeaderboardMode === 'FROZEN' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ minWidth: '160px', padding: '0.75rem 1.25rem', fontWeight: 800 }}
                >
                  <Pause size={16} /> [ FREEZE ]
                </button>

                <button
                  onClick={() => handleSetLeaderboardMode('final')}
                  className={`btn ${currentLeaderboardMode === 'FINAL' ? 'btn-secondary' : 'btn-outline'}`}
                  style={{ minWidth: '160px', padding: '0.75rem 1.25rem', fontWeight: 800 }}
                >
                  <Trophy size={16} /> [ PUBLISH FINAL ]
                </button>
              </div>
            </div>

            {/* Privacy Architecture Notice */}
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '1rem 1.25rem',
              fontSize: '0.85rem',
              color: '#1e40af'
            }}>
              <strong>Default status: HIDDEN.</strong> Do not expose these controls to participants. Even when leaderboard is hidden, participants can see their own score, problems solved, and submission results, but will NOT receive other participants' scores or rank data over the API.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. CHECK-IN DESK (Section 21)                             */}
      {/* ========================================================= */}
      {activeTab === 'checkin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>
              Venue Check-In & Physical Verification Desk
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Search participant by Participant ID (e.g. CS26-1042) or student name upon entry to the event hall. Prevents duplicate check-ins.
            </p>

            {/* Search Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', maxWidth: '600px', marginBottom: '1.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Enter Participant ID (e.g. CS26-1042) or Student Name..."
                  value={checkInSearch}
                  onChange={(e) => setCheckInSearch(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '42px', width: '100%' }}
                />
              </div>
              {checkInSearch && (
                <button onClick={() => setCheckInSearch('')} className="btn btn-outline btn-sm">
                  Clear
                </button>
              )}
            </div>

            {/* Check-in Notification Banner */}
            {checkInMsg && (
              <div style={{
                padding: '0.85rem 1.25rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                background: checkInMsg.type === 'error' ? '#fee2e2' : '#dcfce7',
                color: checkInMsg.type === 'error' ? '#991b1b' : '#166534',
                border: `1px solid ${checkInMsg.type === 'error' ? '#fca5a5' : '#86efac'}`
              }}>
                {checkInMsg.text}
              </div>
            )}

            {/* Search Results Card */}
            {checkInSearch.trim() && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                  Search Results ({checkInResults.length})
                </div>

                {checkInResults.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: 'var(--text-muted)' }}>
                    No participant matching "{checkInSearch}". Verify the ID from the student's registration receipt.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                    {checkInResults.map(p => (
                      <div
                        key={p.id}
                        style={{
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          padding: '1.25rem',
                          background: p.checkedIn ? '#f0fdf4' : '#ffffff'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-navy)', fontFamily: 'monospace' }}>
                            {p.participantId}
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            background: p.checkedIn ? '#dcfce7' : '#fee2e2',
                            color: p.checkedIn ? '#166534' : '#991b1b'
                          }}>
                            {p.checkedIn ? 'CHECKED IN' : 'NOT CHECKED IN'}
                          </span>
                        </div>

                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                          {p.name}
                        </div>

                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', marginBottom: '1rem' }}>
                          <div>Year: <strong>{p.year || '3rd Year'}</strong></div>
                          <div>Branch: <strong>{p.branch || 'CSE-DS'}</strong></div>
                          <div>Section: <strong>{p.section || 'A'}</strong></div>
                          <div>Roll: <strong>{p.rollNumber || 'N/A'}</strong></div>
                        </div>

                        {p.checkedIn ? (
                          <div style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <CheckCircle2 size={16} /> Verified at {p.checkedInAt ? new Date(p.checkedInAt).toLocaleTimeString() : 'Venue'}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCheckIn(p.participantId)}
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center' }}
                          >
                            <UserCheck size={16} /> CHECK IN
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick Summary of Checked-In Participants */}
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.75rem' }}>
                Recently Checked-In Attendees ({checkedInCount} / {totalCount})
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Participant ID</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Branch / Year</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Check-In Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.filter(p => p.checkedIn).map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 800, fontFamily: 'monospace' }}>{p.participantId}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{p.name}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{p.branch} • {p.year}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#dcfce7', color: '#166534' }}>
                            Checked In
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                          {p.checkedInAt ? new Date(p.checkedInAt).toLocaleTimeString() : 'Live'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. PARTICIPANT MANAGEMENT (Section 20)                    */}
      {/* ========================================================= */}
      {activeTab === 'participants' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>
                  Participant Management & Authentication Control
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.2rem 0 0' }}>
                  Search registered competitors, monitor live scores, reset credentials, or disable accounts.
                </p>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search by name, ID, branch..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '36px', width: '240px' }}
                  />
                </div>

                <select
                  value={participantStatusFilter}
                  onChange={(e) => setParticipantStatusFilter(e.target.value)}
                  className="input-field"
                  style={{ width: '150px' }}
                >
                  <option value="all">All ({participants.length})</option>
                  <option value="checkedIn">Checked In</option>
                  <option value="notCheckedIn">Not Checked In</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>

            {/* Participants Table */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Participant ID</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Name & Email</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Branch / Year</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Check-In</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Score</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Solved</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map(p => {
                    const isDisabled = p.status === 'disabled';
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', background: isDisabled ? '#fef2f2' : '#ffffff' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-navy)' }}>
                          {p.participantId}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.email}</div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                          {p.branch} • {p.year}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: p.checkedIn ? '#dcfce7' : '#f1f5f9',
                            color: p.checkedIn ? '#166534' : 'var(--text-muted)'
                          }}>
                            {p.checkedIn ? 'Checked In' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: 'var(--color-orange)', fontFamily: 'monospace' }}>
                          {p.score || 0} pts
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                          {p.solvedCount || 0}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: isDisabled ? '#fee2e2' : '#e0f2fe',
                            color: isDisabled ? '#991b1b' : '#0369a1'
                          }}>
                            {isDisabled ? 'Disabled' : 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button
                              onClick={() => handleResetPassword(p)}
                              title="Generate temporary password"
                              className="btn btn-outline btn-sm"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                            >
                              <KeyRound size={14} /> Reset Pass
                            </button>

                            <button
                              onClick={() => handleToggleAccountStatus(p)}
                              title={isDisabled ? 'Enable account' : 'Disable account'}
                              className="btn btn-sm"
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.78rem',
                                background: isDisabled ? '#059669' : '#fef2f2',
                                color: isDisabled ? '#ffffff' : '#b91c1c',
                                border: isDisabled ? 'none' : '1px solid #fecaca'
                              }}
                            >
                              {isDisabled ? <UserCheck2 size={14} /> : <UserX size={14} />}
                              {isDisabled ? 'Enable' : 'Disable'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. SUBMISSIONS FEED & ANTI-CHEAT                           */}
      {/* ========================================================= */}
      {activeTab === 'submissions' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
          {/* Submissions Feed */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '1rem' }}>
              Live Submissions Feed ({submissions.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto' }}>
              {submissions.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No submissions recorded yet.</div>
              ) : (
                submissions.map(sub => (
                  <div
                    key={sub.id}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ffffff'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-navy)' }}>
                          {sub.participantId}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          • {sub.language?.toUpperCase() || 'LANG'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        Question: {sub.questionId}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        background: sub.status === 'Accepted' ? '#dcfce7' : '#fee2e2',
                        color: sub.status === 'Accepted' ? '#166534' : '#991b1b'
                      }}>
                        {sub.status}
                      </span>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        +{sub.score || 0} pts
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Anti-Cheat Activity Logs */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} color="#f97316" /> Anti-Cheat & Browser Integrity Logs
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto' }}>
              {antiCheatLogs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No anti-cheat infractions detected. Clean competition!</div>
              ) : (
                antiCheatLogs.map(log => (
                  <div
                    key={log.id}
                    style={{
                      border: '1px solid #fed7aa',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      background: '#fffaf5'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 800, color: '#9a3412', fontSize: '0.88rem' }}>
                        {log.participantName} ({log.participantId})
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px', background: '#fee2e2', color: '#991b1b' }}>
                        {log.eventType}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {log.details}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. ANNOUNCEMENTS (Section 22)                             */}
      {/* ========================================================= */}
      {activeTab === 'announcements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>
              Real-Time Arena Broadcast Engine
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Broadcast messages to all participants in real time via WebSockets without requiring a page refresh.
            </p>

            <form onSubmit={handleSendAnnouncement} style={{ marginBottom: '2rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.4rem' }}>
                  Broadcast Message:
                </label>
                <textarea
                  rows="3"
                  value={announcementMsg}
                  onChange={(e) => setAnnouncementMsg(e.target.value)}
                  placeholder="Enter message to broadcast to all participants..."
                  className="input-field"
                  style={{ width: '100%', resize: 'vertical' }}
                  required
                />
              </div>

              {/* Quick Presets */}
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                  Quick Presets:
                </span>
                {[
                  "Round 1 begins in 5 minutes.",
                  "Round 1 is now live.",
                  "10 minutes remaining.",
                  "Round 1 has ended.",
                  "Round 2 is now live.",
                  "Round 3 Code Challenge is now live."
                ].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAnnouncementMsg(preset)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', marginRight: '0.4rem', marginBottom: '0.4rem' }}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-navy)' }}>Priority:</label>
                  <select
                    value={announcementPriority}
                    onChange={(e) => setAnnouncementPriority(e.target.value)}
                    className="input-field"
                    style={{ width: '140px', padding: '0.4rem 0.75rem' }}
                  >
                    <option value="normal">Normal (Info)</option>
                    <option value="important">Important (Warning)</option>
                    <option value="urgent">Urgent (Alarm)</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary">
                  <Send size={16} /> BROADCAST TO ARENA
                </button>
              </div>
            </form>

            {/* List of Recent Broadcasts */}
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.75rem' }}>
                Recent Announcements
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(eventData?.announcements || []).slice(0, 8).map(a => (
                  <div
                    key={a.id}
                    style={{
                      padding: '0.85rem 1.25rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: '#f8fafc',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                        {a.message}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        By {a.createdBy || 'Admin'} • {new Date(a.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: a.priority === 'urgent' ? '#fee2e2' : '#e0f2fe',
                      color: a.priority === 'urgent' ? '#991b1b' : '#0369a1',
                      textTransform: 'uppercase'
                    }}>
                      {a.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. QUESTION BANK                                          */}
      {/* ========================================================= */}
      {activeTab === 'questions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>
              Master Problem Repository
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Questions for BugBuster (Round 1), Trace & Race (Round 2), and Code Challenge (Round 3). Correct answers and hidden test cases are obscured from participants until official results release.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {questions.map(q => (
                <div
                  key={q.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    background: '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#f1f5f9', color: 'var(--color-navy)' }}>
                        Round {q.roundId}
                      </span>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-navy)' }}>
                        {q.title}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-orange)' }}>
                      {q.points} PTS
                    </span>
                  </div>

                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem' }}>
                    {q.description}
                  </p>

                  {q.type === 'mcq' && q.options && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.82rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                      {q.options.map(opt => (
                        <div key={opt.id} style={{ fontWeight: opt.id === q.correctAnswer ? 800 : 500, color: opt.id === q.correctAnswer ? '#059669' : 'var(--text-secondary)' }}>
                          <strong>{opt.id}:</strong> {opt.text} {opt.id === q.correctAnswer && '✓ (Correct)'}
                        </div>
                      ))}
                    </div>
                  )}

                  {q.testCases && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      {q.testCases.length} Test cases configured ({q.testCases.filter(t => t.isHidden).length} hidden)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CURRENT ROUND MONITOR (Coordinator)                       */}
      {/* ========================================================= */}
      {activeTab === 'currentRound' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-orange)' }}>
              LIVE MONITORING
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-navy)', margin: '0.25rem 0 1rem' }}>
              Active Stage: {timerState.roundName || 'No Round Live'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>STATUS</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: timerState.status === 'live' ? '#059669' : '#64748b', marginTop: '0.25rem', textTransform: 'uppercase' }}>
                  {timerState.status || 'Standby'} {timerState.isPaused ? '(PAUSED)' : ''}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>REMAINING TIME</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'monospace', color: 'var(--color-navy)', marginTop: '0.25rem' }}>
                  {formatTimer(timerState.remainingSeconds)}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>CHECKED-IN ATTENDEES</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0284c7', marginTop: '0.25rem' }}>
                  {checkedInCount} / {totalCount}
                </div>
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              Faculty Coordinators have real-time surveillance of round progress. To manage start/pause/end times or update questions, contact the Admin desk.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* RESULTS TAB                                               */}
      {/* ========================================================= */}
      {activeTab === 'results' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-navy)', margin: 0 }}>
                  Competition Results & Winners
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                  Official rankings, podium standings, and participant certificate distribution status.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={onNavigateToWinners} className="btn btn-secondary btn-sm">
                  <Trophy size={14} /> Full Winners Podium Screen (/winners)
                </button>
              </div>
            </div>

            {/* Standings Summary Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="codestorm-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '70px', textAlign: 'center' }}>Rank</th>
                    <th>Participant</th>
                    <th>Participant ID</th>
                    <th>Branch</th>
                    <th style={{ textAlign: 'center' }}>Problems</th>
                    <th style={{ textAlign: 'right' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {[...participants].sort((a, b) => b.score - a.score).map((p, idx) => (
                    <tr key={p.id}>
                      <td style={{ textAlign: 'center', fontWeight: 800 }}>
                        {idx === 0 ? '🥇 1' : (idx === 1 ? '🥈 2' : (idx === 2 ? '🥉 3' : `#${idx + 1}`))}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--color-navy)' }}>{p.name}</td>
                      <td style={{ fontFamily: 'monospace', color: '#0284c7' }}>{p.participantId}</td>
                      <td>{p.branch} ({p.year})</td>
                      <td style={{ textAlign: 'center' }}>{p.solvedCount}</td>
                      <td style={{ textAlign: 'right', fontWeight: 900, color: 'var(--color-navy)' }}>{p.score}</td>
                    </tr>
                  ))}
                  {participants.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No participant results available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SETTINGS TAB (Admin Only)                                 */}
      {/* ========================================================= */}
      {activeTab === 'settings' && isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
              Platform Settings & Anti-Cheat Audit
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              System configurations, anti-cheat surveillance logs, and administrative controls.
            </p>

            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.75rem' }}>
              Anti-Cheat Surveillance Logs ({antiCheatLogs.length})
            </h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.5rem', background: '#f8fafc' }}>
              {antiCheatLogs.map(log => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderBottom: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--color-navy)' }}>{log.participantName}</span> ({log.participantId}): {log.details}
                  </div>
                  <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', background: log.severity === 'high' ? '#fee2e2' : '#fef3c7', color: log.severity === 'high' ? '#dc2626' : '#d97706' }}>
                    {log.severity}
                  </span>
                </div>
              ))}
              {antiCheatLogs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                  No anti-cheat infractions recorded.
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#dc2626', marginBottom: '0.35rem' }}>
                Danger Zone
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Reset all platform data back to initial seed state. All live competition submissions will be cleared.
              </p>
              <button
                onClick={() => {
                  setConfirmDialog({
                    title: 'Reset Database to Seed State?',
                    message: 'Are you sure you want to reset the competition database? All current participant submissions and progress will be wiped.',
                    onConfirm: () => {
                      authFetch('/api/admin/reset-database', { method: 'POST' })
                        .then(() => {
                          setConfirmDialog(null);
                          loadAll();
                        })
                        .catch(err => alert(err.message));
                    }
                  });
                }}
                className="btn btn-outline"
                style={{ borderColor: '#dc2626', color: '#dc2626' }}
              >
                Reset Database to Seed State
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.5rem' }}>
              {confirmDialog.title}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline">
                Cancel
              </button>
              <button onClick={confirmDialog.onConfirm} className="btn btn-primary">
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temporary Password Display Modal */}
      {tempPasswordModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '2rem', borderRadius: '16px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <KeyRound size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>
              Temporary Password Generated
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Provide these credentials to <strong>{tempPasswordModal.name}</strong> ({tempPasswordModal.participantId}):
            </p>

            <div style={{ background: '#f8fafc', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Temporary Password:</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'monospace', color: 'var(--color-orange)', letterSpacing: '0.08em', marginTop: '0.2rem' }}>
                {tempPasswordModal.tempPassword}
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              The participant will be forced to change this password immediately upon their next login.
            </p>

            <button
              onClick={() => setTempPasswordModal(null)}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Done / Copied
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
