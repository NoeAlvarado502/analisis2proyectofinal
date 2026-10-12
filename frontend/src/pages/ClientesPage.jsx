import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Pencil } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import FormField from '../components/FormField';
import PermissionGate from '../components/PermissionGate';
import SearchInput from '../components/SearchInput';
import FilterDropdown from '../components/FilterDropdown';
import ToySwitch from '../components/ToySwitch';
import PageCard from '../components/PageCard';
import { parseApiErrors, isValidEmail } from '../utils/formValidators';

export default function ClientesPage() {
  const { can } = useAuth();
  const toast = useToast();

  const canManageClientes = can('clientes.gestionar');

  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Pagination
  const [q, setQ] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const estadoOptions = [
    { value: '', label: 'Todos los estados', shortLabel: 'Todos', color: 'var(--toy-muted)' },
    { value: '1', label: 'Solo Activos', shortLabel: 'Activos', color: 'var(--toy-blue)' },
    { value: '0', label: 'Solo Inactivos', shortLabel: 'Inactivos', color: 'var(--toy-red)' }
  ];

  // Modal Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [formData, setFormData] = useState({
    nombre_razon_social: '',
    identificacion: '',
    telefono: '',
    email: '',
    direccion: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Confirm Modal for Toggle Status
  const [confirmToggleOpen, setConfirmToggleOpen] = useState(false);
  const [clienteToToggle, setClienteToToggle] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Fetch Clientes
  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (q.trim()) params.q = q.trim();
      if (filterEstado !== '') params.activo = filterEstado;

      const res = await api.get('/clientes', { params });
      if (res?.data) {
        setClientes(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
          setTotalRecords(res.meta.total || 0);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [page, q, filterEstado, toast]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  // Open Create
  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedCliente(null);
    setFormData({
      nombre_razon_social: '',
      identificacion: '',
      telefono: '',
      email: '',
      direccion: ''
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (cliente) => {
    setModalMode('edit');
    setSelectedCliente(cliente);
    setFormData({
      nombre_razon_social: cliente.nombre_razon_social || '',
      identificacion: cliente.identificacion || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || ''
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.nombre_razon_social.trim()) {
      errors.nombre_razon_social = 'El nombre o razón social es obligatorio';
    }

    const emailTrimmed = formData.email.trim();
    if (emailTrimmed && !isValidEmail(emailTrimmed)) {
      errors.email = 'Ingresa un formato de correo válido (ejemplo: cliente@correo.com)';
    }

    return errors;
  };

  // Submit Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Corrige los errores señalados en el formulario');
      return;
    }

    setFormErrors({});
    setSubmitting(true);

    try {
      const payload = {
        nombre_razon_social: formData.nombre_razon_social.trim(),
        identificacion: formData.identificacion.trim() || null,
        telefono: formData.telefono.trim() || null,
        email: formData.email.trim() || null,
        direccion: formData.direccion.trim() || null
      };

      if (modalMode === 'create') {
        await api.post('/clientes', payload);
        toast.success('Cliente registrado exitosamente');
      } else {
        await api.put(`/clientes/${selectedCliente.id_cliente}`, payload);
        toast.success('Cliente actualizado exitosamente');
      }

      setModalOpen(false);
      fetchClientes();
    } catch (err) {
      if (err.details) {
        setFormErrors(parseApiErrors(err));
        toast.error('Corrige los errores señalados en el formulario');
      } else {
        toast.error(err.message || 'Error al procesar la solicitud');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Open Confirm Dialog for Active State
  const handleToggleEstado = (cliente) => {
    setClienteToToggle(cliente);
    setConfirmToggleOpen(true);
  };

  // Execute Toggle Active State
  const handleConfirmToggleEstado = async () => {
    if (!clienteToToggle) return;
    const actionName = clienteToToggle.activo ? 'desactivado' : 'activado';
    setTogglingStatus(true);

    try {
      await api.patch(`/clientes/${clienteToToggle.id_cliente}/estado`);
      toast.success(`Cliente ${actionName} correctamente`);
      setConfirmToggleOpen(false);
      setClienteToToggle(null);
      fetchClientes();
    } catch (err) {
      toast.error(err.message || `No se pudo cambiar el estado del cliente`);
    } finally {
      setTogglingStatus(false);
    }
  };

  // Table Columns
  const columns = [
    {
      header: 'Cliente / Razón Social',
      key: 'nombre_razon_social',
      render: (row) => (
        <span style={{ fontWeight: 700, color: 'var(--toy-ink)' }}>
          {row.nombre_razon_social}
        </span>
      )
    },
    {
      header: 'NIT / Identificación',
      key: 'identificacion',
      render: (row) =>
        row.identificacion ? (
          <code>{row.identificacion}</code>
        ) : (
          <span style={{ color: 'var(--toy-muted)', fontStyle: 'italic', fontSize: '0.82rem', fontWeight: 600 }}>
            Consumidor Final
          </span>
        )
    },
    {
      header: 'Teléfono',
      key: 'telefono',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--toy-ink)' }}>
          {row.telefono || '-'}
        </span>
      )
    },
    {
      header: 'Correo',
      key: 'email',
      render: (row) => row.email || '-'
    },
    {
      header: 'Dirección',
      key: 'direccion',
      render: (row) => (
        <span style={{ fontSize: '0.82rem', color: 'var(--toy-muted)', fontWeight: 600 }}>
          {row.direccion || '-'}
        </span>
      )
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

  if (canManageClientes) {
    columns.push({
      header: 'Acciones',
      key: 'acciones',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={() => handleOpenEdit(row)}
            title="Editar cliente"
            aria-label="Editar cliente"
          >
            <Pencil size={15} strokeWidth={2.2} />
          </button>
          <ToySwitch
            checked={row.activo}
            onChange={() => handleToggleEstado(row)}
            title={row.activo ? 'Desactivar cliente' : 'Activar cliente'}
            ariaLabel={row.activo ? 'Desactivar cliente' : 'Activar cliente'}
          />
        </div>
      )
    });
  }

  return (
    <>
      {/* Tarjeta Unificada Reutilizable (PageCard) */}
      <PageCard
        title="Clientes"
        actions={
          <>
            <SearchInput
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder=""
              ariaLabel="Buscar clientes"
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

            <PermissionGate permission="clientes.gestionar">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreate}
                title="Nuevo cliente"
                aria-label="Nuevo cliente"
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
                <UserPlus size={20} strokeWidth={2.4} />
              </button>
            </PermissionGate>
          </>
        }
      >
        {/* Tabla Embebida */}
        <DataTable
          columns={columns}
          data={clientes}
          loading={loading}
          emptyMessage="No se encontraron clientes registrados"
          pagination={{
            page,
            totalPages,
            totalRecords
          }}
          onPageChange={(newPage) => setPage(newPage)}
          embedded
        />
      </PageCard>

      {/* Modal Crear / Editar Cliente */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'create' ? 'Registrar Nuevo Cliente' : `Editar Cliente`}
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
              {submitting ? 'Guardando...' : (modalMode === 'create' ? 'Crear Cliente' : 'Guardar Cambios')}
            </button>
          </>
        }
      >
        <form onSubmit={handleFormSubmit}>
          <FormField
            label="Nombre o Razón Social"
            name="nombre_razon_social"
            error={formErrors.nombre_razon_social}
            required
          >
            <input
              type="text"
              id="nombre_razon_social"
              className={`form-control ${formErrors.nombre_razon_social ? 'has-error' : ''}`}
              value={formData.nombre_razon_social}
              onChange={(e) => setFormData({ ...formData, nombre_razon_social: e.target.value })}
              placeholder="Ej. Distribuidora Santa Fe o Carlos Pérez"
              required
            />
          </FormField>

          <FormField
            label="NIT / Documento de Identificación"
            name="identificacion"
            error={formErrors.identificacion}
            helpText="Opcional. Deja en blanco para ventas al Consumidor Final sin NIT."
          >
            <input
              type="text"
              id="identificacion"
              className={`form-control ${formErrors.identificacion ? 'has-error' : ''}`}
              value={formData.identificacion}
              onChange={(e) => setFormData({ ...formData, identificacion: e.target.value })}
              placeholder="Ej. 1234567-8"
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label="Teléfono" name="telefono" error={formErrors.telefono}>
              <input
                type="text"
                id="telefono"
                className={`form-control ${formErrors.telefono ? 'has-error' : ''}`}
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="Ej. +502 5555-1234"
              />
            </FormField>

            <FormField label="Correo Electrónico" name="email" error={formErrors.email}>
              <input
                type="email"
                id="email"
                className={`form-control ${formErrors.email ? 'has-error' : ''}`}
                value={formData.email}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, email: val });
                  if (formErrors.email && isValidEmail(val.trim())) {
                    setFormErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                placeholder="cliente@correo.com"
              />
            </FormField>
          </div>

          <FormField label="Dirección de Facturación / Entrega" name="direccion" error={formErrors.direccion}>
            <textarea
              id="direccion"
              className={`form-control ${formErrors.direccion ? 'has-error' : ''}`}
              rows={2}
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              placeholder="Zona 10, Ciudad de Guatemala..."
            />
          </FormField>
        </form>
      </Modal>

      {/* Alerta Personalizada para Desactivar / Activar Cliente */}
      <ConfirmModal
        isOpen={confirmToggleOpen}
        onClose={() => {
          if (!togglingStatus) {
            setConfirmToggleOpen(false);
            setClienteToToggle(null);
          }
        }}
        onConfirm={handleConfirmToggleEstado}
        title={clienteToToggle?.activo ? '¿Desactivar cliente?' : '¿Activar cliente?'}
        variant={clienteToToggle?.activo ? 'danger' : 'primary'}
        confirmText={clienteToToggle?.activo ? 'Sí, desactivar' : 'Sí, activar'}
        loading={togglingStatus}
        message={
          clienteToToggle?.activo ? (
            <>
              ¿Estás seguro de que deseas desactivar al cliente{' '}
              <strong style={{ color: 'var(--toy-ink)' }}>{clienteToToggle.nombre_razon_social}</strong>?
              <div style={{ marginTop: '0.45rem', fontSize: '0.84rem', color: 'var(--toy-muted)' }}>
                No aparecerá en la búsqueda rápida de ventas hasta que sea reactivado.
              </div>
            </>
          ) : (
            <>
              ¿Estás seguro de que deseas reactivar al cliente{' '}
              <strong style={{ color: 'var(--toy-ink)' }}>{clienteToToggle?.nombre_razon_social}</strong>?
              <div style={{ marginTop: '0.45rem', fontSize: '0.84rem', color: 'var(--toy-muted)' }}>
                El cliente volverá a estar disponible para facturación y ventas inmediatamente.
              </div>
            </>
          )
        }
      />
    </>
  );
}
