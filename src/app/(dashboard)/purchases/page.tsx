'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { Plus, Search, AlertCircle } from 'lucide-react';

interface Purchase {
  id: string; supplierName: string; purchaseDate: string;
  totalAmount: number; status: string; notes: string;
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT:     'mx-badge mx-badge-neutral',
  CONFIRMED: 'mx-badge mx-badge-info',
  PARTIAL:   'mx-badge mx-badge-warning',
  PAID:      'mx-badge mx-badge-success',
  CANCELLED: 'mx-badge mx-badge-danger',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador', CONFIRMED: 'Confirmada',
  PARTIAL: 'Parcial', PAID: 'Pagada', CANCELLED: 'Cancelada',
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filtered,  setFiltered]  = useState<Purchase[]>([]);
  const [search,    setSearch]    = useState('');
  const [status,    setStatus]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    authClient.get('/purchases?limit=100')
      .then(r => {
        const data = r.data?.data ?? r.data ?? [];
        setPurchases(data);
        setFiltered(data);
      })
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(purchases.filter(p => {
      const matchSearch = !q || p.supplierName.toLowerCase().includes(q);
      const matchStatus = !status || p.status === status;
      return matchSearch && matchStatus;
    }));
  }, [search, status, purchases]);

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <h1 className="mx-page-title">Compras</h1>
        <Link href="/purchases/new" className="mx-btn-primary">
          <Plus size={15} /> Nueva compra
        </Link>
      </div>

      <div className="mx-card p-3 mb-4 flex items-center gap-3">
        <Search size={15} className="text-[#86868B]" />
        <input
          className="flex-1 outline-none text-sm bg-transparent placeholder:text-[#86868B]"
          placeholder="Buscar por proveedor…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="text-sm border-0 outline-none bg-transparent text-[#86868B] cursor-pointer"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
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
            {search || status ? 'Sin resultados' : 'No hay compras registradas'}
          </div>
        ) : (
          <table className="mx-table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/purchases/${p.id}`} className="font-medium text-[#0071E3] hover:underline">
                      {p.supplierName}
                    </Link>
                  </td>
                  <td className="text-[#86868B]">{formatDate(p.purchaseDate)}</td>
                  <td className="font-medium">{formatCurrency(p.totalAmount)}</td>
                  <td><span className={STATUS_BADGE[p.status] ?? 'mx-badge mx-badge-neutral'}>{STATUS_LABEL[p.status] ?? p.status}</span></td>
                  <td className="text-[#86868B] text-xs truncate max-w-xs">{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-[#86868B] mt-2 px-1">{filtered.length} compra(s)</p>
      )}
    </div>
  );
}
