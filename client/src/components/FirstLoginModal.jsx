import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, ShieldCheck, Check } from 'lucide-react';

export default function FirstLoginModal({ isOpen, onClose }) {
  const { authFetch } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update password');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Error updating password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-scale-in" style={{ padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'rgba(249, 115, 22, 0.12)',
            color: 'var(--secondary)',
            marginBottom: '12px'
          }}>
            <KeyRound size={26} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            CREATE NEW PASSWORD
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '6px' }}>
            You are logging in with a temporary password. Please create your new secure password to access the CodeStorm Event Platform.
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            color: '#dc2626',
            fontSize: '0.85rem',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {success ? (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            color: '#059669',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '0.95rem'
          }}>
            <Check size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
            Password updated successfully! Redirecting to your competition arena...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your temporary password"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                className="form-control"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                {loading ? 'Updating Password...' : 'Save New Password & Continue'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
