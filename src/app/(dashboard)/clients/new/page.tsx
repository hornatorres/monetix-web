'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { errMsg } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [form, setForm] = useState({
    name:    '',
    taxId:   '',
    email:   '',
    phone:   '',
    address: '',
    notes:   '',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authClient.post('/clients', form);
      router.push('/clients');
    } catch (ex) {
      setError(errMsg(ex));
      setLoading(false);
    }
  };

  return (
    <div className="mx-fade-in max-w-2xl">
      <div className="mx-page-header">
        <div className="flex items-center gap-3">
          <Link href="/clients" className="mx-btn-secondary px-3 py-2">
            <ArrowLeft size={15} />
          </Link>
          <h1 className="mx-page-title">Nuevo cliente</h1>
        </div>
      </div>

      <div className="mx-card p-6">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Nombre / Razón social *</label>
              <input className="mx-input" value={form.name} onChange={set('name')} required placeholder="Empresa SAC" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">RUC / DNI *</label>
              <input className="mx-input" value={form.taxId} onChange={set('taxId')} required placeholder="20XXXXXXXXX" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Teléfono</label>
              <input className="mx-input" value={form.phone} onChange={set('phone')} placeholder="9XXXXXXXX" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Email</label>
              <input className="mx-input" type="email" value={form.email} onChange={set('email')} placeholder="contacto@empresa.pe" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Dirección</label>
              <input className="mx-input" value={form.address} onChange={set('address')} placeholder="Av. Principal 123, Lima" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Notas</label>
              <textarea className="mx-input resize-none" rows={3} value={form.notes} onChange={set('notes')} placeholder="Información adicional…" />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Link href="/clients" className="mx-btn-secondary">Cancelar</Link>
            <button type="submit" disabled={loading} className="mx-btn-primary">
              {loading ? 'Guardando…' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
