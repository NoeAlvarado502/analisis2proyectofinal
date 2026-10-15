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
        <label htmlFor={name} className="form-label" style={{ textTransform: 'none' }}>
          <span>
            {label} {required && <span style={{ color: 'var(--toy-red)' }}>*</span>}
          </span>
        </label>
      )}
      {children}
      {helpText && !error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--toy-muted)', marginTop: '0.2rem', fontWeight: 600 }}>
          {helpText}
        </span>
      )}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
