'use client';

import { useState, useCallback } from 'react';
import { authClient } from '@/lib/authClient';
import { formatCurrency, errMsg } from '@/lib/utils';
import { Download, FileSpreadsheet, Star, Loader2, TrendingUp, Scale, Banknote, BookOpen, FileText, ShoppingCart } from 'lucide-react';

interface Report { id:string; icon:React.ReactNode; title:string; description:string; endpoint:string; usesDate:boolean; }

const REPORTS: Report[] = [
  { id:'income-statement', icon:<TrendingUp size={17}/>, title:'Estado de Resultados', description:'Ingresos, costos y utilidad del período.', endpoint:'/reports/income-statement', usesDate:false },
  { id:'balance-sheet',    icon:<Scale size={17}/>,       title:'Balance General',       description:'Activos, pasivos y patrimonio a la fecha.', endpoint:'/reports/balance-sheet', usesDate:true },
  { id:'cash-flow',        icon:<Banknote size={17}/>,    title:'Flujo de Caja',          description:'Ingresos y egresos del período.', endpoint:'/reports/cash-flow', usesDate:false },
  { id:'journal',          icon:<BookOpen size={17}/>,    title:'Libro Diario',           description:'Asientos contables del período.', endpoint:'/reports/journal', usesDate:false },
  { id:'invoices',         icon:<FileText size={17}/>,    title:'Reporte de Facturas',    description:'Facturas emitidas en el período.', endpoint:'/reports/invoices', usesDate:false },
  { id:'purchases',        icon:<ShoppingCart size={17}/>,title:'Reporte de Compras',     description:'Compras registradas en el período.', endpoint:'/reports/purchases', usesDate:false },
];

type PeriodKey = 'month'|'quarter'|'semester'|'year';

function getPeriod(key:PeriodKey): { from:string; to:string; label:string } {
  const now=new Date(); const y=now.getFullYear(); const m=now.getMonth();
  const pad=(n:number)=>String(n).padStart(2,'0');
  const fmt=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today=fmt(now);
  switch(key) {
    case 'month':    return { from:`${y}-${pad(m+1)}-01`, to:today, label:now.toLocaleString('es-PE',{month:'long',year:'numeric'}) };
    case 'quarter':  { const qs=new Date(y,Math.floor(m/3)*3,1); return { from:fmt(qs), to:today, label:`T${Math.floor(m/3)+1} ${y}` }; }
    case 'semester': { const ss=new Date(y,m<6?0:6,1); return { from:fmt(ss), to:today, label:`${m<6?'1er':'2do'} semestre ${y}` }; }
    case 'year':     return { from:`${y}-01-01`, to:today, label:`Año ${y}` };
  }
}

