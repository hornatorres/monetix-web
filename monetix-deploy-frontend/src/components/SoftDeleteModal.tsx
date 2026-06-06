'use client';

import { useState } from 'react';
import { authClient } from '@/lib/authClient';

interface SoftDeleteModalProps {
  entityId:    string;
  entityPath:  string;   // ej: 'clients'
  entityLabel: string;   // ej: 'cliente'
  entityName:  string;   // ej: 'Empresa ABC S.A.C.'
  onDeleted:   () => void;
  onClose:     () => void;
}

export function SoftDeleteModal({
  entityId, entityPath, entityLabel, entityName, onDeleted, onClose,
}: SoftDeleteModalProps) {
  const [reason,   setReason]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('El motivo es obligatorio');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authClient.delete(`/${entityPath}/${entityId}`, { data: { reason } });
      onDeleted();
    } catch (ex: any) {
      setError(ex?.response?.data?.message ?? 'Error al archivar');
      setLoading(false);
    }
  };

  // Overlay faux-viewport para evitar position:fixed
  return (
    <div
      style={{ minHeight: 320, background: 'rgba(0,0,0,0.45)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="mx-card w-full max-w-md p-6">
        <h2 className="text-base font-medium text-[#1D1D1F] mb-1">
          Archivar {entityLabel}
        </h2>
        <p className="text-sm text-[#86868B] mb-4">
          <span className="font-medium text-[#1D1D1F]">{entityName}</span> quedará
          archivado y no aparecerá en las listas. Podrás restaurarlo después.
        </p>

        <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
          Motivo <span className="text-[#FF3B30]">*</span>
        </label>
        <textarea
          className="w-full rounded-xl border border-[#D1D1D6] text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:border-transparent"
          rows={3}
          placeholder={`¿Por qué archivas este ${entityLabel}?`}
          value={reason}
          onChange={e => { setReason(e.target.value); setError(''); }}
        />

        {error && (
          <p className="text-xs text-[#FF3B30] mt-1">{error}</p>
        )}

        <div className="flex gap-3 mt-4 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="mx-btn-secondary text-sm px-4 py-2"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            className="bg-[#FF3B30] text-white text-sm px-4 py-2 rounded-xl font-medium disabled:opacity-50 hover:bg-[#D63027] transition-colors"
          >
            {loading ? 'Archivando…' : 'Archivar'}
          </button>
        </div>
      </div>
    </div>
  );
}
