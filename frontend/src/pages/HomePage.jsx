import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Clock, ShieldAlert } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { MENU_ITEMS } from '../components/Sidebar';

export default function HomePage() {
  const { can } = useAuth();
  const navigate = useNavigate();

  const [alertasActivas, setAlertasActivas] = useState(0);
  const [pedidosPendientes, setPedidosPendientes] = useState(0);

  // Consulta de indicadores del dashboard y alertas
  useEffect(() => {
    // 1. Alertas de inventario
    if (can('inventario.consultar')) {
      api.get('/inventario/alertas')
        .then((res) => {
          if (res?.data) {
            setAlertasActivas(res.data.total_alertas_activas || 0);
          }
        })
        .catch((err) => {
          console.warn('No se pudieron consultar alertas en Home:', err);
        });
    }

    // 2. Dashboard consolidado (pedidos pendientes de aprobación)
    api.get('/reportes/dashboard')
      .then((res) => {
        if (res?.data?.indicadores?.pedidos_pendientes_aprobacion !== undefined) {
          setPedidosPendientes(parseInt(res.data.indicadores.pedidos_pendientes_aprobacion, 10) || 0);
        }
      })
      .catch((err) => {
        console.warn('No se pudieron consultar indicadores de dashboard:', err);
      });
  }, [can]);

  // Filtrar módulos del menú excluyendo /inicio
  const permittedModules = MENU_ITEMS.filter(
    (item) => item.path !== '/inicio' && (!item.permission || can(item.permission))
  );

  const getModuleTheming = (path) => {
    switch (path) {
      case '/pedidos':
        return {
          bg: 'rgba(25, 168, 232, 0.12)',
          color: 'var(--toy-deep-blue)',
          border: 'rgba(25, 168, 232, 0.28)',
          badge: 'badge-primary',
          badgeText: 'Ventas y Mayoreo'
        };
      case '/ventas':
        return {
          bg: 'rgba(116, 201, 91, 0.15)',
          color: 'var(--toy-green-dark)',
          border: 'rgba(116, 201, 91, 0.3)',
          badge: 'badge-success',
          badgeText: 'Cobranza'
        };
      case '/reportes':
        return {
          bg: 'rgba(131, 102, 217, 0.15)',
          color: 'var(--toy-purple-dark)',
          border: 'rgba(131, 102, 217, 0.3)',
          badge: 'badge-purple',
          badgeText: 'Estadísticas'
        };
      case '/auditoria':
        return {
          bg: 'rgba(15, 118, 110, 0.12)',
          color: '#0F766E',
          border: 'rgba(15, 118, 110, 0.28)',
          badge: 'badge-info',
          badgeText: 'Trazabilidad'
        };
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
      case '/proveedores':
        return {
          bg: 'rgba(255, 157, 46, 0.12)',
          color: 'var(--toy-orange-dark)',
          border: 'rgba(255, 157, 46, 0.28)',
          badge: 'badge-warning',
          badgeText: 'Abastecimiento'
        };
      case '/compras':
        return {
          bg: 'rgba(25, 168, 232, 0.12)',
          color: 'var(--toy-deep-blue)',
          border: 'rgba(25, 168, 232, 0.28)',
          badge: 'badge-primary',
          badgeText: 'Compras'
        };
      case '/inventario':
        return {
          bg: 'rgba(241, 91, 74, 0.12)',
          color: 'var(--toy-red-dark)',
          border: 'rgba(241, 91, 74, 0.28)',
          badge: 'badge-danger',
          badgeText: 'Inventario'
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Banner 1: Alerta para Supervisor de Pedidos Pendientes de Aprobación */}
      {pedidosPendientes > 0 && can('pedidos.autorizar_descuento') && (
        <div
          onClick={() => navigate('/pedidos', { state: { filterEstado: 'PENDIENTE_APROBACION' } })}
          style={{
            backgroundColor: '#FFFFFF',
            border: '2px solid var(--toy-orange)',
            borderRadius: '20px',
            padding: '1rem 1.35rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(255, 157, 46, 0.18)',
            transition: 'transform 0.16s ease, box-shadow 0.16s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(255, 157, 46, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 157, 46, 0.18)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.95rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                backgroundColor: 'rgba(255, 157, 46, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Clock size={24} color="var(--toy-orange-dark)" strokeWidth={2.4} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
                ¡Atención Supervisor! Hay {pedidosPendientes} pedido{pedidosPendientes > 1 ? 's' : ''} pendiente{pedidosPendientes > 1 ? 's' : ''} de autorización
              </h4>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.84rem', color: 'var(--toy-muted)', fontWeight: 600 }}>
                Exceden el descuento máximo sin autorización (10%). Haz clic para revisar y autorizar o cancelar.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-warning btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/pedidos', { state: { filterEstado: 'PENDIENTE_APROBACION' } });
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              flexShrink: 0,
              backgroundColor: 'var(--toy-orange)',
              color: '#FFFFFF'
            }}
          >
            <span>Revisar Pedidos</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Banner 2: Alerta de Inventario Crítico */}
      {alertasActivas > 0 && (
        <div
          onClick={() => navigate('/inventario', { state: { activeTab: 'alertas', filterEstadoAlerta: 'ACTIVA' } })}
          style={{
            backgroundColor: '#FFFFFF',
            border: '2px solid var(--toy-red)',
            borderRadius: '20px',
            padding: '1rem 1.35rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(241, 91, 74, 0.15)',
            transition: 'transform 0.16s ease, box-shadow 0.16s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(241, 91, 74, 0.22)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(241, 91, 74, 0.15)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.95rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                backgroundColor: 'rgba(241, 91, 74, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={24} color="var(--toy-red)" strokeWidth={2.4} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
                ¡Atención! {alertasActivas} producto{alertasActivas > 1 ? 's' : ''} en nivel crítico de inventario
              </h4>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.84rem', color: 'var(--toy-muted)', fontWeight: 600 }}>
                Las existencias están iguales o por debajo del stock mínimo. Haz clic para revisar las alertas y abastecer.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/inventario', { state: { activeTab: 'alertas', filterEstadoAlerta: 'ACTIVA' } });
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}
          >
            <span>Ver Alertas</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Grid de Módulos */}
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
    </div>
  );
}
