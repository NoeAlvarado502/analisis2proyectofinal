import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info')
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" role="region" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              {t.type === 'success' && <CheckCircle2 size={19} color="var(--color-green)" strokeWidth={2.2} />}
              {t.type === 'error' && <AlertCircle size={19} color="var(--color-red)" strokeWidth={2.2} />}
              {t.type === 'info' && <Info size={19} color="var(--color-primary)" strokeWidth={2.2} />}
            </span>
            <span style={{ flex: 1, fontSize: '0.88rem' }}>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'currentColor',
                cursor: 'pointer',
                opacity: 0.65,
                padding: '0 4px',
                display: 'inline-flex',
                alignItems: 'center'
              }}
              aria-label="Cerrar notificación"
            >
              <X size={15} strokeWidth={2.2} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de un ToastProvider');
  }
  return context;
}
