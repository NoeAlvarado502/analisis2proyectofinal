import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Clock,
  AlertTriangle,
  UserCheck,
  Sliders
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useSearch } from '../context/SearchContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import { MENU_ITEMS } from '../components/Sidebar';

const formatMoney = (amount) => {
  const num = Number(amount) || 0;
  return `Q ${num.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function HomePage() {
  const { can } = useAuth();
  const { query, clearQuery } = useSearch();
  const navigate = useNavigate();
  const toast = useToast();

  const [dashboardData, setDashboardData] = useState({
    indicadores: {
      ventas_del_mes: 0,
      compras_del_mes: 0,
      pedidos_pendientes_aprobacion: 0,
      productos_en_alerta: 0,
      por_cobrar: 0,
      clientes_activos: 0
    },
    ventas_por_mes: [],
    top_productos: [],
    alertas_stock: [],
    pedidos_pendientes: []
  });

  const [alertasActivas, setAlertasActivas] = useState(0);
  const [pedidosPendientes, setPedidosPendientes] = useState(0);

  // Configuración de Descuento Máximo (RN07) - Solo para roles con configuracion.gestionar
  const canConfig = can('configuracion.gestionar');
  const [descuentoMaxConfig, setDescuentoMaxConfig] = useState('10.00');
  const [nuevoDescuento, setNuevoDescuento] = useState('10');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  // Carga de datos del Dashboard y Alertas adaptados a los permisos del rol
  const cargarDatosRol = useCallback(async () => {
    // 1. Datos consolidados de negocio
    try {
      const res = await api.get('/reportes/dashboard');
      if (res?.data) {
        setDashboardData(res.data);
        if (res.data.indicadores?.pedidos_pendientes_aprobacion !== undefined) {
          setPedidosPendientes(parseInt(res.data.indicadores.pedidos_pendientes_aprobacion, 10) || 0);
        }
        if (res.data.indicadores?.productos_en_alerta !== undefined) {
          setAlertasActivas(parseInt(res.data.indicadores.productos_en_alerta, 10) || 0);
        }
      }
    } catch (err) {
      console.warn('No se pudieron consultar indicadores de dashboard:', err);
    }

    // 2. Alertas específicas de inventario
    if (can('inventario.consultar')) {
      try {
        const resAlertas = await api.get('/inventario/alertas');
        if (resAlertas?.data?.total_alertas_activas !== undefined) {
          setAlertasActivas(resAlertas.data.total_alertas_activas);
        }
      } catch (err) {
        console.warn('No se pudieron consultar alertas de inventario:', err);
      }
    }

    // 3. Parámetro de configuración (si el rol puede gestionar configuración)
    if (canConfig) {
      try {
        const resCfg = await api.get('/configuraciones/DESCUENTO_MAX_SIN_AUTORIZACION');
        if (resCfg?.data?.valor) {
          setDescuentoMaxConfig(resCfg.data.valor);
          setNuevoDescuento(String(parseInt(resCfg.data.valor, 10) || 10));
        }
      } catch (err) {
        console.warn('No se pudo cargar configuración:', err);
      }
    }
  }, [can, canConfig]);

  useEffect(() => {
    cargarDatosRol();
  }, [cargarDatosRol]);

  // Guardado seguro del límite de descuento: Estrictamente enteros [0, 100]
  const handleGuardarConfig = async (e) => {
    e.preventDefault();
    const cleanStr = nuevoDescuento.trim();
    if (cleanStr === '') {
      toast.error('Debes ingresar un porcentaje válido');
      return;
    }

    const num = parseInt(cleanStr, 10);
    if (isNaN(num) || num < 0 || num > 100) {
      toast.error('El valor debe ser un número entero entre 0 y 100%');
      return;
    }

    setGuardandoConfig(true);
    try {
      const res = await api.put('/configuraciones/DESCUENTO_MAX_SIN_AUTORIZACION', {
        valor: num.toFixed(2)
      });
      if (res?.data) {
        setDescuentoMaxConfig(res.data.valor);
        toast.success(`Límite de descuento actualizado a ${parseInt(res.data.valor, 10)}%`);
        setConfigModalOpen(false);
        cargarDatosRol();
      }
    } catch (err) {
      toast.error(err.message || 'Error al guardar configuración');
    } finally {
      setGuardandoConfig(false);
    }
  };

  const ind = dashboardData.indicadores || {};
  const ventasMes = dashboardData.ventas_por_mes || [];
  const topProd = dashboardData.top_productos || [];
  const alertasStock = dashboardData.alertas_stock || [];
  const pedidosPendientesList = dashboardData.pedidos_pendientes || [];

  // Escala para gráfica de ventas
  const maxVentaMes = useMemo(() => {
    if (ventasMes.length === 0) return 1000;
    const max = Math.max(...ventasMes.map((v) => parseFloat(v.monto) || 0));
    return max > 0 ? max : 1000;
  }, [ventasMes]);

  // Escala para productos top
  const maxIngresoTop = useMemo(() => {
    if (topProd.length === 0) return 1000;
    const max = Math.max(...topProd.map((p) => parseFloat(p.ingresos) || 0));
    return max > 0 ? max : 1000;
  }, [topProd]);

  // Indicadores autopersonalizados estrictamente por permisos del rol
  const roleKpis = useMemo(() => {
    const list = [];

    if (can('ventas.registrar') || can('reportes.consultar')) {
      list.push({
        id: 'ventas',
        label: 'Ventas del Mes',
        value: formatMoney(ind.ventas_del_mes),
        icon: TrendingUp,
        color: 'var(--toy-blue)',
        bg: 'rgba(25, 168, 232, 0.12)',
        path: '/ventas'
      });
    }

    if (can('compras.registrar') || can('compras.recibir') || can('reportes.consultar')) {
      list.push({
        id: 'compras',
        label: 'Compras del Mes',
        value: formatMoney(ind.compras_del_mes),
        icon: ShoppingBag,
        color: 'var(--toy-orange)',
        bg: 'rgba(255, 157, 46, 0.12)',
        path: '/compras'
      });
    }

    if (can('pagos.registrar') || can('ventas.registrar')) {
      list.push({
        id: 'por_cobrar',
        label: 'Por Cobrar',
        value: formatMoney(ind.por_cobrar),
        icon: DollarSign,
        color: 'var(--toy-red)',
        bg: 'rgba(241, 91, 74, 0.12)',
        path: '/ventas'
      });
    }

    if (can('pedidos.autorizar_descuento')) {
      list.push({
        id: 'pedidos_pendientes',
        label: 'Por Autorizar',
        value: String(ind.pedidos_pendientes_aprobacion || 0),
        badge: Number(ind.pedidos_pendientes_aprobacion) > 0 ? 'Pendientes' : null,
        badgeClass: 'badge-warning',
        icon: Clock,
        color: 'var(--toy-orange-dark)',
        bg: 'rgba(255, 212, 90, 0.25)',
        path: '/pedidos',
        state: { filterEstado: 'PENDIENTE_APROBACION' }
      });
    }

    if (can('inventario.consultar')) {
      list.push({
        id: 'stock_bajo',
        label: 'Stock Bajo',
        value: String(ind.productos_en_alerta || 0),
        badge: Number(ind.productos_en_alerta) > 0 ? 'Alerta' : null,
        badgeClass: 'badge-danger',
        icon: AlertTriangle,
        color: 'var(--toy-red)',
        bg: 'rgba(241, 91, 74, 0.12)',
        path: '/inventario',
        state: { activeTab: 'alertas', filterEstadoAlerta: 'ACTIVA' }
      });
    }

    if (can('clientes.consultar')) {
      list.push({
        id: 'clientes',
        label: 'Clientes Activos',
        value: String(ind.clientes_activos || 0),
        icon: UserCheck,
        color: 'var(--toy-green-dark)',
        bg: 'rgba(116, 201, 91, 0.12)',
        path: '/clientes'
      });
    }

    return list;
  }, [can, ind]);

  // Theming visual sobrio para cada tarjeta de módulo de acceso rápido
  const getModuleTheming = (path) => {
    switch (path) {
      case '/pedidos':
        return {
          bg: 'rgba(25, 168, 232, 0.12)',
          color: 'var(--toy-deep-blue)',
          badge: 'badge-primary',
          badgeText: 'Ventas y Mayoreo'
        };
      case '/ventas':
        return {
          bg: 'rgba(116, 201, 91, 0.15)',
          color: 'var(--toy-green-dark)',
          badge: 'badge-success',
          badgeText: 'Cobranza'
        };
      case '/inventario':
        return {
          bg: 'rgba(241, 91, 74, 0.12)',
          color: 'var(--toy-red)',
          badge: 'badge-danger',
          badgeText: 'Inventario'
        };
      case '/compras':
        return {
          bg: 'rgba(255, 157, 46, 0.12)',
          color: 'var(--toy-orange-dark)',
          badge: 'badge-warning',
          badgeText: 'Abastecimiento'
        };
      case '/productos':
        return {
          bg: 'rgba(25, 168, 232, 0.12)',
          color: 'var(--toy-deep-blue)',
          badge: 'badge-primary',
          badgeText: 'Catálogo'
        };
      case '/clientes':
        return {
          bg: 'rgba(116, 201, 91, 0.15)',
          color: 'var(--toy-green-dark)',
          badge: 'badge-success',
          badgeText: 'Directorio'
        };
      case '/proveedores':
        return {
          bg: 'rgba(255, 157, 46, 0.12)',
          color: 'var(--toy-orange-dark)',
          badge: 'badge-warning',
          badgeText: 'Proveedores'
        };
      case '/reportes':
        return {
          bg: 'rgba(131, 102, 217, 0.15)',
          color: 'var(--toy-purple-dark)',
          badge: 'badge-purple',
          badgeText: 'Estadísticas'
        };
      case '/auditoria':
        return {
          bg: 'rgba(15, 118, 110, 0.12)',
          color: '#0F766E',
          badge: 'badge-info',
          badgeText: 'Trazabilidad'
        };
      case '/usuarios':
        return {
          bg: 'rgba(131, 102, 217, 0.15)',
          color: 'var(--toy-purple-dark)',
          badge: 'badge-purple',
          badgeText: 'Personal'
        };
      case '/roles':
        return {
          bg: 'rgba(15, 118, 110, 0.12)',
          color: '#0F766E',
          badge: 'badge-info',
          badgeText: 'Seguridad'
        };
      default:
        return {
          bg: 'rgba(25, 168, 232, 0.12)',
          color: 'var(--toy-deep-blue)',
          badge: 'badge-primary',
          badgeText: 'Módulo'
        };
    }
  };

  // Módulos con permisos según el rol actual del usuario autenticado
  const permittedModules = useMemo(() => {
    const base = MENU_ITEMS.filter(
      (item) => item.path !== '/inicio' && (!item.permission || can(item.permission))
    );
    if (!query.trim()) return base;
    const qLower = query.toLowerCase().trim();
    return base.filter(
      (item) =>
        item.label.toLowerCase().includes(qLower) ||
        (item.description && item.description.toLowerCase().includes(qLower))
    );
  }, [can, query]);

  const canViewReports = can('reportes.consultar') || can('ventas.registrar');
  const canViewStock = can('inventario.consultar');
  const canAuthorizeOrders = can('pedidos.autorizar_descuento');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      {/* Barra de Título Superior */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.85rem'
        }}
      >
        <h1
          className="font-display"
          style={{
            fontSize: '1.65rem',
            fontWeight: 800,
            color: 'var(--toy-ink)',
            margin: 0
          }}
        >
          Inicio
        </h1>

        {canConfig && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setNuevoDescuento(String(parseInt(descuentoMaxConfig, 10) || 10));
              setConfigModalOpen(true);
            }}
            title="Configurar límite de descuento sin autorización"
          >
            <Sliders size={14} color="var(--toy-orange)" />
            <span>Descuento máx: <strong>{parseInt(descuentoMaxConfig, 10) || 10}%</strong></span>
          </button>
        )}
      </div>

      {/* Resultados de Búsqueda Destacados en Inicio (por encima de los KPIs) */}
      {query.trim() && (
        <div
          className="card"
          style={{
            padding: '1.25rem',
            backgroundColor: '#FFFFFF',
            border: '2px solid var(--toy-blue)',
            borderRadius: '20px',
            boxShadow: '0 8px 24px rgba(25, 168, 232, 0.14)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h3 className="card-title" style={{ fontSize: '1.05rem', margin: 0, color: 'var(--toy-ink)' }}>
                Resultados para "{query.trim()}"
              </h3>
              <span className="badge badge-primary">
                {permittedModules.length} {permittedModules.length === 1 ? 'módulo' : 'módulos'}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => clearQuery()}
              style={{ fontSize: '0.8rem' }}
            >
              Limpiar búsqueda
            </button>
          </div>

          {permittedModules.length > 0 ? (
            <div className="module-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
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
                      backgroundColor: '#FAF8F5',
                      border: '1.5px solid var(--toy-border)',
                      borderRadius: '16px',
                      padding: '1rem 1.15rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.borderColor = 'var(--toy-blue)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.borderColor = 'var(--toy-border)';
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        backgroundColor: theme.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Icon size={20} color={theme.color} strokeWidth={2.4} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--toy-ink)' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--toy-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '0.75rem 0', color: 'var(--toy-muted)', fontSize: '0.88rem' }}>
              No se encontraron accesos con el nombre "{query.trim()}". Puedes buscar directamente en los registros:
            </div>
          )}

          {/* Accesos directos a buscar ese término en los módulos clave */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              paddingTop: '0.65rem',
              borderTop: '1px solid var(--toy-border-light)',
              flexWrap: 'wrap'
            }}
          >
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--toy-muted)' }}>
              Buscar en registros:
            </span>
            {can('productos.consultar') && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/productos')}
                style={{ fontSize: '0.78rem', height: '30px' }}
              >
                En Productos →
              </button>
            )}
            {(can('pedidos.crear') || can('pedidos.autorizar_descuento')) && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/pedidos')}
                style={{ fontSize: '0.78rem', height: '30px' }}
              >
                En Pedidos →
              </button>
            )}
            {(can('ventas.registrar') || can('reportes.consultar')) && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/ventas')}
                style={{ fontSize: '0.78rem', height: '30px' }}
              >
                En Ventas →
              </button>
            )}
            {can('inventario.consultar') && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/inventario')}
                style={{ fontSize: '0.78rem', height: '30px' }}
              >
                En Inventario →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Indicadores Clave Autopersonalizados por Rol */}
      {roleKpis.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
            gap: '0.85rem'
          }}
        >
          {roleKpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.id}
                className="card"
                onClick={() => navigate(kpi.path, { state: kpi.state })}
                style={{
                  padding: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.55rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--toy-muted)', fontWeight: 800 }}>
                    {kpi.label}
                  </span>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={15} color={kpi.color} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--toy-ink)', fontFamily: 'var(--font-display)' }}>
                    {kpi.value}
                  </span>
                  {kpi.badge && (
                    <span className={`badge ${kpi.badgeClass}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                      {kpi.badge}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Gráficas Principales (solo para roles con permisos de reportes o ventas) */}
      {canViewReports && (ventasMes.length > 0 || topProd.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.15rem' }}>
          {/* Gráfica 1: Ventas del Año */}
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title" style={{ fontSize: '1rem', margin: 0 }}>
                Ventas del Año
              </h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Mes a mes</span>
            </div>

            {ventasMes.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--toy-muted)', fontSize: '0.82rem' }}>
                No hay ventas registradas en el período
              </div>
            ) : (
              <div style={{ width: '100%', height: '170px' }}>
                <svg viewBox="0 0 500 170" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  <line x1="40" y1="20" x2="490" y2="20" stroke="#F0E8D9" strokeDasharray="3 3" />
                  <line x1="40" y1="75" x2="490" y2="75" stroke="#F0E8D9" strokeDasharray="3 3" />
                  <line x1="40" y1="130" x2="490" y2="130" stroke="#E6D7BD" strokeWidth="1.5" />

                  {ventasMes.map((item, idx) => {
                    const x = 55 + idx * (420 / Math.max(ventasMes.length, 1));
                    const monto = parseFloat(item.monto) || 0;
                    const barH = (monto / maxVentaMes) * 105;
                    const y = 130 - barH;
                    const label = String(item.mes).slice(5);

                    return (
                      <g key={item.mes || idx}>
                        <rect
                          x={x}
                          y={y}
                          width="26"
                          height={Math.max(barH, 3)}
                          rx="4"
                          fill="var(--toy-blue)"
                          style={{ transition: 'all 0.2s ease' }}
                        >
                          <title>{`${item.mes}: Q${monto.toFixed(2)} (${item.ventas ?? item.cantidad_ventas ?? 0} ventas)`}</title>
                        </rect>
                        <text x={x + 13} y="148" textAnchor="middle" fontSize="10" fill="var(--toy-muted)" fontWeight="700">
                          {label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>

          {/* Gráfica 2: Top 5 Productos */}
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title" style={{ fontSize: '1rem', margin: 0 }}>
                Top 5 Productos
              </h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Más vendidos</span>
            </div>

            {topProd.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--toy-muted)', fontSize: '0.82rem' }}>
                No hay ventas de productos registradas
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {topProd.slice(0, 5).map((p, idx) => {
                  const totalIngresos = parseFloat(p.ingresos) || 0;
                  const pct = maxIngresoTop > 0 ? (totalIngresos / maxIngresoTop) * 100 : 0;
                  return (
                    <div key={p.id_producto || idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--toy-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>
                          {idx + 1}. {p.nombre}
                        </span>
                        <span style={{ fontWeight: 800, color: 'var(--toy-ink)' }}>
                          {formatMoney(totalIngresos)}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#F0E8D9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.max(pct, 4)}%`,
                            height: '100%',
                            backgroundColor: idx === 0 ? 'var(--toy-orange)' : 'var(--toy-blue)',
                            borderRadius: '4px',
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Paneles de Atención (solo para roles con permisos para actuar en ellos) */}
      {(canViewStock || canAuthorizeOrders) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.15rem' }}>
          {/* Panel 1: Alertas de Stock */}
          {canViewStock && (
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 className="card-title" style={{ fontSize: '1rem', margin: 0 }}>
                    Stock Bajo
                  </h3>
                  {alertasStock.length > 0 && (
                    <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>{alertasStock.length}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/inventario', { state: { activeTab: 'alertas', filterEstadoAlerta: 'ACTIVA' } })}
                  title="Ver alertas activas de inventario"
                >
                  Ver alertas
                </button>
              </div>

              {alertasStock.length === 0 ? (
                <div style={{ padding: '1.8rem 1rem', textAlign: 'center', color: 'var(--toy-muted)', fontSize: '0.82rem' }}>
                  Todos los productos tienen existencias suficientes
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {alertasStock.slice(0, 5).map((item) => (
                    <div
                      key={item.id_producto}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        backgroundColor: '#FAF8F5',
                        border: '1.5px solid var(--toy-border-light)',
                        borderRadius: '12px',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--toy-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.nombre}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--toy-muted)' }}>
                          SKU: {item.codigo_sku}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--toy-red)' }}>
                            {item.stock_actual} uds
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--toy-muted)' }}>
                            Mín: {item.stock_minimo}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            const deficit = Math.max(1, Number(item.stock_minimo) - Number(item.stock_actual));
                            navigate('/compras', {
                              state: {
                                abastecerItem: {
                                  id_producto: item.id_producto,
                                  codigo_sku: item.codigo_sku,
                                  producto_nombre: item.nombre,
                                  cantidad: deficit
                                }
                              }
                            });
                          }}
                          title="Generar orden de compra para abastecer"
                        >
                          Comprar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Panel 2: Pedidos por Autorizar */}
          {canAuthorizeOrders && (
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 className="card-title" style={{ fontSize: '1rem', margin: 0 }}>
                    Pedidos por Autorizar
                  </h3>
                  {pedidosPendientesList.length > 0 && (
                    <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>{pedidosPendientesList.length}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/pedidos', { state: { filterEstado: 'PENDIENTE_APROBACION' } })}
                  title="Ver pedidos retenidos pendientes de autorización"
                >
                  Ver pedidos
                </button>
              </div>

              {pedidosPendientesList.length === 0 ? (
                <div style={{ padding: '1.8rem 1rem', textAlign: 'center', color: 'var(--toy-muted)', fontSize: '0.82rem' }}>
                  No hay pedidos retenidos pendientes de aprobación
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {pedidosPendientesList.slice(0, 5).map((ped) => (
                    <div
                      key={ped.id_pedido}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        backgroundColor: '#FAF8F5',
                        border: '1.5px solid var(--toy-border-light)',
                        borderRadius: '12px',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--toy-ink)' }}>
                          {ped.numero_pedido}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--toy-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ped.cliente || ped.cliente_nombre || 'Cliente'}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--toy-ink)' }}>
                            {formatMoney(ped.total)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--toy-orange-dark)', fontWeight: 700 }}>
                            Desc: {formatMoney(ped.descuento_total)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate('/pedidos', { state: { filterEstado: 'PENDIENTE_APROBACION', pedidoId: ped.id_pedido } })}
                          title="Autorizar o revisar este pedido"
                        >
                          Revisar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grid de Accesos Rápidos (Las tarjetas originales con diseño y badges) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 className="card-title" style={{ fontSize: '1.08rem', margin: 0 }}>
          Accesos Rápidos
        </h3>

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
                  padding: '1.45rem',
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
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      backgroundColor: theme.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Icon size={24} strokeWidth={2.4} style={{ color: theme.color }} />
                  </div>

                  <h3
                    className="font-display"
                    style={{
                      fontSize: '1.18rem',
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
                    <span className={`badge ${theme.badge}`} style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}>
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

      {/* Modal Simplificado para Configuración de Descuento (RN07) */}
      {canConfig && (
        <Modal
          isOpen={configModalOpen}
          onClose={() => setConfigModalOpen(false)}
          title="Descuento Máximo"
          size="sm"
        >
          <form onSubmit={handleGuardarConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormField
              label="Porcentaje (%)"
              name="nuevoDescuento"
              required
            >
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="form-control"
                value={nuevoDescuento}
                onKeyDown={(e) => {
                  // Bloquear negativos, positivos, letras exponenciales, puntos, comas y espacios
                  if (['-', '+', 'e', 'E', '.', ',', ' '].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '');
                  if (clean === '') {
                    setNuevoDescuento('');
                    return;
                  }
                  let val = parseInt(clean, 10);
                  if (isNaN(val) || val < 0) val = 0;
                  if (val > 100) val = 100;
                  setNuevoDescuento(String(val));
                }}
                placeholder="10"
                maxLength={3}
                required
                autoFocus
              />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfigModalOpen(false)}
                disabled={guardandoConfig}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  guardandoConfig ||
                  nuevoDescuento.trim() === '' ||
                  isNaN(parseInt(nuevoDescuento, 10)) ||
                  parseInt(nuevoDescuento, 10) < 0 ||
                  parseInt(nuevoDescuento, 10) > 100
                }
              >
                {guardandoConfig ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
