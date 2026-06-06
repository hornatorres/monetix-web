'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft, AlertCircle } from 'lucide-react';

interface Subscription {
  id: string; clientName: string; clientRucDni: string;
  productName: string; productCode: string;
  type: string; billingMode: string; quantity: number;
  unitPrice: number; currency: string;
  startDate: string; endDate: string | null;
  nextBillingDate: string | null; billingCutoffDay: number;
  status: string; autoRenew: boolean; firstInvoiceDone: boolean;
  cancelledAt: string | null; cancellationReason: string | null; notes: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'mx-badge mx-badge-success', PAUSED: 'mx-badge mx-badge-warning',
  CANCELLED: 'mx-badge mx-badge-danger', EXPIRED: 'mx-badge mx-badge-neutral',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activa', PAUSED: 'Pausada', CANCELLED: 'Cancelada', EXPIRED: 'Expirada',
};

export default function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [sub,     setSub]     = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [acting,  setActing]  = useState('');

  useEffect(() => {
    authClient.get(`/subscriptions/${id}`)
      .then(r => setSub(r.data))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePause = async () => {
    setActing('pause');
    try {
      const r = await authClient.patch(`/subscriptions/${id}/pause`);
      setSub(r.data);
    } catch (ex) { setError(errMsg(ex)); }
    finally { setActing(''); }
  };

  const handleResume = async () => {
    setActing('resume');
    try {
      const r = await authClient.patch(`/subscriptions/${id}/resume`);
      setSub(r.data);
    } catch (ex) { setError(errMsg(ex)); }
    finally { setActing(''); }
  };

  const handleCancel = async () => {
    const reason = prompt('Motivo de cancelación (obligatorio):');
    if (!reason?.trim()) return;
    setActing('cancel');
    try {
      const r = await authClient.patch(`/subscriptions/${id}/cancel`, { reason, timing: 'END_OF_PERIOD' });
      setSub(r.data?.subscription ?? r.data);
    } catch (ex) { setError(errMsg(ex)); }
    finally { setActing(''); }
  };

  if (loading) return <div className="mx-skeleton h-64 rounded-2xl max-w-2xl" />;

  if (!sub) return (
    <div className="mx-card p-6 flex items-center gap-2 text-[#FF3B30]">
      <AlertCircle size={16} /><span className="text-sm">{error || 'Suscripción no encontrada'}</span>
    </div>
  );

  return (
    <div className="mx-fade-in max-w-2xl">
      <div className="mx-page-header">
        <div className="flex items-center gap-3">
          <Link href="/subscriptions" className="mx-btn-secondary px-3 py-2"><ArrowLeft size={15} /></Link>
          <div>
            <h1 className="mx-page-title">{sub.clientName}</h1>
            <p className="text-xs text-[#86868B]">{sub.productName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={STATUS_BADGE[sub.status] ?? 'mx-badge mx-badge-neutral'}>
            {STATUS_LABEL[sub.status] ?? sub.status}
          </span>
          {sub.status === 'ACTIVE' && (
            <button onClick={handlePause} disabled={!!acting} className="mx-btn-secondary text-sm">
              {acting === 'pause' ? 'Pausando…' : 'Pausar'}
            </button>
          )}
          {sub.status === 'PAUSED' && (
            <button onClick={handleResume} disabled={!!acting} className="mx-btn-primary text-sm">
              {acting === 'resume' ? 'Reactivando…' : 'Reactivar'}
            </button>
          )}
          {['ACTIVE', 'PAUSED'].includes(sub.status) && (
            <button onClick={handleCancel} disabled={!!acting} className="mx-btn-danger text-sm">
              {acting === 'cancel' ? 'Cancelando…' : 'Cancelar'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}

      <div className="mx-card p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[#86868B] mb-1">Cliente</p>
            <p className="text-sm font-medium">{sub.clientName}</p>
            <p className="text-xs text-[#86868B]">{sub.clientRucDni}</p>
          </div>
          <div>
            <p className="text-xs text-[#86868B] mb-1">Producto</p>
            <p className="text-sm font-medium">{sub.productName}</p>
            <p className="text-xs text-[#86868B]">{sub.productCode}</p>
          </div>
          <div>
            <p className="text-xs text-[#86868B] mb-1">Precio</p>
            <p className="text-sm font-medium">{formatCurrency(sub.unitPrice, sub.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-[#86868B] mb-1">Tipo / Modalidad</p>
            <p className="text-sm">{sub.type} · {sub.billingMode}</p>
          </div>
          <div>
            <p className="text-xs text-[#86868B] mb-1">Inicio</p>
            <p className="text-sm">{formatDate(sub.startDate)}</p>
          </div>
          <div>
            <p className="text-xs text-[#86868B] mb-1">Próxima factura</p>
            <p className="text-sm">{sub.nextBillingDate ? formatDate(sub.nextBillingDate) : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[#86868B] mb-1">Auto-renovación</p>
            <p className="text-sm">{sub.autoRenew ? 'Sí' : 'No'}</p>
          </div>
          <div>
            <p className="text-xs text-[#86868B] mb-1">Primera factura</p>
            <p className="text-sm">{sub.firstInvoiceDone ? 'Emitida' : 'Pendiente'}</p>
          </div>
          {sub.cancelledAt && (
            <div className="col-span-2">
              <p className="text-xs text-[#86868B] mb-1">Cancelada el</p>
              <p className="text-sm">{formatDate(sub.cancelledAt)}</p>
              {sub.cancellationReason && <p className="text-xs text-[#86868B] mt-0.5">{sub.cancellationReason}</p>}
            </div>
          )}
          {sub.notes && (
            <div className="col-span-2">
              <p className="text-xs text-[#86868B] mb-1">Notas</p>
              <p className="text-sm">{sub.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
