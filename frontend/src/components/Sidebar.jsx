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
            <span className="brand-subtitle" style={{ margin: 0 }}>
              Sistema de Gestión
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
    </aside>
  );
}
