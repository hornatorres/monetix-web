'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { errMsg } from '@/lib/utils';
import { ArrowLeft, Search, Plus } from 'lucide-react';

interface Client  { id:string; name:string; taxId:string; }
interface Product { id:string; name:string; code:string; unitPrice:number; type:string; }

const SUB_TYPES = [
  { value:'FIXED',   label:'Tarifa plana',  hint:'Monto fijo por período independiente del uso.' },
  { value:'METERED', label:'Por consumo',   hint:'Se factura según el uso o consumo registrado.' },
];

function SearchDropdown({ value, onChange, onSelect, items, placeholder, onCreate, createLabel }:{
  value:string; onChange:(v:string)=>void; onSelect:(item:any)=>void;
  items:any[]; placeholder:string; onCreate?:()=>void; createLabel?:string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(value.toLowerCase()) ||
    (i.taxId ?? i.code ?? '').toLowerCase().includes(value.toLowerCase())
  ).slice(0, 7);

  useEffect(() => {
    const h = (e:MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, border:`1px solid ${open?'#0071E3':'#E5E5EA'}`, borderRadius:12, padding:'9px 12px', background:'#fff', boxShadow: open?'0 0 0 3px rgba(0,113,227,0.12)':'none' }}>
        <Search size={14} color="#86868B"/>
        <input value={value} onChange={e=>{ onChange(e.target.value); setOpen(true); }} onFocus={()=>setOpen(true)}
          placeholder={placeholder}
          style={{ flex:1, border:'none', outline:'none', fontSize:13, background:'transparent', fontFamily:'inherit' }}/>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:'#fff', border:'0.5px solid #E5E5EA', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,0.10)', zIndex:50, overflow:'hidden' }}>
          {filtered.map(item => (
            <button key={item.id} onMouseDown={()=>{ onSelect(item); setOpen(false); }}
              style={{ width:'100%', display:'flex', flexDirection:'column', padding:'10px 14px', border:'none', background:'transparent', cursor:'pointer', borderBottom:'0.5px solid #F2F2F7', fontFamily:'inherit', textAlign:'left' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#F9F9FB')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <p style={{ fontSize:13, fontWeight:500, color:'#1D1D1F' }}>{item.name}</p>
              <p style={{ fontSize:11, color:'#86868B' }}>{item.taxId ?? item.code}</p>
            </button>
          ))}
          {filtered.length === 0 && (
            <p style={{ padding:'12px 14px', fontSize:13, color:'#86868B' }}>Sin resultados</p>
          )}
          {onCreate && (
            <button onMouseDown={onCreate}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'10px 14px', border:'none', background:'#F0F7FF', cursor:'pointer', fontFamily:'inherit', color:'#0071E3', fontSize:13, fontWeight:500, borderTop:'0.5px solid #E5E5EA' }}>
              <Plus size={13}/>{createLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function NewSubscriptionPage() {
  const router = useRouter();
  const { canCreateSubscription } = usePermissions();
  const [clients,  setClients]  = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientId,   setClientId]   = useState('');
  const [clientQ,    setClientQ]    = useState('');
  const [productId,  setProductId]  = useState('');
  const [productQ,   setProductQ]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [form, setForm] = useState({
    type:'FIXED', billingMode:'ADVANCE',
    quantity:1, unitPrice:0, currency:'PEN',
    startDate: new Date().toISOString().split('T')[0],
    billingCutoffDay:1, autoRenew:true, notes:'',
  });
  const set = (f:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm(p => ({...p,[f]:e.target.value}));

  useEffect(() => {
    Promise.all([
      authClient.get('/clients'),
      authClient.get('/products'),
    ]).then(([c, p]) => {
      setClients(Array.isArray(c.data) ? c.data : c.data?.data ?? []);
      const prods = Array.isArray(p.data) ? p.data : p.data?.data ?? [];
      setProducts(prods.filter((pr:any) => pr.isActive));
    }).catch(() => {});
  }, []);

  if (!canCreateSubscription) return (
    <div style={{ padding:24, background:'#FFF8E1', borderRadius:14, color:'#E65100', fontSize:13 }}>Sin permisos.</div>
  );

  const handleProductSelect = (p:Product) => {
    setProductId(p.id); setProductQ(p.name);
    setForm(prev => ({...prev, unitPrice: p.unitPrice}));
  };

  const handleSubmit = async (e:React.FormEvent) => {
    e.preventDefault();
    if (!clientId)  { setError('Selecciona un cliente');  return; }
    if (!productId) { setError('Selecciona un producto'); return; }
    setLoading(true); setError('');
    try {
      const client  = clients.find(c => c.id === clientId)!;
      const product = products.find(p => p.id === productId)!;
      await authClient.post('/subscriptions', {
        ...form,
        clientId, clientName: client.name, clientRucDni: client.taxId,
        productId, productCode: product.code, productName: product.name,
        quantity: Number(form.quantity),
        unitPrice: Number(form.unitPrice),
        billingCutoffDay: Number(form.billingCutoffDay),
      });
      router.push('/subscriptions');
    } catch (ex) { setError(errMsg(ex)); setLoading(false); }
  };

  const selectedType = SUB_TYPES.find(t => t.value === form.type);

  return (
    <div className="mx-fade-in" style={{ maxWidth:640 }}>
      <div className="mx-page-header">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Link href="/subscriptions" className="mx-btn mx-btn-secondary" style={{ padding:'8px 12px' }}><ArrowLeft size={15}/></Link>
          <div><h1 className="mx-page-title">Nueva suscripción</h1><p className="mx-page-subtitle">Contrato de servicio recurrente</p></div>
        </div>
      </div>
      {error && <div className="mx-alert mx-alert-error" style={{ marginBottom:16 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Cliente */}
        <div className="mx-form-card">
          <div className="mx-form-title">Cliente</div>
          <SearchDropdown
            value={clientQ} onChange={v => { setClientQ(v); setClientId(''); }}
            onSelect={c => { setClientId(c.id); setClientQ(c.name); }}
            items={clients} placeholder="Busca por nombre o RUC…"
            onCreate={() => window.open('/clients/new','_blank')}
            createLabel="Crear nuevo cliente"
          />
          {clientId && (
            <div style={{ marginTop:8, fontSize:12, color:'#86868B', padding:'6px 10px', background:'#F9F9FB', borderRadius:8 }}>
              ✓ {clients.find(c=>c.id===clientId)?.name} · {clients.find(c=>c.id===clientId)?.taxId}
            </div>
          )}
        </div>

        {/* Producto */}
        <div className="mx-form-card">
          <div className="mx-form-title">Producto / Servicio</div>
          <SearchDropdown
            value={productQ} onChange={v => { setProductQ(v); setProductId(''); }}
            onSelect={handleProductSelect}
            items={products} placeholder="Busca por nombre o código…"
            onCreate={() => window.open('/products/new','_blank')}
            createLabel="Crear nuevo producto"
          />
          {productId && (
            <div style={{ marginTop:8, fontSize:12, color:'#86868B', padding:'6px 10px', background:'#F9F9FB', borderRadius:8 }}>
              ✓ {products.find(p=>p.id===productId)?.name} · {products.find(p=>p.id===productId)?.code}
            </div>
          )}
        </div>

        {/* Condiciones */}
        <div className="mx-form-card">
          <div className="mx-form-title">Condiciones</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              <label className="mx-label">Tipo de cobro *</label>
              <select className="mx-select" value={form.type} onChange={set('type')}>
                {SUB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {selectedType && <p style={{ fontSize:11, color:'#86868B', marginTop:4 }}>{selectedType.hint}</p>}
            </div>
            <div>
              <label className="mx-label">Modalidad</label>
              <select className="mx-select" value={form.billingMode} onChange={set('billingMode')}>
                <option value="ADVANCE">Adelantado</option>
                <option value="ARREAR">Vencido</option>
              </select>
            </div>
            <div>
              <label className="mx-label">Precio unitario</label>
              <input type="number" className="mx-input" value={form.unitPrice} onChange={set('unitPrice')} min="0" step="0.01"/>
            </div>
            <div>
              <label className="mx-label">Cantidad</label>
              <input type="number" className="mx-input" value={form.quantity} onChange={set('quantity')} min="1"/>
            </div>
            <div>
              <label className="mx-label">Fecha de inicio *</label>
              <input type="date" className="mx-input" value={form.startDate} onChange={set('startDate')} required/>
            </div>
            <div>
              <label className="mx-label">Día de corte</label>
              <input type="number" className="mx-input" value={form.billingCutoffDay} onChange={set('billingCutoffDay')} min="1" max="31"/>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label className="mx-label">Notas</label>
              <input className="mx-input" value={form.notes} onChange={set('notes')} placeholder="Observaciones opcionales…"/>
            </div>
            <div style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', gap:8 }}>
              <input type="checkbox" id="ar" checked={form.autoRenew}
                onChange={e => setForm(p => ({...p, autoRenew:e.target.checked}))}
                style={{ width:16, height:16 }}/>
              <label htmlFor="ar" style={{ fontSize:13, cursor:'pointer' }}>Auto-renovación activada</label>
            </div>
          </div>
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
          <Link href="/subscriptions" className="mx-btn mx-btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="mx-btn mx-btn-primary">
            {loading ? 'Guardando…' : 'Crear suscripción'}
          </button>
        </div>
      </form>
    </div>
  );
}
