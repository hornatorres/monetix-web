'use client';

import { useEffect, useState, useCallback } from 'react';
import { authClient } from '@/lib/authClient';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';

interface Obligation {
  id: string; taxType: string; period: string; dueDate: string;
  baseAmount: number; taxAmount: number; status: string;
  paidAmount: number; balance: number;
}

interface MonthData {
  month: number; year: number;
  obligations: any[];
}

interface UitConfig { year: number; value: number; }
interface TimConfig { rate: number; effectiveFrom: string; }

const STATUS_BADGE: Record<string, string> = {
  PENDING:  'mx-badge mx-badge-warning',
  PAID:     'mx-badge mx-badge-success',
  OVERDUE:  'mx-badge mx-badge-danger',
  PARTIAL:  'mx-badge mx-badge-info',
  DECLARED: 'mx-badge mx-badge-neutral',
};

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ── Tab: Cronograma ───────────────────────────────────────────

function TimelineTab() {
  const [year,     setYear]     = useState(new Date().getFullYear());
  const [months,   setMonths]   = useState<MonthData[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const load = useCallback(() => {
    setLoading(true);
    authClient.get(`/taxes/timeline/${year}`)
      .then(r => {
        // El backend devuelve { year, months: { "1": [], "2": [], ... }, totals }
        const raw = r.data?.months ?? {};
        const parsed: MonthData[] = Object.entries(raw).map(([month, obligations]) => ({
          month:       Number(month),
          year:        r.data.year ?? year,
          obligations: Array.isArray(obligations) ? obligations : [],
        }));
        setMonths(parsed.sort((a, b) => a.month - b.month));
      })
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const handleSync = async (y: number, m: number) => {
    try {
      await authClient.post(`/taxes/sync/${y}/${m}`);
      load();
    } catch (ex) { setError(errMsg(ex)); }
  };

  const now = new Date();

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setYear(y => y - 1)} className="mx-btn-secondary px-3 py-2">←</button>
        <span className="text-lg font-semibold text-[#1D1D1F] w-16 text-center">{year}</span>
        <button onClick={() => setYear(y => y + 1)} className="mx-btn-secondary px-3 py-2">→</button>
      </div>

      {error && <div className="p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F] mb-3">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[...Array(12)].map((_, i) => <div key={i} className="mx-skeleton h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {months.map(m => {
            const isCurrentMonth = m.month === now.getMonth() + 1 && m.year === now.getFullYear();
            const isExpanded     = expanded === m.month;
            const hasObligs      = m.obligations.length > 0;

            return (
              <div
                key={m.month}
                className={`mx-card p-4 cursor-pointer transition-all ${isCurrentMonth ? 'ring-2 ring-[#0071E3]' : ''}`}
                onClick={() => setExpanded(isExpanded ? null : m.month)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${isCurrentMonth ? 'text-[#0071E3]' : 'text-[#1D1D1F]'}`}>
                    {MONTH_NAMES[m.month - 1]}
                  </span>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
                <p className="text-xs text-[#86868B]">{hasObligs ? `${m.obligations.length} obligación(es)` : 'Sin obligaciones'}</p>

                {isExpanded && (
                  <div className="mt-3 border-t border-[#E5E5EA] pt-3 space-y-2">
                    {hasObligs ? m.obligations.map((o: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-xs">{o.taxType ?? o.type ?? 'Obligación'}</span>
                        <span className={STATUS_BADGE[o.status] ?? 'mx-badge mx-badge-neutral'}>{o.status}</span>
                      </div>
                    )) : (
                      <p className="text-xs text-[#86868B]">Sin obligaciones este mes</p>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); handleSync(m.year, m.month); }}
                      className="text-xs text-[#0071E3] hover:underline mt-1 block"
                    >
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
  const [paying,      setPaying]      = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    authClient.get('/taxes/obligations?limit=50')
      .then(r => setObligations(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handlePay = async (id: string) => {
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

  return (
    <div>
      {error && <div className="p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F] mb-3">{error}</div>}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="mx-skeleton h-12 rounded-lg" />)}</div>
      ) : obligations.length === 0 ? (
        <div className="mx-card p-8 text-center text-sm text-[#86868B]">Sin obligaciones registradas</div>
      ) : (
        <div className="mx-card overflow-hidden">
          <table className="mx-table">
            <thead>
              <tr><th>Tipo</th><th>Período</th><th>Vencimiento</th><th>Importe</th><th>Pagado</th><th>Saldo</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {obligations.map(o => (
                <tr key={o.id}>
                  <td className="font-medium">{o.taxType}</td>
                  <td className="text-[#86868B]">{o.period}</td>
                  <td className="text-[#86868B]">{formatDate(o.dueDate)}</td>
                  <td>{formatCurrency(o.taxAmount)}</td>
                  <td className="text-[#34C759]">{formatCurrency(o.paidAmount)}</td>
                  <td className={Number(o.balance) > 0 ? 'font-medium text-[#FF3B30]' : 'text-[#86868B]'}>
                    {formatCurrency(o.balance)}
                  </td>
                  <td><span className={STATUS_BADGE[o.status] ?? 'mx-badge mx-badge-neutral'}>{o.status}</span></td>
                  <td>
                    {['PENDING','PARTIAL','OVERDUE'].includes(o.status) && (
                      <button onClick={() => handlePay(o.id)} disabled={paying === o.id}
                        className="text-xs text-[#0071E3] hover:underline">
                        {paying === o.id ? 'Pagando…' : 'Pagar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab: Configuración ────────────────────────────────────────

function ConfigTab() {
  const [uit,     setUit]     = useState<UitConfig[]>([]);
  const [tim,     setTim]     = useState<TimConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [newUit,  setNewUit]  = useState({ year: new Date().getFullYear(), value: 0 });
  const [newTim,  setNewTim]  = useState({ rate: 0, effectiveFrom: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    Promise.all([
      authClient.get('/taxes/config/uit').catch(() => ({ data: [] })),
      authClient.get('/taxes/config/tim').catch(() => ({ data: null })),
    ]).then(([u, t]) => {
      setUit(Array.isArray(u.data) ? u.data : []);
      setTim(t.data);
    }).catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, []);

  const handleAddUit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authClient.post('/taxes/config/uit', newUit);
      const r = await authClient.get('/taxes/config/uit');
      setUit(Array.isArray(r.data) ? r.data : []);
    } catch (ex) { setError(errMsg(ex)); }
  };

  const handleUpdateTim = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authClient.post('/taxes/config/tim', newTim);
      const r = await authClient.get('/taxes/config/tim');
      setTim(r.data);
    } catch (ex) { setError(errMsg(ex)); }
  };

  if (loading) return <div className="mx-skeleton h-48 rounded-2xl" />;

  return (
    <div className="space-y-4">
      {error && <div className="p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}

      <div className="mx-card p-6">
        <h3 className="text-sm font-medium text-[#1D1D1F] mb-4">UIT — Unidad Impositiva Tributaria</h3>
        <div className="space-y-2 mb-4">
          {uit.length === 0 ? (
            <p className="text-sm text-[#86868B]">Sin valores registrados</p>
          ) : uit.map((u, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-[#86868B]">{u.year}</span>
              <span className="font-medium">{formatCurrency(u.value)}</span>
            </div>
          ))}
        </div>
        <form onSubmit={handleAddUit} className="flex gap-2">
          <input type="number" className="mx-input w-24" placeholder="Año" value={newUit.year}
            onChange={e => setNewUit(p => ({ ...p, year: Number(e.target.value) }))} />
          <input type="number" className="mx-input w-32" placeholder="Ej: 5350" value={newUit.value || ''}
            onChange={e => setNewUit(p => ({ ...p, value: Number(e.target.value) }))} />
          <button type="submit" className="mx-btn-primary text-sm"><Plus size={13} /> Agregar</button>
        </form>
      </div>

      <div className="mx-card p-6">
        <h3 className="text-sm font-medium text-[#1D1D1F] mb-4">TIM — Tasa de Interés Moratorio</h3>
        {tim ? (
          <div className="mb-4 flex justify-between text-sm">
            <span className="text-[#86868B]">Tasa vigente</span>
            <span className="font-medium">{tim.rate}% mensual</span>
          </div>
        ) : (
          <p className="text-sm text-[#86868B] mb-4">Sin tasa configurada</p>
        )}
        <form onSubmit={handleUpdateTim} className="flex gap-2">
          <input type="number" step="0.001" className="mx-input w-28" placeholder="Tasa %" value={newTim.rate || ''}
            onChange={e => setNewTim(p => ({ ...p, rate: Number(e.target.value) }))} />
          <input type="date" className="mx-input w-40" value={newTim.effectiveFrom}
            onChange={e => setNewTim(p => ({ ...p, effectiveFrom: e.target.value }))} />
          <button type="submit" className="mx-btn-primary text-sm">Actualizar</button>
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
        <h1 className="mx-page-title">Impuestos</h1>
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

      {tab === 0 && <TimelineTab />}
      {tab === 1 && <ObligationsTab />}
      {tab === 2 && <ConfigTab />}
    </div>
  );
}
