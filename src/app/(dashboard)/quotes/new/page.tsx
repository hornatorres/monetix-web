'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface Client { id: string; name: string; taxId: string; address: string; email: string; }
interface Line {
  product_name: string; product_code: string;
  quantity: number; unit_price: number; discount_pct: number; subtotal: number;
}

const IGV = 0.18;

export default function NewQuotePage() {
  const router = useRouter();
  const [clients,   setClients]   = useState<Client[]>([]);
  const [clientId,  setClientId]  = useState('');
  const [date,      setDate]      = useState(new Date().toISOString().split('T')[0]);
  const [validUntil,setValidUntil]= useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [notes,     setNotes]     = useState('');
  const [conditions,setConditions]= useState('');
  const [lines,     setLines]     = useState<Line[]>([
    { product_name: '', product_code: '', quantity: 1, unit_price: 0, discount_pct: 0, subtotal: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    authClient.get('/clients').then(r => setClients(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const updateLine = (i: number, field: keyof Line, value: any) => {
    setLines(prev => {
      const updated = [...prev];
      (updated[i] as any)[field] = value;
      const l = updated[i];
      updated[i].subtotal = Number(l.quantity) * Number(l.unit_price) * (1 - Number(l.discount_pct) / 100);
      return updated;
    });
  };

  const addLine    = () => setLines(prev => [...prev,
    { product_name: '', product_code: '', quantity: 1, unit_price: 0, discount_pct: 0, subtotal: 0 }
  ]);
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));

  const subtotal = lines.reduce((s, l) => s + Number(l.subtotal), 0);
  const igv      = subtotal * IGV;
  const total    = subtotal + igv;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { setError('Selecciona un cliente'); return; }
    if (lines.some(l => !l.product_name.trim())) { setError('Completa la descripción de todos los ítems'); return; }
    setLoading(true); setError('');
    try {
      const client = clients.find(c => c.id === clientId)!;
      await authClient.post('/quotes', {
        clientId,
        clientName:    client.name,
        clientRucDni:  client.taxId,
        clientAddress: client.address ?? '',
        clientEmail:   client.email ?? '',
        quoteDate:     date,
        validUntil,
        currency:      'PEN',
        igvRate:       0.18,
        notes:         notes || null,
        conditions:    conditions || null,
        items: lines.map((l, idx) => ({
          lineOrder:    idx + 1,
          productName:  l.product_name,
          productCode:  l.product_code || null,
          quantity:     Number(l.quantity),
          unitPrice:    Number(l.unit_price),
          discountPct:  Number(l.discount_pct),
          subtotal:     Number(l.subtotal),
        })),
      });
      router.push('/quotes');
    } catch (ex) { setError(errMsg(ex)); setLoading(false); }
  };

  return (
    <div className="mx-fade-in max-w-3xl">
      <div className="mx-page-header">
        <div className="flex items-center gap-3">
          <Link href="/quotes" className="mx-btn-secondary px-3 py-2"><ArrowLeft size={15} /></Link>
          <h1 className="mx-page-title">Nueva cotización</h1>
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mx-card p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Cliente *</label>
              <select className="mx-select" value={clientId} onChange={e => setClientId(e.target.value)} required>
                <option value="">Seleccionar cliente…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.taxId}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Fecha *</label>
              <input type="date" className="mx-input" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Válida hasta *</label>
              <input type="date" className="mx-input" value={validUntil} onChange={e => setValidUntil(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Notas</label>
              <input className="mx-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Condiciones</label>
              <input className="mx-input" value={conditions} onChange={e => setConditions(e.target.value)} placeholder="Condiciones de pago…" />
            </div>
          </div>
        </div>

        <div className="mx-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E5EA] flex items-center justify-between">
            <h3 className="text-sm font-medium">Ítems</h3>
            <button type="button" onClick={addLine} className="mx-btn-secondary text-xs px-3 py-1.5">
              <Plus size={13} /> Agregar ítem
            </button>
          </div>
          <div className="p-4 space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  {i === 0 && <label className="block text-xs text-[#86868B] mb-1">Descripción *</label>}
                  <input className="mx-input" placeholder="Producto o servicio"
                    value={line.product_name} onChange={e => updateLine(i, 'product_name', e.target.value)} required />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs text-[#86868B] mb-1">Cant.</label>}
                  <input type="number" className="mx-input" min="0.01" step="0.01"
                    value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs text-[#86868B] mb-1">P. Unit.</label>}
                  <input type="number" className="mx-input" min="0" step="0.01"
                    value={line.unit_price} onChange={e => updateLine(i, 'unit_price', e.target.value)} />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs text-[#86868B] mb-1">Desc. %</label>}
                  <input type="number" className="mx-input" min="0" max="100" step="0.01"
                    value={line.discount_pct} onChange={e => updateLine(i, 'discount_pct', e.target.value)} />
                </div>
                <div className="col-span-1">
                  {i === 0 && <label className="block text-xs text-[#86868B] mb-1">Total</label>}
                  <p className="text-sm font-medium pt-2">{formatCurrency(line.subtotal)}</p>
                </div>
                <div className="col-span-1 flex justify-end">
                  {lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(i)} className="text-[#FF3B30] hover:opacity-70 p-2">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-4 border-t border-[#E5E5EA] flex justify-end">
            <div className="space-y-1 min-w-48">
              <div className="flex justify-between text-sm">
                <span className="text-[#86868B]">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#86868B]">IGV (18%)</span>
                <span>{formatCurrency(igv)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-[#E5E5EA] pt-1 mt-1">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Link href="/quotes" className="mx-btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="mx-btn-primary">
            {loading ? 'Guardando…' : 'Crear cotización'}
          </button>
        </div>
      </form>
    </div>
  );
}
