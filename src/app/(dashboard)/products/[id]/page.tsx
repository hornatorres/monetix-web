'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft, Save } from 'lucide-react';

interface Product { id:string;code:string;name:string;description:string;type:string;unitPrice:number;currency:string;igvExempt:boolean;accountCodeIncome:string|null;accountCodeCogs:string|null;isActive:boolean; }
const TL: Record<string,string> = { ONE_TIME:'Pago único',SUBSCRIPTION:'Pago por suscripción',METERED:'Pago por consumo',ASSET:'Activo fijo' };

export default function ProductDetailPage() {
  const { id }=useParams<{id:string}>();
  const { canEditMaster }=usePermissions();
  const [product,setProduct]=useState<Product|null>(null);
  const [editing,setEditing]=useState(false);
  const [form,setForm]=useState<Partial<Product>>({});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{ authClient.get(`/products/${id}`).then(r=>{setProduct(r.data);setForm(r.data);}).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); },[id]);

  const set=(f:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setForm(p=>({...p,[f]:e.target.value}));

  const handleSave=async()=>{ setSaving(true);setError('');
    try{const r=await authClient.put(`/products/${id}`,{name:form.name,description:form.description,unitPrice:Number(form.unitPrice),accountCodeIncome:form.accountCodeIncome||null,accountCodeCogs:form.accountCodeCogs||null});setProduct(r.data);setEditing(false);}
    catch(ex){setError(errMsg(ex));}finally{setSaving(false);}
  };

  const handleToggle=async()=>{ try{const r=await authClient.patch(`/products/${id}/toggle-active`);setProduct(r.data);}catch(ex){setError(errMsg(ex));} };

  if(loading) return <div className="mx-skeleton" style={{height:280,borderRadius:16,maxWidth:640}}/>;
  if(!product) return <div className="mx-alert mx-alert-error">{error||'Producto no encontrado'}</div>;

  return (
    <div className="mx-fade-in" style={{maxWidth:640}}>
      <div className="mx-page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/products" className="mx-btn mx-btn-secondary" style={{padding:'8px 12px'}}><ArrowLeft size={15}/></Link>
          <div><h1 className="mx-page-title">{product.name}</h1><p className="mx-page-subtitle">{product.code} · {TL[product.type]??product.type}</p></div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {canEditMaster&&<button onClick={handleToggle} className="mx-btn mx-btn-secondary" style={{fontSize:12}}>{product.isActive?'Desactivar':'Activar'}</button>}
          {canEditMaster&&!editing&&<button onClick={()=>setEditing(true)} className="mx-btn mx-btn-secondary">Editar</button>}
          {editing&&<><button onClick={()=>setEditing(false)} className="mx-btn mx-btn-secondary">Cancelar</button><button onClick={handleSave} disabled={saving} className="mx-btn mx-btn-primary"><Save size={14}/>{saving?'Guardando…':'Guardar'}</button></>}
        </div>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <div className="mx-form-card">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div><label className="mx-label">Código</label><p style={{fontSize:13,fontFamily:'monospace'}}>{product.code}</p></div>
          <div><label className="mx-label">Tipo</label><p style={{fontSize:13}}>{TL[product.type]??product.type}</p></div>
          <div style={{gridColumn:'1/-1'}}><label className="mx-label">Nombre</label>{editing&&canEditMaster?<input className="mx-input" value={form.name??''} onChange={set('name')}/>:<p style={{fontSize:13,fontWeight:500}}>{product.name}</p>}</div>
          <div style={{gridColumn:'1/-1'}}><label className="mx-label">Descripción</label>{editing&&canEditMaster?<textarea className="mx-input" rows={2} value={form.description??''} onChange={set('description')} style={{resize:'none'}}/>:<p style={{fontSize:13,color:'#86868B'}}>{product.description||'—'}</p>}</div>
          <div><label className="mx-label">Precio unitario</label>{editing&&canEditMaster?<input type="number" className="mx-input" value={form.unitPrice??''} onChange={set('unitPrice')} min="0" step="0.01"/>:<p style={{fontSize:14,fontWeight:700,color:'#0071E3'}}>{formatCurrency(product.unitPrice,product.currency)}</p>}</div>
          <div><label className="mx-label">IGV</label><p style={{fontSize:13}}>{product.igvExempt?'Exonerado':'Gravado (18%)'}</p></div>
          <div><label className="mx-label">Cuenta ingresos</label>{editing&&canEditMaster?<input className="mx-input" value={form.accountCodeIncome??''} onChange={set('accountCodeIncome')} placeholder="70.1"/>:<p style={{fontSize:13,fontFamily:'monospace'}}>{product.accountCodeIncome||'—'}</p>}</div>
          <div><label className="mx-label">Cuenta costo</label>{editing&&canEditMaster?<input className="mx-input" value={form.accountCodeCogs??''} onChange={set('accountCodeCogs')} placeholder="69.1"/>:<p style={{fontSize:13,fontFamily:'monospace'}}>{product.accountCodeCogs||'—'}</p>}</div>
          <div><label className="mx-label">Estado</label><span className={product.isActive?'mx-badge mx-badge-success':'mx-badge mx-badge-neutral'}>{product.isActive?'Activo':'Inactivo'}</span></div>
        </div>
      </div>
    </div>
  );
}
