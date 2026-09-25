import React from 'react';
import { useSocket } from '../context/SocketContext';
import { AlertTriangle, Bell, X } from 'lucide-react';

export default function AnnouncementBanner() {
  const { activeAnnouncement, setActiveAnnouncement, antiCheatWarning, dismissWarning } = useSocket();

  return (
    <>
      {/* Anti-cheat violation alert banner */}
      {antiCheatWarning && (
        <div style={{
          background: 'linear-gradient(90deg, #dc2626 0%, #991b1b 100%)',
          color: '#fff',
          padding: '0.65rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)',
          position: 'sticky',
          top: '64px',
          zIndex: 90,
          animation: 'pulse-critical 1.5s infinite'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={18} />
            <span>{antiCheatWarning}</span>
          </div>
          <button 
            onClick={dismissWarning}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Broadcast Announcement Pop */}
      {activeAnnouncement && (
        <div style={{
          background: activeAnnouncement.priority === 'urgent' 
            ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.95), rgba(185, 28, 28, 0.95))' 
            : 'linear-gradient(90deg, rgba(14, 165, 233, 0.95), rgba(59, 130, 246, 0.95))',
          color: '#fff',
          padding: '0.6rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
          position: 'sticky',
          top: antiCheatWarning ? '104px' : '64px',
          zIndex: 89
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Bell size={18} />
            <span><strong>BROADCAST:</strong> {activeAnnouncement.message}</span>
          </div>
          <button 
            onClick={() => setActiveAnnouncement(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.2rem' }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
