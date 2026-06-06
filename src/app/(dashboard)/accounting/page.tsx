'use client';

import { useEffect, useState, useCallback } from 'react';
import { authClient } from '@/lib/authClient';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────

interface Account {
  id: string; code: string; name: string; type: string;
  nature: string; parentCode: string | null; isActive: boolean; allowsEntries: boolean;
}

interface JournalLine {
  id: string; lineOrder: number; accountCode: string;
  accountName: string; debit: number; credit: number; description: string | null;
}

interface JournalEntry {
  id: string; entryNumber: string; entryDate: string; description: string;
  referenceType: string; status: string; currency: string;
  totalDebit: number; totalCredit: number; lines: JournalLine[];
}

interface LedgerEntry {
  id: string; entryNumber: string; entryDate: string; description: string;
  debit: number; credit: number; balance: number;
}

const TYPE_BADGE: Record<string, string> = {
  ASSET:     'mx-badge mx-badge-info',
  LIABILITY: 'mx-badge mx-badge-danger',
  EQUITY:    'mx-badge mx-badge-purple',
  INCOME:    'mx-badge mx-badge-success',
  EXPENSE:   'mx-badge mx-badge-warning',
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT:  'mx-badge mx-badge-neutral',
  POSTED: 'mx-badge mx-badge-success',
  VOIDED: 'mx-badge mx-badge-danger',
};

// ── Tab: Plan de cuentas ──────────────────────────────────────

