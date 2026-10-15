import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown, Check } from 'lucide-react';

export default function FilterDropdown({
  options = [],
  value = '',
  onChange,
  title = 'Filtrar por estado',
  buttonTitle = 'Filtrar',
  minWidth = '190px'
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  const currentOption = options.find((o) => o.value === value) || options[0] || { shortLabel: 'Filtro' };
  const hasActiveFilter = Boolean(value !== '');

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="btn btn-secondary btn-sm"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={buttonTitle}
        style={{
          height: '40px',
          padding: '0 0.95rem',
          borderRadius: '12px',
          backgroundColor: '#FFFFFF',
          borderColor: open || hasActiveFilter ? 'var(--toy-blue)' : 'var(--toy-border-light)',
          boxShadow: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.55rem',
          color: hasActiveFilter ? 'var(--toy-deep-blue)' : 'var(--toy-ink)',
          fontWeight: 700,
          fontSize: '0.86rem',
          transition: 'border-color 0.15s ease, color 0.15s ease'
        }}
      >
        <Filter
          size={15}
          strokeWidth={2.4}
          color={hasActiveFilter ? 'var(--toy-blue)' : 'var(--toy-muted)'}
        />
        <span>{currentOption.shortLabel || currentOption.label}</span>
        <ChevronDown
          size={14}
          strokeWidth={2.4}
          style={{
            color: 'var(--toy-muted)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.18s ease'
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            zIndex: 50,
            minWidth,
            backgroundColor: '#FFFFFF',
            border: '2px solid var(--toy-border)',
            borderRadius: '16px',
            boxShadow: '0 12px 30px rgba(58, 42, 34, 0.16)',
            padding: '0.45rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
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

          {options.map((opt) => {
            const isSelected = value === opt.value;
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
                  backgroundColor: isSelected ? 'rgba(25, 168, 232, 0.1)' : 'transparent',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
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
                  <span>{opt.label}</span>
                </div>
                {isSelected && (
                  <Check size={15} strokeWidth={2.6} color="var(--toy-blue)" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
