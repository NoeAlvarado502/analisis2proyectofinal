import React from 'react';
import { LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  const getRoleBadgeClass = (role) => {
    switch (role?.toLowerCase()) {
      case 'administrador':
        return 'badge-purple';
      case 'supervisor':
        return 'badge-primary';
      case 'operador':
        return 'badge-success';
      default:
        return 'badge-primary';
    }
  };

  const initials = user?.nombre_completo
    ? user.nombre_completo
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'UQ';

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.4rem 0.95rem',
            borderRadius: '999px',
            backgroundColor: 'rgba(255, 244, 221, 0.9)',
            border: '1.5px solid var(--toy-border)',
            fontSize: '0.8rem',
            fontWeight: 800,
            color: 'var(--toy-ink)'
          }}
        >
          <Sparkles size={15} color="var(--toy-orange)" />
          <span>Panel de Operación &middot; Control de Inventario</span>
        </div>
      </div>

      <div className="navbar-user">
        <div className="user-profile">
          <div
            className="user-avatar"
            style={{
              boxShadow: '0 3px 0 var(--toy-deep-blue)'
            }}
          >
            {initials}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.nombre_completo}</span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '2px' }}>
              <span className={`badge ${getRoleBadgeClass(user?.rol)}`}>
                {user?.rol || 'Sin Rol'}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 700 }}>
                {user?.email}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="btn btn-secondary btn-sm"
          title="Cerrar sesión"
        >
          <LogOut size={15} strokeWidth={2.4} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
}
