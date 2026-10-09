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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.25rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '999px', backgroundColor: 'var(--toy-purple)', display: 'inline-block' }} />
            <h1 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
              Roles y Permisos del Sistema
            </h1>
          </div>
          <p style={{ color: 'var(--toy-muted)', fontSize: '0.84rem', fontWeight: 600 }}>
            Administración de perfiles operativos. Configura las acciones permitidas para cada tipo de cuenta en la juguetería.
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
                <Save size={16} strokeWidth={2.4} /> Guardar Permisos
              </>
            ) : (
              <>
                <Check size={16} strokeWidth={2.4} /> Sin Cambios Pendientes
              </>
            )}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: Role Selector List */}
        <div className="card" style={{ padding: '1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '999px', backgroundColor: 'var(--toy-blue)', display: 'inline-block' }} />
            <h3 className="font-display" style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--toy-muted)', letterSpacing: '0.06em' }}>
              Perfiles Definidos
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
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
                    borderRadius: '16px',
                    backgroundColor: isSelected ? 'var(--toy-blue)' : 'rgba(255, 244, 221, 0.45)',
                    border: isSelected ? '2px solid var(--toy-deep-blue)' : '2px solid var(--toy-border)',
                    boxShadow: isSelected ? '0 3px 0 var(--toy-deep-blue)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                    transform: isSelected ? 'translateY(-2px)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong className="font-display" style={{ color: isSelected ? '#FFFFFF' : 'var(--toy-ink)', fontSize: '0.92rem', fontWeight: 700 }}>
                      {r.nombre}
                    </strong>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.28)' : 'rgba(25, 168, 232, 0.12)',
                        color: isSelected ? '#FFFFFF' : 'var(--toy-deep-blue)',
                        border: isSelected ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(25, 168, 232, 0.25)'
                      }}
                    >
                      {r.total_permisos ?? 0}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: isSelected ? 'rgba(255, 255, 255, 0.92)' : 'var(--toy-muted)', marginTop: '0.3rem', fontWeight: 600, lineHeight: 1.35 }}>
                    {r.descripcion || 'Sin descripción'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Permission Matrix by Module */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '1.15rem' }}>
                Permisos del perfil: <span style={{ color: 'var(--toy-blue)' }}>{selectedRole?.nombre}</span>
              </h2>
              <p style={{ color: 'var(--toy-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
                {canManageRoles
                  ? 'Marca o desmarca casillas para habilitar o restringir funciones en este perfil.'
                  : 'Modo solo lectura (sin permisos de edición).'}
              </p>
            </div>

            <span className="badge badge-purple" style={{ fontSize: '0.72rem', padding: '0.35rem 0.8rem' }}>
              {rolePermissions.length} permisos activos
            </span>
          </div>

          {loading ? (
            <div className="empty-state">Cargando permisos del rol...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
              {Object.entries(allPermissionsByModule).map(([modulo, perms]) => {
                if (!Array.isArray(perms)) return null;
                const moduleCodes = perms.map((p) => (typeof p === 'string' ? p : p.codigo));
                const allChecked = moduleCodes.every((c) => rolePermissions.includes(c));

                return (
                  <div
                    key={modulo}
                    style={{
                      border: '2px solid var(--toy-border)',
                      borderRadius: '20px',
                      backgroundColor: '#FFFFFF',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Module Title Header */}
                    <div
                      style={{
                        padding: '0.75rem 1.15rem',
                        backgroundColor: '#FAF5EB',
                        borderBottom: '2px solid var(--toy-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <strong className="font-display" style={{ textTransform: 'capitalize', color: 'var(--toy-deep-blue)', fontSize: '0.88rem', fontWeight: 700 }}>
                        Módulo: {modulo}
                      </strong>

                      {canManageRoles && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleToggleModule(perms)}
                          style={{ fontSize: '0.72rem', fontWeight: 800, height: '28px', padding: '0.2rem 0.65rem' }}
                        >
                          {allChecked ? 'Desmarcar todos' : 'Marcar todos'}
                        </button>
                      )}
                    </div>

                    {/* Permissions list in module */}
                    <div
                      style={{
                        padding: '1.1rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '0.85rem'
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
                              gap: '0.75rem',
                              padding: '0.85rem 1rem',
                              borderRadius: '16px',
                              backgroundColor: isChecked ? 'rgba(25, 168, 232, 0.1)' : 'rgba(255, 244, 221, 0.35)',
                              border: isChecked ? '2px solid var(--toy-blue)' : '1.5px solid var(--toy-border)',
                              cursor: canManageRoles && !isProtectedAdmin ? 'pointer' : 'default',
                              opacity: isProtectedAdmin ? 0.8 : 1,
                              transition: 'all 0.12s ease'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(p.codigo)}
                              disabled={!canManageRoles || isProtectedAdmin}
                              style={{ marginTop: '0.2rem', accentColor: 'var(--toy-blue)', width: '16px', height: '16px' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--toy-ink)', lineHeight: 1.35 }}>
                                {p.descripcion}
                              </div>
                              {isProtectedAdmin && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--toy-orange-dark)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700 }}>
                                  <ShieldAlert size={12} strokeWidth={2.4} /> Permiso esencial del Administrador
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
