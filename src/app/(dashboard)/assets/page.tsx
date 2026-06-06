'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { Plus, Search, AlertCircle, Play } from 'lucide-react';

interface Asset {
  id: string; code: string; name: string; category: string;
  cost: number; currency: string; bookValue: number;
  accumulatedDepreciation: number; monthlyDepreciation: number;
  status: string; purchaseDate: string; depreciationStartDate: string;
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:   'mx-badge mx-badge-success',
  IDLE:     'mx-badge mx-badge-warning',
  DISPOSED: 'mx-badge mx-badge-neutral',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo', IDLE: 'En reserva', DISPOSED: 'Dado de baja',
};

export default function AssetsPage() {
  const [assets,   setAssets]   = useState<Asset[]>([]);
  const [filtered, setFiltered] = useState<Asset[]>([]);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [running,  setRunning]  = useState(false);

  const load = () => {
    setLoading(true);
    authClient.get('/assets')
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
        setAssets(data); setFiltered(data);
      })
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(assets.filter(a => {
      const matchSearch = !q || a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q);
      const matchStatus = !status || a.status === status;
      return matchSearch && matchStatus;
    }));
  }, [search, status, assets]);

  const handleRunDepreciation = async () => {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth() + 1;
    if (!confirm(`¿Ejecutar depreciación para ${month}/${year}?`)) return;
    setRunning(true);
    try {
      await authClient.post(`/assets/depreciation/run?year=${year}&month=${month}`);
      alert('Depreciación ejecutada correctamente');
      load();
    } catch (ex) { setError(errMsg(ex)); }
    finally { setRunning(false); }
  };

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <h1 className="mx-page-title">Activos fijos</h1>
        <div className="flex gap-2">
          <button onClick={handleRunDepreciation} disabled={running} className="mx-btn-secondary">
            <Play size={14} /> {running ? 'Ejecutando…' : 'Depreciar mes'}
          </button>
          <Link href="/assets/new" className="mx-btn-primary">
            <Plus size={15} /> Nuevo activo
          </Link>
        </div>
      </div>

      <div className="mx-card p-3 mb-4 flex items-center gap-3">
        <Search size={15} className="text-[#86868B]" />
        <input
          className="flex-1 outline-none text-sm bg-transparent placeholder:text-[#86868B]"
          placeholder="Buscar por nombre o código…"
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
            {[1,2,3].map(i => <div key={i} className="mx-skeleton h-12 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#86868B]">
            {search || status ? 'Sin resultados' : 'No hay activos registrados'}
          </div>
        ) : (
          <table className="mx-table">
            <thead>
              <tr>
                <th>Código</th><th>Nombre</th><th>Costo</th>
                <th>Valor libro</th><th>Dep. mensual</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td className="font-mono text-xs text-[#86868B]">{a.code}</td>
                  <td>
                    <Link href={`/assets/${a.id}`} className="font-medium text-[#0071E3] hover:underline">
                      {a.name}
                    </Link>
                  </td>
                  <td>{formatCurrency(a.cost, a.currency)}</td>
                  <td className="font-medium">{formatCurrency(a.bookValue, a.currency)}</td>
                  <td className="text-[#86868B]">{formatCurrency(a.monthlyDepreciation, a.currency)}</td>
                  <td><span className={STATUS_BADGE[a.status] ?? 'mx-badge mx-badge-neutral'}>{STATUS_LABEL[a.status] ?? a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-[#86868B] mt-2 px-1">{filtered.length} activo(s)</p>
      )}
    </div>
  );
}
