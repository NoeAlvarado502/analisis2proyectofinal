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
        padding: '1.5rem',
        backgroundColor: 'var(--toy-cream)',
        backgroundImage: 'radial-gradient(var(--toy-cream-dark) 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '430px',
          padding: '2.2rem 2rem',
          borderRadius: '24px',
          backgroundColor: '#FFFFFF',
          border: '2px solid var(--toy-border)',
          boxShadow: '0 12px 32px rgba(58, 42, 34, 0.1), 0 2px 6px rgba(58, 42, 34, 0.04)'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              margin: '0 auto 0.85rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--toy-blue), var(--toy-deep-blue))',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(8, 123, 181, 0.3)'
            }}
          >
            <Package size={26} strokeWidth={2.4} />
          </div>

          <h1 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--toy-ink)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            JUGUETERÍA <span style={{ color: 'var(--toy-blue)' }}>QUETZAL</span>
          </h1>

          <p style={{ color: 'var(--toy-muted)', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '0.25rem' }}>
            Sistema de Gestión
          </p>
        </div>

        {/* Section Intro */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem', paddingBottom: '0.9rem', borderBottom: '1.5px solid var(--toy-border-light)' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--toy-ink)' }}>
            Acceso al Sistema
          </h2>
          <p style={{ color: 'var(--toy-muted)', fontSize: '0.82rem', fontWeight: 600, marginTop: '2px' }}>
            Ingresa tus credenciales para continuar
          </p>
        </div>

          {errorMsg && (
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '14px',
                backgroundColor: '#FEF2F2',
                border: '2px solid var(--toy-red)',
                color: '#991B1B',
                fontSize: '0.86rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                fontWeight: 700
              }}
            >
              <AlertCircle size={18} strokeWidth={2.4} />
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
              style={{ width: '100%', marginTop: '0.6rem', height: '46px' }}
              disabled={loading}
            >
              <LogIn size={18} strokeWidth={2.4} />
              <span>{loading ? 'Verificando...' : 'Iniciar Sesión'}</span>
            </button>
          </form>

          {/* Quick Access Demo Accounts */}
          <div style={{ marginTop: '1.8rem', paddingTop: '1.3rem', borderTop: '2px solid var(--toy-border)' }}>
            <p
              style={{
                fontSize: '0.74rem',
                textTransform: 'uppercase',
                color: 'var(--toy-muted)',
                letterSpacing: '0.06em',
                fontWeight: 800,
                marginBottom: '0.75rem',
                textAlign: 'center'
              }}
            >
              Acceso Rápido para Demostración
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.55rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleQuickFill('admin@jugueteria.local')}
                title="admin@jugueteria.local"
              >
                <ShieldCheck size={14} strokeWidth={2.4} />
                <span>Admin</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleQuickFill('supervisor@jugueteria.local')}
                title="supervisor@jugueteria.local"
              >
                <Search size={14} strokeWidth={2.4} />
                <span>Superv.</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleQuickFill('operador@jugueteria.local')}
                title="operador@jugueteria.local"
              >
                <UserCheck size={14} strokeWidth={2.4} />
                <span>Operador</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
