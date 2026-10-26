import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Boxes,
  Layers,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Receipt,
  PackageOpen
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../components/Toast';
import { useAuth } from '../auth/AuthContext';
import PageCard from '../components/PageCard';
import DatePicker from '../components/DatePicker';
import SearchableSelect from '../components/SearchableSelect';
import FilterDropdown from '../components/FilterDropdown';
import { useSearch } from '../context/SearchContext';

const formatMoney = (amount) => {
  const num = Number(amount) || 0;
  return `Q ${num.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hr = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hr}:${min}`;
};

const formatDateOnly = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getTipoMovimientoBadge = (tipo) => {
  switch (tipo) {
    case 'ENTRADA':
      return <span className="badge badge-success">Entrada</span>;
    case 'SALIDA':
      return <span className="badge badge-secondary">Salida</span>;
    case 'AJUSTE':
      return <span className="badge badge-warning">Ajuste</span>;
    case 'DEVOLUCION':
      return <span className="badge badge-primary">Devolución</span>;
    default:
      return <span className="badge badge-secondary">{tipo}</span>;
  }
};

const getEstadoBadge = (estado) => {
  switch (estado) {
    case 'COMPLETADA':
    case 'RECIBIDA':
      return <span className="badge badge-success">{estado === 'COMPLETADA' ? 'Completada' : 'Recibida'}</span>;
    case 'PENDIENTE':
    case 'REGISTRADA':
      return <span className="badge badge-warning">{estado === 'PENDIENTE' ? 'Pendiente' : 'Registrada'}</span>;
    case 'ANULADA':
    case 'CANCELADO':
      return <span className="badge badge-danger">{estado === 'ANULADA' ? 'Anulada' : 'Cancelado'}</span>;
    default:
      return <span className="badge badge-secondary">{estado}</span>;
  }
};

