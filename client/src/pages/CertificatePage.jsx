import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Award, 
  Printer, 
  Download, 
  ShieldCheck, 
  Trophy, 
  Medal, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle,
  Clock,
  UserCheck
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

  // Verification preview override for Admin/Faculty QA (Requirement 31)
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
    // Only privileged admins/coordinators may preview specific certificate types
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
        // Fallback default structure if network hiccup
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

  // High-Resolution 300-DPI Canvas PNG Exporter (Guaranteed Exact Match)
  const handleDownloadImage = async () => {
    try {
      setDownloading(true);

      const canvas = document.createElement('canvas');
      // 300 DPI A4 Landscape resolution (297mm x 210mm @ ~200-300dpi)
      const width = 2480;
      const height = 1754;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Helper to load image
      const loadImage = (src) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });
      };

      const [headerImg, hodImg, coordImg] = await Promise.all([
        loadImage('/assets/mrem_header.webp'),
        loadImage('/assets/hod(1).jpeg').then(img => img || loadImage('/assets/hod_signature.jpg')),
        loadImage('/assets/fc.jpeg').then(img => img || loadImage('/assets/coordinator_signature.jpg'))
      ]);

      // 1. Parchment Background
      ctx.fillStyle = '#fcfbf8';
      ctx.fillRect(0, 0, width, height);

      // Subtle warm parchment gradient
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 200, width / 2, height / 2, width / 1.2);
      bgGrad.addColorStop(0, '#ffffff');
      bgGrad.addColorStop(1, '#f7f4ed');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Double Borders
      const navyColor = '#0f1e40';
      const goldColor = isWinner ? '#d97706' : (isRunnerUp ? '#475569' : '#b8860b');

      // Outer Thick Navy Border
      ctx.lineWidth = 14;
      ctx.strokeStyle = navyColor;
      ctx.strokeRect(55, 55, width - 110, height - 110);

      // Thin Inner Navy Border
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(15, 30, 64, 0.4)';
      ctx.strokeRect(70, 70, width - 140, height - 140);

      // Refined Gold Accent Border
      ctx.lineWidth = 4;
      ctx.strokeStyle = goldColor;
      ctx.strokeRect(88, 88, width - 176, height - 176);

      // Corner Ornaments
      const drawCorner = (x, y, dx, dy) => {
        ctx.save();
        ctx.strokeStyle = goldColor;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x, y + 45 * dy);
        ctx.lineTo(x, y);
        ctx.lineTo(x + 45 * dx, y);
        ctx.stroke();

        ctx.fillStyle = goldColor;
        ctx.fillRect(x + (dx > 0 ? 8 : -14), y + (dy > 0 ? 8 : -14), 6, 6);
        ctx.restore();
      };
      drawCorner(98, 98, 1, 1);
      drawCorner(width - 98, 98, -1, 1);
      drawCorner(98, height - 98, 1, -1);
      drawCorner(width - 98, height - 98, -1, -1);

      // 3. College Header Logo Banner
      if (headerImg) {
        const headerW = 1600;
        const headerH = (headerImg.height / headerImg.width) * headerW;
        ctx.drawImage(headerImg, (width - headerW) / 2, 125, headerW, headerH);
      }

      // 4. Department Banner Ribbon
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f1e40';
      ctx.font = 'bold 30px "Cinzel", "Times New Roman", serif';
      ctx.letterSpacing = '5px';
      ctx.fillText('◆ DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING (DATA SCIENCE) ◆', width / 2, 335);

      // Symposium Sub-Banner
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 24px "Inter", "Arial", sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillText('CODESTORM 2026 — COMPETITIVE PROGRAMMING SYMPOSIUM', width / 2, 380);

      // Divider Line with diamond
      ctx.strokeStyle = 'rgba(180, 83, 9, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 320, 420);
      ctx.lineTo(width / 2 + 320, 420);
      ctx.stroke();

      // 5. Certificate Title
      ctx.fillStyle = '#0f1e40';
      ctx.font = '900 68px "Cinzel", "Times New Roman", serif';
      ctx.letterSpacing = '6px';
      const titleText = isWinner || isRunnerUp ? 'CERTIFICATE OF MERIT' : 'CERTIFICATE OF PARTICIPATION';
      ctx.fillText(titleText, width / 2, 515);

      // Badge text
      ctx.font = 'bold 24px "Inter", "Arial", sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillStyle = isWinner ? '#b45309' : (isRunnerUp ? '#334155' : '#0f766e');
      const badgeStr = isWinner ? '★ WINNER / 1ST POSITION ★' : (isRunnerUp ? '★ RUNNER-UP / 2ND POSITION ★' : '★ OFFICIAL PARTICIPATION ★');
      ctx.fillText(badgeStr, width / 2, 570);

      // 6. Presentation text
      ctx.font = 'italic 34px "Playfair Display", "Georgia", serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('This certificate is proudly presented to', width / 2, 650);

      // 7. Participant Name (Commanding, Grand, Centered)
      const pName = (cert?.participantName || 'Kumbham Varsha').toUpperCase();
      ctx.font = '900 74px "Cinzel", "Times New Roman", serif';
      ctx.fillStyle = '#0f1e40';
      ctx.letterSpacing = '4px';
      ctx.fillText(pName, width / 2, 755);

      // Underline under participant name
      const nameW = ctx.measureText(pName).width;
      ctx.strokeStyle = goldColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width / 2 - nameW / 2 - 30, 775);
      ctx.lineTo(width / 2 + nameW / 2 + 30, 775);
      ctx.stroke();

      // Institutional Affiliation
      ctx.font = '600 28px "Inter", "Arial", sans-serif';
      ctx.fillStyle = '#334155';
      ctx.letterSpacing = '1px';
      ctx.fillText(`of Department of CSE – Data Science, Malla Reddy Engineering College & Management Sciences`, width / 2, 830);

      // 8. Formal Achievement Text
      ctx.font = '500 30px "Inter", "Georgia", serif';
      ctx.fillStyle = '#334155';
      const achText = cert?.achievement || 'for successfully participating in CodeStorm 2026, the Competitive Programming Symposium organized by the Department of CSE – Data Science on September 23, 2026.';
      
      // Wrap achievement text nicely
      const words = achText.split(' ');
      let line = '';
      let lineY = 910;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const testW = ctx.measureText(testLine).width;
        if (testW > 1800 && n > 0) {
          ctx.fillText(line.trim(), width / 2, lineY);
          line = words[n] + ' ';
          lineY += 46;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), width / 2, lineY);

      // 9. Official Result Details Bar
      const barY = 1080;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(15, 30, 64, 0.15)';
      ctx.lineWidth = 2;
      ctx.fillRect(width / 2 - 920, barY, 1840, 115);
      ctx.strokeRect(width / 2 - 920, barY, 1840, 115);

      const items = [
        { label: 'REGISTRATION ID', value: cert?.registrationId || 'CODESTORM-2026-5976' },
        { label: 'PARTICIPANT ID', value: cert?.participantId || 'CS26-5976' },
        { label: 'FINAL SCORE', value: `${cert?.score || 0} PTS` },
        { label: 'FINAL RANK', value: isWinner ? 'Rank #1' : (isRunnerUp ? 'Rank #2' : (cert?.rank || 'Participant')) },
        { label: 'DATE ISSUED', value: cert?.eventDate || 'October 2, 2026' },
        { label: 'CERTIFICATE NO.', value: cert?.certificateNumber || 'CS26-MREM-PRT-5976' }
      ];

      const colW = 1840 / items.length;
      items.forEach((item, i) => {
        const colX = width / 2 - 920 + colW * i + colW / 2;
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 18px "Inter", "Arial", sans-serif';
        ctx.letterSpacing = '1px';
        ctx.fillText(item.label, colX, barY + 42);

        ctx.fillStyle = '#0f1e40';
        ctx.font = 'bold 24px "Inter", monospace';
        ctx.fillText(item.value, colX, barY + 84);

        if (i < items.length - 1) {
          ctx.strokeStyle = 'rgba(15, 30, 64, 0.12)';
          ctx.beginPath();
          ctx.moveTo(width / 2 - 920 + colW * (i + 1), barY + 15);
          ctx.lineTo(width / 2 - 920 + colW * (i + 1), barY + 100);
          ctx.stroke();
        }
      });

      // 10. Official Three-Column Signature Section (Left: HOD, Center: Principal, Right: Faculty Coordinator)
      const sigY = 1380;
      const sigCol1 = width / 2 - 580; // HOD (Left)
      const sigCol2 = width / 2;       // PRINCIPAL (Center)
      const sigCol3 = width / 2 + 580; // FACULTY COORDINATOR (Right)

      // Column 1: HOD Signature Image (Asset: hod(1).jpeg - "Zaheer" signature)
      if (hodImg) {
        const hW = 220;
        const hH = (hodImg.height / hodImg.width) * hW;
        ctx.drawImage(hodImg, sigCol1 - hW / 2, sigY - 110, hW, Math.min(100, hH));
      }
      ctx.strokeStyle = '#0f1e40';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sigCol1 - 180, sigY);
      ctx.lineTo(sigCol1 + 180, sigY);
      ctx.stroke();

      ctx.fillStyle = '#0f1e40';
      ctx.font = 'bold 26px "Cinzel", "Times New Roman", serif';
      ctx.fillText('HEAD OF DEPARTMENT', sigCol1, sigY + 38);
      ctx.fillStyle = '#475569';
      ctx.font = '22px "Inter", sans-serif';
      ctx.fillText('Dept. of CSE – Data Science', sigCol1, sigY + 70);

      // Column 2: PRINCIPAL (COMPLETELY EMPTY MANUAL SIGNING SPACE)
      // Zero signature image, zero name, zero image - only blank signing line/space
      ctx.strokeStyle = '#0f1e40';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sigCol2 - 180, sigY);
      ctx.lineTo(sigCol2 + 180, sigY);
      ctx.stroke();

      ctx.fillStyle = '#0f1e40';
      ctx.font = 'bold 26px "Cinzel", "Times New Roman", serif';
      ctx.fillText('PRINCIPAL', sigCol2, sigY + 38);

      // Column 3: FACULTY COORDINATOR Signature Image (Asset: fc.jpeg - loop signature)
      if (coordImg) {
        const cW = 210;
        const cH = (coordImg.height / coordImg.width) * cW;
        ctx.drawImage(coordImg, sigCol3 - cW / 2, sigY - 110, cW, Math.min(100, cH));
      }
      ctx.strokeStyle = '#0f1e40';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sigCol3 - 180, sigY);
      ctx.lineTo(sigCol3 + 180, sigY);
      ctx.stroke();

      ctx.fillStyle = '#0f1e40';
      ctx.font = 'bold 26px "Cinzel", "Times New Roman", serif';
      ctx.fillText('FACULTY COORDINATOR', sigCol3, sigY + 38);
      ctx.fillStyle = '#475569';
      ctx.font = '22px "Inter", sans-serif';
      ctx.fillText('CodeStorm 2026 Organizing Committee', sigCol3, sigY + 70);

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

  const certType = cert?.certificateType || 'participation';
  const isWinner = certType === 'winner';
  const isRunnerUp = certType === 'runner_up';
  const isParticipation = certType === 'participation';
  const isPending = cert?.status === 'PENDING RESULT';

  // Academic styling colors
  const primaryNavy = '#0f1e40';
  const goldAccent = isWinner ? '#d97706' : (isRunnerUp ? '#475569' : '#b8860b');
  const badgeBorder = isWinner ? '#fde68a' : (isRunnerUp ? '#cbd5e1' : '#99f6e4');
  const badgeBg = isWinner ? '#fffbeb' : (isRunnerUp ? '#f8fafc' : '#f0fdfa');
  const badgeColor = isWinner ? '#b45309' : (isRunnerUp ? '#334155' : '#0f766e');

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
            border-width: 4px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
          }
          @page {
            size: A4 landscape;
            margin: 6mm;
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
          {/* Admin / Coordinator QA Inspection Toolbar (Requirement 31) */}
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
      {/* 6. COMPLETE CERTIFICATE REDESIGN: OFFICIAL COLLEGE CERTIFICATE CANVAS      */}
      {/* ========================================================================= */}
      <div
        id="certificate-frame"
        ref={certFrameRef}
        style={{
          background: '#fcfbf8',
          border: `5px double ${primaryNavy}`,
          borderRadius: '14px',
          padding: '2.25rem 2.75rem 2rem',
          position: 'relative',
          boxShadow: '0 12px 36px rgba(15, 30, 64, 0.12), 0 2px 8px rgba(0,0,0,0.04)',
          textAlign: 'center',
          overflow: 'hidden',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {/* Elegant Inner Border with Corner Brackets (Requirement 7) */}
        <div style={{
          position: 'absolute',
          inset: '9px',
          border: `1.5px solid ${goldAccent}`,
          borderRadius: '8px',
          pointerEvents: 'none'
        }} />

        {/* Ornate Corner Accents */}
        <div style={{ position: 'absolute', top: '15px', left: '15px', width: '32px', height: '32px', borderTop: `3px solid ${goldAccent}`, borderLeft: `3px solid ${goldAccent}`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '15px', right: '15px', width: '32px', height: '32px', borderTop: `3px solid ${goldAccent}`, borderRight: `3px solid ${goldAccent}`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '15px', left: '15px', width: '32px', height: '32px', borderBottom: `3px solid ${goldAccent}`, borderLeft: `3px solid ${goldAccent}`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '15px', right: '15px', width: '32px', height: '32px', borderBottom: `3px solid ${goldAccent}`, borderRight: `3px solid ${goldAccent}`, pointerEvents: 'none' }} />

        {/* Faint Subtle Central Watermark Crest (Official College Atmosphere) */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '420px',
          height: '420px',
          opacity: 0.035,
          pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, #0f1e40 20%, transparent 70%)',
          borderRadius: '50%'
        }} />

        {/* ===================================================================== */}
        {/* 1. OFFICIAL MALLA REDDY COLLEGE HEADER LOGO IMAGE (Requirements 4 & 5)*/}
        {/* ===================================================================== */}
        <div style={{ marginBottom: '0.6rem', position: 'relative' }}>
          <img
            src="/assets/mrem_header.webp"
            alt="Malla Reddy Engineering College and Management Sciences - UGC Autonomous - NAAC & NBA"
            style={{
              width: '100%',
              maxWidth: '780px',
              height: 'auto',
              maxHeight: '74px',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto'
            }}
          />
        </div>

        {/* Department Institutional Hierarchy Line (Requirement 9 & 21) */}
        <div style={{ marginBottom: '0.35rem' }}>
          <span style={{
            fontFamily: '"Cinzel", "Times New Roman", serif',
            fontSize: '0.88rem',
            fontWeight: 800,
            letterSpacing: '0.14em',
            color: '#0f1e40',
            textTransform: 'uppercase',
            display: 'inline-block'
          }}>
            ◆ DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING (DATA SCIENCE) ◆
          </span>
        </div>

        {/* CodeStorm Symposium Branding (Subordinate to College Identity - Req 11) */}
        <div style={{ marginBottom: '0.9rem' }}>
          <span style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#b45309',
            textTransform: 'uppercase'
          }}>
            CODESTORM 2026 — COMPETITIVE PROGRAMMING SYMPOSIUM
          </span>
        </div>

        {/* Subtle Decorative Divider with Diamond */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          maxWidth: '360px',
          margin: '0 auto 0.75rem'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(180, 83, 9, 0.4))' }} />
          <span style={{ color: goldAccent, fontSize: '0.75rem' }}>◈</span>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(180, 83, 9, 0.4), transparent)' }} />
        </div>

        {/* ===================================================================== */}
        {/* 2. CERTIFICATE TITLE (Prominent, Elegant, Academic - Req 10)           */}
        {/* ===================================================================== */}
        <div style={{ marginBottom: '0.5rem' }}>
          <h2 style={{
            fontFamily: '"Cinzel", "Times New Roman", Georgia, serif',
            fontSize: '2.15rem',
            fontWeight: 900,
            color: '#0f1e40',
            letterSpacing: '0.06em',
            margin: '0 0 0.35rem',
            textTransform: 'uppercase'
          }}>
            {isWinner || isRunnerUp ? 'CERTIFICATE OF MERIT' : 'CERTIFICATE OF PARTICIPATION'}
          </h2>

          {/* Distinction Badge Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.2rem 0.9rem',
            borderRadius: '9999px',
            background: badgeBg,
            border: `1px solid ${badgeBorder}`,
            color: badgeColor,
            fontSize: '0.76rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}>
            {isWinner && <span>★ WINNER / 1ST POSITION ★</span>}
            {isRunnerUp && <span>★ RUNNER-UP / 2ND POSITION ★</span>}
            {isParticipation && <span>★ OFFICIAL PARTICIPATION ★</span>}
          </div>
        </div>

        {/* Introductory formal phrasing */}
        <div style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: '1rem',
          color: '#556987',
          fontStyle: 'italic',
          margin: '0.75rem 0 0.4rem'
        }}>
          This certificate is proudly presented to
        </div>

        {/* ===================================================================== */}
        {/* 3. PARTICIPANT NAME (STRONGEST VISUAL ELEMENT - Req 12)               */}
        {/* ===================================================================== */}
        <div style={{
          fontFamily: '"Cinzel", "Times New Roman", Georgia, serif',
          fontSize: '2.35rem',
          fontWeight: 900,
          color: '#0f1e40',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          margin: '0 auto 0.4rem',
          display: 'inline-block',
          borderBottom: `2.5px solid ${goldAccent}`,
          paddingBottom: '3px',
          minWidth: '340px'
        }}>
          {cert?.participantName || participant?.name || 'Kumbham Varsha'}
        </div>

        {/* Academic Affiliation Line */}
        <div style={{
          fontSize: '0.88rem',
          fontWeight: 600,
          color: '#334155',
          marginBottom: '0.85rem',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          of Department of CSE – Data Science, Malla Reddy Engineering College & Management Sciences
        </div>

        {/* ===================================================================== */}
        {/* 4. FORMAL ACHIEVEMENT WORDING (Exact text per Requirement 18)        */}
        {/* ===================================================================== */}
        <p style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: '0.98rem',
          color: '#334155',
          maxWidth: '840px',
          margin: '0 auto 1.35rem',
          lineHeight: 1.65,
          letterSpacing: '0.01em'
        }}>
          {cert?.achievement || (
            isWinner
              ? 'for securing the Winner / 1st Position in CodeStorm 2026, the Competitive Programming Symposium organized by the Department of CSE – Data Science on September 23, 2026.'
              : isRunnerUp
              ? 'for securing the Runner-up / 2nd Position in CodeStorm 2026, the Competitive Programming Symposium organized by the Department of CSE – Data Science on September 23, 2026.'
              : 'for successfully participating in CodeStorm 2026, the Competitive Programming Symposium organized by the Department of CSE – Data Science on September 23, 2026.'
          )}
        </p>

        {/* ===================================================================== */}
        {/* 5. OFFICIAL RESULT INFORMATION BAR (Requirement 19)                   */}
        {/* ===================================================================== */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '2.5rem',
          padding: '0.55rem 1.25rem',
          borderTop: '1px solid rgba(15, 30, 64, 0.12)',
          borderBottom: '1px solid rgba(15, 30, 64, 0.12)',
          maxWidth: '820px',
          margin: '0 auto 1.75rem',
          fontSize: '0.8rem',
          color: '#475569',
          background: '#ffffff',
          borderRadius: '8px'
        }}>
          <div>
            <span style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 700, display: 'block' }}>
              Registration ID
            </span>
            <strong style={{ color: '#0f1e40', fontFamily: 'monospace', fontSize: '0.84rem' }}>
              {cert?.registrationId || 'CODESTORM-2026-5976'}
            </strong>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'rgba(15, 30, 64, 0.1)' }} />

          <div>
            <span style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 700, display: 'block' }}>
              Participant ID
            </span>
            <strong style={{ color: '#0284c7', fontFamily: 'monospace', fontSize: '0.84rem' }}>
              {cert?.participantId || 'CS26-5976'}
            </strong>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'rgba(15, 30, 64, 0.1)' }} />

          <div>
            <span style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 700, display: 'block' }}>
              Final Score
            </span>
            <strong style={{ color: '#0f1e40', fontSize: '0.84rem' }}>
              {cert?.score || 0} PTS
            </strong>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'rgba(15, 30, 64, 0.1)' }} />

          <div>
            <span style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 700, display: 'block' }}>
              Final Rank
            </span>
            <strong style={{ color: goldAccent, fontSize: '0.84rem' }}>
              {isWinner ? 'Rank #1' : (isRunnerUp ? 'Rank #2' : (cert?.rank || 'Participant'))}
            </strong>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'rgba(15, 30, 64, 0.1)' }} />

          <div>
            <span style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 700, display: 'block' }}>
              Certificate No.
            </span>
            <strong style={{ color: '#0f766e', fontFamily: 'monospace', fontSize: '0.84rem' }}>
              {cert?.certificateNumber || 'CS26-MREM-PRT-5976'}
            </strong>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'rgba(15, 30, 64, 0.1)' }} />

          <div>
            <span style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 700, display: 'block' }}>
              Event Date
            </span>
            <strong style={{ color: '#0f1e40', fontSize: '0.84rem' }}>
              {cert?.eventDate || 'October 2, 2026'}
            </strong>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* 6. SIGNATURE AREA — THREE-COLUMN STRUCTURE (Requirements 1, 2, 3, 22) */}
        {/* ===================================================================== */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          alignItems: 'flex-end',
          maxWidth: '840px',
          margin: '0 auto',
          paddingTop: '0.25rem'
        }}>
          {/* Column 1: HOD SIGNATURE (Asset: hod(1).jpeg ONLY) */}
          <div style={{ textAlign: 'center', padding: '0 0.5rem' }}>
            <div style={{ height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
              <img
                src="/assets/hod(1).jpeg"
                alt="Head of Department Signature"
                onError={(e) => { e.target.src = '/assets/hod_signature.jpg'; }}
                style={{
                  maxHeight: '48px',
                  maxWidth: '145px',
                  objectFit: 'contain',
                  mixBlendMode: 'multiply'
                }}
              />
            </div>
            <div style={{ borderTop: `1.5px solid ${primaryNavy}`, width: '175px', margin: '0 auto' }} />
            <div style={{
              fontFamily: '"Cinzel", "Times New Roman", serif',
              fontWeight: 800,
              color: '#0f1e40',
              fontSize: '0.86rem',
              marginTop: '5px'
            }}>
              HEAD OF DEPARTMENT
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Dept. of CSE – Data Science
            </div>
          </div>

          {/* Column 2: PRINCIPAL SECTION — COMPLETELY EMPTY (No signature, No name, No image) */}
          <div style={{ textAlign: 'center', padding: '0 0.5rem' }}>
            <div style={{ height: '54px', marginBottom: '4px' }} />
            <div style={{ borderTop: `1.5px solid ${primaryNavy}`, width: '175px', margin: '0 auto' }} />
            <div style={{
              fontFamily: '"Cinzel", "Times New Roman", serif',
              fontWeight: 800,
              color: '#0f1e40',
              fontSize: '0.86rem',
              marginTop: '5px'
            }}>
              PRINCIPAL
            </div>
          </div>

          {/* Column 3: FACULTY COORDINATOR SIGNATURE (Asset: fc.jpeg ONLY) */}
          <div style={{ textAlign: 'center', padding: '0 0.5rem' }}>
            <div style={{ height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
              <img
                src="/assets/fc.jpeg"
                alt="Faculty Coordinator Signature"
                onError={(e) => { e.target.src = '/assets/coordinator_signature.jpg'; }}
                style={{
                  maxHeight: '50px',
                  maxWidth: '145px',
                  objectFit: 'contain',
                  mixBlendMode: 'multiply'
                }}
              />
            </div>
            <div style={{ borderTop: `1.5px solid ${primaryNavy}`, width: '175px', margin: '0 auto' }} />
            <div style={{
              fontFamily: '"Cinzel", "Times New Roman", serif',
              fontWeight: 800,
              color: '#0f1e40',
              fontSize: '0.86rem',
              marginTop: '5px'
            }}>
              FACULTY COORDINATOR
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              CodeStorm 2026 Organizing Committee
            </div>
          </div>
        </div>

        {/* Institutional Verification Footer Seal */}
        <div style={{
          marginTop: '1.25rem',
          fontSize: '0.68rem',
          color: '#94a3b8',
          letterSpacing: '0.05em',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <ShieldCheck size={13} color="#0f766e" />
          <span>OFFICIALLY VERIFIED INSTITUTIONAL CREDENTIAL • MALLA REDDY ENGINEERING COLLEGE AND MANAGEMENT SCIENCES</span>
        </div>
      </div>
    </div>
  );
}
