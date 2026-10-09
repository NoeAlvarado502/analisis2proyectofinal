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
          bg: 'rgba(255, 157, 46, 0.15)',
          color: 'var(--toy-orange-dark)',
          border: 'rgba(255, 157, 46, 0.3)',
          badge: 'badge-warning',
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
          padding: '2.4rem 2.2rem',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '2.2rem',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 12px 30px rgba(8, 123, 181, 0.25)'
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

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
                backdropFilter: 'blur(6px)',
                padding: '0.35rem 0.85rem',
                borderRadius: '999px',
                fontSize: '0.74rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                marginBottom: '0.75rem'
              }}
            >
              <Sparkles size={14} color="var(--toy-yellow)" />
              <span>Panel Operativo &middot; Juguetería Quetzal</span>
            </div>

            <h1 className="font-display" style={{ fontSize: '2.2rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em', lineHeight: 1.15 }}>
              ¡Hola, {user?.nombre_completo || 'Usuario'}!
            </h1>

            <p style={{ color: 'rgba(255, 255, 255, 0.92)', fontSize: '0.98rem', fontWeight: 600, maxWidth: '650px', marginTop: '0.45rem' }}>
              Sesión iniciada con perfil <strong style={{ color: 'var(--toy-yellow)' }}>{user?.rol}</strong>. Consulta los módulos operativos disponibles para gestionar productos, pedidos, cuentas y perfiles.
            </p>
          </div>

          <div
            style={{
              padding: '1.1rem 1.6rem',
              borderRadius: '20px',
              backgroundColor: '#FFFFFF',
              border: '2px solid var(--toy-border)',
              textAlign: 'center',
              boxShadow: '0 8px 20px rgba(8, 123, 181, 0.2)'
            }}
          >
            <span style={{ fontSize: '0.72rem', color: 'var(--toy-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
              Rol Activo
            </span>
            <div className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--toy-deep-blue)', marginTop: '2px' }}>
              {user?.rol}
            </div>
          </div>
        </div>
      </div>

      {/* Permitted Modules Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.35rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '999px', backgroundColor: 'var(--toy-orange)', display: 'inline-block' }} />
          <h2 className="font-display" style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--toy-ink)' }}>
            Módulos Habilitados
          </h2>
        </div>
        <p style={{ color: 'var(--toy-muted)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '1.4rem' }}>
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
                  borderRadius: '24px',
                  padding: '1.6rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-toy-card)',
                  transition: 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'var(--toy-orange)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(255, 157, 46, 0.16)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'var(--toy-border)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-toy-card)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '16px',
                        backgroundColor: theme.bg,
                        border: `2px solid ${theme.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: theme.color
                      }}
                    >
                      <Icon size={26} strokeWidth={2.4} />
                    </div>

                    <span className={`badge ${theme.badge}`} style={{ fontSize: '0.68rem', padding: '0.2rem 0.65rem' }}>
                      {theme.badgeText}
                    </span>
                  </div>

                  <h3 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--toy-ink)', marginBottom: '0.4rem' }}>
                    {item.label}
                  </h3>

                  <p style={{ color: 'var(--toy-muted)', fontSize: '0.88rem', lineHeight: '1.45', fontWeight: 600 }}>
                    {item.description}
                  </p>
                </div>

                <div style={{ marginTop: '1.4rem', paddingTop: '1rem', borderTop: '1.5px solid var(--toy-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--toy-orange)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>Entrar al módulo</span>
                    <ArrowRight size={15} strokeWidth={2.4} />
                  </span>
                  <button
                    type="button"
                    className="btn btn-toy-orange btn-sm"
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
