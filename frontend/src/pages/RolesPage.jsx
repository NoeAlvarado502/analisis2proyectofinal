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
            <span style={{ width: '12px', height: '12px', borderRadius: '999px', backgroundColor: 'var(--toy-purple)', display: 'inline-block' }} />
            <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
              Roles y Permisos del Sistema
            </h1>
          </div>
          <p style={{ color: 'var(--toy-muted)', fontSize: '0.88rem', fontWeight: 600 }}>
            Administración de perfiles operativos. Configura las acciones permitidas para cada tipo de cuenta en la juguetería.
          </p>
        </div>

        {canManageRoles && (
          <button
            type="button"
            className="btn btn-toy-orange"
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
        <div className="card" style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '999px', backgroundColor: 'var(--toy-orange)', display: 'inline-block' }} />
            <h3 className="font-display" style={{ fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--toy-muted)', letterSpacing: '0.05em' }}>
              Perfiles Definidos
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
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
                    padding: '0.95rem 1.1rem',
                    borderRadius: '18px',
                    backgroundColor: isSelected ? 'var(--toy-orange)' : 'rgba(255, 244, 221, 0.45)',
                    border: isSelected ? '2px solid var(--toy-orange-dark)' : '2px solid var(--toy-border)',
                    boxShadow: isSelected ? '0 4px 0 var(--toy-orange-dark)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                    transform: isSelected ? 'translateY(-2px)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong className="font-display" style={{ color: isSelected ? '#FFFFFF' : 'var(--toy-ink)', fontSize: '1rem', fontWeight: 700 }}>
                      {r.nombre}
                    </strong>
                    <span
                      className={`badge ${isSelected ? 'badge-primary' : 'badge-warning'}`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {r.total_permisos ?? 0}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: isSelected ? 'rgba(255, 255, 255, 0.92)' : 'var(--toy-muted)', marginTop: '0.35rem', fontWeight: 600 }}>
                    {r.descripcion || 'Sin descripción'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Permission Matrix by Module */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '1.4rem' }}>
            <div>
              <h2 className="card-title">
                Permisos del perfil: <span style={{ color: 'var(--toy-orange)' }}>{selectedRole?.nombre}</span>
              </h2>
              <p style={{ color: 'var(--toy-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                {canManageRoles
                  ? 'Marca o desmarca casillas para habilitar o restringir funciones en este perfil.'
                  : 'Modo solo lectura (sin permisos de edición).'}
              </p>
            </div>

            <span className="badge badge-purple" style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem' }}>
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
                        padding: '0.85rem 1.25rem',
                        backgroundColor: '#FAF5EB',
                        borderBottom: '2px solid var(--toy-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <strong className="font-display" style={{ textTransform: 'capitalize', color: 'var(--toy-deep-blue)', fontSize: '1rem', fontWeight: 700 }}>
                        Módulo: {modulo}
                      </strong>

                      {canManageRoles && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleToggleModule(perms)}
                          style={{ fontSize: '0.76rem', fontWeight: 800 }}
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
                              backgroundColor: isChecked ? 'rgba(255, 157, 46, 0.14)' : 'rgba(255, 244, 221, 0.35)',
                              border: isChecked ? '2px solid var(--toy-orange)' : '1.5px solid var(--toy-border)',
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
                              style={{ marginTop: '0.2rem', accentColor: 'var(--toy-orange)', width: '16px', height: '16px' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--toy-ink)', lineHeight: 1.35 }}>
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
