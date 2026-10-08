import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export const MENU_ITEMS = [
  {
    path: '/inicio',
    label: 'Inicio',
    icon: '🏠',
    permission: null,
    description: 'Resumen general y accesos rápidos'
  },
  {
    path: '/usuarios',
    label: 'Usuarios',
    icon: '👥',
    permission: 'usuarios.gestionar',
    description: 'Gestión de personal y cuentas de acceso'
  },
  {
    path: '/roles',
    label: 'Roles y Permisos',
    icon: '🛡️',
    permission: 'roles.gestionar',
    description: 'Control de accesos y matriz de privilegios'
  },
  {
    path: '/clientes',
    label: 'Clientes',
    icon: '🤝',
    permission: 'clientes.consultar',
    description: 'Directorio de clientes y registro fiscal'
  },
  {
    path: '/productos',
    label: 'Productos',
    icon: '🧸',
    permission: 'productos.consultar',
    description: 'Catálogo de juguetes, precios escalables y stock'
  }
];

export default function Sidebar() {
  const { can } = useAuth();

  const permittedItems = MENU_ITEMS.filter(
    (item) => !item.permission || can(item.permission)
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-icon">🧸</div>
        <div>
          <div className="brand-title">Juguetería DB</div>
          <div className="brand-subtitle">Análisis II · Sprint 1</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {permittedItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
        Versión 0.1.0-sprint1
      </div>
    </aside>
  );
}
