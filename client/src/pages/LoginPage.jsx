import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(identifier, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please verify your Participant ID and Password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      background: 'var(--bg-soft)'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%'
      }}>
        {/* Header / Brand identity matching registration website */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', marginBottom: '14px' }}>
            <svg width="48" height="48" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect width="36" height="36" rx="8" fill="#1a2d5a"/>
              <path d="M10 13L6 18L10 23" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M26 13L30 18L26 23" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 10L15 26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>

          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--primary)',
            letterSpacing: '-0.02em',
            marginBottom: '6px'
          }}>
            CODESTORM <span style={{ color: 'var(--secondary)' }}>2026</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            Login to continue to the competition platform.
          </p>
          <div style={{
            marginTop: '8px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--primary)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            Department of CSE – Data Science • MREM
          </div>
        </div>

        {/* Clean Login Card */}
        <div className="card" style={{ padding: '36px', boxShadow: 'var(--shadow-lg)' }}>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              color: '#dc2626',
              fontSize: '0.875rem',
              marginBottom: '20px',
              lineHeight: 1.4
            }}>
              {error}
            </div>
          )}

          {showForgotNotice && (
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              color: '#1d4ed8',
              fontSize: '0.875rem',
              marginBottom: '20px',
              lineHeight: 1.4
            }}>
              Please use your assigned Participant ID (e.g. CS26-0001) and the temporary password provided at registration. If you require further assistance, please contact the coordinator desk.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, letterSpacing: '0.02em' }}>
                Participant ID
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  placeholder="CS26-0001"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="form-control"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ fontWeight: 700, letterSpacing: '0.02em' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotNotice(!showForgotNotice)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.8125rem',
                    color: 'var(--secondary)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                required
                placeholder="Enter temporary password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '8px', fontWeight: 800, letterSpacing: '0.05em' }}
            >
              {loading ? 'Authenticating...' : 'LOGIN'}
            </button>
          </form>
        </div>

        {/* Security / Advisory Footer Note */}
        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '0.8125rem',
          color: 'var(--text-muted)'
        }}>
          Authorized access only. Activity is monitored during competition rounds.
        </div>
      </div>
    </div>
  );
}
