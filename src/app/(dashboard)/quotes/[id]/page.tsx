'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft, AlertCircle, FileText } from 'lucide-react';

interface QuoteItem {
  id: string; line_order: number; product_name: string;
  product_code: string | null; quantity: number;
  unit_price: number; discount_pct: number; subtotal: number;
}

interface Quote {
  id: string; quote_number: string; status: string;
  client_name: string; client_ruc_dni: string;
  client_address: string | null; client_email: string;
  quote_date: string; valid_until: string; currency: string;
  subtotal: number; igv_rate: number; igv_amount: number;
  total_amount: number; notes: string | null; conditions: string | null;
  converted_invoice_id: string | null; sent_at: string | null;
  accepted_at: string | null; rejected_at: string | null;
  rejection_reason: string | null; items: QuoteItem[];
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

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const {
    canSendQuote, canAcceptQuote, canRejectQuote,
    canConvertQuote, canDeleteQuote,
  } = usePermissions();

  const [quote,   setQuote]   = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [acting,  setActing]  = useState('');

  useEffect(() => {
    authClient.get(`/quotes/${id}`)
      .then(r => setQuote(r.data))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, [id]);

  const action = async (endpoint: string, body?: any, key?: string) => {
    setActing(key ?? endpoint);
    setError('');
    try {
      const r = await authClient.post(`/quotes/${id}/${endpoint}`, body ?? {});
      setQuote(r.data);
    } catch (ex) { setError(errMsg(ex)); }
    finally { setActing(''); }
  };

  const handleSend    = () => action('send', {}, 'send');
  const handleAccept  = () => action('accept', {}, 'accept');
  const handleConvert = () => action('convert', {}, 'convert');
  const handleReject  = async () => {
    const reason = prompt('Motivo de rechazo:');
    if (!reason?.trim()) return;
    await action('reject', { reason }, 'reject');
  };
  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta cotización?')) return;
    try {
      await authClient.delete(`/quotes/${id}`);
      router.push('/quotes');
    } catch (ex) { setError(errMsg(ex)); }
  };

  if (loading) return (
    <div className="space-y-4 max-w-3xl">
      <div className="mx-skeleton h-10 w-48 rounded-xl" />
      <div className="mx-skeleton h-80 rounded-2xl" />
    </div>
  );

  if (!quote) return (
    <div className="mx-card p-6 flex items-center gap-2 text-[#FF3B30]">
      <AlertCircle size={16} /><span className="text-sm">{error || 'Cotización no encontrada'}</span>
    </div>
  );

  const isBusy = !!acting;

  return (
    <div className="mx-fade-in max-w-3xl">
      <div className="mx-page-header">
        <div className="flex items-center gap-3">
          <Link href="/quotes" className="mx-btn-secondary px-3 py-2"><ArrowLeft size={15} /></Link>
          <div>
            <h1 className="mx-page-title">{quote.quote_number}</h1>
            <p className="text-xs text-[#86868B]">Cotización</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={STATUS_BADGE[quote.status] ?? 'mx-badge mx-badge-neutral'}>
            {STATUS_LABEL[quote.status] ?? quote.status}
          </span>

          {quote.status === 'DRAFT' && canSendQuote && (
            <button onClick={handleSend} disabled={isBusy} className="mx-btn-primary text-sm">
              {acting === 'send' ? 'Enviando…' : 'Enviar'}
            </button>
          )}
          {quote.status === 'DRAFT' && canDeleteQuote && (
            <button onClick={handleDelete} disabled={isBusy} className="mx-btn-danger text-sm">
              Eliminar
            </button>
          )}
          {quote.status === 'SENT' && canAcceptQuote && (
            <button onClick={handleAccept} disabled={isBusy} className="mx-btn-primary text-sm">
              {acting === 'accept' ? 'Aceptando…' : 'Aceptar'}
            </button>
          )}
          {quote.status === 'SENT' && canRejectQuote && (
            <button onClick={handleReject} disabled={isBusy} className="mx-btn-danger text-sm">
              {acting === 'reject' ? 'Rechazando…' : 'Rechazar'}
            </button>
          )}
          {quote.status === 'ACCEPTED' && canConvertQuote && (
            <button onClick={handleConvert} disabled={isBusy} className="mx-btn-primary text-sm">
              {acting === 'convert' ? 'Convirtiendo…' : '→ Convertir a factura'}
            </button>
          )}
          {quote.converted_invoice_id && (
            <Link href={`/invoices/${quote.converted_invoice_id}`}
              className="mx-btn-secondary text-sm flex items-center gap-1.5">
              <FileText size={13} /> Ver factura
            </Link>
          )}
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}

