'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { Plus, Search, AlertCircle } from 'lucide-react';

interface Quote {
  id: string; quote_number: string; client_name: string;
  quote_date: string; valid_until: string; total_amount: number;
  currency: string; status: string;
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT:     'mx-badge mx-badge-neutral',
  SENT:      'mx-badge mx-badge-info',
  ACCEPTED:  'mx-badge mx-badge-success',
  REJECTED:  'mx-badge mx-badge-danger',
  CONVERTED: 'mx-badge mx-badge-purple',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador', SENT: 'Enviada', ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada', CONVERTED: 'Convertida',
};

export default function QuotesPage() {
  const [quotes,   setQuotes]   = useState<Quote[]>([]);
  const [filtered, setFiltered] = useState<Quote[]>([]);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    authClient.get('/quotes')
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
        setQuotes(data); setFiltered(data);
      })
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(quotes.filter(qt => {
      const matchSearch = !q ||
        qt.quote_number.toLowerCase().includes(q) ||
        qt.client_name.toLowerCase().includes(q);
      const matchStatus = !status || qt.status === status;
      return matchSearch && matchStatus;
    }));
  }, [search, status, quotes]);

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <h1 className="mx-page-title">Cotizaciones</h1>
        <Link href="/quotes/new" className="mx-btn-primary">
          <Plus size={15} /> Nueva cotización
        </Link>
      </div>

      <div className="mx-card p-3 mb-4 flex items-center gap-3">
        <Search size={15} className="text-[#86868B]" />
        <input
          className="flex-1 outline-none text-sm bg-transparent placeholder:text-[#86868B]"
          placeholder="Buscar por número o cliente…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="text-sm border-0 outline-none bg-transparent text-[#86868B] cursor-pointer">
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
            {[1,2,3,4].map(i => <div key={i} className="mx-skeleton h-12 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#86868B]">
            {search || status ? 'Sin resultados' : 'No hay cotizaciones registradas'}
          </div>
        ) : (
          <table className="mx-table">
            <thead>
              <tr>
                <th>Número</th><th>Cliente</th><th>Fecha</th>
                <th>Válida hasta</th><th>Total</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(qt => (
                <tr key={qt.id}>
                  <td>
                    <Link href={`/quotes/${qt.id}`} className="font-medium text-[#0071E3] hover:underline">
                      {qt.quote_number}
                    </Link>
                  </td>
                  <td className="text-sm">{qt.client_name}</td>
                  <td className="text-[#86868B]">{formatDate(qt.quote_date)}</td>
                  <td className="text-[#86868B]">{formatDate(qt.valid_until)}</td>
                  <td className="font-medium">{formatCurrency(qt.total_amount, qt.currency)}</td>
                  <td>
                    <span className={STATUS_BADGE[qt.status] ?? 'mx-badge mx-badge-neutral'}>
                      {STATUS_LABEL[qt.status] ?? qt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-[#86868B] mt-2 px-1">{filtered.length} cotización(es)</p>
      )}
    </div>
  );
}
