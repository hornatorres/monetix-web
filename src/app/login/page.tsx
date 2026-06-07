'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { authClient } from '@/lib/authClient';

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const setAuth      = useAuthStore((s) => s.setAuth);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const expired = searchParams.get('session') === 'expired';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await authClient.post('/auth/login', { email, password });
      const { accessToken, user } = r.data;
      setAuth(accessToken, {
        id: user.id, email: user.email, role: user.role,
        orgId: user.organizationId,
        firstName: user.fullName?.split(' ')[0] ?? '',
        lastName:  user.fullName?.split(' ')[1] ?? '',
      });
      router.replace('/dashboard');
    } catch (ex: any) {
      setError(ex?.response?.data?.message ?? 'Credenciales incorrectas');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#F2F2F7',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20,
        border: '0.5px solid #E5E5EA',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        width: '100%', maxWidth: 400,
        padding: '36px 32px',
      }} className="mx-fade-in">

        {/* Logo */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.4px' }}>
            Monetix
          </div>
          <p style={{ fontSize: 14, color: '#86868B', marginTop: 4 }}>
            Inicia sesión en tu cuenta
          </p>
        </div>

        {expired && (
          <div className="mx-alert mx-alert-warning" style={{ marginBottom: 20 }}>
            Tu sesión expiró. Inicia sesión nuevamente.
          </div>
        )}

        {error && (
          <div className="mx-alert mx-alert-error" style={{ marginBottom: 20 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1D1D1F', marginBottom: 8 }}>
              Correo electrónico
            </label>
            <input
              type="email" required autoFocus
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@empresa.pe"
              style={{
                width: '100%', border: '1px solid #E5E5EA', borderRadius: 12,
                padding: '11px 14px', fontSize: 13, outline: 'none',
                background: '#F9F9FB', color: '#1D1D1F', fontFamily: 'inherit',
              }}
              onFocus={e => { e.target.style.borderColor = '#0071E3'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.12)'; }}
              onBlur={e =>  { e.target.style.borderColor = '#E5E5EA'; e.target.style.background = '#F9F9FB'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1D1D1F', marginBottom: 8 }}>
              Contraseña
            </label>
            <input
              type="password" required
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', border: '1px solid #E5E5EA', borderRadius: 12,
                padding: '11px 14px', fontSize: 13, outline: 'none',
                background: '#F9F9FB', color: '#1D1D1F', fontFamily: 'inherit',
              }}
              onFocus={e => { e.target.style.borderColor = '#0071E3'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.12)'; }}
              onBlur={e =>  { e.target.style.borderColor = '#E5E5EA'; e.target.style.background = '#F9F9FB'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', background: loading ? '#86868B' : '#0071E3',
              color: '#fff', border: 'none', borderRadius: 980,
              padding: '13px 24px', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              boxShadow: loading ? 'none' : '0 2px 8px rgba(0,113,227,0.3)',
            }}
          >
            {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
