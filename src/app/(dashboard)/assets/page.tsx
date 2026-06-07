'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency, errMsg } from '@/lib/utils';
import { Plus, Search, Play } from 'lucide-react';

interface Asset { id:string;code:string;name:string;category:string;cost:number;currency:string;bookValue:number;monthlyDepreciation:number;status:string; }
const SB: Record<string,string> = { ACTIVE:'mx-badge mx-badge-success',IDLE:'mx-badge mx-badge-warning',DISPOSED:'mx-badge mx-badge-neutral' };
const SL: Record<string,string> = { ACTIVE:'Activo',IDLE:'En reserva',DISPOSED:'Dado de baja' };

export default function AssetsPage() {
  const [all,setAll]=useState<Asset[]>([]);
  const [q,setQ]=useState('');
  const [status,setStatus]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [running,setRunning]=useState(false);
  const { canCreateAsset } = usePermissions();

  const load=()=>{ setLoading(true); authClient.get('/assets').then(r=>setAll(Array.isArray(r.data)?r.data:r.data?.data??[])).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); },[]);

  const filtered=all.filter(a=>(!q||a.name.toLowerCase().includes(q.toLowerCase())||a.code.toLowerCase().includes(q))&&(!status||a.status===status));

  const handleDepreciation=async()=>{
    const now=new Date();
    if(!confirm(`¿Ejecutar depreciación para ${now.getMonth()+1}/${now.getFullYear()}?`))return;
    setRunning(true);
    try{ await authClient.post(`/assets/depreciation/run?year=${now.getFullYear()}&month=${now.getMonth()+1}`); alert('Depreciación ejecutada'); load(); }
    catch(ex){ setError(errMsg(ex)); }
    finally{ setRunning(false); }
  };

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <div><h1 className="mx-page-title">Activos fijos</h1><p className="mx-page-subtitle">Control y depreciación de activos</p></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={handleDepreciation} disabled={running} className="mx-btn mx-btn-secondary"><Play size={14}/>{running?'Ejecutando…':'Depreciar mes'}</button>
          {canCreateAsset&&<Link href="/assets/new" className="mx-btn mx-btn-primary"><Plus size={15}/>Nuevo activo</Link>}
        </div>
      </div>
      <div style={{display:'flex',gap:12,marginBottom:16}}>
        <div className="mx-searchbar" style={{flex:1}}><Search size={15} color="#86868B"/><input placeholder="Buscar por nombre o código…" value={q} onChange={e=>setQ(e.target.value)}/></div>
        <select className="mx-select" style={{width:180}} value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(SL).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <div className="mx-card-section">
        {loading?(<div style={{padding:16,display:'flex',flexDirection:'column',gap:8}}>{[1,2,3].map(i=><div key={i} className="mx-skeleton" style={{height:44,borderRadius:8}}/>)}</div>)
        :filtered.length===0?(<div className="mx-empty">{q||status?'Sin resultados':'No hay activos registrados'}</div>):(
          <table className="mx-table">
            <thead><tr><th>Código</th><th>Nombre</th><th>Costo</th><th>Valor libro</th><th>Dep. mensual</th><th>Estado</th></tr></thead>
            <tbody>
              {filtered.map(a=>(
                <tr key={a.id}>
                  <td className="mx-mono">{a.code}</td>
                  <td><Link href={`/assets/${a.id}`} className="mx-link" style={{fontWeight:500}}>{a.name}</Link></td>
                  <td>{formatCurrency(a.cost,a.currency)}</td>
                  <td style={{fontWeight:600}}>{formatCurrency(a.bookValue,a.currency)}</td>
                  <td style={{color:'#86868B'}}>{formatCurrency(a.monthlyDepreciation,a.currency)}</td>
                  <td><span className={SB[a.status]??'mx-badge mx-badge-neutral'}>{SL[a.status]??a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!loading&&filtered.length>0&&<p style={{fontSize:11,color:'#86868B',marginTop:8,paddingLeft:4}}>{filtered.length} activo(s)</p>}
    </div>
  );
}
