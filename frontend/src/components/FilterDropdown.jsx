import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Filter, ChevronDown, Check, Search, X } from 'lucide-react';

export default function FilterDropdown({
  options = [],
  value = '',
  onChange,
  title = '',
  buttonTitle = 'Filtrar',
  minWidth = '200px',
  maxWidth = '190px',
  searchable = false,
  searchPlaceholder = 'Buscar...',
  align = 'right'
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  // Enfocar el buscador al desplegar
  useEffect(() => {
    if (open && searchable) {
      setSearchTerm('');
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [open, searchable]);

  const currentOption = options.find((o) => String(o.value) === String(value)) || options[0] || { shortLabel: 'Filtro' };
  const hasActiveFilter = Boolean(value !== '');

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter((opt) => {
      const label = String(opt.label || '').toLowerCase();
      const short = String(opt.shortLabel || '').toLowerCase();
      return label.includes(term) || short.includes(term);
    });
  }, [options, searchTerm, searchable]);

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="btn btn-secondary btn-sm"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={currentOption.label || buttonTitle}
        style={{
          height: '40px',
          padding: '0 0.85rem',
          borderRadius: '12px',
          backgroundColor: '#FFFFFF',
          borderColor: open || hasActiveFilter ? 'var(--toy-blue)' : 'var(--toy-border-light)',
          boxShadow: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: hasActiveFilter ? 'var(--toy-deep-blue)' : 'var(--toy-ink)',
          fontWeight: 700,
          fontSize: '0.86rem',
          maxWidth: maxWidth || '190px',
          transition: 'border-color 0.15s ease, color 0.15s ease'
        }}
      >
        <Filter
          size={15}
          strokeWidth={2.4}
          color={hasActiveFilter ? 'var(--toy-blue)' : 'var(--toy-muted)'}
          style={{ flexShrink: 0 }}
        />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0,
            textAlign: 'left'
          }}
        >
          {currentOption.shortLabel || currentOption.label}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2.4}
          style={{
            color: 'var(--toy-muted)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.18s ease',
            flexShrink: 0
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: align === 'right' ? 0 : 'auto',
            left: align === 'left' ? 0 : 'auto',
            top: 'calc(100% + 8px)',
            zIndex: 150,
            minWidth: minWidth || '220px',
            maxWidth: '320px',
            backgroundColor: '#FFFFFF',
            border: '2px solid var(--toy-border)',
            borderRadius: '16px',
            boxShadow: '0 12px 30px rgba(58, 42, 34, 0.16)',
            padding: '0.45rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            animation: 'dropdownFadeIn 160ms cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          role="listbox"
        >
          {title && (
            <div
              style={{
                padding: '0.35rem 0.65rem 0.25rem',
                fontSize: '0.7rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--toy-muted)'
              }}
            >
              {title}
            </div>
          )}

          {searchable && (
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--toy-cream)',
                borderRadius: '10px',
                border: '1px solid var(--toy-border-light)',
                padding: '0.35rem 0.65rem',
                marginBottom: '0.25rem',
                gap: '0.4rem'
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
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.82rem',
                  color: 'var(--toy-ink)',
                  fontFamily: 'inherit',
                  fontWeight: 600
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--toy-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Limpiar búsqueda"
                >
                  <X size={13} strokeWidth={2.4} />
                </button>
              )}
            </div>
          )}

          <div
            style={{
              maxHeight: '260px',
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
                  padding: '0.85rem 0.5rem',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: 'var(--toy-muted)',
                  fontWeight: 600
                }}
              >
                No se encontraron opciones
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(value) === String(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      if (onChange) onChange(opt.value);
                      setOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.65rem',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: isSelected ? 'rgba(255, 244, 221, 0.9)' : 'transparent',
                      color: isSelected ? 'var(--toy-deep-blue)' : 'var(--toy-ink)',
                      fontWeight: isSelected ? 800 : 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.12s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 244, 221, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', overflow: 'hidden' }}>
                      {opt.color && (
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: opt.color,
                            display: 'inline-block',
                            flexShrink: 0
                          }}
                        />
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {opt.label}
                      </span>
                    </div>
                    {isSelected && (
                      <Check size={15} strokeWidth={2.6} color="var(--toy-blue)" style={{ flexShrink: 0 }} />
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
