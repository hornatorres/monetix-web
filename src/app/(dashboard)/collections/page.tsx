'use client';

import { useEffect, useState, useCallback } from 'react';
import { authClient } from '@/lib/authClient';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { Plus, AlertCircle, Trash2 } from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────

interface BankAccount {
  id: string; bankName: string; accountNumber: string;
  currency: string; currentBalance: number; isActive: boolean;
}

interface Movement {
  id: string; bankAccountId: string; direction: string;
  amount: number; currency: string; movementDate: string;
  description: string; reference: string | null;
  matchedSaleId: string | null; matchedPurchaseId: string | null;
}

interface Overview {
  totalInflows: number; totalOutflows: number; netFlow: number;
  pendingToMatch: number; totalAccounts: number;
}

// ── Tab: Resumen + Cuentas ────────────────────────────────────

function AccountsTab() {
  const [overview,  setOverview]  = useState<Overview | null>(null);
  const [accounts,  setAccounts]  = useState<BankAccount[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [form, setForm] = useState({ bankName: '', accountNumber: '', currency: 'PEN', initialBalance: 0 });

  const load = () => {
    setLoading(true);
    Promise.all([
      authClient.get('/collections/overview').catch(() => ({ data: null })),
      authClient.get('/collections/accounts'),
    ]).then(([ov, ac]) => {
      setOverview(ov.data);
      setAccounts(Array.isArray(ac.data) ? ac.data : ac.data?.data ?? []);
    }).catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authClient.post('/collections/accounts', { ...form, initialBalance: Number(form.initialBalance) });
      setShowForm(false);
      setForm({ bankName: '', accountNumber: '', currency: 'PEN', initialBalance: 0 });
      load();
    } catch (ex) { setError(errMsg(ex)); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta cuenta bancaria?')) return;
    try {
      await authClient.delete(`/collections/accounts/${id}`);
      load();
    } catch (ex) { setError(errMsg(ex)); }
  };

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="mx-skeleton h-20 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-4">
      {error && <div className="p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}

      {/* KPIs */}
      {overview && (
        <div className="grid grid-cols-3 gap-4">
          <div className="mx-card p-4">
            <p className="text-xs text-[#86868B] mb-1">Ingresos del mes</p>
            <p className="text-xl font-semibold text-[#34C759]">{formatCurrency(overview.totalInflows)}</p>
          </div>
          <div className="mx-card p-4">
            <p className="text-xs text-[#86868B] mb-1">Egresos del mes</p>
            <p className="text-xl font-semibold text-[#FF3B30]">{formatCurrency(overview.totalOutflows)}</p>
          </div>
          <div className="mx-card p-4">
            <p className="text-xs text-[#86868B] mb-1">Flujo neto</p>
            <p className={`text-xl font-semibold ${overview.netFlow >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
              {formatCurrency(overview.netFlow)}
            </p>
          </div>
        </div>
      )}

      {/* Cuentas */}
      <div className="mx-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E5EA] flex items-center justify-between">
          <h3 className="text-sm font-medium">Cuentas bancarias</h3>
          <button onClick={() => setShowForm(!showForm)} className="mx-btn-primary text-xs px-3 py-1.5">
            <Plus size={13} /> Nueva cuenta
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="p-4 border-b border-[#E5E5EA] bg-[#F9F9FB]">
            <div className="grid grid-cols-4 gap-3">
              <input className="mx-input" placeholder="Banco" value={form.bankName}
                onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} required />
              <input className="mx-input" placeholder="N° cuenta" value={form.accountNumber}
                onChange={e => setForm(p => ({ ...p, accountNumber: e.target.value }))} required />
              <select className="mx-select" value={form.currency}
                onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                <option value="PEN">PEN</option>
                <option value="USD">USD</option>
              </select>
              <div className="flex gap-2">
                <input type="number" className="mx-input" placeholder="Saldo inicial" value={form.initialBalance || ''}
                  onChange={e => setForm(p => ({ ...p, initialBalance: Number(e.target.value) }))} />
                <button type="submit" className="mx-btn-primary px-3">✓</button>
              </div>
            </div>
          </form>
        )}

        {accounts.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#86868B]">Sin cuentas bancarias registradas</div>
        ) : (
          <table className="mx-table">
            <thead><tr><th>Banco</th><th>N° Cuenta</th><th>Moneda</th><th>Saldo</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.id}>
                  <td className="font-medium">{a.bankName}</td>
                  <td className="font-mono text-xs text-[#86868B]">{a.accountNumber}</td>
                  <td className="text-[#86868B]">{a.currency}</td>
                  <td className="font-medium">{formatCurrency(a.currentBalance, a.currency)}</td>
                  <td><span className={a.isActive ? 'mx-badge mx-badge-success' : 'mx-badge mx-badge-neutral'}>{a.isActive ? 'Activa' : 'Inactiva'}</span></td>
                  <td>
                    <button onClick={() => handleDelete(a.id)} className="text-[#FF3B30] hover:opacity-70 p-1">
                      <Trash2 size={14} />
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
  const [matched,   setMatched]   = useState('');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [form, setForm] = useState({
    bankAccountId: '', direction: 'IN', amount: '', currency: 'PEN',
    movementDate: new Date().toISOString().split('T')[0],
    description: '', reference: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '50' });
    if (accountId) params.set('bankAccountId', accountId);
    if (direction) params.set('direction',     direction);
    if (matched)   params.set('matched',       matched);
    authClient.get(`/collections/movements?${params}`)
      .then(r => setMovements(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, [accountId, direction, matched]);

  useEffect(() => {
    authClient.get('/collections/accounts').then(r => setAccounts(Array.isArray(r.data) ? r.data : r.data?.data ?? []));
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authClient.post('/collections/movements', { ...form, amount: Number(form.amount) });
      setShowForm(false);
      load();
    } catch (ex) { setError(errMsg(ex)); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este movimiento?')) return;
    try {
      await authClient.delete(`/collections/movements/${id}`);
      load();
    } catch (ex) { setError(errMsg(ex)); }
  };

  return (
    <div className="space-y-4">
      {error && <div className="p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}

      {/* Filtros */}
      <div className="mx-card p-3 flex items-center gap-3">
        <select className="mx-select w-44" value={accountId} onChange={e => setAccountId(e.target.value)}>
          <option value="">Todas las cuentas</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName} — {a.accountNumber}</option>)}
        </select>
        <select className="mx-select w-32" value={direction} onChange={e => setDirection(e.target.value)}>
          <option value="">Todos</option>
          <option value="IN">Ingresos</option>
          <option value="OUT">Egresos</option>
        </select>
        <select className="mx-select w-36" value={matched} onChange={e => setMatched(e.target.value)}>
          <option value="">Todos</option>
          <option value="matched">Conciliados</option>
          <option value="unmatched">Sin conciliar</option>
        </select>
        <button onClick={() => setShowForm(!showForm)} className="mx-btn-primary text-xs px-3 py-1.5 ml-auto">
          <Plus size={13} /> Registrar
        </button>
      </div>

      {showForm && (
        <div className="mx-card p-4">
          <form onSubmit={handleCreate} className="grid grid-cols-3 gap-3">
            <select className="mx-select" value={form.bankAccountId}
              onChange={e => setForm(p => ({ ...p, bankAccountId: e.target.value }))} required>
              <option value="">Seleccionar cuenta…</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName}</option>)}
            </select>
            <select className="mx-select" value={form.direction}
              onChange={e => setForm(p => ({ ...p, direction: e.target.value }))}>
              <option value="IN">Ingreso</option>
              <option value="OUT">Egreso</option>
            </select>
            <input type="number" className="mx-input" placeholder="Monto" value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
            <input type="date" className="mx-input" value={form.movementDate}
              onChange={e => setForm(p => ({ ...p, movementDate: e.target.value }))} required />
            <input className="mx-input" placeholder="Descripción" value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required />
            <div className="flex gap-2">
              <input className="mx-input" placeholder="Referencia" value={form.reference}
                onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} />
              <button type="submit" className="mx-btn-primary px-4">Guardar</button>
            </div>
          </form>
        </div>
      )}

      <div className="mx-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">{[1,2,3,4].map(i => <div key={i} className="mx-skeleton h-10 rounded-lg" />)}</div>
        ) : movements.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#86868B]">Sin movimientos</div>
        ) : (
          <table className="mx-table">
            <thead><tr><th>Fecha</th><th>Descripción</th><th>Dirección</th><th>Monto</th><th>Conciliado</th><th></th></tr></thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id}>
                  <td className="text-[#86868B]">{formatDate(m.movementDate)}</td>
                  <td className="text-sm">{m.description}</td>
                  <td>
                    <span className={m.direction === 'IN' ? 'mx-badge mx-badge-success' : 'mx-badge mx-badge-danger'}>
                      {m.direction === 'IN' ? '↑ Ingreso' : '↓ Egreso'}
                    </span>
                  </td>
                  <td className={`font-medium ${m.direction === 'IN' ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                    {formatCurrency(m.amount, m.currency)}
                  </td>
                  <td>
                    {(m.matchedSaleId || m.matchedPurchaseId)
                      ? <span className="mx-badge mx-badge-success">Sí</span>
                      : <span className="mx-badge mx-badge-neutral">No</span>}
                  </td>
                  <td>
                    {!m.matchedSaleId && !m.matchedPurchaseId && (
                      <button onClick={() => handleDelete(m.id)} className="text-[#FF3B30] hover:opacity-70 p-1">
                        <Trash2 size={14} />
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
  const [movements,    setMovements]    = useState<Movement[]>([]);
  const [selected,     setSelected]     = useState<string | null>(null);
  const [suggestions,  setSuggestions]  = useState<any[]>([]);
  const [direction,    setDirection]    = useState<'IN'|'OUT'>('IN');
  const [loading,      setLoading]      = useState(true);
  const [loadingSugg,  setLoadingSugg]  = useState(false);
  const [error,        setError]        = useState('');

  const load = useCallback(() => {
    setLoading(true);
    authClient.get(`/collections/movements?matched=unmatched&direction=${direction}&limit=50`)
      .then(r => setMovements(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, [direction]);

  useEffect(() => { load(); }, [load]);

  const loadSuggestions = async (movementId: string) => {
    setSelected(movementId);
    setLoadingSugg(true);
    try {
      const endpoint = direction === 'IN'
        ? `/collections/movements/${movementId}/suggestions`
        : `/collections/movements/${movementId}/purchase-suggestions`;
      const r = await authClient.get(endpoint);
      setSuggestions(Array.isArray(r.data) ? r.data : r.data?.suggestions ?? []);
    } catch { setSuggestions([]); }
    finally { setLoadingSugg(false); }
  };

  const handleMatch = async (movementId: string, invoiceId: string) => {
    try {
      if (direction === 'IN') {
        await authClient.post(`/collections/movements/${movementId}/match`, { invoiceId });
      } else {
        await authClient.post(`/collections/movements/${movementId}/match-purchase`, { purchaseId: invoiceId });
      }
      setSelected(null);
      setSuggestions([]);
      load();
    } catch (ex) { setError(errMsg(ex)); }
  };

  return (
    <div className="space-y-4">
      {error && <div className="p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}

      <div className="flex gap-1 bg-[#F2F2F7] p-1 rounded-xl w-fit">
        {(['IN','OUT'] as const).map(d => (
          <button key={d} onClick={() => setDirection(d)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              direction === d ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#86868B]'
            }`}
          >
            {d === 'IN' ? '↑ Ingresos' : '↓ Egresos'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Movimientos sin conciliar */}
        <div className="mx-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E5EA]">
            <h3 className="text-sm font-medium">Sin conciliar ({movements.length})</h3>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="mx-skeleton h-10 rounded-lg" />)}</div>
          ) : movements.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#86868B]">Todo conciliado ✓</div>
          ) : (
            <div className="divide-y divide-[#F2F2F7]">
              {movements.map(m => (
                <button
                  key={m.id}
                  onClick={() => loadSuggestions(m.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-[#F9F9FB] transition-colors ${selected === m.id ? 'bg-[#E3F2FD]' : ''}`}
                >
                  <p className="text-sm font-medium">{m.description}</p>
                  <p className="text-xs text-[#86868B] mt-0.5">
                    {formatDate(m.movementDate)} · {formatCurrency(m.amount, m.currency)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sugerencias */}
        <div className="mx-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E5EA]">
            <h3 className="text-sm font-medium">
              {selected ? 'Sugerencias de conciliación' : 'Selecciona un movimiento'}
            </h3>
          </div>
          {loadingSugg ? (
            <div className="p-4 space-y-2">{[1,2].map(i => <div key={i} className="mx-skeleton h-14 rounded-lg" />)}</div>
          ) : !selected ? (
            <div className="p-6 text-center text-sm text-[#86868B]">←  Selecciona un movimiento</div>
          ) : suggestions.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#86868B]">Sin sugerencias automáticas</div>
          ) : (
            <div className="divide-y divide-[#F2F2F7]">
              {suggestions.map((s: any) => (
                <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{s.invoiceNumber ?? s.id}</p>
                    <p className="text-xs text-[#86868B]">
                      {formatCurrency(s.totalAmount ?? s.amount)} · Score: {s.score ?? '—'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleMatch(selected, s.id)}
                    className="mx-btn-primary text-xs px-3 py-1.5"
                  >
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
        <h1 className="mx-page-title">Tesorería</h1>
      </div>

      <div className="flex gap-1 mb-6 bg-[#F2F2F7] p-1 rounded-xl w-fit">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === i ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
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
