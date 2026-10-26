import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import FilterDropdown from '../components/FilterDropdown';
import PageCard from '../components/PageCard';
import PermissionGate from '../components/PermissionGate';
import ToySwitch from '../components/ToySwitch';
import SearchableSelect from '../components/SearchableSelect';
import { useSearch } from '../context/SearchContext';

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
  const location = useLocation();

  const canAjustar = can('inventario.ajustar');
  const canManageProductos = can('productos.gestionar');

  // Sección activa ('existencias' | 'kardex' | 'alertas')
  const [activeTab, setActiveTab] = useState(() => location.state?.activeTab || 'existencias');
  const { query, setPlaceholder } = useSearch();

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
  const [filterStock, setFilterStock] = useState(() => location.state?.filterStock || '');
  const [pageExistencias, setPageExistencias] = useState(1);
  const [totalPagesExistencias, setTotalPagesExistencias] = useState(1);
  const [totalRecordsExistencias, setTotalRecordsExistencias] = useState(0);

  useEffect(() => {
    if (activeTab === 'existencias') {
      setPlaceholder('Buscar existencias...');
      setQExistencias(query);
      setPageExistencias(1);
    } else if (activeTab === 'kardex') {
      setPlaceholder('Buscar en kardex...');
      setQMov(query);
      setPageMov(1);
    } else if (activeTab === 'alertas') {
      setPlaceholder('Buscar alertas...');
      setQAlertas(query);
    }
  }, [query, activeTab, setPlaceholder]);

  // Sincronizar filtros/pestaña cuando se navega con estado desde las alertas (Home)
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
    if (location.state?.filterEstadoAlerta !== undefined) {
      setFilterEstadoAlerta(location.state.filterEstadoAlerta);
    }
    if (location.state?.filterStock !== undefined) {
      setFilterStock(location.state.filterStock);
      setPageExistencias(1);
    }
  }, [location.state]);

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
    motivo: ''
  });
  const [submittingAjuste, setSubmittingAjuste] = useState(false);

  // ==========================================
  // SECCIÓN 3: ALERTAS DE REPOSICIÓN
  // ==========================================
  const [alertas, setAlertas] = useState([]);
  const [loadingAlertas, setLoadingAlertas] = useState(false);
  const [qAlertas, setQAlertas] = useState('');
  const [filterEstadoAlerta, setFilterEstadoAlerta] = useState(() => location.state?.filterEstadoAlerta || ''); // '' (todas) | 'ACTIVA' | 'ATENDIDA'
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
      motivo: ''
    });
    setModalAjusteOpen(true);
  };

  const handleOpenAjusteParaProducto = (prod) => {
    setAjusteForm({
      id_producto: prod.id_producto,
      tipo_movimiento: 'AJUSTE',
      cantidad: 1,
      es_negativo: false,
      motivo: ''
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

  // Cálculo dinámico para la simulación de impacto de stock en el modal de ajuste
  const currentProductAjuste = useMemo(() => {
    if (!ajusteForm.id_producto) return null;
    return (
      existencias.find((p) => String(p.id_producto) === String(ajusteForm.id_producto)) ||
      productosList.find((p) => String(p.id_producto) === String(ajusteForm.id_producto)) ||
      null
    );
  }, [ajusteForm.id_producto, existencias, productosList]);

  const stockActualAjuste = currentProductAjuste ? Number(currentProductAjuste.stock_actual ?? 0) : 0;
  const cantAjusteParsed = Math.max(0, parseInt(ajusteForm.cantidad, 10) || 0);
  const esDisminucionAjuste = ajusteForm.tipo_movimiento === 'AJUSTE' && Boolean(ajusteForm.es_negativo);
  const deltaAjuste = esDisminucionAjuste ? -cantAjusteParsed : cantAjusteParsed;
  const stockProyectadoAjuste = stockActualAjuste + deltaAjuste;
  const esStockNegativoAjuste = esDisminucionAjuste && stockProyectadoAjuste < 0;

  // Opciones de productos para el SearchableSelect del modal de ajuste
  const productosAjusteOptions = useMemo(() => {
    const list = productosList.length > 0 ? productosList : existencias;
    return list.map((p) => ({
      value: String(p.id_producto),
      label: p.nombre,
      badge: p.codigo_sku,
      subtitle: `Stock actual: ${p.stock_actual ?? 0} uds`,
      searchKey: `${p.codigo_sku} ${p.nombre} ${p.categoria || ''}`
    }));
  }, [productosList, existencias]);

  const handleSaveAjuste = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cantNum = Number(ajusteForm.cantidad);
    if (isNaN(cantNum) || !Number.isInteger(cantNum) || cantNum <= 0) {
      toast.error('La cantidad debe ser un número entero mayor a 0 (no se permiten decimales)');
      return;
    }

    const motivoTrim = ajusteForm.motivo.trim();
    if (!motivoTrim) {
      toast.error('Debe ingresar un motivo para registrar el movimiento en la bitácora');
      return;
    }

    if (/^\d+$/.test(motivoTrim)) {
      toast.error('El motivo no puede ser solo números. Ingrese una descripción válida.');
      return;
    }

    if (motivoTrim.length < 3) {
      toast.error('El motivo debe tener al menos 3 caracteres');
      return;
    }

    if (!ajusteForm.id_producto) {
      toast.error('Debe seleccionar un producto');
      return;
    }

    if (esDisminucionAjuste && stockActualAjuste < cantNum) {
      toast.error(`Inventario insuficiente: no es posible retirar ${cantNum} unidades porque solo hay ${stockActualAjuste} en almacén.`);
      return;
    }

    setSubmittingAjuste(true);
    try {
      const finalCantidad = esDisminucionAjuste ? -cantNum : cantNum;

      await api.post('/inventario/ajustes', {
        id_producto: parseInt(ajusteForm.id_producto, 10),
        tipo_movimiento: ajusteForm.tipo_movimiento,
        cantidad: finalCantidad,
        motivo: motivoTrim
      });

      toast.success(
        esDisminucionAjuste
          ? `Disminución de ${cantNum} unidades registrada exitosamente en Kardex`
          : `Ingreso de ${cantNum} unidades registrado exitosamente en Kardex`
      );
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
              onClick={() => {
                const deficit = Math.max(1, Number(row.stock_minimo) - Number(row.stock_actual));
                navigate('/compras', {
                  state: {
                    abastecerItem: {
                      id_producto: row.id_producto,
                      codigo_sku: row.codigo_sku,
                      producto_nombre: row.producto,
                      cantidad: deficit
                    }
                  }
                });
              }}
              title="Ir a compras con datos precargados para abastecer stock"
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

            {/* Switcher de Pestañas estilo Píldora (fijo a la izquierda de Registrar Movimiento) */}
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

      {/* Modal 2: Registrar Movimiento */}
      <Modal
        isOpen={modalAjusteOpen}
        onClose={() => setModalAjusteOpen(false)}
        title="Registrar Movimiento"
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
              disabled={submittingAjuste || esStockNegativoAjuste || cantAjusteParsed <= 0}
            >
              {submittingAjuste ? 'Registrando...' : 'Registrar Movimiento'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveAjuste}>
          <FormField label="Producto" name="id_producto" required>
            <SearchableSelect
              options={productosAjusteOptions}
              value={ajusteForm.id_producto}
              onChange={(val) => setAjusteForm((prev) => ({ ...prev, id_producto: val }))}
              placeholder="Seleccionar producto..."
              searchPlaceholder="Buscar por nombre o SKU..."
              renderOption={(opt, isSelected) => (
                <div title={`${opt.badge ? `[${opt.badge}] ` : ''}${opt.label}`} style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div
                    style={{
                      fontWeight: isSelected ? 800 : 700,
                      fontSize: '0.85rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {opt.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.15rem' }}>
                    <code style={{ fontSize: '0.72rem' }}>{opt.badge}</code>
                    {opt.subtitle && (
                      <span style={{ fontSize: '0.73rem', color: 'var(--toy-muted)' }}>
                        {opt.subtitle}
                      </span>
                    )}
                  </div>
                </div>
              )}
              renderSelected={(opt) => (
                <div
                  title={`${opt.badge ? `[${opt.badge}] ` : ''}${opt.label}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, overflow: 'hidden', width: '100%' }}
                >
                  <code style={{ fontSize: '0.74rem', flexShrink: 0 }}>{opt.badge}</code>
                  <span
                    style={{
                      fontWeight: 700,
                      color: 'var(--toy-ink)',
                      fontSize: '0.86rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flex: 1
                    }}
                  >
                    {opt.label}
                  </span>
                  {opt.subtitle && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--toy-muted)', flexShrink: 0 }}>
                      {opt.subtitle}
                    </span>
                  )}
                </div>
              )}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label="Tipo de Movimiento" name="tipo_movimiento" required>
              <select
                id="tipo_movimiento"
                className="form-control"
                value={ajusteForm.tipo_movimiento}
                onChange={(e) => {
                  const newTipo = e.target.value;
                  setAjusteForm((prev) => ({
                    ...prev,
                    tipo_movimiento: newTipo,
                    es_negativo: newTipo === 'DEVOLUCION' ? false : prev.es_negativo
                  }));
                }}
              >
                <option value="AJUSTE">AJUSTE</option>
                <option value="DEVOLUCION">DEVOLUCIÓN</option>
              </select>
            </FormField>

            <FormField label="Cantidad de Unidades" name="cantidad" required>
              <input
                id="cantidad"
                type="number"
                min="1"
                step="1"
                className="form-control"
                value={ajusteForm.cantidad}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '');
                  setAjusteForm((prev) => ({ ...prev, cantidad: digitsOnly ? parseInt(digitsOnly, 10) : '' }));
                }}
                onKeyDown={(e) => {
                  if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                placeholder="1"
              />
            </FormField>
          </div>

          {/* Switch de Sentido: Añadir (Azul) / Quitar (Rojo) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.85rem',
              padding: '0.6rem 0.85rem',
              backgroundColor: 'var(--toy-bg)',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--toy-border-light)',
              margin: '0.25rem 0 1rem 0'
            }}
          >
            <span
              style={{
                fontSize: '0.84rem',
                fontWeight: 800,
                color: !ajusteForm.es_negativo ? 'var(--toy-blue)' : 'var(--toy-muted)',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'color 0.18s ease'
              }}
              onClick={() => setAjusteForm((prev) => ({ ...prev, es_negativo: false }))}
            >
              Añadir (+)
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={ajusteForm.es_negativo}
              disabled={ajusteForm.tipo_movimiento === 'DEVOLUCION'}
              onClick={() => {
                if (ajusteForm.tipo_movimiento === 'DEVOLUCION') return;
                setAjusteForm((prev) => ({ ...prev, es_negativo: !prev.es_negativo }));
              }}
              title={
                ajusteForm.tipo_movimiento === 'DEVOLUCION'
                  ? 'Devolución siempre reingresa existencias (+)'
                  : ajusteForm.es_negativo
                  ? 'Cambiar a Añadir (+)'
                  : 'Cambiar a Quitar (-)'
              }
              aria-label="Alternar entre añadir y quitar existencias"
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                width: '44px',
                height: '24px',
                padding: '0 2px',
                backgroundColor: ajusteForm.es_negativo ? 'var(--toy-red)' : 'var(--toy-blue)',
                borderColor: ajusteForm.es_negativo ? 'var(--toy-red-dark)' : 'var(--toy-deep-blue)',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderRadius: '999px',
                cursor: ajusteForm.tipo_movimiento === 'DEVOLUCION' ? 'not-allowed' : 'pointer',
                opacity: ajusteForm.tipo_movimiento === 'DEVOLUCION' ? 0.45 : 1,
                boxShadow: ajusteForm.es_negativo
                  ? '0 2px 6px rgba(241, 91, 74, 0.35)'
                  : '0 2px 6px rgba(25, 168, 232, 0.35)',
                transition: 'background-color 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease',
                flexShrink: 0,
                outline: 'none'
              }}
            >
              <span
                style={{
                  width: '16px',
                  height: '16px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '50%',
                  boxShadow: '0 2px 4px rgba(58, 42, 34, 0.25)',
                  transition: 'transform 0.22s cubic-bezier(0.34, 1.4, 0.64, 1)',
                  transform: ajusteForm.es_negativo ? 'translateX(18px)' : 'translateX(0)'
                }}
              />
            </button>

            <span
              style={{
                fontSize: '0.84rem',
                fontWeight: 800,
                color: ajusteForm.es_negativo ? 'var(--toy-red)' : 'var(--toy-muted)',
                cursor: ajusteForm.tipo_movimiento === 'DEVOLUCION' ? 'not-allowed' : 'pointer',
                opacity: ajusteForm.tipo_movimiento === 'DEVOLUCION' ? 0.45 : 1,
                userSelect: 'none',
                transition: 'color 0.18s ease'
              }}
              onClick={() => {
                if (ajusteForm.tipo_movimiento === 'DEVOLUCION') return;
                setAjusteForm((prev) => ({ ...prev, es_negativo: true }));
              }}
            >
              Quitar (-)
            </span>
          </div>



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