function ChartOfAccountsTab({ onViewLedger }: { onViewLedger: (code: string) => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filtered, setFiltered] = useState<Account[]>([]);
  const [search,   setSearch]   = useState('');
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
    const q = search.toLowerCase();
    setFiltered(accounts.filter(a => {
      const matchSearch = !q || a.code.includes(q) || a.name.toLowerCase().includes(q);
      const matchType   = !type || a.type === type;
      return matchSearch && matchType;
    }));
  }, [search, type, accounts]);

  const getIndent = (code: string) => (code.split('.').length - 1) * 16;

  if (loading) return <div className="p-4 space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="mx-skeleton h-10 rounded-lg" />)}</div>;

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input className="mx-input flex-1" placeholder="Buscar cuenta…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="mx-select w-40" value={type} onChange={e => setType(e.target.value)}>
          <option value="">Todos</option>
          {['ASSET','LIABILITY','EQUITY','INCOME','EXPENSE'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {error && <div className="p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F] mb-3">{error}</div>}
      <div className="mx-card overflow-hidden">
        <table className="mx-table">
          <thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Naturaleza</th><th></th></tr></thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id}>
                <td className="font-mono text-sm text-[#86868B]">{a.code}</td>
                <td style={{ paddingLeft: getIndent(a.code) + 14 }} className="text-sm">{a.name}</td>
                <td><span className={TYPE_BADGE[a.type] ?? 'mx-badge mx-badge-neutral'}>{a.type}</span></td>
                <td className="text-xs text-[#86868B]">{a.nature}</td>
                <td>
                  {a.allowsEntries && (
                    <button onClick={() => onViewLedger(a.code)} className="text-xs text-[#0071E3] hover:underline">
                      Ver mayor →
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#86868B] mt-2 px-1">{filtered.length} cuenta(s)</p>
    </div>
  );
}

// ── Tab: Libro Diario ─────────────────────────────────────────

function JournalTab() {
  const [entries,  setEntries]  = useState<JournalEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [from,     setFrom]     = useState('');
  const [to,       setTo]       = useState('');
  const [status,   setStatus]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '50' });
    if (from)   params.set('from',   from);
    if (to)     params.set('to',     to);
    if (status) params.set('status', status);
    authClient.get(`/accounting/journal-entries?${params}`)
      .then(r => setEntries(Array.isArray(r.data) ? r.data : r.data?.items ?? []))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, [from, to, status]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handlePost = async (id: string) => {
    try {
      await authClient.patch(`/accounting/journal-entries/${id}/post`);
      load();
    } catch (ex) { setError(errMsg(ex)); }
  };

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input type="date" className="mx-input w-40" value={from} onChange={e => setFrom(e.target.value)} placeholder="Desde" />
        <input type="date" className="mx-input w-40" value={to}   onChange={e => setTo(e.target.value)}   placeholder="Hasta" />
        <select className="mx-select w-40" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="DRAFT">Borrador</option>
          <option value="POSTED">Contabilizado</option>
          <option value="VOIDED">Anulado</option>
        </select>
        <button onClick={load} className="mx-btn-primary">Buscar</button>
      </div>
      {error && <div className="p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F] mb-3">{error}</div>}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="mx-skeleton h-12 rounded-lg" />)}</div>
      ) : entries.length === 0 ? (
        <div className="mx-card p-8 text-center text-sm text-[#86868B]">Sin asientos en el período</div>
      ) : (
        <div className="mx-card overflow-hidden">
          <table className="mx-table">
            <thead><tr><th></th><th>N° Asiento</th><th>Fecha</th><th>Descripción</th><th>Debe</th><th>Haber</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {entries.map(e => (
                <>
                  <tr key={e.id} className="cursor-pointer" onClick={() => toggle(e.id)}>
                    <td className="w-8">
                      {expanded.has(e.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td className="font-mono text-xs">{e.entryNumber}</td>
                    <td className="text-[#86868B]">{formatDate(e.entryDate)}</td>
                    <td className="text-sm max-w-xs truncate">{e.description}</td>
                    <td className="font-medium">{formatCurrency(e.totalDebit)}</td>
                    <td className="font-medium">{formatCurrency(e.totalCredit)}</td>
                    <td><span className={STATUS_BADGE[e.status] ?? 'mx-badge mx-badge-neutral'}>{e.status}</span></td>
                    <td>
                      {e.status === 'DRAFT' && (
                        <button onClick={ev => { ev.stopPropagation(); handlePost(e.id); }}
                          className="text-xs text-[#0071E3] hover:underline">
                          Postear
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded.has(e.id) && e.lines?.map(l => (
                    <tr key={l.id} className="bg-[#F9F9FB]">
                      <td></td>
                      <td></td>
                      <td></td>
                      <td className="pl-6 text-xs text-[#86868B]">{l.accountCode} — {l.accountName}</td>
                      <td className="text-xs">{l.debit > 0 ? formatCurrency(l.debit) : '—'}</td>
                      <td className="text-xs">{l.credit > 0 ? formatCurrency(l.credit) : '—'}</td>
                      <td></td>
                      <td></td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab: Mayor ────────────────────────────────────────────────

function LedgerTab({ preselectedCode }: { preselectedCode?: string }) {
  const [code,    setCode]    = useState(preselectedCode ?? '');
  const [from,    setFrom]    = useState('');
  const [to,      setTo]      = useState('');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [totals,  setTotals]  = useState({ debit: 0, credit: 0, balance: 0 });

  const load = useCallback(() => {
    if (!code.trim()) return;
    setLoading(true); setError('');
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to)   params.set('to',   to);
    authClient.get(`/accounting/ledger/${code}?${params}`)
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : r.data?.entries ?? [];
        setEntries(data);
        setTotals({
          debit:   data.reduce((s: number, e: LedgerEntry) => s + Number(e.debit),  0),
          credit:  data.reduce((s: number, e: LedgerEntry) => s + Number(e.credit), 0),
          balance: data.length > 0 ? Number(data[data.length - 1].balance) : 0,
        });
      })
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, [code, from, to]);

  useEffect(() => { if (preselectedCode) load(); }, [preselectedCode]);

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input className="mx-input w-32" placeholder="Cuenta (ej: 12.1)" value={code} onChange={e => setCode(e.target.value)} />
        <input type="date" className="mx-input w-40" value={from} onChange={e => setFrom(e.target.value)} />
        <input type="date" className="mx-input w-40" value={to}   onChange={e => setTo(e.target.value)} />
        <button onClick={load} className="mx-btn-primary">Ver mayor</button>
      </div>
      {error && <div className="p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F] mb-3">{error}</div>}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="mx-skeleton h-10 rounded-lg" />)}</div>
      ) : entries.length === 0 ? (
        <div className="mx-card p-8 text-center text-sm text-[#86868B]">
          {code ? 'Sin movimientos para esta cuenta' : 'Ingresa un código de cuenta'}
        </div>
      ) : (
        <div className="mx-card overflow-hidden">
          <table className="mx-table">
            <thead><tr><th>N° Asiento</th><th>Fecha</th><th>Descripción</th><th>Debe</th><th>Haber</th><th>Saldo</th></tr></thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td className="font-mono text-xs">{e.entryNumber}</td>
                  <td className="text-[#86868B]">{formatDate(e.entryDate)}</td>
                  <td className="text-sm">{e.description}</td>
                  <td>{e.debit > 0 ? formatCurrency(e.debit) : '—'}</td>
                  <td>{e.credit > 0 ? formatCurrency(e.credit) : '—'}</td>
                  <td className="font-medium">{formatCurrency(e.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#E5E5EA] bg-[#F9F9FB] font-semibold">
                <td colSpan={3} className="px-4 py-3 text-sm">Totales</td>
                <td className="px-4 py-3">{formatCurrency(totals.debit)}</td>
                <td className="px-4 py-3">{formatCurrency(totals.credit)}</td>
                <td className="px-4 py-3">{formatCurrency(totals.balance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────

const TABS = ['Plan de cuentas', 'Libro Diario', 'Mayor'];

export default function AccountingPage() {
  const [tab,            setTab]            = useState(0);
  const [ledgerCode,     setLedgerCode]     = useState('');

  const goToLedger = (code: string) => {
    setLedgerCode(code);
    setTab(2);
  };

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <h1 className="mx-page-title">Contabilidad</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#F2F2F7] p-1 rounded-xl w-fit">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === i
                ? 'bg-white text-[#1D1D1F] shadow-sm'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <ChartOfAccountsTab onViewLedger={goToLedger} />}
      {tab === 1 && <JournalTab />}
      {tab === 2 && <LedgerTab preselectedCode={ledgerCode} />}
    </div>
  );
}
