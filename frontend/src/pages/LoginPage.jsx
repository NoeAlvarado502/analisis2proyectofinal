import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToyBrick, AlertCircle, User, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import FormField from '../components/FormField';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        backgroundColor: 'transparent'
      }}
    >
      {/* Brand Header fuera de la tarjeta */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.85rem',
          marginBottom: '1.75rem'
        }}
      >
        <ToyBrick size={34} strokeWidth={2.4} style={{ color: 'var(--toy-ink)' }} />
        <h1
          className="font-display"
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--toy-ink)',
            letterSpacing: '0.01em',
            lineHeight: 1,
            margin: 0,
            textTransform: 'uppercase'
          }}
        >
          JUGUETERÍA QUETZAL
        </h1>
      </div>

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
          <FormField label="Usuario" name="email">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User
                size={19}
                strokeWidth={2.4}
                style={{
                  position: 'absolute',
                  left: '12px',
                  color: 'var(--toy-muted)',
                  pointerEvents: 'none'
                }}
              />
              <input
                id="email"
                type="text"
                className="form-control"
                placeholder="Usuario"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </FormField>

          <FormField label="Contraseña" name="password">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock
                size={19}
                strokeWidth={2.4}
                style={{
                  position: 'absolute',
                  left: '12px',
                  color: 'var(--toy-muted)',
                  pointerEvents: 'none'
                }}
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--toy-muted)',
                  borderRadius: '8px',
                  transition: 'color 0.15s ease'
                }}
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? (
                  <EyeOff size={19} strokeWidth={2.4} />
                ) : (
                  <Eye size={19} strokeWidth={2.4} />
                )}
              </button>
            </div>
          </FormField>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.6rem', height: '46px', fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.02em' }}
            disabled={loading}
          >
            <span>{loading ? 'Verificando...' : 'Ingresar'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
