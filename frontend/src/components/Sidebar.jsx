import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, ShieldCheck, UserCheck, Boxes, Package } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export const MENU_ITEMS = [
  {
    path: '/inicio',
    label: 'Inicio',
    IconComponent: Home,
    permission: null,
    description: 'Resumen general y accesos rápidos'
  },
  {
    path: '/usuarios',
    label: 'Usuarios',
    IconComponent: Users,
    permission: 'usuarios.gestionar',
    description: 'Gestión de personal y cuentas de acceso'
  },
  {
    path: '/roles',
    label: 'Roles y Permisos',
    IconComponent: ShieldCheck,
    permission: 'roles.gestionar',
    description: 'Control de accesos y matriz de privilegios'
  },
  {
    path: '/clientes',
    label: 'Clientes',
    IconComponent: UserCheck,
    permission: 'clientes.consultar',
    description: 'Directorio de clientes y registro fiscal'
  },
  {
    path: '/productos',
    label: 'Productos',
    IconComponent: Boxes,
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
        <div className="brand-icon">
          <Package size={24} strokeWidth={2.2} />
        </div>
        <div>
          <div className="brand-title">Juguetería DB</div>
          <div className="brand-subtitle">Análisis II · Sprint 1</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {permittedItems.map((item) => {
          const Icon = item.IconComponent;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span className="nav-icon">
                <Icon size={19} strokeWidth={2} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div style={{ padding: '1rem 1.4rem', borderTop: '1.5px solid var(--border-subtle)', fontSize: '0.76rem', color: 'var(--color-dim)', fontWeight: 600 }}>
        Versión 0.1.0-sprint1
      </div>
    </aside>
  );
}
