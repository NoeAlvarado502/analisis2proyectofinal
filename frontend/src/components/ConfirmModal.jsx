import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
  icon
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="modal-overlay" onClick={loading ? undefined : onClose}>
      <div
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              backgroundColor: isDanger ? 'rgba(241, 91, 74, 0.12)' : 'rgba(116, 201, 91, 0.14)',
              border: `2px solid ${isDanger ? 'rgba(241, 91, 74, 0.28)' : 'rgba(116, 201, 91, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {icon || (isDanger ? (
              <AlertTriangle size={24} color="var(--toy-red)" strokeWidth={2.4} />
            ) : (
              <CheckCircle2 size={24} color="var(--toy-green-dark)" strokeWidth={2.4} />
            ))}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              className="font-display"
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--toy-ink)',
                margin: '0 0 0.4rem 0',
                lineHeight: 1.2
              }}
            >
              {title}
            </h3>
            <div style={{ fontSize: '0.88rem', color: 'var(--toy-muted)', fontWeight: 600, lineHeight: 1.45 }}>
              {message}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar"
            style={{ width: '32px', height: '32px', padding: 0, borderRadius: '10px', flexShrink: 0 }}
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
            style={{ minWidth: '120px' }}
          >
            {loading ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#FFFFFF',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite'
                  }}
                />
                <span>Procesando...</span>
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
