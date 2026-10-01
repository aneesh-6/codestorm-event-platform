import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Award, 
  Printer, 
  Download, 
  ShieldCheck, 
  Clock 
} from 'lucide-react';

export default function CertificatePage() {
  const { participant, user, isAdmin, isCoordinator } = useAuth();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [participantsList, setParticipantsList] = useState([]);
  
  // Active participant ID
  const defaultPid = participant?.participantId || user?.participantId || 'CS26-5976';
  const [selectedPid, setSelectedPid] = useState(() => {
    return sessionStorage.getItem('codestorm_preview_participant') || defaultPid;
  });

  // Verification preview override for Admin/Faculty QA
  const [previewType, setPreviewType] = useState('auto'); // 'auto' | 'winner' | 'runner_up' | 'participation'

  const certFrameRef = useRef(null);

  // Fetch participant list for Admin/Coordinator QA switcher
  useEffect(() => {
    if (isAdmin || isCoordinator) {
      fetch('/api/participants')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setParticipantsList(data);
          else if (data && Array.isArray(data.participants)) setParticipantsList(data.participants);
        })
        .catch(() => {});
    }
  }, [isAdmin, isCoordinator]);

  // Load certificate data from authoritative backend
  const loadCertificate = (pid, type = 'auto') => {
    setLoading(true);
    const token = localStorage.getItem('codestorm_token') || sessionStorage.getItem('codestorm_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    let url = `/api/certificates/${pid}`;
    const effectiveType = (isAdmin || isCoordinator) ? type : 'auto';
    if (effectiveType !== 'auto') {
      url += `?previewType=${effectiveType}`;
    }

    fetch(url, { headers })
      .then(r => {
        if (!r.ok) throw new Error('Certificate not found');
        return r.json();
      })
      .then(d => {
        setCert(d);
        setLoading(false);
      })
      .catch(() => {
        setCert({
          participantName: participant?.name || 'Kumbham Varsha',
          participantId: pid,
          registrationId: participant?.registrationId || 'CODESTORM-2026-5976',
          certificateNumber: `CS26-MREM-PRT-${pid.replace(/\D/g, '')}`,
          certificateType: 'participation',
          status: 'PENDING RESULT',
          isFinalized: false,
          title: 'CERTIFICATE OF PARTICIPATION',
          badgeText: 'CODESTORM 2026 PARTICIPANT',
          achievement: 'has successfully participated in CODESTORM 2026, a 3-round coding event organized by Malla Reddy Engineering College and Management Sciences.',
          college: 'Malla Reddy Engineering College and Management Sciences',
          department: 'Department of CSE – Data Science',
          branch: 'CSE – Data Science',
          year: '3rd Year',
          rank: 'Participant',
          score: 0,
          eventName: 'CODESTORM 2026',
          symposiumName: 'COMPETITIVE PROGRAMMING SYMPOSIUM',
          eventDate: 'October 2, 2026',
          issuedDate: 'October 2, 2026'
        });
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCertificate(selectedPid, previewType);
  }, [selectedPid, previewType]);

  const handlePrint = () => {
    window.print();
  };

  const certType = cert?.certificateType || 'participation';
  const isWinner = certType === 'winner';
  const isRunnerUp = certType === 'runner_up';
  const isPending = cert?.status === 'PENDING RESULT';

  // High-Resolution 2048 x 1364 Canvas PNG Exporter (Guaranteed Exact Sample Match)
  const handleDownloadImage = async () => {
    try {
      setDownloading(true);

      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 1364;
      const ctx = canvas.getContext('2d');

      const loadImage = (src) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });
      };

      const templateSrc = isWinner
        ? '/assets/cert_template_winner_2x.png'
        : isRunnerUp
        ? '/assets/cert_template_runner_up_2x.png'
        : '/assets/cert_template_participation_2x.png';

      const tmplImg = await loadImage(templateSrc);
      if (tmplImg) {
        ctx.drawImage(tmplImg, 0, 0, 2048, 1364);
      }

      // Dynamic Participant Name
      const pName = (cert?.participantName || participant?.name || 'Kumbham Varsha').toUpperCase();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0f1e40';
      ctx.font = '800 38px "Cinzel", "Times New Roman", "Georgia", serif';
      ctx.letterSpacing = '1px';
      ctx.fillText(pName, 1024, 720);

      // Download file
      const link = document.createElement('a');
      link.download = `CodeStorm2026_Certificate_${cert?.participantId || 'CS26'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download certificate error:', err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const templateImageSrc = isWinner
    ? '/assets/cert_template_winner_2x.png'
    : isRunnerUp
    ? '/assets/cert_template_runner_up_2x.png'
    : '/assets/cert_template_participation_2x.png';

  return (
    <div id="certificate-wrapper" style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1rem', width: '100%' }}>
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, footer, .no-print {
            display: none !important;
          }
          #certificate-wrapper {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          #certificate-frame {
            box-shadow: none !important;
            margin: 0 auto !important;
            border-radius: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }
      `}</style>

      {/* TOP CONTROL & QA VERIFICATION BAR (Hidden on print) */}
      <div className="no-print" style={{
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Award size={22} color="var(--primary)" />
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>
              Official CodeStorm 2026 Certificate Portal
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.2rem 0 0' }}>
            Authorized institutional credential system of Department of CSE – Data Science, MREM.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Admin / Coordinator QA Inspection Toolbar */}
          {(isAdmin || isCoordinator) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '4px 8px'
            }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                QA Test:
              </span>

              <button
                onClick={() => setPreviewType('participation')}
                className={`btn btn-sm ${previewType === 'participation' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem', height: 'auto', border: 'none' }}
                title="Verify Participation Certificate Format"
              >
                🎓 Participation
              </button>

              <button
                onClick={() => setPreviewType('winner')}
                className={`btn btn-sm ${previewType === 'winner' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem', height: 'auto', border: 'none', color: previewType === 'winner' ? '#fff' : '#b45309' }}
                title="Verify Winner (1st) Certificate Format"
              >
                🏆 Winner (1st)
              </button>

              <button
                onClick={() => setPreviewType('runner_up')}
                className={`btn btn-sm ${previewType === 'runner_up' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem', height: 'auto', border: 'none', color: previewType === 'runner_up' ? '#fff' : '#475569' }}
                title="Verify Runner-Up (2nd) Certificate Format"
              >
                🥈 Runner-Up (2nd)
              </button>

              {previewType !== 'auto' && (
                <button
                  onClick={() => setPreviewType('auto')}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', color: '#0284c7' }}
                  title="Reset to Live Assignment"
                >
                  Reset
                </button>
              )}
            </div>
          )}

          {/* Quick Participant Switcher for Admin/Faculty */}
          {(isAdmin || isCoordinator) && participantsList.length > 0 && (
            <select
              value={selectedPid}
              onChange={(e) => setSelectedPid(e.target.value)}
              className="form-control"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem', width: '210px' }}
            >
              {participantsList.map(p => (
                <option key={p.id || p.participantId} value={p.participantId}>
                  {p.name} ({p.participantId})
                </option>
              ))}
            </select>
          )}

          {/* Download High-Resolution Certificate PNG */}
          <button
            onClick={handleDownloadImage}
            disabled={downloading || (isPending && !isAdmin && !isCoordinator)}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            title={isPending && !isAdmin && !isCoordinator ? 'Certificate download unlocks after results are finalized' : 'Download high-resolution certificate'}
          >
            <Download size={15} /> {downloading ? 'Exporting...' : (isPending && !isAdmin && !isCoordinator ? 'Download Locked (Pending Result)' : 'Download Certificate')}
          </button>

          {/* Print / Save PDF */}
          <button
            onClick={handlePrint}
            disabled={isPending && !isAdmin && !isCoordinator}
            className="btn btn-primary"
            style={{ padding: '0.5rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            title={isPending && !isAdmin && !isCoordinator ? 'Certificate printing unlocks after results are finalized' : 'Print or save certificate as PDF'}
          >
            <Printer size={15} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Safety Notice if Competition Status is Pending Result */}
      {isPending && (
        <div className="no-print" style={{
          background: '#fffbeb',
          border: '1px solid #fef3c7',
          color: '#92400e',
          borderRadius: '10px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.88rem'
        }}>
          <Clock size={20} color="#b45309" />
          <div>
            <strong>Certificate Status: PENDING RESULT.</strong> Official finalized standings and merit rankings are undergoing formal certification by the Department of CSE – Data Science. Final certificates will be fully unlocked and available for download once results are finalized by Admin/Faculty.
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXACT SAMPLE CERTIFICATE CANVAS CONTAINER                                  */}
      {/* ========================================================================= */}
      <div
        id="certificate-frame"
        ref={certFrameRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1024px',
          margin: '0 auto',
          aspectRatio: '1024 / 682',
          boxShadow: '0 12px 36px rgba(15, 30, 64, 0.16)',
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#ffffff'
        }}
      >
        {/* Exact Sample Certificate Background */}
        <img
          src={templateImageSrc}
          alt="CodeStorm 2026 Certificate"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'contain',
            userSelect: 'none'
          }}
        />

        {/* Dynamic Participant Name Positioned Exactly on the Sample's Signing Line */}
        <div
          style={{
            position: 'absolute',
            top: '52.8%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: '"Cinzel", "Times New Roman", "Georgia", serif',
            fontSize: 'clamp(0.85rem, 2.0vw, 1.35rem)',
            fontWeight: 800,
            lineHeight: 1,
            color: '#0f1e40',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            pointerEvents: 'none'
          }}
        >
          {cert?.participantName || participant?.name || 'Kumbham Varsha'}
        </div>
      </div>

      {/* Dynamic Official Credential Verification Data Card (Hidden on Print) */}
      <div
        className="no-print"
        style={{
          marginTop: '1.25rem',
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.84rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
            Certificate Number
          </span>
          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-navy)' }}>
            {cert?.certificateNumber || 'CS26-MREM-PRT-5976'}
          </span>
        </div>

        <div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
            Registration ID
          </span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-navy)' }}>
            {cert?.registrationId || 'CODESTORM-2026-5976'}
          </span>
        </div>

        <div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
            Participant ID
          </span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-navy)' }}>
            {cert?.participantId || 'CS26-5976'}
          </span>
        </div>

        <div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
            Official Score
          </span>
          <span style={{ fontWeight: 800, color: 'var(--color-navy)' }}>
            {cert?.score || 0} PTS
          </span>
        </div>

        <div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
            Official Standings
          </span>
          <span style={{ fontWeight: 800, color: isWinner ? '#d97706' : (isRunnerUp ? '#475569' : '#0d9488') }}>
            {isWinner ? '🏆 WINNER (Rank #1)' : (isRunnerUp ? '🥈 RUNNER-UP (Rank #2)' : (cert?.rank || 'PARTICIPANT'))}
          </span>
        </div>

        <div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
            Date of Issue
          </span>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
            {cert?.eventDate || 'October 2, 2026'}
          </span>
        </div>
      </div>
    </div>
  );
}
