import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('codestorm_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Session invalid');
          return res.json();
        })
        .then(data => {
          setUser(data.user);
          setParticipant(data.participant);
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (identifier, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to login');
    }

    localStorage.setItem('codestorm_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setParticipant(data.participant);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('codestorm_token');
    setToken(null);
    setUser(null);
    setParticipant(null);
  };

  const authFetch = (url, options = {}) => {
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    };
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(url, { ...options, headers });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        participant,
        token,
        loading,
        login,
        logout,
        authFetch,
        isAdmin: user?.role === 'admin',
        isCoordinator: user?.role === 'coordinator',
        isParticipant: user?.role === 'participant'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
