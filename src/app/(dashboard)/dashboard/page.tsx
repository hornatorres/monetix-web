'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/authClient';
import { formatCurrency, fmtAbbr } from '@/lib/utils';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, ShoppingCart, CreditCard, Banknote,
  AlertTriangle, Lightbulb, CheckCircle2, Users, Package,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────

interface Kpi { value:number; prev:number; deltaPct:number|null; }

interface DashboardData {
  period:          string;
  availableCash:   number;
  kpis: {
    mrr:Kpi; arr:Kpi; totalCosts:Kpi; grossMargin:Kpi;
    grossMarginPct:Kpi; ar:Kpi; arCount:Kpi; ap:Kpi; apCount:Kpi;
  };
  topClients: { clientId:string; clientName:string; totalIssued:number; totalPaid:number; unpaidCount:number; }[];
  productMix: { productCode:string; productName:string; total:number; pct:number; }[];
  history:    { period:string; salesIssued:number; purchasesIssued:number; netIssued:number; }[];
  debtorClients:   { clientId:string; clientName:string; pendingAmount:number; invoiceCount:number; oldestDue:string; }[];
  creditorSuppliers:{ supplierId:string; supplierName:string; pendingAmount:number; invoiceCount:number; oldestDue:string; }[];
}

// ── Helpers ───────────────────────────────────────────────────

function clamp(v:number, min=0, max=100) { return Math.min(max, Math.max(min, v)); }

function computeHealth(kpis: DashboardData['kpis'], availableCash: number) {
  const mrr       = Number(kpis.mrr.value);
  const costs     = Number(kpis.totalCosts.value);
  const marginPct = Number(kpis.grossMarginPct.value);
  const ar        = Number(kpis.ar.value);
  const ap        = Number(kpis.ap.value);

  const ventas     = clamp(mrr > 0 ? Math.min((mrr / Math.max(mrr * 1.2, 1)) * 100, 100) : 0);
  const margen     = clamp(marginPct);
  const cobros     = clamp(ar > 0 ? Math.max(0, 100 - (ar / Math.max(mrr, 1)) * 100) : 100);
  const pagos      = clamp(ap > 0 ? Math.max(0, 100 - (ap / Math.max(mrr + 1, 1)) * 50) : 100);
  const liquidez   = clamp(availableCash > 0 ? Math.min((availableCash / Math.max(ap, mrr * 0.3, 1)) * 50, 100) : 30);
  const eficiencia = clamp((ventas + margen) / 2);
  const overall    = Math.round((ventas + margen + cobros + pagos + liquidez + eficiencia) / 6);

  return { ventas, margen, cobros, pagos, liquidez, eficiencia, overall };
}

function scoreLabel(score:number) {
  if (score >= 80) return { label:'ÓPTIMO',   color:'#34C759' };
  if (score >= 60) return { label:'ESTABLE',  color:'#FF9F0A' };
  if (score >= 40) return { label:'ATENCIÓN', color:'#FF9F0A' };
  return               { label:'CRÍTICO',  color:'#FF3B30' };
}

function computeDecisions(kpis: DashboardData['kpis'], availableCash: number, debtors: DashboardData['debtorClients'], creditors: DashboardData['creditorSuppliers']) {
  const mrr    = Number(kpis.mrr.value);
  const ar     = Number(kpis.ar.value);
  const ap     = Number(kpis.ap.value);
  const margin = Number(kpis.grossMarginPct.value);
  const decisions: any[] = [];

  if (ap > 0 && ap > availableCash * 0.8) {
    decisions.push({ type:'alert', color:'#E65100', bgColor:'#FFFBF0', borderColor:'#FF9F0A',
      title:'Deuda con proveedores sin cobertura de caja.',
      body:`Tienes ${formatCurrency(ap)} por pagar y solo ${formatCurrency(availableCash)} disponible. Prioriza los pagos más críticos esta semana.`,
      action:'Ver compras pendientes →', href:'/purchases' });
  }

  if (ar > 0 && ar > mrr * 0.5) {
    decisions.push({ type:'alert', color:'#E65100', bgColor:'#FFFBF0', borderColor:'#FF9F0A',
      title:`${formatCurrency(ar)} en facturas sin cobrar.`,
      body:`${debtors.length} cliente(s) con deuda pendiente. Cada día de retraso deteriora tu flujo de caja.`,
      action:'Ver cuentas por cobrar →', href:'/invoices' });
  }

  if (margin > 50 && mrr > 0) {
    decisions.push({ type:'opportunity', color:'#27500A', bgColor:'#F0FDF4', borderColor:'#34C759',
      title:'Momento de escalar.',
      body:'Tu empresa genera utilidad positiva. Este es el momento estratégico para invertir en crecimiento.',
      action:'Ver analítica →', href:'/reports' });
  }

  if (decisions.length === 0) {
    decisions.push({ type:'ok', color:'#27500A', bgColor:'#F0FDF4', borderColor:'#34C759',
      title:'Operación saludable.',
      body:'Todos los indicadores están dentro de rangos normales.',
      action:'Ver reportes →', href:'/reports' });
  }
  return decisions;
}

