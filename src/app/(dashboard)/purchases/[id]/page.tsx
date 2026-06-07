'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

interface PurchaseItem { id:string;productName:string;productCode:string;quantity:number;unitPrice:number;subtotal:number; }
interface Purchase { id:string;supplierId:string;supplierName:string;purchaseDate:string;notes:string;status:string;subtotal:number;igvRate:number;igvAmount:number;totalAmount:number;items:PurchaseItem[]; }
const SB: Record<string,string> = { DRAFT:'mx-badge mx-badge-neutral',CONFIRMED:'mx-badge mx-badge-info',PARTIAL:'mx-badge mx-badge-warning',PAID:'mx-badge mx-badge-success',CANCELLED:'mx-badge mx-badge-danger' };
const SL: Record<string,string> = { DRAFT:'Borrador',CONFIRMED:'Confirmada',PARTIAL:'Parcial',PAID:'Pagada',CANCELLED:'Cancelada' };

export default function PurchaseDetailPage() {
  const { id }=useParams<{id:string}>();
  const router=useRouter();
  const { canEditPurchase, canCancelPurchase, canDeletePurchase }=usePermissions();
  const [purchase,setPurchase]=useState<Purchase|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [acting,setActing]=useState('');

  useEffect(()=>{ authClient.get(`/purchases/${id}`).then(r=>setPurchase(r.data)).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); },[id]);

  const handleCancel=async()=>{ const reason=prompt('Motivo de cancelación:');if(!reason?.trim())return;setActing('cancel');try{const r=await authClient.patch(`/purchases/${id}/cancel`,{reason});setPurchase(r.data);}catch(ex){setError(errMsg(ex));}finally{setActing('');} };
  const handleDelete=async()=>{ if(!confirm('¿Eliminar esta compra permanentemente?'))return;setActing('delete');try{await authClient.delete(`/purchases/${id}/permanent`);router.push('/purchases');}catch(ex){setError(errMsg(ex));setActing('');} };

  if(loading) return <div style={{display:'flex',flexDirection:'column',gap:16,maxWidth:720}}><div className="mx-skeleton" style={{height:48,borderRadius:12}}/><div className="mx-skeleton" style={{height:280,borderRadius:16}}/></div>;
  if(!purchase) return <div className="mx-alert mx-alert-error">{error||'Compra no encontrada'}</div>;

  const canEdit=canEditPurchase&&purchase.status==='CONFIRMED';
  const canCancel=canCancelPurchase&&['CONFIRMED','PARTIAL'].includes(purchase.status);
  const canDelete=canDeletePurchase&&purchase.status==='CANCELLED';

  return (
    <div className="mx-fade-in" style={{maxWidth:720}}>
      <div className="mx-page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/purchases" className="mx-btn mx-btn-secondary" style={{padding:'8px 12px'}}><ArrowLeft size={15}/></Link>
          <div><h1 className="mx-page-title">{purchase.supplierName}</h1><p className="mx-page-subtitle">{formatDate(purchase.purchaseDate)}</p></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span className={SB[purchase.status]??'mx-badge mx-badge-neutral'}>{SL[purchase.status]??purchase.status}</span>
          {canEdit&&<Link href={`/purchases/${id}/edit`} className="mx-btn mx-btn-secondary" style={{fontSize:12}}>Editar</Link>}
          {canCancel&&<button onClick={handleCancel} disabled={!!acting} className="mx-btn mx-btn-secondary" style={{fontSize:12}}>{acting==='cancel'?'Cancelando…':'Cancelar'}</button>}
          {canDelete&&<button onClick={handleDelete} disabled={!!acting} className="mx-btn mx-btn-danger" style={{fontSize:12}}>{acting==='delete'?'Eliminando…':'Eliminar'}</button>}
        </div>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}

      <div className="mx-form-card">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div><label className="mx-label">Proveedor</label><p style={{fontSize:13,fontWeight:500}}>{purchase.supplierName}</p></div>
          <div><label className="mx-label">Fecha</label><p style={{fontSize:13}}>{formatDate(purchase.purchaseDate)}</p></div>
          {purchase.notes&&<div style={{gridColumn:'1/-1'}}><label className="mx-label">Notas</label><p style={{fontSize:13,color:'#86868B'}}>{purchase.notes}</p></div>}
        </div>
      </div>

      <div className="mx-card-section">
        <div style={{padding:'14px 20px',borderBottom:'0.5px solid #E5E5EA'}}><h3 style={{fontSize:14,fontWeight:600}}>Detalle</h3></div>
        <table className="mx-table">
          <thead><tr><th>Descripción</th><th>Código</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr></thead>
          <tbody>{purchase.items.map(item=>(
            <tr key={item.id}>
              <td style={{fontWeight:500}}>{item.productName}</td>
              <td style={{color:'#86868B',fontFamily:'monospace',fontSize:12}}>{item.productCode||'—'}</td>
              <td>{Number(item.quantity)}</td>
              <td>{formatCurrency(item.unitPrice)}</td>
              <td style={{fontWeight:600}}>{formatCurrency(item.subtotal)}</td>
            </tr>
          ))}</tbody>
        </table>
        <div style={{padding:'16px 20px',borderTop:'0.5px solid #E5E5EA',display:'flex',justifyContent:'flex-end'}}>
          <div style={{minWidth:200}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'#86868B'}}>Subtotal</span><span>{formatCurrency(purchase.subtotal)}</span></div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'#86868B'}}>IGV ({purchase.igvRate}%)</span><span>{formatCurrency(purchase.igvAmount)}</span></div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:700,borderTop:'0.5px solid #E5E5EA',paddingTop:8,marginTop:4}}><span>Total</span><span style={{color:'#0071E3'}}>{formatCurrency(purchase.totalAmount)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
