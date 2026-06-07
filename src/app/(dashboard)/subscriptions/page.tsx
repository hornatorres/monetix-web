'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { Plus, Search } from 'lucide-react';

interface Sub { id:string;clientName:string;productName:string;unitPrice:number;currency:string;startDate:string;nextBillingDate:string|null;status:string; }
const SB: Record<string,string> = { ACTIVE:'mx-badge mx-badge-success',PAUSED:'mx-badge mx-badge-warning',CANCELLED:'mx-badge mx-badge-danger',EXPIRED:'mx-badge mx-badge-neutral' };
const SL: Record<string,string> = { ACTIVE:'Activa',PAUSED:'Pausada',CANCELLED:'Cancelada',EXPIRED:'Expirada' };

export default function SubscriptionsPage() {
  const [all,setAll]=useState<Sub[]>([]);
  const [q,setQ]=useState('');
  const [status,setStatus]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const { canCreateSubscription } = usePermissions();

  useEffect(()=>{ authClient.get('/subscriptions').then(r=>setAll(Array.isArray(r.data)?r.data:r.data?.data??[])).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); },[]);

  const filtered=all.filter(s=>(!q||s.clientName.toLowerCase().includes(q.toLowerCase())||s.productName.toLowerCase().includes(q))&&(!status||s.status===status));

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <div><h1 className="mx-page-title">Suscripciones</h1><p className="mx-page-subtitle">Contratos recurrentes activos</p></div>
        {canCreateSubscription&&<Link href="/subscriptions/new" className="mx-btn mx-btn-primary"><Plus size={15}/>Nueva suscripción</Link>}
      </div>
      <div style={{display:'flex',gap:12,marginBottom:16}}>
        <div className="mx-searchbar" style={{flex:1}}><Search size={15} color="#86868B"/><input placeholder="Buscar por cliente o producto…" value={q} onChange={e=>setQ(e.target.value)}/></div>
        <select className="mx-select" style={{width:180}} value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(SL).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <div className="mx-card-section">
        {loading?(<div style={{padding:16,display:'flex',flexDirection:'column',gap:8}}>{[1,2,3].map(i=><div key={i} className="mx-skeleton" style={{height:44,borderRadius:8}}/>)}</div>)
        :filtered.length===0?(<div className="mx-empty">{q||status?'Sin resultados':'No hay suscripciones registradas'}</div>):(
          <table className="mx-table">
            <thead><tr><th>Cliente</th><th>Producto</th><th>Precio</th><th>Inicio</th><th>Próx. factura</th><th>Estado</th></tr></thead>
            <tbody>
              {filtered.map(s=>(
                <tr key={s.id}>
                  <td><Link href={`/subscriptions/${s.id}`} className="mx-link" style={{fontWeight:500}}>{s.clientName}</Link></td>
                  <td style={{color:'#86868B'}}>{s.productName}</td>
                  <td style={{fontWeight:600}}>{formatCurrency(s.unitPrice,s.currency)}</td>
                  <td style={{color:'#86868B'}}>{formatDate(s.startDate)}</td>
                  <td style={{color:'#86868B'}}>{s.nextBillingDate?formatDate(s.nextBillingDate):'—'}</td>
                  <td><span className={SB[s.status]??'mx-badge mx-badge-neutral'}>{SL[s.status]??s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!loading&&filtered.length>0&&<p style={{fontSize:11,color:'#86868B',marginTop:8,paddingLeft:4}}>{filtered.length} suscripción(es)</p>}
    </div>
  );
}
