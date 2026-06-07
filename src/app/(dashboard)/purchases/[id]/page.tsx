'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft, AlertCircle } from 'lucide-react';

interface PurchaseItem {
  id: string; productName: string; productCode: string;
  quantity: number; unitPrice: number; subtotal: number;
}

interface Purchase {
  id: string; supplierId: string; supplierName: string;
  purchaseDate: string; notes: string; status: string;
  subtotal: number; igvRate: number; igvAmount: number; totalAmount: number;
  appliesDetraction: boolean; appliesRetention: boolean;
  retentionRate: number | null; retentionAmount: number | null;
  items: PurchaseItem[];
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

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { canEditPurchase, canCancelPurchase, canDeletePurchase } = usePermissions();

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [acting,   setActing]   = useState('');

  useEffect(() => {
    authClient.get(`/purchases/${id}`)
      .then(r => setPurchase(r.data))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    const reason = prompt('Motivo de cancelación:');
    if (!reason?.trim()) return;
    setActing('cancel');
    try {
      const r = await authClient.patch(`/purchases/${id}/cancel`, { reason });
      setPurchase(r.data);
    } catch (ex) { setError(errMsg(ex)); }
    finally { setActing(''); }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta compra permanentemente?')) return;
    setActing('delete');
    try {
      await authClient.delete(`/purchases/${id}/permanent`);
      router.push('/purchases');
    } catch (ex) { setError(errMsg(ex)); setActing(''); }
  };

  if (loading) return (
    <div className="space-y-4 max-w-3xl">
      <div className="mx-skeleton h-10 w-48 rounded-xl" />
      <div className="mx-skeleton h-64 rounded-2xl" />
    </div>
  );

  if (!purchase) return (
    <div className="mx-card p-6 flex items-center gap-2 text-[#FF3B30]">
      <AlertCircle size={16} /><span className="text-sm">{error || 'Compra no encontrada'}</span>
    </div>
  );

  const canEdit   = canEditPurchase   && purchase.status === 'CONFIRMED';
  const canCancel = canCancelPurchase && ['CONFIRMED','PARTIAL'].includes(purchase.status);
  const canDelete = canDeletePurchase && purchase.status === 'CANCELLED';

  return (
    <div className="mx-fade-in max-w-3xl">
      <div className="mx-page-header">
        <div className="flex items-center gap-3">
          <Link href="/purchases" className="mx-btn-secondary px-3 py-2"><ArrowLeft size={15} /></Link>
          <div>
            <h1 className="mx-page-title">{purchase.supplierName}</h1>
            <p className="text-xs text-[#86868B]">{formatDate(purchase.purchaseDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={STATUS_BADGE[purchase.status] ?? 'mx-badge mx-badge-neutral'}>
            {STATUS_LABEL[purchase.status] ?? purchase.status}
          </span>
          {canEdit && (
            <Link href={`/purchases/${id}/edit`} className="mx-btn-secondary text-sm">
              Editar
            </Link>
          )}
          {canCancel && (
            <button onClick={handleCancel} disabled={!!acting} className="mx-btn-secondary text-sm">
              {acting === 'cancel' ? 'Cancelando…' : 'Cancelar'}
            </button>
          )}
          {canDelete && (
            <button onClick={handleDelete} disabled={!!acting} className="mx-btn-danger text-sm">
              {acting === 'delete' ? 'Eliminando…' : 'Eliminar'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}

      <div className="mx-card p-6 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-xs text-[#86868B] mb-1">Proveedor</p><p className="text-sm font-medium">{purchase.supplierName}</p></div>
          <div><p className="text-xs text-[#86868B] mb-1">Fecha</p><p className="text-sm">{formatDate(purchase.purchaseDate)}</p></div>
          {purchase.appliesRetention && purchase.retentionAmount && (
            <div><p className="text-xs text-[#86868B] mb-1">Retención ({purchase.retentionRate}%)</p><p className="text-sm">{formatCurrency(purchase.retentionAmount)}</p></div>
          )}
          {purchase.notes && (
            <div className="col-span-2"><p className="text-xs text-[#86868B] mb-1">Notas</p><p className="text-sm">{purchase.notes}</p></div>
          )}
        </div>
      </div>

      <div className="mx-card overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-[#E5E5EA]"><h3 className="text-sm font-medium">Detalle</h3></div>
        <table className="mx-table">
          <thead><tr><th>Descripción</th><th>Código</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr></thead>
          <tbody>
            {purchase.items.map(item => (
              <tr key={item.id}>
                <td className="font-medium">{item.productName}</td>
                <td className="text-[#86868B]">{item.productCode || '—'}</td>
                <td>{Number(item.quantity)}</td>
                <td>{formatCurrency(item.unitPrice)}</td>
                <td className="font-medium">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-4 border-t border-[#E5E5EA] flex justify-end">
          <div className="space-y-1 min-w-48">
            <div className="flex justify-between text-sm"><span className="text-[#86868B]">Subtotal</span><span>{formatCurrency(purchase.subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[#86868B]">IGV ({purchase.igvRate}%)</span><span>{formatCurrency(purchase.igvAmount)}</span></div>
            <div className="flex justify-between text-sm font-semibold border-t border-[#E5E5EA] pt-1 mt-1"><span>Total</span><span>{formatCurrency(purchase.totalAmount)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
