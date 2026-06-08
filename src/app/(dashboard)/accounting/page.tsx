'use client';

import { useEffect, useState, useCallback } from 'react';
import { authClient } from '@/lib/authClient';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import {
  List, BookOpen, BarChart2, Scale, TrendingUp, Lock,
  ChevronDown, ChevronRight,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────

interface Account {
  id:string; code:string; name:string; type:string;
  nature:string; parentCode:string|null; isActive:boolean; allowsEntries:boolean;
}

interface JournalLine {
  id:string; lineOrder:number; accountCode:string;
  accountName:string; debit:number; credit:number; description:string|null;
}

interface JournalEntry {
  id:string; entryNumber:string; entryDate:string; description:string;
  referenceType:string; status:string; currency:string;
  totalDebit:number; totalCredit:number; lines:JournalLine[];
}

interface LedgerEntry {
  id:string; entryNumber:string; entryDate:string;
  description:string; debit:number; credit:number; balance:number;
}

// Balance usa snake_case español
interface BalanceLine { accountCode:string; accountName:string; debit:number; credit:number; balance:number; }
interface BalanceSheet {
  activos:    BalanceLine[];
  pasivos:    BalanceLine[];
  patrimonio: BalanceLine[];
  totalActivos:    number;
  totalPasivos:    number;
  totalPatrimonio: number;
}

// P&L usa español
interface PLLine { accountCode:string; accountName:string; debit:number; credit:number; balance:number; }
interface IncomeStatement {
  ingresos:      PLLine[];
  gastos:        PLLine[];
  totalIngresos: number;
  totalGastos:   number;
  utilidadNeta:  number;
  from:          string;
  to:            string;
}

interface Period { year:number; month:number; closedAt:string; closedBy:string; }

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const STATUS_BADGE: Record<string,string> = {
  DRAFT:  'mx-badge mx-badge-neutral',
  POSTED: 'mx-badge mx-badge-success',
  VOIDED: 'mx-badge mx-badge-danger',
};

const TYPE_LABEL: Record<string,string> = {
  ASSET:'Activo', LIABILITY:'Pasivo', EQUITY:'Patrimonio',
  INCOME:'Ingreso', EXPENSE:'Gasto',
};

const TYPE_COLOR: Record<string,string> = {
  ASSET:'#0071E3', LIABILITY:'#FF9F0A', EQUITY:'#9B59B6',
  INCOME:'#34C759', EXPENSE:'#FF3B30',
};

// ── Tab 1: Plan de cuentas ─────────────────────────────────────

function PlanTab({ onViewLedger }: { onViewLedger:(code:string)=>void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filtered, setFiltered] = useState<Account[]>([]);
  const [q,        setQ]        = useState('');
  const [type,     setType]     = useState('');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    authClient.get('/accounting/accounts')
      .then(r => { setAccounts(r.data); setFiltered(r.data); })
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setFiltered(accounts.filter(a => {
      const mq = !q || a.code.includes(q) || a.name.toLowerCase().includes(q.toLowerCase());
      const mt = !type || a.type === type;
      return mq && mt;
    }));
  }, [q, type, accounts]);

  const indent = (code: string) => (code.split('.').length - 1) * 14;

  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:16 }}>
        <div className="mx-searchbar" style={{ flex:1 }}>
          <input placeholder="Buscar cuenta por código o nombre…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <select className="mx-select" style={{ width:180 }} value={type} onChange={e => setType(e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.entries(TYPE_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {error && <div className="mx-alert mx-alert-error" style={{ marginBottom:16 }}>{error}</div>}
      <div className="mx-card-section">
        {loading ? (
          <div style={{ padding:16, display:'flex', flexDirection:'column', gap:8 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="mx-skeleton" style={{ height:36, borderRadius:8 }} />)}
          </div>
        ) : (
          <table className="mx-table">
            <thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Naturaleza</th><th></th></tr></thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td style={{ fontFamily:'monospace', fontSize:12, color:'#3A3A3C' }}>{a.code}</td>
                  <td style={{ paddingLeft: indent(a.code) + 16 }}>
                    <span style={{ fontSize:13, color: a.allowsEntries ? '#1D1D1F' : '#86868B', fontWeight: a.code.split('.').length === 1 ? 600 : 400 }}>
                      {a.name}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize:11, fontWeight:500, color: TYPE_COLOR[a.type] ?? '#86868B' }}>
                      {TYPE_LABEL[a.type] ?? a.type}
                    </span>
                  </td>
                  <td style={{ fontSize:12, color:'#86868B' }}>{a.nature}</td>
                  <td>
                    {a.allowsEntries && (
                      <button onClick={() => onViewLedger(a.code)}
                        style={{ fontSize:12, color:'#0071E3', background:'none', border:'none', cursor:'pointer' }}>
                        Ver mayor →
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!loading && <p style={{ fontSize:11, color:'#86868B', marginTop:8, paddingLeft:4 }}>{filtered.length} cuenta(s)</p>}
    </div>
  );
}

