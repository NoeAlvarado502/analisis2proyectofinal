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

export default function ProveedoresPage() {
  const { can } = useAuth();
  const toast = useToast();

  const canManageProveedores = can('proveedores.gestionar');

  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros y paginación
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

  // Modal Crear / Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [prefixTelefono, setPrefixTelefono] = useState('+502');
  const [localTelefono, setLocalTelefono] = useState('');
  const [formData, setFormData] = useState({
    identificacion_fiscal: '',
    razon_social: '',
    contacto_nombre: '',
    email: '',
    direccion: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Modal Confirmación Cambio Estado
  const [confirmToggleOpen, setConfirmToggleOpen] = useState(false);
  const [proveedorToToggle, setProveedorToToggle] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Carga de proveedores desde backend
  const fetchProveedores = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (q.trim()) params.q = q.trim();
      if (filterEstado !== '') params.activo = filterEstado;

      const res = await api.get('/proveedores', { params });
      if (res?.data) {
        setProveedores(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
          setTotalRecords(res.meta.total || 0);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  }, [page, q, filterEstado, toast]);

  useEffect(() => {
    fetchProveedores();
  }, [fetchProveedores]);

  // Abrir modal crear
  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedProveedor(null);
    setFormData({
      identificacion_fiscal: '',
      razon_social: '',
      contacto_nombre: '',
      email: '',
      direccion: ''
    });
    setPrefixTelefono('+502');
    setLocalTelefono('');
    setFormErrors({});
    setModalOpen(true);
  };

  // Abrir modal editar
  const handleOpenEdit = (proveedor) => {
    setModalMode('edit');
    setSelectedProveedor(proveedor);
    const { prefix, number } = parseTelefono(proveedor.telefono);
    setFormData({
      identificacion_fiscal: proveedor.identificacion_fiscal || '',
      razon_social: proveedor.razon_social || '',
      contacto_nombre: proveedor.contacto_nombre || '',
      email: proveedor.email || '',
      direccion: proveedor.direccion || ''
    });
    setPrefixTelefono(prefix);
    setLocalTelefono(number);
    setFormErrors({});
    setModalOpen(true);
  };

  // Validación local del formulario
  const validateForm = () => {
    const errors = {};

    const razonTrimmed = formData.razon_social.trim();
    if (!razonTrimmed) {
      errors.razon_social = 'La razón social o nombre de la empresa es obligatorio';
    } else if (razonTrimmed.length < 2) {
      errors.razon_social = 'La razón social debe tener al menos 2 caracteres';
    } else if (/^\d+$/.test(razonTrimmed)) {
      errors.razon_social = 'La razón social no puede ser únicamente numérica';
    } else if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(razonTrimmed)) {
      errors.razon_social = 'La razón social debe contener al menos una letra';
    }

    const nitTrimmed = formData.identificacion_fiscal.trim();
    if (!nitTrimmed) {
      errors.identificacion_fiscal = 'El NIT es obligatorio';
    } else if (nitTrimmed.length < 3) {
      errors.identificacion_fiscal = 'El NIT debe tener al menos 3 caracteres';
    } else if (nitTrimmed.startsWith('-') || nitTrimmed.endsWith('-')) {
      errors.identificacion_fiscal = 'El guion debe ir únicamente entre números (ej. 1234567-8)';
    } else if (!/^[0-9]+(-[0-9]+)?$/.test(nitTrimmed) && !/^NIT-[\w-]+$/.test(nitTrimmed)) {
      errors.identificacion_fiscal = 'El NIT solo puede contener números y un guion intermedio (ej. 1234567-8)';
    }

    const contactoTrimmed = formData.contacto_nombre.trim();
    if (contactoTrimmed) {
      if (/^\d+$/.test(contactoTrimmed)) {
        errors.contacto_nombre = 'El nombre de contacto no puede ser únicamente numérico';
      } else if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(contactoTrimmed)) {
        errors.contacto_nombre = 'El nombre de contacto debe contener al menos una letra';
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
      errors.email = 'Ingresa un formato de correo válido (ejemplo: proveedor@correo.com)';
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

  // Guardar formulario
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
      const telFinal = localTelefono.trim() ? `${prefixTelefono} ${localTelefono.trim()}` : null;

      const payload = {
        identificacion_fiscal: formData.identificacion_fiscal.trim(),
        razon_social: formData.razon_social.trim(),
        contacto_nombre: formData.contacto_nombre.trim() || null,
        telefono: telFinal,
        email: formData.email.trim() || null,
        direccion: formData.direccion.trim() || null
      };

      if (modalMode === 'create') {
        await api.post('/proveedores', payload);
        toast.success('Proveedor registrado exitosamente');
      } else {
        await api.put(`/proveedores/${selectedProveedor.id_proveedor}`, payload);
        toast.success('Proveedor actualizado exitosamente');
      }

      setModalOpen(false);
      fetchProveedores();
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

  // Abrir confirmación de cambio de estado
  const handleToggleEstado = (proveedor) => {
    setProveedorToToggle(proveedor);
    setConfirmToggleOpen(true);
  };

  // Ejecutar cambio de estado
  const handleConfirmToggleEstado = async () => {
    if (!proveedorToToggle) return;
    const actionName = proveedorToToggle.activo ? 'desactivado' : 'activado';
    setTogglingStatus(true);

    try {
      await api.patch(`/proveedores/${proveedorToToggle.id_proveedor}/estado`, {
        activo: !proveedorToToggle.activo
      });
      toast.success(`Proveedor ${actionName} correctamente`);
      setConfirmToggleOpen(false);
      setProveedorToToggle(null);
      fetchProveedores();
    } catch (err) {
      toast.error(err.message || 'No se pudo cambiar el estado del proveedor');
    } finally {
      setTogglingStatus(false);
    }
  };

  // Columnas de la tabla
  const columns = [
    {
      header: 'Razón Social / Empresa',
      key: 'razon_social',
      render: (row) => (
        <span style={{ fontWeight: 700, color: 'var(--toy-ink)' }}>
          {row.razon_social}
        </span>
      )
    },
    {
      header: 'NIT',
      key: 'identificacion_fiscal',
      render: (row) => (
        <code style={{ fontSize: '0.85rem', fontWeight: 700 }}>
          {row.identificacion_fiscal}
        </code>
      )
    },
    {
      header: 'Contacto',
      key: 'contacto_nombre',
      render: (row) => (
        <span style={{ color: 'var(--toy-ink)', fontWeight: 600 }}>
          {row.contacto_nombre || '-'}
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

  if (canManageProveedores) {
    columns.push({
      header: 'Acciones',
      key: 'acciones',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={() => handleOpenEdit(row)}
            title="Editar proveedor"
            aria-label="Editar proveedor"
          >
            <Pencil size={15} strokeWidth={2.2} />
          </button>
          <ToySwitch
            checked={row.activo}
            onChange={() => handleToggleEstado(row)}
            title={row.activo ? 'Desactivar proveedor' : 'Activar proveedor'}
            ariaLabel={row.activo ? 'Desactivar proveedor' : 'Activar proveedor'}
          />
        </div>
      )
    });
  }

  return (
    <>
      <PageCard
        title="Proveedores"
        actions={
          <>
            <SearchInput
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder=""
              ariaLabel="Buscar proveedores"
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

            <PermissionGate permission="proveedores.gestionar">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreate}
                title="Nuevo proveedor"
                aria-label="Nuevo proveedor"
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
        <DataTable
          columns={columns}
          data={proveedores}
          loading={loading}
          emptyMessage="No se encontraron proveedores registrados"
          pagination={{
            page,
            totalPages,
            totalRecords
          }}
          onPageChange={(newPage) => setPage(newPage)}
          embedded
        />
      </PageCard>

      {/* Modal Crear / Editar Proveedor */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title={modalMode === 'create' ? 'Registrar Nuevo Proveedor' : 'Editar Proveedor'}
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
              {submitting ? 'Guardando...' : (modalMode === 'create' ? 'Crear Proveedor' : 'Guardar Cambios')}
            </button>
          </>
        }
      >
        <form onSubmit={handleFormSubmit}>
          <FormField
            label="Razón Social / Empresa"
            name="razon_social"
            error={formErrors.razon_social}
            required
          >
            <input
              type="text"
              id="razon_social"
              className={`form-control ${formErrors.razon_social ? 'has-error' : ''}`}
              value={formData.razon_social}
              onChange={(e) => {
                setFormData({ ...formData, razon_social: e.target.value });
                if (formErrors.razon_social) {
                  setFormErrors((prev) => ({ ...prev, razon_social: undefined }));
                }
              }}
              placeholder="Ej. Distribuidora Santa Fe S.A."
              required
            />
          </FormField>

          <FormField
            label="NIT"
            name="identificacion_fiscal"
            error={formErrors.identificacion_fiscal}
            required
          >
            <input
              type="text"
              id="identificacion_fiscal"
              className={`form-control ${formErrors.identificacion_fiscal ? 'has-error' : ''}`}
              value={formData.identificacion_fiscal}
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (val.endsWith('-')) {
                  setFormData((prev) => ({ ...prev, identificacion_fiscal: val.slice(0, -1) }));
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
                setFormData((prev) => ({ ...prev, identificacion_fiscal: val }));
                if (formErrors.identificacion_fiscal) {
                  setFormErrors((prev) => ({ ...prev, identificacion_fiscal: undefined }));
                }
              }}
              placeholder="Ej. 1234567-8"
              maxLength={15}
              required
            />
          </FormField>

          <FormField
            label="Nombre de Contacto"
            name="contacto_nombre"
            error={formErrors.contacto_nombre}
          >
            <input
              type="text"
              id="contacto_nombre"
              className={`form-control ${formErrors.contacto_nombre ? 'has-error' : ''}`}
              value={formData.contacto_nombre}
              onChange={(e) => {
                setFormData({ ...formData, contacto_nombre: e.target.value });
                if (formErrors.contacto_nombre) {
                  setFormErrors((prev) => ({ ...prev, contacto_nombre: undefined }));
                }
              }}
              placeholder="Ej. Carlos López"
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
                placeholder="proveedor@correo.com"
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

      {/* Modal Confirmación Activar / Inactivar */}
      <ConfirmModal
        isOpen={confirmToggleOpen}
        onClose={() => setConfirmToggleOpen(false)}
        onConfirm={handleConfirmToggleEstado}
        title={proveedorToToggle?.activo ? '¿Inactivar proveedor?' : '¿Activar proveedor?'}
        message={
          proveedorToToggle?.activo
            ? `Al inactivar a "${proveedorToToggle?.razon_social}", no se podrán registrar nuevas compras a este proveedor.`
            : `El proveedor "${proveedorToToggle?.razon_social}" volverá a estar habilitado para órdenes de compra.`
        }
        confirmText={proveedorToToggle?.activo ? 'Sí, inactivar' : 'Sí, activar'}
        variant={proveedorToToggle?.activo ? 'danger' : 'primary'}
        loading={togglingStatus}
      />
    </>
  );
}
