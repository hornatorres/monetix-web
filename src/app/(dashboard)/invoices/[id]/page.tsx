'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

interface InvoiceItem { id:string;lineOrder:number;productName:string;productCode:string;quantity:number;unitPrice:number;discountPct:number;subtotal:number; }
interface Invoice { id:string;invoiceNumber:string;documentType:string;clientName:string;clientRucDni:string;clientAddress:string;clientEmail:string;invoiceDate:string;dueDate:string;currency:string;subtotal:number;igvRate:number;igvAmount:number;totalAmount:number;amountPaid:number;status:string;sunatStatus:string;sunatResponseDesc:string|null;notes:string|null;journalEntryId:string|null;items:InvoiceItem[]; }
const SB: Record<string,string> = { DRAFT:'mx-badge mx-badge-neutral',ISSUED:'mx-badge mx-badge-info',PARTIAL:'mx-badge mx-badge-warning',PAID:'mx-badge mx-badge-success',OVERDUE:'mx-badge mx-badge-danger',VOID:'mx-badge mx-badge-neutral' };
const SL: Record<string,string> = { DRAFT:'Borrador',ISSUED:'Emitida',PARTIAL:'Parcial',PAID:'Pagada',OVERDUE:'Vencida',VOID:'Anulada' };
const SUNAT_L: Record<string,string> = { PENDING:'Pendiente',ACCEPTED:'Aceptada',REJECTED:'Rechazada',SKIPPED:'No aplica' };

export default function InvoiceDetailPage() {
  const { id }=useParams<{id:string}>();
  const { canIssueInvoice, canAnnulInvoice }=usePermissions();
  const [invoice,setInvoice]=useState<Invoice|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [acting,setActing]=useState('');

  useEffect(()=>{ authClient.get(`/invoices/${id}`).then(r=>setInvoice(r.data)).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); },[id]);

  const handleIssue=async()=>{ setActing('issue');try{const r=await authClient.post(`/invoices/${id}/issue`);setInvoice(r.data);}catch(ex){setError(errMsg(ex));}finally{setActing('');} };
  const handleAnnul=async()=>{ const reason=prompt('Motivo de anulación:');if(!reason?.trim())return;setActing('annul');try{const r=await authClient.post(`/invoices/${id}/void`,{reason});setInvoice(r.data?.voidedInvoice??r.data);}catch(ex){setError(errMsg(ex));}finally{setActing('');} };

  if(loading) return <div style={{display:'flex',flexDirection:'column',gap:16,maxWidth:720}}><div className="mx-skeleton" style={{height:48,borderRadius:12}}/><div className="mx-skeleton" style={{height:320,borderRadius:16}}/></div>;
  if(!invoice) return <div className="mx-alert mx-alert-error">{error||'Factura no encontrada'}</div>;

  const canIssue=invoice.status==='DRAFT'&&canIssueInvoice;
  const canAnnul=['ISSUED','PARTIAL','OVERDUE'].includes(invoice.status)&&canAnnulInvoice;

  return (
    <div className="mx-fade-in" style={{maxWidth:720}}>
      <div className="mx-page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/invoices" className="mx-btn mx-btn-secondary" style={{padding:'8px 12px'}}><ArrowLeft size={15}/></Link>
          <div><h1 className="mx-page-title">{invoice.invoiceNumber}</h1><p className="mx-page-subtitle">{invoice.documentType}</p></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span className={SB[invoice.status]??'mx-badge mx-badge-neutral'}>{SL[invoice.status]??invoice.status}</span>
          {canIssue&&<button onClick={handleIssue} disabled={!!acting} className="mx-btn mx-btn-primary">{acting==='issue'?'Emitiendo…':'Emitir'}</button>}
          {canAnnul&&<button onClick={handleAnnul} disabled={!!acting} className="mx-btn mx-btn-danger">{acting==='annul'?'Anulando…':'Anular'}</button>}
        </div>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}

      <div className="mx-form-card">
        <div className="mx-form-title">Datos del documento</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div><label className="mx-label">Cliente</label><p style={{fontSize:13,fontWeight:500}}>{invoice.clientName}</p><p style={{fontSize:11,color:'#86868B'}}>{invoice.clientRucDni}</p></div>
          <div><label className="mx-label">Dirección</label><p style={{fontSize:13,color:'#86868B'}}>{invoice.clientAddress||'—'}</p></div>
          <div><label className="mx-label">Fecha emisión</label><p style={{fontSize:13}}>{formatDate(invoice.invoiceDate)}</p></div>
          <div><label className="mx-label">Vencimiento</label><p style={{fontSize:13}}>{formatDate(invoice.dueDate)}</p></div>
          <div><label className="mx-label">Estado SUNAT</label><p style={{fontSize:13}}>{SUNAT_L[invoice.sunatStatus]??invoice.sunatStatus}</p>{invoice.sunatResponseDesc&&<p style={{fontSize:11,color:'#FF3B30',marginTop:2}}>{invoice.sunatResponseDesc.slice(0,120)}…</p>}</div>
          <div><label className="mx-label">Asiento contable</label><p style={{fontSize:13}}>{invoice.journalEntryId?'✓ Generado':'—'}</p></div>
          {invoice.notes&&<div style={{gridColumn:'1/-1'}}><label className="mx-label">Notas</label><p style={{fontSize:13,color:'#86868B'}}>{invoice.notes}</p></div>}
        </div>
      </div>

      <div className="mx-card-section">
        <div style={{padding:'14px 20px',borderBottom:'0.5px solid #E5E5EA'}}><h3 style={{fontSize:14,fontWeight:600}}>Detalle</h3></div>
        <table className="mx-table">
          <thead><tr><th>#</th><th>Descripción</th><th>Cant.</th><th>P. Unit.</th><th>Desc.</th><th>Subtotal</th></tr></thead>
          <tbody>{invoice.items.map(item=>(
            <tr key={item.id}>
              <td style={{color:'#86868B'}}>{item.lineOrder}</td>
              <td><p style={{fontWeight:500}}>{item.productName}</p>{item.productCode&&<p style={{fontSize:11,color:'#86868B',fontFamily:'monospace'}}>{item.productCode}</p>}</td>
              <td>{Number(item.quantity)}</td>
              <td>{formatCurrency(item.unitPrice,invoice.currency)}</td>
              <td>{Number(item.discountPct)>0?`${item.discountPct}%`:'—'}</td>
              <td style={{fontWeight:600}}>{formatCurrency(item.subtotal,invoice.currency)}</td>
            </tr>
          ))}</tbody>
        </table>
        <div style={{padding:'16px 20px',borderTop:'0.5px solid #E5E5EA',display:'flex',justifyContent:'flex-end'}}>
          <div style={{minWidth:220}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'#86868B'}}>Subtotal</span><span>{formatCurrency(invoice.subtotal,invoice.currency)}</span></div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'#86868B'}}>IGV ({(Number(invoice.igvRate) * 100).toFixed(0)}%)</span><span>{formatCurrency(invoice.igvAmount,invoice.currency)}</span></div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:700,borderTop:'0.5px solid #E5E5EA',paddingTop:8,marginTop:4}}><span>Total</span><span style={{color:'#0071E3'}}>{formatCurrency(invoice.totalAmount,invoice.currency)}</span></div>
            {Number(invoice.amountPaid)>0&&<>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#34C759',marginTop:6}}><span>Pagado</span><span>{formatCurrency(invoice.amountPaid,invoice.currency)}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:600,color:'#FF9F0A'}}><span>Saldo</span><span>{formatCurrency(Number(invoice.totalAmount)-Number(invoice.amountPaid),invoice.currency)}</span></div>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}
