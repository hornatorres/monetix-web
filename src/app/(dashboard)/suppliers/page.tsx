'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { errMsg } from '@/lib/utils';
import { Plus, Search } from 'lucide-react';

interface Supplier { id:string;name:string;taxId:string;currency:string;paymentTermsDays:number;contactName:string;contactEmail:string;contactPhone:string;isActive:boolean; }

export default function SuppliersPage() {
  const [all,setAll]=useState<Supplier[]>([]);
  const [q,setQ]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const { canCreateMaster } = usePermissions();

  useEffect(()=>{ authClient.get('/suppliers?limit=100').then(r=>setAll(r.data?.data??r.data??[])).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); },[]);

  const filtered=all.filter(s=>!q||s.name.toLowerCase().includes(q.toLowerCase())||s.taxId.includes(q)||s.contactEmail?.toLowerCase().includes(q));

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <div><h1 className="mx-page-title">Proveedores</h1><p className="mx-page-subtitle">Gestiona tus proveedores y contactos</p></div>
        {canCreateMaster&&<Link href="/suppliers/new" className="mx-btn mx-btn-primary"><Plus size={15}/>Nuevo proveedor</Link>}
      </div>
      <div className="mx-searchbar" style={{marginBottom:16}}><Search size={15} color="#86868B"/><input placeholder="Buscar por nombre, RUC o email…" value={q} onChange={e=>setQ(e.target.value)}/></div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <div className="mx-card-section">
        {loading?(<div style={{padding:16,display:'flex',flexDirection:'column',gap:8}}>{[1,2,3].map(i=><div key={i} className="mx-skeleton" style={{height:44,borderRadius:8}}/>)}</div>)
        :filtered.length===0?(<div className="mx-empty">{q?'Sin resultados':'No hay proveedores registrados'}</div>):(
          <table className="mx-table">
            <thead><tr><th>Nombre</th><th>RUC</th><th>Contacto</th><th>Email</th><th>Plazo</th><th>Estado</th></tr></thead>
            <tbody>
              {filtered.map(s=>(
                <tr key={s.id}>
                  <td><Link href={`/suppliers/${s.id}`} className="mx-link" style={{fontWeight:500}}>{s.name}</Link></td>
                  <td className="mx-mono">{s.taxId}</td>
                  <td style={{color:'#86868B'}}>{s.contactName||'—'}</td>
                  <td style={{color:'#86868B'}}>{s.contactEmail||'—'}</td>
                  <td style={{color:'#86868B'}}>{s.paymentTermsDays}d</td>
                  <td><span className={s.isActive?'mx-badge mx-badge-success':'mx-badge mx-badge-neutral'}>{s.isActive?'Activo':'Inactivo'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!loading&&filtered.length>0&&<p style={{fontSize:11,color:'#86868B',marginTop:8,paddingLeft:4}}>{filtered.length} proveedor(es)</p>}
    </div>
  );
}
