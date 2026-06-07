'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, errMsg } from '@/lib/utils';
import { Plus, Search } from 'lucide-react';

interface Client { id:string;name:string;taxId:string;email:string;phone:string;address:string;status:string;createdAt:string; }
const S: Record<string,string> = { ACTIVE:'mx-badge mx-badge-success', INACTIVE:'mx-badge mx-badge-neutral', BLOCKED:'mx-badge mx-badge-danger' };

export default function ClientsPage() {
  const [all,setAll]=useState<Client[]>([]);
  const [q,setQ]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const { canCreateMaster } = usePermissions();

  useEffect(()=>{
    authClient.get('/clients').then(r=>setAll(r.data)).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false));
  },[]);

  const filtered = all.filter(c=>!q||c.name.toLowerCase().includes(q.toLowerCase())||c.taxId.includes(q)||c.email.toLowerCase().includes(q));

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <div><h1 className="mx-page-title">Clientes</h1><p className="mx-page-subtitle">Gestiona tu cartera de clientes</p></div>
        {canCreateMaster&&<Link href="/clients/new" className="mx-btn mx-btn-primary"><Plus size={15}/>Nuevo cliente</Link>}
      </div>
      <div className="mx-searchbar" style={{marginBottom:16}}>
        <Search size={15} color="#86868B"/>
        <input placeholder="Buscar por nombre, RUC o email…" value={q} onChange={e=>setQ(e.target.value)}/>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <div className="mx-card-section">
        {loading?(
          <div style={{padding:16,display:'flex',flexDirection:'column',gap:8}}>
            {[1,2,3,4,5].map(i=><div key={i} className="mx-skeleton" style={{height:44,borderRadius:8}}/>)}
          </div>
        ):filtered.length===0?(
          <div className="mx-empty">{q?'Sin resultados para tu búsqueda':'No hay clientes registrados aún'}</div>
        ):(
          <table className="mx-table">
            <thead><tr><th>Nombre</th><th>RUC / DNI</th><th>Email</th><th>Teléfono</th><th>Estado</th><th>Desde</th></tr></thead>
            <tbody>
              {filtered.map(c=>(
                <tr key={c.id}>
                  <td><Link href={`/clients/${c.id}`} className="mx-link" style={{fontWeight:500}}>{c.name}</Link></td>
                  <td className="mx-mono">{c.taxId}</td>
                  <td style={{color:'#86868B'}}>{c.email||'—'}</td>
                  <td style={{color:'#86868B'}}>{c.phone||'—'}</td>
                  <td><span className={S[c.status]??'mx-badge mx-badge-neutral'}>{c.status}</span></td>
                  <td style={{color:'#86868B'}}>{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!loading&&filtered.length>0&&<p style={{fontSize:11,color:'#86868B',marginTop:8,paddingLeft:4}}>{filtered.length} cliente(s)</p>}
    </div>
  );
}
