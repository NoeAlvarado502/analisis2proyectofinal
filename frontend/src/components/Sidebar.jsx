import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, ShieldCheck, UserCheck, Boxes, ToyBrick, Building2, ShoppingBag, ClipboardList } from 'lucide-react';
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
  },
  {
    path: '/proveedores',
    label: 'Proveedores',
    IconComponent: Building2,
    permission: ['proveedores.gestionar', 'compras.registrar'],
    description: 'Directorio de proveedores y abastecimiento'
  },
  {
    path: '/compras',
    label: 'Compras',
    IconComponent: ShoppingBag,
    permission: ['compras.registrar', 'compras.recibir', 'inventario.consultar'],
    description: 'Órdenes de compra y recepción de mercadería'
  },
  {
    path: '/inventario',
    label: 'Inventario',
    IconComponent: ClipboardList,
    permission: 'inventario.consultar',
    description: 'Existencias, kardex de movimientos y alertas de stock'
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
          <ToyBrick size={26} strokeWidth={2.4} />
        </div>
        <div className="flex items-center">
          <span className="brand-title">
            JUGUETERÍA QUETZAL
          </span>
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
                <Icon size={22} strokeWidth={2.4} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
