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
        value={value}
        onChange={onChange}
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