const DIMENSIONS = [
  { key:'ventas',     label:'Ventas',     interp:(v:number) => v>=80?'Consolida y sube precios':v>=50?'Crecimiento moderado':'Acelera la prospección' },
  { key:'margen',     label:'Margen',     interp:(v:number) => v>=80?'Rentabilidad positiva y sostenible':v>=50?'Margen aceptable':'Revisa estructura de costos' },
  { key:'cobros',     label:'Cobros',     interp:(v:number) => v>=80?'Cobros al día':v>=50?'Negocia descuentos por pronto pago':'Gestión de cobros urgente' },
  { key:'pagos',      label:'Pagos',      interp:(v:number) => v>=80?'Pagos bajo control':v>=50?'Cubre los pagos críticos':'Riesgo de mora' },
  { key:'liquidez',   label:'Liquidez',   interp:(v:number) => v>=80?'Liquidez sólida':v>=50?'Cobertura ajustada':'Liquidez crítica' },
  { key:'eficiencia', label:'Eficiencia', interp:(v:number) => v>=80?'Alta eficiencia operativa':v>=50?'Eficiencia mejorable':'Revisa procesos internos' },
];

function dimColor(v:number) { return v>=80?'#34C759':v>=50?'#FF9F0A':'#FF3B30'; }

// ── Score Ring ────────────────────────────────────────────────

