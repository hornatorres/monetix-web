'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency, errMsg } from '@/lib/utils';
import { Plus, Search } from 'lucide-react';

interface Product { id:string;code:string;name:string;type:string;unitPrice:number;currency:string;isActive:boolean; }
const TB: Record<string,string> = { ONE_TIME:'mx-badge mx-badge-info',SUBSCRIPTION:'mx-badge mx-badge-purple',METERED:'mx-badge mx-badge-warning',ASSET:'mx-badge mx-badge-neutral' };
const TL: Record<string,string> = { ONE_TIME:'Único',SUBSCRIPTION:'Suscripción',METERED:'Medido',ASSET:'Activo' };

export default function ProductsPage() {
  const [all,setAll]=useState<Product[]>([]);
  const [q,setQ]=useState('');
  const [type,setType]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const { canCreateMaster } = usePermissions();

  const load=()=>{ setLoading(true); authClient.get('/products').then(r=>setAll(Array.isArray(r.data)?r.data:r.data?.data??[])).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); },[]);

  const filtered=all.filter(p=>(!q||p.name.toLowerCase().includes(q.toLowerCase())||p.code.toLowerCase().includes(q))&&(!type||p.type===type));

  const handleToggle=async(id:string)=>{ try{ await authClient.patch(`/products/${id}/toggle-active`); load(); }catch(ex){setError(errMsg(ex));} };

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <div><h1 className="mx-page-title">Productos</h1><p className="mx-page-subtitle">Catálogo de productos y servicios</p></div>
        {canCreateMaster&&<Link href="/products/new" className="mx-btn mx-btn-primary"><Plus size={15}/>Nuevo producto</Link>}
      </div>
      <div style={{display:'flex',gap:12,marginBottom:16}}>
        <div className="mx-searchbar" style={{flex:1}}><Search size={15} color="#86868B"/><input placeholder="Buscar por nombre o código…" value={q} onChange={e=>setQ(e.target.value)}/></div>
        <select className="mx-select" style={{width:180}} value={type} onChange={e=>setType(e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.entries(TL).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <div className="mx-card-section">
        {loading?(<div style={{padding:16,display:'flex',flexDirection:'column',gap:8}}>{[1,2,3,4].map(i=><div key={i} className="mx-skeleton" style={{height:44,borderRadius:8}}/>)}</div>)
        :filtered.length===0?(<div className="mx-empty">{q||type?'Sin resultados':'No hay productos registrados'}</div>):(
          <table className="mx-table">
            <thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Precio</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {filtered.map(p=>(
                <tr key={p.id}>
                  <td className="mx-mono">{p.code}</td>
                  <td><Link href={`/products/${p.id}`} className="mx-link" style={{fontWeight:500}}>{p.name}</Link></td>
                  <td><span className={TB[p.type]??'mx-badge mx-badge-neutral'}>{TL[p.type]??p.type}</span></td>
                  <td style={{fontWeight:600}}>{formatCurrency(p.unitPrice,p.currency)}</td>
                  <td><span className={p.isActive?'mx-badge mx-badge-success':'mx-badge mx-badge-neutral'}>{p.isActive?'Activo':'Inactivo'}</span></td>
                  <td><button onClick={()=>handleToggle(p.id)} style={{fontSize:12,color:'#86868B',background:'none',border:'none',cursor:'pointer'}}>{p.isActive?'Desactivar':'Activar'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!loading&&filtered.length>0&&<p style={{fontSize:11,color:'#86868B',marginTop:8,paddingLeft:4}}>{filtered.length} producto(s)</p>}
    </div>
  );
}
