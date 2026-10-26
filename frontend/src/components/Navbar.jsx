import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Search, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useSearch } from '../context/SearchContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { query, setQuery, placeholder, clearQuery, handleSearchSubmit } = useSearch();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Atajo de teclado global: Ctrl+K o '/' para enfocar el buscador
  useEffect(() => {
    function handleKeyDown(e) {
      const target = e.target;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && !isInput)) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      {/* Input de Búsqueda Rediseñado al Inicio del Header (a la derecha del logo) */}
      <div
        className="header-search-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          width: 'clamp(360px, 46vw, 560px)',
          transition: 'all 0.2s ease'
        }}
      >
        <Search
          size={18}
          strokeWidth={2.4}
          style={{
            position: 'absolute',
            left: '14px',
            color: query ? 'var(--toy-blue)' : 'var(--toy-muted)',
            pointerEvents: 'none',
            transition: 'color 0.15s ease'
          }}
        />

        <input
          ref={searchInputRef}
          type="text"
          className="header-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearchSubmit(query);
            }
          }}
          placeholder={placeholder}
          aria-label="Buscar en el sistema"
          style={{
            width: '100%',
            height: '42px',
            paddingLeft: '40px',
            paddingRight: query ? '38px' : '16px',
            borderRadius: '999px',
            border: '2px solid var(--toy-border)',
            backgroundColor: '#FAF8F5',
            color: 'var(--toy-ink)',
            fontSize: '0.88rem',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            outline: 'none',
            transition: 'all 0.18s ease'
          }}
        />

        {query && (
          <button
            type="button"
            onClick={clearQuery}
            title="Limpiar búsqueda (Esc)"
            aria-label="Limpiar búsqueda"
            style={{
              position: 'absolute',
              right: '10px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'rgba(58, 42, 34, 0.08)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--toy-muted)',
              transition: 'background-color 0.12s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(241, 91, 74, 0.18)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(58, 42, 34, 0.08)')}
          >
            <X size={14} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {/* Perfil de Usuario */}
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
