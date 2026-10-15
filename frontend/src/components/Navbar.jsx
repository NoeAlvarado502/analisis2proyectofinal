import React, { useState, useRef, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

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
    : 'JQ';

  return (
    <header className="top-navbar">
      <div style={{ position: 'relative' }} ref={dropdownRef}>
        {/* Únicamente la burbujita del usuario */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="user-avatar-btn"
          title={user?.nombre_completo || 'Usuario'}
          aria-label="Perfil de usuario"
          aria-expanded={open}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--toy-blue), var(--toy-deep-blue))',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1rem',
            border: '2.5px solid #FFFFFF',
            boxShadow: '0 4px 12px rgba(8, 123, 181, 0.35)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            outline: 'none',
            padding: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {initials}
        </button>

        {/* Desplegable flotante con toda la información y opción de cerrar sesión */}
        {open && (
          <div
            className="user-dropdown-card"
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 12px)',
              minWidth: '270px',
              maxWidth: '340px',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '2px solid var(--toy-border)',
              boxShadow: '0 20px 45px rgba(58, 42, 34, 0.18)',
              padding: '1.25rem',
              zIndex: 150,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.95rem',
              animation: 'dropdownFadeIn 0.16s ease-out'
            }}
          >
            {/* Cabecera: Avatar circular + Nombre y usuario */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, var(--toy-blue), var(--toy-deep-blue))',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  boxShadow: '0 4px 10px rgba(8, 123, 181, 0.35)',
                  flexShrink: 0
                }}
              >
                {initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    fontWeight: 800,
                    fontSize: '0.98rem',
                    color: 'var(--toy-ink)',
                    lineHeight: 1.25,
                    margin: 0,
                    wordBreak: 'break-word'
                  }}
                >
                  {user?.nombre_completo}
                </p>
                <p
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--toy-muted)',
                    margin: '0.15rem 0 0',
                    fontWeight: 700
                  }}
                >
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Fila de Rol unificada sin caja ni fondos distintos */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 0.15rem'
              }}
            >
              <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
                Rol
              </span>
              <span className={`badge ${getRoleBadgeClass(user?.rol)}`} style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {user?.rol || 'Sin Rol'}
              </span>
            </div>

            {/* Botón Cerrar Sesión completamente rojo con elevación 3D */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="btn btn-danger btn-sm"
              style={{
                width: '100%',
                justifyContent: 'center',
                backgroundColor: 'var(--toy-red)',
                color: '#FFFFFF',
                border: 'none',
                boxShadow: '0 4px 0 var(--toy-red-dark), 0 6px 14px rgba(241, 91, 74, 0.4)',
                fontWeight: 800
              }}
            >
              <LogOut size={16} strokeWidth={2.4} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
