'use client';

import { useState } from 'react';
import { authClient } from '@/lib/authClient';
import { errMsg } from '@/lib/utils';
import { FileText, Download, AlertCircle } from 'lucide-react';

interface Report {
  id:          string;
  title:       string;
  description: string;
  endpoint:    string;
  hasDateRange: boolean;
}

const REPORTS: Report[] = [
  {
    id:          'cash-flow',
    title:       'Flujo de caja',
    description: 'Ingresos y egresos del período seleccionado.',
    endpoint:    '/reports/cash-flow',
    hasDateRange: true,
  },
  {
    id:          'income-statement',
    title:       'Estado de resultados',
    description: 'Ingresos, costos y utilidad del período.',
    endpoint:    '/reports/income-statement',
    hasDateRange: true,
  },
  {
    id:          'balance-sheet',
    title:       'Balance general',
    description: 'Activos, pasivos y patrimonio a una fecha.',
    endpoint:    '/reports/balance-sheet',
    hasDateRange: false,
  },
  {
    id:          'journal',
    title:       'Libro diario',
    description: 'Todos los asientos contables del período.',
    endpoint:    '/reports/journal',
    hasDateRange: true,
  },
  {
    id:          'invoices',
    title:       'Reporte de facturas',
    description: 'Listado de facturas emitidas en el período.',
    endpoint:    '/reports/invoices',
    hasDateRange: true,
  },
  {
    id:          'purchases',
    title:       'Reporte de compras',
    description: 'Listado de compras registradas en el período.',
    endpoint:    '/reports/purchases',
    hasDateRange: true,
  },
];

export default function ReportsPage() {
  const now   = new Date();
  const first = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().split('T')[0];

  const [from,      setFrom]      = useState(first);
  const [to,        setTo]        = useState(today);
  const [loading,   setLoading]   = useState<string | null>(null);
  const [error,     setError]     = useState('');

  const handleDownload = async (report: Report) => {
    setLoading(report.id);
    setError('');
    try {
      const params = new URLSearchParams();
      if (report.hasDateRange) {
        params.set('from', from);
        params.set('to',   to);
      } else {
        params.set('date', to);
      }

      const response = await authClient.get(`${report.endpoint}?${params}`, {
        responseType: 'blob',
      });

      // Descargar el PDF automáticamente
      const url      = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link     = document.createElement('a');
      link.href      = url;
      link.download  = `${report.id}-${from}-${to}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (ex) {
      setError(`Error generando ${report.title}: ${errMsg(ex)}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <h1 className="mx-page-title">Reportes</h1>
      </div>

      {/* Filtro de fechas global */}
      <div className="mx-card p-4 mb-6 flex items-center gap-4 max-w-xl">
        <div className="flex-1">
          <label className="block text-xs text-[#86868B] mb-1">Desde</label>
          <input type="date" className="mx-input" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-[#86868B] mb-1">Hasta / Fecha</label>
          <input type="date" className="mx-input" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      {error && (
        <div className="mx-card p-4 flex items-center gap-2 text-[#FF3B30] mb-4">
          <AlertCircle size={16} /><span className="text-sm">{error}</span>
        </div>
      )}

      {/* Grid de reportes */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {REPORTS.map(report => (
          <div key={report.id} className="mx-card p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#E3F2FD] flex items-center justify-center flex-shrink-0">
                <FileText size={16} className="text-[#0071E3]" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-[#1D1D1F]">{report.title}</h3>
                <p className="text-xs text-[#86868B] mt-0.5">{report.description}</p>
                {!report.hasDateRange && (
                  <p className="text-xs text-[#FF9F0A] mt-0.5">Usa la fecha "Hasta" como corte</p>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDownload(report)}
              disabled={loading === report.id}
              className="mx-btn-primary w-full justify-center text-sm"
            >
              <Download size={14} />
              {loading === report.id ? 'Generando PDF…' : 'Descargar PDF'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
