'use client';

import { useEffect, useState, useCallback } from 'react';
import { authClient } from '@/lib/authClient';

// ── Tipos ─────────────────────────────────────────────────────

interface AuditLog {
  id:          string;
  action:      string;
  entityType:  string;
  entityId:    string | null;
  entityLabel: string | null;
  userEmail:   string;
  httpPath:    string;
  createdAt:   string;
}

interface AuditResponse {
  items: AuditLog[];
  total: number;
  page:  number;
  pages: number;
  limit: number;
}

// ── Constantes ────────────────────────────────────────────────

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'mx-badge-success',
  UPDATE: 'mx-badge-info',
  DELETE: 'mx-badge-warning',
};

const ENTITY_TYPES = [
  'Cliente','Proveedor','Producto','Venta','Compra',
  'Usuario','Empresa','Movimiento bancario','Asiento contable',
];

// ── Componente ────────────────────────────────────────────────

/**
 * AuditSection — agregar como nueva tab en /settings/page.tsx
 *
 * INTEGRACIÓN:
 * 1. Importar este componente en settings/page.tsx
 * 2. Agregar 'Auditoría' al array de tabs existente
 * 3. Renderizar <AuditSection /> en el case correspondiente
 */
export function AuditSection() {
  const [logs,      setLogs]      = useState<AuditLog[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [pages,     setPages]     = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  // Filtros
  const [filterAction,     setFilterAction]     = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [filterFrom,       setFilterFrom]       = useState('');
  const [filterTo,         setFilterTo]         = useState('');

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '25' });
      if (filterAction)     params.set('action',     filterAction);
      if (filterEntityType) params.set('entityType', filterEntityType);
      if (filterFrom)       params.set('from',       filterFrom);
      if (filterTo)         params.set('to',         filterTo);

      const r = await authClient.get<AuditResponse>(`/audit-logs?${params}`);
      setLogs(r.data.items);
      setTotal(r.data.total);
      setPage(r.data.page);
      setPages(r.data.pages);
    } catch {
      setError('No se pudo cargar el historial de auditoría');
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterEntityType, filterFrom, filterTo]);

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="space-y-4">

      {/* Filtros */}
      <div className="mx-card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-[#86868B] mb-1">Acción</label>
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="w-full text-sm rounded-xl border border-[#D1D1D6] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
            >
              <option value="">Todas</option>
              <option value="CREATE">Creación</option>
              <option value="UPDATE">Modificación</option>
              <option value="DELETE">Eliminación</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#86868B] mb-1">Entidad</label>
            <select
              value={filterEntityType}
              onChange={e => setFilterEntityType(e.target.value)}
              className="w-full text-sm rounded-xl border border-[#D1D1D6] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
            >
              <option value="">Todas</option>
              {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#86868B] mb-1">Desde</label>
            <input
              type="date"
              value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)}
              className="w-full text-sm rounded-xl border border-[#D1D1D6] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#86868B] mb-1">Hasta</label>
            <input
              type="date"
              value={filterTo}
              onChange={e => setFilterTo(e.target.value)}
              className="w-full text-sm rounded-xl border border-[#D1D1D6] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button onClick={() => load(1)} className="mx-btn-primary text-sm px-4 py-2">
            Buscar
          </button>
          <button
            onClick={() => {
              setFilterAction('');
              setFilterEntityType('');
              setFilterFrom('');
              setFilterTo('');
            }}
            className="mx-btn-secondary text-sm px-4 py-2"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Contador */}
      {!loading && (
        <p className="text-xs text-[#86868B] px-1">
          {total.toLocaleString('es-PE')} registros encontrados
        </p>
      )}

      {error && <p className="text-sm text-[#FF3B30] px-1">{error}</p>}

      {/* Tabla */}
      <div className="mx-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="mx-skeleton h-10 rounded-lg" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#86868B]">
            No hay registros para los filtros seleccionados
          </div>
        ) : (
          <table className="mx-table w-full">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th>Usuario</th>
                <th>Ruta</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td className="text-xs text-[#86868B] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('es-PE', {
                      day: '2-digit', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td>
                    <span className={`mx-badge ${ACTION_STYLES[log.action] ?? 'mx-badge-info'} text-xs`}>
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <p className="text-sm text-[#1D1D1F]">{log.entityType}</p>
                    {log.entityLabel && (
                      <p className="text-xs text-[#86868B]">{log.entityLabel}</p>
                    )}
                  </td>
                  <td className="text-sm text-[#1D1D1F]">{log.userEmail}</td>
                  <td className="text-xs text-[#86868B] font-mono">{log.httpPath}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-[#86868B]">
            Página {page} de {pages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => load(page - 1)}
              disabled={page <= 1 || loading}
              className="mx-btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
            >
              ← Anterior
            </button>
            <button
              onClick={() => load(page + 1)}
              disabled={page >= pages || loading}
              className="mx-btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
