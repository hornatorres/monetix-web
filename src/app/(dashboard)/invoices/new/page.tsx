'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface Client { id: string; name: string; taxId: string; address: string; email: string; }
interface Line { productName: string; productCode: string; productType: string; quantity: number; unitPrice: number; discountPct: number; subtotal: number; }
const IGV = 0.18;

function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canCreateInvoice } = usePermissions();

  const [clients, setClients]   = useState<Client[]>([]);
  const [clientId, setClientId] = useState(searchParams.get('clientId') ?? '');
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate]   = useState(() => { const d = new Date(); d.setDate(d.getDate()+30); return d.toISOString().split('T')[0]; });
  const [notes, setNotes]       = useState('');
  const [lines, setLines]       = useState<Line[]>([{ productName:'', productCode:'', productType:'ONE_TIME', quantity:1, unitPrice:0, discountPct:0, subtotal:0 }]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => { authClient.get('/clients').then(r => setClients(r.data)).catch(()=>{}); }, []);

  if (!canCreateInvoice) return <div className="mx-card p-6 text-sm text-[#86868B]">No tienes permisos para crear facturas.</div>;

  const updateLine = (i: number, field: keyof Line, value: any) => {
    setLines(prev => { const u=[...prev]; (u[i] as any)[field]=value; const l=u[i]; u[i].subtotal=Number(l.quantity)*Number(l.unitPrice)*(1-Number(l.discountPct)/100); return u; });
  };
  const addLine    = () => setLines(p => [...p, { productName:'', productCode:'', productType:'ONE_TIME', quantity:1, unitPrice:0, discountPct:0, subtotal:0 }]);
  const removeLine = (i: number) => setLines(p => p.filter((_,idx)=>idx!==i));
  const subtotal   = lines.reduce((s,l)=>s+Number(l.subtotal),0);
  const igv        = subtotal*IGV;
  const total      = subtotal+igv;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { setError('Selecciona un cliente'); return; }
    setLoading(true); setError('');
    try {
      const client = clients.find(c=>c.id===clientId)!;
      await authClient.post('/invoices', { clientId, clientName: client.name, clientRucDni: client.taxId, clientAddress: client.address??'', clientEmail: client.email??'', invoiceDate: date, dueDate, currency:'PEN', igvRate:18, notes, items: lines.map((l,idx)=>({ lineOrder:idx+1, productName:l.productName, productCode:l.productCode, productType:l.productType, quantity:Number(l.quantity), unitPrice:Number(l.unitPrice), discountPct:Number(l.discountPct), subtotal:Number(l.subtotal) })) });
      router.push('/invoices');
    } catch (ex) { setError(errMsg(ex)); setLoading(false); }
  };

  return (
    <div className="mx-fade-in max-w-3xl">
      <div className="mx-page-header">
        <div className="flex items-center gap-3"><Link href="/invoices" className="mx-btn-secondary px-3 py-2"><ArrowLeft size={15} /></Link><h1 className="mx-page-title">Nueva factura</h1></div>
      </div>
      {error && <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mx-card p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-xs font-medium text-[#1D1D1F] mb-1">Cliente *</label><select className="mx-select" value={clientId} onChange={e=>setClientId(e.target.value)} required><option value="">Seleccionar cliente…</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name} — {c.taxId}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-[#1D1D1F] mb-1">Fecha emisión *</label><input type="date" className="mx-input" value={date} onChange={e=>setDate(e.target.value)} required /></div>
            <div><label className="block text-xs font-medium text-[#1D1D1F] mb-1">Vencimiento *</label><input type="date" className="mx-input" value={dueDate} onChange={e=>setDueDate(e.target.value)} required /></div>
            <div className="col-span-2"><label className="block text-xs font-medium text-[#1D1D1F] mb-1">Notas</label><input className="mx-input" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Observaciones…" /></div>
          </div>
        </div>
        <div className="mx-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E5EA] flex items-center justify-between"><h3 className="text-sm font-medium">Líneas</h3><button type="button" onClick={addLine} className="mx-btn-secondary text-xs px-3 py-1.5"><Plus size={13}/> Agregar línea</button></div>
          <div className="p-4 space-y-3">
            {lines.map((line,i)=>(
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">{i===0&&<label className="block text-xs text-[#86868B] mb-1">Descripción *</label>}<input className="mx-input" placeholder="Nombre" value={line.productName} onChange={e=>updateLine(i,'productName',e.target.value)} required /></div>
                <div className="col-span-2">{i===0&&<label className="block text-xs text-[#86868B] mb-1">Cant.</label>}<input type="number" className="mx-input" min="0.01" step="0.01" value={line.quantity} onChange={e=>updateLine(i,'quantity',e.target.value)} /></div>
                <div className="col-span-2">{i===0&&<label className="block text-xs text-[#86868B] mb-1">P. Unit.</label>}<input type="number" className="mx-input" min="0" step="0.01" value={line.unitPrice} onChange={e=>updateLine(i,'unitPrice',e.target.value)} /></div>
                <div className="col-span-2">{i===0&&<label className="block text-xs text-[#86868B] mb-1">Desc. %</label>}<input type="number" className="mx-input" min="0" max="100" step="0.01" value={line.discountPct} onChange={e=>updateLine(i,'discountPct',e.target.value)} /></div>
                <div className="col-span-1">{i===0&&<label className="block text-xs text-[#86868B] mb-1">Total</label>}<p className="text-sm font-medium pt-2">{formatCurrency(line.subtotal)}</p></div>
                <div className="col-span-1 flex justify-end">{lines.length>1&&<button type="button" onClick={()=>removeLine(i)} className="text-[#FF3B30] hover:opacity-70 p-2"><Trash2 size={14}/></button>}</div>
              </div>
            ))}
          </div>
          <div className="px-4 py-4 border-t border-[#E5E5EA] flex justify-end">
            <div className="space-y-1 min-w-48">
              <div className="flex justify-between text-sm"><span className="text-[#86868B]">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#86868B]">IGV (18%)</span><span>{formatCurrency(igv)}</span></div>
              <div className="flex justify-between text-sm font-semibold border-t border-[#E5E5EA] pt-1 mt-1"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-end"><Link href="/invoices" className="mx-btn-secondary">Cancelar</Link><button type="submit" disabled={loading} className="mx-btn-primary">{loading?'Guardando…':'Crear factura'}</button></div>
      </form>
    </div>
  );
}
export default function NewInvoicePage() { return <Suspense><NewInvoiceForm /></Suspense>; }
