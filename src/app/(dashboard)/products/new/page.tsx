'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { errMsg } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [form, setForm] = useState({
    code: '', name: '', description: '', type: 'ONE_TIME',
    unitPrice: '', currency: 'PEN', igvExempt: false,
    accountCodeIncome: '', accountCodeCogs: '',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await authClient.post('/products', {
        ...form,
        unitPrice: Number(form.unitPrice),
        accountCodeIncome: form.accountCodeIncome || null,
        accountCodeCogs:   form.accountCodeCogs   || null,
      });
      router.push('/products');
    } catch (ex) { setError(errMsg(ex)); setLoading(false); }
  };

  return (
    <div className="mx-fade-in max-w-2xl">
      <div className="mx-page-header">
        <div className="flex items-center gap-3">
          <Link href="/products" className="mx-btn-secondary px-3 py-2"><ArrowLeft size={15} /></Link>
          <h1 className="mx-page-title">Nuevo producto</h1>
        </div>
      </div>

      <div className="mx-card p-6">
        {error && <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Código *</label>
              <input className="mx-input" value={form.code} onChange={set('code')} required placeholder="PROD-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Tipo *</label>
              <select className="mx-select" value={form.type} onChange={set('type')}>
                <option value="ONE_TIME">Único</option>
                <option value="SUBSCRIPTION">Suscripción</option>
                <option value="METERED">Medido</option>
                <option value="ASSET">Activo</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Nombre *</label>
              <input className="mx-input" value={form.name} onChange={set('name')} required placeholder="Nombre del producto o servicio" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Descripción</label>
              <textarea className="mx-input resize-none" rows={2} value={form.description} onChange={set('description')} placeholder="Descripción opcional…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Precio unitario *</label>
              <input type="number" className="mx-input" value={form.unitPrice} onChange={set('unitPrice')} required min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Moneda</label>
              <select className="mx-select" value={form.currency} onChange={set('currency')}>
                <option value="PEN">PEN — Soles</option>
                <option value="USD">USD — Dólares</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Cuenta ingresos</label>
              <input className="mx-input" value={form.accountCodeIncome} onChange={set('accountCodeIncome')} placeholder="70.1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Cuenta costo</label>
              <input className="mx-input" value={form.accountCodeCogs} onChange={set('accountCodeCogs')} placeholder="69.1" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="igvExempt"
                checked={form.igvExempt}
                onChange={e => setForm(prev => ({ ...prev, igvExempt: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="igvExempt" className="text-sm text-[#1D1D1F]">Exonerado de IGV</label>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Link href="/products" className="mx-btn-secondary">Cancelar</Link>
            <button type="submit" disabled={loading} className="mx-btn-primary">
              {loading ? 'Guardando…' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
