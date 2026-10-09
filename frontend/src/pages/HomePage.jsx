import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, CheckCircle2, Shield } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { MENU_ITEMS } from '../components/Sidebar';

export default function HomePage() {
  const { user, can } = useAuth();
  const navigate = useNavigate();

  // Filter modules excluding /inicio
  const permittedModules = MENU_ITEMS.filter(
    (item) => item.path !== '/inicio' && (!item.permission || can(item.permission))
  );

  return (
    <div>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 244, 221, 0.95), rgba(25, 168, 232, 0.12))',
          borderColor: 'rgba(25, 168, 232, 0.25)',
          marginBottom: '2.2rem',
          padding: '2.2rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <span
              style={{
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-primary-strong)',
                fontWeight: 800
              }}
            >
              Juguetería Quetzal
            </span>
            <h1 style={{ fontSize: '2rem', marginTop: '0.35rem', marginBottom: '0.5rem', color: 'var(--color-ink)' }}>
              Bienvenido, {user?.nombre_completo || 'Usuario'}
            </h1>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.96rem', maxWidth: '680px', fontWeight: 500 }}>
              Has iniciado sesión con el rol <strong style={{ color: 'var(--color-ink)' }}>{user?.rol}</strong>. A continuación se presentan los módulos habilitados según la matriz de seguridad.
            </p>
          </div>

          <div
            style={{
              padding: '1.1rem 1.6rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: '#ffffff',
              border: '1.5px solid var(--border-subtle)',
              textAlign: 'center',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ fontSize: '0.74rem', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Perfil Operativo
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-primary-strong)', marginTop: '0.2rem' }}>
              {user?.rol}
            </div>
          </div>
        </div>
      </div>

      {/* Permitted Modules Grid */}
      <div>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.4rem', color: 'var(--color-ink)' }}>Módulos Habilitados</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1.4rem' }}>
          Selecciona una sección para acceder a la gestión correspondiente.
        </p>

        <div className="module-grid">
          {permittedModules.map((item) => {
            const Icon = item.IconComponent;
            return (
              <div
                key={item.path}
                className="module-card"
                onClick={() => navigate(item.path)}
              >
                <div>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(25, 168, 232, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-primary-strong)',
                      marginBottom: '1.1rem'
                    }}
                  >
                    <Icon size={26} strokeWidth={2} />
                  </div>
                  <h3 style={{ fontSize: '1.24rem', marginBottom: '0.4rem', color: 'var(--color-ink)' }}>
                    {item.label}
                  </h3>
                  <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem', lineHeight: '1.45', fontWeight: 500 }}>
                    {item.description}
                  </p>
                </div>

                <div style={{ marginTop: '1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>Abrir módulo</span>
                    <ArrowRight size={15} strokeWidth={2.2} />
                  </span>
                  {item.permission && (
                    <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>
                      {item.permission}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
