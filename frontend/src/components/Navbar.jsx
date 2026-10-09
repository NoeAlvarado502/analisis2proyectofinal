import React from 'react';
import { LogOut } from 'lucide-react';
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
      <div className="navbar-left" />

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
