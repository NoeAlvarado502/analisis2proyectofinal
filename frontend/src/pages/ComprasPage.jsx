import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  PackagePlus,
  Pencil,
  XCircle,
  Eye,
  Trash2,
  PackageCheck,
  Filter
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import FormField from '../components/FormField';
import FilterDropdown from '../components/FilterDropdown';
import SearchableSelect from '../components/SearchableSelect';
import ToySwitch from '../components/ToySwitch';
import PageCard from '../components/PageCard';
import { useSearch } from '../context/SearchContext';

export default function ComprasPage() {
  const { can } = useAuth();
  const toast = useToast();
  const location = useLocation();

  const canRegisterCompras = can('compras.registrar');
  const canReceiveCompras = can('compras.recibir');

  // Listado principal
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const { query: q } = useSearch();
  const [filterProveedor, setFilterProveedor] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [q]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Listas auxiliares para selects
  const [proveedoresActivos, setProveedoresActivos] = useState([]);
  const [productosActivos, setProductosActivos] = useState([]);

  // Modal Nueva / Editar Compra
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingCompraId, setEditingCompraId] = useState(null);
  const [formData, setFormData] = useState({
    numero_comprobante: '',
    id_proveedor: '',
    observaciones: '',
    recibir_inmediatamente: false
  });
  const [detallesList, setDetallesList] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Inputs para añadir un ítem al detalle
  const [itemInput, setItemInput] = useState({
    id_producto: '',
    cantidad: 1,
    costo_unitario: ''
  });

  // Modal Vista / Detalle de Compra
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedCompraDetail, setSelectedCompraDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal Confirmación Recepción
  const [confirmReceiveOpen, setConfirmReceiveOpen] = useState(false);
  const [receiving, setReceiving] = useState(false);

  // Modal Confirmación Anulación
  const [confirmAnularOpen, setConfirmAnularOpen] = useState(false);
  const [anulando, setAnulando] = useState(false);

  const estadoOptions = [
    { value: '', label: 'Todos los estados', shortLabel: 'Estados', color: 'var(--toy-muted)' },
    { value: 'REGISTRADA', label: 'Registrada (Pendiente)', shortLabel: 'Registradas', color: 'var(--toy-orange)' },
    { value: 'RECIBIDA', label: 'Recibida (En inventario)', shortLabel: 'Recibidas', color: 'var(--toy-green)' },
    { value: 'ANULADA', label: 'Anulada', shortLabel: 'Anuladas', color: 'var(--toy-red)' }
  ];

  // Cargar lista de compras
  const fetchCompras = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (q.trim()) params.q = q.trim();
      if (filterProveedor) params.id_proveedor = filterProveedor;
      if (filterEstado) params.estado = filterEstado;
      if (filterFechaDesde) params.fecha_desde = filterFechaDesde;
      if (filterFechaHasta) params.fecha_hasta = filterFechaHasta;

      const res = await api.get('/compras', { params });
      if (res?.data) {
        setCompras(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
          setTotalRecords(res.meta.total || 0);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar compras');
    } finally {
      setLoading(false);
    }
  }, [page, q, filterProveedor, filterEstado, filterFechaDesde, filterFechaHasta, toast]);

  useEffect(() => {
    fetchCompras();
  }, [fetchCompras]);

  // Cargar proveedores y productos para formularios y filtros
  const fetchAuxiliares = useCallback(async () => {
    try {
      const [provRes, prodRes] = await Promise.all([
        api.get('/proveedores', { params: { activo: '1', limit: 100 } }),
        api.get('/productos', { params: { activo: '1', limit: 300 } })
      ]);
      if (provRes?.data) setProveedoresActivos(provRes.data);
      if (prodRes?.data) setProductosActivos(prodRes.data);
    } catch (err) {
      console.error('Error cargando listas auxiliares:', err);
    }
  }, []);

  useEffect(() => {
    fetchAuxiliares();
  }, [fetchAuxiliares]);

  // Abrir modal de creación (con soporte para prellenado desde Alertas de Inventario)
  const handleOpenCreate = async (prefillItem = null) => {
    setModalMode('create');
    setEditingCompraId(null);
    setFormErrors({});

    let comprobanteSugerido = '';
    try {
      const sug = await api.get('/compras/sugerir-comprobante');
      if (sug?.data?.sugerencia) {
        comprobanteSugerido = sug.data.sugerencia;
      }
    } catch (err) {
      console.warn('No se pudo obtener correlativo sugerido:', err);
    }

    // Proveedor inicial
    let provId = proveedoresActivos[0]?.id_proveedor ? String(proveedoresActivos[0].id_proveedor) : '';
    if (!provId) {
      try {
        const provRes = await api.get('/proveedores', { params: { activo: '1', limit: 10 } });
        if (provRes?.data?.length > 0) {
          provId = String(provRes.data[0].id_proveedor);
        }
      } catch (e) {}
    }

    setFormData({
      numero_comprobante: comprobanteSugerido,
      id_proveedor: provId,
      observaciones: prefillItem ? `Abastecimiento de stock por alerta crítica (${prefillItem.producto_nombre})` : '',
      recibir_inmediatamente: false
    });

    if (prefillItem) {
      let costoSug = '';
      try {
        const costRes = await api.get(`/compras/ultimo-costo/${prefillItem.id_producto}`);
        if (costRes?.data?.ultimo_costo) {
          costoSug = String(costRes.data.ultimo_costo);
        }
      } catch (e) {}

      // Si no hay costo previo de compras, estimar desde precio_menudeo
      if (!costoSug) {
        const prod = productosActivos.find((p) => p.id_producto === prefillItem.id_producto);
        if (prod?.precio_menudeo) {
          costoSug = String((parseFloat(prod.precio_menudeo) * 0.6).toFixed(2));
        }
      }

      setItemInput({
        id_producto: String(prefillItem.id_producto),
        cantidad: prefillItem.cantidad,
        costo_unitario: costoSug || ''
      });

      // Si tenemos costo sugerido válido, precargar de una vez en el detalle de la compra
      if (costoSug && parseFloat(costoSug) > 0) {
        setDetallesList([
          {
            id_producto: prefillItem.id_producto,
            codigo_sku: prefillItem.codigo_sku,
            producto_nombre: prefillItem.producto_nombre,
            cantidad: prefillItem.cantidad,
            costo_unitario: parseFloat(costoSug)
          }
        ]);
      } else {
        setDetallesList([]);
      }
    } else {
      setDetallesList([]);
      setItemInput({ id_producto: '', cantidad: 1, costo_unitario: '' });
    }

    setFormModalOpen(true);
  };

  // Detectar navegación desde alerta de abastecimiento (Inventario -> Compras)
  useEffect(() => {
    if (location.state?.abastecerItem) {
      handleOpenCreate(location.state.abastecerItem);
      // Limpiar el estado de navegación en el historial para evitar reapertura accidental
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Abrir modal de edición
  const handleOpenEdit = async (compra) => {
    setModalMode('edit');
    setEditingCompraId(compra.id_compra);
    setFormErrors({});
    setItemInput({ id_producto: '', cantidad: 1, costo_unitario: '' });

    try {
      const res = await api.get(`/compras/${compra.id_compra}`);
      const data = res.data;
      setFormData({
        numero_comprobante: data.numero_comprobante,
        id_proveedor: String(data.id_proveedor),
        observaciones: data.observaciones || '',
        recibir_inmediatamente: false
      });
      setDetallesList(
        data.detalles.map((d) => ({
          id_producto: d.id_producto,
          codigo_sku: d.codigo_sku,
          producto_nombre: d.producto_nombre,
          cantidad: d.cantidad,
          costo_unitario: parseFloat(d.costo_unitario)
        }))
      );
      setFormModalOpen(true);
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar la información de la compra');
    }
  };

  // Ver detalle completo de una compra
  const handleOpenView = async (idCompra) => {
    setLoadingDetail(true);
    setViewModalOpen(true);
    try {
      const res = await api.get(`/compras/${idCompra}`);
      setSelectedCompraDetail(res.data);
    } catch (err) {
      toast.error(err.message || 'Error al obtener detalle de la compra');
      setViewModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Añadir ítem a la lista temporal de detalle
  const handleAddItemToDetalle = () => {
    const prodId = parseInt(itemInput.id_producto, 10);
    const cant = Number(itemInput.cantidad);
    const costoStr = String(itemInput.costo_unitario).trim();
    const costo = parseFloat(costoStr);

    if (!prodId) {
      toast.error('Selecciona un producto');
      return;
    }
    if (!itemInput.cantidad || isNaN(cant) || cant <= 0 || !Number.isInteger(cant)) {
      toast.error('La cantidad debe ser un número entero mayor a 0 (sin decimales)');
      return;
    }
    if (isNaN(costo) || costo <= 0) {
      toast.error('Ingresa un costo unitario válido mayor a 0');
      return;
    }
    if (costoStr.includes('.') && costoStr.split('.')[1].length > 2) {
      toast.error('El costo unitario no puede tener más de 2 decimales');
      return;
    }

    const prodInfo = productosActivos.find((p) => p.id_producto === prodId);

    // Si ya existe en la lista, sumar cantidad y actualizar costo
    const existingIndex = detallesList.findIndex((d) => d.id_producto === prodId);
    if (existingIndex >= 0) {
      const updated = [...detallesList];
      updated[existingIndex].cantidad += cant;
      updated[existingIndex].costo_unitario = costo;
      setDetallesList(updated);
      toast.info(`Se actualizó la cantidad de "${prodInfo?.nombre || 'Producto'}" a ${updated[existingIndex].cantidad}`);
    } else {
      setDetallesList([
        ...detallesList,
        {
          id_producto: prodId,
          codigo_sku: prodInfo?.codigo_sku || '',
          producto_nombre: prodInfo?.nombre || '',
          cantidad: cant,
          costo_unitario: costo
        }
      ]);
    }

    // Resetear input de ítem
    setItemInput({
      id_producto: '',
      cantidad: 1,
      costo_unitario: ''
    });
  };

  // Eliminar ítem del detalle
  const handleRemoveItem = (index) => {
    setDetallesList(detallesList.filter((_, i) => i !== index));
  };

  // Calcular total general en tiempo real
  const totalGeneral = useMemo(() => {
    return detallesList.reduce((acc, curr) => acc + curr.cantidad * curr.costo_unitario, 0);
  }, [detallesList]);

  // Guardar formulario (Crear o Editar)
  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.id_proveedor) {
      setFormErrors({ id_proveedor: 'Debes seleccionar un proveedor' });
      toast.error('Debes seleccionar un proveedor');
      return;
    }

    const obsTrimmed = formData.observaciones.trim();
    if (obsTrimmed) {
      if (/^\d+$/.test(obsTrimmed)) {
        setFormErrors({ observaciones: 'Las observaciones no pueden ser únicamente numéricas' });
        toast.error('Las observaciones no pueden ser únicamente numéricas');
        return;
      }
      if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(obsTrimmed)) {
        setFormErrors({ observaciones: 'Las observaciones deben contener al menos una letra descriptiva' });
        toast.error('Las observaciones deben contener al menos una letra descriptiva');
        return;
      }
    }

    if (detallesList.length === 0) {
      toast.error('Debes agregar al menos un producto a la compra');
      return;
    }

    setSubmitting(true);
    setFormErrors({});

    try {
      if (modalMode === 'create') {
        const payload = {
          numero_comprobante: formData.numero_comprobante?.trim() || null,
          id_proveedor: parseInt(formData.id_proveedor, 10),
          observaciones: obsTrimmed || null,
          recibir_inmediatamente: Boolean(formData.recibir_inmediatamente),
          detalles: detallesList.map((d) => ({
            id_producto: d.id_producto,
            cantidad: parseInt(d.cantidad, 10),
            costo_unitario: parseFloat(d.costo_unitario)
          }))
        };
        await api.post('/compras', payload);
        toast.success(
          formData.recibir_inmediatamente
            ? 'Compra registrada y recibida en inventario correctamente'
            : 'Compra registrada exitosamente (pendiente de recepción)'
        );
      } else {
        const payload = {
          observaciones: obsTrimmed || null,
          detalles: detallesList.map((d) => ({
            id_producto: d.id_producto,
            cantidad: parseInt(d.cantidad, 10),
            costo_unitario: parseFloat(d.costo_unitario)
          }))
        };
        await api.put(`/compras/${editingCompraId}`, payload);
        toast.success('Compra actualizada exitosamente');
      }

      setFormModalOpen(false);
      fetchCompras();
    } catch (err) {
      toast.error(err.message || 'Error al guardar la compra');
    } finally {
      setSubmitting(false);
    }
  };

  // Recibir compra
  const handleConfirmReceive = async () => {
    if (!selectedCompraDetail) return;
    setReceiving(true);
    try {
      await api.patch(`/compras/${selectedCompraDetail.id_compra}/recibir`);
      toast.success(
        `¡Mercadería recibida con éxito! Se incrementó el inventario de ${selectedCompraDetail.detalles.length} productos.`
      );
      setConfirmReceiveOpen(false);
      setViewModalOpen(false);
      fetchCompras();
    } catch (err) {
      toast.error(err.message || 'Error al recibir mercadería');
    } finally {
      setReceiving(false);
    }
  };

  // Anular compra
  const handleConfirmAnular = async () => {
    if (!selectedCompraDetail) return;
    setAnulando(true);
    try {
      await api.patch(`/compras/${selectedCompraDetail.id_compra}/anular`);
      toast.success('Compra anulada correctamente');
      setConfirmAnularOpen(false);
      setViewModalOpen(false);
      fetchCompras();
    } catch (err) {
      toast.error(err.message || 'Error al anular compra');
    } finally {
      setAnulando(false);
    }
  };

  // Render badge de estado
  const renderEstadoBadge = (estado) => {
    switch (estado) {
      case 'RECIBIDA':
        return <span className="badge badge-success">Recibida</span>;
      case 'ANULADA':
        return <span className="badge badge-danger">Anulada</span>;
      case 'REGISTRADA':
      default:
        return (
          <span
            className="badge badge-warning"
            style={{
              backgroundColor: 'rgba(255, 157, 46, 0.15)',
              color: 'var(--toy-orange-dark)',
              border: '1px solid rgba(255, 157, 46, 0.35)'
            }}
          >
            Registrada
          </span>
        );
    }
  };

  // Columnas tabla principal
  const columns = [
    {
      header: 'Comprobante',
      key: 'numero_comprobante',
      render: (row) => <code>{row.numero_comprobante}</code>
    },
    {
      header: 'Proveedor',
      key: 'proveedor_nombre',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 700, color: 'var(--toy-ink)' }}>{row.proveedor_nombre}</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)' }}>NIT: {row.proveedor_identificacion || 'C/F'}</span>
        </div>
      )
    },
    {
      header: 'Fecha Registro',
      key: 'fecha_compra',
      render: (row) => (
        <span style={{ fontSize: '0.84rem', color: 'var(--toy-ink)', fontWeight: 600 }}>
          {row.fecha_compra ? new Date(row.fecha_compra).toLocaleDateString() : '-'}
        </span>
      )
    },
    {
      header: 'Total',
      key: 'total',
      render: (row) => (
        <span style={{ fontWeight: 800, color: 'var(--toy-deep-blue)', fontSize: '0.92rem' }}>
          Q{parseFloat(row.total || 0).toFixed(2)}
        </span>
      )
    },
    {
      header: 'Estado',
      key: 'estado',
      render: (row) => renderEstadoBadge(row.estado)
    },
    {
      header: 'Acciones',
      key: 'acciones',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={() => handleOpenView(row.id_compra)}
            title="Ver detalle de la compra"
            aria-label="Ver detalle"
          >
            <Eye size={15} strokeWidth={2.2} />
          </button>

          {row.estado === 'REGISTRADA' && canRegisterCompras && (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                onClick={() => handleOpenEdit(row)}
                title="Editar compra"
                aria-label="Editar compra"
              >
                <Pencil size={15} strokeWidth={2.2} />
              </button>

              <button
                type="button"
                className="btn-delete-item"
                onClick={() => {
                  setSelectedCompraDetail(row);
                  setConfirmAnularOpen(true);
                }}
                title="Anular orden de compra"
                aria-label="Anular orden de compra"
              >
                <XCircle size={15} strokeWidth={2.2} />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <>
      <PageCard
        title="Compras"
        actions={
          <>
            <SearchableSelect
              options={[
                { value: '', label: 'Proveedores' },
                ...proveedoresActivos.map((pr) => ({
                  value: String(pr.id_proveedor),
                  label: pr.razon_social,
                  subtitle: pr.identificacion_fiscal ? `NIT: ${pr.identificacion_fiscal}` : null,
                  badge: pr.identificacion_fiscal || null,
                  searchKey: `${pr.razon_social} ${pr.identificacion_fiscal || ''}`
                }))
              ]}
              value={filterProveedor}
              onChange={(val) => {
                setFilterProveedor(val);
                setPage(1);
              }}
              placeholder="Proveedores"
              searchPlaceholder="Buscar proveedor..."
              icon={<Filter size={15} strokeWidth={2.4} color={filterProveedor ? 'var(--toy-blue)' : 'var(--toy-muted)'} />}
              style={{ width: '185px' }}
            />

            <FilterDropdown
              options={estadoOptions}
              value={filterEstado}
              onChange={(val) => {
                setFilterEstado(val);
                setPage(1);
              }}
              buttonTitle="Filtrar por estado"
            />

            {canRegisterCompras && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreate}
                title="Nueva compra"
                aria-label="Nueva compra"
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
            )}
          </>
        }
      >
        <DataTable
          columns={columns}
          data={compras}
          loading={loading}
          emptyMessage="No se encontraron registros de compras"
          pagination={{
            page,
            totalPages,
            totalRecords
          }}
          onPageChange={(newPage) => setPage(newPage)}
          embedded
        />
      </PageCard>

      {/* Modal Formulario de Creación / Edición */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => !submitting && setFormModalOpen(false)}
        title={modalMode === 'create' ? 'Registrar Compra' : 'Editar Compra Registrada'}
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
              Total General: <span style={{ color: 'var(--toy-deep-blue)' }}>Q{totalGeneral.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFormModalOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmitForm}
                disabled={submitting || detallesList.length === 0}
                style={{ minWidth: '140px' }}
              >
                {submitting ? 'Procesando...' : modalMode === 'create' ? 'Registrar Compra' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSubmitForm}>
          {/* Cabecera: Proveedor */}
          <div style={{ marginBottom: '1rem' }}>
            <FormField
              label="Proveedor"
              name="id_proveedor"
              required
              error={formErrors.id_proveedor}
            >
              <SearchableSelect
                id="id_proveedor"
                options={proveedoresActivos.map((pr) => ({
                  value: String(pr.id_proveedor),
                  label: pr.razon_social,
                  subtitle: pr.identificacion_fiscal ? `NIT: ${pr.identificacion_fiscal}` : 'Sin NIT',
                  badge: pr.identificacion_fiscal || null,
                  searchKey: `${pr.razon_social} ${pr.identificacion_fiscal || ''}`
                }))}
                value={formData.id_proveedor}
                onChange={(val) => {
                  setFormData((prev) => ({ ...prev, id_proveedor: val }));
                  if (formErrors.id_proveedor) {
                    setFormErrors((prev) => ({ ...prev, id_proveedor: undefined }));
                  }
                }}
                placeholder="Selecciona un proveedor..."
                searchPlaceholder="Buscar por razón social o NIT..."
                disabled={modalMode === 'edit'}
                error={Boolean(formErrors.id_proveedor)}
              />
            </FormField>
          </div>

          <FormField label="Observaciones / Notas" name="observaciones" error={formErrors.observaciones}>
            <input
              id="observaciones"
              type="text"
              className={`form-control ${formErrors.observaciones ? 'has-error is-invalid' : ''}`}
              value={formData.observaciones}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, observaciones: e.target.value }));
                if (formErrors.observaciones) {
                  setFormErrors((prev) => ({ ...prev, observaciones: undefined }));
                }
              }}
              placeholder="Opcional: detalles del envío o referencia bancaria"
            />
          </FormField>

          {/* Switch de Estado al Registrar: Registrada (Naranja) / Recibida (Verde) */}
          {modalMode === 'create' && (
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
                margin: '0.5rem 0 1.25rem 0'
              }}
            >
              <span
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  color: !formData.recibir_inmediatamente ? 'var(--toy-orange-dark)' : 'var(--toy-muted)',
                  cursor: canReceiveCompras ? 'pointer' : 'default',
                  userSelect: 'none',
                  transition: 'color 0.18s ease'
                }}
                onClick={() => canReceiveCompras && setFormData((prev) => ({ ...prev, recibir_inmediatamente: false }))}
              >
                Registrada
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={formData.recibir_inmediatamente}
                disabled={!canReceiveCompras}
                onClick={() => {
                  if (!canReceiveCompras) return;
                  setFormData((prev) => ({ ...prev, recibir_inmediatamente: !prev.recibir_inmediatamente }));
                }}
                title={
                  !canReceiveCompras
                    ? 'Sin permisos para recibir compras inmediatamente'
                    : formData.recibir_inmediatamente
                    ? 'Cambiar a Registrada'
                    : 'Cambiar a Recibida'
                }
                aria-label="Alternar entre estado Registrada y Recibida"
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  width: '44px',
                  height: '24px',
                  padding: '0 2px',
                  backgroundColor: formData.recibir_inmediatamente ? 'var(--toy-green)' : 'var(--toy-orange)',
                  borderColor: formData.recibir_inmediatamente ? 'var(--toy-green-dark)' : 'var(--toy-orange-dark)',
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  borderRadius: '999px',
                  cursor: canReceiveCompras ? 'pointer' : 'not-allowed',
                  opacity: canReceiveCompras ? 1 : 0.5,
                  boxShadow: formData.recibir_inmediatamente
                    ? '0 2px 6px rgba(116, 201, 91, 0.35)'
                    : '0 2px 6px rgba(255, 157, 46, 0.35)',
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
                    transform: formData.recibir_inmediatamente ? 'translateX(18px)' : 'translateX(0)'
                  }}
                />
              </button>

              <span
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  color: formData.recibir_inmediatamente ? 'var(--toy-green-dark)' : 'var(--toy-muted)',
                  cursor: canReceiveCompras ? 'pointer' : 'default',
                  userSelect: 'none',
                  transition: 'color 0.18s ease'
                }}
                onClick={() => canReceiveCompras && setFormData((prev) => ({ ...prev, recibir_inmediatamente: true }))}
              >
                Recibida
              </span>
            </div>
          )}

          {/* Constructor de Detalle de Productos */}
          <div
            style={{
              marginTop: '1.25rem',
              padding: '1rem',
              backgroundColor: 'var(--toy-cream)',
              borderRadius: '16px',
              border: '2px solid var(--toy-border)'
            }}
          >
            <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '1rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
              Detalle de Productos a Comprar
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '0.2rem' }}>Producto</label>
                <SearchableSelect
                  options={productosActivos.map((p) => ({
                    value: String(p.id_producto),
                    label: p.nombre,
                    subtitle: `SKU: ${p.codigo_sku}`,
                    badge: p.codigo_sku,
                    searchKey: `${p.nombre} ${p.codigo_sku}`
                  }))}
                  value={itemInput.id_producto}
                  onChange={(val) => setItemInput((prev) => ({ ...prev, id_producto: val }))}
                  placeholder="Selecciona producto..."
                  searchPlaceholder="Buscar por nombre o SKU..."
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '0.2rem' }}>Cantidad</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="form-control"
                  value={itemInput.cantidad}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '');
                    setItemInput((prev) => ({ ...prev, cantidad: digitsOnly ? parseInt(digitsOnly, 10) : '' }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E' || e.key === '-') {
                      e.preventDefault();
                    }
                  }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '0.2rem' }}>Costo Unit. (Q)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className="form-control"
                  value={itemInput.costo_unitario}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val.includes('.')) {
                      const [intPart, decPart] = val.split('.');
                      if (decPart && decPart.length > 2) {
                        val = `${intPart}.${decPart.slice(0, 2)}`;
                      }
                    }
                    setItemInput((prev) => ({ ...prev, costo_unitario: val }));
                  }}
                />
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddItemToDetalle}
                style={{ height: '40px', padding: '0 1rem' }}
              >
                Agregar
              </button>
            </div>

            {/* Tabla de ítems en modal */}
            <div style={{ marginTop: '1rem', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--toy-border-light)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--toy-cream-dark)', textAlign: 'left' }}>
                    <th style={{ padding: '0.55rem 0.75rem' }}>SKU</th>
                    <th style={{ padding: '0.55rem 0.75rem' }}>Producto</th>
                    <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>Cantidad</th>
                    <th style={{ padding: '0.55rem 0.75rem', textAlign: 'right' }}>Costo Unit.</th>
                    <th style={{ padding: '0.55rem 0.75rem', textAlign: 'right' }}>Subtotal</th>
                    <th style={{ padding: '0.55rem 0.75rem', width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {detallesList.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--toy-muted)', fontWeight: 600 }}>
                        No has añadido productos al detalle de la compra aún.
                      </td>
                    </tr>
                  ) : (
                    detallesList.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--toy-border-light)' }}>
                        <td style={{ padding: '0.55rem 0.75rem' }}><code>{item.codigo_sku}</code></td>
                        <td style={{ padding: '0.55rem 0.75rem', fontWeight: 700 }}>{item.producto_nombre}</td>
                        <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>{item.cantidad}</td>
                        <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right' }}>Q{parseFloat(item.costo_unitario).toFixed(2)}</td>
                        <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontWeight: 800, color: 'var(--toy-deep-blue)' }}>
                          Q{(item.cantidad * item.costo_unitario).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-delete-item"
                            onClick={() => handleRemoveItem(idx)}
                            title="Eliminar producto"
                            aria-label="Eliminar producto"
                          >
                            <Trash2 size={14} strokeWidth={2.4} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal Detalle y Recepción de Compra */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={`Detalle de Compra: ${selectedCompraDetail?.numero_comprobante || ''}`}
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              {selectedCompraDetail?.estado === 'REGISTRADA' && canRegisterCompras && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => setConfirmAnularOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  <XCircle size={16} />
                  <span>Anular Compra</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setViewModalOpen(false)}>
                Cerrar
              </button>

              {selectedCompraDetail?.estado === 'REGISTRADA' && canReceiveCompras && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setConfirmReceiveOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  <PackageCheck size={18} />
                  <span>Recibir Mercadería (Ingresar a Inventario)</span>
                </button>
              )}
            </div>
          </div>
        }
      >
        {loadingDetail || !selectedCompraDetail ? (
          <div style={{ padding: '2rem', textAlign: 'center', fontWeight: 700 }}>Cargando datos de la compra...</div>
        ) : (
          <div>
            {/* Tarjeta de Resumen Cabecera */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                backgroundColor: 'var(--toy-cream)',
                borderRadius: '16px',
                padding: '1.25rem',
                border: '2px solid var(--toy-border)',
                marginBottom: '1.25rem'
              }}
            >
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 700 }}>PROVEEDOR</span>
                <p style={{ margin: '0.2rem 0 0', fontWeight: 800, fontSize: '1rem', color: 'var(--toy-ink)' }}>
                  {selectedCompraDetail.proveedor_nombre}
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--toy-muted)' }}>
                  NIT: {selectedCompraDetail.proveedor_identificacion || 'C/F'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 700 }}>ESTADO ACTUAL</span>
                <div style={{ marginTop: '0.25rem' }}>
                  {renderEstadoBadge(selectedCompraDetail.estado)}
                </div>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--toy-muted)' }}>
                  Registrado por: <strong>{selectedCompraDetail.usuario_registro}</strong>
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 700 }}>TOTAL DE COMPRA</span>
                <p style={{ margin: '0.2rem 0 0', fontWeight: 800, fontSize: '1.35rem', color: 'var(--toy-deep-blue)' }}>
                  Q{parseFloat(selectedCompraDetail.total || 0).toFixed(2)}
                </p>
                {selectedCompraDetail.estado === 'RECIBIDA' && (
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--toy-green-dark)', fontWeight: 700 }}>
                    Recibido por: {selectedCompraDetail.usuario_recepcion}
                  </p>
                )}
              </div>
            </div>

            {selectedCompraDetail.observaciones && (
              <div style={{ marginBottom: '1.25rem', fontSize: '0.88rem', color: 'var(--toy-muted)', fontWeight: 600 }}>
                <strong>Observaciones:</strong> {selectedCompraDetail.observaciones}
              </div>
            )}

            {/* Tabla de Productos Comprados */}
            <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '1rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
              Líneas de la Compra ({selectedCompraDetail.detalles?.length || 0})
            </h4>

            <div style={{ borderRadius: '14px', border: '2px solid var(--toy-border-light)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--toy-cream)', textAlign: 'left' }}>
                    <th style={{ padding: '0.65rem 0.85rem' }}>SKU</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Producto</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Cantidad Comprada</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Costo Unitario</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCompraDetail.detalles?.map((det, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--toy-border-light)' }}>
                      <td style={{ padding: '0.65rem 0.85rem' }}><code>{det.codigo_sku}</code></td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>{det.producto_nombre}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 700 }}>{det.cantidad}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Q{parseFloat(det.costo_unitario).toFixed(2)}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 800, color: 'var(--toy-deep-blue)' }}>
                        Q{parseFloat(det.subtotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Confirmación Recepción */}
      <ConfirmModal
        isOpen={confirmReceiveOpen}
        onClose={() => setConfirmReceiveOpen(false)}
        onConfirm={handleConfirmReceive}
        title="¿Confirmar recepción de mercadería?"
        message={`Esta acción ingresará formalmente ${selectedCompraDetail?.detalles?.length || 0} producto(s) al inventario y cambiará el estado a RECIBIDA. No podrá revertirse una vez procesada.`}
        confirmText="Sí, recibir mercadería"
        variant="primary"
        loading={receiving}
      />

      {/* Modal Confirmación Anulación */}
      <ConfirmModal
        isOpen={confirmAnularOpen}
        onClose={() => setConfirmAnularOpen(false)}
        onConfirm={handleConfirmAnular}
        title="¿Anular esta compra?"
        message={`¿Estás seguro de anular la orden de compra "${selectedCompraDetail?.numero_comprobante}"? Esta acción marcará la compra como ANULADA.`}
        confirmText="Sí, anular compra"
        variant="danger"
        loading={anulando}
      />
    </>
  );
}
