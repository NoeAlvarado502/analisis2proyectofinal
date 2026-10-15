import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    async function restoreSession() {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        if (response && response.data) {
          setUser(response.data.usuario);
          setPermissions(response.data.permisos || []);
        }
      } catch (err) {
        console.error('Error restaurando sesión:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response && response.data) {
      const { token, usuario, permisos } = response.data;
      localStorage.setItem('token', token);
      setUser(usuario);
      setPermissions(permisos || []);
      return usuario;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setPermissions([]);
    window.location.href = '/login';
  }, []);

  // Check if current user has a specific permission (or any of the provided permissions)
  const can = useCallback((permissionCode) => {
    if (!permissionCode) return true;
    if (!permissions || permissions.length === 0) return false;
    if (Array.isArray(permissionCode)) {
      return permissionCode.some((p) => permissions.includes(p));
    }
    return permissions.includes(permissionCode);
  }, [permissions]);

  const value = {
    user,
    permissions,
    loading,
    login,
    logout,
    can,
    isAuthenticated: Boolean(user)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
