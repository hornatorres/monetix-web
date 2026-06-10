'use client';

import { useEffect, useState, useCallback } from 'react';
import { authClient } from '@/lib/authClient';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';

interface Obligation {
  id:string; type:string; regime:string;
  periodYear:number; periodMonth:number|null;
  baseAmount:number; taxRate:number; grossAmount:number;
  balanceAmount:number; paidAmount:number;
  dueDate:string; status:string; declarationStatus:string;
}

interface UitConfig { year:number; value:number; }
interface TimConfig { rate:number; validFrom:string; }

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const STATUS_BADGE: Record<string,string> = {
  PENDING:  'mx-badge mx-badge-warning',
  PAID:     'mx-badge mx-badge-success',
  OVERDUE:  'mx-badge mx-badge-danger',
  PARTIAL:  'mx-badge mx-badge-info',
  DECLARED: 'mx-badge mx-badge-neutral',
};

// Tipos de impuesto peruanos
const TAX_TYPES = [
  { value:'IGV',        label:'IGV',         desc:'Impuesto General a las Ventas (18%)' },
  { value:'RENTA_3',    label:'Renta 3ra',   desc:'Impuesto a la Renta — Rentas empresariales' },
  { value:'RENTA_4',    label:'Renta 4ta',   desc:'Impuesto a la Renta — Trabajo independiente (recibos por honorarios)' },
  { value:'RENTA_5',    label:'Renta 5ta',   desc:'Impuesto a la Renta — Trabajo en relación de dependencia' },
  { value:'ESSALUD',    label:'EsSalud',     desc:'Aportación al seguro de salud (9% sobre planilla)' },
  { value:'ONP',        label:'ONP',         desc:'Oficina de Normalización Previsional (13% del trabajador)' },
  { value:'ITAN',       label:'ITAN',        desc:'Impuesto Temporal a los Activos Netos' },
  { value:'DETRACCION', label:'Detracción',  desc:'Sistema de pago de obligaciones tributarias (SPOT)' },
  { value:'RETENCION',  label:'Retención',   desc:'Retención del IGV o Renta por parte del comprador/pagador' },
  { value:'ISC',        label:'ISC',         desc:'Impuesto Selectivo al Consumo' },
];

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
        <div className="mx-empty">Sin cronograma para {year}.</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {months.map(m => {
            const isCurrent = m.month === now.getMonth()+1 && m.year === now.getFullYear();
            const isOpen    = expanded === m.month;
            return (
              <div key={m.month} onClick={() => setExpanded(isOpen ? null : m.month)}
                style={{ background:'#fff', borderRadius:14, border:`1px solid ${isCurrent?'#0071E3':'#E5E5EA'}`, padding:16, cursor:'pointer', boxShadow: isCurrent?'0 0 0 2px rgba(0,113,227,0.15)':'none' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <span style={{ fontSize:14, fontWeight:600, color: isCurrent?'#0071E3':'#1D1D1F' }}>{MONTH_NAMES[m.month-1]}</span>
                  {isOpen ? <ChevronDown size={14} color="#86868B"/> : <ChevronRight size={14} color="#86868B"/>}
                </div>
                <p style={{ fontSize:12, color:'#86868B' }}>{m.obligations.length > 0 ? `${m.obligations.length} obligación(es)` : 'Sin obligaciones'}</p>
                {isOpen && (
                  <div style={{ marginTop:12, borderTop:'0.5px solid #F2F2F7', paddingTop:10 }}>
                    {m.obligations.length > 0 ? m.obligations.map((o:any, i:number) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <span style={{ fontSize:12 }}>{o.type ?? 'Obligación'}</span>
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
  const [filterType,  setFilterType]  = useState('');

  const load = () => {
    setLoading(true);
    authClient.get('/taxes/obligations?limit=100')
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
      await authClient.post(`/taxes/obligations/${id}/pay`, {
        amount: Number(amount),
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'TRANSFERENCIA',
      });
      load();
    } catch (ex) { setError(errMsg(ex)); }
    finally { setPaying(null); }
  };

  const periodLabel = (o:Obligation) =>
    o.periodMonth ? `${MONTH_NAMES[o.periodMonth-1]} ${o.periodYear}` : String(o.periodYear);

  const filtered = filterType ? obligations.filter(o => o.type === filterType) : obligations;

  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:16 }}>
        <select className="mx-select" style={{ width:220 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Todos los tipos</option>
          {TAX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
        </select>
      </div>
      {error && <div className="mx-alert mx-alert-error" style={{ marginBottom:16 }}>{error}</div>}
      <div className="mx-card-section">
        {loading ? (
          <div style={{ padding:16, display:'flex', flexDirection:'column', gap:8 }}>
            {[1,2,3].map(i => <div key={i} className="mx-skeleton" style={{ height:44, borderRadius:8 }}/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mx-empty">Sin obligaciones registradas</div>
        ) : (
          <table className="mx-table">
            <thead><tr><th>Tipo</th><th>Régimen</th><th>Período</th><th>Vencimiento</th><th>Base</th><th>Impuesto</th><th>Pagado</th><th>Saldo</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight:600 }}>{TAX_TYPES.find(t=>t.value===o.type)?.label ?? o.type}</td>
                  <td style={{ color:'#86868B', fontSize:12 }}>{o.regime}</td>
                  <td style={{ color:'#86868B' }}>{periodLabel(o)}</td>
                  <td style={{ color:'#86868B' }}>{formatDate(o.dueDate)}</td>
                  <td>{formatCurrency(o.baseAmount)}</td>
                  <td style={{ fontWeight:600 }}>{formatCurrency(o.grossAmount)}</td>
                  <td style={{ color:'#34C759' }}>{formatCurrency(o.paidAmount)}</td>
                  <td style={{ fontWeight:600, color: Number(o.balanceAmount)>0?'#FF3B30':'#86868B' }}>{formatCurrency(o.balanceAmount)}</td>
                  <td><span className={STATUS_BADGE[o.status]??'mx-badge mx-badge-neutral'}>{o.status}</span></td>
                  <td>
                    {['PENDING','PARTIAL','OVERDUE'].includes(o.status) && (
                      <button onClick={() => handlePay(o.id)} disabled={paying===o.id}
                        style={{ fontSize:12, color:'#0071E3', background:'none', border:'none', cursor:'pointer' }}>
                        {paying===o.id?'Pagando…':'Pagar'}
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
  const [success, setSuccess] = useState('');
  const [newUit,  setNewUit]  = useState({ year:new Date().getFullYear(), value:0 });
  const [newTim,  setNewTim]  = useState({ rate:'', validFrom:new Date().toISOString().split('T')[0] });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      authClient.get('/taxes/config/uit').catch(() => ({ data:[] })),
      authClient.get('/taxes/config/tim').catch(() => ({ data:null })),
    ]).then(([u,t]) => {
      setUit(Array.isArray(u.data) ? u.data : []);
      setTim(t.data);
    }).finally(() => setLoading(false));
  };
  useEffect(() => { loadData(); }, []);

  const handleAddUit = async (e:React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('');
    try {
      await authClient.post('/taxes/config/uit', { year:Number(newUit.year), value:Number(newUit.value) });
      const r = await authClient.get('/taxes/config/uit');
      setUit(Array.isArray(r.data) ? r.data : []);
      setSuccess('UIT guardada');
    } catch (ex) { setError(errMsg(ex)); }
  };

  const handleUpdateTim = async (e:React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('');
    try {
      await authClient.post('/taxes/config/tim', { rate:Number(newTim.rate), validFrom:newTim.validFrom });
      const r = await authClient.get('/taxes/config/tim').catch(() => ({ data:null }));
      setTim(r.data);
      setSuccess('TIM actualizada');
    } catch (ex) { setError(errMsg(ex)); }
  };

  if (loading) return <div className="mx-skeleton" style={{ height:200, borderRadius:16 }}/>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:520 }}>
      {error   && <div className="mx-alert mx-alert-error">{error}</div>}
      {success && <div className="mx-alert mx-alert-success">{success}</div>}

      {/* Tipos de impuesto referencia */}
      <div className="mx-form-card">
        <div className="mx-form-title">Tipos de impuesto</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {TAX_TYPES.map(t => (
            <div key={t.value} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'8px 0', borderBottom:'0.5px solid #F2F2F7' }}>
              <div>
                <span style={{ fontSize:13, fontWeight:500, color:'#1D1D1F' }}>{t.label}</span>
                <p style={{ fontSize:11, color:'#86868B', marginTop:2 }}>{t.desc}</p>
              </div>
              <span style={{ fontSize:11, fontFamily:'monospace', color:'#86868B', flexShrink:0, marginLeft:12 }}>{t.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* UIT */}
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
          <div style={{ flex:'0 0 90px' }}>
            <label className="mx-label">Año</label>
            <input type="number" className="mx-input" value={newUit.year} onChange={e => setNewUit(p=>({...p,year:Number(e.target.value)}))}/>
          </div>
          <div style={{ flex:1 }}>
            <label className="mx-label">Valor (S/)</label>
            <input type="number" className="mx-input" placeholder="5350" value={newUit.value||''} onChange={e => setNewUit(p=>({...p,value:Number(e.target.value)}))}/>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end' }}>
            <button type="submit" className="mx-btn mx-btn-primary"><Plus size={13}/>Agregar</button>
          </div>
        </form>
      </div>

      {/* TIM */}
      <div className="mx-form-card">
        <div className="mx-form-title">TIM — Tasa de Interés Moratorio</div>
        {tim && (
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:16, padding:'8px 0', borderBottom:'0.5px solid #F2F2F7' }}>
            <span style={{ color:'#86868B' }}>Tasa vigente</span>
            <span style={{ fontWeight:600 }}>{(Number(tim.rate)*100).toFixed(4)}% · desde {formatDate(tim.validFrom)}</span>
          </div>
        )}
        <form onSubmit={handleUpdateTim}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label className="mx-label">Tasa diaria (decimal)</label>
              <input type="number" step="0.000001" className="mx-input" placeholder="0.00040" value={newTim.rate} onChange={e => setNewTim(p=>({...p,rate:e.target.value}))}/>
              <p style={{ fontSize:11, color:'#86868B', marginTop:4 }}>Ejemplo: 0.00040 = 0.04% diario</p>
            </div>
            <div>
              <label className="mx-label">Vigente desde</label>
              <input type="date" className="mx-input" value={newTim.validFrom} onChange={e => setNewTim(p=>({...p,validFrom:e.target.value}))}/>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button type="submit" className="mx-btn mx-btn-primary">Actualizar TIM</button>
          </div>
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
            style={{ padding:'7px 16px', borderRadius:8, border:'none', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', background: tab===i?'#fff':'transparent', color: tab===i?'#1D1D1F':'#86868B', boxShadow: tab===i?'0 1px 4px rgba(0,0,0,0.10)':'none', transition:'all 0.12s' }}>
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
