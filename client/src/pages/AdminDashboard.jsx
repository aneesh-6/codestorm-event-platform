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
  HelpCircle, 
  Terminal, 
  Trophy, 
  AlertTriangle, 
  Send, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  BarChart3, 
  CheckCircle2, 
  Radio,
  FileCheck2,
  Tv
} from 'lucide-react';

export default function AdminDashboard({ onNavigateToLive, onNavigateToWinners }) {
  const { authFetch, user } = useAuth();
  const { timerState } = useSocket();

  const [activeTab, setActiveTab] = useState('control'); // 'control' | 'stats' | 'questions' | 'checkin' | 'participants' | 'submissions' | 'anticheat' | 'announcements'
  const [eventData, setEventData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [antiCheatLogs, setAntiCheatLogs] = useState([]);
  const [selectedRoundForControl, setSelectedRoundForControl] = useState(1);
  const [durationInput, setDurationInput] = useState(30);
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, onConfirm }
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState('normal');

  // Check-In State
  const [checkInSearch, setCheckInSearch] = useState('');
  const [checkInMsg, setCheckInMsg] = useState(null);

  // Question Modal State
  const [editingQuestion, setEditingQuestion] = useState(null);

  const loadAll = () => {
    fetch('/api/event/status')
      .then(r => r.json())
      .then(d => setEventData(d))
      .catch(() => {});

    authFetch('/api/participants')
      .then(r => r.json())
      .then(p => setParticipants(p))
      .catch(() => {});

    authFetch('/api/submissions/all')
      .then(r => r.json())
      .then(s => setSubmissions(s))
      .catch(() => {});

    authFetch('/api/anticheat/logs')
      .then(r => r.json())
      .then(l => setAntiCheatLogs(l))
      .catch(() => {});

    authFetch('/api/questions/round/1')
      .then(r => r.json())
      .then(q1 => {
        authFetch('/api/questions/round/2').then(r => r.json()).then(q2 => {
          authFetch('/api/questions/round/3').then(r => r.json()).then(q3 => {
            setQuestions([...q1, ...q2, ...q3]);
          });
        });
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 6000);
    return () => clearInterval(interval);
  }, []);

  // Format seconds MM:SS
  const formatTimer = (sec) => {
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
      title: `End Round ${roundId}?`,
      message: 'Are you sure you want to end this round? All participant submission forms will be immediately locked.',
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
      title: 'Advance to Next Round?',
      message: 'This will transition the active competition round to the subsequent stage.',
      onConfirm: () => {
        authFetch('/api/event/round/next', { method: 'POST' })
          .then(() => {
            setConfirmDialog(null);
            loadAll();
          });
      }
    });
  };

  // --- LEADERBOARD & RESULTS CONTROLS ---
  const handleToggleFreeze = () => {
    authFetch('/api/results/freeze', { method: 'POST' })
      .then(() => loadAll());
  };

  const handlePublishResults = () => {
    setConfirmDialog({
      title: 'Publish Final CodeStorm 2026 Results?',
      message: 'This will reveal final scores, rankings, and award certificates to all participants.',
      onConfirm: () => {
        authFetch('/api/results/publish', { method: 'POST' })
          .then(() => {
            setConfirmDialog(null);
            loadAll();
            onNavigateToWinners();
          });
      }
    });
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
  const acceptedSubs = submissions.filter(s => s.status === 'Accepted').length;
  const sortedParticipants = [...participants].sort((a, b) => b.score - a.score);
  const topLeader = sortedParticipants[0];

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 65px)' }}>
      {/* Sidebar Navigation */}
      <aside style={{
        width: '260px',
        background: '#0a0e1a',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.25rem 0.75rem'
      }}>
        <div style={{ padding: '0 0.75rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            COMMAND CONSOLE
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>
            ADMIN CONTROL
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
          <button
            onClick={() => setActiveTab('control')}
            className={`btn ${activeTab === 'control' ? 'btn-purple' : 'btn-outline'}`}
            style={{ justifyContent: 'flex-start', border: 'none' }}
          >
            <Radio size={16} /> Round Control
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`btn ${activeTab === 'stats' ? 'btn-purple' : 'btn-outline'}`}
            style={{ justifyContent: 'flex-start', border: 'none' }}
          >
            <BarChart3 size={16} /> Live Overview
          </button>

          <button
            onClick={() => setActiveTab('checkin')}
            className={`btn ${activeTab === 'checkin' ? 'btn-purple' : 'btn-outline'}`}
            style={{ justifyContent: 'flex-start', border: 'none' }}
          >
            <UserCheck size={16} /> Check-In Desk
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`btn ${activeTab === 'questions' ? 'btn-purple' : 'btn-outline'}`}
            style={{ justifyContent: 'flex-start', border: 'none' }}
          >
            <HelpCircle size={16} /> Question Bank
          </button>

          <button
            onClick={() => setActiveTab('participants')}
            className={`btn ${activeTab === 'participants' ? 'btn-purple' : 'btn-outline'}`}
            style={{ justifyContent: 'flex-start', border: 'none' }}
          >
            <Users size={16} /> Participants ({participants.length})
          </button>

          <button
            onClick={() => setActiveTab('submissions')}
            className={`btn ${activeTab === 'submissions' ? 'btn-purple' : 'btn-outline'}`}
            style={{ justifyContent: 'flex-start', border: 'none' }}
          >
            <Terminal size={16} /> Submissions ({submissions.length})
          </button>

          <button
            onClick={() => setActiveTab('anticheat')}
            className={`btn ${activeTab === 'anticheat' ? 'btn-purple' : 'btn-outline'}`}
            style={{ justifyContent: 'flex-start', border: 'none' }}
          >
            <AlertTriangle size={16} /> Suspicious Logs ({antiCheatLogs.length})
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`btn ${activeTab === 'announcements' ? 'btn-purple' : 'btn-outline'}`}
            style={{ justifyContent: 'flex-start', border: 'none' }}
          >
            <Send size={16} /> Broadcasts
          </button>
        </nav>

        {/* Quick Launch Action to Live Screen */}
        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={onNavigateToLive} className="btn btn-outline" style={{ fontSize: '0.8rem' }}>
            <Tv size={14} color="var(--accent-cyan)" /> Auditorium Screen (/live)
          </button>
          <button onClick={onNavigateToWinners} className="btn btn-outline" style={{ fontSize: '0.8rem' }}>
            <Trophy size={14} color="#f59e0b" /> Podium / Winners
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', background: 'var(--bg-deep)' }}>
        {/* TAB 1: ROUND CONTROL CENTER */}
        {activeTab === 'control' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Radio size={24} color="var(--accent-cyan)" />
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>CODESTORM CONTROL CENTER</h1>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Master event orchestration: initiate rounds, sync countdown timers, and manage participant locking in real-time.
              </p>
            </div>

            {/* Current Active Round Showcase Card */}
            <div className="cyber-card cyber-card-glow-cyan" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 800, textTransform: 'uppercase' }}>
                    CURRENT COMPETITION ROUND
                  </div>
                  <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>
                    {timerState.roundName || 'No Round Active'}
                  </h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700 }}>STATUS</div>
                    <span className={`badge ${timerState.status === 'live' ? 'badge-live' : 'badge-upcoming'}`} style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                      {timerState.isPaused ? '⏸️ PAUSED' : (timerState.status === 'live' ? '🟢 LIVE' : timerState.status.toUpperCase())}
                    </span>
                  </div>

                  <div style={{
                    padding: '0.75rem 1.5rem',
                    background: '#04070e',
                    border: '2px solid var(--accent-cyan)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center',
                    boxShadow: '0 0 20px var(--accent-cyan-glow)'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700 }}>REMAINING TIME</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', letterSpacing: '0.05em' }}>
                      {formatTimer(timerState.remainingSeconds)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Master Control Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                {timerState.status === 'live' && !timerState.isPaused && (
                  <button onClick={handlePauseRound} className="btn btn-lg btn-outline" style={{ color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.4)' }}>
                    <Pause size={18} /> PAUSE ROUND
                  </button>
                )}

                {timerState.isPaused && (
                  <button onClick={handleResumeRound} className="btn btn-lg btn-success">
                    <Play size={18} /> RESUME ROUND
                  </button>
                )}

                {timerState.status === 'live' && (
                  <button onClick={() => handleEndRound(timerState.roundId)} className="btn btn-lg btn-danger">
                    <StopCircle size={18} /> END ROUND
                  </button>
                )}

                <button onClick={handleNextRound} className="btn btn-lg btn-purple">
                  <SkipForward size={18} /> ADVANCE TO NEXT ROUND
                </button>
              </div>
            </div>

            {/* Individual Round Triggers */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>All Round Triggers & Durations</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {rounds.map(r => (
                  <div key={r.id} className="cyber-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 800 }}>ROUND 0{r.roundNumber || r.id}</span>
                        <span className={`badge ${r.status === 'live' ? 'badge-live' : (r.status === 'completed' ? 'badge-completed' : 'badge-locked')}`}>
                          {r.status}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.35rem' }}>{r.name}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>{r.subtitle}</p>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Duration:</span>
                        <input
                          type="number"
                          defaultValue={r.durationMinutes || 30}
                          onChange={(e) => setDurationInput(e.target.value)}
                          className="cyber-input"
                          style={{ width: '80px', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
                        />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>mins</span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleStartRound(r.id)}
                          className="btn btn-sm btn-cyan"
                          style={{ flex: 1 }}
                        >
                          <Play size={14} /> Start {r.name}
                        </button>
                        {r.status === 'live' && (
                          <button
                            onClick={() => handleEndRound(r.id)}
                            className="btn btn-sm btn-danger"
                          >
                            End
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard & Results Publishing Controls */}
            <div className="cyber-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Leaderboard & Results Controls</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                <button onClick={handleToggleFreeze} className="btn btn-outline">
                  {settings.leaderboardFrozen ? <Unlock size={16} /> : <Lock size={16} />}
                  <span>{settings.leaderboardFrozen ? 'Unfreeze Leaderboard' : 'Freeze Leaderboard'}</span>
                </button>

                <button onClick={handlePublishResults} className="btn btn-success">
                  <Trophy size={16} />
                  <span>Publish Final Results</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE OVERVIEW STATS & CHARTS */}
        {activeTab === 'stats' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Live Statistics Overview</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              Real-time telemetry and engagement metrics for CodeStorm 2026.
            </p>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              <div className="cyber-card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700 }}>TOTAL REGISTERED</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', marginTop: '0.25rem' }}>{participants.length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Official attendees</div>
              </div>

              <div className="cyber-card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700 }}>CHECKED-IN PARTICIPANTS</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-green)', marginTop: '0.25rem' }}>{checkedInCount} / {participants.length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>{Math.round((checkedInCount / Math.max(1, participants.length)) * 100)}% attendance</div>
              </div>

              <div className="cyber-card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700 }}>TOTAL SUBMISSIONS</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>{submissions.length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>{acceptedSubs} Accepted ({Math.round((acceptedSubs / Math.max(1, submissions.length)) * 100)}%)</div>
              </div>

              <div className="cyber-card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700 }}>CURRENT TOURNAMENT LEADER</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f59e0b', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {topLeader ? `${topLeader.name}` : 'N/A'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Score: {topLeader?.score ?? 0} pts</div>
              </div>
            </div>

            {/* Language Breakdown & Submissions Table */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
              <div className="cyber-card">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Language Distribution</h3>
                {['python', 'cpp', 'c', 'java', 'text'].map(lang => {
                  const count = submissions.filter(s => s.language === lang).length;
                  const pct = submissions.length > 0 ? Math.round((count / submissions.length) * 100) : 0;
                  return (
                    <div key={lang} style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{lang}</span>
                        <span style={{ color: 'var(--text-dim)' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-cyan)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="cyber-card">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Recent Submissions Stream</h3>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table className="cyber-table">
                    <thead>
                      <tr>
                        <th>Participant</th>
                        <th>Problem</th>
                        <th>Lang</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.slice(0, 10).map(s => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 600 }}>{s.participantName}</td>
                          <td style={{ fontSize: '0.8rem' }}>{s.questionTitle}</td>
                          <td><code>{s.language}</code></td>
                          <td style={{ color: s.status === 'Accepted' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700 }}>
                            {s.status}
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>+{s.score}</td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{new Date(s.submittedAt).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CHECK-IN DESK */}
        {activeTab === 'checkin' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Event Check-In Desk</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Search by Participant ID, Roll Number, or Name to verify and mark attendance.
                </p>
              </div>

              <div style={{ padding: '0.6rem 1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>CHECKED IN: </span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--accent-green)' }}>{checkedInCount} / {participants.length}</strong>
              </div>
            </div>

            {checkInMsg && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                background: checkInMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                border: `1px solid ${checkInMsg.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                color: checkInMsg.type === 'error' ? '#fca5a5' : '#86efac'
              }}>
                {checkInMsg.text}
              </div>
            )}

            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <Search size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={checkInSearch}
                onChange={(e) => setCheckInSearch(e.target.value)}
                placeholder="Search by ID (e.g. CS26-1042), Roll No, or Student Name..."
                className="cyber-input"
                style={{ paddingLeft: '2.5rem', fontSize: '1rem' }}
              />
            </div>

            <div className="cyber-card">
              <table className="cyber-table">
                <thead>
                  <tr>
                    <th>Participant ID</th>
                    <th>Name</th>
                    <th>Roll Number</th>
                    <th>Branch & Year</th>
                    <th>Section</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {participants
                    .filter(p => 
                      p.participantId.toLowerCase().includes(checkInSearch.toLowerCase()) ||
                      p.name.toLowerCase().includes(checkInSearch.toLowerCase()) ||
                      (p.rollNumber && p.rollNumber.toLowerCase().includes(checkInSearch.toLowerCase()))
                    )
                    .map(p => (
                      <tr key={p.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                          {p.participantId}
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{p.rollNumber}</td>
                        <td>{p.branch} • {p.year}</td>
                        <td>Sec {p.section}</td>
                        <td>
                          {p.checkedIn ? (
                            <span style={{ color: 'var(--accent-green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle2 size={16} /> Verified
                            </span>
                          ) : (
                            <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>Pending</span>
                          )}
                        </td>
                        <td>
                          {p.checkedIn ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              Checked in at {new Date(p.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleCheckIn(p.id)}
                              className="btn btn-sm btn-cyan"
                            >
                              Check In
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: QUESTION BANK */}
        {activeTab === 'questions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Competition Question Bank</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Manage questions, difficulty levels, points, and test cases across all three rounds.
                </p>
              </div>

              <button
                onClick={() => setEditingQuestion({
                  roundId: 1,
                  type: 'debugging',
                  title: '',
                  description: '',
                  points: 50,
                  difficulty: 'Medium',
                  testCases: [{ input: '', expectedOutput: '', isHidden: false }]
                })}
                className="btn btn-cyan"
              >
                <Plus size={16} /> Create New Question
              </button>
            </div>

            <div className="cyber-card">
              <table className="cyber-table">
                <thead>
                  <tr>
                    <th>Round</th>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Difficulty</th>
                    <th>Points</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map(q => (
                    <tr key={q.id}>
                      <td><span className="badge badge-locked">Round {q.roundId}</span></td>
                      <td><code style={{ fontSize: '0.8rem', color: 'var(--accent-purple)' }}>{q.type}</code></td>
                      <td style={{ fontWeight: 600 }}>{q.title}</td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--accent-amber)' }}>
                          {q.difficulty}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{q.points}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => setEditingQuestion(q)}
                            className="btn btn-sm btn-outline"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete ${q.title}?`)) {
                                authFetch(`/api/questions/${q.id}`, { method: 'DELETE' }).then(() => loadAll());
                              }
                            }}
                            className="btn btn-sm btn-outline"
                            style={{ color: 'var(--accent-red)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: PARTICIPANTS */}
        {activeTab === 'participants' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Participant Management</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              View participant scores, solved counts, status, and toggle access controls.
            </p>

            <div className="cyber-card">
              <table className="cyber-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Branch</th>
                    <th>Score</th>
                    <th>Solved</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedParticipants.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {p.participantId}
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.branch} • {p.year}</td>
                      <td style={{ fontWeight: 800, color: 'var(--accent-green)' }}>{p.score}</td>
                      <td>{p.solvedCount}</td>
                      <td>
                        <span className={`badge ${p.status === 'active' ? 'badge-live' : 'badge-locked'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            const newStatus = p.status === 'active' ? 'disabled' : 'active';
                            authFetch(`/api/participants/${p.id}/status`, {
                              method: 'PATCH',
                              body: JSON.stringify({ status: newStatus })
                            }).then(() => loadAll());
                          }}
                          className="btn btn-sm btn-outline"
                        >
                          {p.status === 'active' ? 'Disable Access' : 'Re-enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: SUSPICIOUS ACTIVITY LOGS */}
        {activeTab === 'anticheat' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <AlertTriangle size={24} color="var(--accent-red)" />
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Anti-Cheat Surveillance Logs</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Automated tab switch and window blur detection logs for faculty inspection.
            </p>

            <div className="cyber-card">
              {antiCheatLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                  No suspicious events logged yet.
                </div>
              ) : (
                <table className="cyber-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Participant</th>
                      <th>Event</th>
                      <th>Severity</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {antiCheatLogs.map(log => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                          {log.participantName} ({log.participantId})
                        </td>
                        <td><code>{log.eventType}</code></td>
                        <td>
                          <span className="badge" style={{
                            background: log.severity === 'high' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: log.severity === 'high' ? 'var(--accent-red)' : 'var(--accent-amber)'
                          }}>
                            {log.severity}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: ANNOUNCEMENT BROADCASTS */}
        {activeTab === 'announcements' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Live Announcements Broadcast</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Send real-time alerts and instructions directly to all participant terminals.
            </p>

            <div className="cyber-card" style={{ marginBottom: '2rem' }}>
              <form onSubmit={handleSendAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)' }}>ANNOUNCEMENT MESSAGE</label>
                  <textarea
                    rows={3}
                    required
                    value={announcementMsg}
                    onChange={(e) => setAnnouncementMsg(e.target.value)}
                    placeholder="e.g. Round 1 has started! You have 30 minutes to eliminate all bugs."
                    className="cyber-input"
                    style={{ marginTop: '0.35rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="prio"
                        value="normal"
                        checked={announcementPriority === 'normal'}
                        onChange={() => setAnnouncementPriority('normal')}
                      />
                      <span>Normal Notice</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--accent-red)' }}>
                      <input
                        type="radio"
                        name="prio"
                        value="urgent"
                        checked={announcementPriority === 'urgent'}
                        onChange={() => setAnnouncementPriority('urgent')}
                      />
                      <span>Urgent Alert</span>
                    </label>
                  </div>

                  <button type="submit" className="btn btn-purple">
                    <Send size={16} /> Broadcast Now
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>{confirmDialog.title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline">
                Cancel
              </button>
              <button onClick={confirmDialog.onConfirm} className="btn btn-danger">
                Confirm & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
