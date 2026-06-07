'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft, AlertCircle } from 'lucide-react';

interface InvoiceItem {
  id: string; lineOrder: number; productName: string;
  productCode: string; quantity: number; unitPrice: number;
  discountPct: number; subtotal: number;
}
interface Invoice {
  id: string; invoiceNumber: string; documentType: string;
  clientName: string; clientRucDni: string; clientAddress: string; clientEmail: string;
  invoiceDate: string; dueDate: string; currency: string;
  subtotal: number; igvRate: number; igvAmount: number; totalAmount: number;
  amountPaid: number; status: string; sunatStatus: string;
  sunatResponseDesc: string | null; notes: string | null;
  journalEntryId: string | null; createdAt: string; items: InvoiceItem[];
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'mx-badge mx-badge-neutral', ISSUED: 'mx-badge mx-badge-info',
  PARTIAL: 'mx-badge mx-badge-warning', PAID: 'mx-badge mx-badge-success',
  OVERDUE: 'mx-badge mx-badge-danger', VOID: 'mx-badge mx-badge-neutral',
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador', ISSUED: 'Emitida', PARTIAL: 'Parcial',
  PAID: 'Pagada', OVERDUE: 'Vencida', VOID: 'Anulada',
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { canIssueInvoice, canPayInvoice, canAnnulInvoice } = usePermissions();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [acting,  setActing]  = useState('');

  useEffect(() => {
    authClient.get(`/invoices/${id}`)
      .then(r => setInvoice(r.data))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, [id]);

  const handleIssue = async () => {
    setActing('issue');
    try { const r = await authClient.post(`/invoices/${id}/issue`); setInvoice(r.data); }
    catch (ex) { setError(errMsg(ex)); }
    finally { setActing(''); }
  };

  const handleAnnul = async () => {
    const reason = prompt('Motivo de anulación (obligatorio):');
    if (!reason?.trim()) return;
    setActing('annul');
    try {
      const r = await authClient.post(`/invoices/${id}/void`, { reason });
      setInvoice(r.data?.voidedInvoice ?? r.data);
    } catch (ex) { setError(errMsg(ex)); }
    finally { setActing(''); }
  };

  if (loading) return <div className="space-y-4 max-w-3xl"><div className="mx-skeleton h-10 w-48 rounded-xl" /><div className="mx-skeleton h-80 rounded-2xl" /></div>;
  if (!invoice) return <div className="mx-card p-6 flex items-center gap-2 text-[#FF3B30]"><AlertCircle size={16} /><span className="text-sm">{error || 'Factura no encontrada'}</span></div>;

  const canIssue = invoice.status === 'DRAFT' && canIssueInvoice;
  const canAnnul = ['ISSUED','PARTIAL','OVERDUE'].includes(invoice.status) && canAnnulInvoice;

  return (
    <div className="mx-fade-in max-w-3xl">
      <div className="mx-page-header">
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="mx-btn-secondary px-3 py-2"><ArrowLeft size={15} /></Link>
          <div><h1 className="mx-page-title">{invoice.invoiceNumber}</h1><p className="text-xs text-[#86868B]">{invoice.documentType}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <span className={STATUS_BADGE[invoice.status] ?? 'mx-badge mx-badge-neutral'}>{STATUS_LABEL[invoice.status] ?? invoice.status}</span>
          {canIssue && <button onClick={handleIssue} disabled={!!acting} className="mx-btn-primary">{acting === 'issue' ? 'Emitiendo…' : 'Emitir'}</button>}
          {canAnnul && <button onClick={handleAnnul} disabled={!!acting} className="mx-btn-danger">{acting === 'annul' ? 'Anulando…' : 'Anular'}</button>}
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}

      <div className="mx-card p-6 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-xs text-[#86868B] mb-1">Cliente</p><p className="text-sm font-medium">{invoice.clientName}</p><p className="text-xs text-[#86868B]">{invoice.clientRucDni}</p></div>
          <div><p className="text-xs text-[#86868B] mb-1">Dirección</p><p className="text-sm">{invoice.clientAddress || '—'}</p></div>
          <div><p className="text-xs text-[#86868B] mb-1">Fecha emisión</p><p className="text-sm">{formatDate(invoice.invoiceDate)}</p></div>
          <div><p className="text-xs text-[#86868B] mb-1">Vencimiento</p><p className="text-sm">{formatDate(invoice.dueDate)}</p></div>
          <div><p className="text-xs text-[#86868B] mb-1">Estado SUNAT</p><p className="text-sm">{invoice.sunatStatus}</p>{invoice.sunatResponseDesc && <p className="text-xs text-[#FF3B30] mt-0.5 line-clamp-2">{invoice.sunatResponseDesc}</p>}</div>
          <div><p className="text-xs text-[#86868B] mb-1">Asiento contable</p><p className="text-sm">{invoice.journalEntryId ? '✓ Generado' : '—'}</p></div>
          {invoice.notes && <div className="col-span-2"><p className="text-xs text-[#86868B] mb-1">Notas</p><p className="text-sm">{invoice.notes}</p></div>}
        </div>
      </div>

      <div className="mx-card overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-[#E5E5EA]"><h3 className="text-sm font-medium">Detalle</h3></div>
        <table className="mx-table">
          <thead><tr><th>#</th><th>Descripción</th><th>Cant.</th><th>P. Unit.</th><th>Desc.</th><th>Subtotal</th></tr></thead>
          <tbody>
            {invoice.items.map(item => (
              <tr key={item.id}>
                <td className="text-[#86868B]">{item.lineOrder}</td>
                <td><p className="text-sm font-medium">{item.productName}</p>{item.productCode && <p className="text-xs text-[#86868B]">{item.productCode}</p>}</td>
                <td>{Number(item.quantity)}</td>
                <td>{formatCurrency(item.unitPrice, invoice.currency)}</td>
                <td>{Number(item.discountPct) > 0 ? `${item.discountPct}%` : '—'}</td>
                <td className="font-medium">{formatCurrency(item.subtotal, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-4 border-t border-[#E5E5EA] flex justify-end">
          <div className="space-y-1 min-w-48">
            <div className="flex justify-between text-sm"><span className="text-[#86868B]">Subtotal</span><span>{formatCurrency(invoice.subtotal, invoice.currency)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[#86868B]">IGV ({Number(invoice.igvRate)}%)</span><span>{formatCurrency(invoice.igvAmount, invoice.currency)}</span></div>
            <div className="flex justify-between text-sm font-semibold border-t border-[#E5E5EA] pt-1 mt-1"><span>Total</span><span>{formatCurrency(invoice.totalAmount, invoice.currency)}</span></div>
            {Number(invoice.amountPaid) > 0 && <>
              <div className="flex justify-between text-sm text-[#34C759]"><span>Pagado</span><span>{formatCurrency(invoice.amountPaid, invoice.currency)}</span></div>
              <div className="flex justify-between text-sm font-medium text-[#FF9F0A]"><span>Saldo</span><span>{formatCurrency(Number(invoice.totalAmount) - Number(invoice.amountPaid), invoice.currency)}</span></div>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}
