'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { errMsg } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function NewSupplierPage() {
  const router=useRouter();
  const { canCreateMaster }=usePermissions();
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [form,setForm]=useState({name:'',taxId:'',currency:'PEN',paymentTermsDays:30,contactName:'',contactEmail:'',contactPhone:''});
  const set=(f:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>setForm(p=>({...p,[f]:e.target.value}));

  if(!canCreateMaster) return <div style={{padding:24,background:'#FFF8E1',borderRadius:14,color:'#E65100',fontSize:13}}>Sin permisos.</div>;

  const handleSubmit=async(e:React.FormEvent)=>{ e.preventDefault();setLoading(true);setError('');
    try{await authClient.post('/suppliers',{...form,paymentTermsDays:Number(form.paymentTermsDays),contactName:form.contactName,contactEmail:form.contactEmail,contactPhone:form.contactPhone});router.push('/suppliers');}
    catch(ex){setError(errMsg(ex));setLoading(false);}
  };

  return (
    <div className="mx-fade-in" style={{maxWidth:640}}>
      <div className="mx-page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/suppliers" className="mx-btn mx-btn-secondary" style={{padding:'8px 12px'}}><ArrowLeft size={15}/></Link>
          <div><h1 className="mx-page-title">Nuevo proveedor</h1><p className="mx-page-subtitle">Registra un proveedor o acreedor</p></div>
        </div>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mx-form-card">
          <div className="mx-form-title">Datos principales</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div style={{gridColumn:'1/-1'}}><label className="mx-label">Razón social *</label><input className="mx-input" value={form.name} onChange={set('name')} required placeholder="Empresa S.A.C."/></div>
            <div><label className="mx-label">RUC *</label><input className="mx-input" value={form.taxId} onChange={set('taxId')} required placeholder="20XXXXXXXXX"/></div>
            <div><label className="mx-label">Plazo de pago (días)</label><input type="number" className="mx-input" value={form.paymentTermsDays} onChange={set('paymentTermsDays')} min={0}/></div>
            <div><label className="mx-label">Moneda</label><select className="mx-select" value={form.currency} onChange={set('currency')}><option value="PEN">PEN — Soles</option><option value="USD">USD — Dólares</option></select></div>
          </div>
        </div>
        <div className="mx-form-card">
          <div className="mx-form-title">Contacto</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div><label className="mx-label">Nombre</label><input className="mx-input" value={form.contactName} onChange={set('contactName')} placeholder="Juan Pérez"/></div>
            <div><label className="mx-label">Email</label><input type="email" className="mx-input" value={form.contactEmail} onChange={set('contactEmail')} placeholder="contacto@empresa.pe"/></div>
            <div><label className="mx-label">Teléfono</label><input className="mx-input" value={form.contactPhone} onChange={set('contactPhone')} placeholder="+51 9XX XXX XXX"/></div>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
          <Link href="/suppliers" className="mx-btn mx-btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="mx-btn mx-btn-primary">{loading?'Guardando…':'Crear proveedor'}</button>
        </div>
      </form>
    </div>
  );
}
