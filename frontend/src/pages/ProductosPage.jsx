import React, { useState, useEffect, useCallback } from 'react';
import { PackagePlus, Pencil, AlertTriangle, AlertCircle, Plus, Boxes, List, Package, Sparkles } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import PermissionGate from '../components/PermissionGate';
import PageCard from '../components/PageCard';
import SearchInput from '../components/SearchInput';
import FilterDropdown from '../components/FilterDropdown';
import ToySwitch from '../components/ToySwitch';
import ConfirmModal from '../components/ConfirmModal';
import { parseApiErrors } from '../utils/formValidators';

import {
  NIVELES_CANTIDAD,
  NIVELES_METADATA,
  ESTRATEGIAS_PRECIO,
  calcularEscalasAutomaticas,
  obtenerDetalleEscala
} from '../utils/pricingEngine';

// Presets intuitivos de edad recomendada para juguetería
const EDAD_PRESETS = [
  { label: '0m', meses: 0, tag: '⭐ Todas (0+)' },
  { label: '6m', meses: 6, tag: '🍼 +6 meses' },
  { label: '1 año', meses: 12, tag: '🧸 +1 año' },
  { label: '1.5 años', meses: 18, tag: '🚗 +18 meses' },
  { label: '2 años', meses: 24, tag: '🧩 +2 años' },
  { label: '3 años', meses: 36, tag: '⚠️ +3 años' },
  { label: '4 años', meses: 48, tag: '🎨 +4 años' },
  { label: '5 años', meses: 60, tag: '🚀 +5 años' },
  { label: '6 años', meses: 72, tag: '🔬 +6 años' },
  { label: '8 años', meses: 96, tag: '🎯 +8 años' },
  { label: '10 años', meses: 120, tag: '🎮 +10 años' },
  { label: '12+ años', meses: 144, tag: '⚡ +12 años' }
];

const formatEdadDisplay = (meses) => {
  if (meses === null || meses === undefined || meses === '') return 'Sin edad especificada';
  const m = Number(meses);
  if (m === 0) return '⭐ Todas las edades (0+)';
  if (m < 12) return `🍼 +${m} meses`;
  const anos = m / 12;
  if (Number.isInteger(anos)) return `🧒 +${anos} años (${m} meses)`;
  return `🧒 +${anos.toFixed(1)} años (${m} meses)`;
};

const formatEdadBadge = (meses) => {
  if (meses === null || meses === undefined || meses === '') return '';
  const m = Number(meses);
  if (m === 0) return '⭐ 0+';
  if (m < 12) return `+${m}m`;
  const anos = m / 12;
  if (Number.isInteger(anos)) return `+${anos} años`;
  return `+${anos.toFixed(1)} años`;
};

