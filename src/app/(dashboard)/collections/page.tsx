'use client';

import { useEffect, useState, useCallback } from 'react';
import { authClient } from '@/lib/authClient';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';

interface BankAccount {
  id:string; bankName:string; accountNumber:string;
  currency:string; currentBalance:number; isActive:boolean;
}

interface Movement {
  id:string; bankAccountId:string; direction:string;
  amount:number; currency:string;
  // el backend puede usar date o movementDate
  date?:string; movementDate?:string;
  description:string; reference:string|null;
  matchedSaleId:string|null; matchedPurchaseId:string|null;
}

interface Overview {
  totalInflows:number; totalOutflows:number; netFlow:number; pendingToMatch:number;
}

// Helper: obtiene la fecha del movimiento independientemente del campo
const getMvDate = (m: Movement) => m.date ?? m.movementDate ?? '';

// ── Tab: Resumen + Cuentas ────────────────────────────────────

function AccountsTab() {
  const [overview, setOverview] = useState<Overview|null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ bankName:'', accountNumber:'', currency:'PEN', initialBalance:0 });

  const load = () => {
    setLoading(true);
    Promise.all([
      authClient.get('/collections/overview').catch(() => ({ data:null })),
      authClient.get('/collections/accounts'),
    ]).then(([ov, ac]) => {
      setOverview(ov.data);
      setAccounts(Array.isArray(ac.data) ? ac.data : ac.data?.data ?? []);
    }).catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e:React.FormEvent) => {
    e.preventDefault();
    try {
      await authClient.post('/collections/accounts', { ...form, initialBalance: Number(form.initialBalance) });
      setShowForm(false);
      setForm({ bankName:'', accountNumber:'', currency:'PEN', initialBalance:0 });
      load();
    } catch (ex) { setError(errMsg(ex)); }
  };

  const handleDelete = async (id:string) => {
    if (!confirm('¿Eliminar esta cuenta bancaria?')) return;
    try { await authClient.delete(`/collections/accounts/${id}`); load(); }
    catch (ex) { setError(errMsg(ex)); }
  };

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {[1,2].map(i => <div key={i} className="mx-skeleton" style={{ height:80, borderRadius:14 }}/>)}
    </div>
  );

  return (
    <div>
      {error && <div className="mx-alert mx-alert-error" style={{ marginBottom:16 }}>{error}</div>}

      {overview && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
          <div className="mx-kpi">
            <div className="mx-kpi-label">Ingresos del mes</div>
            <div className="mx-kpi-value" style={{ color:'#34C759', fontSize:22 }}>{formatCurrency(overview.totalInflows)}</div>
          </div>
          <div className="mx-kpi">
            <div className="mx-kpi-label">Egresos del mes</div>
            <div className="mx-kpi-value" style={{ color:'#FF3B30', fontSize:22 }}>{formatCurrency(overview.totalOutflows)}</div>
          </div>
          <div className="mx-kpi">
            <div className="mx-kpi-label">Flujo neto</div>
            <div className="mx-kpi-value" style={{ fontSize:22, color: overview.netFlow >= 0 ? '#34C759' : '#FF3B30' }}>
              {formatCurrency(overview.netFlow)}
            </div>
          </div>
        </div>
      )}

      <div className="mx-card-section">
        <div style={{ padding:'14px 20px', borderBottom:'0.5px solid #E5E5EA', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:14, fontWeight:600 }}>Cuentas bancarias</h3>
          <button onClick={() => setShowForm(!showForm)} className="mx-btn mx-btn-primary" style={{ padding:'6px 14px', fontSize:12 }}>
            <Plus size={13}/>Nueva cuenta
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} style={{ padding:'14px 20px', background:'#F9F9FB', borderBottom:'0.5px solid #E5E5EA', display:'flex', gap:8, flexWrap:'wrap' }}>
            <div style={{ flex:'1 1 120px' }}>
              <label className="mx-label">Banco *</label>
              <input className="mx-input" value={form.bankName} onChange={e => setForm(p=>({...p,bankName:e.target.value}))} required placeholder="BCP, BBVA…"/>
            </div>
            <div style={{ flex:'1 1 150px' }}>
              <label className="mx-label">N° cuenta *</label>
              <input className="mx-input" value={form.accountNumber} onChange={e => setForm(p=>({...p,accountNumber:e.target.value}))} required/>
            </div>
            <div style={{ flex:'0 0 100px' }}>
              <label className="mx-label">Moneda</label>
              <select className="mx-select" value={form.currency} onChange={e => setForm(p=>({...p,currency:e.target.value}))}>
                <option value="PEN">PEN</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div style={{ flex:'1 1 130px' }}>
              <label className="mx-label">Saldo inicial</label>
              <input type="number" className="mx-input" value={form.initialBalance||''} onChange={e => setForm(p=>({...p,initialBalance:Number(e.target.value)}))}/>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
              <button type="submit" className="mx-btn mx-btn-primary">Guardar</button>
              <button type="button" onClick={() => setShowForm(false)} className="mx-btn mx-btn-secondary">✕</button>
            </div>
          </form>
        )}

        {accounts.length === 0 ? (
          <div className="mx-empty">Sin cuentas bancarias registradas</div>
        ) : (
          <table className="mx-table">
            <thead><tr><th>Banco</th><th>N° Cuenta</th><th>Moneda</th><th>Saldo actual</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight:500 }}>{a.bankName}</td>
                  <td style={{ fontFamily:'monospace', fontSize:12, color:'#86868B' }}>{a.accountNumber}</td>
                  <td style={{ color:'#86868B' }}>{a.currency}</td>
                  <td style={{ fontWeight:700, color:'#0071E3' }}>{formatCurrency(a.currentBalance, a.currency)}</td>
                  <td><span className={a.isActive ? 'mx-badge mx-badge-success' : 'mx-badge mx-badge-neutral'}>{a.isActive ? 'Activa' : 'Inactiva'}</span></td>
                  <td>
                    <button onClick={() => handleDelete(a.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#FF3B30', padding:4 }}>
                      <Trash2 size={14}/>
                    </button>
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

// ── Tab: Movimientos ──────────────────────────────────────────

function MovementsTab() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [accounts,  setAccounts]  = useState<BankAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [direction, setDirection] = useState('');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [form, setForm] = useState({
    bankAccountId:'', direction:'IN', amount:'', currency:'PEN',
    date: new Date().toISOString().split('T')[0],
    description:'', reference:'',
  });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit:'50' });
    if (accountId) params.set('bankAccountId', accountId);
    if (direction) params.set('direction', direction);
    authClient.get(`/collections/movements?${params}`)
      .then(r => setMovements(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, [accountId, direction]);

  useEffect(() => {
    authClient.get('/collections/accounts').then(r => setAccounts(Array.isArray(r.data) ? r.data : r.data?.data ?? []));
    load();
  }, [load]);

  const handleCreate = async (e:React.FormEvent) => {
    e.preventDefault();
    try {
      await authClient.post('/collections/movements', { ...form, amount: Number(form.amount) });
      setShowForm(false);
      load();
    } catch (ex) { setError(errMsg(ex)); }
  };

  const handleDelete = async (id:string) => {
    if (!confirm('¿Eliminar este movimiento?')) return;
    try { await authClient.delete(`/collections/movements/${id}`); load(); }
    catch (ex) { setError(errMsg(ex)); }
  };

  return (
    <div>
      {error && <div className="mx-alert mx-alert-error" style={{ marginBottom:16 }}>{error}</div>}

      <div style={{ display:'flex', gap:12, marginBottom:16 }}>
        <select className="mx-select" style={{ width:220 }} value={accountId} onChange={e => setAccountId(e.target.value)}>
          <option value="">Todas las cuentas</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName} — {a.accountNumber}</option>)}
        </select>
        <select className="mx-select" style={{ width:140 }} value={direction} onChange={e => setDirection(e.target.value)}>
          <option value="">Todos</option>
          <option value="IN">Ingresos</option>
          <option value="OUT">Egresos</option>
        </select>
        <button onClick={() => setShowForm(!showForm)} className="mx-btn mx-btn-primary" style={{ marginLeft:'auto', padding:'7px 14px', fontSize:12 }}>
          <Plus size={13}/>Registrar movimiento
        </button>
      </div>

      {showForm && (
        <div className="mx-form-card" style={{ marginBottom:16 }}>
          <div className="mx-form-title">Nuevo movimiento</div>
          <form onSubmit={handleCreate}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:12 }}>
              <div>
                <label className="mx-label">Cuenta *</label>
                <select className="mx-select" value={form.bankAccountId} onChange={e => setForm(p=>({...p,bankAccountId:e.target.value}))} required>
                  <option value="">Seleccionar…</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName}</option>)}
                </select>
              </div>
              <div>
                <label className="mx-label">Dirección</label>
                <select className="mx-select" value={form.direction} onChange={e => setForm(p=>({...p,direction:e.target.value}))}>
                  <option value="IN">Ingreso</option>
                  <option value="OUT">Egreso</option>
                </select>
              </div>
              <div>
                <label className="mx-label">Monto *</label>
                <input type="number" className="mx-input" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))} required/>
              </div>
              <div>
                <label className="mx-label">Fecha *</label>
                <input type="date" className="mx-input" value={form.date} onChange={e => setForm(p=>({...p,date:e.target.value}))} required/>
              </div>
              <div>
                <label className="mx-label">Descripción *</label>
                <input className="mx-input" value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} required/>
              </div>
              <div>
                <label className="mx-label">Referencia</label>
                <input className="mx-input" value={form.reference} onChange={e => setForm(p=>({...p,reference:e.target.value}))} placeholder="N° operación…"/>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)} className="mx-btn mx-btn-secondary">Cancelar</button>
              <button type="submit" className="mx-btn mx-btn-primary">Guardar movimiento</button>
            </div>
          </form>
        </div>
      )}

      <div className="mx-card-section">
        {loading ? (
          <div style={{ padding:16, display:'flex', flexDirection:'column', gap:8 }}>
            {[1,2,3,4].map(i => <div key={i} className="mx-skeleton" style={{ height:44, borderRadius:8 }}/>)}
          </div>
        ) : movements.length === 0 ? (
          <div className="mx-empty">Sin movimientos registrados</div>
        ) : (
          <table className="mx-table">
            <thead>
              <tr><th>Fecha</th><th>Descripción</th><th>Dirección</th><th>Monto</th><th>Referencia</th><th>Conciliado</th><th></th></tr>
            </thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id}>
                  <td style={{ color:'#86868B' }}>{formatDate(getMvDate(m))}</td>
                  <td style={{ fontWeight:500 }}>{m.description}</td>
                  <td>
                    <span className={m.direction === 'IN' ? 'mx-badge mx-badge-success' : 'mx-badge mx-badge-danger'}>
                      {m.direction === 'IN' ? '↑ Ingreso' : '↓ Egreso'}
                    </span>
                  </td>
                  <td style={{ fontWeight:700, color: m.direction === 'IN' ? '#34C759' : '#FF3B30' }}>
                    {formatCurrency(m.amount, m.currency)}
                  </td>
                  <td style={{ color:'#86868B', fontSize:12 }}>{m.reference ?? '—'}</td>
                  <td>
                    <span className={(m.matchedSaleId || m.matchedPurchaseId) ? 'mx-badge mx-badge-success' : 'mx-badge mx-badge-neutral'}>
                      {(m.matchedSaleId || m.matchedPurchaseId) ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td>
                    {!m.matchedSaleId && !m.matchedPurchaseId && (
                      <button onClick={() => handleDelete(m.id)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#FF3B30', padding:4 }}>
                        <Trash2 size={14}/>
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

// ── Tab: Conciliación ─────────────────────────────────────────

function ReconciliationTab() {
  const [movements,   setMovements]   = useState<Movement[]>([]);
  const [selected,    setSelected]    = useState<string|null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [direction,   setDirection]   = useState<'IN'|'OUT'>('IN');
  const [loading,     setLoading]     = useState(true);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [error,       setError]       = useState('');

  const load = useCallback(() => {
    setLoading(true);
    authClient.get(`/collections/movements?matched=unmatched&direction=${direction}&limit=50`)
      .then(r => setMovements(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, [direction]);

  useEffect(() => { load(); }, [load]);

  const loadSuggestions = async (movementId:string) => {
    setSelected(movementId); setLoadingSugg(true);
    try {
      const endpoint = direction === 'IN'
        ? `/collections/movements/${movementId}/suggestions`
        : `/collections/movements/${movementId}/purchase-suggestions`;
      const r = await authClient.get(endpoint);
      setSuggestions(Array.isArray(r.data) ? r.data : r.data?.suggestions ?? []);
    } catch { setSuggestions([]); }
    finally { setLoadingSugg(false); }
  };

  const handleMatch = async (movementId:string, targetId:string) => {
    try {
      if (direction === 'IN') {
        await authClient.post(`/collections/movements/${movementId}/match`, { invoiceId: targetId });
      } else {
        await authClient.post(`/collections/movements/${movementId}/match-purchase`, { purchaseId: targetId });
      }
      setSelected(null); setSuggestions([]); load();
    } catch (ex) { setError(errMsg(ex)); }
  };

  return (
    <div>
      {error && <div className="mx-alert mx-alert-error" style={{ marginBottom:16 }}>{error}</div>}

      <div style={{ display:'flex', gap:2, background:'rgba(0,0,0,0.05)', padding:3, borderRadius:10, width:'fit-content', marginBottom:20 }}>
        {(['IN','OUT'] as const).map(d => (
          <button key={d} onClick={() => setDirection(d)}
            style={{ padding:'6px 16px', borderRadius:7, border:'none', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', background: direction===d ? '#fff' : 'transparent', color: direction===d ? '#1D1D1F' : '#86868B', boxShadow: direction===d ? '0 1px 3px rgba(0,0,0,0.10)' : 'none' }}>
            {d === 'IN' ? '↑ Ingresos' : '↓ Egresos'}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Sin conciliar */}
        <div className="mx-card-section">
          <div style={{ padding:'12px 20px', borderBottom:'0.5px solid #E5E5EA' }}>
            <h3 style={{ fontSize:13, fontWeight:600 }}>Sin conciliar ({movements.length})</h3>
          </div>
          {loading ? (
            <div style={{ padding:12, display:'flex', flexDirection:'column', gap:8 }}>
              {[1,2,3].map(i => <div key={i} className="mx-skeleton" style={{ height:56, borderRadius:8 }}/>)}
            </div>
          ) : movements.length === 0 ? (
            <div className="mx-empty" style={{ padding:32 }}>Todo conciliado ✓</div>
          ) : (
            <div>
              {movements.map(m => (
                <button key={m.id} onClick={() => loadSuggestions(m.id)}
                  style={{ width:'100%', padding:'12px 20px', border:'none', background: selected===m.id ? '#EFF6FF' : 'transparent', cursor:'pointer', textAlign:'left', borderBottom:'0.5px solid #F2F2F7', fontFamily:'inherit', borderLeft: selected===m.id ? '3px solid #0071E3' : '3px solid transparent' }}>
                  <p style={{ fontSize:13, fontWeight:500, color:'#1D1D1F' }}>{m.description}</p>
                  <p style={{ fontSize:12, color:'#86868B', marginTop:2 }}>
                    {formatDate(getMvDate(m))} · <strong style={{ color: direction==='IN'?'#34C759':'#FF3B30' }}>{formatCurrency(m.amount, m.currency)}</strong>
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sugerencias */}
        <div className="mx-card-section">
          <div style={{ padding:'12px 20px', borderBottom:'0.5px solid #E5E5EA' }}>
            <h3 style={{ fontSize:13, fontWeight:600 }}>
              {selected ? 'Sugerencias de conciliación' : 'Selecciona un movimiento'}
            </h3>
          </div>
          {loadingSugg ? (
            <div style={{ padding:12, display:'flex', flexDirection:'column', gap:8 }}>
              {[1,2].map(i => <div key={i} className="mx-skeleton" style={{ height:56, borderRadius:8 }}/>)}
            </div>
          ) : !selected ? (
            <div className="mx-empty" style={{ padding:32, fontSize:13, color:'#86868B' }}>← Selecciona un movimiento</div>
          ) : suggestions.length === 0 ? (
            <div className="mx-empty" style={{ padding:32 }}>Sin sugerencias automáticas</div>
          ) : (
            <div>
              {suggestions.map((s:any) => (
                <div key={s.id} style={{ padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'0.5px solid #F2F2F7' }}>
                  <div>
                    <p style={{ fontSize:13, fontWeight:500 }}>{s.invoiceNumber ?? s.id}</p>
                    <p style={{ fontSize:12, color:'#86868B' }}>
                      {formatCurrency(s.totalAmount ?? s.amount)}
                      {s.score ? ` · Coincidencia: ${Math.round(s.score * 100)}%` : ''}
                    </p>
                  </div>
                  <button onClick={() => handleMatch(selected, s.id)} className="mx-btn mx-btn-primary" style={{ padding:'6px 14px', fontSize:12 }}>
                    Conciliar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────

const TABS = ['Resumen + Cuentas', 'Movimientos', 'Conciliación'];

export default function CollectionsPage() {
  const [tab, setTab] = useState(0);
  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <div><h1 className="mx-page-title">Tesorería</h1><p className="mx-page-subtitle">Cuentas bancarias, movimientos y conciliación</p></div>
      </div>
      <div style={{ display:'flex', gap:2, background:'rgba(0,0,0,0.05)', padding:3, borderRadius:12, width:'fit-content', marginBottom:24 }}>
        {TABS.map((t,i) => (
          <button key={t} onClick={() => setTab(i)}
            style={{ padding:'7px 16px', borderRadius:8, border:'none', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', background: tab===i ? '#fff' : 'transparent', color: tab===i ? '#1D1D1F' : '#86868B', boxShadow: tab===i ? '0 1px 4px rgba(0,0,0,0.10)' : 'none', transition:'all 0.12s' }}>
            {t}
          </button>
        ))}
      </div>
      {tab === 0 && <AccountsTab />}
      {tab === 1 && <MovementsTab />}
      {tab === 2 && <ReconciliationTab />}
    </div>
  );
}
