'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { Plus, Search } from 'lucide-react';

interface Quote { id:string;quote_number:string;client_name:string;quote_date:string;valid_until:string;total_amount:number;currency:string;status:string; }
const SB: Record<string,string> = { DRAFT:'mx-badge mx-badge-neutral',SENT:'mx-badge mx-badge-info',ACCEPTED:'mx-badge mx-badge-success',REJECTED:'mx-badge mx-badge-danger',CONVERTED:'mx-badge mx-badge-purple' };
const SL: Record<string,string> = { DRAFT:'Borrador',SENT:'Enviada',ACCEPTED:'Aceptada',REJECTED:'Rechazada',CONVERTED:'Convertida' };

export default function QuotesPage() {
  const [all,setAll]=useState<Quote[]>([]);
  const [q,setQ]=useState('');
  const [status,setStatus]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const { canCreateQuote } = usePermissions();

  useEffect(()=>{ authClient.get('/quotes').then(r=>setAll(Array.isArray(r.data)?r.data:r.data?.data??[])).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); },[]);

  const filtered=all.filter(qt=>{
    const mq=!q||qt.quote_number.toLowerCase().includes(q.toLowerCase())||qt.client_name.toLowerCase().includes(q.toLowerCase());
    return mq&&(!status||qt.status===status);
  });

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <div><h1 className="mx-page-title">Cotizaciones</h1><p className="mx-page-subtitle">Propuestas y presupuestos</p></div>
        {canCreateQuote&&<Link href="/quotes/new" className="mx-btn mx-btn-primary"><Plus size={15}/>Nueva cotización</Link>}
      </div>
      <div style={{display:'flex',gap:12,marginBottom:16}}>
        <div className="mx-searchbar" style={{flex:1}}><Search size={15} color="#86868B"/><input placeholder="Buscar por número o cliente…" value={q} onChange={e=>setQ(e.target.value)}/></div>
        <select className="mx-select" style={{width:180}} value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(SL).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <div className="mx-card-section">
        {loading?(<div style={{padding:16,display:'flex',flexDirection:'column',gap:8}}>{[1,2,3,4].map(i=><div key={i} className="mx-skeleton" style={{height:44,borderRadius:8}}/>)}</div>)
        :filtered.length===0?(<div className="mx-empty">{q||status?'Sin resultados':'No hay cotizaciones registradas'}</div>):(
          <table className="mx-table">
            <thead><tr><th>Número</th><th>Cliente</th><th>Fecha</th><th>Válida hasta</th><th>Total</th><th>Estado</th></tr></thead>
            <tbody>
              {filtered.map(qt=>(
                <tr key={qt.id}>
                  <td><Link href={`/quotes/${qt.id}`} className="mx-link" style={{fontWeight:500}}>{qt.quote_number}</Link></td>
                  <td>{qt.client_name}</td>
                  <td style={{color:'#86868B'}}>{formatDate(qt.quote_date)}</td>
                  <td style={{color:'#86868B'}}>{formatDate(qt.valid_until)}</td>
                  <td style={{fontWeight:600}}>{formatCurrency(qt.total_amount,qt.currency)}</td>
                  <td><span className={SB[qt.status]??'mx-badge mx-badge-neutral'}>{SL[qt.status]??qt.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!loading&&filtered.length>0&&<p style={{fontSize:11,color:'#86868B',marginTop:8,paddingLeft:4}}>{filtered.length} cotización(es)</p>}
    </div>
  );
}
