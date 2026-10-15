import React from 'react';

/**
 * ToySwitch
 * Interruptor táctil interactivo estilo juguete con relieve 3D y color azul activo.
 * Reutilizable en cualquier tabla o formulario del sistema.
 */
export default function ToySwitch({
  checked = false,
  onChange,
  disabled = false,
  title = '',
  ariaLabel = '',
  className = '',
  id
}) {
  const isChecked = Boolean(checked);

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={isChecked}
      className={`toy-switch ${isChecked ? 'active' : ''} ${className}`}
      disabled={disabled}
      onClick={onChange}
      title={title}
      aria-label={ariaLabel || title}
    >
      <span className="toy-switch-thumb" />
    </button>
  );
}
