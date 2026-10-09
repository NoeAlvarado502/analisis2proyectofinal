import React, { useState, useEffect, useCallback } from 'react';
import { PackagePlus, Pencil, EyeOff, Eye, AlertTriangle, AlertCircle, Plus, Boxes, List, Package, Sparkles } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import PermissionGate from '../components/PermissionGate';

import {
  NIVELES_CANTIDAD,
  NIVELES_METADATA,
  ESTRATEGIAS_PRECIO,
  calcularEscalasAutomaticas,
  obtenerDetalleEscala
} from '../utils/pricingEngine';

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

  // Modal Create / Edit Producto
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Product Form State
  const [formData, setFormData] = useState({
    codigo_sku: '',
    nombre: '',
    descripcion: '',
    id_categoria: '',
    id_marca: '',
    stock_minimo: 5,
    edad_minima_meses: ''
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

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedProducto(null);
    setFormData({
      codigo_sku: '',
      nombre: '',
      descripcion: '',
      id_categoria: categorias.length > 0 ? categorias[0].id_categoria : '',
      id_marca: '',
      stock_minimo: 5,
      edad_minima_meses: ''
    });

    const initialEscalas = {};
    NIVELES_CANTIDAD.forEach((c) => {
      initialEscalas[c] = '';
    });
    setEscalasState(initialEscalas);
    setEstrategiaPrecio('estandar');
    setAutoCalcularActivo(true);
    setFormErrors({});
    setModalOpen(true);
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

  // Open Edit Modal (fetches product detail with current tiers)
  const handleOpenEdit = async (prod) => {
    setModalMode('edit');
    setSelectedProducto(prod);
    setFormErrors({});

    try {
      const res = await api.get(`/productos/${prod.id_producto}`);
      if (res?.data) {
        const p = res.data;
        setFormData({
          codigo_sku: p.codigo_sku,
          nombre: p.nombre,
          descripcion: p.descripcion || '',
          id_categoria: p.id_categoria,
          id_marca: p.id_marca || '',
          stock_minimo: p.stock_minimo,
          edad_minima_meses: p.edad_minima_meses ?? ''
        });

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
    if (modalMode === 'create' && !formData.codigo_sku.trim()) errors.codigo_sku = 'El SKU es requerido';
    if (!formData.id_categoria) errors.id_categoria = 'La categoría es requerida';

    // Tier 1 is mandatory
    const retailPrice = parseFloat(escalasState[1]);
    if (isNaN(retailPrice) || retailPrice <= 0) {
      errors.escalas = 'El Nivel 1 (Precio Menudeo) es obligatorio y debe ser mayor a 0.00';
    } else {
      // Validate non-increasing price monotonicity
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
      // Build active scales array
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
      if (err.details && typeof err.details === 'object') {
        const fieldErrors = {};
        Object.entries(err.details).forEach(([key, val]) => {
          fieldErrors[key] = Array.isArray(val) ? val.join(', ') : val;
        });
        setFormErrors(fieldErrors);
      } else {
        toast.error(err.message || 'Error al guardar el producto');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Estado Producto
  const handleToggleEstado = async (prod) => {
    const actionName = prod.activo ? 'inactivar' : 'activar';
    if (!window.confirm(`¿Seguro que deseas ${actionName} el producto "${prod.nombre}" (${prod.codigo_sku})?`)) {
      return;
    }

    try {
      await api.patch(`/productos/${prod.id_producto}/estado`);
      toast.success(`Producto ${prod.activo ? 'inactivado' : 'reactivado'} correctamente`);
      fetchProductos();
    } catch (err) {
      toast.error(err.message || `No se pudo ${actionName} el producto`);
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
      }
    } catch (err) {
      toast.error(err.message || 'Error creando marca');
    }
  };

  // Columns definition
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
          <div style={{ fontWeight: 600 }}>{row.nombre}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Categoría: {row.categoria} {row.marca ? `· Marca: ${row.marca}` : ''}
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
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenEdit(row)}
            title="Editar producto y escalas"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Pencil size={13} strokeWidth={2.4} /> Editar
          </button>
          <button
            type="button"
            className={`btn btn-sm ${row.activo ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => handleToggleEstado(row)}
            title={row.activo ? 'Inactivar producto' : 'Reactivar producto'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            {row.activo ? (
              <>
                <EyeOff size={13} strokeWidth={2.4} /> Inactivar
              </>
            ) : (
              <>
                <Eye size={13} strokeWidth={2.4} /> Reactivar
              </>
            )}
          </button>
        </div>
      )
    });
  }

  return (
    <div>
      {/* Page Header */}
      <div className="card-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.25rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '999px', backgroundColor: 'var(--toy-blue)', display: 'inline-block' }} />
            <h1 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
              Catálogo de Juguetes &amp; Precios por Volumen
            </h1>
          </div>
          <p style={{ color: 'var(--toy-muted)', fontSize: '0.84rem', fontWeight: 600 }}>
            Control de inventario en tiempo real y configuración de escalas de precio al por mayor y menor.
          </p>
        </div>

        <PermissionGate permission="productos.gestionar">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreate}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <PackagePlus size={16} strokeWidth={2.4} />
            <span>Nuevo Producto</span>
          </button>
        </PermissionGate>
      </div>

      {/* Filter Toolbar & View Switcher */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          
          {/* Category Chips Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => { setFilterCategoria(''); setPage(1); }}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '999px',
                fontSize: '0.78rem',
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
                    padding: '0.45rem 1rem',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
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

          {/* View Mode Switcher */}
          <div
            style={{
              backgroundColor: 'rgba(255, 244, 221, 0.85)',
              padding: '0.35rem',
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
                height: '32px',
                padding: '0 0.85rem',
                fontSize: '0.78rem',
                border: 'none',
                boxShadow: viewMode === 'blister' ? '0 2px 0 var(--toy-deep-blue)' : 'none'
              }}
            >
              <Boxes size={14} strokeWidth={2.4} />
              <span>Blister Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={viewMode === 'table' ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
              style={{
                borderRadius: '999px',
                height: '32px',
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
        </div>

        {/* Search Input & Status Filter */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', paddingTop: '0.75rem', borderTop: '1.5px solid var(--toy-border)' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por SKU o nombre de juguete..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div style={{ width: '180px' }}>
            <select
              className="form-control"
              value={filterEstado}
              onChange={(e) => {
                setFilterEstado(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los estados</option>
              <option value="1">Solo Activos</option>
              <option value="0">Solo Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content: Blister Cards or Data Table */}
      {viewMode === 'blister' ? (
        <div>
          {loading ? (
            <div className="card text-center" style={{ padding: '3.5rem' }}>
              <span style={{ fontWeight: 800, color: 'var(--toy-muted)' }}>Cargando catálogo de juguetes...</span>
            </div>
          ) : productos.length === 0 ? (
            <div className="card text-center" style={{ padding: '3.5rem' }}>
              <Package size={44} color="var(--toy-muted)" style={{ margin: '0 auto 0.85rem' }} />
              <h3 className="font-display" style={{ fontSize: '1.25rem', color: 'var(--toy-ink)' }}>No se encontraron juguetes</h3>
              <p style={{ color: 'var(--toy-muted)', fontSize: '0.88rem', fontWeight: 600 }}>Prueba con otro término de búsqueda o categoría.</p>
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
                          whiteSpace: 'nowrap'
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
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', paddingTop: '0.65rem', borderTop: '1.5px solid var(--toy-border)' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenEdit(p)}
                            >
                              <Pencil size={13} strokeWidth={2.4} />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${p.activo ? 'btn-danger' : 'btn-secondary'}`}
                              onClick={() => handleToggleEstado(p)}
                            >
                              {p.activo ? (
                                <>
                                  <EyeOff size={13} strokeWidth={2.4} />
                                  <span>Inactivar</span>
                                </>
                              ) : (
                                <>
                                  <Eye size={13} strokeWidth={2.4} />
                                  <span>Activar</span>
                                </>
                              )}
                            </button>
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
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.4rem' }}>
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
        />
      )}

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
              className="btn btn-secondary"
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <FormField
              label="Código SKU"
              name="codigo_sku"
              error={formErrors.codigo_sku}
              helpText={modalMode === 'edit' ? 'Código no modificable' : 'Código único en mayúsculas'}
              required
            >
              <input
                type="text"
                id="codigo_sku"
                className={`form-control ${formErrors.codigo_sku ? 'has-error' : ''}`}
                value={formData.codigo_sku}
                onChange={(e) => setFormData({ ...formData, codigo_sku: e.target.value.toUpperCase() })}
                placeholder="JUG-004"
                disabled={modalMode === 'edit'}
                required
              />
            </FormField>

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
          </div>

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
                  style={{ padding: '0 6px', fontSize: '0.75rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Plus size={12} /> Nueva
                </button>
              </div>
              <select
                id="id_categoria"
                className={`form-control ${formErrors.id_categoria ? 'has-error' : ''}`}
                value={formData.id_categoria}
                onChange={(e) => setFormData({ ...formData, id_categoria: e.target.value })}
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
                <label className="form-label" style={{ margin: 0 }}>Marca (Opcional)</label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setQuickMarcaOpen(true)}
                  style={{ padding: '0 6px', fontSize: '0.75rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Plus size={12} /> Nueva
                </button>
              </div>
              <select
                id="id_marca"
                className="form-control"
                value={formData.id_marca}
                onChange={(e) => setFormData({ ...formData, id_marca: e.target.value })}
              >
                <option value="">Sin marca específica</option>
                {marcas.map((m) => (
                  <option key={m.id_marca} value={m.id_marca}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <FormField label="Stock Mínimo (Alerta)" name="stock_minimo" error={formErrors.stock_minimo} required>
              <input
                type="number"
                min="0"
                id="stock_minimo"
                className="form-control"
                value={formData.stock_minimo}
                onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Edad Mínima (Meses)" name="edad_minima_meses" error={formErrors.edad_minima_meses}>
              <input
                type="number"
                min="0"
                id="edad_minima_meses"
                className="form-control"
                placeholder="Ej. 36 (3 años)"
                value={formData.edad_minima_meses}
                onChange={(e) => setFormData({ ...formData, edad_minima_meses: e.target.value })}
              />
            </FormField>
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
                  <h4 className="font-display" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--toy-ink)' }}>
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
                <p style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 600, marginTop: '2px' }}>
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
            <button type="button" className="btn btn-secondary" onClick={() => setQuickCatOpen(false)}>
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
            <button type="button" className="btn btn-secondary" onClick={() => setQuickMarcaOpen(false)}>
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
    </div>
  );
}
