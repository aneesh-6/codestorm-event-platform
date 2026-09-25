import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Trophy, Lock, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function LeaderboardPage() {
  const { authFetch, participant } = useAuth();
  const { socket } = useSocket();

  const [leaderboardData, setLeaderboardData] = useState({
    visible: false,
    frozen: false,
    published: false,
    message: '',
    myPerformance: null,
    leaderboard: []
  });
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = () => {
    authFetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => {
        setLeaderboardData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeaderboard();

    if (socket) {
      socket.on('leaderboard_update', () => fetchLeaderboard());
      socket.on('leaderboard_mode_change', () => fetchLeaderboard());
      socket.on('leaderboard_frozen_toggle', () => fetchLeaderboard());
      socket.on('results_published', () => fetchLeaderboard());
    }
  }, [socket]);

  const getRankBadge = (rank) => {
    if (rank === 1) return <span style={{ fontSize: '1.25rem' }}>🥇</span>;
    if (rank === 2) return <span style={{ fontSize: '1.25rem' }}>🥈</span>;
    if (rank === 3) return <span style={{ fontSize: '1.25rem' }}>🥉</span>;
    return <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>#{rank}</span>;
  };

  return (
    <div className="container" style={{ padding: '36px 20px', width: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '28px',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--border)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Trophy size={24} color="var(--primary)" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
              Competition Standings
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            Rankings and performance metrics for CodeStorm 2026.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {leaderboardData.frozen && (
            <span className="badge badge-upcoming">
              <Lock size={12} /> FROZEN
            </span>
          )}

          {leaderboardData.published && (
            <span className="badge badge-live">
              OFFICIAL FINAL RESULTS
            </span>
          )}

          <button onClick={fetchLeaderboard} className="btn btn-sm btn-outline">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Leaderboard Hidden by Default: Shows ONLY Participant's Own Performance */}
      {!leaderboardData.visible ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px', margin: '0 auto' }}>
          {/* My Performance Card */}
          <div className="card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>
              MY PERFORMANCE
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>
              Your individual live statistics during the active round.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ background: 'var(--bg-soft)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>MY SCORE</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  {leaderboardData.myPerformance?.score ?? participant?.score ?? 0}
                </div>
              </div>

              <div style={{ background: 'var(--bg-soft)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>PROBLEMS SOLVED</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--teal)', fontFamily: 'var(--font-mono)' }}>
                  {leaderboardData.myPerformance?.solvedCount ?? participant?.solvedCount ?? 0}
                </div>
              </div>

              <div style={{ background: 'var(--bg-soft)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>SUBMISSIONS</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
                  {leaderboardData.myPerformance?.submissionsCount ?? 0}
                </div>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-soft)',
              borderRadius: 'var(--radius-md)',
              border: '1.5px dashed var(--border)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Lock size={20} color="var(--text-muted)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                  Overall Leaderboard: 🔒 Hidden by organizers
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  The overall rankings and scores of other competitors will be published by event management upon completion of the rounds.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Leaderboard Revealed / Live / Final */
        <div className="card" style={{ padding: '16px', overflowX: 'auto' }}>
          <table className="codestorm-table">
            <thead>
              <tr>
                <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                <th>Participant</th>
                <th>Participant ID</th>
                <th>Branch & Year</th>
                <th style={{ textAlign: 'center' }}>Problems Solved</th>
                <th style={{ textAlign: 'right' }}>Total Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.leaderboard.map((entry) => {
                const isMe = participant?.participantId === entry.participantId;
                return (
                  <tr
                    key={entry.id}
                    style={{
                      background: isMe ? 'rgba(26, 45, 90, 0.05)' : 'transparent',
                      borderLeft: isMe ? '4px solid var(--primary)' : 'none'
                    }}
                  >
                    <td style={{ textAlign: 'center' }}>{getRankBadge(entry.rank)}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: isMe ? 'var(--primary)' : 'var(--text)' }}>
                        {entry.name} {isMe && '(You)'}
                      </div>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.8125rem', color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
                        {entry.participantId}
                      </code>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {entry.branch} • {entry.year}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--teal)' }}>
                      {entry.solvedCount}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '1.15rem',
                        fontWeight: 900,
                        color: 'var(--primary)',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {entry.score}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
