import React from 'react';

export default function FormField({
  label,
  name,
  error,
  required = false,
  children,
  helpText
}) {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={name} className="form-label">
          <span>
            {label} {required && <span style={{ color: 'var(--danger-text)' }}>*</span>}
          </span>
        </label>
      )}
      {children}
      {helpText && !error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
          {helpText}
        </span>
      )}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
