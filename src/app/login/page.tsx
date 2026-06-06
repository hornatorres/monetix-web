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
    setLoading(true);
    setError('');
    try {
      const r = await authClient.post('/auth/login', { email, password });
      const { accessToken, user } = r.data;
      setAuth(accessToken, {
        id:        user.id,
        email:     user.email,
        role:      user.role,
        orgId:     user.organizationId,
        firstName: user.fullName?.split(' ')[0] ?? '',
        lastName:  user.fullName?.split(' ')[1] ?? '',
      });
      router.replace('/dashboard');
    } catch (ex: any) {
      setError(ex?.response?.data?.message ?? 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
      <div className="mx-card p-8 w-full max-w-sm mx-fade-in">
        <h1 className="text-xl font-semibold text-[#1D1D1F] mb-1">Monetix</h1>
        <p className="text-sm text-[#86868B] mb-6">Inicia sesión en tu cuenta</p>

        {expired && (
          <div className="mb-4 p-3 rounded-xl bg-[#FFF3E0] text-sm text-[#E65100]">
            Tu sesión expiró. Inicia sesión nuevamente.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mx-input"
              placeholder="admin@empresa.pe"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mx-input"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mx-btn-primary w-full justify-center py-2.5"
          >
            {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