export default function ProductosPage() {
  const { can } = useAuth();
  const toast = useToast();

  const canManageProductos = can('productos.gestionar');

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('blister'); // 'blister' | 'table'

  // Filters & Pagination
  const [q, setQ] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const estadoOptions = [
    { value: '', label: 'Todos los estados', shortLabel: 'Todos', color: 'var(--toy-muted)' },
    { value: '1', label: 'Solo Activos', shortLabel: 'Activos', color: 'var(--toy-blue)' },
    { value: '0', label: 'Solo Inactivos', shortLabel: 'Inactivos', color: 'var(--toy-red)' }
  ];

  // Modal Create / Edit Producto
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Confirm Modal for Toggle Estado
  const [confirmToggleOpen, setConfirmToggleOpen] = useState(false);
  const [prodToToggle, setProdToToggle] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Selector interactivo de edad y auto-generación de SKU
  const [edadUnidad, setEdadUnidad] = useState('anos'); // 'anos' | 'meses'
  const [generandoSku, setGenerandoSku] = useState(false);

  // Product Form State
  const [formData, setFormData] = useState({
    codigo_sku: '',
    nombre: '',
    descripcion: '',
    id_categoria: '',
    id_marca: '',
    stock_minimo: 5,
    edad_minima_meses: 36
  });

  // Tiers Form State: { [cantidad]: string_precio }
  const [escalasState, setEscalasState] = useState({
    1: '',
    3: '',
    6: '',
    12: '',
    25: '',
    50: '',
    100: '',
    500: '',
    1000: '',
    10000: ''
  });

  // Automatic Pricing Engine State
  const [estrategiaPrecio, setEstrategiaPrecio] = useState('estandar');
  const [autoCalcularActivo, setAutoCalcularActivo] = useState(true);

  // Modals for Quick Add Category & Brand
  const [quickCatOpen, setQuickCatOpen] = useState(false);
  const [quickCatNombre, setQuickCatNombre] = useState('');
  const [quickCatDesc, setQuickCatDesc] = useState('');

  const [quickMarcaOpen, setQuickMarcaOpen] = useState(false);
  const [quickMarcaNombre, setQuickMarcaNombre] = useState('');

  // Load Catalogs (Categorías y Marcas)
  const loadCatalogos = useCallback(async () => {
    try {
      const [resCat, resMar] = await Promise.all([
        api.get('/categorias'),
        api.get('/marcas')
      ]);
      if (resCat?.data) setCategorias(resCat.data);
      if (resMar?.data) setMarcas(resMar.data);
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    }
  }, []);

  useEffect(() => {
    loadCatalogos();
  }, [loadCatalogos]);

  // Fetch Products
  const fetchProductos = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (q.trim()) params.q = q.trim();
      if (filterCategoria) params.id_categoria = filterCategoria;
      if (filterEstado !== '') params.activo = filterEstado;

      const res = await api.get('/productos', { params });
      if (res?.data) {
        setProductos(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
          setTotalRecords(res.meta.total || 0);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, [page, q, filterCategoria, filterEstado, toast]);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  // Auto-generación de SKU según marca y categoría
  const handleAutoGenerarSku = useCallback(async (catId, marcaId) => {
    const cId = catId !== undefined ? catId : formData.id_categoria;
    const mId = marcaId !== undefined ? marcaId : formData.id_marca;
    if (!cId) return;

    setGenerandoSku(true);
    try {
      const res = await api.get('/productos/sugerir-sku', {
        params: {
          id_categoria: cId,
          id_marca: mId || undefined
        }
      });
      if (res?.data?.sku) {
        setFormData((prev) => ({ ...prev, codigo_sku: res.data.sku }));
        return res.data.sku;
      }
    } catch (err) {
      // Cálculo local de respaldo
      const catObj = categorias.find((c) => String(c.id_categoria) === String(cId));
      const marcaObj = marcas.find((m) => String(m.id_marca) === String(mId));
      const cleanCat = (catObj?.nombre || 'JUG')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 3) || 'JUG';
      const cleanMar = (marcaObj?.nombre || 'GEN')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 3) || 'GEN';
      let maxLocal = productos.length;
      productos.forEach((p) => {
        if (p.id_producto && p.id_producto > maxLocal) maxLocal = p.id_producto;
        if (p.codigo_sku) {
          const match = String(p.codigo_sku).match(/(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxLocal) maxLocal = num;
          }
        }
      });
      const nextNum = String(maxLocal + 1).padStart(3, '0');
      const fallbackSku = `${cleanCat.padEnd(3, 'X')}-${cleanMar.padEnd(3, 'X')}-${nextNum}`;
      setFormData((prev) => ({ ...prev, codigo_sku: fallbackSku }));
      return fallbackSku;
    } finally {
      setGenerandoSku(false);
    }
  }, [formData.id_categoria, formData.id_marca, categorias, marcas]);

  // Helpers de conversión y control de edad
  const setEdadMinimaDesdeAnos = (anos) => {
    if (anos === '' || anos === null || isNaN(anos)) {
      setFormData((prev) => ({ ...prev, edad_minima_meses: '' }));
    } else {
      setFormData((prev) => ({ ...prev, edad_minima_meses: Math.max(0, Number(anos)) * 12 }));
    }
  };

  const setEdadMinimaDesdeMeses = (meses) => {
    if (meses === '' || meses === null || isNaN(meses)) {
      setFormData((prev) => ({ ...prev, edad_minima_meses: '' }));
    } else {
      setFormData((prev) => ({ ...prev, edad_minima_meses: Math.max(0, Number(meses)) }));
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedProducto(null);
    const defaultCat = categorias.length > 0 ? categorias[0].id_categoria : '';
    setFormData({
      codigo_sku: '',
      nombre: '',
      descripcion: '',
      id_categoria: defaultCat,
      id_marca: '',
      stock_minimo: 5,
      edad_minima_meses: 36
    });
    setEdadUnidad('anos');

    const initialEscalas = {};
    NIVELES_CANTIDAD.forEach((c) => {
      initialEscalas[c] = '';
    });
    setEscalasState(initialEscalas);
    setEstrategiaPrecio('estandar');
    setAutoCalcularActivo(true);
    setFormErrors({});
    setModalOpen(true);

    if (defaultCat) {
      handleAutoGenerarSku(defaultCat, '');
    }
  };

  // Handler for Level 1 base price changes (triggers auto-calculation)
  const handleNivel1Change = (val) => {
    if (autoCalcularActivo && val && parseFloat(val) > 0) {
      const calculadas = calcularEscalasAutomaticas(val, estrategiaPrecio);
      if (calculadas) {
        setEscalasState(calculadas);
        return;
      }
    }
    setEscalasState((prev) => ({ ...prev, 1: val }));
  };

  // Switch commercial margin strategy
  const handleCambiarEstrategia = (estrategiaKey) => {
    setEstrategiaPrecio(estrategiaKey);
    const p1 = escalasState[1];
    if (p1 && parseFloat(p1) > 0) {
      const calculadas = calcularEscalasAutomaticas(p1, estrategiaKey);
      if (calculadas) {
        setEscalasState(calculadas);
        toast.info(`Escalas actualizadas: ${ESTRATEGIAS_PRECIO[estrategiaKey].nombre}`);
      }
    }
  };

  // Manual trigger to recalculate all tiers
  const handleRecalcularEscalasManual = () => {
    const p1 = escalasState[1];
    if (!p1 || parseFloat(p1) <= 0) {
      toast.warning('Ingresa primero el precio de menudeo (1 ud) para calcular las escalas');
      return;
    }
    const calculadas = calcularEscalasAutomaticas(p1, estrategiaPrecio);
    if (calculadas) {
      setEscalasState(calculadas);
      toast.success('¡Escalas recalculadas automáticamente con éxito!');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = async (prod) => {
    setModalMode('edit');
    setSelectedProducto(prod);
    setFormErrors({});

    try {
      const res = await api.get(`/productos/${prod.id_producto}`);
      if (res?.data) {
        const p = res.data;
        const meses = p.edad_minima_meses !== null && p.edad_minima_meses !== undefined ? p.edad_minima_meses : '';
        setFormData({
          codigo_sku: p.codigo_sku,
          nombre: p.nombre,
          descripcion: p.descripcion || '',
          id_categoria: p.id_categoria,
          id_marca: p.id_marca || '',
          stock_minimo: p.stock_minimo,
          edad_minima_meses: meses
        });
        if (meses !== '') {
          setEdadUnidad(Number(meses) % 12 === 0 ? 'anos' : 'meses');
        } else {
          setEdadUnidad('anos');
        }

        const tiersMap = {};
        NIVELES_CANTIDAD.forEach((c) => {
          tiersMap[c] = '';
        });
        if (Array.isArray(p.escalas)) {
          p.escalas.forEach((esc) => {
            tiersMap[esc.cantidad_minima] = String(esc.precio_unitario);
          });
        }
        setEscalasState(tiersMap);
        setModalOpen(true);
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar detalles del producto');
    }
  };

  // Client-side validation of price monotonicity
  const validateForm = () => {
    const errors = {};
    if (!formData.nombre.trim()) errors.nombre = 'El nombre es requerido';
    if (!formData.id_categoria) errors.id_categoria = 'La categoría es requerida';

    // Tier 1 is mandatory
    const retailPrice = parseFloat(escalasState[1]);
    if (isNaN(retailPrice) || retailPrice <= 0) {
      errors.escalas = 'El Nivel 1 (Precio Menudeo) es obligatorio y debe ser mayor a 0.00';
    } else {
      let lastPrice = retailPrice;
      for (const cant of NIVELES_CANTIDAD) {
        if (cant === 1) continue;
        const val = escalasState[cant];
        if (val !== '' && val !== null && val !== undefined) {
          const currentPrice = parseFloat(val);
          if (isNaN(currentPrice) || currentPrice <= 0) {
            errors.escalas = `El precio para escala de ${cant} unidades debe ser mayor a 0.00`;
            break;
          }
          if (currentPrice > lastPrice) {
            errors.escalas = `El precio de escala (${cant} uds: Q${currentPrice}) no puede ser mayor al precio del nivel anterior (Q${lastPrice})`;
            break;
          }
          lastPrice = currentPrice;
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Product Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const escalasPayload = [];
      NIVELES_CANTIDAD.forEach((cant) => {
        const val = escalasState[cant];
        if (val !== '' && val !== null && val !== undefined) {
          escalasPayload.push({
            cantidad_minima: cant,
            precio_unitario: parseFloat(val)
          });
        }
      });

      const payload = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        id_categoria: Number(formData.id_categoria),
        id_marca: formData.id_marca ? Number(formData.id_marca) : null,
        stock_minimo: Number(formData.stock_minimo),
        edad_minima_meses: formData.edad_minima_meses !== '' ? Number(formData.edad_minima_meses) : null,
        escalas: escalasPayload
      };

      if (modalMode === 'create') {
        payload.codigo_sku = formData.codigo_sku.trim().toUpperCase();
        await api.post('/productos', payload);
        toast.success(`Producto ${payload.codigo_sku} creado con escalas exitosamente`);
      } else {
        await api.put(`/productos/${selectedProducto.id_producto}`, payload);
        toast.success('Producto y escalas actualizados exitosamente');
      }

      setModalOpen(false);
      fetchProductos();
    } catch (err) {
      if (err.details) {
        setFormErrors(parseApiErrors(err));
        toast.error('Corrige los errores señalados en el formulario');
      } else {
        toast.error(err.message || 'Error al guardar el producto');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Open Confirm Dialog for Active State
  const handleToggleEstado = (prod) => {
    setProdToToggle(prod);
    setConfirmToggleOpen(true);
  };

  // Execute Toggle Active State via Custom Modal
  const handleConfirmToggleEstado = async () => {
    if (!prodToToggle) return;
    const actionName = prodToToggle.activo ? 'inactivado' : 'reactivado';
    setTogglingStatus(true);

    try {
      await api.patch(`/productos/${prodToToggle.id_producto}/estado`, {
        activo: !prodToToggle.activo
      });
      toast.success(`Producto ${actionName} correctamente`);
      setConfirmToggleOpen(false);
      setProdToToggle(null);
      fetchProductos();
    } catch (err) {
      toast.error(err.message || `No se pudo cambiar el estado del producto`);
    } finally {
      setTogglingStatus(false);
    }
  };

  // Quick Create Category
  const handleCreateCategoria = async (e) => {
    e.preventDefault();
    if (!quickCatNombre.trim()) return;

    try {
      const res = await api.post('/categorias', {
        nombre: quickCatNombre.trim(),
        descripcion: quickCatDesc.trim() || null
      });
      toast.success(`Categoría "${quickCatNombre}" creada`);
      setQuickCatOpen(false);
      setQuickCatNombre('');
      setQuickCatDesc('');
      await loadCatalogos();
      if (res?.data?.id_categoria) {
        setFormData((prev) => ({ ...prev, id_categoria: res.data.id_categoria }));
        if (modalMode === 'create') {
          handleAutoGenerarSku(res.data.id_categoria, formData.id_marca);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error creando categoría');
    }
  };

  // Quick Create Brand
  const handleCreateMarca = async (e) => {
    e.preventDefault();
    if (!quickMarcaNombre.trim()) return;

    try {
      const res = await api.post('/marcas', {
        nombre: quickMarcaNombre.trim()
      });
      toast.success(`Marca "${quickMarcaNombre}" creada`);
      setQuickMarcaOpen(false);
      setQuickMarcaNombre('');
      await loadCatalogos();
      if (res?.data?.id_marca) {
        setFormData((prev) => ({ ...prev, id_marca: res.data.id_marca }));
        if (modalMode === 'create') {
          handleAutoGenerarSku(formData.id_categoria, res.data.id_marca);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error creando marca');
    }
  };

  // Columns definition for DataTable
  const columns = [
    {
      header: 'SKU / Código',
      key: 'codigo_sku',
      render: (row) => <code>{row.codigo_sku}</code>
    },
    {
      header: 'Producto',
      key: 'nombre',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--toy-ink)' }}>{row.nombre}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--toy-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '2px' }}>
            <span>{row.categoria} {row.marca ? `· Marca: ${row.marca}` : ''}</span>
            {row.edad_minima_meses !== null && row.edad_minima_meses !== undefined && (
              <span className="badge" style={{ fontSize: '0.66rem', padding: '0.1rem 0.45rem', backgroundColor: 'rgba(25, 168, 232, 0.1)', color: 'var(--toy-deep-blue)' }}>
                {formatEdadBadge(row.edad_minima_meses)}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Precio Menudeo (Nivel 1)',
      key: 'precio_menudeo',
      render: (row) => (
        <span style={{ fontWeight: 800, color: 'var(--toy-deep-blue)' }}>
          Q{Number(row.precio_menudeo ?? 0).toFixed(2)}
        </span>
      )
    },
    {
      header: 'Stock Actual',
      key: 'stock_actual',
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
      render: (row) => <span style={{ fontWeight: 700 }}>{row.stock_minimo}</span>
    },
    {
      header: 'Estado',
      key: 'activo',
      render: (row) => (
        <span className={`badge ${row.activo ? 'badge-success' : 'badge-danger'}`}>
          {row.activo ? 'Activo' : 'Inactivo'}
        </span>
      )
    }
  ];

  if (canManageProductos) {
    columns.push({
      header: 'Acciones',
      key: 'acciones',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={() => handleOpenEdit(row)}
            title="Editar producto y escalas"
            aria-label="Editar producto y escalas"
          >
            <Pencil size={15} strokeWidth={2.2} />
          </button>
          <ToySwitch
            checked={row.activo}
            onChange={() => handleToggleEstado(row)}
            title={row.activo ? 'Inactivar producto' : 'Activar producto'}
            ariaLabel={row.activo ? 'Inactivar producto' : 'Activar producto'}
          />
        </div>
      )
    });
  }

  return (
    <>
      <PageCard
        title="Productos"
        actions={
          <>
            <SearchInput
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              ariaLabel="Buscar juguetes"
            />

            <FilterDropdown
              value={filterEstado}
              onChange={(val) => {
                setFilterEstado(val);
                setPage(1);
              }}
              options={estadoOptions}
              title="Filtrar por estado"
            />

            {/* View Mode Switcher */}
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
                onClick={() => setViewMode('blister')}
                className={viewMode === 'blister' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                style={{
                  borderRadius: '999px',
                  height: '34px',
                  padding: '0 0.85rem',
                  fontSize: '0.78rem',
                  border: 'none',
                  boxShadow: viewMode === 'blister' ? '0 2px 0 var(--toy-deep-blue)' : 'none'
                }}
              >
                <Boxes size={14} strokeWidth={2.4} />
                <span>Blister</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={viewMode === 'table' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                style={{
                  borderRadius: '999px',
                  height: '34px',
                  padding: '0 0.85rem',
                  fontSize: '0.78rem',
                  border: 'none',
                  boxShadow: viewMode === 'table' ? '0 2px 0 var(--toy-deep-blue)' : 'none'
                }}
              >
                <List size={14} strokeWidth={2.4} />
                <span>Tabla</span>
              </button>
            </div>

            <PermissionGate permission="productos.gestionar">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreate}
                title="Nuevo producto"
                aria-label="Nuevo producto"
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
        {/* Category Chips Bar */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderBottom: '1.5px solid var(--toy-border-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
            backgroundColor: 'rgba(255, 244, 221, 0.25)'
          }}
        >
          <button
            type="button"
            onClick={() => { setFilterCategoria(''); setPage(1); }}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              fontSize: '0.76rem',
              fontWeight: 800,
              border: '2px solid',
              cursor: 'pointer',
              backgroundColor: filterCategoria === '' ? 'var(--toy-blue)' : 'rgba(255, 244, 221, 0.7)',
              color: filterCategoria === '' ? '#FFFFFF' : 'var(--toy-ink)',
              borderColor: filterCategoria === '' ? 'var(--toy-deep-blue)' : 'var(--toy-border)',
              boxShadow: filterCategoria === '' ? '0 2px 6px rgba(25, 168, 232, 0.35)' : 'none',
              transition: 'all 0.12s ease'
            }}
          >
            Todas las Categorías
          </button>
          {categorias.map((c) => {
            const isActive = String(filterCategoria) === String(c.id_categoria);
            return (
              <button
                key={c.id_categoria}
                type="button"
                onClick={() => { setFilterCategoria(c.id_categoria); setPage(1); }}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '999px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  border: '2px solid',
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'var(--toy-blue)' : 'rgba(255, 244, 221, 0.7)',
                  color: isActive ? '#FFFFFF' : 'var(--toy-ink)',
                  borderColor: isActive ? 'var(--toy-deep-blue)' : 'var(--toy-border)',
                  boxShadow: isActive ? '0 2px 6px rgba(25, 168, 232, 0.35)' : 'none',
                  transition: 'all 0.12s ease'
                }}
              >
                {c.nombre}
              </button>
            );
          })}
        </div>

        {/* Main Content: Blister Cards or Data Table */}
        {viewMode === 'blister' ? (
          <div style={{ padding: '1.25rem' }}>
            {loading ? (
              <div className="empty-state" style={{ padding: '3.5rem' }}>
                <span style={{ fontWeight: 800, color: 'var(--toy-muted)' }}>Cargando catálogo de juguetes...</span>
              </div>
            ) : productos.length === 0 ? (
              <div className="empty-state" style={{ padding: '3.5rem', textAlign: 'center' }}>
                <Package size={44} color="var(--toy-muted)" style={{ margin: '0 auto 0.85rem', display: 'block' }} />
                <h3 className="font-display" style={{ fontSize: '1.25rem', color: 'var(--toy-ink)', margin: 0 }}>No se encontraron juguetes</h3>
                <p style={{ color: 'var(--toy-muted)', fontSize: '0.88rem', fontWeight: 600, margin: '0.35rem 0 0' }}>Prueba con otro término de búsqueda o categoría.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.8rem' }}>
                {productos.map((p, idx) => {
                  const isLowStock = Number(p.stock_actual ?? 0) <= Number(p.stock_minimo ?? 0);
                  const checkerClass = idx % 3 === 0 ? 'bg-checker-blue' : idx % 3 === 1 ? 'bg-checker-gold' : 'bg-checker-purple';

                  return (
                    <div
                      key={p.id_producto}
                      className="toy-cardboard-pack"
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '2px solid var(--toy-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      {/* Packaging Header Strip with Euro Hanger */}
                      <div className={checkerClass} style={{ padding: '0.85rem 1rem 0.75rem', textAlign: 'center', opacity: p.activo ? 1 : 0.65 }}>
                        <div className="euro-hanger-punch" style={{ marginBottom: '0.45rem' }} />
                        <h3
                          className="toy-card-title"
                          style={{
                            fontSize: '0.92rem',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            margin: 0
                          }}
                        >
                          {p.nombre}
                        </h3>
                      </div>

                      {/* Molded Toy Blister Capsule Frame */}
                      <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div
                          className="toy-bubble-frame"
                          style={{
                            padding: '1.25rem 0.85rem',
                            textAlign: 'center',
                            marginBottom: '0.85rem',
                            backgroundColor: 'rgba(255, 244, 221, 0.45)',
                            minHeight: '130px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <div
                            style={{
                              width: '54px',
                              height: '54px',
                              borderRadius: '18px',
                              background: 'linear-gradient(135deg, var(--toy-blue), var(--toy-deep-blue))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFFFFF',
                              boxShadow: '0 4px 12px rgba(8, 123, 181, 0.28)'
                            }}
                          >
                            <Package size={28} strokeWidth={2.4} />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <code>{p.codigo_sku}</code>
                            <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '0.15rem 0.55rem' }}>
                              {p.categoria || 'Juguete'}
                            </span>
                            {p.edad_minima_meses !== null && p.edad_minima_meses !== undefined && (
                              <span
                                className="badge"
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '0.15rem 0.55rem',
                                  backgroundColor: 'rgba(255, 179, 0, 0.22)',
                                  color: '#b45309',
                                  border: '1px solid rgba(255, 179, 0, 0.45)',
                                  fontWeight: 700
                                }}
                              >
                                {formatEdadBadge(p.edad_minima_meses)}
                              </span>
                            )}
                          </div>

                          {p.marca && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--toy-muted)', fontWeight: 700 }}>
                              Marca: {p.marca}
                            </span>
                          )}
                        </div>

                        {/* Package Footer: Collector Price & Stock */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
                            <div>
                              <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--toy-muted)', fontWeight: 800, display: 'block' }}>
                                Precio Menudeo (1 ud)
                              </span>
                              <span className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
                                Q{Number(p.precio_menudeo ?? 0).toFixed(2)}
                              </span>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--toy-muted)', fontWeight: 800, display: 'block' }}>
                                Stock
                              </span>
                              <span
                                className={`badge ${isLowStock ? 'badge-danger' : 'badge-success'}`}
                                style={{ fontSize: '0.72rem' }}
                              >
                                {p.stock_actual ?? 0} uds
                              </span>
                            </div>
                          </div>

                          {canManageProductos && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.65rem', borderTop: '1.5px solid var(--toy-border)' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-icon"
                                onClick={() => handleOpenEdit(p)}
                                title="Editar producto y escalas"
                                aria-label="Editar producto y escalas"
                              >
                                <Pencil size={15} strokeWidth={2.2} />
                              </button>
                              <ToySwitch
                                checked={p.activo}
                                onChange={() => handleToggleEstado(p)}
                                title={p.activo ? 'Inactivar producto' : 'Activar producto'}
                                ariaLabel={p.activo ? 'Inactivar producto' : 'Activar producto'}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Blister View Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 0.5rem', borderTop: '1.5px solid var(--toy-border-light)' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--toy-muted)' }}>
                  Página {page} de {totalPages} ({totalRecords} juguetes en total)
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage(page - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage(page + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={productos}
            loading={loading}
            emptyMessage="No se encontraron productos en el catálogo"
            pagination={{
              page,
              totalPages,
              totalRecords
            }}
            onPageChange={(newPage) => setPage(newPage)}
            embedded
          />
        )}
      </PageCard>

      {/* Modal Crear / Editar Producto */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        size="lg"
        title={modalMode === 'create' ? 'Registrar Producto y Escalas' : `Editar Producto: ${formData.codigo_sku}`}
        footer={
          <>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleFormSubmit}
              disabled={submitting}
            >
              {submitting ? 'Guardando...' : (modalMode === 'create' ? 'Crear Producto' : 'Guardar Cambios')}
            </button>
          </>
        }
      >
        <form onSubmit={handleFormSubmit}>
          {modalMode === 'create' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
                padding: '0.65rem 0.95rem',
                backgroundColor: 'rgba(25, 168, 232, 0.08)',
                borderRadius: '14px',
                border: '1.5px solid rgba(25, 168, 232, 0.22)'
              }}
            >
              <Sparkles size={16} color="var(--toy-blue)" strokeWidth={2.4} />
              <span style={{ fontSize: '0.82rem', color: 'var(--toy-ink)', fontWeight: 600 }}>
                Código SKU autoincremental: <code style={{ fontWeight: 800, color: 'var(--toy-deep-blue)', fontSize: '0.9rem' }}>{formData.codigo_sku || 'Generando...'}</code> <span style={{ color: 'var(--toy-muted)' }}>(asignado automáticamente según categoría, marca y registros existentes)</span>
              </span>
            </div>
          )}

          <FormField label="Nombre del Juguete" name="nombre" error={formErrors.nombre} required>
            <input
              type="text"
              id="nombre"
              className={`form-control ${formErrors.nombre ? 'has-error' : ''}`}
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej. Set de Bloques Creativos 100 Piezas"
              required
            />
          </FormField>

          <FormField label="Descripción" name="descripcion" error={formErrors.descripcion}>
            <textarea
              id="descripcion"
              className="form-control"
              rows={2}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Material, contenido, advertencias..."
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
            {/* Categoría con botón crear */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Categoría *</label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setQuickCatOpen(true)}
                  style={{ padding: '0 6px', fontSize: '0.75rem', color: 'var(--toy-blue)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Plus size={12} strokeWidth={2.4} /> Nueva
                </button>
              </div>
              <select
                id="id_categoria"
                className={`form-control ${formErrors.id_categoria ? 'has-error' : ''}`}
                value={formData.id_categoria}
                onChange={(e) => {
                  const newCat = e.target.value;
                  setFormData((prev) => ({ ...prev, id_categoria: newCat }));
                  if (modalMode === 'create' && newCat) {
                    handleAutoGenerarSku(newCat, formData.id_marca);
                  }
                }}
                required
              >
                <option value="">Selecciona una categoría</option>
                {categorias.map((c) => (
                  <option key={c.id_categoria} value={c.id_categoria}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              {formErrors.id_categoria && <span className="form-error">{formErrors.id_categoria}</span>}
            </div>

            {/* Marca con botón crear */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Marca</label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setQuickMarcaOpen(true)}
                  style={{ padding: '0 6px', fontSize: '0.75rem', color: 'var(--toy-blue)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Plus size={12} strokeWidth={2.4} /> Nueva
                </button>
              </div>
              <select
                id="id_marca"
                className="form-control"
                value={formData.id_marca}
                onChange={(e) => {
                  const newMarca = e.target.value;
                  setFormData((prev) => ({ ...prev, id_marca: newMarca }));
                  if (modalMode === 'create') {
                    handleAutoGenerarSku(formData.id_categoria, newMarca);
                  }
                }}
              >
                <option value="">Sin marca específica (Genérica)</option>
                {marcas.map((m) => (
                  <option key={m.id_marca} value={m.id_marca}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '1rem' }}>
            <FormField label="Stock Mínimo (Alerta de Bodega)" name="stock_minimo" error={formErrors.stock_minimo} required>
              <input
                type="number"
                min="0"
                id="stock_minimo"
                className="form-control"
                style={{ maxWidth: '240px' }}
                value={formData.stock_minimo}
                onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                required
              />
            </FormField>
          </div>

          {/* Configuración Intuitiva de Edad Recomendada */}
          <div
            style={{
              marginTop: '1rem',
              padding: '1.15rem',
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              borderRadius: '16px',
              border: '2px solid var(--toy-border-light)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--toy-ink)' }}>
                  Edad Recomendada
                </label>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.65rem',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(25, 168, 232, 0.12)',
                    color: 'var(--toy-deep-blue)',
                    border: '1px solid rgba(25, 168, 232, 0.25)'
                  }}
                >
                  {formatEdadDisplay(formData.edad_minima_meses)}
                </span>
              </div>

              {/* Selector Años / Meses */}
              <div
                style={{
                  display: 'inline-flex',
                  padding: '3px',
                  backgroundColor: 'var(--toy-bg)',
                  borderRadius: '999px',
                  border: '1.5px solid var(--toy-border)'
                }}
              >
                <button
                  type="button"
                  onClick={() => setEdadUnidad('anos')}
                  style={{
                    border: 'none',
                    borderRadius: '999px',
                    padding: '0.22rem 0.75rem',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: edadUnidad === 'anos' ? 'var(--toy-blue)' : 'transparent',
                    color: edadUnidad === 'anos' ? '#FFFFFF' : 'var(--toy-muted)',
                    boxShadow: edadUnidad === 'anos' ? '0 2px 4px rgba(25, 168, 232, 0.3)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  🧒 En Años
                </button>
                <button
                  type="button"
                  onClick={() => setEdadUnidad('meses')}
                  style={{
                    border: 'none',
                    borderRadius: '999px',
                    padding: '0.22rem 0.75rem',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: edadUnidad === 'meses' ? 'var(--toy-blue)' : 'transparent',
                    color: edadUnidad === 'meses' ? '#FFFFFF' : 'var(--toy-muted)',
                    boxShadow: edadUnidad === 'meses' ? '0 2px 4px rgba(25, 168, 232, 0.3)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  👶 En Meses
                </button>
              </div>
            </div>

            {/* Input interactivo numérico */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', maxWidth: '220px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ width: '34px', height: '36px', padding: 0, fontWeight: 800, fontSize: '1.1rem' }}
                  onClick={() => {
                    if (edadUnidad === 'anos') {
                      const currentAnos = Math.max(0, Math.floor((Number(formData.edad_minima_meses) || 0) / 12) - 1);
                      setEdadMinimaDesdeAnos(currentAnos);
                    } else {
                      const currentMeses = Math.max(0, (Number(formData.edad_minima_meses) || 0) - 6);
                      setEdadMinimaDesdeMeses(currentMeses);
                    }
                  }}
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  style={{ textAlign: 'center', fontWeight: 800, height: '36px', fontSize: '0.95rem' }}
                  value={
                    edadUnidad === 'anos'
                      ? (formData.edad_minima_meses !== '' && formData.edad_minima_meses !== null ? Math.round(Number(formData.edad_minima_meses) / 12) : '')
                      : (formData.edad_minima_meses !== '' && formData.edad_minima_meses !== null ? formData.edad_minima_meses : '')
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setFormData((prev) => ({ ...prev, edad_minima_meses: '' }));
                    } else {
                      const num = Math.max(0, parseInt(val, 10) || 0);
                      if (edadUnidad === 'anos') {
                        setEdadMinimaDesdeAnos(num);
                      } else {
                        setEdadMinimaDesdeMeses(num);
                      }
                    }
                  }}
                  placeholder={edadUnidad === 'anos' ? 'Ej. 3' : 'Ej. 36'}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ width: '34px', height: '36px', padding: 0, fontWeight: 800, fontSize: '1.1rem' }}
                  onClick={() => {
                    if (edadUnidad === 'anos') {
                      const currentAnos = Math.floor((Number(formData.edad_minima_meses) || 0) / 12) + 1;
                      setEdadMinimaDesdeAnos(currentAnos);
                    } else {
                      const currentMeses = (Number(formData.edad_minima_meses) || 0) + 6;
                      setEdadMinimaDesdeMeses(currentMeses);
                    }
                  }}
                >
                  +
                </button>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--toy-muted)', minWidth: '42px' }}>
                  {edadUnidad === 'anos' ? 'años' : 'meses'}
                </span>
              </div>

              <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                {Number(formData.edad_minima_meses) >= 36 ? (
                  <span style={{ color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <AlertCircle size={14} /> Recomendado para +3 años (Piezas pequeñas)
                  </span>
                ) : Number(formData.edad_minima_meses) > 0 ? (
                  <span style={{ color: 'var(--toy-deep-blue)' }}>👶 Apto para primera infancia</span>
                ) : (
                  <span style={{ color: 'var(--toy-muted)' }}>⭐ Sin restricción de edad mínima</span>
                )}
              </div>
            </div>

            {/* Chips de selección rápida */}
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--toy-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                Acceso rápido:
              </span>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {EDAD_PRESETS.map((preset) => {
                  const isSelected = Number(formData.edad_minima_meses) === preset.meses && formData.edad_minima_meses !== '';
                  return (
                    <button
                      key={preset.meses}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, edad_minima_meses: preset.meses }));
                        if (preset.meses % 12 === 0 && preset.meses > 0) {
                          setEdadUnidad('anos');
                        } else if (preset.meses < 12 && preset.meses > 0) {
                          setEdadUnidad('meses');
                        }
                      }}
                      style={{
                        border: isSelected ? '2px solid var(--toy-blue)' : '1px solid var(--toy-border)',
                        backgroundColor: isSelected ? 'rgba(25, 168, 232, 0.16)' : '#FFFFFF',
                        color: isSelected ? 'var(--toy-deep-blue)' : 'var(--toy-ink)',
                        fontWeight: isSelected ? 800 : 600,
                        borderRadius: '999px',
                        padding: '0.22rem 0.65rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        boxShadow: isSelected ? '0 2px 6px rgba(25, 168, 232, 0.25)' : 'none',
                        transform: isSelected ? 'scale(1.04)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {preset.tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Escalas de Precios por Cantidad con Sistema Automático */}
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1.25rem',
              backgroundColor: 'rgba(255, 244, 221, 0.45)',
              borderRadius: '20px',
              border: '2px solid var(--toy-border)'
            }}
          >
            {/* Header del Sistema de Precios */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '999px', backgroundColor: 'var(--toy-blue)', display: 'inline-block' }} />
                  <h4 className="font-display" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--toy-ink)', margin: 0 }}>
                    Escalas de Precio por Volumen (10 Niveles)
                  </h4>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.55rem',
                      borderRadius: '999px',
                      backgroundColor: autoCalcularActivo ? 'rgba(25, 168, 232, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                      color: autoCalcularActivo ? 'var(--toy-deep-blue)' : 'var(--toy-muted)',
                      border: autoCalcularActivo ? '1px solid rgba(25, 168, 232, 0.35)' : '1px solid rgba(100, 116, 139, 0.25)'
                    }}
                  >
                    {autoCalcularActivo ? '⚡ Auto-Cálculo Activo' : 'Manual'}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 600, marginTop: '2px', marginBottom: 0 }}>
                  Al ingresar el precio de menudeo (1 ud), el sistema genera automáticamente descuentos decrecientes por mayoreo.
                </p>
              </div>

              {/* Botón de recálculo manual */}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleRecalcularEscalasManual}
                title="Aplica la fórmula matemática a partir del precio de menudeo"
                style={{ height: '32px', fontSize: '0.76rem' }}
              >
                <Sparkles size={13} strokeWidth={2.4} color="var(--toy-deep-blue)" />
                <span>Recalcular con Fórmula</span>
              </button>
            </div>

            {/* Selector de Estrategia Comercial y Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid var(--toy-border)',
                marginBottom: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--toy-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Perfil de Margen:
                </span>
                {Object.values(ESTRATEGIAS_PRECIO).map((est) => {
                  const isCurrent = estrategiaPrecio === est.id;
                  return (
                    <button
                      key={est.id}
                      type="button"
                      onClick={() => handleCambiarEstrategia(est.id)}
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        border: isCurrent ? '1.5px solid var(--toy-deep-blue)' : '1.5px solid var(--toy-border)',
                        backgroundColor: isCurrent ? 'var(--toy-blue)' : '#FFFDF9',
                        color: isCurrent ? '#FFFFFF' : 'var(--toy-ink)',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                        boxShadow: isCurrent ? '0 2px 4px rgba(8, 123, 181, 0.25)' : 'none'
                      }}
                      title={est.descripcion}
                    >
                      {est.nombre}
                    </button>
                  );
                })}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.76rem', fontWeight: 700, color: 'var(--toy-ink)', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={autoCalcularActivo}
                  onChange={(e) => setAutoCalcularActivo(e.target.checked)}
                  style={{ accentColor: 'var(--toy-blue)', width: '15px', height: '15px' }}
                />
                <span>Auto-actualizar al escribir</span>
              </label>
            </div>

            {formErrors.escalas && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#FEF2F2',
                  border: '1.5px solid var(--toy-red)',
                  color: '#991B1B',
                  fontSize: '0.78rem',
                  borderRadius: '12px',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 700
                }}
              >
                <AlertCircle size={15} strokeWidth={2.4} /> {formErrors.escalas}
              </div>
            )}

            {/* 10 Niveles de Cantidad */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                gap: '0.65rem'
              }}
            >
              {NIVELES_CANTIDAD.map((cant) => {
                const meta = NIVELES_METADATA[cant] || { etiqueta: `≥ ${cant} uds`, descripcion: '' };
                const isBase = cant === 1;
                const detalle = obtenerDetalleEscala(cant, escalasState[cant], escalasState[1]);

                return (
                  <div
                    key={cant}
                    style={{
                      padding: '0.65rem 0.75rem',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '14px',
                      border: isBase ? '2px solid var(--toy-blue)' : '1.5px solid var(--toy-border)',
                      boxShadow: isBase ? '0 3px 8px rgba(8, 123, 181, 0.15)' : '0 1px 3px rgba(58, 42, 34, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: isBase ? 'var(--toy-deep-blue)' : 'var(--toy-ink)' }}>
                        {meta.etiqueta}
                      </span>
                      {!isBase && detalle.porcentajeDescuento > 0 && (
                        <span
                          style={{
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            padding: '0.1rem 0.35rem',
                            borderRadius: '999px',
                            backgroundColor: 'rgba(25, 168, 232, 0.12)',
                            color: 'var(--toy-deep-blue)'
                          }}
                        >
                          -{detalle.porcentajeDescuento}%
                        </span>
                      )}
                      {isBase && (
                        <span
                          style={{
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            padding: '0.1rem 0.35rem',
                            borderRadius: '999px',
                            backgroundColor: 'rgba(25, 168, 232, 0.15)',
                            color: 'var(--toy-deep-blue)'
                          }}
                        >
                          Base
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--toy-muted)', marginRight: '4px' }}>Q</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="form-control"
                        style={{ padding: '0.3rem 0.45rem', fontSize: '0.82rem', height: '34px' }}
                        placeholder={isBase ? '0.00' : '0.00'}
                        value={escalasState[cant] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (isBase) {
                            handleNivel1Change(val);
                          } else {
                            setEscalasState((prev) => ({ ...prev, [cant]: val }));
                          }
                        }}
                        required={isBase}
                      />
                    </div>

                    <div style={{ fontSize: '0.66rem', color: 'var(--toy-muted)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{meta.descripcion}</span>
                      {!isBase && detalle.ahorroUnitario > 0 && (
                        <span style={{ color: 'var(--toy-green)', fontWeight: 700 }}>
                          -Q{detalle.ahorroUnitario}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal Quick Create Category */}
      <Modal
        isOpen={quickCatOpen}
        onClose={() => setQuickCatOpen(false)}
        title="Crear Nueva Categoría"
        footer={
          <>
            <button type="button" className="btn btn-danger" onClick={() => setQuickCatOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleCreateCategoria}>
              Guardar Categoría
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateCategoria}>
          <FormField label="Nombre de la Categoría" name="quick_cat" required>
            <input
              type="text"
              className="form-control"
              placeholder="Ej. Juegos de Mesa"
              value={quickCatNombre}
              onChange={(e) => setQuickCatNombre(e.target.value)}
              required
            />
          </FormField>
          <FormField label="Descripción" name="quick_cat_desc">
            <textarea
              className="form-control"
              rows={2}
              placeholder="Descripción opcional..."
              value={quickCatDesc}
              onChange={(e) => setQuickCatDesc(e.target.value)}
            />
          </FormField>
        </form>
      </Modal>

      {/* Modal Quick Create Brand */}
      <Modal
        isOpen={quickMarcaOpen}
        onClose={() => setQuickMarcaOpen(false)}
        title="Crear Nueva Marca"
        footer={
          <>
            <button type="button" className="btn btn-danger" onClick={() => setQuickMarcaOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleCreateMarca}>
              Guardar Marca
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateMarca}>
          <FormField label="Nombre de la Marca" name="quick_brand" required>
            <input
              type="text"
              className="form-control"
              placeholder="Ej. LEGO, Mattel, Hasbro"
              value={quickMarcaNombre}
              onChange={(e) => setQuickMarcaNombre(e.target.value)}
              required
            />
          </FormField>
        </form>
      </Modal>

      {/* Modal Confirmar Desactivar / Activar Producto */}
      <ConfirmModal
        isOpen={confirmToggleOpen}
        onClose={() => {
          if (!togglingStatus) {
            setConfirmToggleOpen(false);
            setProdToToggle(null);
          }
        }}
        onConfirm={handleConfirmToggleEstado}
        title={prodToToggle?.activo ? '¿Inactivar producto?' : '¿Reactivar producto?'}
        variant={prodToToggle?.activo ? 'danger' : 'primary'}
        confirmText={prodToToggle?.activo ? 'Sí, inactivar' : 'Sí, reactivar'}
        loading={togglingStatus}
        message={
          prodToToggle?.activo ? (
            <>
              ¿Estás seguro de que deseas inactivar el juguete{' '}
              <strong style={{ color: 'var(--toy-ink)' }}>{prodToToggle.nombre}</strong> (<code>{prodToToggle.codigo_sku}</code>)?
              <div style={{ marginTop: '0.45rem', fontSize: '0.84rem', color: 'var(--toy-muted)' }}>
                No podrá ser agregado a nuevas órdenes de venta hasta que sea reactivado.
              </div>
            </>
          ) : (
            <>
              ¿Estás seguro de que deseas reactivar el juguete{' '}
              <strong style={{ color: 'var(--toy-ink)' }}>{prodToToggle?.nombre}</strong> (<code>{prodToToggle?.codigo_sku}</code>)?
              <div style={{ marginTop: '0.45rem', fontSize: '0.84rem', color: 'var(--toy-muted)' }}>
                Estará disponible nuevamente en el catálogo y punto de venta.
              </div>
            </>
          )
        }
      />
    </>
  );
}
