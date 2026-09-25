import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  GraduationCap, 
  UserCheck, 
  Terminal, 
  Trophy, 
  AlertTriangle, 
  Send, 
  Clock, 
  Search, 
  CheckCircle2 
} from 'lucide-react';

export default function CoordinatorDashboard() {
  const { authFetch, user } = useAuth();
  const { timerState } = useSocket();

  const [activeTab, setActiveTab] = useState('checkin'); // 'checkin' | 'monitor' | 'anticheat' | 'announcements'
  const [participants, setParticipants] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [antiCheatLogs, setAntiCheatLogs] = useState([]);
  const [checkInSearch, setCheckInSearch] = useState('');
  const [checkInMsg, setCheckInMsg] = useState(null);
  const [announcementMsg, setAnnouncementMsg] = useState('');

  const loadData = () => {
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
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckIn = (pId) => {
    authFetch(`/api/checkin/${pId}`, { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setCheckInMsg({ type: 'error', text: d.error });
        } else {
          setCheckInMsg({ type: 'success', text: `Verified & Checked in ${d.participant.name}!` });
          loadData();
        }
        setTimeout(() => setCheckInMsg(null), 3500);
      });
  };

  const handleSendAnnouncement = (e) => {
    e.preventDefault();
    if (!announcementMsg.trim()) return;

    authFetch('/api/announcements', {
      method: 'POST',
      body: JSON.stringify({ message: announcementMsg, priority: 'normal' })
    }).then(() => {
      setAnnouncementMsg('');
      loadData();
    });
  };

  const checkedInCount = participants.filter(p => p.checkedIn).length;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <GraduationCap size={24} color="var(--accent-cyan)" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Faculty Coordinator Control Desk</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Supervise event progression, check-in attendees, monitor live code submissions, and inspect anti-cheat reports.
          </p>
        </div>

        {/* Live Timer Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-card)', padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-bright)' }}>
          <Clock size={18} color="var(--accent-cyan)" />
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700 }}>ACTIVE ROUND</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
              {timerState.roundName} {timerState.status === 'live' ? `(00:${String(timerState.remainingSeconds).padStart(2, '0')})` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('checkin')}
          className={`btn ${activeTab === 'checkin' ? 'btn-purple' : 'btn-outline'}`}
        >
          <UserCheck size={16} /> Check-In Desk ({checkedInCount}/{participants.length})
        </button>

        <button
          onClick={() => setActiveTab('monitor')}
          className={`btn ${activeTab === 'monitor' ? 'btn-purple' : 'btn-outline'}`}
        >
          <Terminal size={16} /> Submissions Feed ({submissions.length})
        </button>

        <button
          onClick={() => setActiveTab('anticheat')}
          className={`btn ${activeTab === 'anticheat' ? 'btn-purple' : 'btn-outline'}`}
        >
          <AlertTriangle size={16} /> Suspicious Logs ({antiCheatLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`btn ${activeTab === 'announcements' ? 'btn-purple' : 'btn-outline'}`}
        >
          <Send size={16} /> Send Broadcast
        </button>
      </div>

      {/* Check In Desk View */}
      {activeTab === 'checkin' && (
        <div>
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
              placeholder="Search participant by ID (e.g. CS26-1042), Roll No, or Name..."
              className="cyber-input"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <div className="cyber-card">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>Participant ID</th>
                  <th>Name</th>
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
                    p.name.toLowerCase().includes(checkInSearch.toLowerCase())
                  )
                  .map(p => (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {p.participantId}
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.branch} • {p.year}</td>
                      <td>Sec {p.section}</td>
                      <td>
                        {p.checkedIn ? (
                          <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>Verified</span>
                        ) : (
                          <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>Pending</span>
                        )}
                      </td>
                      <td>
                        {p.checkedIn ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            Verified at {new Date(p.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <button onClick={() => handleCheckIn(p.id)} className="btn btn-sm btn-cyan">
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

      {/* Submissions Feed */}
      {activeTab === 'monitor' && (
        <div className="cyber-card">
          <table className="cyber-table">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Round</th>
                <th>Problem</th>
                <th>Language</th>
                <th>Result</th>
                <th>Score</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.participantName}</td>
                  <td><span className="badge badge-locked">Round {s.roundId}</span></td>
                  <td>{s.questionTitle}</td>
                  <td><code>{s.language}</code></td>
                  <td style={{ color: s.status === 'Accepted' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700 }}>
                    {s.status}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>+{s.score}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{new Date(s.submittedAt).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Suspicious Logs */}
      {activeTab === 'anticheat' && (
        <div className="cyber-card">
          <table className="cyber-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Participant</th>
                <th>Event Type</th>
                <th>Severity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {antiCheatLogs.map(l => (
                <tr key={l.id}>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{new Date(l.timestamp).toLocaleTimeString()}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{l.participantName}</td>
                  <td><code>{l.eventType}</code></td>
                  <td>
                    <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)' }}>
                      {l.severity}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Send Broadcast */}
      {activeTab === 'announcements' && (
        <div className="cyber-card" style={{ maxWidth: '600px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Broadcast Coordinator Notice</h3>
          <form onSubmit={handleSendAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <textarea
              rows={3}
              required
              value={announcementMsg}
              onChange={(e) => setAnnouncementMsg(e.target.value)}
              placeholder="e.g. Please note: 5 minutes remaining for submission..."
              className="cyber-input"
            />
            <button type="submit" className="btn btn-purple">
              <Send size={16} /> Broadcast Message
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
