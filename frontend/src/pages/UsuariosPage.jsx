import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Pencil, KeyRound } from 'lucide-react';
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
import { parseApiErrors, isValidEmail, isValidName, filterOutNumbers } from '../utils/formValidators';

export default function UsuariosPage() {
  const { user: authUser } = useAuth();
  const toast = useToast();

  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
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

  // Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    id_rol: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Reset Password Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetError, setResetError] = useState('');

  // Confirm Toggle Status Modal
  const [confirmToggleOpen, setConfirmToggleOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Fetch Roles
  useEffect(() => {
    async function loadRoles() {
      try {
        const res = await api.get('/roles');
        if (res?.data) {
          setRoles(res.data);
        }
      } catch (err) {
        console.error('Error cargando roles:', err);
      }
    }
    loadRoles();
  }, []);

  // Fetch Usuarios
  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (q.trim()) params.q = q.trim();
      if (filterEstado !== '') params.activo = filterEstado;

      const res = await api.get('/usuarios', { params });
      if (res?.data) {
        setUsuarios(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
          setTotalRecords(res.meta.total || 0);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [page, q, filterEstado, toast]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  // Open Create
  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormData({
      nombre_completo: '',
      email: '',
      password: '',
      id_rol: roles.length > 0 ? roles[0].id_rol : ''
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      nombre_completo: user.nombre_completo,
      email: user.email,
      password: '',
      id_rol: user.id_rol
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // Form Validation
  const validateForm = () => {
    const errors = {};
    const nameTrimmed = (formData.nombre_completo || '').trim();
    if (!nameTrimmed) {
      errors.nombre_completo = 'El nombre completo es obligatorio';
    } else if (/[0-9]/.test(nameTrimmed)) {
      errors.nombre_completo = 'El nombre no puede contener números';
    } else if (!isValidName(nameTrimmed)) {
      errors.nombre_completo = 'El nombre solo debe contener letras y tener al menos 3 caracteres';
    }

    const emailTrimmed = (formData.email || '').trim();
    if (!emailTrimmed) {
      errors.email = 'El correo electrónico es obligatorio';
    } else if (!isValidEmail(emailTrimmed)) {
      errors.email = 'Ingresa un formato de correo válido (ejemplo: usuario@empresa.com)';
    }

    if (modalMode === 'create') {
      const pass = formData.password || '';
      if (!pass) {
        errors.password = 'La contraseña inicial es obligatoria';
      } else if (pass.length < 8) {
        errors.password = 'La contraseña debe tener al menos 8 caracteres';
      } else if (!/[a-zA-Z]/.test(pass)) {
        errors.password = 'La contraseña debe contener al menos una letra';
      } else if (!/[0-9]/.test(pass)) {
        errors.password = 'La contraseña debe contener al menos un número';
      }
    }

    if (!formData.id_rol) {
      errors.id_rol = 'Debes seleccionar un rol de acceso';
    }

    return errors;
  };

  // Handle Form Submit
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
      if (modalMode === 'create') {
        await api.post('/usuarios', {
          nombre_completo: formData.nombre_completo.trim(),
          email: formData.email.trim(),
          password: formData.password,
          id_rol: Number(formData.id_rol)
        });
        toast.success('Usuario registrado exitosamente');
      } else {
        await api.put(`/usuarios/${selectedUser.id_usuario}`, {
          nombre_completo: formData.nombre_completo.trim(),
          email: formData.email.trim(),
          id_rol: Number(formData.id_rol)
        });
        toast.success('Usuario actualizado exitosamente');
      }
      setModalOpen(false);
      fetchUsuarios();
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
  const handleToggleEstado = (user) => {
    setUserToToggle(user);
    setConfirmToggleOpen(true);
  };

  // Execute Toggle Active State via Custom Modal
  const handleConfirmToggleEstado = async () => {
    if (!userToToggle) return;
    const actionName = userToToggle.activo ? 'desactivado' : 'activado';
    setTogglingStatus(true);

    try {
      await api.patch(`/usuarios/${userToToggle.id_usuario}/estado`, {
        activo: !userToToggle.activo
      });
      toast.success(`Usuario ${actionName} correctamente`);
      setConfirmToggleOpen(false);
      setUserToToggle(null);
      fetchUsuarios();
    } catch (err) {
      toast.error(err.message || `No se pudo cambiar el estado del usuario`);
    } finally {
      setTogglingStatus(false);
    }
  };

  // Open Reset Password
  const handleOpenReset = (user) => {
    setSelectedUser(user);
    setResetPasswordValue('');
    setResetError('');
    setResetModalOpen(true);
  };

  // Submit Reset Password
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (resetPasswordValue.length < 8) {
      setResetError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setSubmitting(true);
    setResetError('');
    try {
      await api.patch(`/usuarios/${selectedUser.id_usuario}/password`, {
        new_password: resetPasswordValue
      });
      toast.success(`Contraseña de ${selectedUser.nombre_completo} restablecida correctamente`);
      setResetModalOpen(false);
    } catch (err) {
      setResetError(err.message || 'Error al restablecer contraseña');
    } finally {
      setSubmitting(false);
    }
  };

  // Table Columns
  const columns = [
    {
      header: 'Nombre Completo',
      key: 'nombre_completo',
      render: (row) => (
        <span style={{ fontWeight: 700, color: 'var(--toy-ink)' }}>{row.nombre_completo}</span>
      )
    },
    {
      header: 'Correo Electrónico',
      key: 'email'
    },
    {
      header: 'Rol',
      key: 'rol',
      render: (row) => {
        const badgeClass =
          row.rol === 'Administrador'
            ? 'badge-purple'
            : row.rol === 'Supervisor'
            ? 'badge-primary'
            : 'badge-success';
        return <span className={`badge ${badgeClass}`}>{row.rol}</span>;
      }
    },
    {
      header: 'Estado',
      key: 'activo',
      render: (row) => (
        <span className={`badge ${row.activo ? 'badge-success' : 'badge-danger'}`}>
          {row.activo ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
    {
      header: 'Último Acceso',
      key: 'ultimo_login',
      render: (row) => (
        <span style={{ fontSize: '0.82rem', color: 'var(--toy-muted)', fontWeight: 700 }}>
          {row.ultimo_login ? new Date(row.ultimo_login).toLocaleString('es-GT') : 'Nunca'}
        </span>
      )
    },
    {
      header: 'Acciones',
      key: 'acciones',
      render: (row) => {
        const isSelf = authUser?.id_usuario === row.id_usuario;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              onClick={() => handleOpenEdit(row)}
              title="Editar usuario"
              aria-label="Editar usuario"
            >
              <Pencil size={15} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              onClick={() => handleOpenReset(row)}
              title="Restablecer clave"
              aria-label="Restablecer clave"
            >
              <KeyRound size={15} strokeWidth={2.2} />
            </button>
            <ToySwitch
              checked={row.activo}
              disabled={isSelf && row.activo}
              onChange={() => handleToggleEstado(row)}
              title={isSelf ? 'No puedes desactivar tu propia cuenta' : (row.activo ? 'Desactivar usuario' : 'Activar usuario')}
              ariaLabel={row.activo ? 'Desactivar usuario' : 'Activar usuario'}
            />
          </div>
        );
      }
    }
  ];

  return (
    <>
      {/* Tarjeta Unificada Reutilizable (PageCard) */}
      <PageCard
        title="Usuarios"
        actions={
          <>
            <SearchInput
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              ariaLabel="Buscar usuarios"
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

            <PermissionGate permission="usuarios.gestionar">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreate}
                title="Nuevo usuario"
                aria-label="Nuevo usuario"
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
          data={usuarios}
          loading={loading}
          emptyMessage="No se encontraron usuarios registrados"
          pagination={{
            page,
            totalPages,
            totalRecords
          }}
          onPageChange={(newPage) => setPage(newPage)}
          embedded
        />
      </PageCard>

      {/* Modal Crear / Editar */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'create' ? 'Registrar Nuevo Usuario' : `Editar Usuario #${selectedUser?.id_usuario}`}
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
              {submitting ? 'Guardando...' : (modalMode === 'create' ? 'Crear Usuario' : 'Guardar Cambios')}
            </button>
          </>
        }
      >
        <form onSubmit={handleFormSubmit}>
          <FormField
            label="Nombre Completo"
            name="nombre_completo"
            error={formErrors.nombre_completo}
            required
          >
            <input
              type="text"
              id="nombre_completo"
              className={`form-control ${formErrors.nombre_completo ? 'has-error' : ''}`}
              value={formData.nombre_completo}
              onChange={(e) => {
                const raw = e.target.value;
                if (/[0-9]/.test(raw)) {
                  setFormErrors((prev) => ({
                    ...prev,
                    nombre_completo: 'El nombre no puede contener números'
                  }));
                } else if (formErrors.nombre_completo) {
                  setFormErrors((prev) => ({ ...prev, nombre_completo: undefined }));
                }
                const filtered = filterOutNumbers(raw);
                setFormData({ ...formData, nombre_completo: filtered });
              }}
              placeholder="Ej. Mario Estrada"
              required
            />
          </FormField>

          <FormField
            label="Correo Electrónico"
            name="email"
            error={formErrors.email}
            required
          >
            <input
              type="email"
              id="email"
              className={`form-control ${formErrors.email ? 'has-error' : ''}`}
              value={formData.email}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, email: val });
                if (formErrors.email && isValidEmail(val)) {
                  setFormErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              onBlur={() => {
                const emailTrimmed = formData.email.trim();
                if (emailTrimmed && !isValidEmail(emailTrimmed)) {
                  setFormErrors((prev) => ({
                    ...prev,
                    email: 'Ingresa un formato de correo válido (ejemplo: usuario@empresa.com)'
                  }));
                }
              }}
              placeholder="ejemplo@jugueteria.com"
              required
            />
          </FormField>

          {modalMode === 'create' && (
            <FormField
              label="Contraseña Inicial"
              name="password"
              error={formErrors.password}
              helpText="Mínimo 8 caracteres, al menos una letra y un número"
              required
            >
              <input
                type="password"
                id="password"
                className={`form-control ${formErrors.password ? 'has-error' : ''}`}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </FormField>
          )}

          <FormField
            label="Rol de Acceso"
            name="id_rol"
            error={formErrors.id_rol}
            required
          >
            <select
              id="id_rol"
              className={`form-control ${formErrors.id_rol ? 'has-error' : ''}`}
              value={formData.id_rol}
              onChange={(e) => setFormData({ ...formData, id_rol: e.target.value })}
              disabled={modalMode === 'edit' && selectedUser?.id_usuario === authUser?.id_usuario}
              required
            >
              {roles.map((r) => (
                <option key={r.id_rol} value={r.id_rol}>
                  {r.nombre}
                </option>
              ))}
            </select>
            {modalMode === 'edit' && selectedUser?.id_usuario === authUser?.id_usuario && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                No puedes modificar tu propio rol.
              </span>
            )}
          </FormField>
        </form>
      </Modal>

      {/* Modal Restablecer Contraseña */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={`Restablecer Contraseña: ${selectedUser?.nombre_completo}`}
        footer={
          <>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setResetModalOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleResetSubmit}
              disabled={submitting}
            >
              {submitting ? 'Actualizando...' : 'Restablecer Clave'}
            </button>
          </>
        }
      >
        <form onSubmit={handleResetSubmit}>
          <FormField
            label="Nueva Contraseña"
            name="reset_password"
            error={resetError}
            helpText="Mínimo 8 caracteres, incluyendo al menos una letra y un número"
            required
          >
            <input
              type="password"
              id="reset_password"
              className={`form-control ${resetError ? 'has-error' : ''}`}
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              placeholder="••••••••"
              required
            />
          </FormField>
        </form>
      </Modal>

      {/* Alerta Personalizada para Desactivar / Activar Usuario */}
      <ConfirmModal
        isOpen={confirmToggleOpen}
        onClose={() => {
          if (!togglingStatus) {
            setConfirmToggleOpen(false);
            setUserToToggle(null);
          }
        }}
        onConfirm={handleConfirmToggleEstado}
        title={userToToggle?.activo ? '¿Desactivar usuario?' : '¿Activar usuario?'}
        variant={userToToggle?.activo ? 'danger' : 'primary'}
        confirmText={userToToggle?.activo ? 'Sí, desactivar' : 'Sí, activar'}
        loading={togglingStatus}
        message={
          userToToggle?.activo ? (
            <>
              ¿Estás seguro de que deseas desactivar la cuenta de{' '}
              <strong style={{ color: 'var(--toy-ink)' }}>{userToToggle.nombre_completo}</strong>?
              <div style={{ marginTop: '0.45rem', fontSize: '0.84rem', color: 'var(--toy-muted)' }}>
                El usuario perderá el acceso al sistema inmediatamente hasta que sea reactivado.
              </div>
            </>
          ) : (
            <>
              ¿Estás seguro de que deseas activar la cuenta de{' '}
              <strong style={{ color: 'var(--toy-ink)' }}>{userToToggle?.nombre_completo}</strong>?
              <div style={{ marginTop: '0.45rem', fontSize: '0.84rem', color: 'var(--toy-muted)' }}>
                El usuario podrá volver a ingresar al sistema con sus credenciales habituales.
              </div>
            </>
          )
        }
      />
    </>
  );
}
