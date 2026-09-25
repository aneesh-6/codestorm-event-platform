import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  User, 
  Clock, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  Code2, 
  Send,
  Building,
  GraduationCap,
  ShieldAlert,
  Flame,
  HelpCircle
} from 'lucide-react';

export default function ParticipantDashboard({ onSelectRound }) {
  const { user, participant, authFetch } = useAuth();
  const { timerState } = useSocket();
  const [eventData, setEventData] = useState(null);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [leaderboardInfo, setLeaderboardInfo] = useState({ visible: false, rank: null });

  const loadData = () => {
    fetch('/api/event/status')
      .then(r => r.json())
      .then(d => setEventData(d))
      .catch(() => {});

    authFetch('/api/submissions/my')
      .then(r => r.json())
      .then(subs => setMySubmissions(subs))
      .catch(() => {});

    authFetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => {
        if (d) {
          if (d.visible && d.leaderboard && participant) {
            const entry = d.leaderboard.find(x => x.participantId === participant.participantId);
            setLeaderboardInfo({ visible: true, rank: entry ? `#${entry.rank}` : '-' });
          } else {
            setLeaderboardInfo({ visible: false, rank: null });
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [participant]);

  const rounds = eventData?.rounds || [
    { id: 1, name: 'BUGBUSTER', subtitle: 'Code Debugging Arena', status: 'live', durationMinutes: 30 },
    { id: 2, name: 'TRACE & RACE', subtitle: 'Logic & Output Sprint', status: 'upcoming', durationMinutes: 25 },
    { id: 3, name: 'CODE CHALLENGE', subtitle: 'Competitive Programming', status: 'locked', durationMinutes: 45 }
  ];

  const getRoundStatusBadge = (status) => {
    switch (status) {
      case 'live':
        return <span className="badge badge-live">LIVE</span>;
      case 'upcoming':
        return <span className="badge badge-upcoming">UPCOMING</span>;
      case 'completed':
        return <span className="badge badge-completed">COMPLETED</span>;
      case 'locked':
      default:
        return <span className="badge badge-locked">LOCKED</span>;
    }
  };

  return (
    <div className="container" style={{ padding: '36px 24px', width: '100%' }}>
      {/* Top Welcome Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '32px',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--border)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
              Welcome, {participant?.name || user?.name}
            </h1>
            <span className="badge badge-primary">
              {participant?.registrationId || participant?.participantId || user?.registrationId}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            Department of CSE – Data Science • Malla Reddy Engineering College & Management Sciences
          </p>
        </div>

        {/* Current Round Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 20px',
          background: '#ffffff',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              CURRENT EVENT STATUS
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--primary)' }}>
              {timerState.roundName ? `${timerState.roundName} (Round ${timerState.roundId})` : 'Awaiting Next Round'}
            </div>
          </div>
          {timerState.status === 'live' && (
            <span className="badge badge-live">LIVE</span>
          )}
        </div>
      </div>

      {/* Grid: Participant Info & Live Standings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '36px' }}>
        {/* Participant Identity Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <User size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>Participant Dossier</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>NAME</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>{participant?.name || 'Participant'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>REGISTRATION ID</div>
              <div style={{ fontWeight: 700, color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
                {participant?.registrationId || 'N/A'}
              </div>
            </div>
            {participant?.participantId && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PARTICIPANT ID</div>
                <div style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  {participant.participantId}
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>BRANCH & YEAR</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{participant?.branch} • {participant?.year}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SECTION & ROLL</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text)' }}>Sec {participant?.section} ({participant?.rollNumber})</div>
            </div>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            <Building size={14} color="var(--primary)" />
            <span>{participant?.college || 'Malla Reddy Engineering College & Management Sciences'}</span>
          </div>
        </div>

        {/* My Performance Card (With Strict Leaderboard Privacy Enforcement) */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>My Performance</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--teal)', fontWeight: 700 }}>● SYNCED</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', textAlign: 'center' }}>
            <div style={{ background: 'var(--bg-soft)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>SCORE</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                {participant?.score ?? 0}
              </div>
            </div>

            <div style={{ background: 'var(--bg-soft)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>SOLVED</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--teal)', fontFamily: 'var(--font-mono)' }}>
                {participant?.solvedCount ?? 0}
              </div>
            </div>

            <div style={{ background: 'var(--bg-soft)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>SUBMISSIONS</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
                {mySubmissions.length}
              </div>
            </div>
          </div>

          {/* Leaderboard Privacy Notice or Rank */}
          <div style={{
            marginTop: '16px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: leaderboardInfo.visible ? 'rgba(13, 148, 136, 0.08)' : 'var(--bg-soft)',
            border: `1px solid ${leaderboardInfo.visible ? 'rgba(13, 148, 136, 0.3)' : 'var(--border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8125rem'
          }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {leaderboardInfo.visible ? <CheckCircle2 size={15} color="var(--teal)" /> : <Lock size={15} color="var(--text-muted)" />}
              <strong>Leaderboard Standing:</strong>
            </span>
            <span style={{ fontWeight: 700, color: leaderboardInfo.visible ? 'var(--teal)' : 'var(--text-muted)' }}>
              {leaderboardInfo.visible ? (leaderboardInfo.rank || '-') : '🔒 Hidden by organizers'}
            </span>
          </div>
        </div>
      </div>

      {/* Competition Rounds Selection */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>Competition Arenas</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Rounds become accessible once activated by the event management system.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {rounds.map((r) => {
            const isLive = r.status === 'live';
            const isCompleted = r.status === 'completed';
            const canEnter = isLive;

            return (
              <div 
                key={r.id} 
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: r.status === 'locked' ? 0.7 : 1,
                  borderTop: isLive ? '4px solid var(--secondary)' : '1px solid var(--border)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: 'var(--text-muted)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase'
                    }}>
                      ROUND 0{r.roundNumber || r.id}
                    </span>
                    {getRoundStatusBadge(r.status)}
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '4px' }}>
                    {r.name}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 600, marginBottom: '10px' }}>
                    {r.subtitle}
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '20px' }}>
                    {r.description}
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} color="var(--secondary)" />
                      {r.durationMinutes} Minutes
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Code2 size={14} color="var(--primary)" />
                      Automated Scoring
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectRound(r.id)}
                    disabled={!canEnter}
                    className={`btn ${isLive ? 'btn-secondary' : 'btn-outline'}`}
                    style={{ width: '100%', justifyContent: 'space-between' }}
                  >
                    <span>
                      {isLive ? 'Enter Arena Now' : (isCompleted ? 'Round Completed' : 'Awaiting Activation')}
                    </span>
                    {isLive ? <ArrowRight size={16} /> : <Lock size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Submissions Feed */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={16} color="var(--primary)" />
            My Recent Submissions
          </h3>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{mySubmissions.length} recorded</span>
        </div>

        {mySubmissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No submissions recorded yet. Solutions submitted in any round will appear here.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="codestorm-table">
              <thead>
                <tr>
                  <th>Round</th>
                  <th>Problem</th>
                  <th>Language</th>
                  <th>Result</th>
                  <th>Score</th>
                  <th>Execution</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {mySubmissions.slice(0, 5).map((s) => (
                  <tr key={s.id}>
                    <td><span className="badge badge-locked">R{s.roundId}</span></td>
                    <td style={{ fontWeight: 600 }}>{s.questionTitle || s.questionId}</td>
                    <td><code style={{ fontSize: '0.8125rem', color: 'var(--primary)' }}>{s.language}</code></td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        color: s.status === 'Accepted' ? '#059669' : '#dc2626'
                      }}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>+{s.score}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{s.executionTimeMs}ms</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{new Date(s.submittedAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
