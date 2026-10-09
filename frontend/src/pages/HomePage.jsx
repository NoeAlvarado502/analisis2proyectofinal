import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { MENU_ITEMS } from '../components/Sidebar';

export default function HomePage() {
  const { user, can } = useAuth();
  const navigate = useNavigate();

  // Filter modules excluding /inicio
  const permittedModules = MENU_ITEMS.filter(
    (item) => item.path !== '/inicio' && (!item.permission || can(item.permission))
  );

  const getModuleTheming = (path) => {
    switch (path) {
      case '/productos':
        return {
          bg: 'rgba(25, 168, 232, 0.12)',
          color: 'var(--toy-deep-blue)',
          border: 'rgba(25, 168, 232, 0.25)',
          badge: 'badge-primary',
          badgeText: 'Catálogo'
        };
      case '/clientes':
        return {
          bg: 'rgba(116, 201, 91, 0.15)',
          color: 'var(--toy-green-dark)',
          border: 'rgba(116, 201, 91, 0.3)',
          badge: 'badge-success',
          badgeText: 'Directorio'
        };
      case '/usuarios':
        return {
          bg: 'rgba(131, 102, 217, 0.15)',
          color: 'var(--toy-purple-dark)',
          border: 'rgba(131, 102, 217, 0.3)',
          badge: 'badge-purple',
          badgeText: 'Personal'
        };
      case '/roles':
        return {
          bg: 'rgba(15, 118, 110, 0.12)',
          color: '#0F766E',
          border: 'rgba(15, 118, 110, 0.28)',
          badge: 'badge-info',
          badgeText: 'Seguridad'
        };
      default:
        return {
          bg: 'rgba(25, 168, 232, 0.12)',
          color: 'var(--toy-deep-blue)',
          border: 'rgba(25, 168, 232, 0.25)',
          badge: 'badge-primary',
          badgeText: 'Módulo'
        };
    }
  };

  return (
    <div>
      {/* Professional Executive Hero Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, var(--toy-blue), var(--toy-deep-blue))',
          color: '#FFFFFF',
          padding: '1.8rem 2rem',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '1.75rem',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 24px rgba(8, 123, 181, 0.22)'
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: '-30px',
            bottom: '-30px',
            width: '240px',
            height: '240px',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.12)',
            filter: 'blur(35px)',
            pointerEvents: 'none'
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
                backdropFilter: 'blur(6px)',
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                marginBottom: '0.65rem'
              }}
            >
              <Sparkles size={13} color="var(--toy-yellow)" />
              <span>Panel Operativo &middot; Juguetería Quetzal</span>
            </div>

            <h1 className="font-display" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              ¡Hola, {user?.nombre_completo || 'Usuario'}!
            </h1>

            <p style={{ color: 'rgba(255, 255, 255, 0.92)', fontSize: '0.88rem', fontWeight: 600, maxWidth: '650px', marginTop: '0.35rem', lineHeight: '1.45' }}>
              Sesión iniciada con perfil <strong style={{ color: 'var(--toy-yellow)' }}>{user?.rol}</strong>. Consulta los módulos operativos disponibles para gestionar productos, pedidos, cuentas y perfiles.
            </p>
          </div>

          <div
            style={{
              padding: '0.9rem 1.4rem',
              borderRadius: '18px',
              backgroundColor: '#FFFFFF',
              border: '2px solid var(--toy-border)',
              textAlign: 'center',
              boxShadow: '0 6px 16px rgba(8, 123, 181, 0.18)'
            }}
          >
            <span style={{ fontSize: '0.7rem', color: 'var(--toy-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
              Rol Activo
            </span>
            <div className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--toy-deep-blue)', marginTop: '2px' }}>
              {user?.rol}
            </div>
          </div>
        </div>
      </div>

      {/* Permitted Modules Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.25rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '999px', backgroundColor: 'var(--toy-blue)', display: 'inline-block' }} />
          <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--toy-ink)' }}>
            Módulos Habilitados
          </h2>
        </div>
        <p style={{ color: 'var(--toy-muted)', fontSize: '0.84rem', fontWeight: 600, marginBottom: '1.25rem' }}>
          Selecciona un área de trabajo para acceder a la gestión correspondiente.
        </p>

        <div className="module-grid">
          {permittedModules.map((item) => {
            const Icon = item.IconComponent;
            const theme = getModuleTheming(item.path);

            return (
              <div
                key={item.path}
                className="card"
                onClick={() => navigate(item.path)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: '#FFFFFF',
                  border: '2px solid var(--toy-border)',
                  borderRadius: '22px',
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-toy-card)',
                  transition: 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = 'var(--toy-blue)';
                  e.currentTarget.style.boxShadow = '0 10px 24px rgba(25, 168, 232, 0.16)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'var(--toy-border)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-toy-card)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '14px',
                        backgroundColor: theme.bg,
                        border: `2px solid ${theme.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: theme.color
                      }}
                    >
                      <Icon size={22} strokeWidth={2.4} />
                    </div>

                    <span className={`badge ${theme.badge}`} style={{ fontSize: '0.66rem', padding: '0.2rem 0.6rem' }}>
                      {theme.badgeText}
                    </span>
                  </div>

                  <h3 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--toy-ink)', marginBottom: '0.35rem' }}>
                    {item.label}
                  </h3>

                  <p style={{ color: 'var(--toy-muted)', fontSize: '0.82rem', lineHeight: '1.4', fontWeight: 600 }}>
                    {item.description}
                  </p>
                </div>

                <div style={{ marginTop: '1.2rem', paddingTop: '0.85rem', borderTop: '1.5px solid var(--toy-border-light)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(item.path);
                    }}
                  >
                    Abrir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