// ── Tab 2: Libro Diario ────────────────────────────────────────

function JournalTab() {
  const [entries,  setEntries]  = useState<JournalEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [from,     setFrom]     = useState('');
  const [to,       setTo]       = useState('');
  const [status,   setStatus]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const { canPostEntry } = usePermissions();

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit:'50' });
    if (from)   params.set('from',   from);
    if (to)     params.set('to',     to);
    if (status) params.set('status', status);
    authClient.get(`/accounting/journal-entries?${params}`)
      .then(r => setEntries(Array.isArray(r.data) ? r.data : r.data?.items ?? []))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, [from, to, status]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id:string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handlePost = async (id:string) => {
    try { await authClient.patch(`/accounting/journal-entries/${id}/post`); load(); }
    catch (ex) { setError(errMsg(ex)); }
  };

  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:16 }}>
        <input type="date" className="mx-input" style={{ width:160 }} value={from} onChange={e => setFrom(e.target.value)} />
        <input type="date" className="mx-input" style={{ width:160 }} value={to}   onChange={e => setTo(e.target.value)} />
        <select className="mx-select" style={{ width:180 }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="DRAFT">Borrador</option>
          <option value="POSTED">Contabilizado</option>
          <option value="VOIDED">Anulado</option>
        </select>
        <button onClick={load} className="mx-btn mx-btn-primary">Buscar</button>
      </div>
      {error && <div className="mx-alert mx-alert-error" style={{ marginBottom:16 }}>{error}</div>}
      <div className="mx-card-section">
        {loading ? (
          <div style={{ padding:16, display:'flex', flexDirection:'column', gap:8 }}>
            {[1,2,3].map(i => <div key={i} className="mx-skeleton" style={{ height:44, borderRadius:8 }} />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="mx-empty">Sin asientos en el período seleccionado</div>
        ) : (
          <table className="mx-table">
            <thead><tr><th style={{width:24}}></th><th>N° Asiento</th><th>Fecha</th><th>Descripción</th><th>Debe</th><th>Haber</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {entries.map(e => (
                <>
                  <tr key={e.id} onClick={() => toggle(e.id)} style={{ cursor:'pointer' }}>
                    <td style={{ color:'#86868B' }}>
                      {expanded.has(e.id) ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
                    </td>
                    <td style={{ fontFamily:'monospace', fontSize:12 }}>{e.entryNumber}</td>
                    <td style={{ color:'#86868B' }}>{formatDate(e.entryDate)}</td>
                    <td style={{ maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.description}</td>
                    <td style={{ fontWeight:600 }}>{formatCurrency(e.totalDebit)}</td>
                    <td style={{ fontWeight:600 }}>{formatCurrency(e.totalCredit)}</td>
                    <td><span className={STATUS_BADGE[e.status] ?? 'mx-badge mx-badge-neutral'}>{e.status}</span></td>
                    <td>
                      {e.status === 'DRAFT' && canPostEntry && (
                        <button onClick={ev => { ev.stopPropagation(); handlePost(e.id); }}
                          style={{ fontSize:12, color:'#0071E3', background:'none', border:'none', cursor:'pointer' }}>
                          Postear
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded.has(e.id) && e.lines?.map(l => (
                    <tr key={l.id} style={{ background:'#FAFAFA' }}>
                      <td></td><td></td><td></td>
                      <td style={{ paddingLeft:28, fontSize:12, color:'#3A3A3C' }}>
                        <span style={{ fontFamily:'monospace', color:'#0071E3', marginRight:8 }}>{l.accountCode}</span>
                        {l.accountName}
                        {l.description && <span style={{ color:'#86868B', marginLeft:8 }}>· {l.description}</span>}
                      </td>
                      <td style={{ fontSize:12 }}>{l.debit  > 0 ? formatCurrency(l.debit)  : '—'}</td>
                      <td style={{ fontSize:12 }}>{l.credit > 0 ? formatCurrency(l.credit) : '—'}</td>
                      <td></td><td></td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Tab 3: Mayor ───────────────────────────────────────────────

function LedgerTab({ preselectedCode }: { preselectedCode?:string }) {
  const now = new Date();
  const [code, setCode] = useState(preselectedCode ?? '');
  const [from, setFrom] = useState(`${now.getFullYear()}-01-01`);
  const [to,   setTo]   = useState(now.toISOString().split('T')[0]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const load = useCallback(() => {
    if (!code.trim() || !from || !to) return;
    setLoading(true); setError('');
    authClient.get(`/accounting/ledger/${code}?from=${from}&to=${to}`)
      .then(r => setEntries(Array.isArray(r.data) ? r.data : r.data?.entries ?? []))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, [code, from, to]);

  useEffect(() => { if (preselectedCode) load(); }, [preselectedCode]);

  const totalDebit  = entries.reduce((s, e) => s + Number(e.debit),  0);
  const totalCredit = entries.reduce((s, e) => s + Number(e.credit), 0);
  const lastBalance = entries.length > 0 ? Number(entries[entries.length-1].balance) : 0;

  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:16 }}>
        <input className="mx-input" style={{ width:140 }} placeholder="Cuenta (ej: 12.1)" value={code} onChange={e => setCode(e.target.value)} />
        <input type="date" className="mx-input" style={{ width:160 }} value={from} onChange={e => setFrom(e.target.value)} />
        <input type="date" className="mx-input" style={{ width:160 }} value={to}   onChange={e => setTo(e.target.value)} />
        <button onClick={load} className="mx-btn mx-btn-primary">Ver mayor</button>
      </div>
      {error && <div className="mx-alert mx-alert-error" style={{ marginBottom:16 }}>{error}</div>}
      <div className="mx-card-section">
        {loading ? (
          <div style={{ padding:16, display:'flex', flexDirection:'column', gap:8 }}>
            {[1,2,3].map(i => <div key={i} className="mx-skeleton" style={{ height:36, borderRadius:8 }} />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="mx-empty">
            {code ? 'Sin movimientos para esta cuenta en el período' : 'Ingresa un código de cuenta y selecciona el período'}
          </div>
        ) : (
          <table className="mx-table">
            <thead><tr><th>N° Asiento</th><th>Fecha</th><th>Descripción</th><th>Debe</th><th>Haber</th><th>Saldo</th></tr></thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td style={{ fontFamily:'monospace', fontSize:12 }}>{e.entryNumber}</td>
                  <td style={{ color:'#86868B' }}>{formatDate(e.entryDate)}</td>
                  <td>{e.description}</td>
                  <td>{e.debit  > 0 ? formatCurrency(e.debit)  : '—'}</td>
                  <td>{e.credit > 0 ? formatCurrency(e.credit) : '—'}</td>
                  <td style={{ fontWeight:600 }}>{formatCurrency(e.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:'#F9F9FB', fontWeight:600, borderTop:'1px solid #E5E5EA' }}>
                <td colSpan={3} style={{ padding:'12px 16px' }}>Totales</td>
                <td style={{ padding:'12px 16px' }}>{formatCurrency(totalDebit)}</td>
                <td style={{ padding:'12px 16px' }}>{formatCurrency(totalCredit)}</td>
                <td style={{ padding:'12px 16px', color:'#0071E3' }}>{formatCurrency(lastBalance)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Tab 4: Balance General ─────────────────────────────────────

function BalanceTab() {
  const [date,    setDate]    = useState(new Date().toISOString().split('T')[0]);
  const [balance, setBalance] = useState<BalanceSheet|null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const r = await authClient.get(`/accounting/balance-sheet?date=${date}`);
      setBalance(r.data);
    } catch (ex) { setError(errMsg(ex)); }
    finally { setLoading(false); }
  };

  const totalActivos    = balance?.totalActivos    ?? balance?.activos?.reduce((s,a)=>s+a.balance,0) ?? 0;
  const totalPasivos    = balance?.totalPasivos    ?? balance?.pasivos?.reduce((s,a)=>s+a.balance,0) ?? 0;
  const totalPatrimonio = balance?.totalPatrimonio ?? balance?.patrimonio?.reduce((s,a)=>s+a.balance,0) ?? 0;
  const totalPasivosPatrimonio = totalPasivos + totalPatrimonio;
  const diff    = Math.abs(totalActivos - totalPasivosPatrimonio);
  const balanced = diff < 0.01;

  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:20, alignItems:'flex-end' }}>
        <div>
          <label className="mx-label">Al cierre de</label>
          <input type="date" className="mx-input" style={{ width:180 }} value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <button onClick={load} disabled={loading} className="mx-btn mx-btn-primary" style={{ background:'#1D1D1F' }}>
          {loading ? 'Generando…' : 'Generar Balance'}
        </button>
      </div>

      {error && <div className="mx-alert mx-alert-error" style={{ marginBottom:16 }}>{error}</div>}

      {balance && (
        <>
          {/* Resumen */}
          <div style={{ background: balanced ? '#F0FDF4' : '#FFF8E1', border:`1px solid ${balanced?'#C8E6C9':'#FFE082'}`, borderRadius:12, padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', gap:32 }}>
              <div>
                <p style={{ fontSize:11, color:'#86868B', textTransform:'uppercase', letterSpacing:'0.4px' }}>Total Activos</p>
                <p style={{ fontSize:20, fontWeight:700, color:'#0071E3' }}>{formatCurrency(totalActivos)}</p>
              </div>
              <div>
                <p style={{ fontSize:11, color:'#86868B', textTransform:'uppercase', letterSpacing:'0.4px' }}>Pasivos + Patrimonio</p>
                <p style={{ fontSize:20, fontWeight:700, color:'#9B59B6' }}>{formatCurrency(totalPasivosPatrimonio)}</p>
              </div>
            </div>
            <div>
              {balanced
                ? <span style={{ fontSize:13, fontWeight:600, color:'#1B5E20' }}>✓ Balance cuadrado</span>
                : <span style={{ fontSize:13, fontWeight:600, color:'#E65100' }}>⚠ Diferencia: {formatCurrency(diff)}</span>}
            </div>
          </div>

          {/* Columnas */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {/* Activos */}
            <div className="mx-card-section">
              <div style={{ padding:'14px 20px', borderBottom:'0.5px solid #E5E5EA' }}>
                <span style={{ fontSize:15, fontWeight:700, color:'#0071E3' }}>Activos</span>
              </div>
              {(balance.activos ?? []).map((a, i) => (
                <div key={i} style={{ padding:'9px 20px', display:'flex', justifyContent:'space-between', borderBottom:'0.5px solid #F2F2F7' }}>
                  <div style={{ display:'flex', gap:10 }}>
                    <span style={{ fontFamily:'monospace', fontSize:12, color:'#0071E3' }}>{a.accountCode}</span>
                    <span style={{ fontSize:13, color:'#3A3A3C' }}>{a.accountName}</span>
                  </div>
                  <span style={{ fontSize:13, fontWeight:500 }}>{formatCurrency(a.balance)}</span>
                </div>
              ))}
              <div style={{ padding:'12px 20px', borderTop:'1px solid #E5E5EA', display:'flex', justifyContent:'space-between', background:'#F0F7FF' }}>
                <span style={{ fontSize:13, fontWeight:700 }}>TOTAL ACTIVOS</span>
                <span style={{ fontSize:14, fontWeight:700, color:'#0071E3' }}>{formatCurrency(totalActivos)}</span>
              </div>
            </div>

            {/* Pasivos + Patrimonio */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="mx-card-section">
                <div style={{ padding:'14px 20px', borderBottom:'0.5px solid #E5E5EA' }}>
                  <span style={{ fontSize:15, fontWeight:700, color:'#FF9F0A' }}>Pasivos</span>
                </div>
                {(balance.pasivos ?? []).map((p, i) => (
                  <div key={i} style={{ padding:'9px 20px', display:'flex', justifyContent:'space-between', borderBottom:'0.5px solid #F2F2F7' }}>
                    <div style={{ display:'flex', gap:10 }}>
                      <span style={{ fontFamily:'monospace', fontSize:12, color:'#FF9F0A' }}>{p.accountCode}</span>
                      <span style={{ fontSize:13, color:'#3A3A3C' }}>{p.accountName}</span>
                    </div>
                    <span style={{ fontSize:13, fontWeight:500 }}>{formatCurrency(p.balance)}</span>
                  </div>
                ))}
                <div style={{ padding:'12px 20px', borderTop:'1px solid #E5E5EA', display:'flex', justifyContent:'space-between', background:'#FFFBF0' }}>
                  <span style={{ fontSize:13, fontWeight:700 }}>TOTAL PASIVOS</span>
                  <span style={{ fontSize:14, fontWeight:700, color:'#FF9F0A' }}>{formatCurrency(totalPasivos)}</span>
                </div>
              </div>

              {(balance.patrimonio ?? []).length > 0 && (
                <div className="mx-card-section">
                  <div style={{ padding:'14px 20px', borderBottom:'0.5px solid #E5E5EA' }}>
                    <span style={{ fontSize:15, fontWeight:700, color:'#9B59B6' }}>Patrimonio</span>
                  </div>
                  {(balance.patrimonio ?? []).map((p, i) => (
                    <div key={i} style={{ padding:'9px 20px', display:'flex', justifyContent:'space-between', borderBottom:'0.5px solid #F2F2F7' }}>
                      <div style={{ display:'flex', gap:10 }}>
                        <span style={{ fontFamily:'monospace', fontSize:12, color:'#9B59B6' }}>{p.accountCode}</span>
                        <span style={{ fontSize:13, color:'#3A3A3C' }}>{p.accountName}</span>
                      </div>
                      <span style={{ fontSize:13, fontWeight:500 }}>{formatCurrency(p.balance)}</span>
                    </div>
                  ))}
                  <div style={{ padding:'12px 20px', borderTop:'1px solid #E5E5EA', display:'flex', justifyContent:'space-between', background:'#F5F0FF' }}>
                    <span style={{ fontSize:13, fontWeight:700 }}>TOTAL PATRIMONIO</span>
                    <span style={{ fontSize:14, fontWeight:700, color:'#9B59B6' }}>{formatCurrency(totalPatrimonio)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!balance && !loading && !error && (
        <div className="mx-empty">Selecciona una fecha y haz clic en "Generar Balance"</div>
      )}
    </div>
  );
}

// ── Tab 5: P&L ─────────────────────────────────────────────────

function PLTab() {
  const now = new Date();
  const [from,   setFrom]   = useState(`${now.getFullYear()}-01-01`);
  const [to,     setTo]     = useState(now.toISOString().split('T')[0]);
  const [report, setReport] = useState<IncomeStatement|null>(null);
  const [loading,setLoading]= useState(false);
  const [error,  setError]  = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const r = await authClient.get(`/accounting/income-statement?from=${from}&to=${to}`);
      setReport(r.data);
    } catch (ex) { setError(errMsg(ex)); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:20, alignItems:'flex-end' }}>
        <div>
          <label className="mx-label">Desde</label>
          <input type="date" className="mx-input" style={{ width:160 }} value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mx-label">Hasta</label>
          <input type="date" className="mx-input" style={{ width:160 }} value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button onClick={load} disabled={loading} className="mx-btn mx-btn-primary" style={{ background:'#1D1D1F' }}>
          {loading ? 'Generando…' : 'Generar P&L'}
        </button>
      </div>

      {error && <div className="mx-alert mx-alert-error" style={{ marginBottom:16 }}>{error}</div>}

      {report && (
        <div style={{ maxWidth:640 }}>
          {/* Ingresos */}
          <div className="mx-card-section" style={{ marginBottom:12 }}>
            <div style={{ padding:'12px 20px', background:'#F0FDF4', borderBottom:'0.5px solid #C8E6C9', display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, fontWeight:700, color:'#1B5E20' }}>INGRESOS</span>
              <span style={{ fontSize:13, fontWeight:700, color:'#34C759' }}>{formatCurrency(report.totalIngresos)}</span>
            </div>
            {(report.ingresos ?? []).map((l, i) => (
              <div key={i} style={{ padding:'9px 20px', display:'flex', justifyContent:'space-between', borderBottom:'0.5px solid #F2F2F7' }}>
                <div style={{ display:'flex', gap:10 }}>
                  <span style={{ fontFamily:'monospace', fontSize:12, color:'#86868B' }}>{l.accountCode}</span>
                  <span style={{ fontSize:13, color:'#3A3A3C' }}>{l.accountName}</span>
                </div>
                <span style={{ fontSize:13, fontWeight:500, color:'#34C759' }}>{formatCurrency(Math.abs(l.balance))}</span>
              </div>
            ))}
          </div>

          {/* Gastos */}
          <div className="mx-card-section" style={{ marginBottom:12 }}>
            <div style={{ padding:'12px 20px', background:'#FFF8E1', borderBottom:'0.5px solid #FFE082', display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, fontWeight:700, color:'#E65100' }}>GASTOS</span>
              <span style={{ fontSize:13, fontWeight:700, color:'#FF9F0A' }}>{formatCurrency(report.totalGastos)}</span>
            </div>
            {(report.gastos ?? []).map((l, i) => (
              <div key={i} style={{ padding:'9px 20px', display:'flex', justifyContent:'space-between', borderBottom:'0.5px solid #F2F2F7' }}>
                <div style={{ display:'flex', gap:10 }}>
                  <span style={{ fontFamily:'monospace', fontSize:12, color:'#86868B' }}>{l.accountCode}</span>
                  <span style={{ fontSize:13, color:'#3A3A3C' }}>{l.accountName}</span>
                </div>
                <span style={{ fontSize:13, fontWeight:500, color:'#FF9F0A' }}>{formatCurrency(l.balance)}</span>
              </div>
            ))}
          </div>

          {/* Utilidad neta */}
          <div style={{ padding:'16px 20px', background: report.utilidadNeta >= 0 ? '#E8F5E9' : '#FFEBEE', borderRadius:12, border:`1px solid ${report.utilidadNeta >= 0 ? '#C8E6C9' : '#FFCDD2'}`, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:15, fontWeight:700 }}>UTILIDAD NETA</span>
            <span style={{ fontSize:20, fontWeight:800, color: report.utilidadNeta >= 0 ? '#34C759' : '#FF3B30' }}>
              {formatCurrency(report.utilidadNeta)}
            </span>
          </div>
        </div>
      )}

      {!report && !loading && !error && (
        <div className="mx-empty">Selecciona el período y haz clic en "Generar P&L"</div>
      )}
    </div>
  );
}

// ── Tab 6: Períodos ────────────────────────────────────────────

function PeriodsTab() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [closing, setClosing] = useState('');
  const { canPostEntry } = usePermissions();

  const load = () => {
    setLoading(true);
    authClient.get('/accounting/periods/closed')
      .then(r => setPeriods(Array.isArray(r.data) ? r.data : []))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleClose = async () => {
    const now   = new Date();
    const yearS = prompt('Año a cerrar:', String(now.getFullYear()));
    const monthS= prompt('Mes a cerrar (1-12):', String(now.getMonth() + 1));
    const year  = parseInt(yearS ?? '');
    const month = parseInt(monthS ?? '');
    if (!year || !month) return;
    setClosing(`${year}-${month}`);
    try { await authClient.post(`/accounting/periods/${year}/${month}/close`); load(); }
    catch (ex) { setError(errMsg(ex)); }
    finally { setClosing(''); }
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        {canPostEntry && (
          <button onClick={handleClose} disabled={!!closing} className="mx-btn mx-btn-primary" style={{ background:'#1D1D1F' }}>
            <Lock size={14}/>{closing ? 'Cerrando…' : 'Cerrar período'}
          </button>
        )}
      </div>
      {error && <div className="mx-alert mx-alert-error" style={{ marginBottom:16 }}>{error}</div>}
      <div className="mx-card-section">
        {loading ? (
          <div style={{ padding:16, display:'flex', flexDirection:'column', gap:8 }}>
            {[1,2].map(i => <div key={i} className="mx-skeleton" style={{ height:36, borderRadius:8 }} />)}
          </div>
        ) : periods.length === 0 ? (
          <div className="mx-empty">Sin períodos cerrados aún</div>
        ) : (
          <table className="mx-table">
            <thead><tr><th>Período</th><th>Cerrado el</th><th>Por</th></tr></thead>
            <tbody>
              {periods.map((p, i) => (
                <tr key={i}>
                  <td style={{ fontWeight:600 }}>{MONTH_NAMES[p.month-1]} {p.year}</td>
                  <td style={{ color:'#86868B' }}>{formatDate(p.closedAt)}</td>
                  <td style={{ color:'#86868B' }}>{p.closedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────

const TABS = [
  { id:'plan',    label:'Plan de cuentas', icon:<List size={14}/> },
  { id:'journal', label:'Libro Diario',    icon:<BookOpen size={14}/> },
  { id:'ledger',  label:'Mayor',           icon:<BarChart2 size={14}/> },
  { id:'balance', label:'Balance General', icon:<Scale size={14}/> },
  { id:'pl',      label:'P&L',             icon:<TrendingUp size={14}/> },
  { id:'periods', label:'Períodos',        icon:<Lock size={14}/> },
];

export default function AccountingPage() {
  const [tab,        setTab]        = useState('plan');
  const [ledgerCode, setLedgerCode] = useState('');

  const goToLedger = (code: string) => { setLedgerCode(code); setTab('ledger'); };

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <div>
          <h1 className="mx-page-title">Contabilidad</h1>
          <p className="mx-page-subtitle">Plan contable PCGE · Libro Diario · Mayor · Estados Financieros · Cierre de períodos.</p>
        </div>
      </div>

      <div style={{ display:'flex', gap:2, background:'rgba(0,0,0,0.05)', padding:3, borderRadius:12, width:'fit-content', marginBottom:24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'none', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', background: tab === t.id ? '#fff' : 'transparent', color: tab === t.id ? '#1D1D1F' : '#86868B', boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.10)' : 'none', transition:'all 0.12s' }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'plan'    && <PlanTab onViewLedger={goToLedger} />}
      {tab === 'journal' && <JournalTab />}
      {tab === 'ledger'  && <LedgerTab preselectedCode={ledgerCode} />}
      {tab === 'balance' && <BalanceTab />}
      {tab === 'pl'      && <PLTab />}
      {tab === 'periods' && <PeriodsTab />}
    </div>
  );
}
