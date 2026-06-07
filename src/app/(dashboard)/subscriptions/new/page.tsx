'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { errMsg } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

interface Client  { id:string;name:string;taxId:string; }
interface Product { id:string;name:string;code:string;unitPrice:number; }

export default function NewSubscriptionPage() {
  const router=useRouter();
  const { canCreateSubscription }=usePermissions();
  const [clients,setClients]=useState<Client[]>([]);
  const [products,setProducts]=useState<Product[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [form,setForm]=useState({clientId:'',productId:'',type:'FIXED',billingMode:'ADVANCE',quantity:1,unitPrice:0,currency:'PEN',startDate:new Date().toISOString().split('T')[0],billingCutoffDay:1,autoRenew:true,notes:''});
  const set=(f:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setForm(p=>({...p,[f]:e.target.value}));

  useEffect(()=>{ Promise.all([authClient.get('/clients'),authClient.get('/products')]).then(([c,p])=>{setClients(Array.isArray(c.data)?c.data:c.data?.data??[]);const prods=Array.isArray(p.data)?p.data:p.data?.data??[];setProducts(prods.filter((pr:any)=>pr.isActive));}).catch(()=>{}); },[]);

  if(!canCreateSubscription) return <div style={{padding:24,background:'#FFF8E1',borderRadius:14,color:'#E65100',fontSize:13}}>Sin permisos.</div>;

  const handleProductChange=(productId:string)=>{ const p=products.find(p=>p.id===productId);setForm(prev=>({...prev,productId,unitPrice:p?.unitPrice??0})); };

  const handleSubmit=async(e:React.FormEvent)=>{ e.preventDefault();if(!form.clientId){setError('Selecciona un cliente');return;}if(!form.productId){setError('Selecciona un producto');return;}setLoading(true);setError('');
    try{const c=clients.find(c=>c.id===form.clientId)!;const p=products.find(p=>p.id===form.productId)!;await authClient.post('/subscriptions',{...form,clientName:c.name,clientRucDni:c.taxId,productCode:p.code,productName:p.name,quantity:Number(form.quantity),unitPrice:Number(form.unitPrice),billingCutoffDay:Number(form.billingCutoffDay)});router.push('/subscriptions');}
    catch(ex){setError(errMsg(ex));setLoading(false);}
  };

  return (
    <div className="mx-fade-in" style={{maxWidth:640}}>
      <div className="mx-page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/subscriptions" className="mx-btn mx-btn-secondary" style={{padding:'8px 12px'}}><ArrowLeft size={15}/></Link>
          <div><h1 className="mx-page-title">Nueva suscripción</h1><p className="mx-page-subtitle">Contrato de servicio recurrente</p></div>
        </div>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mx-form-card">
          <div className="mx-form-title">Datos de la suscripción</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div style={{gridColumn:'1/-1'}}><label className="mx-label">Cliente *</label><select className="mx-select" value={form.clientId} onChange={set('clientId')} required><option value="">Seleccionar cliente…</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div style={{gridColumn:'1/-1'}}><label className="mx-label">Producto *</label><select className="mx-select" value={form.productId} onChange={e=>handleProductChange(e.target.value)} required><option value="">Seleccionar producto…</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}</select></div>
            <div><label className="mx-label">Tipo</label><select className="mx-select" value={form.type} onChange={set('type')}><option value="FIXED">Fijo</option><option value="METERED">Medido</option></select></div>
            <div><label className="mx-label">Modalidad</label><select className="mx-select" value={form.billingMode} onChange={set('billingMode')}><option value="ADVANCE">Adelantado</option><option value="ARREAR">Vencido</option></select></div>
            <div><label className="mx-label">Precio unitario</label><input type="number" className="mx-input" value={form.unitPrice} onChange={set('unitPrice')} min="0" step="0.01"/></div>
            <div><label className="mx-label">Cantidad</label><input type="number" className="mx-input" value={form.quantity} onChange={set('quantity')} min="1"/></div>
            <div><label className="mx-label">Fecha inicio</label><input type="date" className="mx-input" value={form.startDate} onChange={set('startDate')} required/></div>
            <div><label className="mx-label">Día de corte</label><input type="number" className="mx-input" value={form.billingCutoffDay} onChange={set('billingCutoffDay')} min="1" max="31"/></div>
            <div style={{gridColumn:'1/-1'}}><label className="mx-label">Notas</label><input className="mx-input" value={form.notes} onChange={set('notes')} placeholder="Observaciones…"/></div>
            <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:8}}><input type="checkbox" id="ar" checked={form.autoRenew} onChange={e=>setForm(p=>({...p,autoRenew:e.target.checked}))} style={{width:16,height:16}}/><label htmlFor="ar" style={{fontSize:13,cursor:'pointer'}}>Auto-renovación activada</label></div>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
          <Link href="/subscriptions" className="mx-btn mx-btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="mx-btn mx-btn-primary">{loading?'Guardando…':'Crear suscripción'}</button>
        </div>
      </form>
    </div>
  );
}
