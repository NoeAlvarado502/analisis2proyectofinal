import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function AccessDeniedPage() {
  const { user } = useAuth();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem'
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          borderColor: 'var(--danger-border)',
          backgroundColor: 'rgba(239, 68, 68, 0.04)',
          padding: '2.5rem 2rem'
        }}
      >
        <div
          style={{
            fontSize: '3.5rem',
            marginBottom: '1rem',
            filter: 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.4))'
          }}
        >
          🚫
        </div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#f87171' }}>
          Acceso Denegado (403)
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.925rem' }}>
          Tu cuenta con rol <strong style={{ color: 'var(--text-main)' }}>{user?.rol || 'Usuario'}</strong> no cuenta con los permisos necesarios para acceder a este módulo.
        </p>

        <div
          style={{
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.75rem',
            fontSize: '0.825rem',
            color: 'var(--text-dim)',
            textAlign: 'left'
          }}
        >
          <div><strong>Usuario:</strong> {user?.nombre_completo} ({user?.email})</div>
          <div><strong>Regla de seguridad:</strong> Control de acceso basado en roles (RBAC) activo.</div>
        </div>

        <Link to="/inicio" className="btn btn-primary" style={{ width: '100%' }}>
          ← Regresar al Inicio
        </Link>
      </div>
    </div>
  );
}
