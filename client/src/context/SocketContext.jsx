import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, token, authFetch } = useAuth();
  const [socket, setSocket] = useState(null);
  const [timerState, setTimerState] = useState({
    remainingSeconds: 0,
    isPaused: false,
    roundId: null,
    roundName: '',
    status: 'locked'
  });
  const [announcements, setAnnouncements] = useState([]);
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);
  const [antiCheatWarning, setAntiCheatWarning] = useState(null);
  const tabHiddenTimeRef = useRef(null);

  useEffect(() => {
    // Initial fetch of announcements
    fetch('/api/announcements')
      .then(res => res.json())
      .then(data => {
        setAnnouncements(data);
        if (data.length > 0) setActiveAnnouncement(data[0]);
      })
      .catch(() => {});

    // Initial fetch of event & timer status
    fetch('/api/event/status')
      .then(res => res.json())
      .then(data => {
        if (data.currentRound) {
          setTimerState({
            remainingSeconds: data.currentRound.remainingSeconds || 0,
            isPaused: data.currentRound.isPaused || false,
            roundId: data.currentRound.id,
            roundName: data.currentRound.name,
            status: data.currentRound.status
          });
        }
      })
      .catch(() => {});

    const newSocket = io({
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      if (user) {
        newSocket.emit('register_user', {
          userId: user.id,
          participantId: user.participantId,
          role: user.role
        });
      }
    });

    // Server-Authoritative Timer Heartbeat
    newSocket.on('timer_tick', (data) => {
      setTimerState(prev => ({
        ...prev,
        remainingSeconds: data.remainingSeconds,
        isPaused: data.isPaused,
        roundId: data.roundId,
        roundName: data.roundName,
        status: data.status
      }));
    });

    // Announcements
    newSocket.on('new_announcement', (ann) => {
      setAnnouncements(prev => [ann, ...prev]);
      setActiveAnnouncement(ann);
      // Auto dismiss active banner popup after 12 seconds
      setTimeout(() => {
        setActiveAnnouncement(prev => prev?.id === ann.id ? null : prev);
      }, 12000);
    });

    // Round lifecycle events
    newSocket.on('round_started', (data) => {
      setTimerState({
        remainingSeconds: data.round.remainingSeconds,
        isPaused: false,
        roundId: data.round.id,
        roundName: data.round.name,
        status: 'live'
      });
    });

    newSocket.on('round_ended', (data) => {
      setTimerState(prev => ({
        ...prev,
        status: 'completed',
        remainingSeconds: 0
      }));
    });

    newSocket.on('round_paused', () => {
      setTimerState(prev => ({ ...prev, isPaused: true }));
    });

    newSocket.on('round_resumed', () => {
      setTimerState(prev => ({ ...prev, isPaused: false }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  // -------------------------------------------------------------
  // ANTI-CHEAT MONITORING FOR PARTICIPANTS
  // -------------------------------------------------------------
  useEffect(() => {
    if (!user || user.role !== 'participant' || !token) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabHiddenTimeRef.current = Date.now();
      } else if (tabHiddenTimeRef.current) {
        const durationSec = Math.round((Date.now() - tabHiddenTimeRef.current) / 1000);
        tabHiddenTimeRef.current = null;

        if (durationSec >= 2) {
          // Log tab switch to server
          authFetch('/api/anticheat/log', {
            method: 'POST',
            body: JSON.stringify({
              eventType: 'tab_switch',
              details: `Participant switched tabs or minimized window for ${durationSec}s.`,
              severity: durationSec > 15 ? 'high' : (durationSec > 5 ? 'medium' : 'low')
            })
          }).catch(() => {});

          setAntiCheatWarning(`⚠️ Warning: You left the CodeStorm competition window for ${durationSec}s. This action has been logged for faculty review.`);
          setTimeout(() => setAntiCheatWarning(null), 7000);
        }
      }
    };

    const handleWindowBlur = () => {
      // Window lost focus
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [user, token]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        timerState,
        announcements,
        activeAnnouncement,
        setActiveAnnouncement,
        antiCheatWarning,
        dismissWarning: () => setAntiCheatWarning(null)
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
