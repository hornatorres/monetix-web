'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

interface Asset { id:string;code:string;name:string;category:string;cost:number;currency:string;bookValue:number;accumulatedDepreciation:number;monthlyDepreciation:number;usefulLifeMonths:number;residualValue:number;depreciationMethod:string;purchaseDate:string;depreciationStartDate:string;status:string;location:string|null;serialNumber:string|null;disposedAt:string|null;disposalReason:string|null;accountCodeAsset:string;accountCodeDepreciation:string; }

export default function AssetDetailPage() {
  const { id }=useParams<{id:string}>();
  const router=useRouter();
  const { canDisposeAsset }=usePermissions();
  const [asset,setAsset]=useState<Asset|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [acting,setActing]=useState('');

  useEffect(()=>{ authClient.get(`/assets/${id}`).then(r=>setAsset(r.data)).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); },[id]);

  const handleDispose=async()=>{ const reason=prompt('Motivo de baja:');if(!reason?.trim())return;const disposalDate=prompt('Fecha (YYYY-MM-DD):',new Date().toISOString().split('T')[0]);if(!disposalDate)return;setActing('dispose');
    try{await authClient.post(`/assets/${id}/dispose`,{reason,disposalType:'OBSOLESCENCIA',disposalDate,recoveryAmount:0});router.push('/assets');}catch(ex){setError(errMsg(ex));}finally{setActing(''); }
  };

  if(loading) return <div className="mx-skeleton" style={{height:280,borderRadius:16,maxWidth:720}}/>;
  if(!asset) return <div className="mx-alert mx-alert-error">{error||'Activo no encontrado'}</div>;

  const deprecPct=asset.cost>0?(Number(asset.accumulatedDepreciation)/Number(asset.cost))*100:0;

  return (
    <div className="mx-fade-in" style={{maxWidth:720}}>
      <div className="mx-page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/assets" className="mx-btn mx-btn-secondary" style={{padding:'8px 12px'}}><ArrowLeft size={15}/></Link>
          <div><h1 className="mx-page-title">{asset.name}</h1><p className="mx-page-subtitle">{asset.code} · {asset.category}</p></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span className={asset.status==='ACTIVE'?'mx-badge mx-badge-success':asset.status==='DISPOSED'?'mx-badge mx-badge-neutral':'mx-badge mx-badge-warning'}>{asset.status}</span>
          {asset.status!=='DISPOSED'&&canDisposeAsset&&<button onClick={handleDispose} disabled={!!acting} className="mx-btn mx-btn-danger" style={{fontSize:12}}>{acting?'Procesando…':'Dar de baja'}</button>}
        </div>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
        <div className="mx-kpi"><div className="mx-kpi-label">Costo original</div><div className="mx-kpi-value" style={{fontSize:22}}>{formatCurrency(asset.cost,asset.currency)}</div></div>
        <div className="mx-kpi"><div className="mx-kpi-label">Valor en libros</div><div className="mx-kpi-value" style={{fontSize:22,color:'#0071E3'}}>{formatCurrency(asset.bookValue,asset.currency)}</div></div>
        <div className="mx-kpi">
          <div className="mx-kpi-label">Dep. acumulada</div>
          <div className="mx-kpi-value" style={{fontSize:22,color:'#FF9F0A'}}>{formatCurrency(asset.accumulatedDepreciation,asset.currency)}</div>
          <div className="mx-progress" style={{marginTop:8}}><div className="mx-progress-bar" style={{width:`${Math.min(deprecPct,100)}%`,background:'#FF9F0A'}}/></div>
          <p style={{fontSize:11,color:'#86868B',marginTop:4}}>{deprecPct.toFixed(1)}% depreciado</p>
        </div>
      </div>

      <div className="mx-form-card">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {[{label:'Método',value:asset.depreciationMethod},{label:'Vida útil',value:`${asset.usefulLifeMonths} meses`},{label:'Dep. mensual',value:formatCurrency(asset.monthlyDepreciation,asset.currency)},{label:'Valor residual',value:formatCurrency(asset.residualValue,asset.currency)},{label:'Fecha compra',value:formatDate(asset.purchaseDate)},{label:'Inicio dep.',value:formatDate(asset.depreciationStartDate)},{label:'Ubicación',value:asset.location||'—'},{label:'N° Serie',value:asset.serialNumber||'—'}].map(({label,value})=>(
            <div key={label}><label className="mx-label">{label}</label><p style={{fontSize:13}}>{value}</p></div>
          ))}
          {asset.disposedAt&&<div style={{gridColumn:'1/-1'}}><label className="mx-label">Baja registrada</label><p style={{fontSize:13,color:'#FF3B30'}}>{formatDate(asset.disposedAt)} — {asset.disposalReason}</p></div>}
        </div>
      </div>
    </div>
  );
}
