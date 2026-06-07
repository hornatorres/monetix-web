'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { errMsg } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function NewSupplierPage() {
  const router = useRouter();
  const { canCreateMaster } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name:'', taxId:'', currency:'PEN', paymentTermsDays:30, contactName:'', contactEmail:'', contactPhone:'' });
  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setForm(p=>({...p,[f]:e.target.value}));

  if (!canCreateMaster) return <div className="mx-card p-6 text-sm text-[#86868B]">No tienes permisos para crear proveedores.</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try { await authClient.post('/suppliers', {...form, paymentTermsDays:Number(form.paymentTermsDays), contact:{name:form.contactName,email:form.contactEmail,phone:form.contactPhone}}); router.push('/suppliers'); }
    catch (ex) { setError(errMsg(ex)); setLoading(false); }
  };

  return (
    <div className="mx-fade-in max-w-2xl">
      <div className="mx-page-header"><div className="flex items-center gap-3"><Link href="/suppliers" className="mx-btn-secondary px-3 py-2"><ArrowLeft size={15}/></Link><h1 className="mx-page-title">Nuevo proveedor</h1></div></div>
      <div className="mx-card p-6">
        {error&&<div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-xs font-medium text-[#1D1D1F] mb-1">Razón social *</label><input className="mx-input" value={form.name} onChange={set('name')} required placeholder="Empresa S.A.C."/></div>
            <div><label className="block text-xs font-medium text-[#1D1D1F] mb-1">RUC *</label><input className="mx-input" value={form.taxId} onChange={set('taxId')} required placeholder="20XXXXXXXXX"/></div>
            <div><label className="block text-xs font-medium text-[#1D1D1F] mb-1">Plazo de pago (días)</label><input type="number" className="mx-input" value={form.paymentTermsDays} onChange={set('paymentTermsDays')} min={0}/></div>
            <div><label className="block text-xs font-medium text-[#1D1D1F] mb-1">Moneda</label><select className="mx-select" value={form.currency} onChange={set('currency')}><option value="PEN">PEN</option><option value="USD">USD</option></select></div>
            <div><label className="block text-xs font-medium text-[#1D1D1F] mb-1">Contacto</label><input className="mx-input" value={form.contactName} onChange={set('contactName')} placeholder="Juan Pérez"/></div>
            <div><label className="block text-xs font-medium text-[#1D1D1F] mb-1">Email</label><input type="email" className="mx-input" value={form.contactEmail} onChange={set('contactEmail')} placeholder="contacto@empresa.pe"/></div>
            <div><label className="block text-xs font-medium text-[#1D1D1F] mb-1">Teléfono</label><input className="mx-input" value={form.contactPhone} onChange={set('contactPhone')} placeholder="+51 9XX XXX XXX"/></div>
          </div>
          <div className="flex gap-3 justify-end pt-2"><Link href="/suppliers" className="mx-btn-secondary">Cancelar</Link><button type="submit" disabled={loading} className="mx-btn-primary">{loading?'Guardando…':'Crear proveedor'}</button></div>
        </form>
      </div>
    </div>
  );
}
