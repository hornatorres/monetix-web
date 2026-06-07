'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react';

interface Client  { id:string; name:string; taxId:string; address:string; email:string; }
interface Product { id:string; code:string; name:string; unitPrice:number; type:string; }
interface Line    { productName:string; productCode:string; productType:string; quantity:number; unitPrice:number; discountPct:number; subtotal:number; }

const IGV = 0.18;

// ── Product search input ──────────────────────────────────────

function ProductSearch({ value, onChange, onSelect, products }: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (p: Product) => void;
  products: Product[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(value.toLowerCase()) ||
    p.code.toLowerCase().includes(value.toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        border: `1px solid ${open ? '#0071E3' : '#E5E5EA'}`,
        borderRadius: 12, padding: '9px 12px',
        background: '#fff',
        boxShadow: open ? '0 0 0 3px rgba(0,113,227,0.12)' : 'none',
        transition: 'border-color 0.15s',
      }}>
        <Search size={14} color="#86868B" />
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Busca o escribe descripción…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent', fontFamily: 'inherit' }}
        />
      </div>
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: '#fff', border: '0.5px solid #E5E5EA', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 50, overflow: 'hidden',
        }}>
          {filtered.map(p => (
            <button key={p.id} onMouseDown={() => { onSelect(p); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
                borderBottom: '0.5px solid #F2F2F7', fontFamily: 'inherit', textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F9F9FB')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F' }}>{p.name}</p>
                <p style={{ fontSize: 11, color: '#86868B', marginTop: 1 }}>{p.code}</p>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0071E3' }}>{formatCurrency(p.unitPrice)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Form ──────────────────────────────────────────────────────

function NewInvoiceForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { canCreateInvoice } = usePermissions();

  const [clients,  setClients]  = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientId, setClientId] = useState(searchParams.get('clientId') ?? '');
  const [clientQ,  setClientQ]  = useState('');
  const [showClientDD, setShowClientDD] = useState(false);
  const [date,     setDate]     = useState(new Date().toISOString().split('T')[0]);
  const [dueDate,  setDueDate]  = useState(() => { const d = new Date(); d.setDate(d.getDate()+30); return d.toISOString().split('T')[0]; });
  const [notes,    setNotes]    = useState('');
  const [lines,    setLines]    = useState<Line[]>([
    { productName:'', productCode:'', productType:'ONE_TIME', quantity:1, unitPrice:0, discountPct:0, subtotal:0 }
  ]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const clientRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      authClient.get('/clients'),
      authClient.get('/products'),
    ]).then(([c, p]) => {
      setClients(Array.isArray(c.data) ? c.data : []);
      setProducts((Array.isArray(p.data) ? p.data : p.data?.data ?? []).filter((pr: any) => pr.isActive));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (clientId) {
      const c = clients.find(c => c.id === clientId);
      if (c) setClientQ(c.name);
    }
  }, [clientId, clients]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setShowClientDD(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!canCreateInvoice) return (
    <div style={{ padding: 24, background: '#FFF8E1', borderRadius: 14, color: '#E65100', fontSize: 13 }}>
      No tienes permisos para crear facturas.
    </div>
  );

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientQ.toLowerCase()) || c.taxId.includes(clientQ)
  ).slice(0, 6);

  const updateLine = (i: number, field: keyof Line, value: any) => {
    setLines(prev => {
      const u = [...prev];
      (u[i] as any)[field] = value;
      u[i].subtotal = Number(u[i].quantity) * Number(u[i].unitPrice) * (1 - Number(u[i].discountPct) / 100);
      return u;
    });
  };

  const selectProduct = (i: number, p: Product) => {
    setLines(prev => {
      const u = [...prev];
      u[i] = { ...u[i], productName: p.name, productCode: p.code, productType: p.type, unitPrice: p.unitPrice };
      u[i].subtotal = Number(u[i].quantity) * p.unitPrice * (1 - Number(u[i].discountPct) / 100);
      return u;
    });
  };

  const addLine    = () => setLines(p => [...p, { productName:'', productCode:'', productType:'ONE_TIME', quantity:1, unitPrice:0, discountPct:0, subtotal:0 }]);
  const removeLine = (i: number) => setLines(p => p.filter((_, idx) => idx !== i));

  const subtotal = lines.reduce((s, l) => s + Number(l.subtotal), 0);
  const igv      = subtotal * IGV;
  const total    = subtotal + igv;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { setError('Selecciona un cliente'); return; }
    if (lines.some(l => !l.productName.trim())) { setError('Completa la descripción de todos los ítems'); return; }
    setLoading(true); setError('');
    try {
      const client = clients.find(c => c.id === clientId)!;
      await authClient.post('/invoices', {
        clientId, clientName: client.name, clientRucDni: client.taxId,
        clientAddress: client.address ?? '', clientEmail: client.email ?? '',
        invoiceDate: date, dueDate, currency: 'PEN', igvRate: 18, notes,
        items: lines.map((l, idx) => ({
          lineOrder: idx+1, productName: l.productName, productCode: l.productCode,
          productType: l.productType, quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice), discountPct: Number(l.discountPct), subtotal: Number(l.subtotal),
        })),
      });
      router.push('/invoices');
    } catch (ex) { setError(errMsg(ex)); setLoading(false); }
  };

  const selectedClient = clients.find(c => c.id === clientId);

  return (
    <div className="mx-fade-in" style={{ maxWidth: 800 }}>
      <div className="mx-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/invoices" className="mx-btn mx-btn-secondary" style={{ padding: '8px 12px' }}><ArrowLeft size={15}/></Link>
          <div><h1 className="mx-page-title">Nueva factura</h1><p className="mx-page-subtitle">Completa los datos del documento</p></div>
        </div>
      </div>

      {error && <div className="mx-alert mx-alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit}>

        {/* Sección: Cliente */}
        <div className="mx-form-card">
          <div className="mx-form-title">Cliente</div>

          {/* Client search */}
          <div ref={clientRef} style={{ position: 'relative', marginBottom: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              border: `1px solid ${showClientDD ? '#0071E3' : '#E5E5EA'}`,
              borderRadius: 12, padding: '9px 12px', background: '#fff',
              boxShadow: showClientDD ? '0 0 0 3px rgba(0,113,227,0.12)' : 'none',
            }}>
              <Search size={14} color="#86868B" />
              <input
                value={clientQ}
                onChange={e => { setClientQ(e.target.value); setClientId(''); setShowClientDD(true); }}
                onFocus={() => setShowClientDD(true)}
                placeholder="Escribe nombre o RUC del cliente…"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent', fontFamily: 'inherit' }}
              />
            </div>
            {showClientDD && filteredClients.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                background: '#fff', border: '0.5px solid #E5E5EA', borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 50, overflow: 'hidden',
              }}>
                {filteredClients.map(c => (
                  <button key={c.id} onMouseDown={() => { setClientId(c.id); setClientQ(c.name); setShowClientDD(false); }}
                    style={{ width: '100%', display: 'flex', flexDirection: 'column', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: '0.5px solid #F2F2F7', fontFamily: 'inherit', textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F9F9FB')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F' }}>{c.name}</p>
                    <p style={{ fontSize: 11, color: '#86868B' }}>{c.taxId}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedClient && (
            <div style={{ background: '#F9F9FB', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#86868B' }}>
              <span style={{ color: '#1D1D1F', fontWeight: 500 }}>{selectedClient.name}</span>
              {' · '}{selectedClient.taxId}
              {selectedClient.address && <> · {selectedClient.address}</>}
            </div>
          )}

          {!clientId && (
            <p style={{ fontSize: 12, color: '#0071E3', marginTop: 8 }}>
              ¿Cliente nuevo? <Link href="/clients/new" className="mx-link">Créalo aquí</Link>
            </p>
          )}
        </div>

        {/* Sección: Condiciones */}
        <div className="mx-form-card">
          <div className="mx-form-title">Condiciones</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label className="mx-label">Fecha de emisión</label>
              <input type="date" className="mx-input" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="mx-label">Fecha de vencimiento</label>
              <input type="date" className="mx-input" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
            </div>
            <div>
              <label className="mx-label">IGV (%)</label>
              <input className="mx-input" value="18" readOnly style={{ background: '#F9F9FB', color: '#86868B' }} />
            </div>
          </div>
        </div>

        {/* Sección: Productos */}
        <div className="mx-form-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid #E5E5EA' }}>
            <div className="mx-form-title" style={{ margin: 0 }}>Productos / Servicios</div>
            <button type="button" onClick={addLine} className="mx-btn mx-btn-secondary" style={{ padding: '7px 14px', fontSize: 12 }}>
              <Plus size={13}/> Agregar línea
            </button>
          </div>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 110px 70px 36px', gap: 8, padding: '8px 20px', background: '#FAFAFA', borderBottom: '0.5px solid #E5E5EA' }}>
            {['Código','Descripción','Cantidad','P. Unit.','Desc. %',''].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 600, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
            ))}
          </div>

          {/* Lines */}
          <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lines.map((line, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 110px 70px 36px', gap: 8, alignItems: 'center' }}>
                <input
                  className="mx-input" placeholder="SVC"
                  value={line.productCode}
                  onChange={e => updateLine(i, 'productCode', e.target.value)}
                  style={{ padding: '8px 10px', fontSize: 12 }}
                />
                <ProductSearch
                  value={line.productName}
                  onChange={v => updateLine(i, 'productName', v)}
                  onSelect={p => selectProduct(i, p)}
                  products={products}
                />
                <input type="number" className="mx-input" min="0.01" step="0.01"
                  value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)}
                  style={{ padding: '8px 10px', fontSize: 12, textAlign: 'right' }}
                />
                <input type="number" className="mx-input" min="0" step="0.01"
                  value={line.unitPrice} onChange={e => updateLine(i, 'unitPrice', e.target.value)}
                  style={{ padding: '8px 10px', fontSize: 12, textAlign: 'right' }}
                />
                <input type="number" className="mx-input" min="0" max="100" step="0.01"
                  value={line.discountPct} onChange={e => updateLine(i, 'discountPct', e.target.value)}
                  style={{ padding: '8px 10px', fontSize: 12, textAlign: 'right' }}
                />
                {lines.length > 1 ? (
                  <button type="button" onClick={() => removeLine(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={14}/>
                  </button>
                ) : <div />}
              </div>
            ))}
          </div>

          {/* Totales */}
          <div style={{ borderTop: '0.5px solid #E5E5EA', padding: '16px 20px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ minWidth: 220 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: '#86868B' }}>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: '#86868B' }}>IGV (18%)</span>
                <span>{formatCurrency(igv)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, borderTop: '0.5px solid #E5E5EA', paddingTop: 8, marginTop: 4 }}>
                <span>Total</span>
                <span style={{ color: '#0071E3' }}>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notas */}
        <div className="mx-form-card">
          <div className="mx-form-title">Notas</div>
          <textarea className="mx-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones opcionales…" style={{ resize: 'none' }} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <Link href="/invoices" className="mx-btn mx-btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="mx-btn mx-btn-primary" style={{ minWidth: 140 }}>
            {loading ? 'Guardando…' : 'Crear factura'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewInvoicePage() {
  return <Suspense><NewInvoiceForm /></Suspense>;
}
