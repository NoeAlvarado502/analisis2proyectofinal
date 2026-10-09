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

  const getModuleCheckerClass = (path) => {
    switch (path) {
      case '/productos':
        return 'bg-checker-blue';
      case '/clientes':
        return 'bg-checker-gold';
      case '/usuarios':
        return 'bg-checker-purple';
      case '/roles':
        return 'bg-checker-blue';
      default:
        return 'bg-checker-blue';
    }
  };

  return (
    <div>
      {/* Living Design System Hero Banner */}
      <div
        className="toy-cardboard-pack"
        style={{
          background: 'linear-gradient(135deg, var(--toy-blue), var(--toy-deep-blue))',
          color: '#FFFFFF',
          padding: '2.2rem 2.4rem',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '2.2rem',
          border: '2px solid rgba(255, 255, 255, 0.35)',
          boxShadow: '0 12px 30px rgba(8, 123, 181, 0.28)'
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: '-40px',
            bottom: '-40px',
            width: '260px',
            height: '260px',
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
                fontWeight: 900,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                marginBottom: '0.75rem'
              }}
            >
              <Sparkles size={14} color="var(--toy-yellow)" />
              <span>Panel Operativo Oficial &middot; Juguetería Quetzal</span>
            </div>

            <h1 className="font-display" style={{ fontSize: '2.2rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em', lineHeight: 1.15 }}>
              ¡Hola, {user?.nombre_completo || 'Usuario'}!
            </h1>

            <p style={{ color: 'rgba(255, 255, 255, 0.92)', fontSize: '0.98rem', fontWeight: 600, maxWidth: '650px', marginTop: '0.45rem' }}>
              Has iniciado sesión con el rol <strong style={{ color: 'var(--toy-yellow)' }}>{user?.rol}</strong>. Todos los módulos habilitados para tu cuenta se encuentran listos para operar.
            </p>
          </div>

          <div
            style={{
              padding: '1.1rem 1.6rem',
              borderRadius: '20px',
              backgroundColor: '#FFFFFF',
              border: '2px solid var(--toy-border)',
              textAlign: 'center',
              boxShadow: '0 8px 24px rgba(8, 123, 181, 0.22)'
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
          <span style={{ width: '12px', height: '12px', borderRadius: '999px', backgroundColor: 'var(--toy-blue)', display: 'inline-block' }} />
          <h2 className="font-display" style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--toy-ink)' }}>
            Módulos Habilitados
          </h2>
        </div>
        <p style={{ color: 'var(--toy-muted)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '1.4rem' }}>
          Selecciona una sección para gestionar el catálogo, permisos o clientes registrados.
        </p>

        <div className="module-grid">
          {permittedModules.map((item) => {
            const Icon = item.IconComponent;
            const checkerClass = getModuleCheckerClass(item.path);

            return (
              <div
                key={item.path}
                className="toy-cardboard-pack"
                onClick={() => navigate(item.path)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: '#FFFFFF',
                  border: '2px solid var(--toy-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                {/* Packaging Header Strip with Euro Hanger */}
                <div className={checkerClass} style={{ padding: '0.85rem 1rem 0.75rem', textAlign: 'center' }}>
                  <div className="euro-hanger-punch" />
                </div>

                {/* Card Content */}
                <div style={{ padding: '1.4rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '16px',
                        backgroundColor: 'rgba(25, 168, 232, 0.12)',
                        border: '2px solid rgba(25, 168, 232, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--toy-deep-blue)',
                        marginBottom: '1rem'
                      }}
                    >
                      <Icon size={26} strokeWidth={2.4} />
                    </div>

                    <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--toy-ink)', marginBottom: '0.35rem' }}>
                      {item.label}
                    </h3>

                    <p style={{ color: 'var(--toy-muted)', fontSize: '0.88rem', lineHeight: '1.45', fontWeight: 600 }}>
                      {item.description}
                    </p>
                  </div>

                  <div style={{ marginTop: '1.4rem', paddingTop: '1rem', borderTop: '1.5px solid var(--toy-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--toy-blue)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>Acceder</span>
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
