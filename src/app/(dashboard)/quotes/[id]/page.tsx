'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft, FileText } from 'lucide-react';

interface QuoteItem { id:string;line_order:number;product_name:string;product_code:string|null;quantity:number;unit_price:number;discount_pct:number;subtotal:number; }
interface Quote { id:string;quote_number:string;status:string;client_name:string;client_ruc_dni:string;client_address:string|null;client_email:string;quote_date:string;valid_until:string;currency:string;subtotal:number;igv_rate:number;igv_amount:number;total_amount:number;notes:string|null;conditions:string|null;converted_invoice_id:string|null;sent_at:string|null;accepted_at:string|null;rejected_at:string|null;rejection_reason:string|null;items:QuoteItem[]; }
const SB: Record<string,string> = { DRAFT:'mx-badge mx-badge-neutral',SENT:'mx-badge mx-badge-info',ACCEPTED:'mx-badge mx-badge-success',REJECTED:'mx-badge mx-badge-danger',CONVERTED:'mx-badge mx-badge-purple' };
const SL: Record<string,string> = { DRAFT:'Borrador',SENT:'Enviada',ACCEPTED:'Aceptada',REJECTED:'Rechazada',CONVERTED:'Convertida' };

export default function QuoteDetailPage() {
  const { id }=useParams<{id:string}>();
  const router=useRouter();
  const { canSendQuote, canAcceptQuote, canRejectQuote, canConvertQuote, canDeleteQuote }=usePermissions();
  const [quote,setQuote]=useState<Quote|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [acting,setActing]=useState('');

  useEffect(()=>{ authClient.get(`/quotes/${id}`).then(r=>setQuote(r.data)).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); },[id]);

  const action=async(endpoint:string,body?:any,key?:string)=>{ setActing(key??endpoint);setError('');try{const r=await authClient.post(`/quotes/${id}/${endpoint}`,body??{});setQuote(r.data);}catch(ex){setError(errMsg(ex));}finally{setActing('');} };
  const handleReject=async()=>{ const reason=prompt('Motivo de rechazo:');if(!reason?.trim())return;await action('reject',{reason},'reject'); };
  const handleDelete=async()=>{ if(!confirm('¿Eliminar esta cotización?'))return;try{await authClient.delete(`/quotes/${id}`);router.push('/quotes');}catch(ex){setError(errMsg(ex));} };

  if(loading) return <div style={{display:'flex',flexDirection:'column',gap:16,maxWidth:720}}><div className="mx-skeleton" style={{height:48,borderRadius:12}}/><div className="mx-skeleton" style={{height:320,borderRadius:16}}/></div>;
  if(!quote) return <div className="mx-alert mx-alert-error">{error||'Cotización no encontrada'}</div>;

  const isBusy=!!acting;

  return (
    <div className="mx-fade-in" style={{maxWidth:720}}>
      <div className="mx-page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/quotes" className="mx-btn mx-btn-secondary" style={{padding:'8px 12px'}}><ArrowLeft size={15}/></Link>
          <div><h1 className="mx-page-title">{quote.quote_number}</h1><p className="mx-page-subtitle">Cotización comercial</p></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <span className={SB[quote.status]??'mx-badge mx-badge-neutral'}>{SL[quote.status]??quote.status}</span>
          {quote.status==='DRAFT'&&canSendQuote&&<button onClick={()=>action('send',{},'send')} disabled={isBusy} className="mx-btn mx-btn-primary" style={{fontSize:12}}>{acting==='send'?'Enviando…':'Enviar'}</button>}
          {quote.status==='DRAFT'&&canDeleteQuote&&<button onClick={handleDelete} disabled={isBusy} className="mx-btn mx-btn-danger" style={{fontSize:12}}>Eliminar</button>}
          {quote.status==='SENT'&&canAcceptQuote&&<button onClick={()=>action('accept',{},'accept')} disabled={isBusy} className="mx-btn mx-btn-primary" style={{fontSize:12}}>{acting==='accept'?'Aceptando…':'Aceptar'}</button>}
          {quote.status==='SENT'&&canRejectQuote&&<button onClick={handleReject} disabled={isBusy} className="mx-btn mx-btn-danger" style={{fontSize:12}}>{acting==='reject'?'Rechazando…':'Rechazar'}</button>}
          {quote.status==='ACCEPTED'&&canConvertQuote&&<button onClick={()=>action('convert',{},'convert')} disabled={isBusy} className="mx-btn mx-btn-primary">{acting==='convert'?'Convirtiendo…':'→ Convertir a factura'}</button>}
          {quote.converted_invoice_id&&<Link href={`/invoices/${quote.converted_invoice_id}`} className="mx-btn mx-btn-secondary" style={{fontSize:12,display:'flex',alignItems:'center',gap:6}}><FileText size={13}/>Ver factura</Link>}
        </div>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}

      <div className="mx-form-card">
        <div className="mx-form-title">Datos de la cotización</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div><label className="mx-label">Cliente</label><p style={{fontSize:13,fontWeight:500}}>{quote.client_name}</p><p style={{fontSize:11,color:'#86868B'}}>{quote.client_ruc_dni}</p></div>
          <div><label className="mx-label">Email</label><p style={{fontSize:13,color:'#86868B'}}>{quote.client_email||'—'}</p></div>
          <div><label className="mx-label">Fecha cotización</label><p style={{fontSize:13}}>{formatDate(quote.quote_date)}</p></div>
          <div><label className="mx-label">Válida hasta</label><p style={{fontSize:13}}>{formatDate(quote.valid_until)}</p></div>
          {quote.sent_at&&<div><label className="mx-label">Enviada</label><p style={{fontSize:13}}>{formatDate(quote.sent_at)}</p></div>}
          {quote.accepted_at&&<div><label className="mx-label">Aceptada</label><p style={{fontSize:13}}>{formatDate(quote.accepted_at)}</p></div>}
          {quote.rejected_at&&<div style={{gridColumn:'1/-1'}}><label className="mx-label">Rechazada</label><p style={{fontSize:13,color:'#FF3B30'}}>{formatDate(quote.rejected_at)} — {quote.rejection_reason}</p></div>}
          {quote.notes&&<div style={{gridColumn:'1/-1'}}><label className="mx-label">Notas</label><p style={{fontSize:13,color:'#86868B'}}>{quote.notes}</p></div>}
          {quote.conditions&&<div style={{gridColumn:'1/-1'}}><label className="mx-label">Condiciones</label><p style={{fontSize:13,color:'#86868B'}}>{quote.conditions}</p></div>}
        </div>
      </div>

      <div className="mx-card-section">
        <div style={{padding:'14px 20px',borderBottom:'0.5px solid #E5E5EA'}}><h3 style={{fontSize:14,fontWeight:600}}>Detalle</h3></div>
        <table className="mx-table">
          <thead><tr><th>#</th><th>Descripción</th><th>Cant.</th><th>P. Unit.</th><th>Desc.</th><th>Subtotal</th></tr></thead>
          <tbody>{quote.items.map(item=>(
            <tr key={item.id}>
              <td style={{color:'#86868B'}}>{item.line_order}</td>
              <td><p style={{fontWeight:500}}>{item.product_name}</p>{item.product_code&&<p style={{fontSize:11,color:'#86868B',fontFamily:'monospace'}}>{item.product_code}</p>}</td>
              <td>{Number(item.quantity)}</td>
              <td>{formatCurrency(item.unit_price,quote.currency)}</td>
              <td>{Number(item.discount_pct)>0?`${item.discount_pct}%`:'—'}</td>
              <td style={{fontWeight:600}}>{formatCurrency(item.subtotal,quote.currency)}</td>
            </tr>
          ))}</tbody>
        </table>
        <div style={{padding:'16px 20px',borderTop:'0.5px solid #E5E5EA',display:'flex',justifyContent:'flex-end'}}>
          <div style={{minWidth:220}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'#86868B'}}>Subtotal</span><span>{formatCurrency(quote.subtotal,quote.currency)}</span></div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'#86868B'}}>IGV ({(Number(quote.igv_rate)*100).toFixed(0)}%)</span><span>{formatCurrency(quote.igv_amount,quote.currency)}</span></div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:700,borderTop:'0.5px solid #E5E5EA',paddingTop:8,marginTop:4}}><span>Total</span><span style={{color:'#0071E3'}}>{formatCurrency(quote.total_amount,quote.currency)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
