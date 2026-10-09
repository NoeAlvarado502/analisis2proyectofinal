import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, AlertCircle, ShieldCheck, Search, UserCheck, LogIn } from 'lucide-react';
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
        background: `radial-gradient(circle at 10% 20%, rgba(25, 168, 232, 0.12), transparent 40%),
                     radial-gradient(circle at 90% 80%, rgba(255, 157, 46, 0.12), transparent 40%),
                     var(--bg-app)`,
        padding: '1.5rem'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          boxShadow: 'var(--shadow-lg), 0 0 35px rgba(25, 168, 232, 0.08)',
          border: '1.5px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '2.4rem 2rem'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              margin: '0 auto 1.15rem',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-strong))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: 'var(--shadow-primary)'
            }}
          >
            <Package size={32} strokeWidth={2.2} />
          </div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '0.35rem', color: 'var(--color-ink)' }}>
            Juguetería DB
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
            Sistema de Gestión · Análisis II (Sprint 1)
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '0.85rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--danger-bg)',
              border: '1.5px solid var(--danger-border)',
              color: 'var(--danger-text)',
              fontSize: '0.88rem',
              marginBottom: '1.4rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              fontWeight: 600
            }}
          >
            <AlertCircle size={18} strokeWidth={2.2} />
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
            style={{ width: '100%', marginTop: '0.85rem', height: '46px' }}
            disabled={loading}
          >
            <LogIn size={18} strokeWidth={2.2} />
            <span>{loading ? 'Validando credenciales...' : 'Iniciar Sesión'}</span>
          </button>
        </form>

        {/* Demo Fast Logins */}
        <div style={{ marginTop: '2.2rem', paddingTop: '1.4rem', borderTop: '1.5px solid var(--border-subtle)' }}>
          <p
            style={{
              fontSize: '0.76rem',
              textTransform: 'uppercase',
              color: 'var(--color-muted)',
              letterSpacing: '0.06em',
              fontWeight: 800,
              marginBottom: '0.85rem',
              textAlign: 'center'
            }}
          >
            Acceso Rápido para Demostración / Docente
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('admin@jugueteria.local')}
              title="admin@jugueteria.local"
            >
              <ShieldCheck size={14} strokeWidth={2.2} />
              <span>Admin</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('supervisor@jugueteria.local')}
              title="supervisor@jugueteria.local"
            >
              <Search size={14} strokeWidth={2.2} />
              <span>Superv.</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('operador@jugueteria.local')}
              title="operador@jugueteria.local"
            >
              <UserCheck size={14} strokeWidth={2.2} />
              <span>Operador</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
