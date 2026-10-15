import React from 'react';

/**
 * PageCard
 * Contenedor unificado de tarjeta de página (sin líneas divisorias intermedias,
 * fondo de tarjeta uniforme y barra superior de herramientas flexible).
 * Estandariza la estructura visual para todos los módulos del sistema.
 */
export default function PageCard({
  title,
  subtitle,
  actions,
  children,
  className = '',
  style = {},
  toolbarBorder = false
}) {
  return (
    <div className={`card card-unificada ${className}`} style={style}>
      <div
        className="card-toolbar"
        style={{
          borderBottom: toolbarBorder ? '2px solid var(--toy-border-light)' : 'none'
        }}
      >
        <div>
          {title && (
            typeof title === 'string' ? (
              <h1
                className="font-display"
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: 'var(--toy-ink)',
                  margin: 0
                }}
              >
                {title}
              </h1>
            ) : (
              title
            )
          )}
          {subtitle && (
            <p
              style={{
                margin: '0.2rem 0 0',
                fontSize: '0.84rem',
                color: 'var(--toy-muted)',
                fontWeight: 600
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div
            style={{
              display: 'flex',
              gap: '0.85rem',
              alignItems: 'center',
              flexWrap: 'wrap',
              flex: 1,
              justifyContent: 'flex-end'
            }}
          >
            {actions}
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
