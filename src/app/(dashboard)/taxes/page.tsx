'use client';

import { useEffect, useState, useCallback } from 'react';
import { authClient } from '@/lib/authClient';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';

interface Obligation {
  id:string; taxType:string; period:string; dueDate:string;
  baseAmount:number; taxAmount:number; status:string;
  paidAmount:number; balance:number;
}
interface UitConfig { year:number; value:number; }
interface TimConfig { rate:number; effectiveFrom:string; }

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const STATUS_BADGE: Record<string,string> = {
  PENDING:  'mx-badge mx-badge-warning',
  PAID:     'mx-badge mx-badge-success',
  OVERDUE:  'mx-badge mx-badge-danger',
  PARTIAL:  'mx-badge mx-badge-info',
  DECLARED: 'mx-badge mx-badge-neutral',
};

// ── Tab: Cronograma ───────────────────────────────────────────

function TimelineTab() {
  const [year,     setYear]    = useState(new Date().getFullYear());
  const [data,     setData]    = useState<any>(null);
  const [expanded, setExpanded]= useState<number|null>(null);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState('');

  const load = useCallback(() => {
    setLoading(true);
    authClient.get(`/taxes/timeline/${year}`)
      .then(r => setData(r.data))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const handleSync = async (y:number, m:number) => {
    try { await authClient.post(`/taxes/sync/${y}/${m}`); load(); }
    catch (ex) { setError(errMsg(ex)); }
  };

  const months = data?.months
    ? Object.entries(data.months).map(([m, obs]) => ({
        month: Number(m), year: data.year ?? year,
        obligations: Array.isArray(obs) ? obs : [],
      })).sort((a,b) => a.month - b.month)
    : [];

  const now = new Date();

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <button onClick={() => setYear(y => y-1)} className="mx-btn mx-btn-secondary" style={{ padding:'7px 14px' }}>←</button>
        <span style={{ fontSize:18, fontWeight:600, color:'#1D1D1F', width:60, textAlign:'center' }}>{year}</span>
        <button onClick={() => setYear(y => y+1)} className="mx-btn mx-btn-secondary" style={{ padding:'7px 14px' }}>→</button>
      </div>

      {error && <div className="mx-alert mx-alert-error" style={{ marginBottom:16 }}>{error}</div>}

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {[...Array(12)].map((_,i) => <div key={i} className="mx-skeleton" style={{ height:80, borderRadius:14 }}/>)}
        </div>
      ) : months.length === 0 ? (
        <div className="mx-empty">Sin cronograma para {year}. Usa "Sincronizar" en cada mes.</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {months.map(m => {
            const isCurrent = m.month === now.getMonth()+1 && m.year === now.getFullYear();
            const isOpen = expanded === m.month;
            const hasObs = m.obligations.length > 0;
            return (
              <div key={m.month}
                onClick={() => setExpanded(isOpen ? null : m.month)}
                style={{ background:'#fff', borderRadius:14, border:`1px solid ${isCurrent ? '#0071E3' : '#E5E5EA'}`, padding:16, cursor:'pointer', transition:'box-shadow 0.1s', boxShadow: isCurrent ? '0 0 0 2px rgba(0,113,227,0.15)' : 'none' }}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <span style={{ fontSize:14, fontWeight:600, color: isCurrent ? '#0071E3' : '#1D1D1F' }}>
                    {MONTH_NAMES[m.month-1]}
                  </span>
                  {isOpen ? <ChevronDown size={14} color="#86868B"/> : <ChevronRight size={14} color="#86868B"/>}
                </div>
                <p style={{ fontSize:12, color:'#86868B' }}>{hasObs ? `${m.obligations.length} obligación(es)` : 'Sin obligaciones'}</p>

                {isOpen && (
                  <div style={{ marginTop:12, borderTop:'0.5px solid #F2F2F7', paddingTop:10 }}>
                    {hasObs ? m.obligations.map((o:any, i:number) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <span style={{ fontSize:12 }}>{o.taxType ?? o.type ?? 'Obligación'}</span>
                        <span className={STATUS_BADGE[o.status] ?? 'mx-badge mx-badge-neutral'}>{o.status}</span>
                      </div>
                    )) : <p style={{ fontSize:12, color:'#86868B' }}>Sin obligaciones</p>}
                    <button onClick={e => { e.stopPropagation(); handleSync(m.year, m.month); }}
                      style={{ fontSize:12, color:'#0071E3', background:'none', border:'none', cursor:'pointer', marginTop:6, padding:0 }}>
                      Sincronizar período
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab: Obligaciones ─────────────────────────────────────────

function ObligationsTab() {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [paying,      setPaying]      = useState<string|null>(null);

  const load = () => {
    setLoading(true);
    authClient.get('/taxes/obligations?limit=50')
      .then(r => setObligations(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handlePay = async (id:string) => {
    const amount = prompt('Monto a pagar:');
    if (!amount) return;
    setPaying(id);
    try {
      await authClient.post(`/taxes/obligations/${id}/pay`, { amount:Number(amount), paymentDate:new Date().toISOString().split('T')[0], paymentMethod:'TRANSFERENCIA' });
      load();
    } catch (ex) { setError(errMsg(ex)); }
    finally { setPaying(null); }
  };

  return (
    <div>
      {error && <div className="mx-alert mx-alert-error" style={{ marginBottom:16 }}>{error}</div>}
      <div className="mx-card-section">
        {loading ? (
          <div style={{ padding:16, display:'flex', flexDirection:'column', gap:8 }}>
            {[1,2,3].map(i => <div key={i} className="mx-skeleton" style={{ height:44, borderRadius:8 }}/>)}
          </div>
        ) : obligations.length === 0 ? (
          <div className="mx-empty">Sin obligaciones registradas</div>
        ) : (
          <table className="mx-table">
            <thead><tr><th>Tipo</th><th>Período</th><th>Vencimiento</th><th>Importe</th><th>Pagado</th><th>Saldo</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {obligations.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight:500 }}>{o.taxType}</td>
                  <td style={{ color:'#86868B' }}>{o.period}</td>
                  <td style={{ color:'#86868B' }}>{formatDate(o.dueDate)}</td>
                  <td>{formatCurrency(o.taxAmount)}</td>
                  <td style={{ color:'#34C759' }}>{formatCurrency(o.paidAmount)}</td>
                  <td style={{ fontWeight:600, color: Number(o.balance)>0 ? '#FF3B30' : '#86868B' }}>{formatCurrency(o.balance)}</td>
                  <td><span className={STATUS_BADGE[o.status] ?? 'mx-badge mx-badge-neutral'}>{o.status}</span></td>
                  <td>
                    {['PENDING','PARTIAL','OVERDUE'].includes(o.status) && (
                      <button onClick={() => handlePay(o.id)} disabled={paying === o.id}
                        style={{ fontSize:12, color:'#0071E3', background:'none', border:'none', cursor:'pointer' }}>
                        {paying === o.id ? 'Pagando…' : 'Pagar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Tab: Configuración ────────────────────────────────────────

function ConfigTab() {
  const [uit,     setUit]     = useState<UitConfig[]>([]);
  const [tim,     setTim]     = useState<TimConfig|null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [newUit,  setNewUit]  = useState({ year:new Date().getFullYear(), value:0 });
  const [newTim,  setNewTim]  = useState({ rate:0, effectiveFrom:new Date().toISOString().split('T')[0] });

  useEffect(() => {
    Promise.all([
      authClient.get('/taxes/config/uit').catch(() => ({ data:[] })),
      authClient.get('/taxes/config/tim').catch(() => ({ data:null })),
    ]).then(([u,t]) => {
      setUit(Array.isArray(u.data) ? u.data : []);
      setTim(t.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleAddUit = async (e:React.FormEvent) => {
    e.preventDefault();
    try { await authClient.post('/taxes/config/uit', newUit); const r=await authClient.get('/taxes/config/uit'); setUit(Array.isArray(r.data)?r.data:[]); }
    catch (ex) { setError(errMsg(ex)); }
  };

  const handleUpdateTim = async (e:React.FormEvent) => {
    e.preventDefault();
    try { await authClient.post('/taxes/config/tim', newTim); const r=await authClient.get('/taxes/config/tim'); setTim(r.data); }
    catch (ex) { setError(errMsg(ex)); }
  };

  if (loading) return <div className="mx-skeleton" style={{ height:200, borderRadius:16 }}/>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:520 }}>
      {error && <div className="mx-alert mx-alert-error">{error}</div>}

      <div className="mx-form-card">
        <div className="mx-form-title">UIT — Unidad Impositiva Tributaria</div>
        {uit.length > 0 && (
          <div style={{ marginBottom:16 }}>
            {uit.map((u,i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 0', borderBottom:'0.5px solid #F2F2F7' }}>
                <span style={{ color:'#86868B' }}>{u.year}</span>
                <span style={{ fontWeight:600 }}>{formatCurrency(u.value)}</span>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleAddUit} style={{ display:'flex', gap:8 }}>
          <input type="number" className="mx-input" style={{ width:90 }} placeholder="Año" value={newUit.year} onChange={e => setNewUit(p=>({...p,year:Number(e.target.value)}))} />
          <input type="number" className="mx-input" placeholder="Valor (ej: 5350)" value={newUit.value||''} onChange={e => setNewUit(p=>({...p,value:Number(e.target.value)}))} />
          <button type="submit" className="mx-btn mx-btn-primary" style={{ whiteSpace:'nowrap' }}><Plus size={13}/>Agregar</button>
        </form>
      </div>

      <div className="mx-form-card">
        <div className="mx-form-title">TIM — Tasa de Interés Moratorio</div>
        {tim && (
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:16, padding:'8px 0', borderBottom:'0.5px solid #F2F2F7' }}>
            <span style={{ color:'#86868B' }}>Tasa vigente</span>
            <span style={{ fontWeight:600 }}>{tim.rate}% mensual</span>
          </div>
        )}
        <form onSubmit={handleUpdateTim} style={{ display:'flex', gap:8 }}>
          <input type="number" step="0.001" className="mx-input" style={{ width:110 }} placeholder="Tasa %" value={newTim.rate||''} onChange={e => setNewTim(p=>({...p,rate:Number(e.target.value)}))} />
          <input type="date" className="mx-input" value={newTim.effectiveFrom} onChange={e => setNewTim(p=>({...p,effectiveFrom:e.target.value}))} />
          <button type="submit" className="mx-btn mx-btn-primary">Actualizar</button>
        </form>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────

const TABS = ['Cronograma', 'Obligaciones', 'Configuración'];

export default function TaxesPage() {
  const [tab, setTab] = useState(0);
  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <div><h1 className="mx-page-title">Impuestos</h1><p className="mx-page-subtitle">Cronograma de vencimientos y obligaciones tributarias</p></div>
      </div>
      <div style={{ display:'flex', gap:2, background:'rgba(0,0,0,0.05)', padding:3, borderRadius:12, width:'fit-content', marginBottom:24 }}>
        {TABS.map((t,i) => (
          <button key={t} onClick={() => setTab(i)}
            style={{ padding:'7px 16px', borderRadius:8, border:'none', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', background: tab===i ? '#fff' : 'transparent', color: tab===i ? '#1D1D1F' : '#86868B', boxShadow: tab===i ? '0 1px 4px rgba(0,0,0,0.10)' : 'none', transition:'all 0.12s' }}>
            {t}
          </button>
        ))}
      </div>
      {tab === 0 && <TimelineTab />}
      {tab === 1 && <ObligationsTab />}
      {tab === 2 && <ConfigTab />}
    </div>
  );
}
