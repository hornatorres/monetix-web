'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { errMsg } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function NewAssetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [form, setForm] = useState({
    code: '', name: '', description: '', category: 'EQUIPMENT',
    cost: '', currency: 'PEN', usefulLifeMonths: 60,
    residualValue: 0, depreciationMethod: 'LINEAL',
    purchaseDate: new Date().toISOString().split('T')[0],
    depreciationStartDate: new Date().toISOString().split('T')[0],
    accountCodeAsset: '33.3', accountCodeDepreciation: '39.3',
    accountCodeExpense: '68.1', location: '', serialNumber: '', notes: '',
  });

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [f]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await authClient.post('/assets', {
        ...form,
        cost:              Number(form.cost),
        usefulLifeMonths:  Number(form.usefulLifeMonths),
        residualValue:     Number(form.residualValue),
        serialNumber:      form.serialNumber  || null,
        location:          form.location      || null,
        notes:             form.notes         || null,
      });
      router.push('/assets');
    } catch (ex) { setError(errMsg(ex)); setLoading(false); }
  };

  return (
    <div className="mx-fade-in max-w-2xl">
      <div className="mx-page-header">
        <div className="flex items-center gap-3">
          <Link href="/assets" className="mx-btn-secondary px-3 py-2"><ArrowLeft size={15} /></Link>
          <h1 className="mx-page-title">Registrar activo</h1>
        </div>
      </div>

      <div className="mx-card p-6">
        {error && <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Código *</label>
              <input className="mx-input" value={form.code} onChange={set('code')} required placeholder="ACT-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Categoría *</label>
              <select className="mx-select" value={form.category} onChange={set('category')}>
                <option value="EQUIPMENT">Equipos</option>
                <option value="VEHICLE">Vehículos</option>
                <option value="FURNITURE">Muebles</option>
                <option value="BUILDING">Edificios</option>
                <option value="SOFTWARE">Software</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Nombre *</label>
              <input className="mx-input" value={form.name} onChange={set('name')} required placeholder="Laptop Dell XPS 15" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Costo *</label>
              <input type="number" className="mx-input" value={form.cost} onChange={set('cost')} required min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Moneda</label>
              <select className="mx-select" value={form.currency} onChange={set('currency')}>
                <option value="PEN">PEN</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Vida útil (meses) *</label>
              <input type="number" className="mx-input" value={form.usefulLifeMonths} onChange={set('usefulLifeMonths')} required min="1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Valor residual</label>
              <input type="number" className="mx-input" value={form.residualValue} onChange={set('residualValue')} min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Fecha compra *</label>
              <input type="date" className="mx-input" value={form.purchaseDate} onChange={set('purchaseDate')} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Inicio depreciación *</label>
              <input type="date" className="mx-input" value={form.depreciationStartDate} onChange={set('depreciationStartDate')} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Cuenta activo</label>
              <input className="mx-input" value={form.accountCodeAsset} onChange={set('accountCodeAsset')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Cuenta depreciación</label>
              <input className="mx-input" value={form.accountCodeDepreciation} onChange={set('accountCodeDepreciation')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Cuenta gasto</label>
              <input className="mx-input" value={form.accountCodeExpense} onChange={set('accountCodeExpense')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">N° Serie</label>
              <input className="mx-input" value={form.serialNumber} onChange={set('serialNumber')} placeholder="SN-XXXXX" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Ubicación</label>
              <input className="mx-input" value={form.location} onChange={set('location')} placeholder="Oficina principal" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Link href="/assets" className="mx-btn-secondary">Cancelar</Link>
            <button type="submit" disabled={loading} className="mx-btn-primary">
              {loading ? 'Guardando…' : 'Registrar activo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
