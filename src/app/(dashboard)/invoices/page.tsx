'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { Plus, Search } from 'lucide-react';

interface Invoice { id:string;invoiceNumber:string;documentType:string;clientName:string;invoiceDate:string;dueDate:string;totalAmount:number;amountPaid:number;status:string;sunatStatus:string;currency:string; }
const SB: Record<string,string> = { DRAFT:'mx-badge mx-badge-neutral',ISSUED:'mx-badge mx-badge-info',PARTIAL:'mx-badge mx-badge-warning',PAID:'mx-badge mx-badge-success',OVERDUE:'mx-badge mx-badge-danger',VOID:'mx-badge mx-badge-neutral',CANCELLED:'mx-badge mx-badge-neutral' };
const SL: Record<string,string> = { DRAFT:'Borrador',ISSUED:'Emitida',PARTIAL:'Parcial',PAID:'Pagada',OVERDUE:'Vencida',VOID:'Anulada',CANCELLED:'Cancelada' };
const SUNAT: Record<string,string> = { PENDING:'mx-badge mx-badge-warning',ACCEPTED:'mx-badge mx-badge-success',REJECTED:'mx-badge mx-badge-danger',SKIPPED:'mx-badge mx-badge-neutral' };

export default function InvoicesPage() {
  const [all,setAll]=useState<Invoice[]>([]);
  const [q,setQ]=useState('');
  const [status,setStatus]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const { canCreateInvoice } = usePermissions();

  useEffect(()=>{ authClient.get('/invoices').then(r=>setAll(Array.isArray(r.data)?r.data:r.data?.items??[])).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); },[]);

  const filtered=all.filter(i=>{
    const mq=!q||i.invoiceNumber.toLowerCase().includes(q.toLowerCase())||i.clientName.toLowerCase().includes(q.toLowerCase());
    const ms=!status||i.status===status;
    return mq&&ms;
  });

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <div><h1 className="mx-page-title">Facturación</h1><p className="mx-page-subtitle">Facturas y documentos emitidos</p></div>
        {canCreateInvoice&&<Link href="/invoices/new" className="mx-btn mx-btn-primary"><Plus size={15}/>Nueva factura</Link>}
      </div>
      <div style={{display:'flex',gap:12,marginBottom:16}}>
        <div className="mx-searchbar" style={{flex:1}}>
          <Search size={15} color="#86868B"/>
          <input placeholder="Buscar por número o cliente…" value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <select className="mx-select" style={{width:180}} value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(SL).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <div className="mx-card-section">
        {loading?(<div style={{padding:16,display:'flex',flexDirection:'column',gap:8}}>{[1,2,3,4].map(i=><div key={i} className="mx-skeleton" style={{height:44,borderRadius:8}}/>)}</div>)
        :filtered.length===0?(<div className="mx-empty">{q||status?'Sin resultados':'No hay facturas registradas'}</div>):(
          <table className="mx-table">
            <thead><tr><th>Número</th><th>Cliente</th><th>Fecha</th><th>Vencimiento</th><th>Total</th><th>Estado</th><th>SUNAT</th></tr></thead>
            <tbody>
              {filtered.map(i=>(
                <tr key={i.id}>
                  <td><Link href={`/invoices/${i.id}`} className="mx-link" style={{fontWeight:500}}>{i.invoiceNumber}</Link><span style={{fontSize:10,color:'#86868B',marginLeft:6}}>{i.documentType}</span></td>
                  <td>{i.clientName}</td>
                  <td style={{color:'#86868B'}}>{formatDate(i.invoiceDate)}</td>
                  <td style={{color:'#86868B'}}>{formatDate(i.dueDate)}</td>
                  <td style={{fontWeight:600}}>{formatCurrency(i.totalAmount,i.currency)}</td>
                  <td><span className={SB[i.status]??'mx-badge mx-badge-neutral'}>{SL[i.status]??i.status}</span></td>
                  <td><span className={SUNAT[i.sunatStatus]??'mx-badge mx-badge-neutral'}>{i.sunatStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!loading&&filtered.length>0&&<p style={{fontSize:11,color:'#86868B',marginTop:8,paddingLeft:4}}>{filtered.length} factura(s)</p>}
    </div>
  );
}
