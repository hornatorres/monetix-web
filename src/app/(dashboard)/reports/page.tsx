'use client';

import { useState, useCallback } from 'react';
import { authClient } from '@/lib/authClient';
import { errMsg } from '@/lib/utils';
import {
  Download, FileDown, FileSpreadsheet, Star, Loader2,
  TrendingUp, Scale, BookOpen, FileText, ShoppingCart, Banknote,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────

interface Report {
  id:           string;
  emoji:        React.ReactNode;
  title:        string;
  description:  string;
  endpoint:     string;
  usesDate:     boolean;   // true = usa "date" en vez de from/to
}

const REPORTS: Report[] = [
  { id: 'income-statement', emoji: <TrendingUp size={18} />, title: 'Estado de Resultados',
    description: 'Ingresos, costos y utilidad del período.',   endpoint: '/reports/income-statement', usesDate: false },
  { id: 'balance-sheet',    emoji: <Scale size={18} />,       title: 'Balance General',
    description: 'Activos, pasivos y patrimonio a la fecha.',  endpoint: '/reports/balance-sheet',    usesDate: true  },
  { id: 'cash-flow',        emoji: <Banknote size={18} />,    title: 'Flujo de Caja',
    description: 'Ingresos y egresos del período.',            endpoint: '/reports/cash-flow',        usesDate: false },
  { id: 'journal',          emoji: <BookOpen size={18} />,    title: 'Libro Diario',
    description: 'Asientos contables del período.',            endpoint: '/reports/journal',          usesDate: false },
  { id: 'invoices',         emoji: <FileText size={18} />,    title: 'Reporte de Facturas',
    description: 'Facturas emitidas en el período.',           endpoint: '/reports/invoices',         usesDate: false },
  { id: 'purchases',        emoji: <ShoppingCart size={18} />,title: 'Reporte de Compras',
    description: 'Compras registradas en el período.',         endpoint: '/reports/purchases',        usesDate: false },
];

// Períodos rápidos
type PeriodKey = 'month' | 'quarter' | 'semester' | 'year';
function getPeriod(key: PeriodKey): { from: string; to: string; label: string } {
  const now   = new Date();
  const y     = now.getFullYear();
  const m     = now.getMonth();
  const pad   = (n: number) => String(n).padStart(2, '0');
  const fmt   = (d: Date)   => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today = fmt(now);

  switch (key) {
    case 'month':
      return { from: `${y}-${pad(m+1)}-01`, to: today, label: now.toLocaleString('es-PE', { month: 'long', year: 'numeric' }) };
    case 'quarter': {
      const qStart = new Date(y, Math.floor(m/3)*3, 1);
      return { from: fmt(qStart), to: today, label: `T${Math.floor(m/3)+1} ${y}` };
    }
    case 'semester': {
      const sStart = new Date(y, m < 6 ? 0 : 6, 1);
      return { from: fmt(sStart), to: today, label: `${m < 6 ? '1er' : '2do'} semestre ${y}` };
    }
    case 'year':
      return { from: `${y}-01-01`, to: today, label: `Año ${y}` };
  }
}

// ── Componente principal ──────────────────────────────────────

export default function ReportsPage() {
  const [period,    setPeriod]    = useState<PeriodKey>('month');
  const [from,      setFrom]      = useState(() => getPeriod('month').from);
  const [to,        setTo]        = useState(() => new Date().toISOString().split('T')[0]);
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['income-statement', 'cash-flow']));
  const [loading,   setLoading]   = useState<string | null>(null);
  const [error,     setError]     = useState('');

  const isBusy = loading !== null;

  const handlePeriod = (key: PeriodKey) => {
    setPeriod(key);
    const p = getPeriod(key);
    setFrom(p.from);
    setTo(p.to);
  };

  const toggleSelect  = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleFav     = (id: string) => setFavorites(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll     = () => setSelected(prev => prev.size === REPORTS.length ? new Set() : new Set(REPORTS.map(r => r.id)));

  // ── Descarga PDF ────────────────────────────────────────────
  const downloadPdf = useCallback(async (report: Report) => {
    const params = new URLSearchParams();
    if (report.usesDate) { params.set('date', to); }
    else                 { params.set('from', from); params.set('to', to); }

    const res = await authClient.get(`${report.endpoint}?${params}`, { responseType: 'blob' });
    const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${report.id}-${from}-${to}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
  }, [from, to]);

  // ── Descarga Excel (generado en frontend con datos del backend) ──
  const downloadExcel = useCallback(async (report: Report) => {
    const params = new URLSearchParams();
    if (report.usesDate) { params.set('date', to); params.set('format', 'json'); }
    else                 { params.set('from', from); params.set('to', to); params.set('format', 'json'); }

    try {
      // Intentar obtener datos JSON del mismo endpoint
      const res  = await authClient.get(`${report.endpoint}?${params}`);
      const data = res.data;

      // Convertir a CSV simple (compatible con Excel)
      let csv = '';
      if (Array.isArray(data)) {
        if (data.length > 0) {
          csv = Object.keys(data[0]).join(',') + '\n';
          csv += data.map((row: any) => Object.values(row).map((v: any) =>
            typeof v === 'string' && v.includes(',') ? `"${v}"` : v
          ).join(',')).join('\n');
        }
      } else if (typeof data === 'object') {
        // Para reportes tipo balance que devuelven objeto
        const flatten = (obj: any, prefix = ''): string[][] =>
          Object.entries(obj).flatMap(([k, v]) =>
            typeof v === 'object' && v !== null && !Array.isArray(v)
              ? flatten(v, prefix ? `${prefix}.${k}` : k)
              : [[prefix ? `${prefix}.${k}` : k, String(v)]]
          );
        const rows = flatten(data);
        csv = 'Campo,Valor\n' + rows.map(r => r.join(',')).join('\n');
      }

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${report.id}-${from}-${to}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // Si el endpoint no soporta JSON, descargar el PDF como fallback
      await downloadPdf(report);
    }
  }, [from, to, downloadPdf]);

  // ── Exportación individual ───────────────────────────────────
  const handleExport = async (report: Report, format: 'pdf' | 'xlsx') => {
    setLoading(report.id + '-' + format);
    setError('');
    try {
      if (format === 'pdf')  await downloadPdf(report);
      else                   await downloadExcel(report);
    } catch (ex) { setError(`Error: ${errMsg(ex)}`); }
    finally { setLoading(null); }
  };

  // ── Exportación masiva ───────────────────────────────────────
  const bulkExport = async (format: 'pdf' | 'xlsx' | 'both') => {
    const targets = selected.size > 0
      ? REPORTS.filter(r => selected.has(r.id))
      : REPORTS;

    setLoading('bulk');
    setError('');
    try {
      for (const report of targets) {
        if (format === 'pdf' || format === 'both')  await downloadPdf(report);
        if (format === 'xlsx' || format === 'both') await downloadExcel(report);
      }
    } catch (ex) { setError(`Error en exportación masiva: ${errMsg(ex)}`); }
    finally { setLoading(null); }
  };

  const periodLabel = getPeriod(period).label;
  const favReports  = REPORTS.filter(r => favorites.has(r.id));

  return (
    <div className="mx-fade-in">
      {/* Header */}
      <div className="mx-page-header">
        <div>
          <h1 className="mx-page-title">Reportes</h1>
          <p className="text-xs text-[#86868B] mt-0.5">Centro de reportes financieros</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>
      )}

      {/* Selector de período */}
      <div className="mx-card p-4 mb-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex gap-1 bg-[#F2F2F7] p-1 rounded-xl">
            {(['month','quarter','semester','year'] as PeriodKey[]).map(k => (
              <button key={k} onClick={() => handlePeriod(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === k ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#86868B]'
                }`}>
                {k === 'month' ? 'Mes' : k === 'quarter' ? 'Trimestre' : k === 'semester' ? 'Semestre' : 'Año'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="date" className="mx-input w-36 text-xs" value={from} onChange={e => setFrom(e.target.value)} />
            <span className="text-[#86868B] text-xs">→</span>
            <input type="date" className="mx-input w-36 text-xs" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <span className="text-xs text-[#86868B] ml-auto">{periodLabel}</span>
        </div>
      </div>

      {/* Favoritos */}
      {favReports.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-[#86868B] mb-2 px-1">⭐ Favoritos</p>
          <div className="flex gap-2 flex-wrap">
            {favReports.map(r => (
              <button key={r.id} onClick={() => handleExport(r, 'pdf')} disabled={isBusy}
                className="mx-btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
                {r.emoji} {r.title}
                {loading === r.id + '-pdf' && <Loader2 size={11} className="animate-spin" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid de reportes */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        {REPORTS.map(r => {
          const isSelected = selected.has(r.id);
          const isFav      = favorites.has(r.id);
          const loadPdf    = loading === r.id + '-pdf';
          const loadXlsx   = loading === r.id + '-xlsx';

          return (
            <div key={r.id}
              className={`mx-card p-5 flex flex-col gap-3 transition-all cursor-pointer ${isSelected ? 'ring-2 ring-[#0071E3]' : ''}`}
              onClick={() => toggleSelect(r.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-[#0071E3] text-white' : 'bg-[#E3F2FD] text-[#0071E3]'
                  }`}>
                    {r.emoji}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#1D1D1F]">{r.title}</h3>
                    <p className="text-xs text-[#86868B] mt-0.5">{r.description}</p>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); toggleFav(r.id); }}
                  className={`flex-shrink-0 p-1 rounded-lg transition-colors ${isFav ? 'text-[#FF9F0A]' : 'text-[#D1D1D6] hover:text-[#FF9F0A]'}`}>
                  <Star size={14} fill={isFav ? '#FF9F0A' : 'none'} />
                </button>
              </div>

              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                <button onClick={() => handleExport(r, 'pdf')} disabled={isBusy}
                  className="flex-1 mx-btn-secondary text-xs py-1.5 justify-center">
                  {loadPdf ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                  PDF
                </button>
                <button onClick={() => handleExport(r, 'xlsx')} disabled={isBusy}
                  className="flex-1 mx-btn-secondary text-xs py-1.5 justify-center text-[#34C759]">
                  {loadXlsx ? <Loader2 size={11} className="animate-spin" /> : <FileSpreadsheet size={11} />}
                  Excel
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra de exportación masiva */}
      <div className="mx-card p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={toggleAll} className="mx-btn-secondary text-xs px-3 py-1.5">
            {selected.size === REPORTS.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>
          <p className="text-sm font-medium text-[#1D1D1F]">
            {selected.size > 0
              ? `${selected.size} reporte${selected.size > 1 ? 's' : ''} seleccionado${selected.size > 1 ? 's' : ''}`
              : 'Exportar todos los reportes'}
          </p>
          <p className="text-xs text-[#86868B]">
            {selected.size > 0
              ? REPORTS.filter(r => selected.has(r.id)).map(r => r.title).join(', ')
              : `Período: ${periodLabel}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => bulkExport('pdf')} disabled={isBusy}
            className="mx-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
            <FileDown size={13} className="text-[#FF3B30]" /> PDF
          </button>
          <button onClick={() => bulkExport('xlsx')} disabled={isBusy}
            className="mx-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
            <FileSpreadsheet size={13} className="text-[#34C759]" /> Excel
          </button>
          <button onClick={() => bulkExport('both')} disabled={isBusy}
            className="mx-btn-secondary text-xs px-3 py-1.5">
            PDF + Excel
          </button>
          <button onClick={() => bulkExport('pdf')} disabled={isBusy}
            className="mx-btn-primary text-xs px-4 py-1.5">
            {loading === 'bulk' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {selected.size > 0 ? 'Exportar seleccionados' : 'Exportar todos'}
          </button>
        </div>
      </div>
    </div>
  );
}
