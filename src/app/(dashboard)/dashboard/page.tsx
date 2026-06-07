'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/authClient';
import { formatCurrency } from '@/lib/utils';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  TrendingUp, ShoppingCart, CreditCard, Banknote,
  AlertTriangle, Lightbulb, CheckCircle2,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────

function fmt(value: number): string {
  if (value >= 1_000_000) return `S/${(value/1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `S/${Math.round(value/1_000)}K`;
  return `S/${Math.round(value)}`;
}

function clamp(v: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, v));
}

// ── Score de salud empresarial ────────────────────────────────

interface HealthData {
  ventas:     number;
  margen:     number;
  cobros:     number;
  pagos:      number;
  liquidez:   number;
  eficiencia: number;
  overall:    number;
}

function computeHealth(kpis: DashboardData['kpis']): HealthData {
  const mrr       = Number(kpis.mrr.value);
  const costs     = Number(kpis.totalCosts.value);
  const marginPct = Number(kpis.grossMarginPct.value);
  const ar        = Number(kpis.ar.value);
  const ap        = Number(kpis.ap.value);

  const ventas     = clamp(mrr > 0 ? Math.min((mrr / Math.max(mrr * 1.2, 1)) * 100, 100) : 0);
  const margen     = clamp(marginPct * 100);
  const cobros     = clamp(ar > 0 ? Math.max(0, 100 - (ar / Math.max(mrr, 1)) * 100) : 100);
  const pagos      = clamp(ap > 0 ? Math.max(0, 100 - (ap / Math.max(mrr + 1, 1)) * 50) : 100);
  const liquidez   = clamp(costs > 0 ? Math.min((mrr / Math.max(costs, 1)) * 50, 100) : 80);
  const eficiencia = clamp((ventas + margen) / 2);
  const overall    = Math.round((ventas + margen + cobros + pagos + liquidez + eficiencia) / 6);

  return { ventas, margen, cobros, pagos, liquidez, eficiencia, overall };
}

function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'ÓPTIMO',    color: '#34C759' };
  if (score >= 60) return { label: 'ESTABLE',   color: '#FF9F0A' };
  if (score >= 40) return { label: 'ATENCIÓN',  color: '#FF9F0A' };
  return               { label: 'CRÍTICO',   color: '#FF3B30' };
}

// ── Decisiones ejecutivas ─────────────────────────────────────

interface Decision {
  type:    'alert' | 'opportunity' | 'ok';
  title:   string;
  body:    string;
  action:  string;
  href:    string;
  color:   string;
  bgColor: string;
  borderColor: string;
}

function computeDecisions(kpis: DashboardData['kpis']): Decision[] {
  const mrr    = Number(kpis.mrr.value);
  const costs  = Number(kpis.totalCosts.value);
  const ar     = Number(kpis.ar.value);
  const ap     = Number(kpis.ap.value);
  const margin = Number(kpis.grossMarginPct.value);
  const decisions: Decision[] = [];

  // Deuda sin cobertura
  if (ap > 0 && ap > mrr * 0.3) {
    decisions.push({
      type: 'alert', color: '#E65100', bgColor: '#FFFBF0',
      borderColor: '#FF9F0A',
      title: 'Deuda con proveedores sin cobertura de caja.',
      body:  `Tienes ${formatCurrency(ap)} por pagar y liquidez insuficiente para cubrirlos. Esto puede deteriorar tus condiciones de crédito y afectar el suministro. Prioriza los pagos más críticos esta semana.`,
      action: 'Ver compras pendientes →', href: '/purchases',
    });
  }

  // Cuentas por cobrar altas
  if (ar > 0 && ar > mrr * 0.5) {
    decisions.push({
      type: 'alert', color: '#E65100', bgColor: '#FFFBF0',
      borderColor: '#FF9F0A',
      title: `${formatCurrency(ar)} en facturas sin cobrar.`,
      body:  'El dinero que te deben tus clientes no está trabajando para tu empresa. Cada día de retraso en el cobro deteriora tu flujo de caja. Contacta a los deudores hoy.',
      action: 'Ver cuentas por cobrar →', href: '/invoices',
    });
  }

  // Oportunidad de escalar
  if (margin > 0.5 && mrr > 0) {
    decisions.push({
      type: 'opportunity', color: '#27500A', bgColor: '#F0FDF4',
      borderColor: '#34C759',
      title: 'Momento de escalar.',
      body:  'Tu empresa genera utilidad positiva. Este es el momento estratégico para invertir en crecimiento: ampliar cartera de clientes, mejorar capacidad o reforzar el equipo comercial.',
      action: 'Ver analítica →', href: '/reports',
    });
  }

  // Sin gastos registrados
  if (costs === 0 && mrr > 0) {
    decisions.push({
      type: 'alert', color: '#0D47A1', bgColor: '#EFF6FF',
      borderColor: '#0071E3',
      title: 'Sin gastos registrados este mes.',
      body:  'No hay compras ni egresos registrados. Asegúrate de registrar todos los costos operativos para obtener un margen real.',
      action: 'Registrar compras →', href: '/purchases',
    });
  }

  // Todo en orden
  if (decisions.length === 0) {
    decisions.push({
      type: 'ok', color: '#27500A', bgColor: '#F0FDF4',
      borderColor: '#34C759',
      title: 'Operación saludable.',
      body:  'Todos los indicadores están dentro de rangos normales. Mantén el ritmo de cobros y pagos para conservar el flujo de caja.',
      action: 'Ver reportes →', href: '/reports',
    });
  }

  return decisions;
}

// ── Dimensiones del radar ─────────────────────────────────────

const DIMENSION_CONFIG: { key: keyof Omit<HealthData,'overall'>; label: string; desc: string; getInterp: (v:number) => string }[] = [
  { key:'ventas',     label:'Ventas',     desc:'Ingresos del período', getInterp: v => v>=80?'Consolida y sube precios':v>=50?'Crecimiento moderado':'Acelera la prospección' },
  { key:'margen',     label:'Margen',     desc:'Rentabilidad bruta',   getInterp: v => v>=80?'Rentabilidad positiva y sostenible':v>=50?'Margen aceptable':'Revisa estructura de costos' },
  { key:'cobros',     label:'Cobros',     desc:'Eficiencia de cobro',  getInterp: v => v>=80?'Cobros al día':v>=50?'Negocia descuentos por pronto pago':'Gestión de cobros urgente' },
  { key:'pagos',      label:'Pagos',      desc:'Gestión de deuda',     getInterp: v => v>=80?'Pagos bajo control':v>=50?'Cubre los pagos críticos':'Riesgo de mora' },
  { key:'liquidez',   label:'Liquidez',   desc:'Cobertura de caja',    getInterp: v => v>=80?'Liquidez sólida':v>=50?'Cobertura de obligaciones ajustada':'Liquidez crítica' },
  { key:'eficiencia', label:'Eficiencia', desc:'Eficiencia operativa',  getInterp: v => v>=80?'Alta eficiencia operativa':v>=50?'Eficiencia mejorable':'Revisa procesos internos' },
];

function dimColor(v: number): string {
  if (v >= 80) return '#34C759';
  if (v >= 50) return '#FF9F0A';
  return '#FF3B30';
}

// ── Score Ring ────────────────────────────────────────────────

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const pct  = circ - (score / 100) * circ;
  return (
    <div style={{ position:'relative', width:120, height:120, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <svg width="120" height="120" style={{ position:'absolute', top:0, left:0, transform:'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#E5E5EA" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={pct}
          strokeLinecap="round"
          style={{ transition:'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{ textAlign:'center', position:'relative' }}>
        <div style={{ fontSize:28, fontWeight:700, color, lineHeight:1, letterSpacing:'-1px' }}>{score}<span style={{fontSize:16}}>%</span></div>
        <div style={{ fontSize:10, fontWeight:600, color, letterSpacing:'0.5px', marginTop:2 }}>{scoreLabel(score).label}</div>
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div style={{ background:'#fff', borderRadius:16, border:'0.5px solid rgba(0,0,0,0.06)', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', padding:'18px 20px', display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', color }}>
          {icon}
        </div>
        <span style={{ fontSize:11, fontWeight:500, color:'#86868B', textTransform:'uppercase', letterSpacing:'0.3px' }}>{label}</span>
      </div>
      <div style={{ fontSize:28, fontWeight:600, color:'#1D1D1F', letterSpacing:'-0.5px', lineHeight:1 }}>{fmt(value)}</div>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────

export default function DashboardPage() {
  const router  = useRouter();
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
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28 }}>
        <h1 style={{ fontSize:24, fontWeight:600, color:'#1D1D1F' }}>Dashboard</h1>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:16 }}>
        {[1,2,3,4].map(i => <div key={i} className="mx-skeleton" style={{ height:100, borderRadius:16 }} />)}
      </div>
      <div className="mx-skeleton" style={{ height:420, borderRadius:18 }} />
    </div>
  );

  if (!data) return (
    <div style={{ padding:24, background:'#FFEBEE', borderRadius:14, color:'#B71C1C', fontSize:13 }}>
      {error || 'Error cargando datos'}
    </div>
  );

  const { kpis } = data;
  const health    = computeHealth(kpis);
  const decisions = computeDecisions(kpis);
  const { color: scoreColor } = scoreLabel(health.overall);

  const radarData = DIMENSION_CONFIG.map(d => ({
    subject: d.label,
    value:   Math.round(health[d.key]),
    fullMark: 100,
  }));

  return (
    <div className="mx-fade-in">
      {/* KPI Row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        <KpiCard icon={<TrendingUp size={16}/>} label="Ventas del mes"  value={kpis.mrr.value}        color="#0071E3" />
        <KpiCard icon={<ShoppingCart size={16}/>} label="Gastos del mes" value={kpis.totalCosts.value}  color="#FF3B30" />
        <KpiCard icon={<CreditCard size={16}/>}  label="Por cobrar"     value={kpis.ar.value}           color="#FF9F0A" />
        <KpiCard icon={<Banknote size={16}/>}    label="Por pagar"      value={kpis.ap.value}           color="#9B59B6" />
      </div>

      {/* Centro de Mando */}
      <div style={{ background:'#fff', borderRadius:18, border:'0.5px solid rgba(0,0,0,0.06)', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', padding:28, marginBottom:24 }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:600, color:'#86868B', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:4 }}>CENTRO DE MANDO</div>
            <div style={{ fontSize:15, fontWeight:500, color:'#1D1D1F' }}>Salud empresarial · Decisiones ejecutivas</div>
          </div>
          <ScoreRing score={health.overall} color={scoreColor} />
        </div>

        {/* Radar + Decisiones */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:24, marginBottom:24 }}>

          {/* Radar */}
          <div>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData} margin={{ top:10, right:20, bottom:10, left:20 }}>
                <PolarGrid stroke="#E5E5EA" radialLines={false} />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize:11, fontWeight:500, fill:'#1D1D1F' }} />
                <Radar dataKey="value" stroke="#0071E3" strokeWidth={2}
                  fill="#0071E3" fillOpacity={0.08}
                  dot={{ fill:'#0071E3', strokeWidth:0, r:4 }} />
                <Tooltip formatter={(v: any) => [`${v}%`, 'Score']}
                  contentStyle={{ borderRadius:10, border:'0.5px solid #E5E5EA', fontSize:12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Decisiones ejecutivas */}
          <div>
            <div style={{ fontSize:10, fontWeight:600, color:'#86868B', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:12 }}>DECISIONES EJECUTIVAS</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {decisions.map((d, i) => (
                <div key={i} style={{ background:d.bgColor, borderRadius:12, border:`1px solid ${d.borderColor}30`, borderLeft:`3px solid ${d.borderColor}`, padding:'12px 14px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:d.color, letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:4, display:'flex', alignItems:'center', gap:4 }}>
                      {d.type === 'alert'       && <AlertTriangle size={11} />}
                      {d.type === 'opportunity' && <Lightbulb size={11} />}
                      {d.type === 'ok'          && <CheckCircle2 size={11} />}
                      {d.type === 'alert' ? 'ATENCIÓN' : d.type === 'opportunity' ? 'OPORTUNIDAD' : 'BIEN'}
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#1D1D1F', marginBottom:4 }}>{d.title}</div>
                    <div style={{ fontSize:12, color:'#3A3A3C', lineHeight:1.5 }}>{d.body}</div>
                  </div>
                  <button
                    onClick={() => router.push(d.href)}
                    style={{ flexShrink:0, background:d.borderColor, color:'#fff', border:'none', borderRadius:980, padding:'7px 14px', fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}
                  >
                    {d.action}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Barras de dimensiones */}
        <div style={{ borderTop:'0.5px solid #F2F2F7', paddingTop:20 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px 32px' }}>
            {DIMENSION_CONFIG.map(d => {
              const v     = Math.round(health[d.key]);
              const color = dimColor(v);
              return (
                <div key={d.key}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background:color, flexShrink:0 }} />
                      <span style={{ fontSize:12, fontWeight:500, color:'#1D1D1F' }}>{d.label}</span>
                    </div>
                    <span style={{ fontSize:12, fontWeight:600, color }}>{v}%</span>
                  </div>
                  <div style={{ height:5, background:'#F2F2F7', borderRadius:99, overflow:'hidden', marginBottom:3 }}>
                    <div style={{ height:'100%', width:`${v}%`, background:color, borderRadius:99, transition:'width 1s ease' }} />
                  </div>
                  <div style={{ fontSize:11, color:'#86868B' }}>{d.getInterp(v)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
