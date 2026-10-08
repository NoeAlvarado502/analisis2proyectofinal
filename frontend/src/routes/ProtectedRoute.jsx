import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import AccessDeniedPage from '../pages/AccessDeniedPage';

export default function ProtectedRoute({ requiredPermission, children }) {
  const { user, loading, can } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-app)',
          color: 'var(--text-muted)',
          gap: '0.75rem',
          fontFamily: 'var(--font-heading)'
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            border: '3px solid var(--text-dim)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <span>Cargando sistema...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !can(requiredPermission)) {
    return <AccessDeniedPage />;
  }

  return children ? children : <Outlet />;
}