export default function ReportsPage() {
  const [period,    setPeriod]    = useState<PeriodKey>('month');
  const [from,      setFrom]      = useState(() => getPeriod('month').from);
  const [to,        setTo]        = useState(() => new Date().toISOString().split('T')[0]);
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['income-statement','cash-flow']));
  const [loading,   setLoading]   = useState<string|null>(null);
  const [error,     setError]     = useState('');

  const handlePeriod = (key:PeriodKey) => { setPeriod(key); const p=getPeriod(key); setFrom(p.from); setTo(p.to); };
  const toggleSelect  = (id:string) => setSelected(prev => { const s=new Set(prev); s.has(id)?s.delete(id):s.add(id); return s; });
  const toggleFav     = (id:string) => setFavorites(prev => { const s=new Set(prev); s.has(id)?s.delete(id):s.add(id); return s; });
  const toggleAll     = () => setSelected(prev => prev.size===REPORTS.length ? new Set() : new Set(REPORTS.map(r=>r.id)));
  const isBusy = loading !== null;

  const downloadPdf = useCallback(async (report:Report) => {
    const params = new URLSearchParams();
    if (report.usesDate) params.set('date',to); else { params.set('from',from); params.set('to',to); }
    const res = await authClient.get(`${report.endpoint}?${params}`, { responseType:'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data],{type:'application/pdf'}));
    const a = document.createElement('a'); a.href=url; a.download=`${report.id}-${from}-${to}.pdf`;
    document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
  }, [from, to]);

  const downloadExcel = useCallback(async (report:Report) => {
    const params = new URLSearchParams();
    if (report.usesDate) params.set('date',to); else { params.set('from',from); params.set('to',to); }
    params.set('format','json');
    try {
      const res = await authClient.get(`${report.endpoint}?${params}`);
      const data = res.data;
      let csv = '';
      if (Array.isArray(data)) {
        if (data.length>0) { csv=Object.keys(data[0]).join(',')+'\n'; csv+=data.map((row:any)=>Object.values(row).map((v:any)=>typeof v==='string'&&v.includes(',')?`"${v}"`:v).join(',')).join('\n'); }
      } else if (typeof data==='object') {
        const flatten=(obj:any,prefix=''):string[][]=>Object.entries(obj).flatMap(([k,v])=>typeof v==='object'&&v!==null&&!Array.isArray(v)?flatten(v,prefix?`${prefix}.${k}`:k):[[prefix?`${prefix}.${k}`:k,String(v)]]);
        const rows=flatten(data); csv='Campo,Valor\n'+rows.map(r=>r.join(',')).join('\n');
      }
      const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
      const url=window.URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=`${report.id}-${from}-${to}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch { await downloadPdf(report); }
  }, [from, to, downloadPdf]);

  const handleExport = async (report:Report, format:'pdf'|'xlsx') => {
    setLoading(report.id+'-'+format); setError('');
    try { if (format==='pdf') await downloadPdf(report); else await downloadExcel(report); }
    catch (ex) { setError(errMsg(ex)); }
    finally { setLoading(null); }
  };

  const bulkExport = async (format:'pdf'|'xlsx'|'both') => {
    const targets = selected.size>0 ? REPORTS.filter(r=>selected.has(r.id)) : REPORTS;
    setLoading('bulk'); setError('');
    try { for (const r of targets) { if (format==='pdf'||format==='both') await downloadPdf(r); if (format==='xlsx'||format==='both') await downloadExcel(r); } }
    catch (ex) { setError(errMsg(ex)); }
    finally { setLoading(null); }
  };

  const periodLabel = getPeriod(period).label;
  const favReports  = REPORTS.filter(r => favorites.has(r.id));

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <div><h1 className="mx-page-title">Reportes</h1><p className="mx-page-subtitle">Centro de reportes financieros</p></div>
      </div>
      {error && <div className="mx-alert mx-alert-error" style={{ marginBottom:16 }}>{error}</div>}

      {/* Selector de período */}
      <div className="mx-form-card" style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:2, background:'rgba(0,0,0,0.05)', padding:3, borderRadius:10 }}>
            {(['month','quarter','semester','year'] as PeriodKey[]).map(k => (
              <button key={k} onClick={() => handlePeriod(k)}
                style={{ padding:'6px 14px', borderRadius:7, border:'none', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit', background: period===k ? '#fff' : 'transparent', color: period===k ? '#1D1D1F' : '#86868B', boxShadow: period===k ? '0 1px 3px rgba(0,0,0,0.10)' : 'none' }}>
                {k==='month'?'Mes':k==='quarter'?'Trimestre':k==='semester'?'Semestre':'Año'}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input type="date" className="mx-input" style={{ width:150 }} value={from} onChange={e => setFrom(e.target.value)} />
            <span style={{ color:'#86868B', fontSize:13 }}>→</span>
            <input type="date" className="mx-input" style={{ width:150 }} value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <span style={{ fontSize:12, color:'#86868B', marginLeft:'auto' }}>{periodLabel}</span>
        </div>
      </div>

      {/* Favoritos */}
      {favReports.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <p style={{ fontSize:11, fontWeight:600, color:'#86868B', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>⭐ Acceso rápido</p>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {favReports.map(r => (
              <button key={r.id} onClick={() => handleExport(r,'pdf')} disabled={isBusy}
                className="mx-btn mx-btn-secondary" style={{ fontSize:12, padding:'7px 14px', gap:6 }}>
                {r.icon} {r.title}
                {loading===r.id+'-pdf' && <Loader2 size={11} style={{ animation:'spin 1s linear infinite' }}/>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:16 }}>
        {REPORTS.map(r => {
          const isSelected=selected.has(r.id);
          const isFav=favorites.has(r.id);
          const loadPdf=loading===r.id+'-pdf';
          const loadXlsx=loading===r.id+'-xlsx';
          return (
            <div key={r.id}
              onClick={() => toggleSelect(r.id)}
              style={{ background:'#fff', borderRadius:16, border:`1px solid ${isSelected?'#0071E3':'#E5E5EA'}`, padding:18, cursor:'pointer', boxShadow: isSelected ? '0 0 0 2px rgba(0,113,227,0.15)' : '0 1px 3px rgba(0,0,0,0.05)', transition:'all 0.1s', display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background: isSelected ? '#0071E3' : '#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', color: isSelected ? '#fff' : '#0071E3', flexShrink:0 }}>
                    {r.icon}
                  </div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, color:'#1D1D1F' }}>{r.title}</p>
                    <p style={{ fontSize:11, color:'#86868B', marginTop:1 }}>{r.description}</p>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); toggleFav(r.id); }}
                  style={{ background:'none', border:'none', cursor:'pointer', color: isFav ? '#FF9F0A' : '#D1D1D6', padding:4 }}>
                  <Star size={14} fill={isFav?'#FF9F0A':'none'}/>
                </button>
              </div>
              <div style={{ display:'flex', gap:8 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => handleExport(r,'pdf')} disabled={isBusy}
                  className="mx-btn mx-btn-secondary" style={{ flex:1, justifyContent:'center', fontSize:12, padding:'7px 10px' }}>
                  {loadPdf ? <Loader2 size={11}/> : <Download size={11}/>} PDF
                </button>
                <button onClick={() => handleExport(r,'xlsx')} disabled={isBusy}
                  className="mx-btn mx-btn-secondary" style={{ flex:1, justifyContent:'center', fontSize:12, padding:'7px 10px', color:'#34C759' }}>
                  {loadXlsx ? <Loader2 size={11}/> : <FileSpreadsheet size={11}/>} Excel
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra bulk */}
      <div style={{ background:'#fff', borderRadius:14, border:'0.5px solid #E5E5EA', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={toggleAll} className="mx-btn mx-btn-secondary" style={{ fontSize:12, padding:'6px 14px' }}>
            {selected.size===REPORTS.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>
          <p style={{ fontSize:13, fontWeight:500 }}>
            {selected.size>0 ? `${selected.size} reporte(s) seleccionado(s)` : `Período: ${periodLabel}`}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => bulkExport('pdf')} disabled={isBusy} className="mx-btn mx-btn-secondary" style={{ fontSize:12 }}><Download size={13} style={{ color:'#FF3B30' }}/> PDF</button>
          <button onClick={() => bulkExport('xlsx')} disabled={isBusy} className="mx-btn mx-btn-secondary" style={{ fontSize:12 }}><FileSpreadsheet size={13} style={{ color:'#34C759' }}/> Excel</button>
          <button onClick={() => bulkExport('pdf')} disabled={isBusy} className="mx-btn mx-btn-primary" style={{ fontSize:12 }}>
            {loading==='bulk' ? <Loader2 size={13}/> : <Download size={13}/>}
            {selected.size>0 ? 'Exportar seleccionados' : 'Exportar todos'}
          </button>
        </div>
      </div>
    </div>
  );
}
