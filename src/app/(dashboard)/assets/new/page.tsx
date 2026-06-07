'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { errMsg } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function NewAssetPage() {
  const router=useRouter();
  const { canCreateAsset }=usePermissions();
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [form,setForm]=useState({code:'',name:'',description:'',category:'EQUIPMENT',cost:'',currency:'PEN',usefulLifeMonths:60,residualValue:0,depreciationMethod:'LINEAL',purchaseDate:new Date().toISOString().split('T')[0],depreciationStartDate:new Date().toISOString().split('T')[0],accountCodeAsset:'33.3',accountCodeDepreciation:'39.3',accountCodeExpense:'68.1',location:'',serialNumber:'',notes:''});
  const set=(f:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setForm(p=>({...p,[f]:e.target.value}));

  if(!canCreateAsset) return <div style={{padding:24,background:'#FFF8E1',borderRadius:14,color:'#E65100',fontSize:13}}>Sin permisos.</div>;

  const handleSubmit=async(e:React.FormEvent)=>{ e.preventDefault();setLoading(true);setError('');
    try{await authClient.post('/assets',{...form,cost:Number(form.cost),usefulLifeMonths:Number(form.usefulLifeMonths),residualValue:Number(form.residualValue),serialNumber:form.serialNumber||null,location:form.location||null,notes:form.notes||null});router.push('/assets');}
    catch(ex){setError(errMsg(ex));setLoading(false);}
  };

  return (
    <div className="mx-fade-in" style={{maxWidth:720}}>
      <div className="mx-page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/assets" className="mx-btn mx-btn-secondary" style={{padding:'8px 12px'}}><ArrowLeft size={15}/></Link>
          <div><h1 className="mx-page-title">Registrar activo</h1><p className="mx-page-subtitle">Nuevo activo fijo para depreciación</p></div>
        </div>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mx-form-card">
          <div className="mx-form-title">Identificación</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div><label className="mx-label">Código *</label><input className="mx-input" value={form.code} onChange={set('code')} required placeholder="ACT-001"/></div>
            <div><label className="mx-label">Categoría *</label><select className="mx-select" value={form.category} onChange={set('category')}><option value="EQUIPMENT">Equipos</option><option value="VEHICLE">Vehículos</option><option value="FURNITURE">Muebles</option><option value="BUILDING">Edificios</option><option value="SOFTWARE">Software</option><option value="OTHER">Otro</option></select></div>
            <div style={{gridColumn:'1/-1'}}><label className="mx-label">Nombre *</label><input className="mx-input" value={form.name} onChange={set('name')} required placeholder="Laptop Dell XPS 15"/></div>
            <div><label className="mx-label">N° Serie</label><input className="mx-input" value={form.serialNumber} onChange={set('serialNumber')} placeholder="SN-XXXXX"/></div>
            <div><label className="mx-label">Ubicación</label><input className="mx-input" value={form.location} onChange={set('location')} placeholder="Oficina principal"/></div>
          </div>
        </div>
        <div className="mx-form-card">
          <div className="mx-form-title">Valor y depreciación</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div><label className="mx-label">Costo *</label><input type="number" className="mx-input" value={form.cost} onChange={set('cost')} required min="0" step="0.01"/></div>
            <div><label className="mx-label">Moneda</label><select className="mx-select" value={form.currency} onChange={set('currency')}><option value="PEN">PEN</option><option value="USD">USD</option></select></div>
            <div><label className="mx-label">Vida útil (meses) *</label><input type="number" className="mx-input" value={form.usefulLifeMonths} onChange={set('usefulLifeMonths')} required min="1"/></div>
            <div><label className="mx-label">Valor residual</label><input type="number" className="mx-input" value={form.residualValue} onChange={set('residualValue')} min="0" step="0.01"/></div>
            <div><label className="mx-label">Fecha compra *</label><input type="date" className="mx-input" value={form.purchaseDate} onChange={set('purchaseDate')} required/></div>
            <div><label className="mx-label">Inicio depreciación *</label><input type="date" className="mx-input" value={form.depreciationStartDate} onChange={set('depreciationStartDate')} required/></div>
            <div><label className="mx-label">Cuenta activo</label><input className="mx-input" value={form.accountCodeAsset} onChange={set('accountCodeAsset')}/></div>
            <div><label className="mx-label">Cuenta depreciación</label><input className="mx-input" value={form.accountCodeDepreciation} onChange={set('accountCodeDepreciation')}/></div>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
          <Link href="/assets" className="mx-btn mx-btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="mx-btn mx-btn-primary">{loading?'Guardando…':'Registrar activo'}</button>
        </div>
      </form>
    </div>
  );
}
