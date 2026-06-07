'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { errMsg } from '@/lib/utils';
import { ArrowLeft, Save } from 'lucide-react';

interface Supplier { id:string;name:string;taxId:string;currency:string;paymentTermsDays:number;contactName:string;contactEmail:string;contactPhone:string;isActive:boolean; }

export default function SupplierDetailPage() {
  const { id }=useParams<{id:string}>();
  const { canEditMaster, canDeleteMaster }=usePermissions();
  const [supplier,setSupplier]=useState<Supplier|null>(null);
  const [editing,setEditing]=useState(false);
  const [form,setForm]=useState<Partial<Supplier>>({});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{ authClient.get(`/suppliers/${id}`).then(r=>{setSupplier(r.data);setForm(r.data);}).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); },[id]);

  const set=(f:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>setForm(p=>({...p,[f]:e.target.value}));

  const handleSave=async()=>{ setSaving(true);setError('');
    try{const r=await authClient.put(`/suppliers/${id}`,{name:form.name,taxId:form.taxId,currency:form.currency,paymentTermsDays:Number(form.paymentTermsDays),contactName:form.contactName,contactEmail:form.contactEmail,contactPhone:form.contactPhone});setSupplier(r.data);setEditing(false);}
    catch(ex){setError(errMsg(ex));}finally{setSaving(false);}
  };

  const handleToggle=async()=>{ try{const r=await authClient.patch(`/suppliers/${id}/toggle-active`);setSupplier(r.data);}catch(ex){setError(errMsg(ex));} };

  if(loading) return <div className="mx-skeleton" style={{height:280,borderRadius:16,maxWidth:640}}/>;
  if(!supplier) return <div className="mx-alert mx-alert-error">{error||'Proveedor no encontrado'}</div>;

  return (
    <div className="mx-fade-in" style={{maxWidth:640}}>
      <div className="mx-page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/suppliers" className="mx-btn mx-btn-secondary" style={{padding:'8px 12px'}}><ArrowLeft size={15}/></Link>
          <div><h1 className="mx-page-title">{supplier.name}</h1><p className="mx-page-subtitle">{supplier.taxId}</p></div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {canEditMaster&&<button onClick={handleToggle} className="mx-btn mx-btn-secondary" style={{fontSize:12}}>{supplier.isActive?'Desactivar':'Activar'}</button>}
          {canEditMaster&&!editing&&<button onClick={()=>setEditing(true)} className="mx-btn mx-btn-secondary">Editar</button>}
          {editing&&<><button onClick={()=>setEditing(false)} className="mx-btn mx-btn-secondary">Cancelar</button><button onClick={handleSave} disabled={saving} className="mx-btn mx-btn-primary"><Save size={14}/>{saving?'Guardando…':'Guardar'}</button></>}
        </div>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <div className="mx-form-card">
        <div className="mx-form-title">Datos principales</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {[{label:'Razón social',field:'name'},{label:'RUC',field:'taxId'},{label:'Plazo de pago (días)',field:'paymentTermsDays'},{label:'Contacto',field:'contactName'},{label:'Email',field:'contactEmail'},{label:'Teléfono',field:'contactPhone'}].map(({label,field})=>(
            <div key={field}><label className="mx-label">{label}</label>
              {editing&&canEditMaster?<input className="mx-input" value={(form as any)[field]??''} onChange={set(field)}/>:<p style={{fontSize:13,color:'#1D1D1F'}}>{(supplier as any)[field]||'—'}</p>}
            </div>
          ))}
          <div><label className="mx-label">Estado</label><span className={supplier.isActive?'mx-badge mx-badge-success':'mx-badge mx-badge-neutral'}>{supplier.isActive?'Activo':'Inactivo'}</span></div>
        </div>
      </div>
    </div>
  );
}
