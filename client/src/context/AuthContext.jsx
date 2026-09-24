import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../services/auth.api';

const AuthContext = createContext(null);

const ROLE_INFO = {
  PATIENT: { label: 'Patient', home: '/patient/dashboard' },
  STAFF: { label: 'Clinic Staff', home: '/staff/dashboard' },
  DOCTOR: { label: 'Doctor', home: '/doctor/dashboard' },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mq_user') || 'null');
    } catch {
      return null;
    }
  });
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('mq_token');
    if (!token) {
      setInitializing(false);
      return undefined;
    }
    authApi
      .me()
      .then((u) => {
        if (!active) return;
        setUser(u);
        localStorage.setItem('mq_user', JSON.stringify(u));
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem('mq_token');
        localStorage.removeItem('mq_user');
        setUser(null);
      })
      .finally(() => active && setInitializing(false));
    return () => {
      active = false;
    };
  }, []);

  const applyAuth = useCallback((token, u) => {
    localStorage.setItem('mq_token', token);
    localStorage.setItem('mq_user', JSON.stringify(u));
    setUser(u);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const data = await authApi.login(email, password);
      applyAuth(data.token, data.user);
      return data.user;
    },
    [applyAuth]
  );

  const register = useCallback(
    async (payload) => {
      const data = await authApi.register(payload);
      applyAuth(data.token, data.user);
      return data.user;
    },
    [applyAuth]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('mq_token');
    localStorage.removeItem('mq_user');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      login,
      register,
      logout,
      initializing,
      roleInfo: user ? ROLE_INFO[user.role] : null,
    }),
    [user, login, register, logout, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}