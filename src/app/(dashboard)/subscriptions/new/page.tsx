'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { errMsg } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

interface Client  { id: string; name: string; taxId: string; }
interface Product { id: string; name: string; code: string; unitPrice: number; }

export default function NewSubscriptionPage() {
  const router = useRouter();

  const [clients,   setClients]   = useState<Client[]>([]);
  const [products,  setProducts]  = useState<Product[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [form, setForm] = useState({
    clientId: '', productId: '', type: 'FIXED', billingMode: 'ADVANCE',
    quantity: 1, unitPrice: 0, currency: 'PEN',
    startDate: new Date().toISOString().split('T')[0],
    billingCutoffDay: 1, autoRenew: true, notes: '',
  });

  useEffect(() => {
    Promise.all([
      authClient.get('/clients'),
      authClient.get('/products'),
    ]).then(([c, p]) => {
      setClients(Array.isArray(c.data) ? c.data : c.data?.data ?? []);
      const prods = Array.isArray(p.data) ? p.data : p.data?.data ?? [];
      setProducts(prods.filter((pr: any) => pr.isActive));
    }).catch(() => {});
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setForm(prev => ({ ...prev, productId, unitPrice: product?.unitPrice ?? 0 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) { setError('Selecciona un cliente'); return; }
    if (!form.productId) { setError('Selecciona un producto'); return; }
    setLoading(true); setError('');
    try {
      const client  = clients.find(c => c.id === form.clientId)!;
      const product = products.find(p => p.id === form.productId)!;
      await authClient.post('/subscriptions', {
        ...form,
        clientName:    client.name,
        clientRucDni:  client.taxId,
        productCode:   product.code,
        productName:   product.name,
        quantity:      Number(form.quantity),
        unitPrice:     Number(form.unitPrice),
        billingCutoffDay: Number(form.billingCutoffDay),
      });
      router.push('/subscriptions');
    } catch (ex) { setError(errMsg(ex)); setLoading(false); }
  };

  return (
    <div className="mx-fade-in max-w-2xl">
      <div className="mx-page-header">
        <div className="flex items-center gap-3">
          <Link href="/subscriptions" className="mx-btn-secondary px-3 py-2"><ArrowLeft size={15} /></Link>
          <h1 className="mx-page-title">Nueva suscripción</h1>
        </div>
      </div>

      <div className="mx-card p-6">
        {error && <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Cliente *</label>
              <select className="mx-select" value={form.clientId} onChange={set('clientId')} required>
                <option value="">Seleccionar cliente…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Producto *</label>
              <select className="mx-select" value={form.productId}
                onChange={e => handleProductChange(e.target.value)} required>
                <option value="">Seleccionar producto…</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Tipo</label>
              <select className="mx-select" value={form.type} onChange={set('type')}>
                <option value="FIXED">Fijo</option>
                <option value="METERED">Medido</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Modalidad</label>
              <select className="mx-select" value={form.billingMode} onChange={set('billingMode')}>
                <option value="ADVANCE">Adelantado</option>
                <option value="ARREAR">Vencido</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Precio unitario</label>
              <input type="number" className="mx-input" value={form.unitPrice}
                onChange={set('unitPrice')} min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Cantidad</label>
              <input type="number" className="mx-input" value={form.quantity}
                onChange={set('quantity')} min="1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Fecha inicio</label>
              <input type="date" className="mx-input" value={form.startDate} onChange={set('startDate')} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Día de corte</label>
              <input type="number" className="mx-input" value={form.billingCutoffDay}
                onChange={set('billingCutoffDay')} min="1" max="31" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Notas</label>
              <input className="mx-input" value={form.notes} onChange={set('notes')} placeholder="Observaciones…" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="autoRenew" checked={form.autoRenew}
                onChange={e => setForm(prev => ({ ...prev, autoRenew: e.target.checked }))}
                className="w-4 h-4" />
              <label htmlFor="autoRenew" className="text-sm">Auto-renovación activada</label>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Link href="/subscriptions" className="mx-btn-secondary">Cancelar</Link>
            <button type="submit" disabled={loading} className="mx-btn-primary">
              {loading ? 'Guardando…' : 'Crear suscripción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
