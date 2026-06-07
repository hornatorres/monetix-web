'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft, Save } from 'lucide-react';

interface Client { id:string;name:string;taxId:string;email:string;phone:string;address:string;status:string;notes:string;createdAt:string; }
interface Invoice { id:string;invoiceNumber:string;invoiceDate:string;totalAmount:number;status:string; }
const SB: Record<string,string> = { DRAFT:'mx-badge mx-badge-neutral',ISSUED:'mx-badge mx-badge-info',PARTIAL:'mx-badge mx-badge-warning',PAID:'mx-badge mx-badge-success',OVERDUE:'mx-badge mx-badge-danger',VOID:'mx-badge mx-badge-neutral' };
const SL: Record<string,string> = { DRAFT:'Borrador',ISSUED:'Emitida',PARTIAL:'Parcial',PAID:'Pagada',OVERDUE:'Vencida',VOID:'Anulada' };

export default function ClientDetailPage() {
  const { id }=useParams<{id:string}>();
  const { canEditMaster }=usePermissions();
  const [client,setClient]=useState<Client|null>(null);
  const [invoices,setInvoices]=useState<Invoice[]>([]);
  const [editing,setEditing]=useState(false);
  const [form,setForm]=useState<Partial<Client>>({});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{ Promise.all([authClient.get(`/clients/${id}`),authClient.get(`/invoices?clientId=${id}`).catch(()=>({data:[]}))]).then(([c,inv])=>{setClient(c.data);setForm(c.data);setInvoices(Array.isArray(inv.data)?inv.data:inv.data?.items??[]);}).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); },[id]);

  const set=(f:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setForm(p=>({...p,[f]:e.target.value}));

  const handleSave=async()=>{ setSaving(true);setError('');
    try{const r=await authClient.put(`/clients/${id}`,{name:form.name,taxId:form.taxId,email:form.email,phone:form.phone,address:form.address,notes:form.notes});setClient(r.data);setEditing(false);}
    catch(ex){setError(errMsg(ex));}finally{setSaving(false);}
  };

  if(loading) return <div style={{display:'flex',flexDirection:'column',gap:16,maxWidth:720}}><div className="mx-skeleton" style={{height:48,borderRadius:12}}/><div className="mx-skeleton" style={{height:280,borderRadius:16}}/></div>;
  if(!client) return <div className="mx-alert mx-alert-error">{error||'Cliente no encontrado'}</div>;

  return (
    <div className="mx-fade-in" style={{maxWidth:720}}>
      <div className="mx-page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/clients" className="mx-btn mx-btn-secondary" style={{padding:'8px 12px'}}><ArrowLeft size={15}/></Link>
          <div><h1 className="mx-page-title">{client.name}</h1><p className="mx-page-subtitle">{client.taxId} · Cliente desde {formatDate(client.createdAt)}</p></div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {canEditMaster&&!editing&&<button onClick={()=>setEditing(true)} className="mx-btn mx-btn-secondary">Editar</button>}
          {editing&&<><button onClick={()=>setEditing(false)} className="mx-btn mx-btn-secondary">Cancelar</button><button onClick={handleSave} disabled={saving} className="mx-btn mx-btn-primary"><Save size={14}/>{saving?'Guardando…':'Guardar'}</button></>}
        </div>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}

      <div className="mx-form-card">
        <div className="mx-form-title">Datos del cliente</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {[{label:'Nombre / Razón social',field:'name'},{label:'RUC / DNI',field:'taxId'},{label:'Email',field:'email'},{label:'Teléfono',field:'phone'}].map(({label,field})=>(
            <div key={field}>
              <label className="mx-label">{label}</label>
              {editing&&canEditMaster?<input className="mx-input" value={(form as any)[field]??''} onChange={set(field)}/>:<p style={{fontSize:13,color:'#1D1D1F'}}>{(client as any)[field]||'—'}</p>}
            </div>
          ))}
          <div style={{gridColumn:'1/-1'}}>
            <label className="mx-label">Dirección</label>
            {editing&&canEditMaster?<input className="mx-input" value={form.address??''} onChange={set('address')}/>:<p style={{fontSize:13,color:'#1D1D1F'}}>{client.address||'—'}</p>}
          </div>
          <div style={{gridColumn:'1/-1'}}>
            <label className="mx-label">Notas</label>
            {editing&&canEditMaster?<textarea className="mx-input" rows={2} value={form.notes??''} onChange={set('notes')} style={{resize:'none'}}/>:<p style={{fontSize:13,color:'#1D1D1F'}}>{client.notes||'—'}</p>}
          </div>
          <div><label className="mx-label">Estado</label><span className={client.status==='ACTIVE'?'mx-badge mx-badge-success':'mx-badge mx-badge-neutral'}>{client.status}</span></div>
        </div>
      </div>

      <div className="mx-card-section">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'0.5px solid #E5E5EA'}}>
          <h3 style={{fontSize:14,fontWeight:600,color:'#1D1D1F'}}>Facturas</h3>
          <Link href={`/invoices/new?clientId=${id}`} className="mx-btn mx-btn-primary" style={{padding:'6px 14px',fontSize:12}}>+ Nueva factura</Link>
        </div>
        {invoices.length===0?<div className="mx-empty">Sin facturas registradas</div>:(
          <table className="mx-table">
            <thead><tr><th>Número</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead>
            <tbody>{invoices.map(inv=>(
              <tr key={inv.id}>
                <td><Link href={`/invoices/${inv.id}`} className="mx-link" style={{fontWeight:500}}>{inv.invoiceNumber}</Link></td>
                <td style={{color:'#86868B'}}>{formatDate(inv.invoiceDate)}</td>
                <td style={{fontWeight:600}}>{formatCurrency(inv.totalAmount)}</td>
                <td><span className={SB[inv.status]??'mx-badge mx-badge-neutral'}>{SL[inv.status]??inv.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
