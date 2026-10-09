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
    description: 'Configuración de perfiles y permisos de usuario'
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
          <Package size={24} strokeWidth={2.4} />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="brand-title">
              JUGUETERÍA <span style={{ color: 'var(--toy-blue)' }}>QUETZAL</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
              ERP CO.
            </span>
            <span className="brand-subtitle" style={{ margin: 0 }}>
              Gestión &amp; Stock
            </span>
          </div>
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
                <Icon size={19} strokeWidth={2.2} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div style={{ padding: '0.9rem 1.1rem' }}>
        <div
          style={{
            padding: '0.75rem 0.95rem',
            borderRadius: '16px',
            backgroundColor: 'rgba(255, 244, 221, 0.7)',
            border: '1.5px solid var(--toy-border)',
            fontSize: '0.75rem',
            fontWeight: 800,
            color: 'var(--toy-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '999px',
              backgroundColor: 'var(--toy-green)',
              display: 'inline-block'
            }}
          />
          <span>Sistema Activo &middot; v1.0</span>
        </div>
      </div>
    </aside>
  );
}
