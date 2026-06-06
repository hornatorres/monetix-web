'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { Plus, Search, AlertCircle } from 'lucide-react';

interface Subscription {
  id: string; clientName: string; productName: string;
  type: string; billingMode: string; unitPrice: number;
  currency: string; startDate: string; nextBillingDate: string | null;
  status: string; autoRenew: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    'mx-badge mx-badge-success',
  PAUSED:    'mx-badge mx-badge-warning',
  CANCELLED: 'mx-badge mx-badge-danger',
  EXPIRED:   'mx-badge mx-badge-neutral',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activa', PAUSED: 'Pausada', CANCELLED: 'Cancelada', EXPIRED: 'Expirada',
};

export default function SubscriptionsPage() {
  const [subs,     setSubs]    = useState<Subscription[]>([]);
  const [filtered, setFiltered] = useState<Subscription[]>([]);
  const [search,   setSearch]  = useState('');
  const [status,   setStatus]  = useState('');
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState('');

  useEffect(() => {
    authClient.get('/subscriptions')
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
        setSubs(data); setFiltered(data);
      })
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(subs.filter(s => {
      const matchSearch = !q ||
        s.clientName.toLowerCase().includes(q) ||
        s.productName.toLowerCase().includes(q);
      const matchStatus = !status || s.status === status;
      return matchSearch && matchStatus;
    }));
  }, [search, status, subs]);

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <h1 className="mx-page-title">Suscripciones</h1>
        <Link href="/subscriptions/new" className="mx-btn-primary">
          <Plus size={15} /> Nueva suscripción
        </Link>
      </div>

      <div className="mx-card p-3 mb-4 flex items-center gap-3">
        <Search size={15} className="text-[#86868B]" />
        <input
          className="flex-1 outline-none text-sm bg-transparent placeholder:text-[#86868B]"
          placeholder="Buscar por cliente o producto…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select
          value={status} onChange={e => setStatus(e.target.value)}
          className="text-sm border-0 outline-none bg-transparent text-[#86868B] cursor-pointer"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {error && (
        <div className="mx-card p-4 flex items-center gap-2 text-[#FF3B30] mb-4">
          <AlertCircle size={16} /><span className="text-sm">{error}</span>
        </div>
      )}

      <div className="mx-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1,2,3].map(i => <div key={i} className="mx-skeleton h-12 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#86868B]">
            {search || status ? 'Sin resultados' : 'No hay suscripciones registradas'}
          </div>
        ) : (
          <table className="mx-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Producto</th>
                <th>Precio</th>
                <th>Inicio</th>
                <th>Próx. factura</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/subscriptions/${s.id}`} className="font-medium text-[#0071E3] hover:underline">
                      {s.clientName}
                    </Link>
                  </td>
                  <td className="text-sm text-[#86868B]">{s.productName}</td>
                  <td className="font-medium">{formatCurrency(s.unitPrice, s.currency)}</td>
                  <td className="text-[#86868B]">{formatDate(s.startDate)}</td>
                  <td className="text-[#86868B]">{s.nextBillingDate ? formatDate(s.nextBillingDate) : '—'}</td>
                  <td><span className={STATUS_BADGE[s.status] ?? 'mx-badge mx-badge-neutral'}>{STATUS_LABEL[s.status] ?? s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-[#86868B] mt-2 px-1">{filtered.length} suscripción(es)</p>
      )}
    </div>
  );
}
