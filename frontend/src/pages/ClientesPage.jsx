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

const COUNTRY_DIAL_CODES = [
  { code: '+502', country: 'Guatemala', flag: '🇬🇹', length: 8, placeholder: '4123 4567' },
  { code: '+503', country: 'El Salvador', flag: '🇸🇻', length: 8, placeholder: '7123 4567' },
  { code: '+504', country: 'Honduras', flag: '🇭🇳', length: 8, placeholder: '9123 4567' },
  { code: '+505', country: 'Nicaragua', flag: '🇳🇮', length: 8, placeholder: '8123 4567' },
  { code: '+506', country: 'Costa Rica', flag: '🇨🇷', length: 8, placeholder: '8123 4567' },
  { code: '+52', country: 'México', flag: '🇲🇽', length: 10, placeholder: '55 1234 5678' },
  { code: '+1', country: 'EE. UU.', flag: '🇺🇸', length: 10, placeholder: '202 555 0123' }
];

function parseTelefono(telefonoStr) {
  if (!telefonoStr || typeof telefonoStr !== 'string') {
    return { prefix: '+502', number: '' };
  }
  const trimmed = telefonoStr.trim();
  const matched = [...COUNTRY_DIAL_CODES]
    .sort((a, b) => b.code.length - a.code.length)
    .find((c) => trimmed.startsWith(c.code));

  if (matched) {
    const rawNumber = trimmed.substring(matched.code.length).replace(/\D/g, '');
    return { prefix: matched.code, number: rawNumber.slice(0, matched.length) };
  }

  const rawNumber = trimmed.replace(/\D/g, '');
  return { prefix: '+502', number: rawNumber.slice(0, 8) };
}

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
    { value: '', label: 'Todos los estados', shortLabel: 'Estados', color: 'var(--toy-muted)' },
    { value: '1', label: 'Solo Activos', shortLabel: 'Activos', color: 'var(--toy-blue)' },
    { value: '0', label: 'Solo Inactivos', shortLabel: 'Inactivos', color: 'var(--toy-red)' }
  ];

  // Modal Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [prefixTelefono, setPrefixTelefono] = useState('+502');
  const [localTelefono, setLocalTelefono] = useState('');
  const [formData, setFormData] = useState({
    nombre_razon_social: '',
    identificacion: 'C/F',
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
      identificacion: 'C/F',
      email: '',
      direccion: ''
    });
    setPrefixTelefono('+502');
    setLocalTelefono('');
    setFormErrors({});
    setModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (cliente) => {
    setModalMode('edit');
    setSelectedCliente(cliente);
    const { prefix, number } = parseTelefono(cliente.telefono);
    setFormData({
      nombre_razon_social: cliente.nombre_razon_social || '',
      identificacion: cliente.identificacion || 'C/F',
      email: cliente.email || '',
      direccion: cliente.direccion || ''
    });
    setPrefixTelefono(prefix);
    setLocalTelefono(number);
    setFormErrors({});
    setModalOpen(true);
  };

  // Form Validation
  const validateForm = () => {
    const errors = {};
    const nombreTrimmed = formData.nombre_razon_social.trim();
    if (!nombreTrimmed) {
      errors.nombre_razon_social = 'El nombre o razón social es obligatorio';
    } else if (nombreTrimmed.length < 2) {
      errors.nombre_razon_social = 'El nombre o razón social debe tener al menos 2 caracteres';
    } else if (/^\d+$/.test(nombreTrimmed)) {
      errors.nombre_razon_social = 'El nombre o razón social no puede ser únicamente numérico';
    } else if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(nombreTrimmed)) {
      errors.nombre_razon_social = 'El nombre o razón social debe contener al menos una letra';
    }

    const nitTrimmed = formData.identificacion.trim().toUpperCase();
    if (nitTrimmed && nitTrimmed !== 'C/F' && nitTrimmed !== 'CF') {
      if (nitTrimmed.startsWith('-') || nitTrimmed.endsWith('-')) {
        errors.identificacion = 'El guion debe ir únicamente entre números (ej. 1234567-8)';
      } else if (!/^[0-9]+(-[0-9]+)?$/.test(nitTrimmed)) {
        errors.identificacion = 'El NIT solo puede contener números y un guion intermedio (ej. 1234567-8)';
      }
    }

    const numTrimmed = localTelefono.trim();
    if (numTrimmed) {
      const currentCountry =
        COUNTRY_DIAL_CODES.find((c) => c.code === prefixTelefono) || COUNTRY_DIAL_CODES[0];
      if (numTrimmed.length !== currentCountry.length) {
        errors.telefono = `El teléfono para ${currentCountry.country} (${currentCountry.code}) debe tener exactamente ${currentCountry.length} dígitos`;
      }
    }

    const emailTrimmed = formData.email.trim();
    if (emailTrimmed && !isValidEmail(emailTrimmed)) {
      errors.email = 'Ingresa un formato de correo válido (ejemplo: cliente@correo.com)';
    }

    const dirTrimmed = formData.direccion.trim();
    if (dirTrimmed) {
      if (/^\d+$/.test(dirTrimmed)) {
        errors.direccion = 'La dirección de facturación no puede ser únicamente numérica';
      } else if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(dirTrimmed)) {
        errors.direccion = 'La dirección de facturación debe contener al menos una letra descriptiva';
      }
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
      const nitTrimmed = formData.identificacion.trim().toUpperCase();
      const nitFinal =
        !nitTrimmed || nitTrimmed === 'C/F' || nitTrimmed === 'CF' ? null : nitTrimmed;
      const telFinal = localTelefono.trim() ? `${prefixTelefono} ${localTelefono.trim()}` : null;

      const payload = {
        nombre_razon_social: formData.nombre_razon_social.trim(),
        identificacion: nitFinal,
        telefono: telFinal,
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
      await api.patch(`/clientes/${clienteToToggle.id_cliente}/estado`, {
        activo: !clienteToToggle.activo
      });
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
      header: 'NIT',
      key: 'identificacion',
      render: (row) =>
        row.identificacion && row.identificacion.toUpperCase() !== 'C/F' ? (
          <code style={{ fontSize: '0.85rem', fontWeight: 700 }}>{row.identificacion}</code>
        ) : (
          <span className="badge badge-neutral" style={{ fontWeight: 700, fontSize: '0.78rem' }}>
            C/F
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
      header: 'Dirección de Facturación',
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
        title={modalMode === 'create' ? 'Registrar Cliente' : `Editar Cliente`}
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
              {submitting ? 'Guardando...' : (modalMode === 'create' ? 'Registrar Cliente' : 'Guardar Cambios')}
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
              onChange={(e) => {
                setFormData({ ...formData, nombre_razon_social: e.target.value });
                if (formErrors.nombre_razon_social) {
                  setFormErrors((prev) => ({ ...prev, nombre_razon_social: undefined }));
                }
              }}
              placeholder="Ej. Distribuidora Santa Fe o Carlos Pérez"
              required
            />
          </FormField>

          <FormField
            label="NIT"
            name="identificacion"
            error={formErrors.identificacion}
          >
            <input
              type="text"
              id="identificacion"
              className={`form-control ${formErrors.identificacion ? 'has-error' : ''}`}
              value={formData.identificacion}
              onFocus={() => {
                const current = formData.identificacion.trim().toUpperCase();
                if (current === 'C/F' || current === 'CF') {
                  setFormData((prev) => ({ ...prev, identificacion: '' }));
                }
              }}
              onClick={() => {
                const current = formData.identificacion.trim().toUpperCase();
                if (current === 'C/F' || current === 'CF') {
                  setFormData((prev) => ({ ...prev, identificacion: '' }));
                }
              }}
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (!val) {
                  setFormData((prev) => ({ ...prev, identificacion: 'C/F' }));
                  if (formErrors.identificacion) {
                    setFormErrors((prev) => ({ ...prev, identificacion: undefined }));
                  }
                } else if (val.endsWith('-')) {
                  setFormData((prev) => ({ ...prev, identificacion: val.slice(0, -1) }));
                }
              }}
              onChange={(e) => {
                let val = e.target.value;
                // Permitir estrictamente solo dígitos y guión (bloquea letras y otros símbolos)
                val = val.replace(/[^0-9-]/g, '');
                // El guión solo puede ir entre números: no puede ser el primer caracter
                val = val.replace(/^-+/, '');
                // Solo un guión permitido en total
                const parts = val.split('-');
                if (parts.length > 2) {
                  val = parts[0] + '-' + parts.slice(1).join('').replace(/-/g, '');
                }
                setFormData((prev) => ({ ...prev, identificacion: val }));
                if (formErrors.identificacion) {
                  setFormErrors((prev) => ({ ...prev, identificacion: undefined }));
                }
              }}
              placeholder="C/F o Ej. 1234567-8"
              maxLength={15}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '1rem' }}>
            <FormField label="Teléfono" name="telefono" error={formErrors.telefono}>
              <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                <select
                  className="form-control"
                  style={{
                    width: '135px',
                    flexShrink: 0,
                    padding: '0.65rem 0.5rem',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                  value={prefixTelefono}
                  onChange={(e) => {
                    const newPrefix = e.target.value;
                    setPrefixTelefono(newPrefix);
                    const selected = COUNTRY_DIAL_CODES.find((c) => c.code === newPrefix);
                    if (selected && localTelefono.length > selected.length) {
                      setLocalTelefono(localTelefono.slice(0, selected.length));
                    }
                    if (formErrors.telefono) {
                      setFormErrors((prev) => ({ ...prev, telefono: undefined }));
                    }
                  }}
                  aria-label="Prefijo de país"
                >
                  {COUNTRY_DIAL_CODES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.flag} {item.code} ({item.country.substring(0, 2).toUpperCase()})
                    </option>
                  ))}
                </select>

                <input
                  type="tel"
                  id="telefono"
                  className={`form-control ${formErrors.telefono ? 'has-error' : ''}`}
                  value={localTelefono}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '');
                    const currentCountry =
                      COUNTRY_DIAL_CODES.find((c) => c.code === prefixTelefono) || COUNTRY_DIAL_CODES[0];
                    setLocalTelefono(digitsOnly.slice(0, currentCountry.length));
                    if (formErrors.telefono) {
                      setFormErrors((prev) => ({ ...prev, telefono: undefined }));
                    }
                  }}
                  placeholder={
                    (COUNTRY_DIAL_CODES.find((c) => c.code === prefixTelefono) || COUNTRY_DIAL_CODES[0]).placeholder
                  }
                  maxLength={
                    (COUNTRY_DIAL_CODES.find((c) => c.code === prefixTelefono) || COUNTRY_DIAL_CODES[0]).length
                  }
                  inputMode="numeric"
                />
              </div>
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

          <FormField label="Dirección de Facturación" name="direccion" error={formErrors.direccion}>
            <textarea
              id="direccion"
              className={`form-control ${formErrors.direccion ? 'has-error' : ''}`}
              rows={2}
              value={formData.direccion}
              onChange={(e) => {
                setFormData({ ...formData, direccion: e.target.value });
                if (formErrors.direccion) {
                  setFormErrors((prev) => ({ ...prev, direccion: undefined }));
                }
              }}
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
