import React from 'react';
import { Search } from 'lucide-react';

export default function SearchInput({
  value,
  onChange,
  placeholder = '',
  width = '220px',
  ariaLabel = 'Buscar',
  style = {},
  className = ''
}) {
  const displayValue = typeof value === 'string' ? value : (value?.target?.value ?? (value != null ? String(value) : ''));

  const handleChange = (e) => {
    if (!onChange) return;
    try {
      if (e && typeof e === 'object') {
        e.trim = () => (e.target?.value || '').trim();
        e.toLowerCase = () => (e.target?.value || '').toLowerCase();
        e.toUpperCase = () => (e.target?.value || '').toUpperCase();
      }
    } catch (_) {}
    onChange(e);
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width }} className={className}>
      <Search
        size={16}
        strokeWidth={2.4}
        style={{
          position: 'absolute',
          left: '12px',
          color: 'var(--toy-muted)',
          pointerEvents: 'none'
        }}
      />
      <input
        type="text"
        className="form-control"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: 'var(--toy-border-light)',
          paddingLeft: '36px',
          height: '40px',
          ...style
        }}
      />
    </div>
  );
}
