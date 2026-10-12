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
  actions,
  embedded = false
}) {
  return (
    <div
      style={
        embedded
          ? {
              width: '100%',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }
          : undefined
      }
    >
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
                    color: 'var(--toy-muted)',
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

      {/* Table Container con scroll interno */}
      <div
        className={embedded ? 'table-container-embedded' : 'table-container'}
        style={embedded ? { flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto' } : undefined}
      >
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th
                  key={col.key || index}
                  style={{
                    width: col.width || 'auto',
                    backgroundColor: '#FFFFFF',
                    position: embedded ? 'sticky' : undefined,
                    top: embedded ? 0 : undefined,
                    zIndex: embedded ? 10 : undefined,
                    borderBottom: '2px solid var(--toy-border-light)'
                  }}
                >
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
                      borderTopColor: 'var(--toy-blue)',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                    <span style={{ fontWeight: 700 }}>Cargando información...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="empty-state">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <PackageOpen size={36} color="var(--toy-muted)" strokeWidth={2} />
                    <p style={{ fontWeight: 700 }}>{emptyMessage}</p>
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
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div
          className="table-pagination"
          style={embedded ? { borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px', flexShrink: 0 } : undefined}
        >
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

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
