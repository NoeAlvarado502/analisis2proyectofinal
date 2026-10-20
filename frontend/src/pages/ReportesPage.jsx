import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  Calendar,
  AlertTriangle,
  Receipt,
  Boxes,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Filter
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../components/Toast';
import SearchInput from '../components/SearchInput';
import FilterDropdown from '../components/FilterDropdown';
import PageCard from '../components/PageCard';

export default function ReportesPage() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('ventas'); // 'ventas' | 'inventario'

  // ========================================================
  // REPORTE 1: VENTAS Y COBRANZA
  // ========================================================
  const [ventasData, setVentasData] = useState([]);
  const [ventasResumen, setVentasResumen] = useState({
    total_ventas: 0,
    total_descuentos: 0,
    total_saldo_pendiente: 0,
    conteo_por_estado: { PENDIENTE: 0, COMPLETADA: 0, ANULADA: 0 }
  });
  const [loadingVentas, setLoadingVentas] = useState(false);
  const [qVentas, setQVentas] = useState('');
  const [estadoVentas, setEstadoVentas] = useState('');
  const [fechaDesdeVentas, setFechaDesdeVentas] = useState('');
  const [fechaHastaVentas, setFechaHastaVentas] = useState('');

  // ========================================================
  // REPORTE 2: INVENTARIO CRÍTICO Y KARDEX
  // ========================================================
  const [stockBajoList, setStockBajoList] = useState([]);
  const [movimientosList, setMovimientosList] = useState([]);
  const [loadingInventario, setLoadingInventario] = useState(false);
  const [fechaDesdeInv, setFechaDesdeInv] = useState('');
  const [fechaHastaInv, setFechaHastaInv] = useState('');

  const estadoOptions = [
    { value: '', label: 'Todos los estados', shortLabel: 'Estados' },
    { value: 'COMPLETADA', label: 'Completadas (Pagadas)', shortLabel: 'Completadas' },
    { value: 'PENDIENTE', label: 'Pendientes de Pago', shortLabel: 'Pendientes' },
    { value: 'ANULADA', label: 'Anuladas', shortLabel: 'Anuladas' }
  ];

  // Cargar Reporte de Ventas
  const fetchReporteVentas = useCallback(async () => {
    setLoadingVentas(true);
    try {
      const params = {};
      if (qVentas.trim()) params.q = qVentas.trim();
      if (estadoVentas) params.estado = estadoVentas;
      if (fechaDesdeVentas) params.fecha_desde = fechaDesdeVentas;
      if (fechaHastaVentas) params.fecha_hasta = fechaHastaVentas;

      const res = await api.get('/reportes/ventas', { params });
      if (res?.data) {
        setVentasData(res.data.filas || []);
        if (res.data.resumen) {
          setVentasResumen(res.data.resumen);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar reporte de ventas');
    } finally {
      setLoadingVentas(false);
    }
  }, [qVentas, estadoVentas, fechaDesdeVentas, fechaHastaVentas, toast]);

  // Cargar Reporte de Inventario Crítico
  const fetchReporteInventario = useCallback(async () => {
    setLoadingInventario(true);
    try {
      const params = {};
      if (fechaDesdeInv) params.fecha_desde = fechaDesdeInv;
      if (fechaHastaInv) params.fecha_hasta = fechaHastaInv;

      const res = await api.get('/reportes/inventario-critico', { params });
      if (res?.data) {
        setStockBajoList(res.data.stock_bajo || []);
        setMovimientosList(res.data.movimientos_resumen || []);
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar reporte de inventario');
    } finally {
      setLoadingInventario(false);
    }
  }, [fechaDesdeInv, fechaHastaInv, toast]);

  useEffect(() => {
    if (activeTab === 'ventas') {
      fetchReporteVentas();
    } else {
      fetchReporteInventario();
    }
  }, [activeTab, fetchReporteVentas, fetchReporteInventario]);

  // Función para exportar a CSV
  const handleExportCSV = (filename, rows, headers) => {
    if (!rows || rows.length === 0) {
      toast.warning('No hay datos disponibles para exportar');
      return;
    }

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((fieldName) => {
            const val = row[fieldName] !== undefined && row[fieldName] !== null ? String(row[fieldName]) : '';
            return `"${val.replace(/"/g, '""')}"`;
          })
          .join(',')
      )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Archivo CSV descargado exitosamente');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <PageCard
        title="Reportes y Estadísticas del Negocio"
        subtitle="Analítica consolidada de ventas, cobranza y existencias críticas de inventario (Sprint 3)"
        actions={
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrint}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Printer size={15} />
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (activeTab === 'ventas') {
                  handleExportCSV(
                    'reporte_ventas',
                    ventasData,
                    ['fecha_venta', 'numero_factura', 'numero_pedido', 'cliente', 'vendedor', 'total', 'saldo_pendiente', 'estado']
                  );
                } else {
                  handleExportCSV(
                    'reporte_stock_bajo',
                    stockBajoList,
                    ['codigo_sku', 'nombre', 'categoria', 'stock_actual', 'stock_minimo', 'faltante']
                  );
                }
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Download size={15} />
              <span>Exportar CSV</span>
            </button>
          </div>
        }
      >
        {/* Pestañas de Reportes */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#F8F5EE',
            borderBottom: '2px solid var(--toy-border)',
            padding: '0.5rem 1.25rem 0',
            gap: '0.5rem'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('ventas')}
            style={{
              padding: '0.65rem 1.2rem',
              border: 'none',
              borderBottom: activeTab === 'ventas' ? '3px solid var(--toy-blue)' : '3px solid transparent',
              backgroundColor: activeTab === 'ventas' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'ventas' ? 'var(--toy-deep-blue)' : 'var(--toy-muted)',
              fontWeight: 800,
              fontSize: '0.92rem',
              cursor: 'pointer',
              borderTopLeftRadius: '10px',
              borderTopRightRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <TrendingUp size={18} />
            <span>Reporte 1: Ventas y Cobranza</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventario')}
            style={{
              padding: '0.65rem 1.2rem',
              border: 'none',
              borderBottom: activeTab === 'inventario' ? '3px solid var(--toy-blue)' : '3px solid transparent',
              backgroundColor: activeTab === 'inventario' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'inventario' ? 'var(--toy-deep-blue)' : 'var(--toy-muted)',
              fontWeight: 800,
              fontSize: '0.92rem',
              cursor: 'pointer',
              borderTopLeftRadius: '10px',
              borderTopRightRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Boxes size={18} />
            <span>Reporte 2: Existencias Críticas y Kardex</span>
          </button>
        </div>

        {/* ========================================================
            REPORTE 1: VENTAS Y COBRANZA
           ======================================================== */}
        {activeTab === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem' }}>
            {/* Tarjetas de Indicadores */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid var(--toy-border)',
                  borderRadius: '16px',
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <span style={{ fontSize: '0.8rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Total Facturado:</span>
                <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--toy-deep-blue)' }}>
                  Q{(ventasResumen.total_ventas || 0).toFixed(2)}
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)' }}>
                  {ventasData.length} facturas emitidas
                </span>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid var(--toy-border)',
                  borderRadius: '16px',
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <span style={{ fontSize: '0.8rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Descuentos Otorgados:</span>
                <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--toy-green-dark)' }}>
                  Q{(ventasResumen.total_descuentos || 0).toFixed(2)}
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)' }}>Ahorro comercial acumulado</span>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid var(--toy-border)',
                  borderRadius: '16px',
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <span style={{ fontSize: '0.8rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Saldo por Cobrar:</span>
                <span
                  style={{
                    fontSize: '1.65rem',
                    fontWeight: 800,
                    color: ventasResumen.total_saldo_pendiente > 0 ? 'var(--toy-orange-dark)' : 'var(--toy-green-dark)'
                  }}
                >
                  Q{(ventasResumen.total_saldo_pendiente || 0).toFixed(2)}
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)' }}>
                  {ventasResumen.conteo_por_estado?.PENDIENTE || 0} facturas pendientes
                </span>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid var(--toy-border)',
                  borderRadius: '16px',
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <span style={{ fontSize: '0.8rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Efectividad de Cobro:</span>
                <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10B981' }}>
                  {ventasResumen.total_ventas > 0
                    ? `${Math.round(((ventasResumen.total_ventas - ventasResumen.total_saldo_pendiente) / ventasResumen.total_ventas) * 100)}%`
                    : '100%'}
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)' }}>
                  {ventasResumen.conteo_por_estado?.COMPLETADA || 0} facturas liquidadas
                </span>
              </div>
            </div>

            {/* Barra de Filtros */}
            <div
              style={{
                display: 'flex',
                gap: '0.85rem',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                backgroundColor: '#FAF8F5',
                borderRadius: '14px',
                border: '1.5px solid var(--toy-border)'
              }}
            >
              <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ width: '280px' }}>
                  <SearchInput
                    value={qVentas}
                    onChange={setQVentas}
                    placeholder="Filtrar por factura, cliente, vendedor..."
                  />
                </div>

                <FilterDropdown
                  title="Estado"
                  buttonTitle="Estado"
                  value={estadoVentas}
                  onChange={setEstadoVentas}
                  options={estadoOptions}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Desde:</span>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: '135px', padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                  value={fechaDesdeVentas}
                  onChange={(e) => setFechaDesdeVentas(e.target.value)}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Hasta:</span>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: '135px', padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                  value={fechaHastaVentas}
                  onChange={(e) => setFechaHastaVentas(e.target.value)}
                />
              </div>
            </div>

            {/* Tabla Detallada */}
            <div style={{ border: '1.5px solid var(--toy-border)', borderRadius: '16px', overflow: 'hidden' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8F5EE', textAlign: 'left', borderBottom: '2px solid var(--toy-border)' }}>
                    <th style={{ padding: '0.6rem' }}>Fecha</th>
                    <th style={{ padding: '0.6rem' }}>Factura</th>
                    <th style={{ padding: '0.6rem' }}>Pedido</th>
                    <th style={{ padding: '0.6rem' }}>Cliente</th>
                    <th style={{ padding: '0.6rem' }}>Vendedor</th>
                    <th style={{ padding: '0.6rem', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '0.6rem', textAlign: 'right' }}>Saldo Pendiente</th>
                    <th style={{ padding: '0.6rem', textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingVentas ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--toy-muted)' }}>
                        Cargando reporte de ventas...
                      </td>
                    </tr>
                  ) : ventasData.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--toy-muted)' }}>
                        No se encontraron registros de venta en el rango seleccionado.
                      </td>
                    </tr>
                  ) : (
                    ventasData.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--toy-border)' }}>
                        <td style={{ padding: '0.6rem', color: 'var(--toy-muted)' }}>
                          {row.fecha_venta ? new Date(row.fecha_venta).toLocaleDateString() : '-'}
                        </td>
                        <td style={{ padding: '0.6rem' }}><code>{row.numero_factura}</code></td>
                        <td style={{ padding: '0.6rem' }}>{row.numero_pedido}</td>
                        <td style={{ padding: '0.6rem', fontWeight: 700, color: 'var(--toy-ink)' }}>{row.cliente}</td>
                        <td style={{ padding: '0.6rem' }}>{row.vendedor}</td>
                        <td style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 800, color: 'var(--toy-deep-blue)' }}>
                          Q{parseFloat(row.total || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 800 }}>
                          <span style={{ color: parseFloat(row.saldo_pendiente) > 0 ? 'var(--toy-orange-dark)' : 'var(--toy-green-dark)' }}>
                            Q{parseFloat(row.saldo_pendiente || 0).toFixed(2)}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                          <span
                            className={`badge ${row.estado === 'COMPLETADA' ? 'badge-success' : row.estado === 'PENDIENTE' ? 'badge-warning' : 'badge-danger'}`}
                            style={{ fontSize: '0.72rem' }}
                          >
                            {row.estado}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================
            REPORTE 2: INVENTARIO CRÍTICO Y KARDEX
           ======================================================== */}
        {activeTab === 'inventario' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.25rem' }}>
            {/* SUBSECCIÓN A: PRODUCTOS BAJO MÍNIMO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} color="var(--toy-red)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
                  Productos en Nivel Crítico (Bajo o Igual al Stock Mínimo)
                </h3>
              </div>

              <div style={{ border: '1.5px solid var(--toy-border)', borderRadius: '16px', overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8F5EE', textAlign: 'left', borderBottom: '2px solid var(--toy-border)' }}>
                      <th style={{ padding: '0.6rem' }}>SKU</th>
                      <th style={{ padding: '0.6rem' }}>Producto</th>
                      <th style={{ padding: '0.6rem' }}>Categoría</th>
                      <th style={{ padding: '0.6rem', textAlign: 'center' }}>Stock Actual</th>
                      <th style={{ padding: '0.6rem', textAlign: 'center' }}>Stock Mínimo</th>
                      <th style={{ padding: '0.6rem', textAlign: 'center' }}>Faltante para Mínimo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingInventario ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--toy-muted)' }}>
                          Consultando niveles de stock...
                        </td>
                      </tr>
                    ) : stockBajoList.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--toy-green-dark)', fontWeight: 700 }}>
                          ✓ ¡Excelente! No hay productos por debajo del stock mínimo en este momento.
                        </td>
                      </tr>
                    ) : (
                      stockBajoList.map((prod, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--toy-border)' }}>
                          <td style={{ padding: '0.6rem' }}><code>{prod.codigo_sku}</code></td>
                          <td style={{ padding: '0.6rem', fontWeight: 700, color: 'var(--toy-ink)' }}>{prod.nombre}</td>
                          <td style={{ padding: '0.6rem' }}>{prod.categoria}</td>
                          <td style={{ padding: '0.6rem', textAlign: 'center', fontWeight: 800, color: 'var(--toy-red)' }}>
                            {prod.stock_actual}
                          </td>
                          <td style={{ padding: '0.6rem', textAlign: 'center', fontWeight: 700 }}>
                            {prod.stock_minimo}
                          </td>
                          <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                            <span className="badge badge-danger" style={{ fontSize: '0.74rem' }}>
                              Faltan {prod.faltante} uds
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SUBSECCIÓN B: RESUMEN DE MOVIMIENTOS KARDEX */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
                  Resumen de Movimientos Kardex por Período
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Desde:</span>
                  <input
                    type="date"
                    className="form-control"
                    style={{ width: '135px', padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                    value={fechaDesdeInv}
                    onChange={(e) => setFechaDesdeInv(e.target.value)}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Hasta:</span>
                  <input
                    type="date"
                    className="form-control"
                    style={{ width: '135px', padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                    value={fechaHastaInv}
                    onChange={(e) => setFechaHastaInv(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {['ENTRADA', 'SALIDA', 'AJUSTE', 'DEVOLUCION'].map((tipo) => {
                  const match = movimientosList.find((m) => m.tipo_movimiento === tipo);
                  const totalMovs = match ? match.total_movimientos : 0;
                  const totalUnids = match ? Math.abs(parseInt(match.total_unidades, 10)) : 0;

                  return (
                    <div
                      key={tipo}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '2px solid var(--toy-border)',
                        borderRadius: '16px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.3rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span
                          className={`badge ${tipo === 'ENTRADA' ? 'badge-success' : tipo === 'SALIDA' ? 'badge-primary' : 'badge-warning'}`}
                          style={{ fontSize: '0.72rem' }}
                        >
                          {tipo}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--toy-muted)' }}>
                          {totalMovs} eventos
                        </span>
                      </div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
                        {totalUnids} <span style={{ fontSize: '0.8rem', color: 'var(--toy-muted)' }}>unidades</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </PageCard>
    </div>
  );
}
