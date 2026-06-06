'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { Plus, Search, AlertCircle } from 'lucide-react';

interface Invoice {
  id: string; invoiceNumber: string; documentType: string;
  clientName: string; invoiceDate: string; dueDate: string;
  totalAmount: number; amountPaid: number; status: string;
  sunatStatus: string; currency: string;
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT:    'mx-badge mx-badge-neutral',
  ISSUED:   'mx-badge mx-badge-info',
  PARTIAL:  'mx-badge mx-badge-warning',
  PAID:     'mx-badge mx-badge-success',
  OVERDUE:  'mx-badge mx-badge-danger',
  VOID:     'mx-badge mx-badge-neutral',
  CANCELLED:'mx-badge mx-badge-neutral',
};

const SUNAT_BADGE: Record<string, string> = {
  PENDING:  'mx-badge mx-badge-warning',
  ACCEPTED: 'mx-badge mx-badge-success',
  REJECTED: 'mx-badge mx-badge-danger',
  SKIPPED:  'mx-badge mx-badge-neutral',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador', ISSUED: 'Emitida', PARTIAL: 'Parcial',
  PAID: 'Pagada', OVERDUE: 'Vencida', VOID: 'Anulada', CANCELLED: 'Cancelada',
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filtered, setFiltered] = useState<Invoice[]>([]);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    authClient.get('/invoices')
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : r.data?.items ?? [];
        setInvoices(data);
        setFiltered(data);
      })
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(invoices.filter(inv => {
      const matchSearch = !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.clientName.toLowerCase().includes(q);
      const matchStatus = !status || inv.status === status;
      return matchSearch && matchStatus;
    }));
  }, [search, status, invoices]);

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <h1 className="mx-page-title">Facturación</h1>
        <Link href="/invoices/new" className="mx-btn-primary">
          <Plus size={15} /> Nueva factura
        </Link>
      </div>

      {/* Filtros */}
      <div className="mx-card p-3 mb-4 flex items-center gap-3">
        <Search size={15} className="text-[#86868B]" />
        <input
          className="flex-1 outline-none text-sm bg-transparent placeholder:text-[#86868B]"
          placeholder="Buscar por número o cliente…"
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
            {[1,2,3,4,5].map(i => <div key={i} className="mx-skeleton h-12 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#86868B]">
            {search || status ? 'Sin resultados' : 'No hay facturas registradas'}
          </div>
        ) : (
          <table className="mx-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Vencimiento</th>
                <th>Total</th>
                <th>Estado</th>
                <th>SUNAT</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id}>
                  <td>
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-[#0071E3] hover:underline">
                      {inv.invoiceNumber}
                    </Link>
                    <span className="ml-2 text-[10px] text-[#86868B]">{inv.documentType}</span>
                  </td>
                  <td className="text-sm">{inv.clientName}</td>
                  <td className="text-[#86868B]">{formatDate(inv.invoiceDate)}</td>
                  <td className="text-[#86868B]">{formatDate(inv.dueDate)}</td>
                  <td className="font-medium">{formatCurrency(inv.totalAmount, inv.currency)}</td>
                  <td><span className={STATUS_BADGE[inv.status] ?? 'mx-badge mx-badge-neutral'}>{STATUS_LABEL[inv.status] ?? inv.status}</span></td>
                  <td><span className={SUNAT_BADGE[inv.sunatStatus] ?? 'mx-badge mx-badge-neutral'}>{inv.sunatStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-[#86868B] mt-2 px-1">{filtered.length} factura(s)</p>
      )}
    </div>
  );
}
