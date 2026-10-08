import React from 'react';
import { useAuth } from '../auth/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  const getRoleBadgeClass = (role) => {
    switch (role?.toLowerCase()) {
      case 'administrador':
        return 'badge-primary';
      case 'supervisor':
        return 'badge-info';
      case 'operador':
        return 'badge-success';
      default:
        return 'badge-secondary';
    }
  };

  const initials = user?.nombre_completo
    ? user.nombre_completo
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Sistema de Gestión de Pedidos, Inventario y Ventas
        </span>
      </div>

      <div className="navbar-user">
        <div className="user-profile">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <span className="user-name">{user?.nombre_completo}</span>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span className={`badge ${getRoleBadgeClass(user?.rol)}`}>
                {user?.rol || 'Sin Rol'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
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
          <span>🚪</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
}
