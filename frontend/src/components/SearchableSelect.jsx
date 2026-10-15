import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export default function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Selecciona una opción...',
  searchPlaceholder = 'Buscar...',
  disabled = false,
  error = false,
  icon = null,
  renderOption,
  renderSelected,
  style = {},
  className = '',
  id,
  name,
  ariaLabel
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Enfocar automáticamente el input de búsqueda al desplegar
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  // Opción actualmente seleccionada
  const selectedOption = useMemo(() => {
    if (value === '' || value === null || value === undefined) return null;
    return options.find((opt) => String(opt.value) === String(value));
  }, [options, value]);

  // Filtrado reactivo de opciones según término de búsqueda
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter((opt) => {
      const searchStr = `${opt.label || ''} ${opt.subtitle || ''} ${opt.badge || ''} ${opt.searchKey || ''}`.toLowerCase();
      return searchStr.includes(term);
    });
  }, [options, searchTerm]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', ...style }}
      className={`searchable-select ${className}`}
    >
      {name && <input type="hidden" name={name} value={value ?? ''} />}

      {/* Botón Disparador */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
        style={{
          width: '100%',
          minHeight: '40px',
          padding: '0.45rem 0.85rem',
          backgroundColor: disabled ? 'var(--toy-cream-dark)' : '#FFFFFF',
          border: error
            ? '2px solid var(--toy-red)'
            : isOpen
            ? '2px solid var(--toy-blue)'
            : '2px solid var(--toy-border)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          boxShadow: isOpen
            ? '0 0 0 3px rgba(25, 168, 232, 0.15)'
            : '0 2px 4px rgba(58, 42, 34, 0.04)',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
        }}
      >
        {icon && (
          <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            {icon}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? (
            renderSelected ? (
              renderSelected(selectedOption)
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--toy-ink)', fontSize: '0.86rem' }}>
                  {selectedOption.label}
                </span>
                {selectedOption.badge && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.12rem 0.45rem',
                      borderRadius: '6px',
                      backgroundColor: 'var(--toy-cream)',
                      color: 'var(--toy-muted)',
                      border: '1px solid var(--toy-border-light)'
                    }}
                  >
                    {selectedOption.badge}
                  </span>
                )}
              </div>
            )
          ) : (
            <span style={{ color: 'var(--toy-muted)', fontSize: '0.86rem', fontWeight: 500 }}>
              {placeholder}
            </span>
          )}
        </div>

        <ChevronDown
          size={16}
          strokeWidth={2.4}
          style={{
            color: 'var(--toy-muted)',
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.18s ease'
          }}
        />
      </button>

      {/* Popover Desplegable */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 150,
            backgroundColor: '#FFFFFF',
            border: '2px solid var(--toy-border)',
            borderRadius: '16px',
            boxShadow: '0 14px 35px rgba(58, 42, 34, 0.18)',
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            animation: 'dropdownFadeIn 160ms cubic-bezier(0.16, 1, 0.3, 1)',
            minWidth: '240px'
          }}
          role="listbox"
        >
          {/* Barra de búsqueda interactiva */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--toy-cream)',
              borderRadius: '10px',
              border: '1px solid var(--toy-border-light)',
              padding: '0 0.65rem'
            }}
          >
            <Search size={14} color="var(--toy-muted)" strokeWidth={2.4} style={{ flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                padding: '0.45rem 0.5rem',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.84rem',
                color: 'var(--toy-ink)',
                fontWeight: 600
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: '2px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--toy-muted)'
                }}
                title="Limpiar búsqueda"
              >
                <X size={13} strokeWidth={2.4} />
              </button>
            )}
          </div>

          {/* Lista de opciones filtradas */}
          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
              paddingRight: '2px'
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '1.25rem 0.75rem',
                  textAlign: 'center',
                  color: 'var(--toy-muted)',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}
              >
                No se encontraron opciones
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      if (onChange) onChange(opt.value);
                      setIsOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: isSelected ? 'rgba(25, 168, 232, 0.12)' : 'transparent',
                      color: isSelected ? 'var(--toy-deep-blue)' : 'var(--toy-ink)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.12s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 244, 221, 0.65)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {renderOption ? (
                        renderOption(opt, isSelected)
                      ) : (
                        <div>
                          <div style={{ fontWeight: isSelected ? 800 : 700, fontSize: '0.85rem' }}>
                            {opt.label}
                          </div>
                          {opt.subtitle && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--toy-muted)', marginTop: '0.1rem' }}>
                              {opt.subtitle}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={16} strokeWidth={2.6} color="var(--toy-blue)" style={{ flexShrink: 0 }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
