'use client';

import { useEffect, useState } from 'react';
import { authClient } from '@/lib/authClient';
import { formatCurrency } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign,
  Users, ShoppingCart, AlertCircle,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────

interface Kpi {
  value:    number;
  prev:     number;
  deltaPct: number | null;
}

interface DashboardData {
  period: string;
  kpis: {
    mrr:            Kpi;
    arr:            Kpi;
    totalCosts:     Kpi;
    grossMargin:    Kpi;
    grossMarginPct: Kpi;
    ar:             Kpi;
    ap:             Kpi;
  };
  history: {
    period:          string;
    salesIssued:     number;
    salesPaid:       number;
    purchasesIssued: number;
    purchasesPaid:   number;
    netIssued:       number;
  }[];
}

// ── KPI Card ──────────────────────────────────────────────────

function KpiCard({
  label, value, delta, prefix = 'S/ ', color = '#0071E3',
}: {
  label:   string;
  value:   number;
  delta:   number | null;
  prefix?: string;
  color?:  string;
}) {
  const up = delta !== null && delta >= 0;
  return (
    <div className="mx-card p-5">
      <p className="text-xs text-[#86868B] mb-2">{label}</p>
      <p className="text-2xl font-semibold text-[#1D1D1F]">
        {prefix}{Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
      </p>
      {delta !== null && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${up ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {up ? '+' : ''}{delta.toFixed(1)}% vs mes anterior
        </div>
      )}
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const period = new Date().toISOString().slice(0, 7); // YYYY-MM

  useEffect(() => {
    authClient
      .get(`/analytics/dashboard?period=${period}`)
      .then(r => setData(r.data))
      .catch(() => setError('No se pudo cargar el dashboard'))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div>
        <div className="mx-page-header">
          <h1 className="mx-page-title">Dashboard</h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="mx-skeleton h-28 rounded-2xl" />)}
        </div>
        <div className="mx-skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <div className="mx-page-header">
          <h1 className="mx-page-title">Dashboard</h1>
        </div>
        <div className="mx-card p-6 flex items-center gap-3 text-[#FF3B30]">
          <AlertCircle size={18} />
          <span className="text-sm">{error || 'Sin datos'}</span>
        </div>
      </div>
    );
  }

  const { kpis, history } = data;

  // Formatear historial para Recharts
  const chartData = history.map(h => ({
    name:     h.period.slice(5), // MM
    Ingresos: Number(h.salesIssued),
    Gastos:   Number(h.purchasesIssued),
    Neto:     Number(h.netIssued),
  }));

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <h1 className="mx-page-title">Dashboard</h1>
        <span className="text-sm text-[#86868B]">
          {new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="MRR" value={kpis.mrr.value} delta={kpis.mrr.deltaPct} />
        <KpiCard label="Gastos del mes" value={kpis.totalCosts.value} delta={kpis.totalCosts.deltaPct} color="#FF3B30" />
        <KpiCard label="Margen bruto" value={kpis.grossMargin.value} delta={kpis.grossMargin.deltaPct} color="#34C759" />
        <KpiCard label="Margen %" value={kpis.grossMarginPct.value} delta={kpis.grossMarginPct.deltaPct} prefix="" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <KpiCard label="Cuentas por cobrar" value={kpis.ar.value} delta={kpis.ar.deltaPct} color="#FF9F0A" />
        <KpiCard label="Cuentas por pagar"  value={kpis.ap.value} delta={kpis.ap.deltaPct} color="#9B59B6" />
      </div>

      {/* Gráfico */}
      <div className="mx-card p-6">
        <h2 className="text-sm font-medium text-[#1D1D1F] mb-4">
          Ingresos vs Gastos — últimos 6 meses
        </h2>
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-[#86868B]">
            Sin datos históricos aún
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0071E3" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0071E3" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gGastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#FF3B30" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#FF3B30" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#86868B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#86868B' }} axisLine={false} tickLine={false}
                tickFormatter={v => `S/${(v/1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number, name: string) => [formatCurrency(v), name]}
                contentStyle={{ borderRadius: 12, border: '0.5px solid #E5E5EA', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="Ingresos" stroke="#0071E3" strokeWidth={2} fill="url(#gIngresos)" />
              <Area type="monotone" dataKey="Gastos"   stroke="#FF3B30" strokeWidth={2} fill="url(#gGastos)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
