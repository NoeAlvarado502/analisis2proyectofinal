import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PackagePlus, Pencil, AlertTriangle, AlertCircle, Plus, Sparkles } from 'lucide-react';
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
  calcularEscalasAutomaticas
} from '../utils/pricingEngine';

const formatEdadBadge = (meses) => {
  if (meses === null || meses === undefined || meses === '') return '';
  const m = Number(meses);
  if (m === 0) return '0+';
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

  // Filters & Pagination
  const [q, setQ] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const estadoOptions = [
    { value: '', label: 'Todos los estados', shortLabel: 'Estados', color: 'var(--toy-muted)' },
    { value: '1', label: 'Solo Activos', shortLabel: 'Activos', color: 'var(--toy-blue)' },
    { value: '0', label: 'Solo Inactivos', shortLabel: 'Inactivos', color: 'var(--toy-red)' }
  ];

  const categoriaOptions = useMemo(() => [
    { value: '', label: 'Todas las categorías', shortLabel: 'Categorías', color: 'var(--toy-muted)' },
    ...categorias.map((c) => ({
      value: String(c.id_categoria),
      label: c.nombre,
      shortLabel: c.nombre
    }))
  ], [categorias]);

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

  // Single Price State
  const [precioVenta, setPrecioVenta] = useState('');

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
    setPrecioVenta('');
    setFormErrors({});
    setModalOpen(true);

    if (defaultCat) {
      handleAutoGenerarSku(defaultCat, '');
    }
  };

  // Handler para cambio en el precio único de venta (autocalcula escalas en segundo plano)
  const handlePrecioChange = (val) => {
    let cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 1) {
      // Limitar estrictamente a máximo 2 dígitos decimales (centavos)
      cleaned = parts[0] + '.' + parts.slice(1).join('').slice(0, 2);
    }
    setPrecioVenta(cleaned);
    if (formErrors.precio) {
      setFormErrors((prev) => ({ ...prev, precio: undefined }));
    }

    const p = parseFloat(cleaned);
    if (!isNaN(p) && p > 0) {
      const calculadas = calcularEscalasAutomaticas(p, 'estandar');
      if (calculadas) {
        setEscalasState(calculadas);
      }
    } else {
      const emptyTiers = {};
      NIVELES_CANTIDAD.forEach((c) => {
        emptyTiers[c] = '';
      });
      setEscalasState(emptyTiers);
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

        let baseVal = '';
        const tiersMap = {};
        NIVELES_CANTIDAD.forEach((c) => {
          tiersMap[c] = '';
        });
        if (Array.isArray(p.escalas)) {
          p.escalas.forEach((esc) => {
            tiersMap[esc.cantidad_minima] = String(esc.precio_unitario);
            if (esc.cantidad_minima === 1) {
              baseVal = String(esc.precio_unitario);
            }
          });
        }
        if (!baseVal && prod.precio_menudeo) {
          baseVal = String(prod.precio_menudeo);
        }
        setPrecioVenta(baseVal);
        if (baseVal && parseFloat(baseVal) > 0) {
          const calculadas = calcularEscalasAutomaticas(parseFloat(baseVal), 'estandar');
          setEscalasState(calculadas || tiersMap);
        } else {
          setEscalasState(tiersMap);
        }
        setModalOpen(true);
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar detalles del producto');
    }
  };

  // Validación estricta similar al módulo de clientes
  const validateForm = () => {
    const errors = {};
    const nombreTrimmed = formData.nombre.trim();
    if (!nombreTrimmed) {
      errors.nombre = 'El nombre del producto es obligatorio';
    } else if (nombreTrimmed.length < 2) {
      errors.nombre = 'El nombre debe tener al menos 2 caracteres';
    } else if (/^\d+$/.test(nombreTrimmed)) {
      errors.nombre = 'El nombre del producto no puede ser únicamente numérico';
    } else if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(nombreTrimmed)) {
      errors.nombre = 'El nombre del producto debe contener al menos una letra';
    }

    if (!formData.id_categoria) {
      errors.id_categoria = 'La categoría es obligatoria';
    }

    const p = parseFloat(precioVenta);
    if (!precioVenta || isNaN(p) || p <= 0) {
      errors.precio = 'El precio de venta es obligatorio y debe ser mayor a 0.00';
    } else if (!/^\d+(\.\d{1,2})?$/.test(precioVenta)) {
      errors.precio = 'El precio no puede tener más de 2 dígitos decimales';
    }

    if (formData.stock_minimo === '' || isNaN(Number(formData.stock_minimo)) || Number(formData.stock_minimo) < 0) {
      errors.stock_minimo = 'El stock mínimo debe ser un número entero mayor o igual a 0';
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
      const p = parseFloat(precioVenta);
      const calculadas = calcularEscalasAutomaticas(p, 'estandar') || {};
      const escalasPayload = NIVELES_CANTIDAD.map((cant) => ({
        cantidad_minima: cant,
        precio_unitario: parseFloat(calculadas[cant] ?? p)
      }));

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
        toast.success(`Producto ${payload.codigo_sku} creado exitosamente`);
      } else {
        await api.put(`/productos/${selectedProducto.id_producto}`, payload);
        toast.success('Producto actualizado exitosamente');
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
      width: '125px',
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
      header: 'Precio (Q)',
      key: 'precio_menudeo',
      width: '120px',
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
      width: '110px',
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
      width: '120px',
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
              placeholder=""
              ariaLabel="Buscar juguetes"
            />

            <FilterDropdown
              options={categoriaOptions}
              value={filterCategoria}
              onChange={(val) => {
                setFilterCategoria(val);
                setPage(1);
              }}
              title="Filtrar por categoría"
              buttonTitle="Categorías"
              searchable={true}
              searchPlaceholder="Buscar categoría..."
              maxWidth="180px"
              minWidth="220px"
            />

            <FilterDropdown
              value={filterEstado}
              onChange={(val) => {
                setFilterEstado(val);
                setPage(1);
              }}
              options={estadoOptions}
              title="Filtrar por estado"
              maxWidth="160px"
            />

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

        {/* Main Content: Data Table */}
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
      </PageCard>

      {/* Modal Crear / Editar Producto */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        size="lg"
        title={modalMode === 'create' ? 'Registrar Producto' : `Editar Producto: ${formData.codigo_sku}`}
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
              {submitting ? 'Guardando...' : (modalMode === 'create' ? 'Registrar Producto' : 'Guardar Cambios')}
            </button>
          </>
        }
      >
        <form onSubmit={handleFormSubmit}>
          <FormField label="Nombre del Juguete" name="nombre" error={formErrors.nombre} required>
            <input
              type="text"
              id="nombre"
              className={`form-control ${formErrors.nombre ? 'has-error' : ''}`}
              value={formData.nombre}
              onChange={(e) => {
                setFormData({ ...formData, nombre: e.target.value });
                if (formErrors.nombre) {
                  setFormErrors((prev) => ({ ...prev, nombre: undefined }));
                }
              }}
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
                <option value="">Selecciona una marca (Opcional)</option>
                {marcas.map((m) => (
                  <option key={m.id_marca} value={m.id_marca}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <FormField label="Precio de Venta (Q)" name="precio" error={formErrors.precio} required>
              <input
                type="text"
                inputMode="decimal"
                id="precio_unitario"
                className={`form-control ${formErrors.precio ? 'has-error' : ''}`}
                value={precioVenta}
                onChange={(e) => handlePrecioChange(e.target.value)}
                onBlur={() => {
                  if (precioVenta && !isNaN(parseFloat(precioVenta))) {
                    handlePrecioChange(parseFloat(precioVenta).toFixed(2));
                  }
                }}
                placeholder="0.00"
                required
              />
            </FormField>

            <FormField label="Stock Mínimo (Alerta de Bodega)" name="stock_minimo" error={formErrors.stock_minimo} required>
              <input
                type="number"
                min="0"
                id="stock_minimo"
                className={`form-control ${formErrors.stock_minimo ? 'has-error' : ''}`}
                value={formData.stock_minimo}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, stock_minimo: val });
                  if (formErrors.stock_minimo) {
                    setFormErrors((prev) => ({ ...prev, stock_minimo: undefined }));
                  }
                }}
                placeholder="Ej. 5"
                required
              />
            </FormField>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem' }}>
                Edad Recomendada
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: edadUnidad === 'anos' ? 700 : 500,
                    color: edadUnidad === 'anos' ? 'var(--toy-ink)' : 'var(--toy-muted)'
                  }}
                >
                  Años
                </span>
                <ToySwitch
                  checked={edadUnidad === 'meses'}
                  onChange={() => setEdadUnidad(edadUnidad === 'anos' ? 'meses' : 'anos')}
                  title="Cambiar entre Años y Meses"
                  ariaLabel="Cambiar entre Años y Meses"
                />
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: edadUnidad === 'meses' ? 700 : 500,
                    color: edadUnidad === 'meses' ? 'var(--toy-ink)' : 'var(--toy-muted)'
                  }}
                >
                  Meses
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                id="edad_minima_meses"
                min="0"
                className="form-control"
                style={{ maxWidth: '180px' }}
                value={
                  edadUnidad === 'anos'
                    ? (formData.edad_minima_meses !== '' && formData.edad_minima_meses !== null
                        ? Math.round(Number(formData.edad_minima_meses) / 12)
                        : '')
                    : (formData.edad_minima_meses !== '' && formData.edad_minima_meses !== null
                        ? formData.edad_minima_meses
                        : '')
                }
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
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
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--toy-muted)' }}>
                {edadUnidad === 'anos' ? 'años' : 'meses'}
              </span>
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
