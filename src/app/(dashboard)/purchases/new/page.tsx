'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface Supplier { id: string; name: string; taxId: string; }
interface Line {
  productName: string; productCode: string; productType: string;
  quantity: number; unitPrice: number; subtotal: number;
}

const IGV = 0.18;

export default function NewPurchasePage() {
  const router = useRouter();

  const [suppliers,   setSuppliers]   = useState<Supplier[]>([]);
  const [supplierId,  setSupplierId]  = useState('');
  const [date,        setDate]        = useState(new Date().toISOString().split('T')[0]);
  const [notes,       setNotes]       = useState('');
  const [lines,       setLines]       = useState<Line[]>([
    { productName: '', productCode: '', productType: 'ONE_TIME', quantity: 1, unitPrice: 0, subtotal: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    authClient.get('/suppliers').then(r => {
      const data = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
      setSuppliers(data);
    }).catch(() => {});
  }, []);

  const updateLine = (i: number, field: keyof Line, value: any) => {
    setLines(prev => {
      const updated = [...prev];
      (updated[i] as any)[field] = value;
      const l = updated[i];
      updated[i].subtotal = Number(l.quantity) * Number(l.unitPrice);
      return updated;
    });
  };

  const addLine    = () => setLines(prev => [...prev,
    { productName: '', productCode: '', productType: 'ONE_TIME', quantity: 1, unitPrice: 0, subtotal: 0 }
  ]);
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));

  const subtotal = lines.reduce((s, l) => s + Number(l.subtotal), 0);
  const igv      = subtotal * IGV;
  const total    = subtotal + igv;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) { setError('Selecciona un proveedor'); return; }
    if (lines.some(l => !l.productName.trim())) { setError('Completa la descripción de todos los ítems'); return; }
    setLoading(true);
    setError('');
    try {
      const supplier = suppliers.find(s => s.id === supplierId)!;
      await authClient.post('/purchases', {
        supplierId,
        supplierName: supplier.name,
        purchaseDate: date,
        currency: 'PEN',
        igvRate: 18,
        notes,
        items: lines.map((l, idx) => ({
          lineOrder:   idx + 1,
          productName: l.productName,
          productCode: l.productCode,
          productType: l.productType,
          quantity:    Number(l.quantity),
          unitPrice:   Number(l.unitPrice),
          subtotal:    Number(l.subtotal),
        })),
      });
      router.push('/purchases');
    } catch (ex) {
      setError(errMsg(ex));
      setLoading(false);
    }
  };

  return (
    <div className="mx-fade-in max-w-3xl">
      <div className="mx-page-header">
        <div className="flex items-center gap-3">
          <Link href="/purchases" className="mx-btn-secondary px-3 py-2"><ArrowLeft size={15} /></Link>
          <h1 className="mx-page-title">Nueva compra</h1>
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mx-card p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Proveedor *</label>
              <select className="mx-select" value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
                <option value="">Seleccionar proveedor…</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} — {s.taxId}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Fecha *</label>
              <input type="date" className="mx-input" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Notas</label>
              <input className="mx-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Referencia, N° de factura del proveedor…" />
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
                <div className="col-span-5">
                  {i === 0 && <label className="block text-xs text-[#86868B] mb-1">Descripción *</label>}
                  <input className="mx-input" placeholder="Producto o servicio"
                    value={line.productName} onChange={e => updateLine(i, 'productName', e.target.value)} required />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs text-[#86868B] mb-1">Cant.</label>}
                  <input type="number" className="mx-input" min="0.01" step="0.01"
                    value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                </div>
                <div className="col-span-3">
                  {i === 0 && <label className="block text-xs text-[#86868B] mb-1">P. Unit.</label>}
                  <input type="number" className="mx-input" min="0" step="0.01"
                    value={line.unitPrice} onChange={e => updateLine(i, 'unitPrice', e.target.value)} />
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
          <Link href="/purchases" className="mx-btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="mx-btn-primary">
            {loading ? 'Guardando…' : 'Crear compra'}
          </button>
        </div>
      </form>
    </div>
  );
}
