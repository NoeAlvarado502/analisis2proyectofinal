import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import FormField from '../components/FormField';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Por favor completa todos los campos');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/inicio', { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Admin1234!');
    setErrorMsg('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.15), transparent 50%),
                     radial-gradient(circle at 80% 80%, rgba(6, 182, 212, 0.08), transparent 40%),
                     var(--bg-app)`,
        padding: '1.5rem'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          boxShadow: 'var(--shadow-lg), 0 0 35px rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              margin: '0 auto 1rem',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--primary), var(--accent-purple))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              boxShadow: '0 4px 18px var(--primary-glow)'
            }}
          >
            🧸
          </div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: '0.35rem' }}>Juguetería DB</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Sistema de Gestión · Análisis II (Sprint 1)
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger-text)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <FormField label="Correo electrónico" name="email" required>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="usuario@jugueteria.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </FormField>

          <FormField label="Contraseña" name="password" required>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </FormField>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem' }}
            disabled={loading}
          >
            {loading ? 'Validando credenciales...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Demo Fast Logins */}
        <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
          <p
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              letterSpacing: '0.05em',
              fontWeight: 700,
              marginBottom: '0.75rem',
              textAlign: 'center'
            }}
          >
            Acceso Rápido para Demostración / Docente
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('admin@jugueteria.local')}
              title="admin@jugueteria.local"
            >
              👑 Admin
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('supervisor@jugueteria.local')}
              title="supervisor@jugueteria.local"
            >
              🔍 Superv.
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('operador@jugueteria.local')}
              title="operador@jugueteria.local"
            >
              💼 Operador
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
