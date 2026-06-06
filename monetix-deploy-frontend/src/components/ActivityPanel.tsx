'use client';

import { useEffect, useState } from 'react';
import { authClient } from '@/lib/authClient';

interface ActivityEntry {
  id:        string;
  action:    string;
  userEmail: string;
  httpPath:  string;
  createdAt: string;
  label:     string;
}

interface ActivityPanelProps {
  entityId:   string;
  entityPath: string;  // ej: 'clients', 'suppliers', 'products'
  title?:     string;
}

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-[#E8F5E9] text-[#2E7D32]',
  UPDATE: 'bg-[#E3F2FD] text-[#1565C0]',
  DELETE: 'bg-[#FFF3E0] text-[#E65100]',
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creado',
  UPDATE: 'Modificado',
  DELETE: 'Archivado',
};

export function ActivityPanel({ entityId, entityPath, title = 'Actividad' }: ActivityPanelProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityId) return;
    setLoading(true);
    authClient
      .get(`/${entityPath}/${entityId}/activity?limit=15`)
      .then(r => setEntries(r.data))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [entityId, entityPath]);

  return (
    <div className="mx-card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E5E5EA]">
        <h3 className="text-sm font-medium text-[#1D1D1F]">{title}</h3>
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="mx-skeleton h-10 rounded-lg" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="p-6 text-center text-sm text-[#86868B]">
          Sin actividad registrada
        </div>
      ) : (
        <ul className="divide-y divide-[#F2F2F7]">
          {entries.map(entry => (
            <li key={entry.id} className="px-4 py-3 flex gap-3 items-start">
              <span className={`mt-0.5 flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ACTION_STYLES[entry.action] ?? 'bg-[#F2F2F7] text-[#86868B]'}`}>
                {ACTION_LABELS[entry.action] ?? entry.action}
              </span>
              <div className="min-w-0">
                <p className="text-xs text-[#1D1D1F] truncate">{entry.userEmail}</p>
                <p className="text-[11px] text-[#86868B] mt-0.5">
                  {new Date(entry.createdAt).toLocaleString('es-PE', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
