'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { errMsg } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

const PRODUCT_TYPES = [
  { value:'ONE_TIME',     label:'Pago único',           hint:'Se cobra una sola vez. Ej: venta de equipo, consultoría puntual.' },
  { value:'SUBSCRIPTION', label:'Pago por suscripción', hint:'Se cobra de forma recurrente (mensual, anual). Ej: plan de software.' },
  { value:'METERED',      label:'Pago por consumo',     hint:'Se cobra según uso real del período. Ej: horas, GB, transacciones.' },
  { value:'ASSET',        label:'Activo fijo',          hint:'Bien que se activa en Activos Fijos y genera depreciación.' },
];

export default function NewProductPage() {
  const router = useRouter();
  const { canCreateMaster } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [form, setForm] = useState({
    code:'', name:'', description:'', type:'ONE_TIME',
    unitPrice:'', currency:'PEN', igvExempt:false,
    accountCodeIncome:'', accountCodeCogs:'',
  });
  const set = (f:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setForm(p => ({...p,[f]:e.target.value}));

  if (!canCreateMaster) return (
    <div style={{padding:24,background:'#FFF8E1',borderRadius:14,color:'#E65100',fontSize:13}}>Sin permisos.</div>
  );

  const handleSubmit = async (e:React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      await authClient.post('/products', {
        ...form, unitPrice: Number(form.unitPrice),
        accountCodeIncome: form.accountCodeIncome || null,
        accountCodeCogs:   form.accountCodeCogs   || null,
      });
      router.push('/products');
    } catch (ex) { setError(errMsg(ex)); setLoading(false); }
  };

  const selectedType = PRODUCT_TYPES.find(t => t.value === form.type);

  return (
    <div className="mx-fade-in" style={{ maxWidth:640 }}>
      <div className="mx-page-header">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Link href="/products" className="mx-btn mx-btn-secondary" style={{ padding:'8px 12px' }}><ArrowLeft size={15}/></Link>
          <div><h1 className="mx-page-title">Nuevo producto</h1><p className="mx-page-subtitle">Agrega un producto o servicio al catálogo</p></div>
        </div>
      </div>

      {error && <div className="mx-alert mx-alert-error" style={{ marginBottom:16 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="mx-form-card">
          <div className="mx-form-title">Información del producto</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              <label className="mx-label">Código *</label>
              <input className="mx-input" value={form.code} onChange={set('code')} required placeholder="PROD-001"/>
            </div>
            <div>
              <label className="mx-label">Tipo *</label>
              <select className="mx-select" value={form.type} onChange={set('type')}>
                {PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {selectedType && (
                <p style={{ fontSize:11, color:'#86868B', marginTop:4 }}>{selectedType.hint}</p>
              )}
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label className="mx-label">Nombre *</label>
              <input className="mx-input" value={form.name} onChange={set('name')} required placeholder="Nombre del producto o servicio"/>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label className="mx-label">Descripción</label>
              <textarea className="mx-input" rows={2} value={form.description} onChange={set('description')} placeholder="Descripción opcional…" style={{ resize:'none' }}/>
            </div>
            <div>
              <label className="mx-label">Precio unitario *</label>
              <input type="number" className="mx-input" value={form.unitPrice} onChange={set('unitPrice')} required min="0" step="0.01"/>
            </div>
            <div>
              <label className="mx-label">Moneda</label>
              <select className="mx-select" value={form.currency} onChange={set('currency')}>
                <option value="PEN">PEN — Soles</option>
                <option value="USD">USD — Dólares</option>
              </select>
            </div>
            <div>
              <label className="mx-label">Cuenta ingresos</label>
              <input className="mx-input" value={form.accountCodeIncome} onChange={set('accountCodeIncome')} placeholder="70.1"/>
            </div>
            <div>
              <label className="mx-label">Cuenta costo</label>
              <input className="mx-input" value={form.accountCodeCogs} onChange={set('accountCodeCogs')} placeholder="69.1"/>
            </div>
            <div style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', gap:8 }}>
              <input type="checkbox" id="igv" checked={form.igvExempt}
                onChange={e => setForm(p => ({...p,igvExempt:e.target.checked}))}
                style={{ width:16, height:16 }}/>
              <label htmlFor="igv" style={{ fontSize:13, color:'#1D1D1F', cursor:'pointer' }}>Exonerado de IGV</label>
            </div>
          </div>
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
          <Link href="/products" className="mx-btn mx-btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="mx-btn mx-btn-primary">
            {loading ? 'Guardando…' : 'Crear producto'}
          </button>
        </div>
      </form>
    </div>
  );
}
