'use client';

import { useEffect, useState } from 'react';
import { authClient } from '@/lib/authClient';

interface ArchivedRecord {
  id:              string;
  name:            string;
  deletedAt:       string;
  deletionReason?: string;
  [key: string]:   any;
}

interface ArchivedSectionProps {
  entityPath:    string;   // ej: 'clients', 'suppliers', 'products'
  entityLabel:   string;   // ej: 'Cliente', 'Proveedor', 'Producto'
  nameField?:    string;   // campo a mostrar como nombre (default: 'name')
  onRestored?:   () => void;
}

export function ArchivedSection({
  entityPath,
  entityLabel,
  nameField = 'name',
  onRestored,
}: ArchivedSectionProps) {
  const [records, setRecords]   = useState<ArchivedRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError]       = useState('');

  const load = () => {
    setLoading(true);
    authClient
      .get(`/${entityPath}/archived`)
      .then(r => setRecords(r.data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [entityPath]);

  const handleRestore = async (id: string) => {
    setRestoring(id);
    setError('');
    try {
      await authClient.post(`/${entityPath}/${id}/restore`);
      setRecords(prev => prev.filter(r => r.id !== id));
      onRestored?.();
    } catch (ex: any) {
      setError(ex?.response?.data?.message ?? 'Error al restaurar');
    } finally {
      setRestoring(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-card p-4 space-y-2">
        {[1, 2].map(i => <div key={i} className="mx-skeleton h-12 rounded-lg" />)}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="mx-card p-6 text-center text-sm text-[#86868B]">
        No hay {entityLabel.toLowerCase()}s archivados
      </div>
    );
  }

  return (
    <div className="mx-card overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E5E5EA] flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#1D1D1F]">
          Archivados
          <span className="ml-2 text-xs text-[#86868B]">({records.length})</span>
        </h3>
      </div>

      {error && (
        <div className="mx-4 my-2 text-sm text-[#FF3B30]">{error}</div>
      )}

      <ul className="divide-y divide-[#F2F2F7]">
        {records.map(record => (
          <li key={record.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#1D1D1F] truncate">
                {record[nameField] ?? record.name}
              </p>
              <p className="text-[11px] text-[#86868B] mt-0.5">
                Archivado {new Date(record.deletedAt + 'T12:00:00').toLocaleDateString('es-PE', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
                {record.deletionReason && ` · ${record.deletionReason}`}
              </p>
            </div>
            <button
              onClick={() => handleRestore(record.id)}
              disabled={restoring === record.id}
              className="flex-shrink-0 mx-btn-secondary text-xs px-3 py-1.5 disabled:opacity-50"
            >
              {restoring === record.id ? 'Restaurando…' : 'Restaurar'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
