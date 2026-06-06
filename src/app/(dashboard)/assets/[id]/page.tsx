'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft, AlertCircle } from 'lucide-react';

interface DepreciationEntry {
  id: string; year: number; month: number;
  depreciationAmount: number; accumulatedAfter: number; bookValueAfter: number;
}

interface Asset {
  id: string; code: string; name: string; category: string;
  cost: number; currency: string; bookValue: number;
  accumulatedDepreciation: number; monthlyDepreciation: number;
  usefulLifeMonths: number; residualValue: number;
  depreciationMethod: string; purchaseDate: string;
  depreciationStartDate: string; status: string;
  location: string | null; serialNumber: string | null; notes: string | null;
  accountCodeAsset: string; accountCodeDepreciation: string; accountCodeExpense: string;
  disposedAt: string | null; disposalReason: string | null;
  schedule?: DepreciationEntry[];
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'mx-badge mx-badge-success',
  IDLE:   'mx-badge mx-badge-warning',
  DISPOSED: 'mx-badge mx-badge-neutral',
};

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [asset,   setAsset]   = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [acting,  setActing]  = useState('');

  useEffect(() => {
    authClient.get(`/assets/${id}`)
      .then(r => setAsset(r.data))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDispose = async () => {
    const reason = prompt('Motivo de baja (obligatorio):');
    if (!reason?.trim()) return;
    const disposalDate = prompt('Fecha de baja (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!disposalDate) return;
    setActing('dispose');
    try {
      await authClient.post(`/assets/${id}/dispose`, {
        reason, disposalType: 'OBSOLESCENCIA', disposalDate, recoveryAmount: 0,
      });
      router.push('/assets');
    } catch (ex) { setError(errMsg(ex)); }
    finally { setActing(''); }
  };

  if (loading) return <div className="mx-skeleton h-64 rounded-2xl max-w-3xl" />;

  if (!asset) return (
    <div className="mx-card p-6 flex items-center gap-2 text-[#FF3B30]">
      <AlertCircle size={16} /><span className="text-sm">{error || 'Activo no encontrado'}</span>
    </div>
  );

  const deprecPct = asset.cost > 0
    ? (Number(asset.accumulatedDepreciation) / Number(asset.cost)) * 100
    : 0;

  return (
    <div className="mx-fade-in max-w-3xl">
      <div className="mx-page-header">
        <div className="flex items-center gap-3">
          <Link href="/assets" className="mx-btn-secondary px-3 py-2"><ArrowLeft size={15} /></Link>
          <div>
            <h1 className="mx-page-title">{asset.name}</h1>
            <p className="text-xs text-[#86868B]">{asset.code} · {asset.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={STATUS_BADGE[asset.status] ?? 'mx-badge mx-badge-neutral'}>{asset.status}</span>
          {asset.status !== 'DISPOSED' && (
            <button onClick={handleDispose} disabled={!!acting} className="mx-btn-danger text-sm">
              {acting === 'dispose' ? 'Procesando…' : 'Dar de baja'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}

      {/* KPIs depreciación */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="mx-card p-4">
          <p className="text-xs text-[#86868B] mb-1">Costo original</p>
          <p className="text-lg font-semibold">{formatCurrency(asset.cost, asset.currency)}</p>
        </div>
        <div className="mx-card p-4">
          <p className="text-xs text-[#86868B] mb-1">Valor en libros</p>
          <p className="text-lg font-semibold text-[#0071E3]">{formatCurrency(asset.bookValue, asset.currency)}</p>
        </div>
        <div className="mx-card p-4">
          <p className="text-xs text-[#86868B] mb-1">Dep. acumulada</p>
          <p className="text-lg font-semibold text-[#FF9F0A]">{formatCurrency(asset.accumulatedDepreciation, asset.currency)}</p>
          <div className="mt-1 h-1.5 bg-[#F2F2F7] rounded-full overflow-hidden">
            <div className="h-full bg-[#FF9F0A] rounded-full" style={{ width: `${Math.min(deprecPct, 100)}%` }} />
          </div>
          <p className="text-xs text-[#86868B] mt-0.5">{deprecPct.toFixed(1)}% depreciado</p>
        </div>
      </div>

      {/* Datos */}
      <div className="mx-card p-6 mb-4">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Método depreciación', value: asset.depreciationMethod },
            { label: 'Vida útil', value: `${asset.usefulLifeMonths} meses` },
            { label: 'Depreciación mensual', value: formatCurrency(asset.monthlyDepreciation, asset.currency) },
            { label: 'Valor residual', value: formatCurrency(asset.residualValue, asset.currency) },
            { label: 'Fecha compra', value: formatDate(asset.purchaseDate) },
            { label: 'Inicio depreciación', value: formatDate(asset.depreciationStartDate) },
            { label: 'Ubicación', value: asset.location || '—' },
            { label: 'N° Serie', value: asset.serialNumber || '—' },
            { label: 'Cuenta activo', value: asset.accountCodeAsset },
            { label: 'Cuenta depreciación', value: asset.accountCodeDepreciation },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-[#86868B] mb-1">{label}</p>
              <p className="text-sm">{value}</p>
            </div>
          ))}
          {asset.disposedAt && (
            <div className="col-span-2">
              <p className="text-xs text-[#86868B] mb-1">Baja registrada</p>
              <p className="text-sm">{formatDate(asset.disposedAt)} — {asset.disposalReason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de depreciación */}
      {asset.schedule && asset.schedule.length > 0 && (
        <div className="mx-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E5EA]">
            <h3 className="text-sm font-medium">Tabla de depreciación</h3>
          </div>
          <table className="mx-table">
            <thead>
              <tr><th>Período</th><th>Depreciación</th><th>Dep. acumulada</th><th>Valor libro</th></tr>
            </thead>
            <tbody>
              {asset.schedule.map(entry => (
                <tr key={entry.id}>
                  <td className="text-[#86868B]">{entry.month}/{entry.year}</td>
                  <td>{formatCurrency(entry.depreciationAmount, asset.currency)}</td>
                  <td>{formatCurrency(entry.accumulatedAfter, asset.currency)}</td>
                  <td className="font-medium">{formatCurrency(entry.bookValueAfter, asset.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
