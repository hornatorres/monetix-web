'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

interface Sub { id:string;clientName:string;clientRucDni:string;productName:string;productCode:string;type:string;billingMode:string;quantity:number;unitPrice:number;currency:string;startDate:string;nextBillingDate:string|null;status:string;autoRenew:boolean;firstInvoiceDone:boolean;cancelledAt:string|null;cancellationReason:string|null;notes:string|null; }
const SB: Record<string,string> = { ACTIVE:'mx-badge mx-badge-success',PAUSED:'mx-badge mx-badge-warning',CANCELLED:'mx-badge mx-badge-danger',EXPIRED:'mx-badge mx-badge-neutral' };
const SL: Record<string,string> = { ACTIVE:'Activa',PAUSED:'Pausada',CANCELLED:'Cancelada',EXPIRED:'Expirada' };

export default function SubscriptionDetailPage() {
  const { id }=useParams<{id:string}>();
  const { canPauseSubscription, canCancelSubscription }=usePermissions();
  const [sub,setSub]=useState<Sub|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [acting,setActing]=useState('');

  useEffect(()=>{ authClient.get(`/subscriptions/${id}`).then(r=>setSub(r.data)).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); },[id]);

  const handle=async(endpoint:string,body?:any,key?:string)=>{ setActing(key??endpoint);setError('');
    try{const r=await authClient.patch(`/subscriptions/${id}/${endpoint}`,body??{});setSub(r.data?.subscription??r.data);}catch(ex){setError(errMsg(ex));}finally{setActing('');}
  };
  const handleCancel=async()=>{ const reason=prompt('Motivo de cancelación:');if(!reason?.trim())return;await handle('cancel',{reason,timing:'END_OF_PERIOD'},'cancel'); };

  if(loading) return <div className="mx-skeleton" style={{height:280,borderRadius:16,maxWidth:640}}/>;
  if(!sub) return <div className="mx-alert mx-alert-error">{error||'Suscripción no encontrada'}</div>;

  return (
    <div className="mx-fade-in" style={{maxWidth:640}}>
      <div className="mx-page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/subscriptions" className="mx-btn mx-btn-secondary" style={{padding:'8px 12px'}}><ArrowLeft size={15}/></Link>
          <div><h1 className="mx-page-title">{sub.clientName}</h1><p className="mx-page-subtitle">{sub.productName}</p></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span className={SB[sub.status]??'mx-badge mx-badge-neutral'}>{SL[sub.status]??sub.status}</span>
          {sub.status==='ACTIVE'&&canPauseSubscription&&<button onClick={()=>handle('pause',{},'pause')} disabled={!!acting} className="mx-btn mx-btn-secondary" style={{fontSize:12}}>{acting==='pause'?'Pausando…':'Pausar'}</button>}
          {sub.status==='PAUSED'&&canPauseSubscription&&<button onClick={()=>handle('resume',{},'resume')} disabled={!!acting} className="mx-btn mx-btn-primary" style={{fontSize:12}}>{acting==='resume'?'Reactivando…':'Reactivar'}</button>}
          {['ACTIVE','PAUSED'].includes(sub.status)&&canCancelSubscription&&<button onClick={handleCancel} disabled={!!acting} className="mx-btn mx-btn-danger" style={{fontSize:12}}>{acting==='cancel'?'Cancelando…':'Cancelar'}</button>}
        </div>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <div className="mx-form-card">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div><label className="mx-label">Cliente</label><p style={{fontSize:13,fontWeight:500}}>{sub.clientName}</p><p style={{fontSize:11,color:'#86868B'}}>{sub.clientRucDni}</p></div>
          <div><label className="mx-label">Producto</label><p style={{fontSize:13,fontWeight:500}}>{sub.productName}</p><p style={{fontSize:11,color:'#86868B'}}>{sub.productCode}</p></div>
          <div><label className="mx-label">Precio</label><p style={{fontSize:14,fontWeight:700,color:'#0071E3'}}>{formatCurrency(sub.unitPrice,sub.currency)}</p></div>
          <div><label className="mx-label">Tipo / Modalidad</label><p style={{fontSize:13}}>{sub.type} · {sub.billingMode}</p></div>
          <div><label className="mx-label">Inicio</label><p style={{fontSize:13}}>{formatDate(sub.startDate)}</p></div>
          <div><label className="mx-label">Próxima factura</label><p style={{fontSize:13}}>{sub.nextBillingDate?formatDate(sub.nextBillingDate):'—'}</p></div>
          <div><label className="mx-label">Auto-renovación</label><p style={{fontSize:13}}>{sub.autoRenew?'Sí':'No'}</p></div>
          <div><label className="mx-label">Primera factura</label><p style={{fontSize:13}}>{sub.firstInvoiceDone?'Emitida':'Pendiente'}</p></div>
          {sub.cancelledAt&&<div style={{gridColumn:'1/-1'}}><label className="mx-label">Cancelada el</label><p style={{fontSize:13,color:'#FF3B30'}}>{formatDate(sub.cancelledAt)}{sub.cancellationReason&&` — ${sub.cancellationReason}`}</p></div>}
          {sub.notes&&<div style={{gridColumn:'1/-1'}}><label className="mx-label">Notas</label><p style={{fontSize:13,color:'#86868B'}}>{sub.notes}</p></div>}
        </div>
      </div>
    </div>
  );
}