function ScoreRing({ score, color }: { score:number; color:string }) {
  const r=44; const circ=2*Math.PI*r; const pct=circ-(score/100)*circ;
  return (
    <div style={{ position:'relative', width:110, height:110, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <svg width="110" height="110" style={{ position:'absolute', top:0, left:0, transform:'rotate(-90deg)' }}>
        <circle cx="55" cy="55" r={r} fill="none" stroke="#F2F2F7" strokeWidth="8"/>
        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={pct} strokeLinecap="round"
          style={{ transition:'stroke-dashoffset 1s ease' }}/>
      </svg>
      <div style={{ textAlign:'center', position:'relative' }}>
        <div style={{ fontSize:26, fontWeight:700, color, lineHeight:1, letterSpacing:'-1px' }}>{score}<span style={{fontSize:14}}>%</span></div>
        <div style={{ fontSize:9, fontWeight:700, color, letterSpacing:'0.5px', marginTop:2 }}>{scoreLabel(score).label}</div>
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, hint, color='#1D1D1F', onClick }:{
  icon:React.ReactNode; label:string; value:string;
  sub?:string; hint?:string; color?:string; onClick?:()=>void;
}) {
  const [showHint, setShowHint] = useState(false);
  return (
    <div onClick={onClick} style={{ background:'#fff', borderRadius:16, border:'0.5px solid rgba(0,0,0,0.06)', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', padding:'16px 18px', display:'flex', flexDirection:'column', gap:8, cursor: onClick ? 'pointer' : 'default', position:'relative' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:30, height:30, borderRadius:9, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', color }}>
          {icon}
        </div>
        <span style={{ fontSize:10, fontWeight:600, color:'#86868B', textTransform:'uppercase', letterSpacing:'0.4px' }}>{label}</span>
        {hint && (
          <div style={{ marginLeft:'auto', position:'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setShowHint(v => !v); }}
              style={{ width:16, height:16, borderRadius:'50%', background:'#F2F2F7', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#86868B', lineHeight:1, padding:0 }}
            >?</button>
            {showHint && (
              <div style={{ position:'absolute', top:22, right:0, background:'#1D1D1F', color:'#fff', fontSize:11, lineHeight:1.5, padding:'8px 12px', borderRadius:10, width:200, zIndex:99, boxShadow:'0 4px 16px rgba(0,0,0,0.18)', whiteSpace:'normal' }}>
                {hint}
                <div style={{ position:'absolute', top:-5, right:6, width:0, height:0, borderLeft:'5px solid transparent', borderRight:'5px solid transparent', borderBottom:'5px solid #1D1D1F' }}/>
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ fontSize:24, fontWeight:700, color:'#1D1D1F', letterSpacing:'-0.5px', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#86868B' }}>{sub}</div>}
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'white', border:'0.5px solid #E5E5EA', borderRadius:10, padding:'8px 12px', fontSize:12, boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }}>
      <p style={{ color:'#86868B', marginBottom:4, fontWeight:500 }}>{label}</p>
      {payload.map((p:any) => (
        <p key={p.name} style={{ color:p.color }}>{p.name}: {formatCurrency(p.value)}</p>
      ))}
    </div>
  );
};

// ── Página ────────────────────────────────────────────────────

export default function DashboardPage() {
  const router  = useRouter();
  const [data,    setData]    = useState<DashboardData|null>(null);
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
      <div style={{ marginBottom:28 }}><h1 style={{ fontSize:24, fontWeight:700 }}>Dashboard</h1></div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:16 }}>
        {[1,2,3,4,5].map(i => <div key={i} className="mx-skeleton" style={{ height:96, borderRadius:16 }}/>)}
      </div>
      <div className="mx-skeleton" style={{ height:440, borderRadius:18 }}/>
    </div>
  );

  if (!data) return <div className="mx-alert mx-alert-error">{error||'Error cargando datos'}</div>;

  const { kpis, availableCash, topClients, productMix, history, debtorClients, creditorSuppliers } = data;
  const health    = computeHealth(kpis, availableCash);
  const decisions = computeDecisions(kpis, availableCash, debtorClients, creditorSuppliers);
  const { color: scoreColor } = scoreLabel(health.overall);

  const radarData = DIMENSIONS.map(d => ({
    subject: d.label,
    value:   Math.round((health as any)[d.key]),
    fullMark: 100,
  }));

  const chartData = history.filter(h => Number(h.salesIssued) > 0 || Number(h.purchasesIssued) > 0 || history.indexOf(h) >= history.length - 6).map(h => ({
    name:     h.period.slice(5),
    Ingresos: Number(h.salesIssued),
    Gastos:   Number(h.purchasesIssued),
  }));

  const now = new Date().toLocaleDateString('es-PE', { month:'long', year:'numeric' });

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <div><h1 className="mx-page-title">Dashboard</h1><p className="mx-page-subtitle">Resumen ejecutivo · {now}</p></div>
      </div>

      {/* KPI Row — 5 indicadores */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:16 }}>
        <KpiCard icon={<TrendingUp size={15}/>} label="MRR" value={fmtAbbr(kpis.mrr.value)} color="#0071E3"
          hint="Monthly Recurring Revenue — ingresos facturados en el mes actual, incluyendo ventas únicas y suscripciones."/>
        <KpiCard icon={<TrendingUp size={15}/>} label="ARR" value={fmtAbbr(kpis.arr.value)} color="#5856D6"
          hint="Annual Recurring Revenue — proyección anual del MRR actual (MRR × 12). Indicador clave para evaluar el crecimiento sostenible del negocio."/>
        <KpiCard icon={<ShoppingCart size={15}/>} label="Gastos" value={fmtAbbr(kpis.totalCosts.value)} color="#FF3B30"/>
        <KpiCard
          icon={<CreditCard size={15}/>}
          label="Por cobrar"
          value={fmtAbbr(kpis.ar.value)}
          sub={`${Number(kpis.arCount.value)} factura(s)`}
          color="#FF9F0A"
          onClick={() => router.push('/invoices')}
        />
        <KpiCard
          icon={<Banknote size={15}/>}
          label="Por pagar"
          value={fmtAbbr(kpis.ap.value)}
          sub={`${Number(kpis.apCount.value)} proveedor(es)`}
          color="#9B59B6"
          onClick={() => router.push('/purchases')}
        />
      </div>

      {/* Caja disponible */}
      <div style={{ background:'linear-gradient(135deg, #0071E3 0%, #5856D6 100%)', borderRadius:14, padding:'14px 20px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <p style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Caja disponible</p>
          <p style={{ fontSize:28, fontWeight:700, color:'#fff', letterSpacing:'-0.5px' }}>{formatCurrency(availableCash)}</p>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.7)' }}>Margen bruto</p>
          <p style={{ fontSize:20, fontWeight:700, color:'#fff' }}>{Number(kpis.grossMarginPct.value).toFixed(1)}%</p>
        </div>
      </div>

      {/* Centro de Mando */}
      <div style={{ background:'#fff', borderRadius:18, border:'0.5px solid rgba(0,0,0,0.06)', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', padding:24, marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:600, color:'#86868B', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:4 }}>CENTRO DE MANDO</div>
            <div style={{ fontSize:15, fontWeight:500, color:'#1D1D1F' }}>Salud empresarial · Decisiones ejecutivas</div>
          </div>
          <ScoreRing score={health.overall} color={scoreColor}/>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:24, marginBottom:20 }}>
          {/* Radar */}
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData} margin={{ top:10, right:20, bottom:10, left:20 }}>
              <PolarGrid stroke="#E5E5EA" radialLines={false}/>
              <PolarAngleAxis dataKey="subject" tick={{ fontSize:11, fontWeight:500, fill:'#1D1D1F' }}/>
              <Radar dataKey="value" stroke="#0071E3" strokeWidth={2} fill="#0071E3" fillOpacity={0.08} dot={{ fill:'#0071E3', strokeWidth:0, r:4 }}/>
              <Tooltip formatter={(v:any) => [`${v}%`, 'Score']} contentStyle={{ borderRadius:10, border:'0.5px solid #E5E5EA', fontSize:12 }}/>
            </RadarChart>
          </ResponsiveContainer>

          {/* Decisiones */}
          <div>
            <div style={{ fontSize:10, fontWeight:600, color:'#86868B', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:10 }}>DECISIONES EJECUTIVAS</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {decisions.map((d, i) => (
                <div key={i} style={{ background:d.bgColor, borderRadius:10, borderLeft:`3px solid ${d.borderColor}`, padding:'10px 12px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:d.color, textTransform:'uppercase', marginBottom:3, display:'flex', alignItems:'center', gap:4 }}>
                      {d.type==='alert'?<AlertTriangle size={10}/>:d.type==='opportunity'?<Lightbulb size={10}/>:<CheckCircle2 size={10}/>}
                      {d.type==='alert'?'ATENCIÓN':d.type==='opportunity'?'OPORTUNIDAD':'BIEN'}
                    </div>
                    <div style={{ fontSize:12, fontWeight:600, color:'#1D1D1F', marginBottom:2 }}>{d.title}</div>
                    <div style={{ fontSize:11, color:'#3A3A3C', lineHeight:1.4 }}>{d.body}</div>
                  </div>
                  <button onClick={() => router.push(d.href)}
                    style={{ flexShrink:0, background:d.borderColor, color:'#fff', border:'none', borderRadius:980, padding:'5px 10px', fontSize:10, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                    {d.action}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Barras de dimensiones */}
        <div style={{ borderTop:'0.5px solid #F2F2F7', paddingTop:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px 28px' }}>
            {DIMENSIONS.map(d => {
              const v=Math.round((health as any)[d.key]); const color=dimColor(v);
              return (
                <div key={d.key}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:color }}/>
                      <span style={{ fontSize:12, fontWeight:500, color:'#1D1D1F' }}>{d.label}</span>
                    </div>
                    <span style={{ fontSize:12, fontWeight:600, color }}>{v}%</span>
                  </div>
                  <div style={{ height:4, background:'#F2F2F7', borderRadius:99, overflow:'hidden', marginBottom:2 }}>
                    <div style={{ height:'100%', width:`${v}%`, background:color, borderRadius:99, transition:'width 1s ease' }}/>
                  </div>
                  <div style={{ fontSize:10, color:'#86868B' }}>{d.interp(v)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fila inferior: Gráfico + Top Clientes + Mix de productos */}
      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr', gap:14, marginBottom:16 }}>

        {/* Gráfico histórico */}
        <div style={{ background:'#fff', borderRadius:16, border:'0.5px solid rgba(0,0,0,0.06)', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div><p style={{ fontSize:13, fontWeight:600, color:'#1D1D1F' }}>Ingresos vs Gastos</p><p style={{ fontSize:11, color:'#86868B' }}>Últimos 12 meses</p></div>
            <div style={{ display:'flex', gap:12, fontSize:11, color:'#86868B' }}>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:8, height:8, borderRadius:'50%', background:'#0071E3', display:'inline-block' }}/> Ingresos</span>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:8, height:8, borderRadius:'50%', background:'#FF3B30', display:'inline-block' }}/> Gastos</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top:4, right:4, left:0, bottom:0 }}>
              <defs>
                <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0071E3" stopOpacity={0.12}/><stop offset="100%" stopColor="#0071E3" stopOpacity={0}/></linearGradient>
                <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF3B30" stopOpacity={0.10}/><stop offset="100%" stopColor="#FF3B30" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false}/>
              <XAxis dataKey="name" tick={{ fontSize:10, fill:'#86868B' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fill:'#86868B' }} axisLine={false} tickLine={false} tickFormatter={v => v>=1000?`${(v/1000).toFixed(0)}k`:String(v)}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Area type="monotone" dataKey="Ingresos" stroke="#0071E3" strokeWidth={2} fill="url(#gI)" dot={false}/>
              <Area type="monotone" dataKey="Gastos"   stroke="#FF3B30" strokeWidth={2} fill="url(#gG)"   dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Clientes */}
        <div style={{ background:'#fff', borderRadius:16, border:'0.5px solid rgba(0,0,0,0.06)', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14 }}>
            <Users size={14} color="#0071E3"/>
            <p style={{ fontSize:13, fontWeight:600, color:'#1D1D1F' }}>Top clientes</p>
          </div>
          {topClients.length === 0 ? (
            <p style={{ fontSize:12, color:'#86868B' }}>Sin datos</p>
          ) : topClients.map((c, i) => {
            const paidPct = c.totalIssued > 0 ? (c.totalPaid / c.totalIssued) * 100 : 0;
            return (
              <div key={c.clientId} style={{ marginBottom:i < topClients.length-1 ? 14 : 0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:500, color:'#1D1D1F', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:130 }}>{c.clientName}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'#0071E3' }}>{fmtAbbr(c.totalIssued)}</span>
                </div>
                <div style={{ height:4, background:'#F2F2F7', borderRadius:99, overflow:'hidden', marginBottom:3 }}>
                  <div style={{ height:'100%', width:`${paidPct}%`, background:'#34C759', borderRadius:99 }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:10, color:'#86868B' }}>Cobrado: {fmtAbbr(c.totalPaid)}</span>
                  <span style={{ fontSize:10, color: c.unpaidCount > 0 ? '#FF9F0A' : '#86868B' }}>{c.unpaidCount} sin cobrar</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mix de productos */}
        <div style={{ background:'#fff', borderRadius:16, border:'0.5px solid rgba(0,0,0,0.06)', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14 }}>
            <Package size={14} color="#9B59B6"/>
            <p style={{ fontSize:13, fontWeight:600, color:'#1D1D1F' }}>Mix de productos</p>
          </div>
          {productMix.length === 0 ? (
            <p style={{ fontSize:12, color:'#86868B' }}>Sin datos</p>
          ) : productMix.slice(0,4).map((p, i) => {
            const colors = ['#0071E3','#9B59B6','#34C759','#FF9F0A'];
            return (
              <div key={i} style={{ marginBottom: i < Math.min(productMix.length,4)-1 ? 12 : 0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:11, fontWeight:500, color:'#1D1D1F', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:130 }}>{p.productName}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:colors[i%colors.length] }}>{p.pct.toFixed(1)}%</span>
                </div>
                <div style={{ height:4, background:'#F2F2F7', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${p.pct}%`, background:colors[i%colors.length], borderRadius:99 }}/>
                </div>
                <span style={{ fontSize:10, color:'#86868B' }}>{fmtAbbr(p.total)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deudores + Acreedores */}
      {(debtorClients.length > 0 || creditorSuppliers.length > 0) && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

          {/* Clientes deudores */}
          {debtorClients.length > 0 && (
            <div style={{ background:'#fff', borderRadius:16, border:'0.5px solid rgba(0,0,0,0.06)', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'0.5px solid #F2F2F7', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'#FF9F0A' }}/>
                  <span style={{ fontSize:12, fontWeight:600, color:'#1D1D1F' }}>Clientes con deuda</span>
                </div>
                <span style={{ fontSize:11, color:'#86868B' }}>{debtorClients.length} cliente(s)</span>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr style={{ background:'#FAFAFA' }}>
                  <th style={{ padding:'8px 16px', textAlign:'left', fontSize:10, fontWeight:600, color:'#86868B', textTransform:'uppercase', letterSpacing:'0.4px' }}>Cliente</th>
                  <th style={{ padding:'8px 16px', textAlign:'right', fontSize:10, fontWeight:600, color:'#86868B', textTransform:'uppercase', letterSpacing:'0.4px' }}>Pendiente</th>
                  <th style={{ padding:'8px 16px', textAlign:'right', fontSize:10, fontWeight:600, color:'#86868B', textTransform:'uppercase', letterSpacing:'0.4px' }}>Facturas</th>
                </tr></thead>
                <tbody>
                  {debtorClients.map(d => (
                    <tr key={d.clientId} style={{ borderTop:'0.5px solid #F2F2F7' }}>
                      <td style={{ padding:'10px 16px', fontWeight:500 }}>{d.clientName}</td>
                      <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:700, color:'#FF9F0A' }}>{formatCurrency(d.pendingAmount)}</td>
                      <td style={{ padding:'10px 16px', textAlign:'right', color:'#86868B' }}>{d.invoiceCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Proveedores acreedores */}
          {creditorSuppliers.length > 0 && (
            <div style={{ background:'#fff', borderRadius:16, border:'0.5px solid rgba(0,0,0,0.06)', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'0.5px solid #F2F2F7', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'#FF3B30' }}/>
                  <span style={{ fontSize:12, fontWeight:600, color:'#1D1D1F' }}>Proveedores por pagar</span>
                </div>
                <span style={{ fontSize:11, color:'#86868B' }}>{creditorSuppliers.length} proveedor(es)</span>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr style={{ background:'#FAFAFA' }}>
                  <th style={{ padding:'8px 16px', textAlign:'left', fontSize:10, fontWeight:600, color:'#86868B', textTransform:'uppercase', letterSpacing:'0.4px' }}>Proveedor</th>
                  <th style={{ padding:'8px 16px', textAlign:'right', fontSize:10, fontWeight:600, color:'#86868B', textTransform:'uppercase', letterSpacing:'0.4px' }}>Pendiente</th>
                  <th style={{ padding:'8px 16px', textAlign:'right', fontSize:10, fontWeight:600, color:'#86868B', textTransform:'uppercase', letterSpacing:'0.4px' }}>Facturas</th>
                </tr></thead>
                <tbody>
                  {creditorSuppliers.map(s => (
                    <tr key={s.supplierId} style={{ borderTop:'0.5px solid #F2F2F7' }}>
                      <td style={{ padding:'10px 16px', fontWeight:500 }}>{s.supplierName}</td>
                      <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:700, color:'#FF3B30' }}>{formatCurrency(s.pendingAmount)}</td>
                      <td style={{ padding:'10px 16px', textAlign:'right', color:'#86868B' }}>{s.invoiceCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
