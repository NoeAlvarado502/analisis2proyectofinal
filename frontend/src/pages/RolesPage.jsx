import React, { useState, useEffect, useCallback } from 'react';
import { Save, Check, ShieldAlert } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';

export default function RolesPage() {
  const { can } = useAuth();
  const toast = useToast();

  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [allPermissionsByModule, setAllPermissionsByModule] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const canManageRoles = can('roles.gestionar');

  // Load Roles and Permissions Catalogue
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [resRoles, resPermisos] = await Promise.all([
        api.get('/roles'),
        api.get('/permisos')
      ]);

      if (resRoles?.data) {
        setRoles(resRoles.data);
        setSelectedRole((prev) => prev || (resRoles.data.length > 0 ? resRoles.data[0] : null));
      }

      if (resPermisos?.data) {
        const byModule = resPermisos.data.por_modulo || resPermisos.data;
        setAllPermissionsByModule(byModule);
      }
    } catch (err) {
      toast.error(err.message || 'Error cargando datos de roles');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load specific permissions when selectedRole changes
  useEffect(() => {
    if (!selectedRole) return;

    async function loadRoleDetails() {
      try {
        const res = await api.get(`/roles/${selectedRole.id_rol}`);
        if (res?.data && res.data.permisos) {
          const codes = res.data.permisos.map((p) => (typeof p === 'string' ? p : p.codigo));
          setRolePermissions(codes);
          setHasChanges(false);
        }
      } catch (err) {
        toast.error(err.message || 'Error al cargar permisos del rol');
      }
    }

    loadRoleDetails();
  }, [selectedRole, toast]);

  // Toggle single permission checkbox
  const handleTogglePermission = (code) => {
    if (!canManageRoles) return;

    // Protection: Admin cannot lose critical permissions
    if (
      selectedRole?.nombre === 'Administrador' &&
      (code === 'usuarios.gestionar' || code === 'roles.gestionar')
    ) {
      toast.error('El Administrador no puede perder los permisos de gestión básica');
      return;
    }

    setRolePermissions((prev) => {
      const exists = prev.includes(code);
      const updated = exists ? prev.filter((c) => c !== code) : [...prev, code];
      setHasChanges(true);
      return updated;
    });
  };

  // Toggle all permissions for an entire module
  const handleToggleModule = (modulePerms) => {
    if (!canManageRoles || !Array.isArray(modulePerms)) return;

    const moduleCodes = modulePerms.map((p) => (typeof p === 'string' ? p : p.codigo));
    const allChecked = moduleCodes.every((c) => rolePermissions.includes(c));

    setRolePermissions((prev) => {
      let updated;
      if (allChecked) {
        // Deselect all in module, preserving mandatory admin permissions
        updated = prev.filter(
          (c) =>
            !moduleCodes.includes(c) ||
            (selectedRole?.nombre === 'Administrador' &&
              (c === 'usuarios.gestionar' || c === 'roles.gestionar'))
        );
      } else {
        // Select all in module
        const toAdd = moduleCodes.filter((c) => !prev.includes(c));
        updated = [...prev, ...toAdd];
      }
      setHasChanges(true);
      return updated;
    });
  };

  // Save Permissions
  const handleSavePermissions = async () => {
    if (!selectedRole || !canManageRoles) return;

    if (!window.confirm(`¿Confirmas actualizar los permisos para el rol "${selectedRole.nombre}"?`)) {
      return;
    }

    setSaving(true);
    try {
      await api.put(`/roles/${selectedRole.id_rol}/permisos`, {
        permisos: rolePermissions
      });
      toast.success(`Permisos del rol ${selectedRole.nombre} actualizados con éxito`);
      setHasChanges(false);

      // Refresh role list to update badge counts
      const resRoles = await api.get('/roles');
      if (resRoles?.data) {
        setRoles(resRoles.data);
      }
    } catch (err) {
      toast.error(err.message || 'Error al guardar permisos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="card-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem' }}>Roles y Matriz de Privilegios</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Control de acceso granular basado en roles (RBAC). Define qué acciones puede realizar cada perfil.
          </p>
        </div>

        {canManageRoles && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSavePermissions}
            disabled={saving || !hasChanges}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {saving ? (
              'Guardando...'
            ) : hasChanges ? (
              <>
                <Save size={16} /> Guardar Permisos
              </>
            ) : (
              <>
                <Check size={16} /> Sin Cambios Pendientes
              </>
            )}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: Role Selector List */}
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '1rem' }}>
            Roles Definidos
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {roles.map((r) => {
              const isSelected = selectedRole?.id_rol === r.id_rol;
              return (
                <div
                  key={r.id_rol}
                  onClick={() => {
                    if (hasChanges) {
                      if (!window.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos y cambiar de rol?')) {
                        return;
                      }
                    }
                    setSelectedRole(r);
                  }}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSelected ? 'var(--bg-surface-hover)' : 'var(--bg-surface-elevated)',
                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    transition: 'all 150ms ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: isSelected ? '#ffffff' : 'var(--text-main)', fontSize: '0.95rem' }}>
                      {r.nombre}
                    </strong>
                    <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                      {r.total_permisos ?? 0}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {r.descripcion || 'Sin descripción'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Permission Matrix by Module */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                Matriz de Permisos: <span style={{ color: 'var(--primary)' }}>{selectedRole?.nombre}</span>
              </h2>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                {canManageRoles
                  ? 'Marca o desmarca casillas para modificar los privilegios del rol.'
                  : 'Modo solo lectura (no tienes permiso roles.gestionar).'}
              </p>
            </div>

            <span className="badge badge-info">
              {rolePermissions.length} permisos activos
            </span>
          </div>

          {loading ? (
            <div className="empty-state">Cargando matriz de permisos...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {Object.entries(allPermissionsByModule).map(([modulo, perms]) => {
                if (!Array.isArray(perms)) return null;
                const moduleCodes = perms.map((p) => (typeof p === 'string' ? p : p.codigo));
                const allChecked = moduleCodes.every((c) => rolePermissions.includes(c));
                const someChecked = moduleCodes.some((c) => rolePermissions.includes(c));

                return (
                  <div
                    key={modulo}
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Module Title Header */}
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: 'var(--bg-surface)',
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <strong style={{ textTransform: 'capitalize', color: 'var(--accent-cyan)' }}>
                        Módulo: {modulo}
                      </strong>

                      {canManageRoles && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleToggleModule(perms)}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {allChecked ? 'Desmarcar todos' : 'Marcar todos'}
                        </button>
                      )}
                    </div>

                    {/* Permissions list in module */}
                    <div
                      style={{
                        padding: '1rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '0.75rem'
                      }}
                    >
                      {perms.map((p) => {
                        const isChecked = rolePermissions.includes(p.codigo);
                        const isProtectedAdmin =
                          selectedRole?.nombre === 'Administrador' &&
                          (p.codigo === 'usuarios.gestionar' || p.codigo === 'roles.gestionar');

                        return (
                          <label
                            key={p.codigo}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.6rem',
                              padding: '0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: isChecked ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                              border: `1px solid ${isChecked ? 'rgba(99, 102, 241, 0.25)' : 'transparent'}`,
                              cursor: canManageRoles && !isProtectedAdmin ? 'pointer' : 'default',
                              opacity: isProtectedAdmin ? 0.8 : 1
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(p.codigo)}
                              disabled={!canManageRoles || isProtectedAdmin}
                              style={{ marginTop: '0.2rem', accentColor: 'var(--primary)' }}
                            />
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.codigo}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {p.descripcion}
                              </div>
                              {isProtectedAdmin && (
                                <div style={{ fontSize: '0.65rem', color: 'var(--warning-text)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <ShieldAlert size={12} /> Privilegio protegido del Administrador
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
