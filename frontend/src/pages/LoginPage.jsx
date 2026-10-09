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
        className="toy-cardboard-pack"
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#FFFFFF',
          border: '2px solid var(--toy-border)'
        }}
      >
        {/* Packaging Header with Checkered Pattern & Euro Hanger */}
        <div className="bg-checker-blue" style={{ padding: '1.4rem 1.2rem 1.2rem', textAlign: 'center', color: '#FFFFFF' }}>
          <div className="euro-hanger-punch" style={{ marginBottom: '0.85rem' }} />
          
          <div
            style={{
              width: '52px',
              height: '52px',
              margin: '0 auto 0.65rem',
              borderRadius: '16px',
              backgroundColor: '#FFFFFF',
              color: 'var(--toy-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)'
            }}
          >
            <Package size={28} strokeWidth={2.4} />
          </div>

          <h1 className="font-display" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em', lineHeight: 1.15 }}>
            JUGUETERÍA QUETZAL
          </h1>

          <div style={{ marginTop: '0.4rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'rgba(0, 0, 0, 0.22)',
                color: '#FFFFFF',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              Sistema de Gestión de Inventario
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div style={{ padding: '2rem 1.8rem 1.8rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
            <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--toy-ink)' }}>
              Acceso al Sistema
            </h2>
            <p style={{ color: 'var(--toy-muted)', fontSize: '0.86rem', fontWeight: 600, marginTop: '2px' }}>
              Ingresa tus credenciales para gestionar el inventario
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
    </div>
  );
}
