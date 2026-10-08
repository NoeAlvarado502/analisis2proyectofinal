import React from 'react';
import { useNavigate } from 'react-router-dom';
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
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.08))',
          borderColor: 'rgba(99, 102, 241, 0.3)',
          marginBottom: '2rem',
          padding: '2rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span
              style={{
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--accent-cyan)',
                fontWeight: 700
              }}
            >
              Entrega 1 · Sprint 1 (20%)
            </span>
            <h1 style={{ fontSize: '1.85rem', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
              ¡Hola, {user?.nombre_completo || 'Usuario'}! 👋
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '650px' }}>
              Has iniciado sesión con el rol <strong style={{ color: 'var(--text-main)' }}>{user?.rol}</strong>. A continuación se presentan los módulos a los que tienes acceso según la matriz de permisos de seguridad RBAC.
            </p>
          </div>

          <div
            style={{
              padding: '1rem 1.5rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
              Tu Rol Activo
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.2rem' }}>
              {user?.rol}
            </div>
          </div>
        </div>
      </div>

      {/* Permitted Modules Grid */}
      <div>
        <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>Módulos Habilitados</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Selecciona un módulo para comenzar a operar.
        </p>

        <div className="module-grid">
          {permittedModules.map((item) => (
            <div
              key={item.path}
              className="module-card"
              onClick={() => navigate(item.path)}
            >
              <div>
                <div style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>{item.icon}</div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.35rem' }}>{item.label}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                  {item.description}
                </p>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                  Abrir módulo →
                </span>
                {item.permission && (
                  <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                    {item.permission}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sprint 1 Scope & Business Rules status card */}
      <div
        className="card"
        style={{
          marginTop: '2.5rem',
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="card-header">
          <h3 className="card-title">Reglas de Negocio en Ejecución (Motor de Base de Datos)</h3>
          <span className="badge badge-success">Auditado & Protegido</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
            <strong style={{ color: 'var(--accent-cyan)' }}>RN01:</strong> No sobreventa (bloqueo por inventario).
          </div>
          <div style={{ padding: '0.75rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
            <strong style={{ color: 'var(--accent-cyan)' }}>RN04:</strong> Inactivación lógica en lugar de DELETE.
          </div>
          <div style={{ padding: '0.75rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
            <strong style={{ color: 'var(--accent-cyan)' }}>RN05:</strong> Correo y SKU únicos e inmutables.
          </div>
          <div style={{ padding: '0.75rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
            <strong style={{ color: 'var(--accent-cyan)' }}>RBAC:</strong> Trazabilidad mediante variable @usuario_actual.
          </div>
        </div>
      </div>
    </div>
  );
}
