import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Pencil, UserX, UserCheck } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import PermissionGate from '../components/PermissionGate';

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

  // Submit Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
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
      if (err.details && typeof err.details === 'object') {
        const fieldErrors = {};
        Object.entries(err.details).forEach(([key, val]) => {
          fieldErrors[key] = Array.isArray(val) ? val.join(', ') : val;
        });
        setFormErrors(fieldErrors);
      } else {
        toast.error(err.message || 'Error al procesar la solicitud');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Estado
  const handleToggleEstado = async (cliente) => {
    const actionName = cliente.activo ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Seguro que deseas ${actionName} a ${cliente.nombre_razon_social}?`)) {
      return;
    }

    try {
      await api.patch(`/clientes/${cliente.id_cliente}/estado`);
      toast.success(`Cliente ${cliente.activo ? 'desactivado' : 'activado'} correctamente`);
      fetchClientes();
    } catch (err) {
      toast.error(err.message || `No se pudo ${actionName} el cliente`);
    }
  };

  // Table Columns
  const columns = [
    {
      header: 'Cliente / Razón Social',
      key: 'nombre_razon_social',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.nombre_razon_social}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            ID: {row.id_cliente}
          </div>
        </div>
      )
    },
    {
      header: 'NIT / Identificación',
      key: 'identificacion',
      render: (row) =>
        row.identificacion ? (
          <code>{row.identificacion}</code>
        ) : (
          <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Consumidor Final</span>
        )
    },
    {
      header: 'Teléfono',
      key: 'telefono',
      render: (row) => row.telefono || '-'
    },
    {
      header: 'Correo',
      key: 'email',
      render: (row) => row.email || '-'
    },
    {
      header: 'Dirección',
      key: 'direccion',
      render: (row) => row.direccion || '-'
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
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenEdit(row)}
            title="Editar cliente"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Pencil size={13} /> Editar
          </button>
          <button
            type="button"
            className={`btn btn-sm ${row.activo ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => handleToggleEstado(row)}
            title={row.activo ? 'Desactivar cliente' : 'Activar cliente'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            {row.activo ? (
              <>
                <UserX size={13} /> Desactivar
              </>
            ) : (
              <>
                <UserCheck size={13} /> Activar
              </>
            )}
          </button>
        </div>
      )
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="card-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem' }}>Directorio de Clientes</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Registro fiscal de clientes mayoristas y minoristas, compatible con ventas al Consumidor Final.
          </p>
        </div>

        <PermissionGate permission="clientes.gestionar">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreate}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <UserPlus size={16} /> Nuevo Cliente
          </button>
        </PermissionGate>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por nombre, NIT, teléfono o correo..."
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

      {/* Data Table */}
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
      />

      {/* Modal Crear / Editar Cliente */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'create' ? 'Registrar Nuevo Cliente' : `Editar Cliente #${selectedCliente?.id_cliente}`}
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
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
    </div>
  );
}