const exportToCSV = (filename, headers, rows) => {
  const sanitizeCell = (cell) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent =
    '\uFEFF' +
    headers.map(sanitizeCell).join(';') +
    '\r\n' +
    rows.map((row) => row.map(sanitizeCell).join(';')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function ReportesPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('kardex');
  const [loading, setLoading] = useState(false);
  const { query, setPlaceholder } = useSearch();

  useEffect(() => {
    if (activeTab === 'kardex') {
      setPlaceholder('Buscar en kardex...');
      setKardexQ(query);
    } else if (activeTab === 'valoracion') {
      setPlaceholder('Buscar en valoración...');
      setValQ(query);
    } else if (activeTab === 'ventas') {
      setPlaceholder('Buscar en ventas...');
      setVentasQ(query);
    } else if (activeTab === 'compras') {
      setPlaceholder('Buscar en compras...');
      setComprasQ(query);
    } else {
      setPlaceholder('Buscar en reportes...');
    }
  }, [query, activeTab, setPlaceholder]);

  // Tab 1: Kardex
  const [kardexData, setKardexData] = useState([]);
  const [kardexQ, setKardexQ] = useState('');
  const [kardexKpis, setKardexKpis] = useState({
    total_entradas: 0,
    total_salidas: 0,
    total_ajustes: 0,
    variacion_neta: 0
  });
  const [kardexFechaDesde, setKardexFechaDesde] = useState('');
  const [kardexFechaHasta, setKardexFechaHasta] = useState('');
  const [kardexProductoId, setKardexProductoId] = useState('');
  const [kardexSelectedProduct, setKardexSelectedProduct] = useState(null);
  const [kardexCategoriaId, setKardexCategoriaId] = useState('');
  const [kardexTipoMovimiento, setKardexTipoMovimiento] = useState('');
  const [kardexCategoriasList, setKardexCategoriasList] = useState([]);

  // Tab 2: Valoración CPP
  const [valoracionData, setValoracionData] = useState([]);
  const [valoracionKpis, setValoracionKpis] = useState({
    valor_total_costo: 0,
    valor_total_comercial: 0,
    utilidad_potencial_total: 0,
    margen_promedio_ponderado: 0
  });
  const [valQ, setValQ] = useState('');
  const [valCategoriaId, setValCategoriaId] = useState('');
  const [valMarcaId, setValMarcaId] = useState('');
  const [valEstadoStock, setValEstadoStock] = useState('');
  const [valCategoriasList, setValCategoriasList] = useState([]);
  const [valMarcasList, setValMarcasList] = useState([]);

  // Tab 3: Ventas
  const [ventasData, setVentasData] = useState([]);
  const [ventasKpis, setVentasKpis] = useState({
    total_facturado_completadas: 0,
    total_descuentos: 0,
    total_saldo_pendiente: 0,
    total_facturas: 0
  });
  const [ventasQ, setVentasQ] = useState('');
  const [ventasFechaDesde, setVentasFechaDesde] = useState('');
  const [ventasFechaHasta, setVentasFechaHasta] = useState('');
  const [ventasEstado, setVentasEstado] = useState('');

  // Tab 4: Compras
  const [comprasData, setComprasData] = useState([]);
  const [comprasKpis, setComprasKpis] = useState({
    monto_recibidas: 0,
    compras_pendientes: 0,
    ordenes_anuladas: 0,
    total_documentos: 0
  });
  const [comprasQ, setComprasQ] = useState('');
  const [comprasFechaDesde, setComprasFechaDesde] = useState('');
  const [comprasFechaHasta, setComprasFechaHasta] = useState('');
  const [comprasEstado, setComprasEstado] = useState('');
  const [comprasProveedorId, setComprasProveedorId] = useState('');
  const [comprasProveedoresList, setComprasProveedoresList] = useState([]);

  // Carga de catálogos
  useEffect(() => {
    async function loadCatalogs() {
      try {
        const [catRes, marRes, provRes] = await Promise.all([
          api.get('/productos/catalogo/categorias').catch(() => null),
          api.get('/productos/catalogo/marcas').catch(() => null),
          api.get('/proveedores?limit=100').catch(() => null)
        ]);
        if (catRes?.data) {
          setKardexCategoriasList(catRes.data);
          setValCategoriasList(catRes.data);
        }
        if (marRes?.data) setValMarcasList(marRes.data);
        if (provRes?.data) setComprasProveedoresList(provRes.data);
      } catch (err) {
        console.warn('Error al cargar catálogos de reportes:', err);
      }
    }
    loadCatalogs();
  }, []);

  // Fetch Kardex
  const fetchKardex = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (kardexQ && kardexQ.trim()) params.q = kardexQ.trim();
      if (kardexFechaDesde) params.fecha_inicio = kardexFechaDesde;
      if (kardexFechaHasta) params.fecha_fin = kardexFechaHasta;
      if (kardexProductoId) params.id_producto = kardexProductoId;
      if (kardexCategoriaId) params.id_categoria = kardexCategoriaId;
      if (kardexTipoMovimiento) params.tipo_movimiento = kardexTipoMovimiento;

      const res = await api.get('/reportes/kardex', { params });
      if (res?.data) {
        setKardexData(res.data.filas || []);
        if (res.data.kpis) setKardexKpis(res.data.kpis);
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar reporte de Kardex');
    } finally {
      setLoading(false);
    }
  }, [kardexQ, kardexFechaDesde, kardexFechaHasta, kardexProductoId, kardexCategoriaId, kardexTipoMovimiento, toast]);

  // Fetch Valoración
  const fetchValoracion = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (valQ && valQ.trim()) params.q = valQ.trim();
      if (valCategoriaId) params.id_categoria = valCategoriaId;
      if (valMarcaId) params.id_marca = valMarcaId;
      if (valEstadoStock) params.estado_stock = valEstadoStock;

      const res = await api.get('/reportes/valoracion', { params });
      if (res?.data) {
        setValoracionData(res.data.filas || []);
        if (res.data.kpis) setValoracionKpis(res.data.kpis);
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar reporte de Valoración');
    } finally {
      setLoading(false);
    }
  }, [valQ, valCategoriaId, valMarcaId, valEstadoStock, toast]);

  // Fetch Ventas
  const fetchVentas = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (ventasQ && ventasQ.trim()) params.q = ventasQ.trim();
      if (ventasFechaDesde) params.fecha_inicio = ventasFechaDesde;
      if (ventasFechaHasta) params.fecha_fin = ventasFechaHasta;
      if (ventasEstado) params.estado = ventasEstado;

      const res = await api.get('/reportes/ventas', { params });
      if (res?.data) {
        setVentasData(res.data.filas || []);
        if (res.data.kpis) setVentasKpis(res.data.kpis);
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar reporte de Ventas');
    } finally {
      setLoading(false);
    }
  }, [ventasQ, ventasFechaDesde, ventasFechaHasta, ventasEstado, toast]);

  // Fetch Compras
  const fetchCompras = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (comprasQ && comprasQ.trim()) params.q = comprasQ.trim();
      if (comprasFechaDesde) params.fecha_inicio = comprasFechaDesde;
      if (comprasFechaHasta) params.fecha_fin = comprasFechaHasta;
      if (comprasEstado) params.estado = comprasEstado;
      if (comprasProveedorId) params.id_proveedor = comprasProveedorId;

      const res = await api.get('/reportes/compras', { params });
      if (res?.data) {
        setComprasData(res.data.filas || []);
        if (res.data.kpis) setComprasKpis(res.data.kpis);
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar reporte de Compras');
    } finally {
      setLoading(false);
    }
  }, [comprasQ, comprasFechaDesde, comprasFechaHasta, comprasEstado, comprasProveedorId, toast]);

  // Trigger por pestaña activa
  useEffect(() => {
    if (activeTab === 'kardex') fetchKardex();
    else if (activeTab === 'valoracion') fetchValoracion();
    else if (activeTab === 'ventas') fetchVentas();
    else if (activeTab === 'compras') fetchCompras();
  }, [activeTab, fetchKardex, fetchValoracion, fetchVentas, fetchCompras]);

  // Opciones de Dropdowns
  const categoriaKardexOptions = useMemo(() => [
    { value: '', label: 'Todas las categorías', shortLabel: 'Categoría' },
    ...kardexCategoriasList.map((c) => ({
      value: String(c.id_categoria),
      label: c.nombre,
      shortLabel: c.nombre
    }))
  ], [kardexCategoriasList]);

  const tipoMovimientoOptions = useMemo(() => [
    { value: '', label: 'Todos los movimientos', shortLabel: 'Tipo Mov.' },
    { value: 'ENTRADA', label: 'Entradas', shortLabel: 'Entrada' },
    { value: 'SALIDA', label: 'Salidas', shortLabel: 'Salida' },
    { value: 'AJUSTE', label: 'Ajustes', shortLabel: 'Ajuste' },
    { value: 'DEVOLUCION', label: 'Devoluciones', shortLabel: 'Devolución' }
  ], []);

  const categoriaValoracionOptions = useMemo(() => [
    { value: '', label: 'Todas las categorías', shortLabel: 'Categoría' },
    ...valCategoriasList.map((c) => ({
      value: String(c.id_categoria),
      label: c.nombre,
      shortLabel: c.nombre
    }))
  ], [valCategoriasList]);

  const marcaValoracionOptions = useMemo(() => [
    { value: '', label: 'Todas las marcas', shortLabel: 'Marca' },
    ...valMarcasList.map((m) => ({
      value: String(m.id_marca),
      label: m.nombre,
      shortLabel: m.nombre
    }))
  ], [valMarcasList]);

  const estadoStockOptions = useMemo(() => [
    { value: '', label: 'Todos los niveles', shortLabel: 'Stock' },
    { value: 'alerta', label: 'Bajo Mínimo (Alerta)', shortLabel: 'En Alerta' },
    { value: 'agotados', label: 'Agotados (0)', shortLabel: 'Agotados' },
    { value: 'disponibles', label: 'Con Stock (> 0)', shortLabel: 'Con Stock' }
  ], []);

  const ventasEstadoOptions = useMemo(() => [
    { value: '', label: 'Todos los estados', shortLabel: 'Estado' },
    { value: 'COMPLETADA', label: 'Completadas', shortLabel: 'Completadas' },
    { value: 'PENDIENTE', label: 'Pendientes', shortLabel: 'Pendientes' },
    { value: 'ANULADA', label: 'Anuladas', shortLabel: 'Anuladas' }
  ], []);

  const comprasEstadoOptions = useMemo(() => [
    { value: '', label: 'Todos los estados', shortLabel: 'Estado' },
    { value: 'RECIBIDA', label: 'Recibidas', shortLabel: 'Recibidas' },
    { value: 'REGISTRADA', label: 'Registradas', shortLabel: 'Registradas' },
    { value: 'ANULADA', label: 'Anuladas', shortLabel: 'Anuladas' }
  ], []);

  const comprasProveedorOptions = useMemo(() => [
    { value: '', label: 'Todos los proveedores', shortLabel: 'Proveedor' },
    ...comprasProveedoresList.map((p) => ({
      value: String(p.id_proveedor),
      label: p.razon_social,
      shortLabel: p.razon_social
    }))
  ], [comprasProveedoresList]);

  // Shortcuts de fechas
  const setDateRange = (days) => {
    const today = new Date();
    const dEnd = today.toISOString().slice(0, 10);
    let dStart = dEnd;

    if (days === 0) {
      dStart = dEnd;
    } else if (days === 30) {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      dStart = first.toISOString().slice(0, 10);
    } else if (days === 365) {
      const first = new Date(today.getFullYear(), 0, 1);
      dStart = first.toISOString().slice(0, 10);
    } else {
      const past = new Date(today);
      past.setDate(today.getDate() - days);
      dStart = past.toISOString().slice(0, 10);
    }

    if (activeTab === 'kardex') {
      setKardexFechaDesde(dStart);
      setKardexFechaHasta(dEnd);
    } else if (activeTab === 'ventas') {
      setVentasFechaDesde(dStart);
      setVentasFechaHasta(dEnd);
    } else if (activeTab === 'compras') {
      setComprasFechaDesde(dStart);
      setComprasFechaHasta(dEnd);
    }
  };

  const handleClearFilters = () => {
    if (activeTab === 'kardex') {
      setKardexFechaDesde('');
      setKardexFechaHasta('');
      setKardexProductoId('');
      setKardexSelectedProduct(null);
      setKardexCategoriaId('');
      setKardexTipoMovimiento('');
    } else if (activeTab === 'valoracion') {
      setValQ('');
      setValCategoriaId('');
      setValMarcaId('');
      setValEstadoStock('');
    } else if (activeTab === 'ventas') {
      setVentasQ('');
      setVentasFechaDesde('');
      setVentasFechaHasta('');
      setVentasEstado('');
    } else if (activeTab === 'compras') {
      setComprasQ('');
      setComprasFechaDesde('');
      setComprasFechaHasta('');
      setComprasEstado('');
      setComprasProveedorId('');
    }
  };

  // Exportar a CSV
  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    if (activeTab === 'kardex') {
      const headers = ['Fecha y Hora', 'SKU', 'Producto', 'Categoría', 'Tipo', 'Documento', 'ID Doc', 'Stock Ant.', 'Cantidad', 'Stock Post.', 'Usuario', 'Motivo'];
      const rows = kardexData.map((r) => [
        formatDateTime(r.fecha_hora),
        r.codigo_sku,
        r.producto,
        r.categoria,
        r.tipo_movimiento,
        r.documento_tipo,
        r.documento_id || '',
        r.stock_anterior,
        r.tipo_movimiento === 'SALIDA' ? -Math.abs(Number(r.cantidad)) : Number(r.cantidad),
        r.stock_posterior,
        r.usuario || '',
        r.motivo || ''
      ]);
      exportToCSV(`kardex_${timestamp}.csv`, headers, rows);
      toast.success('Archivo CSV descargado');
    } else if (activeTab === 'valoracion') {
      const headers = ['SKU', 'Producto', 'Categoría', 'Marca', 'Stock Actual', 'Stock Mín.', 'Costo Promedio (CPP)', 'Valor Costo', 'Precio Menudeo', 'Valor Comercial', 'Utilidad Potencial', 'Margen %', 'Participación %'];
      const rows = valoracionData.map((r) => [
        r.codigo_sku,
        r.producto,
        r.categoria,
        r.marca,
        r.stock_actual,
        r.stock_minimo,
        r.costo_promedio,
        r.valor_total_costo,
        r.precio_menudeo,
        r.valor_total_comercial,
        r.utilidad_potencial,
        r.margen_porcentaje,
        r.porcentaje_participacion
      ]);
      exportToCSV(`valoracion_inventario_${timestamp}.csv`, headers, rows);
      toast.success('Archivo CSV descargado');
    } else if (activeTab === 'ventas') {
      const headers = ['Fecha Venta', 'Factura', 'Pedido', 'Cliente', 'Vendedor', 'Subtotal', 'Descuento', 'Total', 'Saldo Pendiente', 'Estado'];
      const rows = ventasData.map((v) => [
        formatDateTime(v.fecha_venta),
        v.numero_factura,
        v.numero_pedido || '',
        v.cliente,
        v.vendedor || '',
        v.subtotal,
        v.descuento,
        v.total,
        v.saldo_pendiente,
        v.estado
      ]);
      exportToCSV(`ventas_${timestamp}.csv`, headers, rows);
      toast.success('Archivo CSV descargado');
    } else if (activeTab === 'compras') {
      const headers = ['Fecha Compra', 'Comprobante', 'Proveedor', 'NIT', 'Comprador', 'Total', 'Fecha Recepción', 'Estado', 'Observaciones'];
      const rows = comprasData.map((c) => [
        formatDateTime(c.fecha_compra),
        c.numero_comprobante || c.numero_orden,
        c.proveedor,
        c.nit_proveedor || '',
        c.usuario_comprador || '',
        c.total,
        formatDateTime(c.fecha_recepcion),
        c.estado,
        c.observaciones || ''
      ]);
      exportToCSV(`compras_${timestamp}.csv`, headers, rows);
      toast.success('Archivo CSV descargado');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Totales acumulados para tfoot de Ventas
  const ventasTotalesFooter = useMemo(() => {
    let sub = 0;
    let desc = 0;
    let tot = 0;
    let sal = 0;
    for (const v of ventasData) {
      sub += parseFloat(v.subtotal) || 0;
      desc += parseFloat(v.descuento) || 0;
      tot += parseFloat(v.total) || 0;
      sal += parseFloat(v.saldo_pendiente) || 0;
    }
    return { subtotal: sub, descuento: desc, total: tot, saldo: sal };
  }, [ventasData]);

  // Totales acumulados para tfoot de Compras
  const comprasTotalesFooter = useMemo(() => {
    let tot = 0;
    for (const c of comprasData) {
      tot += parseFloat(c.total) || 0;
    }
    return { total: tot };
  }, [comprasData]);

  // Totales acumulados para tfoot de Valoración
  const valTotalesFooter = useMemo(() => {
    let stock = 0;
    let costo = 0;
    let comercial = 0;
    let utilidad = 0;
    for (const item of valoracionData) {
      stock += Number(item.stock_actual) || 0;
      costo += parseFloat(item.valor_total_costo) || 0;
      comercial += parseFloat(item.valor_total_comercial) || 0;
      utilidad += parseFloat(item.utilidad_potencial) || 0;
    }
    return { stock, costo, comercial, utilidad };
  }, [valoracionData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Encabezado Formal de Impresión (@media print) */}
      <div className="print-header" style={{ display: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111827', paddingBottom: '6px', marginBottom: '8px' }}>
          <div>
            <h1 style={{ fontSize: '13pt', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
              Juguetería Quetzal
            </h1>
            <h2 style={{ fontSize: '10pt', fontWeight: 700, margin: '2px 0 0 0', color: '#4B5563' }}>
              {activeTab === 'kardex' && 'Reporte de Kardex Físico'}
              {activeTab === 'valoracion' && 'Reporte de Valoración de Inventario (CPP)'}
              {activeTab === 'ventas' && 'Reporte de Ventas y Cobranza'}
              {activeTab === 'compras' && 'Reporte de Compras y Abastecimiento'}
            </h2>
          </div>
          <div style={{ textAlign: 'right', fontSize: '8pt', color: '#4B5563' }}>
            <div>Emisión: {new Date().toLocaleString()}</div>
            <div>Usuario: {user?.nombre_completo || 'Administrador'}</div>
          </div>
        </div>
      </div>

      <PageCard
        title="Reportes"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Píldora de Selector de Pestañas */}
            <div
              style={{
                backgroundColor: 'rgba(255, 244, 221, 0.85)',
                padding: '0.2rem',
                borderRadius: '999px',
                border: '2px solid var(--toy-border)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('kardex')}
                className={activeTab === 'kardex' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                style={{ borderRadius: '999px', height: '32px', padding: '0 0.8rem', fontSize: '0.78rem' }}
              >
                <Boxes size={13} />
                <span>Kardex</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('valoracion')}
                className={activeTab === 'valoracion' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                style={{ borderRadius: '999px', height: '32px', padding: '0 0.8rem', fontSize: '0.78rem' }}
              >
                <Layers size={13} />
                <span>Valoración</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ventas')}
                className={activeTab === 'ventas' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                style={{ borderRadius: '999px', height: '32px', padding: '0 0.8rem', fontSize: '0.78rem' }}
              >
                <TrendingUp size={13} />
                <span>Ventas</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('compras')}
                className={activeTab === 'compras' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                style={{ borderRadius: '999px', height: '32px', padding: '0 0.8rem', fontSize: '0.78rem' }}
              >
                <ShoppingBag size={13} />
                <span>Compras</span>
              </button>
            </div>

            {/* Acciones de exportación */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportCSV}
              title="Exportar archivo CSV para Excel"
            >
              <FileSpreadsheet size={14} />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrint}
              title="Imprimir o guardar como PDF"
            >
              <Printer size={14} />
              <span>Imprimir</span>
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Barra de Filtros Sobria */}
          <div
            className="no-print"
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#FAFAFA',
              borderBottom: '1.5px solid var(--toy-border-light)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.65rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
              {/* Filtros específicos según pestaña */}
              {activeTab === 'kardex' && (
                <>
                  <div style={{ width: '220px' }}>
                    <SearchableSelect
                      placeholder="Todos los productos"
                      endpoint="/productos"
                      labelKey="nombre"
                      valueKey="id_producto"
                      value={kardexProductoId}
                      onChange={(val, item) => {
                        setKardexProductoId(val || '');
                        setKardexSelectedProduct(item || null);
                      }}
                      secondaryKey="codigo_sku"
                    />
                  </div>

                  <DatePicker
                    value={kardexFechaDesde}
                    onChange={(val) => setKardexFechaDesde(val)}
                    placeholder="Desde"
                  />

                  <DatePicker
                    value={kardexFechaHasta}
                    onChange={(val) => setKardexFechaHasta(val)}
                    placeholder="Hasta"
                  />

                  <FilterDropdown
                    title="Filtrar por categoría"
                    buttonTitle="Categoría"
                    value={kardexCategoriaId}
                    onChange={(val) => setKardexCategoriaId(val)}
                    options={categoriaKardexOptions}
                  />

                  <FilterDropdown
                    title="Filtrar por movimiento"
                    buttonTitle="Tipo Mov."
                    value={kardexTipoMovimiento}
                    onChange={(val) => setKardexTipoMovimiento(val)}
                    options={tipoMovimientoOptions}
                  />
                </>
              )}

              {activeTab === 'valoracion' && (
                <>
                  <FilterDropdown
                    title="Filtrar por categoría"
                    buttonTitle="Categoría"
                    value={valCategoriaId}
                    onChange={(val) => setValCategoriaId(val)}
                    options={categoriaValoracionOptions}
                  />

                  <FilterDropdown
                    title="Filtrar por marca"
                    buttonTitle="Marca"
                    value={valMarcaId}
                    onChange={(val) => setValMarcaId(val)}
                    options={marcaValoracionOptions}
                  />

                  <FilterDropdown
                    title="Filtrar por nivel de stock"
                    buttonTitle="Nivel Stock"
                    value={valEstadoStock}
                    onChange={(val) => setValEstadoStock(val)}
                    options={estadoStockOptions}
                  />
                </>
              )}

              {activeTab === 'ventas' && (
                <>
                  <DatePicker
                    value={ventasFechaDesde}
                    onChange={(val) => setVentasFechaDesde(val)}
                    placeholder="Desde"
                  />

                  <DatePicker
                    value={ventasFechaHasta}
                    onChange={(val) => setVentasFechaHasta(val)}
                    placeholder="Hasta"
                  />

                  <FilterDropdown
                    title="Filtrar por estado"
                    buttonTitle="Estado"
                    value={ventasEstado}
                    onChange={(val) => setVentasEstado(val)}
                    options={ventasEstadoOptions}
                  />
                </>
              )}

              {activeTab === 'compras' && (
                <>
                  <DatePicker
                    value={comprasFechaDesde}
                    onChange={(val) => setComprasFechaDesde(val)}
                    placeholder="Desde"
                  />

                  <DatePicker
                    value={comprasFechaHasta}
                    onChange={(val) => setComprasFechaHasta(val)}
                    placeholder="Hasta"
                  />

                  <FilterDropdown
                    title="Filtrar por estado"
                    buttonTitle="Estado"
                    value={comprasEstado}
                    onChange={(val) => setComprasEstado(val)}
                    options={comprasEstadoOptions}
                  />

                  <FilterDropdown
                    title="Filtrar por proveedor"
                    buttonTitle="Proveedor"
                    value={comprasProveedorId}
                    onChange={(val) => setComprasProveedorId(val)}
                    options={comprasProveedorOptions}
                  />
                </>
              )}

              {/* Botones rápidos de rango de fechas si la pestaña aplica fechas */}
              {activeTab !== 'valoracion' && (
                <div style={{ display: 'inline-flex', gap: '0.2rem' }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDateRange(0)}>Hoy</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDateRange(7)}>7d</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDateRange(30)}>Mes</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDateRange(365)}>Año</button>
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClearFilters}
              title="Limpiar filtros"
            >
              <RefreshCw size={12} />
              <span>Limpiar</span>
            </button>
          </div>

          {/* 4 Tarjetas de Métricas de Resumen */}
          <div
            className="no-print"
            style={{
              padding: '0.75rem 1.25rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.75rem',
              backgroundColor: '#FFFFFF',
              borderBottom: '1.5px solid var(--toy-border-light)',
              flexShrink: 0
            }}
          >
            {activeTab === 'kardex' && (
              <>
                <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FAF8F5', borderRadius: '10px', border: '1px solid var(--toy-border-light)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--toy-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Entradas</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--toy-green-dark)', fontFamily: 'var(--font-display)' }}>+{kardexKpis.total_entradas}</div>
                </div>
                <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FAF8F5', borderRadius: '10px', border: '1px solid var(--toy-border-light)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--toy-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Salidas</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--toy-red)', fontFamily: 'var(--font-display)' }}>-{kardexKpis.total_salidas}</div>
                </div>
                <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FAF8F5', borderRadius: '10px', border: '1px solid var(--toy-border-light)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--toy-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Ajustes</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--toy-orange-dark)', fontFamily: 'var(--font-display)' }}>{kardexKpis.total_ajustes}</div>
                </div>
                <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FAF8F5', borderRadius: '10px', border: '1px solid var(--toy-border-light)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--toy-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Variación Neta</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: kardexKpis.variacion_neta >= 0 ? 'var(--toy-blue)' : 'var(--toy-red)', fontFamily: 'var(--font-display)' }}>
                    {kardexKpis.variacion_neta > 0 ? `+${kardexKpis.variacion_neta}` : kardexKpis.variacion_neta}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'valoracion' && (
              <>
                <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FAF8F5', borderRadius: '10px', border: '1px solid var(--toy-border-light)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--toy-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Valor Costo (CPP)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--toy-blue)', fontFamily: 'var(--font-display)' }}>{formatMoney(valoracionKpis.valor_total_costo)}</div>
                </div>
                <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FAF8F5', borderRadius: '10px', border: '1px solid var(--toy-border-light)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--toy-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Valor Comercial</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--toy-ink)', fontFamily: 'var(--font-display)' }}>{formatMoney(valoracionKpis.valor_total_comercial)}</div>
                </div>
                <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FAF8F5', borderRadius: '10px', border: '1px solid var(--toy-border-light)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--toy-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Utilidad Potencial</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--toy-green-dark)', fontFamily: 'var(--font-display)' }}>{formatMoney(valoracionKpis.utilidad_potencial_total)}</div>
                </div>
                <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FAF8F5', borderRadius: '10px', border: '1px solid var(--toy-border-light)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--toy-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Margen Promedio</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--toy-orange-dark)', fontFamily: 'var(--font-display)' }}>{valoracionKpis.margen_promedio_ponderado}%</div>
                </div>
              </>
            )}

            {activeTab === 'ventas' && (
              <>
                <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FAF8F5', borderRadius: '10px', border: '1px solid var(--toy-border-light)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--toy-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Facturado</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--toy-green-dark)', fontFamily: 'var(--font-display)' }}>{formatMoney(ventasKpis.total_facturado_completadas)}</div>
                </div>
                <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FAF8F5', borderRadius: '10px', border: '1px solid var(--toy-border-light)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--toy-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Descuentos</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--toy-orange-dark)', fontFamily: 'var(--font-display)' }}>{formatMoney(ventasKpis.total_descuentos)}</div>
                </div>
                <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FAF8F5', borderRadius: '10px', border: '1px solid var(--toy-border-light)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--toy-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Saldo Pendiente</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--toy-red)', fontFamily: 'var(--font-display)' }}>{formatMoney(ventasKpis.total_saldo_pendiente)}</div>
                </div>
                <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FAF8F5', borderRadius: '10px', border: '1px solid var(--toy-border-light)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--toy-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Total Facturas</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--toy-blue)', fontFamily: 'var(--font-display)' }}>{ventasKpis.total_facturas}</div>
                </div>
              </>
            )}

            {activeTab === 'compras' && (
              <>
                <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FAF8F5', borderRadius: '10px', border: '1px solid var(--toy-border-light)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--toy-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Compras Recibidas</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--toy-blue)', fontFamily: 'var(--font-display)' }}>{formatMoney(comprasKpis.monto_recibidas)}</div>
                </div>
                <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FAF8F5', borderRadius: '10px', border: '1px solid var(--toy-border-light)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--toy-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Pendientes</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--toy-orange-dark)', fontFamily: 'var(--font-display)' }}>{comprasKpis.compras_pendientes}</div>
                </div>
                <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FAF8F5', borderRadius: '10px', border: '1px solid var(--toy-border-light)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--toy-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Anuladas</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--toy-red)', fontFamily: 'var(--font-display)' }}>{comprasKpis.ordenes_anuladas}</div>
                </div>
                <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FAF8F5', borderRadius: '10px', border: '1px solid var(--toy-border-light)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--toy-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Total Documentos</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--toy-ink)', fontFamily: 'var(--font-display)' }}>{comprasKpis.total_documentos}</div>
                </div>
              </>
            )}
          </div>

          {/* Contenedor de Tabla con Scroll Interno */}
          <div className="table-container-embedded" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto' }}>
            {/* Tabla Tab 1: Kardex */}
            {activeTab === 'kardex' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha y Hora</th>
                    <th>SKU / Producto</th>
                    <th>Categoría</th>
                    <th>Tipo</th>
                    <th>Documento</th>
                    <th style={{ textAlign: 'right' }}>Stock Ant.</th>
                    <th style={{ textAlign: 'right' }}>Cantidad</th>
                    <th style={{ textAlign: 'right' }}>Stock Post.</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--toy-muted)' }}>Cargando movimientos...</span>
                      </td>
                    </tr>
                  ) : kardexData.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '3rem' }}>
                        <PackageOpen size={36} color="var(--toy-muted)" style={{ margin: '0 auto 0.5rem' }} />
                        <div style={{ fontWeight: 700, color: 'var(--toy-muted)' }}>No se encontraron movimientos con los filtros aplicados</div>
                      </td>
                    </tr>
                  ) : (
                    kardexData.map((row, idx) => (
                      <tr key={row.id_movimiento || idx}>
                        <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDateTime(row.fecha_hora)}</td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--toy-ink)' }}>{row.producto}</div>
                          <code style={{ fontSize: '0.72rem', color: 'var(--toy-muted)' }}>{row.codigo_sku}</code>
                        </td>
                        <td>{row.categoria}</td>
                        <td>{getTipoMovimientoBadge(row.tipo_movimiento)}</td>
                        <td>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{row.documento_tipo}</span>
                          {row.documento_id && <div style={{ fontSize: '0.72rem', color: 'var(--toy-muted)' }}>{row.documento_id}</div>}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{row.stock_anterior}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: row.tipo_movimiento === 'ENTRADA' ? 'var(--toy-green-dark)' : row.tipo_movimiento === 'SALIDA' ? 'var(--toy-red)' : 'var(--toy-ink)' }}>
                          {row.tipo_movimiento === 'ENTRADA' ? `+${row.cantidad}` : row.tipo_movimiento === 'SALIDA' ? `-${row.cantidad}` : row.cantidad}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>{row.stock_posterior}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--toy-muted)' }}>{row.usuario || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* Tabla Tab 2: Valoración CPP */}
            {activeTab === 'valoracion' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU / Producto</th>
                    <th>Categoría</th>
                    <th style={{ textAlign: 'right' }}>Stock</th>
                    <th style={{ textAlign: 'right' }}>Costo Promedio (CPP)</th>
                    <th style={{ textAlign: 'right' }}>Valor Costo</th>
                    <th style={{ textAlign: 'right' }}>Precio Menudeo</th>
                    <th style={{ textAlign: 'right' }}>Valor Comercial</th>
                    <th style={{ textAlign: 'right' }}>Utilidad</th>
                    <th style={{ textAlign: 'right' }}>Margen %</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--toy-muted)' }}>Calculando valoración...</span>
                      </td>
                    </tr>
                  ) : valoracionData.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '3rem' }}>
                        <PackageOpen size={36} color="var(--toy-muted)" style={{ margin: '0 auto 0.5rem' }} />
                        <div style={{ fontWeight: 700, color: 'var(--toy-muted)' }}>No se encontraron productos para valorar</div>
                      </td>
                    </tr>
                  ) : (
                    valoracionData.map((row, idx) => (
                      <tr key={row.id_producto || idx}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--toy-ink)' }}>{row.producto}</div>
                          <code style={{ fontSize: '0.72rem', color: 'var(--toy-muted)' }}>{row.codigo_sku}</code>
                        </td>
                        <td>{row.categoria}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: Number(row.stock_actual) <= Number(row.stock_minimo) ? 'var(--toy-red)' : 'var(--toy-ink)' }}>
                          {row.stock_actual}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--toy-blue)' }}>{formatMoney(row.costo_promedio)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatMoney(row.valor_total_costo)}</td>
                        <td style={{ textAlign: 'right' }}>{formatMoney(row.precio_menudeo)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatMoney(row.valor_total_comercial)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--toy-green-dark)' }}>{formatMoney(row.utilidad_potencial)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: parseFloat(row.margen_porcentaje) >= 30 ? 'var(--toy-green-dark)' : 'var(--toy-orange-dark)' }}>
                          {row.margen_porcentaje}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {valoracionData.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#FAF8F5', fontWeight: 800 }}>
                      <td colSpan={2} style={{ textAlign: 'right', padding: '0.75rem 1.25rem' }}>TOTALES</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem 1.25rem' }}>{valTotalesFooter.stock}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem 1.25rem' }}>-</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem 1.25rem', color: 'var(--toy-blue)' }}>{formatMoney(valTotalesFooter.costo)}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem 1.25rem' }}>-</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem 1.25rem' }}>{formatMoney(valTotalesFooter.comercial)}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem 1.25rem', color: 'var(--toy-green-dark)' }}>{formatMoney(valTotalesFooter.utilidad)}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem 1.25rem' }}>-</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}

            {/* Tabla Tab 3: Ventas */}
            {activeTab === 'ventas' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Factura No.</th>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Vendedor</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                    <th style={{ textAlign: 'right' }}>Descuento</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Saldo Pend.</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--toy-muted)' }}>Cargando ventas...</span>
                      </td>
                    </tr>
                  ) : ventasData.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '3rem' }}>
                        <PackageOpen size={36} color="var(--toy-muted)" style={{ margin: '0 auto 0.5rem' }} />
                        <div style={{ fontWeight: 700, color: 'var(--toy-muted)' }}>No se encontraron ventas en este período</div>
                      </td>
                    </tr>
                  ) : (
                    ventasData.map((row, idx) => (
                      <tr key={row.id_venta || idx}>
                        <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDateOnly(row.fecha_venta)}</td>
                        <td><code style={{ fontWeight: 800 }}>{row.numero_factura}</code></td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--toy-muted)' }}>{row.numero_pedido || '-'}</td>
                        <td style={{ fontWeight: 700 }}>{row.cliente}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--toy-muted)' }}>{row.vendedor || '-'}</td>
                        <td style={{ textAlign: 'right' }}>{formatMoney(row.subtotal)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--toy-orange-dark)', fontWeight: 700 }}>{formatMoney(row.descuento)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatMoney(row.total)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: parseFloat(row.saldo_pendiente) > 0 ? 'var(--toy-red)' : 'var(--toy-green-dark)' }}>
                          {formatMoney(row.saldo_pendiente)}
                        </td>
                        <td>{getEstadoBadge(row.estado)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {ventasData.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#FAF8F5', fontWeight: 800 }}>
                      <td colSpan={5} style={{ textAlign: 'right', padding: '0.75rem 1.25rem' }}>TOTALES</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem 1.25rem' }}>{formatMoney(ventasTotalesFooter.subtotal)}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem 1.25rem', color: 'var(--toy-orange-dark)' }}>{formatMoney(ventasTotalesFooter.descuento)}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem 1.25rem', color: 'var(--toy-ink)' }}>{formatMoney(ventasTotalesFooter.total)}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem 1.25rem', color: 'var(--toy-red)' }}>{formatMoney(ventasTotalesFooter.saldo)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}

            {/* Tabla Tab 4: Compras */}
            {activeTab === 'compras' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha Compra</th>
                    <th>Comprobante</th>
                    <th>Proveedor</th>
                    <th>Comprador</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th>Fecha Recepción</th>
                    <th>Estado</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--toy-muted)' }}>Cargando compras...</span>
                      </td>
                    </tr>
                  ) : comprasData.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                        <PackageOpen size={36} color="var(--toy-muted)" style={{ margin: '0 auto 0.5rem' }} />
                        <div style={{ fontWeight: 700, color: 'var(--toy-muted)' }}>No se encontraron compras en este período</div>
                      </td>
                    </tr>
                  ) : (
                    comprasData.map((row, idx) => (
                      <tr key={row.id_compra || idx}>
                        <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDateOnly(row.fecha_compra)}</td>
                        <td><code style={{ fontWeight: 800 }}>{row.numero_comprobante || row.numero_orden}</code></td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{row.proveedor}</div>
                          {row.nit_proveedor && <div style={{ fontSize: '0.72rem', color: 'var(--toy-muted)' }}>{row.nit_proveedor}</div>}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--toy-muted)' }}>{row.usuario_comprador || '-'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatMoney(row.total)}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--toy-muted)' }}>{formatDateOnly(row.fecha_recepcion)}</td>
                        <td>{getEstadoBadge(row.estado)}</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {row.observaciones || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {comprasData.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#FAF8F5', fontWeight: 800 }}>
                      <td colSpan={4} style={{ textAlign: 'right', padding: '0.75rem 1.25rem' }}>TOTALES</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem 1.25rem', color: 'var(--toy-ink)' }}>{formatMoney(comprasTotalesFooter.total)}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </div>
      </PageCard>

      {/* Reglas de Impresión (@media print) */}
      <style>{`
        @media print {
          body {
            background: #FFFFFF !important;
            color: #000000 !important;
            font-size: 9pt !important;
          }
          .no-print,
          aside,
          header,
          .card-toolbar,
          .sidebar,
          nav {
            display: none !important;
          }
          .print-header {
            display: block !important;
          }
          .card-unificada {
            border: none !important;
            box-shadow: none !important;
            height: auto !important;
            max-height: none !important;
            padding: 0 !important;
          }
          .table-container-embedded {
            overflow: visible !important;
            height: auto !important;
          }
          .data-table {
            width: 100% !important;
            font-size: 8pt !important;
            border-collapse: collapse !important;
          }
          .data-table th,
          .data-table td {
            border: 1px solid #D1D5DB !important;
            padding: 4px 6px !important;
          }
          .badge {
            border: 1px solid #9CA3AF !important;
            background: #F3F4F6 !important;
            color: #111827 !important;
          }
          @page {
            size: landscape;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
