'use client';

import { useEffect, useState } from 'react';
import { authClient } from '@/lib/authClient';
import { formatCurrency } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface Kpi { value: number; prev: number; deltaPct: number | null; }
interface DashboardData {
  period: string;
  kpis: {
    mrr: Kpi; arr: Kpi; totalCosts: Kpi; grossMargin: Kpi;
    grossMarginPct: Kpi; ar: Kpi; ap: Kpi;
  };
  history: {
    period: string; salesIssued: number; salesPaid: number;
    purchasesIssued: number; purchasesPaid: number; netIssued: number;
  }[];
}

function KpiCard({ label, value, delta, prefix = 'S/ ', color = 'var(--foreground)' }: {
  label: string; value: number; delta: number | null; prefix?: string; color?: string;
}) {
  const up = delta !== null && delta >= 0;
  return (
    <div className="mx-kpi">
      <p className="mx-kpi-label">{label}</p>
      <p className="mx-kpi-value" style={{ color }}>
        {prefix}{Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
      </p>
      {delta !== null && (
        <div className={`mx-kpi-delta ${up ? 'up' : 'down'}`}>
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{up ? '+' : ''}{delta.toFixed(1)}% vs mes anterior</span>
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: '0.5px solid #E5E5EA', borderRadius: 12, padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <p style={{ color: '#86868B', marginBottom: 6, fontWeight: 500 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const period = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    authClient.get(`/analytics/dashboard?period=${period}`)
      .then(r => setData(r.data))
      .catch(() => setError('No se pudo cargar el dashboard'))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return (
    <div>
      <div className="mx-page-header">
        <div><h1 className="mx-page-title">Dashboard</h1><p className="mx-page-subtitle">Centro de comando</p></div>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        {[1,2,3,4].map(i => <div key={i} className="mx-skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {[1,2].map(i => <div key={i} className="mx-skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="mx-skeleton h-72 rounded-2xl" />
    </div>
  );

  if (error || !data) return (
    <div>
      <div className="mx-page-header">
        <h1 className="mx-page-title">Dashboard</h1>
      </div>
      <div className="mx-card p-5 flex items-center gap-3 text-[#B71C1C]">
        <AlertCircle size={18} /><span className="text-sm">{error || 'Sin datos'}</span>
      </div>
    </div>
  );

  const { kpis, history } = data;
  const chartData = history.map(h => ({
    name:     h.period.slice(5),
    Ingresos: Number(h.salesIssued),
    Gastos:   Number(h.purchasesIssued),
  }));

  const now = new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <div>
          <h1 className="mx-page-title">Dashboard</h1>
          <p className="mx-page-subtitle">Resumen ejecutivo · {now}</p>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KpiCard label="MRR" value={kpis.mrr.value} delta={kpis.mrr.deltaPct} color="var(--apple-blue)" />
        <KpiCard label="Gastos del mes" value={kpis.totalCosts.value} delta={kpis.totalCosts.deltaPct} color="var(--apple-red)" />
        <KpiCard label="Margen bruto" value={kpis.grossMargin.value} delta={kpis.grossMargin.deltaPct} color="var(--apple-green)" />
        <KpiCard label="Margen %" value={kpis.grossMarginPct.value} delta={kpis.grossMarginPct.deltaPct} prefix="" />
      </div>

      {/* KPIs secundarios */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <KpiCard label="Cuentas por cobrar" value={kpis.ar.value} delta={kpis.ar.deltaPct} color="var(--apple-amber)" />
        <KpiCard label="Cuentas por pagar"  value={kpis.ap.value} delta={kpis.ap.deltaPct} color="var(--apple-purple)" />
      </div>

      {/* Gráfico */}
      <div className="mx-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-[#1D1D1F]">Ingresos vs Gastos</h2>
            <p className="text-xs text-[#86868B] mt-0.5">Últimos 12 meses</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#86868B]">
            <span className="flex items-center gap-1.5"><span style={{width:10,height:10,borderRadius:'50%',background:'#0071E3',display:'inline-block'}} />Ingresos</span>
            <span className="flex items-center gap-1.5"><span style={{width:10,height:10,borderRadius:'50%',background:'#FF3B30',display:'inline-block'}} />Gastos</span>
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="mx-empty h-48">
            <p>Sin datos históricos aún</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#0071E3" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#0071E3" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gGastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#FF3B30" stopOpacity={0.10} />
                  <stop offset="100%" stopColor="#FF3B30" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#86868B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#86868B' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `S/${(v/1000).toFixed(0)}k` : `S/${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Ingresos" stroke="#0071E3" strokeWidth={2} fill="url(#gIngresos)" dot={false} activeDot={{ r: 4, fill: '#0071E3', strokeWidth: 0 }} />
              <Area type="monotone" dataKey="Gastos"   stroke="#FF3B30" strokeWidth={2} fill="url(#gGastos)"   dot={false} activeDot={{ r: 4, fill: '#FF3B30', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
