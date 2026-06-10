'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { authClient } from '@/lib/authClient';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { Plus, Trash2, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BankAccount { id:string; bankName:string; accountNumber:string; currency:string; currentBalance:number; isActive:boolean; }
interface Movement    { id:string; bankAccountId:string; direction:string; amount:number; currency:string; date?:string; movementDate?:string; description:string; reference:string|null; canal?:string; movementType?:string; balanceAfter?:number; matchedSaleId:string|null; matchedPurchaseId:string|null; }
interface Overview    { totalInflows:number; totalOutflows:number; netFlow:number; pendingToMatch:number; }

const getMvDate = (m:Movement) => m.date ?? m.movementDate ?? '';

// ── Tab: Resumen + Cuentas ────────────────────────────────────

function AccountsTab() {
  const [overview, setOverview] = useState<Overview|null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ bankName:'', accountNumber:'', currency:'PEN', initialBalance:0 });

  const load = () => {
    setLoading(true);
    Promise.all([
      authClient.get('/collections/overview').catch(() => ({ data:null })),
      authClient.get('/collections/accounts'),
    ]).then(([ov, ac]) => {
      setOverview(ov.data);
      setAccounts(Array.isArray(ac.data) ? ac.data : ac.data?.data ?? []);
    }).catch(ex => setError(errMsg(ex))).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e:React.FormEvent) => {
    e.preventDefault();
    try { await authClient.post('/collections/accounts', { ...form, initialBalance:Number(form.initialBalance) }); setShowForm(false); setForm({ bankName:'', accountNumber:'', currency:'PEN', initialBalance:0 }); load(); }
    catch (ex) { setError(errMsg(ex)); }
  };
  const handleDelete = async (id:string) => {
    if (!confirm('¿Eliminar esta cuenta bancaria?')) return;
    try { await authClient.delete(`/collections/accounts/${id}`); load(); }
    catch (ex) { setError(errMsg(ex)); }
  };

  if (loading) return <div style={{display:'flex',flexDirection:'column',gap:12}}>{[1,2].map(i=><div key={i} className="mx-skeleton" style={{height:80,borderRadius:14}}/>)}</div>;

  return (
    <div>
      {error && <div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      {overview && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
          <div className="mx-kpi"><div className="mx-kpi-label">Ingresos del mes</div><div className="mx-kpi-value" style={{color:'#34C759',fontSize:22}}>{formatCurrency(overview.totalInflows)}</div></div>
          <div className="mx-kpi"><div className="mx-kpi-label">Egresos del mes</div><div className="mx-kpi-value" style={{color:'#FF3B30',fontSize:22}}>{formatCurrency(overview.totalOutflows)}</div></div>
          <div className="mx-kpi"><div className="mx-kpi-label">Flujo neto</div><div className="mx-kpi-value" style={{fontSize:22,color:overview.netFlow>=0?'#34C759':'#FF3B30'}}>{formatCurrency(overview.netFlow)}</div></div>
        </div>
      )}
      <div className="mx-card-section">
        <div style={{padding:'14px 20px',borderBottom:'0.5px solid #E5E5EA',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3 style={{fontSize:14,fontWeight:600}}>Cuentas bancarias</h3>
          <button onClick={()=>setShowForm(!showForm)} className="mx-btn mx-btn-primary" style={{padding:'6px 14px',fontSize:12}}><Plus size={13}/>Nueva cuenta</button>
        </div>
        {showForm && (
          <form onSubmit={handleCreate} style={{padding:'14px 20px',background:'#F9F9FB',borderBottom:'0.5px solid #E5E5EA',display:'flex',gap:8,flexWrap:'wrap'}}>
            <div style={{flex:'1 1 120px'}}><label className="mx-label">Banco *</label><input className="mx-input" value={form.bankName} onChange={e=>setForm(p=>({...p,bankName:e.target.value}))} required placeholder="BCP, BBVA…"/></div>
            <div style={{flex:'1 1 150px'}}><label className="mx-label">N° cuenta *</label><input className="mx-input" value={form.accountNumber} onChange={e=>setForm(p=>({...p,accountNumber:e.target.value}))} required/></div>
            <div style={{flex:'0 0 100px'}}><label className="mx-label">Moneda</label><select className="mx-select" value={form.currency} onChange={e=>setForm(p=>({...p,currency:e.target.value}))}><option value="PEN">PEN</option><option value="USD">USD</option></select></div>
            <div style={{flex:'1 1 130px'}}><label className="mx-label">Saldo inicial</label><input type="number" className="mx-input" value={form.initialBalance||''} onChange={e=>setForm(p=>({...p,initialBalance:Number(e.target.value)}))}/></div>
            <div style={{display:'flex',alignItems:'flex-end',gap:8}}><button type="submit" className="mx-btn mx-btn-primary">Guardar</button><button type="button" onClick={()=>setShowForm(false)} className="mx-btn mx-btn-secondary">✕</button></div>
          </form>
        )}
        {accounts.length===0 ? <div className="mx-empty">Sin cuentas bancarias registradas</div> : (
          <table className="mx-table">
            <thead><tr><th>Banco</th><th>N° Cuenta</th><th>Moneda</th><th>Saldo actual</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {accounts.map(a=>(
                <tr key={a.id}>
                  <td style={{fontWeight:500}}>{a.bankName}</td>
                  <td style={{fontFamily:'monospace',fontSize:12,color:'#86868B'}}>{a.accountNumber}</td>
                  <td style={{color:'#86868B'}}>{a.currency}</td>
                  <td style={{fontWeight:700,color:'#0071E3'}}>{formatCurrency(a.currentBalance,a.currency)}</td>
                  <td><span className={a.isActive?'mx-badge mx-badge-success':'mx-badge mx-badge-neutral'}>{a.isActive?'Activa':'Inactiva'}</span></td>
                  <td><button onClick={()=>handleDelete(a.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#FF3B30',padding:4}}><Trash2 size={14}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Tab: Movimientos ──────────────────────────────────────────

function MovementsTab() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [accounts,  setAccounts]  = useState<BankAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [direction, setDirection] = useState('');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [form, setForm] = useState({bankAccountId:'',direction:'IN',amount:'',currency:'PEN',date:new Date().toISOString().split('T')[0],description:'',reference:''});

  const load = useCallback(()=>{
    setLoading(true);
    const p=new URLSearchParams({limit:'100'});
    if(accountId) p.set('bankAccountId',accountId);
    if(direction) p.set('direction',direction);
    authClient.get(`/collections/movements?${p}`)
      .then(r=>setMovements(Array.isArray(r.data)?r.data:r.data?.data??[]))
      .catch(ex=>setError(errMsg(ex)))
      .finally(()=>setLoading(false));
  },[accountId,direction]);

  useEffect(()=>{
    authClient.get('/collections/accounts').then(r=>setAccounts(Array.isArray(r.data)?r.data:r.data?.data??[]));
    load();
  },[load]);

  const handleCreate=async(e:React.FormEvent)=>{ e.preventDefault();
    try{await authClient.post('/collections/movements',{...form,amount:Number(form.amount)});setShowForm(false);load();}
    catch(ex){setError(errMsg(ex));}
  };
  const handleDelete=async(id:string)=>{ if(!confirm('¿Eliminar?'))return;
    try{await authClient.delete(`/collections/movements/${id}`);load();}catch(ex){setError(errMsg(ex));}
  };

  return (
    <div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <div style={{display:'flex',gap:12,marginBottom:16}}>
        <select className="mx-select" style={{width:220}} value={accountId} onChange={e=>setAccountId(e.target.value)}>
          <option value="">Todas las cuentas</option>
          {accounts.map(a=><option key={a.id} value={a.id}>{a.bankName} — {a.accountNumber}</option>)}
        </select>
        <select className="mx-select" style={{width:140}} value={direction} onChange={e=>setDirection(e.target.value)}>
          <option value="">Todos</option><option value="IN">Ingresos</option><option value="OUT">Egresos</option>
        </select>
        <button onClick={()=>setShowForm(!showForm)} className="mx-btn mx-btn-primary" style={{marginLeft:'auto',padding:'7px 14px',fontSize:12}}><Plus size={13}/>Registrar</button>
      </div>
      {showForm&&(
        <div className="mx-form-card" style={{marginBottom:16}}>
          <div className="mx-form-title">Nuevo movimiento</div>
          <form onSubmit={handleCreate}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:12}}>
              <div><label className="mx-label">Cuenta *</label><select className="mx-select" value={form.bankAccountId} onChange={e=>setForm(p=>({...p,bankAccountId:e.target.value}))} required><option value="">Seleccionar…</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.bankName}</option>)}</select></div>
              <div><label className="mx-label">Tipo</label><select className="mx-select" value={form.direction} onChange={e=>setForm(p=>({...p,direction:e.target.value}))}><option value="IN">↑ Abono</option><option value="OUT">↓ Cargo</option></select></div>
              <div><label className="mx-label">Monto *</label><input type="number" className="mx-input" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} required/></div>
              <div><label className="mx-label">Fecha *</label><input type="date" className="mx-input" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} required/></div>
              <div><label className="mx-label">Descripción *</label><input className="mx-input" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} required/></div>
              <div><label className="mx-label">N° Operación</label><input className="mx-input" value={form.reference} onChange={e=>setForm(p=>({...p,reference:e.target.value}))} placeholder="1086021"/></div>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button type="button" onClick={()=>setShowForm(false)} className="mx-btn mx-btn-secondary">Cancelar</button><button type="submit" className="mx-btn mx-btn-primary">Guardar</button></div>
          </form>
        </div>
      )}
      <div className="mx-card-section">
        {loading?<div style={{padding:16,display:'flex',flexDirection:'column',gap:8}}>{[1,2,3].map(i=><div key={i} className="mx-skeleton" style={{height:44,borderRadius:8}}/>)}</div>
        :movements.length===0?<div className="mx-empty">Sin movimientos registrados</div>:(
          <table className="mx-table">
            <thead><tr><th>Fecha op.</th><th>Descripción</th><th>Tipo movimiento</th><th>Canal</th><th>Tipo</th><th>Monto</th><th>Saldo</th><th>Conciliado</th><th></th></tr></thead>
            <tbody>
              {movements.map(m=>(
                <tr key={m.id}>
                  <td style={{color:'#86868B',fontSize:12}}>{formatDate(getMvDate(m))}</td>
                  <td style={{fontWeight:500,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.description}</td>
                  <td style={{color:'#86868B',fontSize:12}}>{(m as any).movementType??'—'}</td>
                  <td style={{color:'#86868B',fontSize:12}}>{(m as any).canal??'—'}</td>
                  <td><span className={m.direction==='IN'?'mx-badge mx-badge-success':'mx-badge mx-badge-danger'}>{m.direction==='IN'?'↑ Abono':'↓ Cargo'}</span></td>
                  <td style={{fontWeight:700,color:m.direction==='IN'?'#34C759':'#FF3B30'}}>{formatCurrency(m.amount,m.currency)}</td>
                  <td style={{color:'#86868B',fontSize:12}}>{(m as any).balanceAfter!=null?formatCurrency((m as any).balanceAfter):'—'}</td>
                  <td><span className={(m.matchedSaleId||m.matchedPurchaseId)?'mx-badge mx-badge-success':'mx-badge mx-badge-neutral'}>{(m.matchedSaleId||m.matchedPurchaseId)?'Sí':'No'}</span></td>
                  <td>{!m.matchedSaleId&&!m.matchedPurchaseId&&<button onClick={()=>handleDelete(m.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#FF3B30',padding:4}}><Trash2 size={14}/></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Tab: Importar estado de cuenta ────────────────────────────

interface ImportRow {
  fechaOp:     string;
  fechaProc:   string;
  nroOp:       string;
  movimiento:  string;
  descripcion: string;
  canal:       string;
  cargo:       number|null;
  abono:       number|null;
  saldo:       number|null;
  direction:   'IN'|'OUT';
  amount:      number;
  status:      'pending'|'ok'|'error'|'skipped';
  error?:      string;
}

// Metadatos del archivo bancario
interface BankMeta { empresa:string; cuenta:string; desde:string; hasta:string; saldoDisponible:number|null; }

function ImportTab() {
  const [accounts,  setAccounts]  = useState<BankAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [rows,      setRows]      = useState<ImportRow[]>([]);
  const [meta,      setMeta]      = useState<BankMeta|null>(null);
  const [importing, setImporting] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [skipITF,   setSkipITF]   = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{ authClient.get('/collections/accounts').then(r=>setAccounts(Array.isArray(r.data)?r.data:r.data?.data??[])); },[]);

  // ── Parser de estado de cuenta BCP (y bancos similares) ──
  const parseExcel = (file: File) => {
    setError(''); setSuccess(''); setRows([]); setMeta(null);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data  = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb    = XLSX.read(data, { type:'array', cellDates:true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw   = XLSX.utils.sheet_to_json<any[]>(sheet, { header:1, defval:'' });

        // ── Detectar fila de headers ──────────────────────────
        let headerRow = -1;
        for (let i = 0; i < raw.length; i++) {
          const row = raw[i].map((c:any) => String(c).trim().toLowerCase());
          if (row.some(c => c.includes('fecha') && (row.some(c2=>c2.includes('cargo')) || row.some(c2=>c2.includes('abono'))))) {
            headerRow = i; break;
          }
        }
        if (headerRow === -1) { setError('No se encontró la fila de encabezados. Verifica que el archivo tenga las columnas: Fecha, Cargo, Abono.'); return; }

        // ── Extraer metadatos (filas antes del header) ────────
        const extractedMeta: BankMeta = { empresa:'', cuenta:'', desde:'', hasta:'', saldoDisponible:null };
        for (let i = 0; i < headerRow; i++) {
          const row = raw[i].map((c:any)=>String(c).trim());
          const full = row.join(' ');
          if (full.toLowerCase().includes('empresa')) extractedMeta.empresa = row[1]??'';
          if (full.toLowerCase().includes('cuenta'))  extractedMeta.cuenta  = row[1]??'';
          if (full.toLowerCase().includes('desde'))   extractedMeta.desde   = full;
          if (full.toLowerCase().includes('saldo disponible')) {
            const num = row.find(c => !isNaN(parseFloat(c.replace(',','.'))));
            if (num) extractedMeta.saldoDisponible = parseFloat(num.replace(',','.'));
          }
        }
        setMeta(extractedMeta);

        // ── Mapear columnas por nombre ────────────────────────
        const headers = raw[headerRow].map((c:any) => String(c).trim().toLowerCase());
        const col = (keys:string[]) => keys.findIndex(k => headers.some(h => h.includes(k)));
        const iDate  = headers.findIndex(h => h.includes('fecha') && (h.includes('operac') || h === 'fecha de operación' || headers.indexOf(h) === 0));
        const iDate2 = headers.findIndex((h,i) => h.includes('fecha') && i !== iDate);
        const iNro   = headers.findIndex(h => h.includes('nro') || h.includes('número') || h.includes('numero') || h.includes('operaci'));
        const iMov   = headers.findIndex(h => h.includes('movimiento'));
        const iDesc  = headers.findIndex(h => h.includes('descrip'));
        const iCanal = headers.findIndex(h => h.includes('canal'));
        const iCargo = headers.findIndex(h => h.includes('cargo'));
        const iAbono = headers.findIndex(h => h.includes('abono'));
        const iSaldo = headers.findIndex(h => h.includes('saldo'));

        const parsed: ImportRow[] = [];
        for (let i = headerRow + 1; i < raw.length; i++) {
          const row = raw[i];
          const anyVal = row.some((c:any) => c !== '' && c !== null);
          if (!anyVal) continue;

          const getVal = (idx:number) => idx >= 0 ? String(row[idx]??'').trim() : '';
          const getNum = (idx:number): number|null => {
            if (idx < 0) return null;
            const v = row[idx];
            if (v === '' || v === null || v === undefined) return null;
            const n = parseFloat(String(v).replace(/,/g,'').trim());
            return isNaN(n) ? null : Math.abs(n);
          };

          const cargo = getNum(iCargo);
          const abono = getNum(iAbono);
          const saldo = getNum(iSaldo);

          // Determinar dirección: abono=IN, cargo=OUT
          // Si la columna cargo tiene valor > 0 → OUT, si abono > 0 → IN
          let direction: 'IN'|'OUT' = 'OUT';
          let amount = 0;
          if (abono !== null && abono > 0) { direction='IN'; amount=abono; }
          else if (cargo !== null && cargo > 0) { direction='OUT'; amount=cargo; }
          else continue; // fila sin monto

          // Formatear fecha
          let fechaOp = getVal(iDate);
          if (row[iDate] instanceof Date) {
            const d = row[iDate] as Date;
            fechaOp = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          } else if (fechaOp.match(/\d{2}\/\d{2}\/\d{4}/)) {
            const [dd,mm,yyyy] = fechaOp.split('/');
            fechaOp = `${yyyy}-${mm}-${dd}`;
          }

          parsed.push({
            fechaOp, fechaProc: getVal(iDate2),
            nroOp:       getVal(iNro),
            movimiento:  getVal(iMov),
            descripcion: getVal(iDesc),
            canal:       getVal(iCanal).replace(/\n/g,'').trim(),
            cargo, abono, saldo, direction, amount,
            status: 'pending',
          });
        }

        if (parsed.length === 0) { setError('No se encontraron movimientos en el archivo.'); return; }
        setRows(parsed);
      } catch (ex:any) {
        setError(`Error al leer el archivo: ${ex.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFile = (e:React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) { setError('Solo se aceptan archivos .xlsx, .xls o .csv'); return; }
    parseExcel(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Fecha de operación','Fecha de proceso','Nro. de operación','Movimiento','Descripción','Canal','Cargo','Abono','Saldo contable'],
      ['01/06/2026','01/06/2026','123456','ABONO TRANSFERENCIA','CLIENTE ABC','WEB','','1500.00','2500.00'],
      ['02/06/2026','02/06/2026','654321','CARGO TRANSFERENCIA','PROVEEDOR XYZ','WEB','800.00','','1700.00'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    XLSX.writeFile(wb, 'plantilla_estado_cuenta.xlsx');
  };

  const validRows = rows.filter(r => r.status !== 'skipped' && !(skipITF && (r.movimiento.toUpperCase().includes('ITF') || r.descripcion.toUpperCase().includes('ITF'))));
  const itfCount  = skipITF ? rows.filter(r => r.movimiento.toUpperCase().includes('ITF') || r.descripcion.toUpperCase().includes('ITF')).length : 0;

  const handleImport = async () => {
    if (!accountId) { setError('Selecciona una cuenta bancaria destino'); return; }
    const toImport = rows.map((r,i) => ({...r, _idx:i}))
      .filter(r => !(skipITF && (r.movimiento.toUpperCase().includes('ITF') || r.descripcion.toUpperCase().includes('ITF'))));
    if (toImport.length === 0) { setError('No hay movimientos para importar'); return; }
    setImporting(true); setError(''); setSuccess(''); setProgress(0);
    let ok=0; let fail=0;
    for (let i = 0; i < toImport.length; i++) {
      const r = toImport[i];
      try {
        await authClient.post('/collections/movements', {
          bankAccountId: accountId,
          direction:     r.direction,
          amount:        r.amount,
          currency:      'PEN',
          date:          r.fechaOp,
          description:   r.descripcion || r.movimiento,
          reference:     r.nroOp && r.nroOp !== '-' ? r.nroOp : null,
        });
        setRows(prev => { const u=[...prev]; u[r._idx]={...u[r._idx],status:'ok'}; return u; });
        ok++;
      } catch(ex:any) {
        const msg = ex?.response?.data?.message ?? 'Error';
        setRows(prev => { const u=[...prev]; u[r._idx]={...u[r._idx],status:'error',error:msg}; return u; });
        fail++;
      }
      setProgress(Math.round(((i+1)/toImport.length)*100));
    }
    setImporting(false);
    setSuccess(`Importación completada: ${ok} movimientos registrados${fail>0?`, ${fail} con error`:''}.`);
  };

  return (
    <div>
      {error   && <div className="mx-alert mx-alert-error"   style={{marginBottom:16}}>{error}</div>}
      {success && <div className="mx-alert mx-alert-success" style={{marginBottom:16}}>{success}</div>}

      <div className="mx-form-card" style={{marginBottom:16}}>
        <div className="mx-form-title">Importar estado de cuenta</div>
        <p style={{fontSize:13,color:'#86868B',marginBottom:16}}>
          Sube el estado de cuenta en formato <strong>Excel (.xlsx)</strong> exportado desde tu banco (BCP, BBVA, Interbank, Scotiabank).
          El sistema detecta automáticamente las columnas: Fecha, N° operación, Movimiento, Descripción, Canal, Cargo, Abono, Saldo.
        </p>

        <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap'}}>
          <button onClick={()=>fileRef.current?.click()} className="mx-btn mx-btn-primary">
            <FileSpreadsheet size={14}/> Subir estado de cuenta (.xlsx)
          </button>
          <button onClick={downloadTemplate} className="mx-btn mx-btn-secondary">
            <Download size={14}/> Descargar plantilla
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={handleFile}/>
        </div>

        {/* Metadatos del archivo */}
        {meta && (
          <div style={{background:'#F0F7FF',borderRadius:10,padding:'10px 16px',marginBottom:16,fontSize:12}}>
            <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
              {meta.empresa && <span><strong>Empresa:</strong> {meta.empresa}</span>}
              {meta.cuenta  && <span><strong>Cuenta:</strong> {meta.cuenta}</span>}
              {meta.desde   && <span><strong>Período:</strong> {meta.desde}</span>}
              {meta.saldoDisponible!=null && <span><strong>Saldo disponible:</strong> {formatCurrency(meta.saldoDisponible)}</span>}
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <>
            {/* Config importación */}
            <div style={{display:'flex',gap:12,marginBottom:12,alignItems:'flex-end',flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:200}}>
                <label className="mx-label">Cuenta bancaria destino *</label>
                <select className="mx-select" value={accountId} onChange={e=>setAccountId(e.target.value)}>
                  <option value="">Seleccionar cuenta…</option>
                  {accounts.map(a=><option key={a.id} value={a.id}>{a.bankName} — {a.accountNumber}</option>)}
                </select>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,paddingBottom:4}}>
                <input type="checkbox" id="skipITF" checked={skipITF} onChange={e=>setSkipITF(e.target.checked)} style={{width:15,height:15}}/>
                <label htmlFor="skipITF" style={{fontSize:13,cursor:'pointer',color:'#86868B'}}>
                  Omitir ITF {itfCount>0?`(${itfCount} filas)`:''}
                </label>
              </div>
              <button onClick={handleImport} disabled={importing} className="mx-btn mx-btn-primary">
                <Upload size={14}/>
                {importing?`Importando ${progress}%…`:`Importar ${validRows.length} movimientos`}
              </button>
            </div>

            {/* Barra de progreso */}
            {importing && (
              <div className="mx-progress" style={{marginBottom:12}}>
                <div className="mx-progress-bar" style={{width:`${progress}%`,background:'#0071E3'}}/>
              </div>
            )}

            {/* Resumen */}
            <div style={{display:'flex',gap:16,marginBottom:10,fontSize:12}}>
              <span style={{color:'#34C759'}}><strong>{rows.filter(r=>r.direction==='IN').length}</strong> abonos</span>
              <span style={{color:'#FF3B30'}}><strong>{rows.filter(r=>r.direction==='OUT').length}</strong> cargos</span>
              {itfCount>0&&<span style={{color:'#86868B'}}><strong>{itfCount}</strong> ITF omitidos</span>}
              <span style={{color:'#0071E3'}}><strong>{rows.filter(r=>r.status==='ok').length}</strong> importados</span>
              {rows.filter(r=>r.status==='error').length>0&&<span style={{color:'#FF3B30'}}><strong>{rows.filter(r=>r.status==='error').length}</strong> con error</span>}
            </div>

            {/* Tabla preview */}
            <div style={{maxHeight:380,overflowY:'auto',border:'0.5px solid #E5E5EA',borderRadius:10}}>
              <table className="mx-table" style={{fontSize:11}}>
                <thead>
                  <tr>
                    <th>#</th><th>Fecha op.</th><th>N° Op.</th><th>Movimiento</th>
                    <th>Descripción</th><th>Canal</th><th>Cargo</th><th>Abono</th>
                    <th>Saldo</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r,i)=>{
                    const isITF = r.movimiento.toUpperCase().includes('ITF')||r.descripcion.toUpperCase().includes('ITF');
                    const bg = r.status==='ok'?'#F0FDF4':r.status==='error'?'#FFF5F5':(skipITF&&isITF)?'#F9F9FB':'transparent';
                    return (
                      <tr key={i} style={{background:bg,opacity:(skipITF&&isITF)?0.5:1}}>
                        <td style={{color:'#86868B'}}>{i+1}</td>
                        <td style={{whiteSpace:'nowrap'}}>{r.fechaOp}</td>
                        <td style={{fontFamily:'monospace',color:'#86868B'}}>{r.nroOp||'—'}</td>
                        <td style={{color:'#86868B',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.movimiento}</td>
                        <td style={{fontWeight:500,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={r.descripcion}>{r.descripcion}</td>
                        <td style={{color:'#86868B'}}>{r.canal||'—'}</td>
                        <td style={{color:'#FF3B30',fontFamily:'monospace'}}>{r.cargo!=null?formatCurrency(r.cargo):'—'}</td>
                        <td style={{color:'#34C759',fontFamily:'monospace'}}>{r.abono!=null?formatCurrency(r.abono):'—'}</td>
                        <td style={{color:'#86868B',fontFamily:'monospace'}}>{r.saldo!=null?formatCurrency(r.saldo):'—'}</td>
                        <td>
                          {r.status==='ok'    &&<CheckCircle2 size={13} color="#34C759"/>}
                          {r.status==='error' &&<span style={{color:'#FF3B30',fontSize:10}} title={r.error}><AlertCircle size={13}/></span>}
                          {r.status==='pending'&&(skipITF&&isITF?<span style={{color:'#86868B',fontSize:10}}>omitir</span>:<span style={{color:'#86868B',fontSize:10}}>—</span>)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Tab: Conciliación ─────────────────────────────────────────

function ReconciliationTab() {
  const [movements,   setMovements]   = useState<Movement[]>([]);
  const [selected,    setSelected]    = useState<string|null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [direction,   setDirection]   = useState<'IN'|'OUT'>('IN');
  const [loading,     setLoading]     = useState(true);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [error,       setError]       = useState('');

  const load=useCallback(()=>{
    setLoading(true);
    authClient.get(`/collections/movements?matched=unmatched&direction=${direction}&limit=50`)
      .then(r=>setMovements(Array.isArray(r.data)?r.data:r.data?.data??[]))
      .catch(ex=>setError(errMsg(ex)))
      .finally(()=>setLoading(false));
  },[direction]);

  useEffect(()=>{load();},[load]);

  const loadSuggestions=async(movementId:string)=>{
    setSelected(movementId); setLoadingSugg(true);
    try{
      const endpoint=direction==='IN'?`/collections/movements/${movementId}/suggestions`:`/collections/movements/${movementId}/purchase-suggestions`;
      const r=await authClient.get(endpoint);
      setSuggestions(Array.isArray(r.data)?r.data:r.data?.suggestions??[]);
    }catch{setSuggestions([]);}
    finally{setLoadingSugg(false);}
  };

  const handleMatch=async(movementId:string,targetId:string)=>{
    try{
      if(direction==='IN') await authClient.post(`/collections/movements/${movementId}/match`,{invoiceId:targetId});
      else await authClient.post(`/collections/movements/${movementId}/match-purchase`,{purchaseId:targetId});
      setSelected(null); setSuggestions([]); load();
    }catch(ex){setError(errMsg(ex));}
  };

  return (
    <div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <div style={{display:'flex',gap:2,background:'rgba(0,0,0,0.05)',padding:3,borderRadius:10,width:'fit-content',marginBottom:20}}>
        {(['IN','OUT'] as const).map(d=>(
          <button key={d} onClick={()=>setDirection(d)}
            style={{padding:'6px 16px',borderRadius:7,border:'none',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',background:direction===d?'#fff':'transparent',color:direction===d?'#1D1D1F':'#86868B',boxShadow:direction===d?'0 1px 3px rgba(0,0,0,0.10)':'none'}}>
            {d==='IN'?'↑ Abonos':'↓ Cargos'}
          </button>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div className="mx-card-section">
          <div style={{padding:'12px 20px',borderBottom:'0.5px solid #E5E5EA'}}>
            <h3 style={{fontSize:13,fontWeight:600}}>Sin conciliar ({movements.length})</h3>
          </div>
          {loading?<div style={{padding:12,display:'flex',flexDirection:'column',gap:8}}>{[1,2,3].map(i=><div key={i} className="mx-skeleton" style={{height:56,borderRadius:8}}/>)}</div>
          :movements.length===0?<div className="mx-empty" style={{padding:32}}>Todo conciliado ✓</div>
          :movements.map(m=>(
            <button key={m.id} onClick={()=>loadSuggestions(m.id)}
              style={{width:'100%',padding:'12px 20px',border:'none',background:selected===m.id?'#EFF6FF':'transparent',cursor:'pointer',textAlign:'left',borderBottom:'0.5px solid #F2F2F7',fontFamily:'inherit',borderLeft:selected===m.id?'3px solid #0071E3':'3px solid transparent'}}>
              <p style={{fontSize:13,fontWeight:500,color:'#1D1D1F'}}>{m.description}</p>
              <div style={{display:'flex',gap:12,marginTop:2}}>
                <span style={{fontSize:11,color:'#86868B'}}>{formatDate(getMvDate(m))}</span>
                {(m as any).movementType&&<span style={{fontSize:11,color:'#86868B'}}>{(m as any).movementType}</span>}
                {(m as any).canal&&<span style={{fontSize:11,color:'#86868B'}}>{(m as any).canal}</span>}
                <strong style={{fontSize:11,color:direction==='IN'?'#34C759':'#FF3B30'}}>{formatCurrency(m.amount,m.currency)}</strong>
              </div>
            </button>
          ))}
        </div>
        <div className="mx-card-section">
          <div style={{padding:'12px 20px',borderBottom:'0.5px solid #E5E5EA'}}>
            <h3 style={{fontSize:13,fontWeight:600}}>{selected?'Sugerencias de conciliación':'Selecciona un movimiento'}</h3>
          </div>
          {loadingSugg?<div style={{padding:12}}><div className="mx-skeleton" style={{height:56,borderRadius:8}}/></div>
          :!selected?<div className="mx-empty" style={{padding:32,fontSize:13,color:'#86868B'}}>← Selecciona un movimiento</div>
          :suggestions.length===0?<div className="mx-empty" style={{padding:32}}>Sin sugerencias automáticas</div>
          :suggestions.map((s:any)=>(
            <div key={s.id} style={{padding:'12px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'0.5px solid #F2F2F7'}}>
              <div><p style={{fontSize:13,fontWeight:500}}>{s.invoiceNumber??s.id}</p><p style={{fontSize:12,color:'#86868B'}}>{formatCurrency(s.totalAmount??s.amount)}{s.score?` · ${Math.round(s.score*100)}% coincidencia`:''}</p></div>
              <button onClick={()=>handleMatch(selected,s.id)} className="mx-btn mx-btn-primary" style={{padding:'6px 14px',fontSize:12}}>Conciliar</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────

const TABS = ['Resumen + Cuentas','Movimientos','Importar','Conciliación'];

export default function CollectionsPage() {
  const [tab,setTab]=useState(0);
  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <div><h1 className="mx-page-title">Tesorería</h1><p className="mx-page-subtitle">Cuentas bancarias, movimientos y conciliación</p></div>
      </div>
      <div style={{display:'flex',gap:2,background:'rgba(0,0,0,0.05)',padding:3,borderRadius:12,width:'fit-content',marginBottom:24}}>
        {TABS.map((t,i)=>(
          <button key={t} onClick={()=>setTab(i)}
            style={{padding:'7px 16px',borderRadius:8,border:'none',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',background:tab===i?'#fff':'transparent',color:tab===i?'#1D1D1F':'#86868B',boxShadow:tab===i?'0 1px 4px rgba(0,0,0,0.10)':'none',transition:'all 0.12s'}}>
            {t}
          </button>
        ))}
      </div>
      {tab===0&&<AccountsTab/>}
      {tab===1&&<MovementsTab/>}
      {tab===2&&<ImportTab/>}
      {tab===3&&<ReconciliationTab/>}
    </div>
  );
}
