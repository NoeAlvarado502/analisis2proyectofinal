import React from 'react';
import { PackageOpen, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No se encontraron registros',
  searchPlaceholder = 'Buscar...',
  searchValue = '',
  onSearchChange,
  pagination,
  onPageChange,
  actions
}) {
  return (
    <div>
      {/* Top Toolbar */}
      {(onSearchChange || actions) && (
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            {onSearchChange && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    color: 'var(--color-dim)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '38px' }}
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
            )}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}

      {/* Table Container */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th key={col.key || index} style={{ width: col.width || 'auto' }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="empty-state">
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      border: '2.5px solid rgba(58, 42, 34, 0.15)',
                      borderTopColor: 'var(--color-primary)',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                    <span style={{ fontWeight: 600 }}>Cargando información...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="empty-state">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <PackageOpen size={36} color="var(--color-dim)" strokeWidth={1.75} />
                    <p style={{ fontWeight: 600 }}>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={row.id || row.id_usuario || row.id_cliente || row.id_producto || rowIndex}>
                  {columns.map((col, colIndex) => (
                    <td key={col.key || colIndex}>
                      {col.render ? col.render(row) : row[col.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {pagination && pagination.totalPages > 1 && (
          <div className="table-pagination">
            <span>
              Página {pagination.page} de {pagination.totalPages} ({pagination.totalRecords} total)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={pagination.page <= 1 || loading}
                onClick={() => onPageChange(pagination.page - 1)}
              >
                <ChevronLeft size={16} strokeWidth={2.2} />
                <span>Anterior</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => onPageChange(pagination.page + 1)}
              >
                <span>Siguiente</span>
                <ChevronRight size={16} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
