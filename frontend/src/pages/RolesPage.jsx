import React, { useState, useEffect, useCallback } from 'react';
import { Save, Check, ShieldAlert, RotateCcw } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import PageCard from '../components/PageCard';
import ToySwitch from '../components/ToySwitch';
import ConfirmModal from '../components/ConfirmModal';

export default function RolesPage() {
  const { can } = useAuth();
  const toast = useToast();

  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [originalPermissions, setOriginalPermissions] = useState([]);
  const [allPermissionsByModule, setAllPermissionsByModule] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Modals for confirmations
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [pendingRoleSwitch, setPendingRoleSwitch] = useState(null);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

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
          setOriginalPermissions(codes);
          setHasChanges(false);
        }
      } catch (err) {
        toast.error(err.message || 'Error al cargar permisos del rol');
      }
    }

    loadRoleDetails();
  }, [selectedRole, toast]);

  // Reset permissions back to original state
  const handleResetPermissions = () => {
    if (!hasChanges) return;
    setRolePermissions([...originalPermissions]);
    setHasChanges(false);
    toast.info('Permisos restablecidos a su estado original');
  };

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

  // Select Role with discard confirmation
  const handleSelectRole = (r) => {
    if (r.id_rol === selectedRole?.id_rol) return;
    if (hasChanges) {
      setPendingRoleSwitch(r);
      setConfirmDiscardOpen(true);
      return;
    }
    setSelectedRole(r);
  };

  const handleConfirmDiscard = () => {
    if (pendingRoleSwitch) {
      setSelectedRole(pendingRoleSwitch);
      setPendingRoleSwitch(null);
      setHasChanges(false);
    }
    setConfirmDiscardOpen(false);
  };

  // Save Permissions
  const handleExecuteSave = async () => {
    if (!selectedRole || !canManageRoles) return;

    setSaving(true);
    try {
      await api.put(`/roles/${selectedRole.id_rol}/permisos`, {
        permisos: rolePermissions
      });
      toast.success(`Permisos del rol ${selectedRole.nombre} actualizados con éxito`);
      setOriginalPermissions([...rolePermissions]);
      setHasChanges(false);
      setConfirmSaveOpen(false);

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
    <>
      <PageCard
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <h1
              className="font-display"
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: 'var(--toy-ink)',
                margin: 0
              }}
            >
              Roles y permisos
            </h1>
            <span style={{ fontSize: '1.15rem', color: 'var(--toy-border)', fontWeight: 800 }}>/</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--toy-muted)' }}>
              Editar rol: <strong style={{ color: 'var(--toy-blue)', fontWeight: 800 }}>{selectedRole?.nombre}</strong>
            </span>
          </div>
        }
        toolbarBorder={true}
        style={{
          height: 'calc(100vh - 74px - 4.4rem)',
          maxHeight: 'calc(100vh - 74px - 4.4rem)',
          overflow: 'hidden'
        }}
        actions={
          canManageRoles && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button
                type="button"
                className={`btn ${hasChanges ? 'btn-danger' : 'btn-secondary'}`}
                onClick={handleResetPermissions}
                disabled={saving || !hasChanges}
                title={hasChanges ? 'Restablecer cambios' : 'Sin cambios por restablecer'}
                aria-label="Restablecer cambios"
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
                <RotateCcw size={18} strokeWidth={2.4} color={hasChanges ? '#FFFFFF' : 'var(--toy-muted)'} />
              </button>

              <button
                type="button"
                className={`btn ${hasChanges ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setConfirmSaveOpen(true)}
                disabled={saving || !hasChanges}
                title={hasChanges ? 'Aceptar y guardar cambios' : 'Sin cambios pendientes'}
                aria-label="Aceptar y guardar cambios"
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
                {hasChanges ? (
                  <Save size={20} strokeWidth={2.4} />
                ) : (
                  <Check size={20} strokeWidth={2.4} color="var(--toy-muted)" />
                )}
              </button>
            </div>
          )
        }
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: '240px 1fr',
            overflow: 'hidden'
          }}
        >
          {/* Left: Role Selector List */}
          <div
            style={{
              height: '100%',
              overflowY: 'auto',
              padding: '1.25rem 1.25rem 1.25rem 1.5rem'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {roles.map((r) => {
                const isSelected = selectedRole?.id_rol === r.id_rol;
                return (
                  <div
                    key={r.id_rol}
                    onClick={() => handleSelectRole(r)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '16px',
                      backgroundColor: isSelected ? 'var(--toy-blue)' : 'rgba(255, 244, 221, 0.45)',
                      border: isSelected ? '2px solid var(--toy-deep-blue)' : '2px solid var(--toy-border)',
                      boxShadow: isSelected ? '0 3px 0 var(--toy-deep-blue)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                      transform: isSelected ? 'translateY(-2px)' : 'none',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <strong
                      className="font-display"
                      style={{
                        color: isSelected ? '#FFFFFF' : 'var(--toy-ink)',
                        fontSize: '0.92rem',
                        fontWeight: 700
                      }}
                    >
                      {r.nombre}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Permission Matrix by Module */}
          <div
            style={{
              height: '100%',
              overflowY: 'auto',
              padding: '1.25rem 1.75rem',
              borderLeft: '2px solid var(--toy-border-light)'
            }}
          >

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
                            <div
                              key={p.codigo}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.75rem',
                                padding: '0.85rem 1rem',
                                borderRadius: '16px',
                                backgroundColor: isChecked ? 'rgba(25, 168, 232, 0.08)' : 'rgba(255, 244, 221, 0.35)',
                                border: isChecked ? '2px solid var(--toy-blue)' : '1.5px solid var(--toy-border)',
                                opacity: isProtectedAdmin ? 0.8 : 1,
                                transition: 'all 0.12s ease'
                              }}
                            >
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

                              <ToySwitch
                                checked={isChecked}
                                disabled={!canManageRoles || isProtectedAdmin}
                                onChange={() => handleTogglePermission(p.codigo)}
                                title={isProtectedAdmin ? 'Permiso esencial del Administrador' : (isChecked ? 'Revocar permiso' : 'Conceder permiso')}
                                ariaLabel={p.descripcion}
                              />
                            </div>
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
      </PageCard>

      {/* Modal Confirmar Guardar Cambios */}
      <ConfirmModal
        isOpen={confirmSaveOpen}
        onClose={() => setConfirmSaveOpen(false)}
        onConfirm={handleExecuteSave}
        title={`¿Guardar permisos para ${selectedRole?.nombre}?`}
        variant="primary"
        confirmText="Sí, guardar cambios"
        loading={saving}
        message={
          <>
            Se aplicarán los cambios a la matriz de permisos del perfil{' '}
            <strong style={{ color: 'var(--toy-ink)' }}>{selectedRole?.nombre}</strong>.
            <div style={{ marginTop: '0.45rem', fontSize: '0.84rem', color: 'var(--toy-muted)' }}>
              Los usuarios con este rol asignado verán actualizados sus accesos en su próxima interacción.
            </div>
          </>
        }
      />

      {/* Modal Confirmar Descartar Cambios al Cambiar de Rol */}
      <ConfirmModal
        isOpen={confirmDiscardOpen}
        onClose={() => setConfirmDiscardOpen(false)}
        onConfirm={handleConfirmDiscard}
        title="¿Descartar cambios pendientes?"
        variant="danger"
        confirmText="Sí, descartar"
        message={
          <>
            Tienes modificaciones sin guardar en el perfil{' '}
            <strong style={{ color: 'var(--toy-ink)' }}>{selectedRole?.nombre}</strong>.
            <div style={{ marginTop: '0.45rem', fontSize: '0.84rem', color: 'var(--toy-muted)' }}>
              Si cambias de rol ahora, se perderán las casillas que hayas marcado o desmarcado.
            </div>
          </>
        }
      />
    </>
  );
}
