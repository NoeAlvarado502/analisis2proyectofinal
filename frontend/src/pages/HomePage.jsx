import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { MENU_ITEMS } from '../components/Sidebar';

export default function HomePage() {
  const { can } = useAuth();
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
                  gap: '0.85rem',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <Icon size={26} strokeWidth={2.4} style={{ color: theme.color, flexShrink: 0 }} />

                  <h3
                    className="font-display"
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: 'var(--toy-ink)',
                      margin: 0,
                      lineHeight: 1.25
                    }}
                  >
                    {item.label}
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div>
                    <span className={`badge ${theme.badge}`} style={{ fontSize: '0.68rem', padding: '0.2rem 0.6rem' }}>
                      {theme.badgeText}
                    </span>
                  </div>

                  <p style={{ color: 'var(--toy-muted)', fontSize: '0.84rem', lineHeight: '1.45', fontWeight: 600, margin: 0 }}>
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
  );
}