      <div className="mx-card p-6 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[#86868B] mb-1">Cliente</p>
            <p className="text-sm font-medium">{quote.client_name}</p>
            <p className="text-xs text-[#86868B]">{quote.client_ruc_dni}</p>
          </div>
          <div>
            <p className="text-xs text-[#86868B] mb-1">Email</p>
            <p className="text-sm">{quote.client_email || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[#86868B] mb-1">Fecha cotización</p>
            <p className="text-sm">{formatDate(quote.quote_date)}</p>
          </div>
          <div>
            <p className="text-xs text-[#86868B] mb-1">Válida hasta</p>
            <p className="text-sm">{formatDate(quote.valid_until)}</p>
          </div>
          {quote.sent_at && <div><p className="text-xs text-[#86868B] mb-1">Enviada</p><p className="text-sm">{formatDate(quote.sent_at)}</p></div>}
          {quote.accepted_at && <div><p className="text-xs text-[#86868B] mb-1">Aceptada</p><p className="text-sm">{formatDate(quote.accepted_at)}</p></div>}
          {quote.rejected_at && (
            <div className="col-span-2">
              <p className="text-xs text-[#86868B] mb-1">Rechazada</p>
              <p className="text-sm text-[#FF3B30]">{formatDate(quote.rejected_at)} — {quote.rejection_reason}</p>
            </div>
          )}
          {quote.notes && <div className="col-span-2"><p className="text-xs text-[#86868B] mb-1">Notas</p><p className="text-sm">{quote.notes}</p></div>}
          {quote.conditions && <div className="col-span-2"><p className="text-xs text-[#86868B] mb-1">Condiciones</p><p className="text-sm">{quote.conditions}</p></div>}
        </div>
      </div>

      <div className="mx-card overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-[#E5E5EA]"><h3 className="text-sm font-medium">Detalle</h3></div>
        <table className="mx-table">
          <thead><tr><th>#</th><th>Descripción</th><th>Cant.</th><th>P. Unit.</th><th>Desc.</th><th>Subtotal</th></tr></thead>
          <tbody>
            {quote.items.map(item => (
              <tr key={item.id}>
                <td className="text-[#86868B]">{item.line_order}</td>
                <td>
                  <p className="text-sm font-medium">{item.product_name}</p>
                  {item.product_code && <p className="text-xs text-[#86868B]">{item.product_code}</p>}
                </td>
                <td>{Number(item.quantity)}</td>
                <td>{formatCurrency(item.unit_price, quote.currency)}</td>
                <td>{Number(item.discount_pct) > 0 ? `${item.discount_pct}%` : '—'}</td>
                <td className="font-medium">{formatCurrency(item.subtotal, quote.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-4 border-t border-[#E5E5EA] flex justify-end">
          <div className="space-y-1 min-w-48">
            <div className="flex justify-between text-sm"><span className="text-[#86868B]">Subtotal</span><span>{formatCurrency(quote.subtotal, quote.currency)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[#86868B]">IGV ({(Number(quote.igv_rate) * 100).toFixed(0)}%)</span><span>{formatCurrency(quote.igv_amount, quote.currency)}</span></div>
            <div className="flex justify-between text-sm font-semibold border-t border-[#E5E5EA] pt-1 mt-1"><span>Total</span><span>{formatCurrency(quote.total_amount, quote.currency)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
