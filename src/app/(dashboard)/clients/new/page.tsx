'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { errMsg } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function NewClientPage() {
  const router=useRouter();
  const { canCreateMaster }=usePermissions();
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [form,setForm]=useState({name:'',taxId:'',email:'',phone:'',address:'',notes:''});
  const set=(f:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setForm(p=>({...p,[f]:e.target.value}));

  if(!canCreateMaster) return <div style={{padding:24,background:'#FFF8E1',borderRadius:14,color:'#E65100',fontSize:13}}>No tienes permisos para crear clientes.</div>;

  const handleSubmit=async(e:React.FormEvent)=>{ e.preventDefault();setLoading(true);setError('');
    try{await authClient.post('/clients',form);router.push('/clients');}
    catch(ex){setError(errMsg(ex));setLoading(false);}
  };

  return (
    <div className="mx-fade-in" style={{maxWidth:640}}>
      <div className="mx-page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/clients" className="mx-btn mx-btn-secondary" style={{padding:'8px 12px'}}><ArrowLeft size={15}/></Link>
          <div><h1 className="mx-page-title">Nuevo cliente</h1><p className="mx-page-subtitle">Registra un nuevo cliente en tu cartera</p></div>
        </div>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mx-form-card">
          <div className="mx-form-title">Datos del cliente</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div style={{gridColumn:'1/-1'}}><label className="mx-label">Nombre / Razón social *</label><input className="mx-input" value={form.name} onChange={set('name')} required placeholder="Empresa SAC"/></div>
            <div><label className="mx-label">RUC / DNI *</label><input className="mx-input" value={form.taxId} onChange={set('taxId')} required placeholder="20XXXXXXXXX"/></div>
            <div><label className="mx-label">Teléfono</label><input className="mx-input" value={form.phone} onChange={set('phone')} placeholder="9XXXXXXXX"/></div>
            <div style={{gridColumn:'1/-1'}}><label className="mx-label">Email</label><input type="email" className="mx-input" value={form.email} onChange={set('email')} placeholder="contacto@empresa.pe"/></div>
            <div style={{gridColumn:'1/-1'}}><label className="mx-label">Dirección</label><input className="mx-input" value={form.address} onChange={set('address')} placeholder="Av. Principal 123, Lima"/></div>
            <div style={{gridColumn:'1/-1'}}><label className="mx-label">Notas</label><textarea className="mx-input" rows={2} value={form.notes} onChange={set('notes')} placeholder="Información adicional…" style={{resize:'none'}}/></div>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
          <Link href="/clients" className="mx-btn mx-btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="mx-btn mx-btn-primary">{loading?'Guardando…':'Crear cliente'}</button>
        </div>
      </form>
    </div>
  );
}
