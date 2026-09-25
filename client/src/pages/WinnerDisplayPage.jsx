import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Award, Zap, Flame, Crown, ArrowLeft } from 'lucide-react';

export default function WinnerDisplayPage({ onBackToDashboard }) {
  const [data, setData] = useState({ podium: [], allRankings: [] });

  useEffect(() => {
    fetch('/api/results/winners')
      .then(r => r.json())
      .then(d => {
        setData(d);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      })
      .catch(() => {});
  }, []);

  const first = data.podium[0];
  const second = data.podium[1];
  const third = data.podium[2];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.5rem', width: '100%' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        {onBackToDashboard && (
          <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
            <button onClick={onBackToDashboard} className="btn btn-outline btn-sm">
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
          </div>
        )}

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#fff7ed',
          color: '#c2410c',
          padding: '0.35rem 1rem',
          borderRadius: '9999px',
          fontWeight: 800,
          fontSize: '0.82rem',
          marginBottom: '0.75rem',
          border: '1px solid #fed7aa'
        }}>
          <Crown size={16} /> OFFICIAL WINNERS PODIUM
        </div>

        <h1 style={{
          fontSize: '2.75rem',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          color: 'var(--color-navy)',
          marginBottom: '0.5rem'
        }}>
          CODESTORM 2026 FINAL RESULTS
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Malla Reddy Engineering College & Management Sciences • Department of CSE - Data Science
        </p>
      </div>

      {/* Podium Stage Display */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1.25rem',
        alignItems: 'flex-end',
        maxWidth: '900px',
        margin: '0 auto 3.5rem'
      }}>
        {/* 2nd Place Silver (Left) */}
        {second && (
          <div className="card" style={{
            textAlign: 'center',
            padding: '2rem 1.25rem',
            border: '2px solid #94a3b8',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-md)',
            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
            transform: 'translateY(15px)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🥈</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              SECOND PLACE
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-navy)', margin: '0.4rem 0 0.2rem' }}>
              {second.name}
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              {second.participantId} • {second.branch}
            </div>
            <div style={{
              display: 'inline-block',
              padding: '0.4rem 1rem',
              background: '#f1f5f9',
              borderRadius: '8px',
              fontWeight: 900,
              fontSize: '1.25rem',
              color: '#334155',
              fontFamily: 'monospace'
            }}>
              {second.score} PTS
            </div>
          </div>
        )}

        {/* 1st Place Gold (Center - Elevated) */}
        {first && (
          <div className="card" style={{
            textAlign: 'center',
            padding: '2.5rem 1.5rem',
            border: '3px solid #f59e0b',
            borderRadius: '20px',
            boxShadow: '0 20px 40px rgba(245, 158, 11, 0.18)',
            background: 'linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)'
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.25rem' }}>👑</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              GRAND CHAMPION
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-navy)', margin: '0.5rem 0 0.25rem' }}>
              {first.name}
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontWeight: 600 }}>
              {first.participantId} • {first.branch}
            </div>
            <div style={{
              display: 'inline-block',
              padding: '0.5rem 1.5rem',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: '9999px',
              fontWeight: 900,
              fontSize: '1.5rem',
              color: '#92400e',
              fontFamily: 'monospace'
            }}>
              {first.score} PTS
            </div>
          </div>
        )}

        {/* 3rd Place Bronze (Right) */}
        {third && (
          <div className="card" style={{
            textAlign: 'center',
            padding: '2rem 1.25rem',
            border: '2px solid #d97706',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-md)',
            background: 'linear-gradient(180deg, #fffaf5 0%, #ffffff 100%)',
            transform: 'translateY(25px)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🥉</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>
              THIRD PLACE
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-navy)', margin: '0.4rem 0 0.2rem' }}>
              {third.name}
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              {third.participantId} • {third.branch}
            </div>
            <div style={{
              display: 'inline-block',
              padding: '0.4rem 1rem',
              background: '#ffedd5',
              borderRadius: '8px',
              fontWeight: 900,
              fontSize: '1.25rem',
              color: '#9a3412',
              fontFamily: 'monospace'
            }}>
              {third.score} PTS
            </div>
          </div>
        )}
      </div>

      {/* Full Official Final Rankings Table */}
      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '1.25rem' }}>
          Complete Verified Competition Standings
        </h3>
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Rank</th>
                <th style={{ padding: '0.75rem 1rem' }}>Participant ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Branch</th>
                <th style={{ padding: '0.75rem 1rem' }}>Score</th>
                <th style={{ padding: '0.75rem 1rem' }}>Problems Solved</th>
              </tr>
            </thead>
            <tbody>
              {(data.allRankings || []).map((p, idx) => (
                <tr key={p.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: idx < 3 ? 'var(--color-orange)' : 'var(--text-primary)' }}>
                    #{idx + 1}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 800, fontFamily: 'monospace' }}>
                    {p.participantId}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                    {p.name}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                    {p.branch}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 900, color: 'var(--color-navy)', fontFamily: 'monospace' }}>
                    {p.score} pts
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                    {p.solvedCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
