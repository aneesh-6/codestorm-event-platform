import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Award, Printer, ShieldCheck, Download, CheckCircle2 } from 'lucide-react';

export default function CertificatePage() {
  const { participant, user } = useAuth();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pId = participant?.registrationId || participant?.participantId || user?.registrationId || user?.participantId;
    if (!pId) {
      setLoading(false);
      return;
    }
    fetch(`/api/certificates/${pId}`)
      .then(r => r.json())
      .then(d => {
        setCert(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [participant, user]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        Generating verified CodeStorm 2026 credentials...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>
            Official Certificate of Achievement
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.2rem 0 0' }}>
            Digitally certified credentials issued by the CodeStorm 2026 organizing committee.
          </p>
        </div>

        <button onClick={handlePrint} className="btn btn-primary">
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>

      {/* Printable Certificate Canvas */}
      <div
        id="certificate-frame"
        style={{
          background: '#ffffff',
          border: '8px double #1a2d5a',
          borderRadius: '16px',
          padding: '3.5rem 3rem',
          position: 'relative',
          boxShadow: 'var(--shadow-lg)',
          textAlign: 'center',
          overflow: 'hidden'
        }}
      >
        {/* Subtle decorative inner corner borders */}
        <div style={{ position: 'absolute', top: '15px', left: '15px', width: '25px', height: '25px', borderTop: '2px solid #f97316', borderLeft: '2px solid #f97316' }} />
        <div style={{ position: 'absolute', top: '15px', right: '15px', width: '25px', height: '25px', borderTop: '2px solid #f97316', borderRight: '2px solid #f97316' }} />
        <div style={{ position: 'absolute', bottom: '15px', left: '15px', width: '25px', height: '25px', borderBottom: '2px solid #f97316', borderLeft: '2px solid #f97316' }} />
        <div style={{ position: 'absolute', bottom: '15px', right: '15px', width: '25px', height: '25px', borderBottom: '2px solid #f97316', borderRight: '2px solid #f97316' }} />

        {/* Institution Branding */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-navy)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            MALLA REDDY ENGINEERING COLLEGE AND MANAGEMENT SCIENCES
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', letterSpacing: '0.02em', marginTop: '0.2rem' }}>
            An UGC Autonomous Institution • Department of CSE – Data Science
          </div>
        </div>

        {/* Medal Logo */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          boxShadow: '0 4px 16px rgba(249, 115, 22, 0.35)',
          marginBottom: '1.25rem'
        }}>
          <Award size={36} color="#ffffff" />
        </div>

        {/* Certificate Title */}
        <h2 style={{
          fontSize: '2.25rem',
          fontWeight: 900,
          color: 'var(--color-navy)',
          letterSpacing: '-0.01em',
          margin: '0 0 0.5rem'
        }}>
          CERTIFICATE OF MERIT
        </h2>

        <div style={{ fontSize: '0.85rem', color: '#f97316', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
          CODESTORM 2026 COMPETITIVE PROGRAMMING SYMPOSIUM
        </div>

        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '650px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
          This is proudly presented to
        </p>

        {/* Recipient Name */}
        <div style={{
          fontSize: '2.25rem',
          fontWeight: 900,
          color: 'var(--color-navy)',
          borderBottom: '2px solid #f97316',
          display: 'inline-block',
          paddingBottom: '0.25rem',
          marginBottom: '1.25rem'
        }}>
          {cert?.name || participant?.name || 'Aneesh V.'}
        </div>

        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
          of <strong>{cert?.branch || participant?.branch || 'CSE - Data Science'}</strong> for outstanding performance in the CodeStorm 2026 tri-tier coding competition, successfully conquering <strong>BugBuster</strong>, <strong>Trace & Race</strong>, and <strong>Code Challenge</strong> with a score of <strong>{cert?.score ?? participant?.score ?? 120} points</strong>.
        </p>

        {/* Credential Details Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2.5rem',
          padding: '1rem 0',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
          maxWidth: '650px',
          margin: '0 auto 2.5rem',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)'
        }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Registration ID</div>
            <strong style={{ color: 'var(--color-navy)', fontFamily: 'monospace' }}>{cert?.registrationId || cert?.participantId || participant?.registrationId || participant?.participantId || user?.registrationId || 'N/A'}</strong>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Rank Achieved</div>
            <strong style={{ color: 'var(--color-orange)' }}>#{cert?.rank || 1} of All Participants</strong>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Date Issued</div>
            <strong>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>
          </div>
        </div>

        {/* Signatures & Seal */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', alignItems: 'center', maxWidth: '750px', margin: '0 auto' }}>
          <div>
            <div style={{ height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'cursive', fontSize: '1.2rem', color: '#1a2d5a' }}>Head of Department</span>
            </div>
            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              Faculty Lead & HOD, CSE-DS
            </div>
          </div>

          {/* Institutional Stamp Seal */}
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              border: '2px solid #0d9488',
              borderRadius: '9999px',
              padding: '0.35rem 0.85rem',
              color: '#0d9488',
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase'
            }}>
              <CheckCircle2 size={14} /> Official Verified
            </div>
          </div>

          <div>
            <div style={{ height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'cursive', fontSize: '1.2rem', color: '#1a2d5a' }}>Faculty Convener</span>
            </div>
            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              Faculty Coordinator, CodeStorm
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
