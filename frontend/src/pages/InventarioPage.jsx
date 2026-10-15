import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  ClipboardList,
  AlertTriangle,
  SlidersHorizontal,
  PackagePlus,
  ShoppingBag,
  X
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import SearchInput from '../components/SearchInput';
import FilterDropdown from '../components/FilterDropdown';
import PageCard from '../components/PageCard';
import PermissionGate from '../components/PermissionGate';

// Helper de formato de edad idéntico a ProductosPage
const formatEdadBadge = (meses) => {
  if (meses === null || meses === undefined || meses === '') return '';
  const m = Number(meses);
  if (m === 0) return '0+';
  if (m < 12) return `+${m}m`;
  const anos = m / 12;
  if (Number.isInteger(anos)) return `+${anos} años`;
  return `+${anos.toFixed(1)} años`;
};

export default function InventarioPage() {
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const canAjustar = can('inventario.ajustar');
  const canManageProductos = can('productos.gestionar');

  // Sección activa ('existencias' | 'kardex' | 'alertas')
  const [activeTab, setActiveTab] = useState('existencias');

  // Catálogos auxiliares
  const [categorias, setCategorias] = useState([]);
  const [productosList, setProductosList] = useState([]);

  // ==========================================
  // SECCIÓN 1: EXISTENCIAS Y STOCK MÍNIMO
  // ==========================================
  const [existencias, setExistencias] = useState([]);
  const [loadingExistencias, setLoadingExistencias] = useState(false);
  const [qExistencias, setQExistencias] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterStock, setFilterStock] = useState('');
  const [pageExistencias, setPageExistencias] = useState(1);
  const [totalPagesExistencias, setTotalPagesExistencias] = useState(1);
  const [totalRecordsExistencias, setTotalRecordsExistencias] = useState(0);

  // Modal Configurar Stock Mínimo
  const [modalMinimoOpen, setModalMinimoOpen] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [nuevoStockMinimo, setNuevoStockMinimo] = useState(0);
  const [submittingMinimo, setSubmittingMinimo] = useState(false);

  // ==========================================
  // SECCIÓN 2: KARDEX (MOVIMIENTOS)
  // ==========================================
  const [movimientos, setMovimientos] = useState([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [qMov, setQMov] = useState('');
  const [filterTipoMov, setFilterTipoMov] = useState('');
  const [filterProdMov, setFilterProdMov] = useState('');
  const [filterProdNombre, setFilterProdNombre] = useState('');
  const [pageMov, setPageMov] = useState(1);
  const [totalPagesMov, setTotalPagesMov] = useState(1);
  const [totalRecordsMov, setTotalRecordsMov] = useState(0);

  // Modal Registrar Ajuste / Devolución
  const [modalAjusteOpen, setModalAjusteOpen] = useState(false);
  const [ajusteForm, setAjusteForm] = useState({
    id_producto: '',
    tipo_movimiento: 'AJUSTE',
    cantidad: 1,
    es_negativo: false,
    motivo: '',
    documento_id: ''
  });
  const [submittingAjuste, setSubmittingAjuste] = useState(false);

  // ==========================================
  // SECCIÓN 3: ALERTAS DE REPOSICIÓN
  // ==========================================
  const [alertas, setAlertas] = useState([]);
  const [loadingAlertas, setLoadingAlertas] = useState(false);
  const [qAlertas, setQAlertas] = useState('');
  const [filterEstadoAlerta, setFilterEstadoAlerta] = useState(''); // '' (todas) | 'ACTIVA' | 'ATENDIDA'
  const [totalAlertasActivas, setTotalAlertasActivas] = useState(0);

  // Cargar catálogos auxiliares
  useEffect(() => {
    async function loadAux() {
      try {
        const [catRes, prodRes] = await Promise.all([
          api.get('/categorias'),
          api.get('/productos', { params: { limit: 200 } })
        ]);
        if (catRes?.data) setCategorias(catRes.data);
        if (prodRes?.data) setProductosList(prodRes.data);
      } catch (err) {
        console.error('Error cargando catálogos auxiliares de inventario:', err);
      }
    }
    loadAux();
  }, []);

  // Cargar existencias
  const fetchExistencias = useCallback(async () => {
    setLoadingExistencias(true);
    try {
      const params = { page: pageExistencias, limit: 10 };
      if (qExistencias.trim()) params.q = qExistencias.trim();
      if (filterCategoria) params.id_categoria = filterCategoria;
      if (filterStock) params.bajo_stock = filterStock;

      const res = await api.get('/inventario', { params });
      if (res?.data) {
        setExistencias(res.data);
        if (res.meta) {
          setTotalPagesExistencias(res.meta.totalPages || 1);
          setTotalRecordsExistencias(res.meta.total || 0);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar existencias');
    } finally {
      setLoadingExistencias(false);
    }
  }, [pageExistencias, qExistencias, filterCategoria, filterStock, toast]);

  // Cargar movimientos (Kardex)
  const fetchMovimientos = useCallback(async () => {
    setLoadingMovimientos(true);
    try {
      const params = { page: pageMov, limit: 10 };
      if (qMov.trim()) params.q = qMov.trim();
      if (filterTipoMov) params.tipo_movimiento = filterTipoMov;
      if (filterProdMov) params.id_producto = filterProdMov;

      const res = await api.get('/inventario/movimientos', { params });
      if (res?.data) {
        setMovimientos(res.data);
        if (res.meta) {
          setTotalPagesMov(res.meta.totalPages || 1);
          setTotalRecordsMov(res.meta.total || 0);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar movimientos de kardex');
    } finally {
      setLoadingMovimientos(false);
    }
  }, [pageMov, qMov, filterTipoMov, filterProdMov, toast]);

  // Cargar alertas de reposición
  const fetchAlertas = useCallback(async () => {
    setLoadingAlertas(true);
    try {
      const res = await api.get('/inventario/alertas');
      if (res?.data) {
        const listaAlertas = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.alertas)
          ? res.data.alertas
          : [];
        setAlertas(listaAlertas);
        const activasCount =
          res.data.total_alertas_activas !== undefined
            ? res.data.total_alertas_activas
            : listaAlertas.filter((a) => a.estado === 'ACTIVA').length;
        setTotalAlertasActivas(activasCount);
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar alertas de inventario');
    } finally {
      setLoadingAlertas(false);
    }
  }, [toast]);

  // Sincronizar datos al cambiar de pestaña
  useEffect(() => {
    if (activeTab === 'existencias') fetchExistencias();
    else if (activeTab === 'kardex') fetchMovimientos();
    else if (activeTab === 'alertas') fetchAlertas();
  }, [activeTab, fetchExistencias, fetchMovimientos, fetchAlertas]);

  // Contador inicial de alertas activas
  useEffect(() => {
    api.get('/inventario/alertas')
      .then((res) => {
        if (res?.data) {
          const listaAlertas = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data.alertas)
            ? res.data.alertas
            : [];
          const activasCount =
            res.data.total_alertas_activas !== undefined
              ? res.data.total_alertas_activas
              : listaAlertas.filter((a) => a.estado === 'ACTIVA').length;
          setTotalAlertasActivas(activasCount);
        }
      })
      .catch(() => {});
  }, []);

  // Manejadores de modales
  const handleOpenMinimoModal = (prod) => {
    setProductoSeleccionado(prod);
    setNuevoStockMinimo(prod.stock_minimo ?? 0);
    setModalMinimoOpen(true);
  };

  const handleSaveStockMinimo = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!productoSeleccionado) return;

    const val = parseInt(nuevoStockMinimo, 10);
    if (isNaN(val) || val < 0) {
      toast.error('El stock mínimo debe ser un número entero mayor o igual a 0');
      return;
    }

    setSubmittingMinimo(true);
    try {
      await api.patch(`/productos/${productoSeleccionado.id_producto}/stock-minimo`, {
        stock_minimo: val
      });
      toast.success(`Umbral mínimo de "${productoSeleccionado.nombre}" actualizado a ${val} unidades`);
      setModalMinimoOpen(false);
      setProductoSeleccionado(null);
      fetchExistencias();
      fetchAlertas();
    } catch (err) {
      toast.error(err.message || 'Error al actualizar el umbral mínimo');
    } finally {
      setSubmittingMinimo(false);
    }
  };

  const handleOpenAjusteModal = () => {
    setAjusteForm({
      id_producto: productosList.length > 0 ? productosList[0].id_producto : '',
      tipo_movimiento: 'AJUSTE',
      cantidad: 1,
      es_negativo: false,
      motivo: '',
      documento_id: ''
    });
    setModalAjusteOpen(true);
  };

  const handleOpenAjusteParaProducto = (prod) => {
    setAjusteForm({
      id_producto: prod.id_producto,
      tipo_movimiento: 'AJUSTE',
      cantidad: 1,
      es_negativo: false,
      motivo: '',
      documento_id: ''
    });
    setModalAjusteOpen(true);
  };

  const handleVerKardexProducto = (prod) => {
    setFilterProdMov(prod.id_producto);
    setFilterProdNombre(`${prod.codigo_sku} - ${prod.nombre}`);
    setPageMov(1);
    setActiveTab('kardex');
  };

  const handleClearKardexProdFilter = () => {
    setFilterProdMov('');
    setFilterProdNombre('');
    setPageMov(1);
  };

  const handleSaveAjuste = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cantNum = parseInt(ajusteForm.cantidad, 10);
    if (isNaN(cantNum) || cantNum <= 0) {
      toast.error('La cantidad debe ser un número entero positivo mayor a 0');
      return;
    }

    if (!ajusteForm.motivo.trim()) {
      toast.error('Debe ingresar un motivo para registrar el movimiento en la bitácora');
      return;
    }

    if (!ajusteForm.id_producto) {
      toast.error('Debe seleccionar un producto');
      return;
    }

    setSubmittingAjuste(true);
    try {
      const finalCantidad = ajusteForm.tipo_movimiento === 'AJUSTE' && ajusteForm.es_negativo ? -cantNum : cantNum;

      await api.post('/inventario/movimientos', {
        id_producto: parseInt(ajusteForm.id_producto, 10),
        tipo_movimiento: ajusteForm.tipo_movimiento,
        cantidad: finalCantidad,
        motivo: ajusteForm.motivo.trim(),
        documento_id: ajusteForm.documento_id.trim() || undefined
      });

      toast.success('Movimiento registrado en Kardex y existencias actualizadas');
      setModalAjusteOpen(false);

      if (activeTab === 'existencias') fetchExistencias();
      else if (activeTab === 'kardex') fetchMovimientos();
      fetchAlertas();
    } catch (err) {
      toast.error(err.message || 'Error al registrar el movimiento de inventario');
    } finally {
      setSubmittingAjuste(false);
    }
  };

  const alertasFiltradas = useMemo(() => {
    if (!Array.isArray(alertas)) return [];
    let list = alertas;
    if (filterEstadoAlerta) {
      list = list.filter((a) => a.estado === filterEstadoAlerta);
    }
    if (qAlertas && qAlertas.trim()) {
      const term = qAlertas.toLowerCase().trim();
      list = list.filter(
        (a) =>
          (a.producto && a.producto.toLowerCase().includes(term)) ||
          (a.codigo_sku && a.codigo_sku.toLowerCase().includes(term)) ||
          (a.categoria && a.categoria.toLowerCase().includes(term))
      );
    }
    return list;
  }, [alertas, filterEstadoAlerta, qAlertas]);

  // ==========================================
  // OPCIONES DE FILTRO (DROPDOWNS UNIFICADOS)
  // ==========================================
  const categoriaOptions = useMemo(() => [
    { value: '', label: 'Todas las categorías', shortLabel: 'Categorías', color: 'var(--toy-muted)' },
    ...categorias.map((c) => ({
      value: String(c.id_categoria),
      label: c.nombre,
      shortLabel: c.nombre
    }))
  ], [categorias]);

  const stockFilterOptions = [
    { value: '', label: 'Todo el stock', shortLabel: 'Stock', color: 'var(--toy-muted)' },
    { value: 'true', label: 'Stock Crítico (≤ Mínimo)', shortLabel: 'Crítico', color: 'var(--toy-red)' },
    { value: 'false', label: 'Stock Normal (> Mínimo)', shortLabel: 'Normal', color: 'var(--toy-blue)' },
    { value: 'agotado', label: 'Agotados (0 unidades)', shortLabel: 'Agotados', color: 'var(--toy-red)' }
  ];

  const movimientoOptions = [
    { value: '', label: 'Todos los movimientos', shortLabel: 'Movimientos', color: 'var(--toy-muted)' },
    { value: 'ENTRADA', label: 'Entradas (Compras)', shortLabel: 'Entradas', color: 'var(--toy-blue)' },
    { value: 'SALIDA', label: 'Salidas (Ventas)', shortLabel: 'Salidas', color: 'var(--toy-deep-blue)' },
    { value: 'AJUSTE', label: 'Ajustes de Auditoría', shortLabel: 'Ajustes', color: 'var(--toy-orange-dark)' },
    { value: 'DEVOLUCION', label: 'Devoluciones', shortLabel: 'Devoluciones', color: 'var(--toy-purple)' }
  ];

  const alertaEstadoOptions = [
    { value: '', label: 'Todas las alertas', shortLabel: 'Alertas', color: 'var(--toy-muted)' },
    { value: 'ACTIVA', label: 'Solo Activas (Críticas)', shortLabel: 'Activas', color: 'var(--toy-red)' },
    { value: 'ATENDIDA', label: 'Atendidas (Abastecidas)', shortLabel: 'Atendidas', color: 'var(--toy-blue)' }
  ];

  // ==========================================
  // COLUMNAS PARA DATATABLE (IDÉNTICAS A PRODUCTOSPAGE)
  // ==========================================

  const columnsExistencias = [
    {
      header: 'SKU / Código',
      key: 'codigo_sku',
      width: '125px',
      render: (row) => <code>{row.codigo_sku}</code>
    },
    {
      header: 'Producto',
      key: 'nombre',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--toy-ink)' }}>{row.nombre}</div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--toy-muted)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              flexWrap: 'wrap',
              marginTop: '2px'
            }}
          >
            <span>
              {row.categoria} {row.marca ? `· Marca: ${row.marca}` : ''}
            </span>
            {row.edad_minima_meses !== null && row.edad_minima_meses !== undefined && (
              <span
                className="badge"
                style={{
                  fontSize: '0.66rem',
                  padding: '0.1rem 0.45rem',
                  backgroundColor: 'rgba(25, 168, 232, 0.1)',
                  color: 'var(--toy-deep-blue)'
                }}
              >
                {formatEdadBadge(row.edad_minima_meses)}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Precio Menudeo',
      key: 'precio_menudeo',
      width: '135px',
      render: (row) => (
        <span style={{ fontWeight: 800, color: 'var(--toy-deep-blue)' }}>
          Q{Number(row.precio_menudeo ?? 0).toFixed(2)}
        </span>
      )
    },
    {
      header: 'Stock Actual',
      key: 'stock_actual',
      width: '135px',
      render: (row) => {
        const isLow = Number(row.stock_actual ?? 0) <= Number(row.stock_minimo ?? 0);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
              {row.stock_actual ?? 0}
            </span>
            {isLow && (
              <span
                className="badge badge-danger"
                title={`Stock mínimo: ${row.stock_minimo}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <AlertTriangle size={12} strokeWidth={2.4} /> Bajo
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Stock Mínimo',
      key: 'stock_minimo',
      width: '110px',
      render: (row) => <span style={{ fontWeight: 700 }}>{row.stock_minimo}</span>
    },
    {
      header: 'Estado',
      key: 'activo',
      width: '115px',
      render: (row) => {
        const isLow = Number(row.stock_actual ?? 0) <= Number(row.stock_minimo ?? 0);
        if (Number(row.stock_actual ?? 0) === 0) {
          return <span className="badge badge-danger">Agotado</span>;
        }
        if (isLow) {
          return <span className="badge badge-danger">Bajo Stock</span>;
        }
        return <span className="badge badge-success">Óptimo</span>;
      }
    },
    {
      header: 'Acciones',
      key: 'acciones',
      width: '130px',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          {(canManageProductos || canAjustar) && (
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              onClick={() => handleOpenMinimoModal(row)}
              title="Configurar stock mínimo"
              aria-label="Configurar stock mínimo"
            >
              <SlidersHorizontal size={15} strokeWidth={2.2} />
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={() => handleVerKardexProducto(row)}
            title="Ver movimientos en Kardex"
            aria-label="Ver movimientos en Kardex"
          >
            <ClipboardList size={15} strokeWidth={2.2} />
          </button>

          {canAjustar && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleOpenAjusteParaProducto(row)}
              title="Registrar ajuste de inventario"
              aria-label="Registrar ajuste"
              style={{ height: '32px', padding: '0 0.65rem', gap: '0.3rem', fontSize: '0.78rem' }}
            >
              <PackagePlus size={14} strokeWidth={2.4} />
              <span>Ajustar</span>
            </button>
          )}
        </div>
      )
    }
  ];

  const columnsKardex = [
    {
      header: 'Fecha / Hora',
      key: 'fecha',
      render: (row) => (
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--toy-ink)' }}>
          {row.fecha ? new Date(row.fecha).toLocaleString() : '-'}
        </div>
      )
    },
    {
      header: 'Tipo Movimiento',
      key: 'tipo_movimiento',
      render: (row) => {
        switch (row.tipo_movimiento) {
          case 'ENTRADA':
            return <span className="badge badge-success">Entrada (Compra)</span>;
          case 'SALIDA':
            return <span className="badge badge-primary">Salida (Venta)</span>;
          case 'AJUSTE':
            return (
              <span
                className="badge"
                style={{
                  backgroundColor: 'rgba(255, 157, 46, 0.2)',
                  color: 'var(--toy-orange-dark)',
                  border: '1px solid rgba(255, 157, 46, 0.4)',
                  fontWeight: 800
                }}
              >
                Ajuste Auditoría
              </span>
            );
          case 'DEVOLUCION':
            return (
              <span
                className="badge"
                style={{
                  backgroundColor: 'rgba(123, 93, 201, 0.15)',
                  color: 'var(--toy-purple)',
                  border: '1px solid rgba(123, 93, 201, 0.3)',
                  fontWeight: 800
                }}
              >
                Devolución
              </span>
            );
          default:
            return <span className="badge">{row.tipo_movimiento}</span>;
        }
      }
    },
    {
      header: 'Producto',
      key: 'producto',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--toy-ink)' }}>{row.producto}</div>
          <code style={{ fontSize: '0.74rem' }}>{row.codigo_sku}</code>
        </div>
      )
    },
    {
      header: 'Cantidad',
      key: 'cantidad',
      render: (row) => {
        const isPositive = Number(row.cantidad) > 0;
        return (
          <span
            style={{
              fontWeight: 800,
              fontSize: '0.95rem',
              color: isPositive ? '#16a34a' : 'var(--toy-red)'
            }}
          >
            {isPositive ? `+${row.cantidad}` : row.cantidad} uds
          </span>
        );
      }
    },
    {
      header: 'Saldo en Bodega',
      key: 'stock_saldo',
      render: (row) => (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--toy-muted)' }}>{row.stock_anterior}</span>
          <span style={{ color: 'var(--toy-border)' }}>→</span>
          <span style={{ color: 'var(--toy-deep-blue)', fontWeight: 800 }}>{row.stock_posterior} uds</span>
        </div>
      )
    },
    {
      header: 'Documento / Folio',
      key: 'documento_id',
      render: (row) =>
        row.documento_id ? (
          <code>{row.documento_id}</code>
        ) : (
          <span style={{ color: 'var(--toy-muted)', fontSize: '0.8rem' }}>Automático</span>
        )
    },
    {
      header: 'Motivo / Bitácora',
      key: 'motivo',
      render: (row) => (
        <span
          style={{
            fontSize: '0.82rem',
            color: 'var(--toy-ink)',
            maxWidth: '220px',
            display: 'inline-block',
            whiteSpace: 'normal'
          }}
        >
          {row.motivo || '-'}
        </span>
      )
    },
    {
      header: 'Operador',
      key: 'usuario_nombre',
      render: (row) => (
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--toy-ink)' }}>
          {row.usuario_nombre || 'Sistema'}
        </span>
      )
    }
  ];

  const columnsAlertas = [
    {
      header: 'Estado',
      key: 'estado',
      render: (row) =>
        row.estado === 'ACTIVA' ? (
          <span
            className="badge badge-danger"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 800 }}
          >
            <AlertTriangle size={13} strokeWidth={2.4} /> Alerta Activa
          </span>
        ) : (
          <span className="badge badge-success" style={{ fontWeight: 800 }}>
            Atendida
          </span>
        )
    },
    {
      header: 'Producto',
      key: 'producto',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--toy-ink)' }}>{row.producto}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--toy-muted)', fontWeight: 600 }}>
            <code>{row.codigo_sku}</code> {row.categoria ? `· ${row.categoria}` : ''}
          </div>
        </div>
      )
    },
    {
      header: 'Existencia vs Mínimo',
      key: 'comparativa',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '0.66rem', color: 'var(--toy-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
              Actual
            </span>
            <span style={{ fontWeight: 800, color: 'var(--toy-red)', fontSize: '1rem' }}>
              {row.stock_actual}
            </span>
          </div>
          <span style={{ color: 'var(--toy-border)', fontWeight: 800 }}>/</span>
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '0.66rem', color: 'var(--toy-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
              Mínimo
            </span>
            <span style={{ fontWeight: 800, color: 'var(--toy-ink)', fontSize: '1rem' }}>
              {row.stock_minimo}
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'Déficit Requerido',
      key: 'deficit',
      render: (row) => {
        const deficit = Math.max(0, Number(row.stock_minimo) - Number(row.stock_actual));
        return deficit > 0 ? (
          <span
            className="badge"
            style={{
              backgroundColor: 'rgba(241, 91, 74, 0.12)',
              color: 'var(--toy-red)',
              border: '1px solid rgba(241, 91, 74, 0.35)',
              fontWeight: 800,
              fontSize: '0.78rem'
            }}
          >
            Faltan {deficit} uds
          </span>
        ) : (
          <span style={{ color: 'var(--toy-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
            Cubierto
          </span>
        );
      }
    },
    {
      header: 'Fecha Emisión',
      key: 'fecha_generacion',
      render: (row) => (
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--toy-ink)' }}>
          {row.fecha_generacion ? new Date(row.fecha_generacion).toLocaleString() : '-'}
        </span>
      )
    },
    {
      header: 'Acciones',
      key: 'acciones',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {(canManageProductos || canAjustar) && (
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              onClick={() => handleOpenMinimoModal({
                id_producto: row.id_producto,
                nombre: row.producto,
                codigo_sku: row.codigo_sku,
                stock_minimo: row.stock_minimo,
                stock_actual: row.stock_actual
              })}
              title="Configurar stock mínimo"
              aria-label="Configurar stock mínimo"
            >
              <SlidersHorizontal size={14} strokeWidth={2.2} />
            </button>
          )}

          {canAjustar && (
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              onClick={() => handleOpenAjusteParaProducto({
                id_producto: row.id_producto,
                nombre: row.producto,
                codigo_sku: row.codigo_sku,
                stock_actual: row.stock_actual
              })}
              title="Registrar ajuste de inventario"
              aria-label="Registrar ajuste"
            >
              <PackagePlus size={14} strokeWidth={2.4} />
            </button>
          )}

          {row.estado === 'ACTIVA' ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/compras')}
              title="Ir al módulo de compras para generar orden de abastecimiento"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', height: '32px', fontSize: '0.78rem', padding: '0 0.75rem' }}
            >
              <ShoppingBag size={13} strokeWidth={2.4} />
              <span>Abastecer</span>
            </button>
          ) : (
            <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 600 }}>
              Atendida
            </span>
          )}
        </div>
      )
    }
  ];

  return (
    <>
      <PageCard
        title="Inventario"
        actions={
          <>
            <SearchInput
              value={
                activeTab === 'existencias'
                  ? qExistencias
                  : activeTab === 'kardex'
                  ? qMov
                  : qAlertas
              }
              onChange={(e) => {
                if (activeTab === 'existencias') {
                  setQExistencias(e.target.value);
                  setPageExistencias(1);
                } else if (activeTab === 'kardex') {
                  setQMov(e.target.value);
                  setPageMov(1);
                } else if (activeTab === 'alertas') {
                  setQAlertas(e.target.value);
                }
              }}
              placeholder=""
              ariaLabel="Buscar en inventario"
            />

            {/* Switcher de Pestañas estilo Píldora idéntico a ProductosPage */}
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
                onClick={() => setActiveTab('existencias')}
                className={activeTab === 'existencias' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                style={{
                  borderRadius: '999px',
                  height: '34px',
                  padding: '0 0.85rem',
                  fontSize: '0.78rem',
                  border: 'none',
                  boxShadow: activeTab === 'existencias' ? '0 2px 0 var(--toy-deep-blue)' : 'none'
                }}
              >
                <Boxes size={14} strokeWidth={2.4} />
                <span>Existencias</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('kardex')}
                className={activeTab === 'kardex' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                style={{
                  borderRadius: '999px',
                  height: '34px',
                  padding: '0 0.85rem',
                  fontSize: '0.78rem',
                  border: 'none',
                  boxShadow: activeTab === 'kardex' ? '0 2px 0 var(--toy-deep-blue)' : 'none'
                }}
              >
                <ClipboardList size={14} strokeWidth={2.4} />
                <span>Kardex</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('alertas')}
                className={activeTab === 'alertas' ? 'btn-danger btn-sm' : 'btn-ghost btn-sm'}
                style={{
                  borderRadius: '999px',
                  height: '34px',
                  padding: '0 0.85rem',
                  fontSize: '0.78rem',
                  border: 'none',
                  boxShadow: activeTab === 'alertas' ? '0 2px 0 var(--toy-red-dark)' : 'none'
                }}
              >
                <AlertTriangle size={14} strokeWidth={2.4} />
                <span>Alertas {totalAlertasActivas > 0 ? `(${totalAlertasActivas})` : ''}</span>
              </button>
            </div>

            {/* Filtros dinámicos según pestaña activa */}
            {activeTab === 'existencias' && (
              <>
                <FilterDropdown
                  options={categoriaOptions}
                  value={filterCategoria}
                  onChange={(val) => {
                    setFilterCategoria(val);
                    setPageExistencias(1);
                  }}
                  title="Filtrar por categoría"
                  buttonTitle="Categorías"
                  searchable={true}
                  searchPlaceholder="Buscar categoría..."
                  maxWidth="170px"
                  minWidth="220px"
                />
                <FilterDropdown
                  options={stockFilterOptions}
                  value={filterStock}
                  onChange={(val) => {
                    setFilterStock(val);
                    setPageExistencias(1);
                  }}
                  title="Filtrar por nivel de stock"
                  buttonTitle="Stock"
                  maxWidth="150px"
                  minWidth="170px"
                />
              </>
            )}

            {activeTab === 'kardex' && (
              <FilterDropdown
                options={movimientoOptions}
                value={filterTipoMov}
                onChange={(val) => {
                  setFilterTipoMov(val);
                  setPageMov(1);
                }}
                title="Filtrar por tipo de movimiento"
                buttonTitle="Movimientos"
                maxWidth="160px"
                minWidth="190px"
              />
            )}

            {activeTab === 'alertas' && (
              <FilterDropdown
                options={alertaEstadoOptions}
                value={filterEstadoAlerta}
                onChange={(val) => {
                  setFilterEstadoAlerta(val);
                }}
                title="Filtrar por estado de alerta"
                buttonTitle="Alertas"
                maxWidth="150px"
                minWidth="170px"
              />
            )}

            <PermissionGate permission="inventario.ajustar">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenAjusteModal}
                title="Registrar ajuste de inventario"
                aria-label="Registrar ajuste de inventario"
                style={{
                  width: '40px',
                  height: '40px',
                  padding: 0,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <PackagePlus size={20} strokeWidth={2.4} />
              </button>
            </PermissionGate>
          </>
        }
      >
        {/* Banner para Kardex si hay filtro por producto individual */}
        {activeTab === 'kardex' && filterProdMov && (
          <div
            style={{
              padding: '0.65rem 1.25rem',
              borderBottom: '1.5px solid var(--toy-border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(25, 168, 232, 0.08)'
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--toy-deep-blue)' }}>
              Filtrando producto:
            </span>
            <code style={{ fontSize: '0.78rem' }}>{filterProdNombre || filterProdMov}</code>
            <button
              type="button"
              onClick={handleClearKardexProdFilter}
              className="btn btn-ghost btn-sm"
              style={{
                height: '26px',
                padding: '0 0.55rem',
                fontSize: '0.74rem',
                borderRadius: '999px',
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title="Quitar filtro de producto"
            >
              <X size={12} strokeWidth={2.4} />
              <span>Limpiar filtro de producto</span>
            </button>
          </div>
        )}

        {/* Tablas de Contenido embebidas en PageCard */}
        {activeTab === 'existencias' && (
          <DataTable
            columns={columnsExistencias}
            data={existencias}
            loading={loadingExistencias}
            emptyMessage="No se encontraron productos en el inventario"
            pagination={{
              page: pageExistencias,
              totalPages: totalPagesExistencias,
              totalRecords: totalRecordsExistencias
            }}
            onPageChange={(p) => setPageExistencias(p)}
            embedded
          />
        )}

        {activeTab === 'kardex' && (
          <DataTable
            columns={columnsKardex}
            data={movimientos}
            loading={loadingMovimientos}
            emptyMessage="No se encontraron movimientos registrados en Kardex con los filtros seleccionados"
            pagination={{
              page: pageMov,
              totalPages: totalPagesMov,
              totalRecords: totalRecordsMov
            }}
            onPageChange={(p) => setPageMov(p)}
            embedded
          />
        )}

        {activeTab === 'alertas' && (
          <DataTable
            columns={columnsAlertas}
            data={alertasFiltradas}
            loading={loadingAlertas}
            emptyMessage="No hay alertas registradas en este estado"
            embedded
          />
        )}
      </PageCard>

      {/* Modal 1: Configurar Stock Mínimo */}
      <Modal
        isOpen={modalMinimoOpen}
        onClose={() => setModalMinimoOpen(false)}
        title="Configurar Umbral de Stock Mínimo"
        size="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModalMinimoOpen(false)}
              disabled={submittingMinimo}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveStockMinimo}
              disabled={submittingMinimo}
            >
              {submittingMinimo ? 'Actualizando...' : 'Guardar Umbral'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveStockMinimo}>
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(255, 244, 221, 0.5)',
              borderRadius: '12px',
              border: '1.5px solid var(--toy-border-light)',
              marginBottom: '1rem'
            }}
          >
            <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--toy-muted)', fontWeight: 800 }}>
              Juguete Seleccionado
            </div>
            <div style={{ fontWeight: 800, color: 'var(--toy-ink)', fontSize: '1rem', marginTop: '0.15rem' }}>
              {productoSeleccionado?.nombre}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
              <code>{productoSeleccionado?.codigo_sku}</code>
              <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>
                Stock actual: {productoSeleccionado?.stock_actual ?? 0} uds
              </span>
            </div>
          </div>

          <FormField
            label="Nivel Mínimo de Existencia Requerido"
            name="stock_minimo"
            required
            helpText="Cuando las existencias sean iguales o menores a este valor, el sistema emitirá una alerta activa."
          >
            <input
              id="stock_minimo"
              type="number"
              min="0"
              className="form-control"
              value={nuevoStockMinimo}
              onChange={(e) => setNuevoStockMinimo(e.target.value)}
              autoFocus
            />
          </FormField>
        </form>
      </Modal>

      {/* Modal 2: Registrar Ajuste / Devolución */}
      <Modal
        isOpen={modalAjusteOpen}
        onClose={() => setModalAjusteOpen(false)}
        title="Registrar Ajuste / Devolución en Kardex"
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModalAjusteOpen(false)}
              disabled={submittingAjuste}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveAjuste}
              disabled={submittingAjuste}
            >
              {submittingAjuste ? 'Registrando...' : 'Registrar Movimiento'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveAjuste}>
          <FormField label="Juguete / Producto" name="id_producto" required>
            <select
              id="id_producto"
              className="form-control"
              value={ajusteForm.id_producto}
              onChange={(e) => setAjusteForm({ ...ajusteForm, id_producto: e.target.value })}
            >
              {productosList.map((p) => (
                <option key={p.id_producto} value={p.id_producto}>
                  {p.codigo_sku} - {p.nombre} (Stock: {p.stock_actual ?? 0})
                </option>
              ))}
            </select>
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label="Tipo de Movimiento" name="tipo_movimiento" required>
              <select
                id="tipo_movimiento"
                className="form-control"
                value={ajusteForm.tipo_movimiento}
                onChange={(e) => setAjusteForm({ ...ajusteForm, tipo_movimiento: e.target.value })}
              >
                <option value="AJUSTE">AJUSTE (Auditoría física)</option>
                <option value="DEVOLUCION">DEVOLUCIÓN (Reingreso)</option>
              </select>
            </FormField>

            <FormField label="Cantidad de Unidades" name="cantidad" required>
              <input
                id="cantidad"
                type="number"
                min="1"
                className="form-control"
                value={ajusteForm.cantidad}
                onChange={(e) => setAjusteForm({ ...ajusteForm, cantidad: e.target.value })}
              />
            </FormField>
          </div>

          {ajusteForm.tipo_movimiento === 'AJUSTE' && (
            <div
              style={{
                backgroundColor: 'rgba(255, 157, 46, 0.1)',
                border: '1px solid rgba(255, 157, 46, 0.3)',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem',
                margin: '0.5rem 0 1rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem'
              }}
            >
              <input
                id="es_negativo"
                type="checkbox"
                style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                checked={ajusteForm.es_negativo}
                onChange={(e) => setAjusteForm({ ...ajusteForm, es_negativo: e.target.checked })}
              />
              <label htmlFor="es_negativo" style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                Disminución de inventario (Merma, daño o faltante físico)
              </label>
            </div>
          )}

          <FormField
            label="Documento / Folio de Respaldo"
            name="documento_id"
            helpText="Opcional. Si se deja en blanco, el sistema generará uno automáticamente."
          >
            <input
              id="documento_id"
              type="text"
              className="form-control"
              placeholder="Ej: ACTA-002, MEMO-89"
              value={ajusteForm.documento_id}
              onChange={(e) => setAjusteForm({ ...ajusteForm, documento_id: e.target.value })}
            />
          </FormField>

          <FormField label="Motivo de la Operación" name="motivo" required>
            <textarea
              id="motivo"
              rows={2}
              className="form-control"
              placeholder="Explicación detallada del ajuste para la bitácora de auditoría"
              value={ajusteForm.motivo}
              onChange={(e) => setAjusteForm({ ...ajusteForm, motivo: e.target.value })}
            />
          </FormField>
        </form>
      </Modal>
    </>
  );
}
