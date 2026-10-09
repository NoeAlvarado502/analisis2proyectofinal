import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Pencil, KeyRound, UserX, UserCheck } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import PermissionGate from '../components/PermissionGate';

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

  // Handle Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
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

  // Toggle Active State
  const handleToggleEstado = async (user) => {
    const actionName = user.activo ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Seguro que deseas ${actionName} al usuario ${user.nombre_completo}?`)) {
      return;
    }

    try {
      await api.patch(`/usuarios/${user.id_usuario}/estado`);
      toast.success(`Usuario ${user.activo ? 'desactivado' : 'activado'} correctamente`);
      fetchUsuarios();
    } catch (err) {
      toast.error(err.message || `No se pudo ${actionName} el usuario`);
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
        password: resetPasswordValue
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
        <div>
          <div style={{ fontWeight: 600 }}>{row.nombre_completo}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>ID: {row.id_usuario}</div>
        </div>
      )
    },
    {
      header: 'Correo Electrónico',
      key: 'email'
    },
    {
      header: 'Rol Asignado',
      key: 'rol',
      render: (row) => {
        const badgeClass =
          row.rol === 'Administrador'
            ? 'badge-primary'
            : row.rol === 'Supervisor'
            ? 'badge-info'
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
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleOpenEdit(row)}
              title="Editar usuario"
            >
              <Pencil size={13} strokeWidth={2.2} />
              <span>Editar</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleOpenReset(row)}
              title="Restablecer clave"
            >
              <KeyRound size={13} strokeWidth={2.2} />
              <span>Clave</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${row.activo ? 'btn-danger' : 'btn-secondary'}`}
              disabled={isSelf && row.activo}
              onClick={() => handleToggleEstado(row)}
              title={isSelf ? 'No puedes desactivar tu propia cuenta' : (row.activo ? 'Desactivar' : 'Activar')}
            >
              {row.activo ? (
                <>
                  <UserX size={13} strokeWidth={2.2} />
                  <span>Desactivar</span>
                </>
              ) : (
                <>
                  <UserCheck size={13} strokeWidth={2.2} />
                  <span>Activar</span>
                </>
              )}
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div>
      {/* Header */}
      <div className="card-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem' }}>Gestión de Personal y Cuentas</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Control de usuarios del sistema, asignación de roles y estados operativos.
          </p>
        </div>

        <PermissionGate permission="usuarios.gestionar">
          <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
            <UserPlus size={16} strokeWidth={2.2} />
            <span>Nuevo Usuario</span>
          </button>
        </PermissionGate>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por nombre o correo..."
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

      {/* Table */}
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
      />

      {/* Modal Crear / Editar */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'create' ? 'Registrar Nuevo Usuario' : `Editar Usuario #${selectedUser?.id_usuario}`}
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
              onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="ejemplo@jugueteria.local"
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
              className="btn btn-secondary"
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
    </div>
  );
}
