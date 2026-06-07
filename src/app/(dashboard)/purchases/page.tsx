'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { Plus, Search } from 'lucide-react';

interface Purchase { id:string;supplierName:string;purchaseDate:string;totalAmount:number;status:string;notes:string; }
const SB: Record<string,string> = { DRAFT:'mx-badge mx-badge-neutral',CONFIRMED:'mx-badge mx-badge-info',PARTIAL:'mx-badge mx-badge-warning',PAID:'mx-badge mx-badge-success',CANCELLED:'mx-badge mx-badge-danger' };
const SL: Record<string,string> = { DRAFT:'Borrador',CONFIRMED:'Confirmada',PARTIAL:'Parcial',PAID:'Pagada',CANCELLED:'Cancelada' };

export default function PurchasesPage() {
  const [all,setAll]=useState<Purchase[]>([]);
  const [q,setQ]=useState('');
  const [status,setStatus]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const { canCreatePurchase } = usePermissions();

  useEffect(()=>{ authClient.get('/purchases?limit=100').then(r=>setAll(r.data?.data??r.data??[])).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); },[]);

  const filtered=all.filter(p=>(!q||p.supplierName.toLowerCase().includes(q.toLowerCase()))&&(!status||p.status===status));

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <div><h1 className="mx-page-title">Compras</h1><p className="mx-page-subtitle">Registro de compras y gastos</p></div>
        {canCreatePurchase&&<Link href="/purchases/new" className="mx-btn mx-btn-primary"><Plus size={15}/>Nueva compra</Link>}
      </div>
      <div style={{display:'flex',gap:12,marginBottom:16}}>
        <div className="mx-searchbar" style={{flex:1}}><Search size={15} color="#86868B"/><input placeholder="Buscar por proveedor…" value={q} onChange={e=>setQ(e.target.value)}/></div>
        <select className="mx-select" style={{width:180}} value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(SL).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <div className="mx-card-section">
        {loading?(<div style={{padding:16,display:'flex',flexDirection:'column',gap:8}}>{[1,2,3].map(i=><div key={i} className="mx-skeleton" style={{height:44,borderRadius:8}}/>)}</div>)
        :filtered.length===0?(<div className="mx-empty">{q||status?'Sin resultados':'No hay compras registradas'}</div>):(
          <table className="mx-table">
            <thead><tr><th>Proveedor</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Notas</th></tr></thead>
            <tbody>
              {filtered.map(p=>(
                <tr key={p.id}>
                  <td><Link href={`/purchases/${p.id}`} className="mx-link" style={{fontWeight:500}}>{p.supplierName}</Link></td>
                  <td style={{color:'#86868B'}}>{formatDate(p.purchaseDate)}</td>
                  <td style={{fontWeight:600}}>{formatCurrency(p.totalAmount)}</td>
                  <td><span className={SB[p.status]??'mx-badge mx-badge-neutral'}>{SL[p.status]??p.status}</span></td>
                  <td style={{color:'#86868B',fontSize:12}}>{p.notes||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!loading&&filtered.length>0&&<p style={{fontSize:11,color:'#86868B',marginTop:8,paddingLeft:4}}>{filtered.length} compra(s)</p>}
    </div>
  );
}
