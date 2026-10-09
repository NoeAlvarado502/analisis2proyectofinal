import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
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
          backgroundColor: '#FFFFFF',
          padding: '2.8rem 2.2rem',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div
          style={{
            width: '68px',
            height: '68px',
            margin: '0 auto 1.25rem',
            borderRadius: '50%',
            backgroundColor: 'var(--danger-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-red)'
          }}
        >
          <ShieldAlert size={36} strokeWidth={2.2} />
        </div>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '0.4rem', color: 'var(--color-ink)' }}>
          Acceso Denegado (403)
        </h2>
        <p style={{ color: 'var(--color-muted)', marginBottom: '1.6rem', fontSize: '0.94rem', fontWeight: 500 }}>
          Tu cuenta con rol <strong style={{ color: 'var(--color-ink)' }}>{user?.rol || 'Usuario'}</strong> no cuenta con los permisos necesarios para acceder a este módulo.
        </p>

        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#FCF8F0',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.85rem',
            fontSize: '0.85rem',
            color: 'var(--color-muted)',
            textAlign: 'left',
            lineHeight: 1.5
          }}
        >
          <div><strong style={{ color: 'var(--color-ink)' }}>Usuario:</strong> {user?.nombre_completo} ({user?.email})</div>
          <div><strong style={{ color: 'var(--color-ink)' }}>Regla de seguridad:</strong> Control de acceso granular (RBAC) verificado.</div>
        </div>

        <Link to="/inicio" className="btn btn-primary" style={{ width: '100%', height: '46px' }}>
          <ArrowLeft size={18} strokeWidth={2.2} />
          <span>Regresar al Inicio</span>
        </Link>
      </div>
    </div>
  );
}
