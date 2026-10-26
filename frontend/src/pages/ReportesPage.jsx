import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Boxes,
  Layers,
  Download,
  Printer,
  Calendar,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../components/Toast';
import { useAuth } from '../auth/AuthContext';
import DatePicker from '../components/DatePicker';
import SearchInput from '../components/SearchInput';
import SearchableSelect from '../components/SearchableSelect';
import FilterDropdown from '../components/FilterDropdown';

// Formateador de moneda con prefijo 'Q ' explícito y 2 decimales
const formatMoney = (amount) => {
  const num = Number(amount) || 0;
  return `Q ${num.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Formateador de fecha/hora YYYY-MM-DD HH:mm
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

// Badge de tipo de movimiento para Kardex (semántica sobria)
const getTipoMovimientoBadge = (tipo) => {
  switch (tipo) {
    case 'ENTRADA':
      return (
        <span
          className="badge-kardex"
          style={{
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '0.74rem',
            fontWeight: 700,
            backgroundColor: '#D1FAE5',
            color: '#065F46',
            border: '1px solid #A7F3D0'
          }}
        >
          ENTRADA
        </span>
      );
    case 'SALIDA':
      return (
        <span
          className="badge-kardex"
          style={{
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '0.74rem',
            fontWeight: 700,
            backgroundColor: '#F3F4F6',
            color: '#374151',
            border: '1px solid #E5E7EB'
          }}
        >
          SALIDA
        </span>
      );
    case 'AJUSTE':
      return (
        <span
          className="badge-kardex"
          style={{
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '0.74rem',
            fontWeight: 700,
            backgroundColor: '#FEF3C7',
            color: '#92400E',
            border: '1px solid #FDE68A'
          }}
        >
          AJUSTE
        </span>
      );
    case 'DEVOLUCION':
      return (
        <span
          className="badge-kardex"
          style={{
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '0.74rem',
            fontWeight: 700,
            backgroundColor: '#DBEAFE',
            color: '#1E40AF',
            border: '1px solid #BFDBFE'
          }}
        >
          DEVOLUCIÓN
        </span>
      );
    default:
      return (
        <span
          className="badge-kardex"
          style={{
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '0.74rem',
            fontWeight: 700,
            backgroundColor: '#F3F4F6',
            color: '#4B5563',
            border: '1px solid #E5E7EB'
          }}
        >
          {tipo}
        </span>
      );
  }
};

// Cantidad firmada para Kardex con + o - explícito
const renderSignedQuantity = (cant, tipo) => {
  const num = Number(cant) || 0;
  if (tipo === 'SALIDA') {
    return (
      <span style={{ color: '#374151', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        -{Math.abs(num)}
      </span>
    );
  }
  if (tipo === 'ENTRADA' || tipo === 'DEVOLUCION') {
    return (
      <span style={{ color: '#065F46', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        +{Math.abs(num)}
      </span>
    );
  }
  if (num > 0) {
    return (
      <span style={{ color: '#065F46', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        +{num}
      </span>
    );
  } else if (num < 0) {
    return (
      <span style={{ color: '#92400E', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {num}
      </span>
    );
  }
  return <span style={{ color: '#6B7280', fontVariantNumeric: 'tabular-nums' }}>0</span>;
};

// Función para descargar CSV con BOM UTF-8 y números limpios
function exportToCSV(filename, headers, rows) {
  const csvLines = [];
  csvLines.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));

  for (const row of rows) {
    const line = row.map(cell => {
      if (cell === null || cell === undefined) return '""';
      const str = String(cell);
      return `"${str.replace(/"/g, '""')}"`;
    });
    csvLines.push(line.join(','));
  }

  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function ReportesPage() {
  const toast = useToast();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('kardex'); // 'kardex' | 'valoracion'

  const hoyStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // ========================================================
  // ESTADO: INFORME 1 - KARDEX FÍSICO
  // ========================================================
  const [kardexData, setKardexData] = useState([]);
  const [kardexKpis, setKardexKpis] = useState({
    total_entradas: 0,
    total_salidas: 0,
    variacion_neta: 0,
    total_movimientos: 0
  });
  const [kardexSelectedProduct, setKardexSelectedProduct] = useState(null);
  const [kardexLoading, setKardexLoading] = useState(false);

  // Filtros Kardex
  const [kardexFechaDesde, setKardexFechaDesde] = useState('');
  const [kardexFechaHasta, setKardexFechaHasta] = useState('');
  const [kardexProductoId, setKardexProductoId] = useState('');
  const [kardexCategoriaId, setKardexCategoriaId] = useState('');
  const [kardexTipoMovimiento, setKardexTipoMovimiento] = useState('');
  const [kardexDocumentoTipo, setKardexDocumentoTipo] = useState('');
  const [kardexOrden, setKardexOrden] = useState('');
  const [kardexQ, setKardexQ] = useState('');

  // Metadatos para dropdowns de Kardex
  const [kardexProductosList, setKardexProductosList] = useState([]);
  const [kardexCategoriasList, setKardexCategoriasList] = useState([]);

  // ========================================================
  // ESTADO: INFORME 2 - VALORACIÓN DE INVENTARIO
  // ========================================================
  const [valoracionData, setValoracionData] = useState([]);
  const [valoracionKpis, setValoracionKpis] = useState({
    valor_total_costo: 0,
    valor_total_comercial: 0,
    margen_bruto_potencial: 0,
    porcentaje_margen_global: 0,
    skus_alerta_agotados: 0,
    total_unidades_bodega: 0
  });
  const [valoracionLoading, setValoracionLoading] = useState(false);

  // Filtros Valoración
  const [valCategoriaId, setValCategoriaId] = useState('');
  const [valMarcaId, setValMarcaId] = useState('');
  const [valEstadoStock, setValEstadoStock] = useState(''); // '' | 'alerta' | 'agotados' | 'disponibles'
  const [valActivo, setValActivo] = useState('1'); // '1' | '0' | ''
  const [valQ, setValQ] = useState('');

  // Metadatos para dropdowns de Valoración
  const [valCategoriasList, setValCategoriasList] = useState([]);
  const [valMarcasList, setValMarcasList] = useState([]);

  // ========================================================
  // CARGA DE DATOS: KARDEX
  // ========================================================
  const fetchKardex = useCallback(async () => {
    setKardexLoading(true);
    try {
      const params = {};
      if (kardexFechaDesde) params.fecha_desde = kardexFechaDesde;
      if (kardexFechaHasta) params.fecha_hasta = kardexFechaHasta;
      if (kardexProductoId && kardexProductoId !== 'todos') params.id_producto = kardexProductoId;
      if (kardexCategoriaId && kardexCategoriaId !== 'todos') params.id_categoria = kardexCategoriaId;
      if (kardexTipoMovimiento && kardexTipoMovimiento !== 'todos') params.tipo_movimiento = kardexTipoMovimiento;
      if (kardexDocumentoTipo && kardexDocumentoTipo !== 'todos') params.documento_tipo = kardexDocumentoTipo;
      if (kardexOrden) params.orden = kardexOrden;
      const queryTerm = typeof kardexQ === 'string' ? kardexQ.trim() : (kardexQ?.target?.value?.trim() || '');
      if (queryTerm) params.q = queryTerm;

      const res = await api.get('/reportes/kardex', { params });
      if (res?.data) {
        setKardexData(res.data.filas || []);
        if (res.data.kpis) setKardexKpis(res.data.kpis);
        setKardexSelectedProduct(res.data.producto_seleccionado || null);
        if (res.data.metadatos) {
          if (res.data.metadatos.productos) setKardexProductosList(res.data.metadatos.productos);
          if (res.data.metadatos.categorias) setKardexCategoriasList(res.data.metadatos.categorias);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error al consultar informe de Kardex');
    } finally {
      setKardexLoading(false);
    }
  }, [
    kardexFechaDesde,
    kardexFechaHasta,
    kardexProductoId,
    kardexCategoriaId,
    kardexTipoMovimiento,
    kardexDocumentoTipo,
    kardexOrden,
    kardexQ,
    toast
  ]);

  // ========================================================
  // CARGA DE DATOS: VALORACIÓN
  // ========================================================
  const fetchValoracion = useCallback(async () => {
    setValoracionLoading(true);
    try {
      const params = {};
      if (valCategoriaId && valCategoriaId !== 'todos') params.id_categoria = valCategoriaId;
      if (valMarcaId && valMarcaId !== 'todos') params.id_marca = valMarcaId;
      if (valEstadoStock && valEstadoStock !== 'todos') params.estado_stock = valEstadoStock;
      if (valActivo && valActivo !== 'todos') params.activo = valActivo;
      const queryTerm = typeof valQ === 'string' ? valQ.trim() : (valQ?.target?.value?.trim() || '');
      if (queryTerm) params.q = queryTerm;

      const res = await api.get('/reportes/valoracion-inventario', { params });
      if (res?.data) {
        setValoracionData(res.data.filas || []);
        if (res.data.kpis) setValoracionKpis(res.data.kpis);
        if (res.data.metadatos) {
          if (res.data.metadatos.categorias) setValCategoriasList(res.data.metadatos.categorias);
          if (res.data.metadatos.marcas) setValMarcasList(res.data.metadatos.marcas);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error al consultar valoración de inventario');
    } finally {
      setValoracionLoading(false);
    }
  }, [valCategoriaId, valMarcaId, valEstadoStock, valActivo, valQ, toast]);

  useEffect(() => {
    if (activeTab === 'kardex') {
      fetchKardex();
    }
  }, [activeTab, fetchKardex]);

  useEffect(() => {
    if (activeTab === 'valoracion') {
      fetchValoracion();
    }
  }, [activeTab, fetchValoracion]);

  // Opciones de producto para SearchableSelect en Kardex
  const productoOptions = useMemo(() => {
    const list = [{ value: '', label: 'Todos los productos' }];
    kardexProductosList.forEach((p) => {
      list.push({
        value: String(p.id_producto),
        label: `${p.codigo_sku} - ${p.nombre}`,
        sublabel: p.categoria
      });
    });
    return list;
  }, [kardexProductosList]);

  // ========================================================
  // OPCIONES PARA FILTERDROPDOWN (SISTEMA PROPIO)
  // ========================================================
  // Kardex
  const tipoMovimientoOptions = useMemo(() => [
    { value: '', label: 'Todos los movimientos', shortLabel: 'Movimiento' },
    { value: 'ENTRADA', label: 'ENTRADA (Compras / Ingresos)', shortLabel: 'Entrada' },
    { value: 'SALIDA', label: 'SALIDA (Ventas / Despachos)', shortLabel: 'Salida' },
    { value: 'AJUSTE', label: 'AJUSTE (Ajustes Físicos)', shortLabel: 'Ajuste' },
    { value: 'DEVOLUCION', label: 'DEVOLUCIÓN (Retornos)', shortLabel: 'Devolución' }
  ], []);

  const documentoTipoOptions = useMemo(() => [
    { value: '', label: 'Todos los documentos', shortLabel: 'Documento' },
    { value: 'COMPRA', label: 'COMPRA (Órdenes de Compra)', shortLabel: 'Compra' },
    { value: 'VENTA', label: 'VENTA (Facturación)', shortLabel: 'Venta' },
    { value: 'AJUSTE_FISICO', label: 'AJUSTE FÍSICO', shortLabel: 'Ajuste Físico' }
  ], []);

  const categoriaKardexOptions = useMemo(() => [
    { value: '', label: 'Todas las categorías', shortLabel: 'Categoría' },
    ...kardexCategoriasList.map((c) => ({
      value: String(c.id_categoria),
      label: c.nombre,
      shortLabel: c.nombre
    }))
  ], [kardexCategoriasList]);

  const ordenOptions = useMemo(() => [
    { value: '', label: 'Más recientes primero (DESC)', shortLabel: 'Orden' },
    { value: 'ASC', label: 'Secuencia cronológica (ASC)', shortLabel: 'Cronológico' }
  ], []);

  // Valoración
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
    { value: '', label: 'Todos los niveles de stock', shortLabel: 'Nivel Stock' },
    { value: 'alerta', label: 'En Alerta (Bajo Mínimo)', shortLabel: 'En Alerta' },
    { value: 'agotados', label: 'Agotados (Stock 0)', shortLabel: 'Agotados' },
    { value: 'disponibles', label: 'Con Existencias (> 0)', shortLabel: 'Con Stock' }
  ], []);

  const activoOptions = useMemo(() => [
    { value: '1', label: 'Solo Productos Activos', shortLabel: 'Solo Activos' },
    { value: '0', label: 'Solo Inactivos / Descontinuados', shortLabel: 'Solo Inactivos' },
    { value: '', label: 'Todos los estados', shortLabel: 'Estado' }
  ], []);

  // ========================================================
  // ACCIONES: EXPORTACIÓN CSV E IMPRESIÓN
  // ========================================================
  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    if (activeTab === 'kardex') {
      const headers = [
        'Fecha y Hora',
        'SKU',
        'Producto',
        'Categoria',
        'Tipo Movimiento',
        'Documento Tipo',
        'Documento ID',
        'Stock Anterior',
        'Cantidad',
        'Stock Posterior',
        'Usuario',
        'Motivo'
      ];
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
      exportToCSV(`kardex_inventario_${timestamp}.csv`, headers, rows);
      toast.success('Archivo CSV de Kardex descargado exitosamente');
    } else {
      const headers = [
        'SKU',
        'Producto',
        'Categoria',
        'Marca',
        'Stock Actual',
        'Stock Minimo',
        'Costo Promedio (CPP)',
        'Valor Total Costo',
        'Precio Menudeo (Niv. 1)',
        'Valor Total Comercial',
        'Utilidad Potencial',
        'Margen %',
        'Participacion Costo %'
      ];
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
      toast.success('Archivo CSV de Valoración descargado exitosamente');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Texto de filtros para encabezado formal de impresión
  const printFiltersSummary = useMemo(() => {
    if (activeTab === 'kardex') {
      const parts = [];
      if (kardexFechaDesde || kardexFechaHasta) {
        parts.push(`Periodo: ${kardexFechaDesde || 'Inicio'} al ${kardexFechaHasta || 'Hoy'}`);
      }
      if (kardexSelectedProduct && kardexProductoId !== '') {
        parts.push(`Producto: ${kardexSelectedProduct.codigo_sku} - ${kardexSelectedProduct.nombre}`);
      } else {
        parts.push('Producto: Todos los productos');
      }
      if (kardexCategoriaId && kardexCategoriaId !== 'todos') {
        const cat = kardexCategoriasList.find(c => String(c.id_categoria) === String(kardexCategoriaId));
        parts.push(`Categoría: ${cat ? cat.nombre : kardexCategoriaId}`);
      }
      if (kardexTipoMovimiento && kardexTipoMovimiento !== 'todos') parts.push(`Tipo: ${kardexTipoMovimiento}`);
      if (kardexDocumentoTipo && kardexDocumentoTipo !== 'todos') parts.push(`Doc: ${kardexDocumentoTipo}`);
      if (kardexOrden === 'ASC') parts.push('Orden: Cronológico ASC');
      return parts.length > 0 ? parts.join(' | ') : 'Todos los movimientos registrados';
    } else {
      const parts = [];
      if (valCategoriaId && valCategoriaId !== 'todos') {
        const cat = valCategoriasList.find(c => String(c.id_categoria) === String(valCategoriaId));
        parts.push(`Categoría: ${cat ? cat.nombre : valCategoriaId}`);
      }
      if (valMarcaId && valMarcaId !== 'todos') {
        const mar = valMarcasList.find(m => String(m.id_marca) === String(valMarcaId));
        parts.push(`Marca: ${mar ? mar.nombre : valMarcaId}`);
      }
      if (valEstadoStock && valEstadoStock !== 'todos') parts.push(`Nivel Stock: ${valEstadoStock}`);
      if (valActivo === '1') parts.push('Productos: Solo Activos');
      else if (valActivo === '0') parts.push('Productos: Inactivos');
      return parts.length > 0 ? parts.join(' | ') : 'Todos los productos y categorías del inventario';
    }
  }, [
    activeTab,
    kardexFechaDesde,
    kardexFechaHasta,
    kardexSelectedProduct,
    kardexCategoriaId,
    kardexTipoMovimiento,
    kardexDocumentoTipo,
    kardexOrden,
    kardexCategoriasList,
    valCategoriaId,
    valMarcaId,
    valEstadoStock,
    valActivo,
    valCategoriasList,
    valMarcasList
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ========================================================
          ENCABEZADO FORMAL PARA IMPRESIÓN Y PDF (@media print)
          (100% fondo blanco puro, sobrio, formal para auditoría/gerencia)
         ======================================================== */}
      <div className="print-header" style={{ display: 'none' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #111827',
            paddingBottom: '6px',
            marginBottom: '8px'
          }}
        >
          <div>
            <h1 style={{ fontSize: '13pt', fontWeight: 800, margin: 0, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Juguetería Quetzal - Sistema de Gestión
            </h1>
            <h2 style={{ fontSize: '10.5pt', fontWeight: 700, margin: '2px 0 0 0', color: '#374151' }}>
              {activeTab === 'kardex'
                ? 'Informe de Kardex Físico y Trazabilidad de Inventario'
                : 'Informe de Valoración Total y Valuación Contable de Inventario'}
            </h2>
          </div>
          <div style={{ textAlign: 'right', fontSize: '8pt', color: '#4B5563', lineHeight: '1.3' }}>
            <div><strong>Emisión:</strong> {new Date().toLocaleString()}</div>
            <div><strong>Emitido por:</strong> {user?.nombre_completo || 'Administrador'}</div>
          </div>
        </div>
        <div style={{ fontSize: '8pt', color: '#1F2937', border: '1px solid #D1D5DB', padding: '4px 8px', borderRadius: '4px', marginBottom: '10px', backgroundColor: '#FFFFFF' }}>
          <strong>Parámetros y filtros aplicados:</strong> {printFiltersSummary}
        </div>
      </div>

      {/* ========================================================
          CABECERA DE CONTROL PRINCIPAL (PANTALLA)
         ======================================================== */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--toy-ink)',
              margin: 0
            }}
          >
            Informes de Inventario
          </h1>
        </div>

        {/* Acciones de Cabecera: Píldora de Subvistas + Exportar CSV + Imprimir */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Navegación por Pestañas Sobria estilo Píldora */}
          <div
            style={{
              backgroundColor: 'rgba(255, 244, 221, 0.85)',
              padding: '0.25rem',
              borderRadius: '999px',
              border: '2px solid var(--toy-border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('kardex')}
              className={activeTab === 'kardex' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
              style={{
                borderRadius: '999px',
                height: '34px',
                padding: '0 0.9rem',
                fontSize: '0.78rem',
                border: 'none',
                boxShadow: activeTab === 'kardex' ? '0 2px 0 var(--toy-deep-blue)' : 'none'
              }}
            >
              <Boxes size={14} strokeWidth={2.4} />
              <span>Kardex Físico</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('valoracion')}
              className={activeTab === 'valoracion' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
              style={{
                borderRadius: '999px',
                height: '34px',
                padding: '0 0.9rem',
                fontSize: '0.78rem',
                border: 'none',
                boxShadow: activeTab === 'valoracion' ? '0 2px 0 var(--toy-deep-blue)' : 'none'
              }}
            >
              <Layers size={14} strokeWidth={2.4} />
              <span>Valoración Total</span>
            </button>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExportCSV}
            title="Descargar datos en formato CSV para Excel (números limpios)"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', height: '36px' }}
          >
            <Download size={15} />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handlePrint}
            title="Imprimir informe en formato formal o guardar en PDF"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', height: '36px' }}
          >
            <Printer size={15} />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          FRANJA DE 4 TARJETAS KPI (NIVEL 2)
         ======================================================== */}
      {activeTab === 'kardex' ? (
        <div
          className="kpi-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '0.9rem'
          }}
        >
          {/* KPI 1: Total Entradas */}
          <div
            className="kpi-card"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1.5px solid var(--toy-border)',
              borderRadius: '14px',
              padding: '0.9rem 1rem',
              boxShadow: 'var(--shadow-toy-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem'
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--toy-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Entradas (Unid.)
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#065F46', fontVariantNumeric: 'tabular-nums' }}>
              +{kardexKpis.total_entradas}
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)' }}>
              Compras y devoluciones
            </span>
          </div>

          {/* KPI 2: Total Salidas */}
          <div
            className="kpi-card"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1.5px solid var(--toy-border)',
              borderRadius: '14px',
              padding: '0.9rem 1rem',
              boxShadow: 'var(--shadow-toy-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem'
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--toy-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Salidas (Unid.)
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
              -{kardexKpis.total_salidas}
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)' }}>
              Ventas y despachos
            </span>
          </div>

          {/* KPI 3: Variación Neta */}
          <div
            className="kpi-card"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1.5px solid var(--toy-border)',
              borderRadius: '14px',
              padding: '0.9rem 1rem',
              boxShadow: 'var(--shadow-toy-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem'
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--toy-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Variación Neta
            </span>
            <div
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: kardexKpis.variacion_neta >= 0 ? '#065F46' : '#DC2626',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {kardexKpis.variacion_neta >= 0 ? `+${kardexKpis.variacion_neta}` : kardexKpis.variacion_neta}
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)' }}>
              Balance neto de unidades
            </span>
          </div>

          {/* KPI 4: Movimientos Auditados */}
          <div
            className="kpi-card"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1.5px solid var(--toy-border)',
              borderRadius: '14px',
              padding: '0.9rem 1rem',
              boxShadow: 'var(--shadow-toy-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem'
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--toy-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Movimientos Auditados
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--toy-ink)', fontVariantNumeric: 'tabular-nums' }}>
              {kardexKpis.total_movimientos}
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)' }}>
              Registros trazados
            </span>
          </div>
        </div>
      ) : (
        <div
          className="kpi-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '0.9rem'
          }}
        >
          {/* KPI 1: Valor Total Costo */}
          <div
            className="kpi-card"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1.5px solid var(--toy-border)',
              borderRadius: '14px',
              padding: '0.9rem 1rem',
              boxShadow: 'var(--shadow-toy-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem'
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--toy-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Valor Total a Costo (CPP)
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--toy-ink)', fontVariantNumeric: 'tabular-nums' }}>
              {formatMoney(valoracionKpis.valor_total_costo)}
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)' }}>
              Costo promedio ponderado
            </span>
          </div>

          {/* KPI 2: Valor Comercial */}
          <div
            className="kpi-card"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1.5px solid var(--toy-border)',
              borderRadius: '14px',
              padding: '0.9rem 1rem',
              boxShadow: 'var(--shadow-toy-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem'
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--toy-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Valor Comercial (Menudeo)
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--toy-deep-blue)', fontVariantNumeric: 'tabular-nums' }}>
              {formatMoney(valoracionKpis.valor_total_comercial)}
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)' }}>
              Precio venta escala 1
            </span>
          </div>

          {/* KPI 3: Margen Bruto Potencial */}
          <div
            className="kpi-card"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1.5px solid var(--toy-border)',
              borderRadius: '14px',
              padding: '0.9rem 1rem',
              boxShadow: 'var(--shadow-toy-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem'
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--toy-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Margen Bruto Potencial
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#065F46', fontVariantNumeric: 'tabular-nums' }}>
              {formatMoney(valoracionKpis.margen_bruto_potencial)}
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)' }}>
              Margen proyectado: {valoracionKpis.porcentaje_margen_global}%
            </span>
          </div>

          {/* KPI 4: SKUs en Alerta / Agotados */}
          <div
            className="kpi-card"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1.5px solid var(--toy-border)',
              borderRadius: '14px',
              padding: '0.9rem 1rem',
              boxShadow: 'var(--shadow-toy-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem'
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--toy-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              SKUs en Alerta / Agotados
            </span>
            <div
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: valoracionKpis.skus_alerta_agotados > 0 ? '#DC2626' : 'var(--toy-green-dark)',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {valoracionKpis.skus_alerta_agotados}
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)' }}>
              {valoracionKpis.total_unidades_bodega} unidades en bodega
            </span>
          </div>
        </div>
      )}

      {/* ========================================================
          CONTENEDOR PRINCIPAL: FILTROS + TABLA DE ALTA DENSIDAD
         ======================================================== */}
      <div
        className="report-card"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1.5px solid var(--toy-border)',
          borderRadius: '18px',
          boxShadow: 'var(--shadow-toy-card)',
          overflow: 'hidden'
        }}
      >
        {/* BARRA DE FILTROS REACTIVOS (CON COMPONENTES PROPIOS DEL SISTEMA) */}
        <div
          className="no-print"
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#FBF9F4',
            borderBottom: '1.5px solid var(--toy-border)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.65rem',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {activeTab === 'kardex' ? (
            /* Filtros de Kardex con componentes propios: SearchInput, SearchableSelect, FilterDropdown, DatePicker */
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
              <div style={{ width: '200px' }}>
                <SearchInput
                  value={typeof kardexQ === 'string' ? kardexQ : (kardexQ?.target?.value || '')}
                  onChange={(e) => {
                    const val = typeof e === 'string' ? e : (e?.target?.value ?? '');
                    setKardexQ(val);
                  }}
                  placeholder=""
                />
              </div>

              {/* Selector de Producto con buscador propio */}
              <div style={{ width: '250px' }}>
                <SearchableSelect
                  value={kardexProductoId}
                  onChange={(val) => setKardexProductoId(val || 'todos')}
                  options={productoOptions}
                  placeholder="Producto: Todos"
                />
              </div>

              {/* Filtro Dropdown Propio: Categoría */}
              <FilterDropdown
                options={categoriaKardexOptions}
                value={kardexCategoriaId}
                onChange={setKardexCategoriaId}
                title="Filtrar por categoría"
                buttonTitle="Categoría"
                searchable
              />

              {/* Filtro Dropdown Propio: Tipo Movimiento */}
              <FilterDropdown
                options={tipoMovimientoOptions}
                value={kardexTipoMovimiento}
                onChange={setKardexTipoMovimiento}
                title="Filtrar por tipo de movimiento"
                buttonTitle="Movimiento"
              />

              {/* Filtro Dropdown Propio: Tipo Documento */}
              <FilterDropdown
                options={documentoTipoOptions}
                value={kardexDocumentoTipo}
                onChange={setKardexDocumentoTipo}
                title="Filtrar por tipo de documento"
                buttonTitle="Documento"
              />

              {/* Filtro Dropdown Propio: Orden Cronológico */}
              <FilterDropdown
                options={ordenOptions}
                value={kardexOrden}
                onChange={setKardexOrden}
                title="Orden cronológico"
                buttonTitle="Orden"
              />

              {/* Rango de Fechas con componente propio DatePicker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Desde:</span>
                <DatePicker
                  value={kardexFechaDesde}
                  onChange={(val) => {
                    if (val && val > hoyStr) return;
                    setKardexFechaDesde(val);
                  }}
                  placeholder="Desde"
                  width="125px"
                  max={kardexFechaHasta || hoyStr}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Hasta:</span>
                <DatePicker
                  value={kardexFechaHasta}
                  onChange={(val) => {
                    if (val && val > hoyStr) return;
                    setKardexFechaHasta(val);
                  }}
                  placeholder="Hasta"
                  width="125px"
                  min={kardexFechaDesde || undefined}
                  max={hoyStr}
                  align="right"
                />
              </div>
            </div>
          ) : (
            /* Filtros de Valoración con componentes propios: SearchInput, FilterDropdown */
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
              <div style={{ width: '220px' }}>
                <SearchInput
                  value={typeof valQ === 'string' ? valQ : (valQ?.target?.value || '')}
                  onChange={(e) => {
                    const val = typeof e === 'string' ? e : (e?.target?.value ?? '');
                    setValQ(val);
                  }}
                  placeholder=""
                />
              </div>

              {/* Filtro Dropdown Propio: Categoría */}
              <FilterDropdown
                options={categoriaValoracionOptions}
                value={valCategoriaId}
                onChange={setValCategoriaId}
                title="Filtrar por categoría"
                buttonTitle="Categoría"
                searchable
              />

              {/* Filtro Dropdown Propio: Marca */}
              <FilterDropdown
                options={marcaValoracionOptions}
                value={valMarcaId}
                onChange={setValMarcaId}
                title="Filtrar por marca"
                buttonTitle="Marca"
                searchable
              />

              {/* Filtro Dropdown Propio: Estado de Stock */}
              <FilterDropdown
                options={estadoStockOptions}
                value={valEstadoStock}
                onChange={setValEstadoStock}
                title="Nivel de stock disponible"
                buttonTitle="Nivel Stock"
              />

              {/* Filtro Dropdown Propio: Estado Activo / Inactivo */}
              <FilterDropdown
                options={activoOptions}
                value={valActivo}
                onChange={setValActivo}
                title="Estado comercial del producto"
                buttonTitle="Estado"
              />
            </div>
          )}
        </div>

        {/* TABLA DE DATOS DE ALTA DENSIDAD (RESPONSIVE EN PANTALLA Y EN PDF/IMPRESIÓN) */}
        <div style={{ overflowX: 'auto', width: '100%' }} className="report-table-container">
          {activeTab === 'kardex' ? (
            /* TABLA KARDEX */
            <table className="table report-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8F5EE', borderBottom: '2px solid var(--toy-border)' }}>
                  <th style={{ width: '13%', padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 800 }}>Fecha y Hora</th>
                  <th style={{ width: '22%', padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 800 }}>SKU / Producto</th>
                  <th style={{ width: '9%', padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 800 }}>Tipo</th>
                  <th style={{ width: '13%', padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 800 }}>Documento Ref.</th>
                  <th style={{ width: '8%', padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800 }}>Stock Ant.</th>
                  <th style={{ width: '8%', padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800 }}>Cantidad</th>
                  <th style={{ width: '8%', padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800 }}>Stock Post.</th>
                  <th style={{ width: '19%', padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 800 }}>Usuario / Motivo</th>
                </tr>
              </thead>
              <tbody>
                {kardexLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--toy-muted)' }}>
                      Cargando trazabilidad del Kardex...
                    </td>
                  </tr>
                ) : kardexData.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--toy-muted)' }}>
                      No se encontraron movimientos registrados para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  kardexData.map((row) => (
                    <tr
                      key={row.id_movimiento}
                      style={{ borderBottom: '1px solid var(--toy-border-light)' }}
                    >
                      <td style={{ padding: '0.55rem 0.85rem', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: 'var(--toy-muted)', fontWeight: 600 }}>
                        {formatDateTime(row.fecha_hora)}
                      </td>
                      <td style={{ padding: '0.55rem 0.85rem' }}>
                        <code style={{ fontSize: '0.76rem', padding: '1px 5px', backgroundColor: '#F3EFE6', borderRadius: '4px', marginRight: '5px' }}>
                          {row.codigo_sku}
                        </code>
                        <strong style={{ color: 'var(--toy-ink)' }}>{row.producto}</strong>
                      </td>
                      <td style={{ padding: '0.55rem 0.85rem', textAlign: 'center' }}>
                        {getTipoMovimientoBadge(row.tipo_movimiento)}
                      </td>
                      <td style={{ padding: '0.55rem 0.85rem', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 600, color: 'var(--toy-ink)' }}>
                          {row.documento_tipo}
                        </span>
                        {row.documento_id && (
                          <span style={{ marginLeft: '4px', color: 'var(--toy-muted)', fontSize: '0.78rem' }}>
                            ({row.documento_id})
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--toy-muted)' }}>
                        {row.stock_anterior}
                      </td>
                      <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {renderSignedQuantity(row.cantidad, row.tipo_movimiento)}
                      </td>
                      <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: 'var(--toy-ink)' }}>
                        {row.stock_posterior}
                      </td>
                      <td style={{ padding: '0.55rem 0.85rem' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--toy-ink)' }}>
                          {row.usuario}
                        </div>
                        {row.motivo && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--toy-muted)' }}>
                            {row.motivo}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* FOOTER DE TOTALES EN KARDEX */}
              <tfoot>
                {kardexSelectedProduct && kardexProductoId && kardexProductoId !== 'todos' ? (
                  <tr
                    style={{
                      backgroundColor: '#F8F5EE',
                      borderTop: '2px solid var(--toy-border)',
                      fontWeight: 800,
                      fontSize: '0.84rem'
                    }}
                  >
                    <td colSpan={4} style={{ padding: '0.75rem 0.85rem' }}>
                      <span>Totales para SKU: </span>
                      <code style={{ fontSize: '0.8rem', padding: '1px 5px', backgroundColor: '#FFFFFF', borderRadius: '4px' }}>
                        {kardexSelectedProduct.codigo_sku}
                      </code>
                      <span style={{ marginLeft: '6px' }}>({kardexSelectedProduct.nombre})</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--toy-muted)' }}>
                      Saldo Inicial: {kardexSelectedProduct.saldo_inicial ?? '-'}
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ color: '#065F46' }}>+{kardexKpis.total_entradas}</span> /{' '}
                      <span style={{ color: '#374151' }}>-{kardexKpis.total_salidas}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--toy-deep-blue)' }}>
                      Saldo Final: {kardexSelectedProduct.saldo_final ?? kardexSelectedProduct.stock_actual}
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.78rem', color: 'var(--toy-muted)' }}>
                      Variación: {kardexKpis.variacion_neta >= 0 ? `+${kardexKpis.variacion_neta}` : kardexKpis.variacion_neta} unid.
                    </td>
                  </tr>
                ) : (
                  <tr
                    style={{
                      backgroundColor: '#F8F5EE',
                      borderTop: '2px solid var(--toy-border)',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      color: 'var(--toy-ink)'
                    }}
                  >
                    <td colSpan={8} style={{ padding: '0.75rem 0.85rem' }}>
                      <span>Total Movimientos: <strong>{kardexKpis.total_movimientos}</strong></span>
                      <span style={{ margin: '0 0.85rem', color: 'var(--toy-border)' }}>|</span>
                      <span>Total Entradas: <strong style={{ color: '#065F46' }}>+{kardexKpis.total_entradas} unid.</strong></span>
                      <span style={{ margin: '0 0.85rem', color: 'var(--toy-border)' }}>|</span>
                      <span>Total Salidas: <strong style={{ color: '#374151' }}>-{kardexKpis.total_salidas} unid.</strong></span>
                      <span style={{ margin: '0 0.85rem', color: 'var(--toy-border)' }}>|</span>
                      <span>Variación Neta: <strong style={{ color: kardexKpis.variacion_neta >= 0 ? '#065F46' : '#DC2626' }}>
                        {kardexKpis.variacion_neta >= 0 ? `+${kardexKpis.variacion_neta}` : kardexKpis.variacion_neta} unid.
                      </strong></span>
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          ) : (
            /* TABLA VALORACIÓN DE INVENTARIO */
            <table className="table report-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8F5EE', borderBottom: '2px solid var(--toy-border)' }}>
                  <th style={{ width: '10%', padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 800 }}>SKU</th>
                  <th style={{ width: '23%', padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 800 }}>Producto y Categoría</th>
                  <th style={{ width: '10%', padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800 }}>Stock Act. / Mín.</th>
                  <th style={{ width: '11%', padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800 }}>Costo Prom. (CPP)</th>
                  <th style={{ width: '13%', padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800 }}>Valor Total Costo</th>
                  <th style={{ width: '11%', padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800 }}>Precio Menudeo</th>
                  <th style={{ width: '13%', padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800 }}>Valor Comercial</th>
                  <th style={{ width: '9%', padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800 }}>% Part.</th>
                </tr>
              </thead>
              <tbody>
                {valoracionLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--toy-muted)' }}>
                      Calculando valoración contable y comercial del inventario...
                    </td>
                  </tr>
                ) : valoracionData.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--toy-muted)' }}>
                      No se encontraron productos registrados con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  valoracionData.map((row) => {
                    const isAgotado = row.stock_actual === 0;
                    const isBajoMinimo = row.stock_actual <= row.stock_minimo && !isAgotado;

                    return (
                      <tr
                        key={row.id_producto}
                        style={{ borderBottom: '1px solid var(--toy-border-light)' }}
                      >
                        <td style={{ padding: '0.55rem 0.85rem', whiteSpace: 'nowrap' }}>
                          <code style={{ fontSize: '0.78rem', padding: '1px 5px', backgroundColor: '#F3EFE6', borderRadius: '4px' }}>
                            {row.codigo_sku}
                          </code>
                        </td>
                        <td style={{ padding: '0.55rem 0.85rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--toy-ink)' }}>{row.producto}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--toy-muted)' }}>
                            {row.categoria} • {row.marca}
                          </div>
                        </td>
                        <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          <div style={{ fontWeight: 700 }}>
                            {row.stock_actual}{' '}
                            <span style={{ color: 'var(--toy-muted)', fontWeight: 400 }}>/ {row.stock_minimo}</span>
                          </div>
                          {isAgotado && (
                            <span
                              style={{
                                display: 'inline-block',
                                marginTop: '2px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                backgroundColor: '#FEE2E2',
                                color: '#991B1B',
                                border: '1px solid #FECACA'
                              }}
                            >
                              Agotado
                            </span>
                          )}
                          {isBajoMinimo && (
                            <span
                              style={{
                                display: 'inline-block',
                                marginTop: '2px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                backgroundColor: '#FEF3C7',
                                color: '#92400E',
                                border: '1px solid #FDE68A'
                              }}
                            >
                              Bajo mínimo
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {formatMoney(row.costo_promedio)}
                        </td>
                        <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: 'var(--toy-ink)' }}>
                          {formatMoney(row.valor_total_costo)}
                        </td>
                        <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {formatMoney(row.precio_menudeo)}
                        </td>
                        <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--toy-deep-blue)' }}>
                          {formatMoney(row.valor_total_comercial)}
                        </td>
                        <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {row.porcentaje_participacion.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* FOOTER DE TOTALES EN VALORACIÓN */}
              <tfoot>
                <tr
                  style={{
                    backgroundColor: '#F8F5EE',
                    borderTop: '2px solid var(--toy-border)',
                    fontWeight: 800,
                    fontSize: '0.84rem'
                  }}
                >
                  <td colSpan={2} style={{ padding: '0.75rem 0.85rem' }}>
                    Totales Generales ({valoracionData.length} SKUs):
                  </td>
                  <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--toy-ink)' }}>
                    {valoracionKpis.total_unidades_bodega} unid.
                  </td>
                  <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', color: 'var(--toy-muted)' }}>
                    -
                  </td>
                  <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--toy-ink)', fontSize: '0.9rem' }}>
                    {formatMoney(valoracionKpis.valor_total_costo)}
                  </td>
                  <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', color: 'var(--toy-muted)' }}>
                    -
                  </td>
                  <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--toy-deep-blue)', fontSize: '0.9rem' }}>
                    {formatMoney(valoracionKpis.valor_total_comercial)}
                  </td>
                  <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    100.00%
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* ========================================================
          ESTILOS DE IMPRESIÓN RESPONSIVE Y 100% PAPEL BLANCO
         ======================================================== */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 8mm 10mm;
          }

          /* Eliminar completamente fondos, texturas, patrones y sombras */
          *, *::before, *::after {
            background-image: none !important;
            box-shadow: none !important;
            text-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          html, body, #root, .app-layout, .main-wrapper, .page-content, main {
            background: #FFFFFF !important;
            background-color: #FFFFFF !important;
            background-image: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            display: block !important;
            position: static !important;
          }

          .sidebar, .top-navbar, .topbar, .navbar, header, aside, .no-print, button, .btn, .search-input-wrapper, .toast-container {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-header {
            display: block !important;
            margin-bottom: 8px !important;
          }

          .kpi-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 8px !important;
            margin-bottom: 10px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .kpi-card {
            border: 1px solid #9CA3AF !important;
            padding: 5px 8px !important;
            background: #FFFFFF !important;
            background-color: #FFFFFF !important;
            box-shadow: none !important;
            border-radius: 4px !important;
          }

          .kpi-card span {
            font-size: 7pt !important;
            color: #4B5563 !important;
            display: block !important;
          }

          .kpi-card div {
            font-size: 11pt !important;
            color: #111827 !important;
            font-weight: 800 !important;
          }

          .report-card {
            border: none !important;
            box-shadow: none !important;
            background: #FFFFFF !important;
            background-color: #FFFFFF !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }

          .report-table-container {
            overflow: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          table.report-table {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-size: 7.5pt !important;
            color: #111827 !important;
            line-height: 1.25 !important;
          }

          table.report-table thead {
            display: table-header-group !important;
          }

          table.report-table tfoot {
            display: table-footer-group !important;
          }

          table.report-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          table.report-table th {
            background-color: #F3F4F6 !important;
            color: #111827 !important;
            border: 1px solid #9CA3AF !important;
            padding: 4px 6px !important;
            font-weight: 700 !important;
            font-size: 7.5pt !important;
          }

          table.report-table td {
            border: 1px solid #D1D5DB !important;
            padding: 3px 5px !important;
            background: #FFFFFF !important;
            background-color: #FFFFFF !important;
            color: #111827 !important;
            font-size: 7.5pt !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
          }

          table.report-table code {
            font-size: 7pt !important;
            background: transparent !important;
            padding: 0 !important;
            border: none !important;
            font-weight: 700 !important;
          }

          table.report-table tfoot tr {
            background-color: #F9FAFB !important;
            border-top: 2px solid #111827 !important;
          }

          table.report-table tfoot td {
            border: 1px solid #9CA3AF !important;
            padding: 4px 6px !important;
            font-weight: 700 !important;
          }

          .badge-kardex {
            background: transparent !important;
            border: none !important;
            font-weight: 800 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
