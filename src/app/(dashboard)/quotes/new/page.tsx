'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react';

interface Client  { id:string;name:string;taxId:string;address:string;email:string; }
interface Product { id:string;code:string;name:string;unitPrice:number;type:string; }
interface Line    { product_name:string;product_code:string;quantity:number;unit_price:number;discount_pct:number;subtotal:number; }
const IGV = 0.18;

function ProductSearch({ value, onChange, onSelect, products }: { value:string;onChange:(v:string)=>void;onSelect:(p:Product)=>void;products:Product[]; }) {
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  const filtered=products.filter(p=>p.name.toLowerCase().includes(value.toLowerCase())||p.code.toLowerCase().includes(value.toLowerCase())).slice(0,8);
  useEffect(()=>{ const h=(e:MouseEvent)=>{ if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false); }; document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h); },[]);
  return (
    <div ref={ref} style={{position:'relative'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,border:`1px solid ${open?'#0071E3':'#E5E5EA'}`,borderRadius:12,padding:'9px 12px',background:'#fff',boxShadow:open?'0 0 0 3px rgba(0,113,227,0.12)':'none'}}>
        <Search size={14} color="#86868B"/>
        <input value={value} onChange={e=>{onChange(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} placeholder="Busca o escribe descripción…" style={{flex:1,border:'none',outline:'none',fontSize:13,background:'transparent',fontFamily:'inherit'}}/>
      </div>
      {open&&filtered.length>0&&(
        <div style={{position:'absolute',top:'100%',left:0,right:0,marginTop:4,background:'#fff',border:'0.5px solid #E5E5EA',borderRadius:12,boxShadow:'0 8px 24px rgba(0,0,0,0.10)',zIndex:50,overflow:'hidden'}}>
          {filtered.map(p=>(
            <button key={p.id} onMouseDown={()=>{onSelect(p);setOpen(false);}} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',border:'none',background:'transparent',cursor:'pointer',borderBottom:'0.5px solid #F2F2F7',fontFamily:'inherit',textAlign:'left'}}
              onMouseEnter={e=>(e.currentTarget.style.background='#F9F9FB')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <div><p style={{fontSize:13,fontWeight:500,color:'#1D1D1F'}}>{p.name}</p><p style={{fontSize:11,color:'#86868B',marginTop:1}}>{p.code}</p></div>
              <p style={{fontSize:13,fontWeight:600,color:'#0071E3'}}>{formatCurrency(p.unitPrice)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewQuotePage() {
  const router=useRouter();
  const { canCreateQuote }=usePermissions();
  const [clients,setClients]=useState<Client[]>([]);
  const [products,setProducts]=useState<Product[]>([]);
  const [clientId,setClientId]=useState('');
  const [clientQ,setClientQ]=useState('');
  const [showDD,setShowDD]=useState(false);
  const [date,setDate]=useState(new Date().toISOString().split('T')[0]);
  const [validUntil,setValidUntil]=useState(()=>{const d=new Date();d.setDate(d.getDate()+30);return d.toISOString().split('T')[0];});
  const [notes,setNotes]=useState('');
  const [conditions,setConditions]=useState('');
  const [lines,setLines]=useState<Line[]>([{product_name:'',product_code:'',quantity:1,unit_price:0,discount_pct:0,subtotal:0}]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const ddRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{ Promise.all([authClient.get('/clients'),authClient.get('/products')]).then(([c,p])=>{ setClients(Array.isArray(c.data)?c.data:[]); setProducts((Array.isArray(p.data)?p.data:p.data?.data??[]).filter((pr:any)=>pr.isActive)); }).catch(()=>{}); },[]);
  useEffect(()=>{ const h=(e:MouseEvent)=>{ if(ddRef.current&&!ddRef.current.contains(e.target as Node))setShowDD(false); }; document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h); },[]);
  useEffect(()=>{ if(clientId){ const c=clients.find(c=>c.id===clientId); if(c)setClientQ(c.name); } },[clientId,clients]);

  if(!canCreateQuote) return <div style={{padding:24,background:'#FFF8E1',borderRadius:14,color:'#E65100',fontSize:13}}>No tienes permisos para crear cotizaciones.</div>;

  const filteredClients=clients.filter(c=>c.name.toLowerCase().includes(clientQ.toLowerCase())||c.taxId.includes(clientQ)).slice(0,6);

  const updateLine=(i:number,field:keyof Line,value:any)=>{ setLines(prev=>{const u=[...prev];(u[i] as any)[field]=value;u[i].subtotal=Number(u[i].quantity)*Number(u[i].unit_price)*(1-Number(u[i].discount_pct)/100);return u;}); };
  const selectProduct=(i:number,p:Product)=>{ setLines(prev=>{const u=[...prev];u[i]={...u[i],product_name:p.name,product_code:p.code,unit_price:p.unitPrice};u[i].subtotal=Number(u[i].quantity)*p.unitPrice*(1-Number(u[i].discount_pct)/100);return u;}); };
  const addLine=()=>setLines(p=>[...p,{product_name:'',product_code:'',quantity:1,unit_price:0,discount_pct:0,subtotal:0}]);
  const removeLine=(i:number)=>setLines(p=>p.filter((_,idx)=>idx!==i));

  const subtotal=lines.reduce((s,l)=>s+Number(l.subtotal),0);
  const igv=subtotal*IGV;
  const total=subtotal+igv;
  const selectedClient=clients.find(c=>c.id===clientId);

  const handleSubmit=async(e:React.FormEvent)=>{ e.preventDefault(); if(!clientId){setError('Selecciona un cliente');return;} if(lines.some(l=>!l.product_name.trim())){setError('Completa la descripción de todos los ítems');return;} setLoading(true);setError('');
    try{ const client=clients.find(c=>c.id===clientId)!; await authClient.post('/quotes',{clientId,clientName:client.name,clientRucDni:client.taxId,clientAddress:client.address??'',clientEmail:client.email??'',quoteDate:date,validUntil,currency:'PEN',igvRate:0.18,notes:notes||null,conditions:conditions||null,items:lines.map((l,idx)=>({lineOrder:idx+1,productName:l.product_name,productCode:l.product_code||null,quantity:Number(l.quantity),unitPrice:Number(l.unit_price),discountPct:Number(l.discount_pct),subtotal:Number(l.subtotal)}))}); router.push('/quotes'); }
    catch(ex){setError(errMsg(ex));setLoading(false);}
  };

  return (
    <div className="mx-fade-in" style={{maxWidth:800}}>
      <div className="mx-page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href="/quotes" className="mx-btn mx-btn-secondary" style={{padding:'8px 12px'}}><ArrowLeft size={15}/></Link>
          <div><h1 className="mx-page-title">Nueva cotización</h1><p className="mx-page-subtitle">Propuesta comercial para el cliente</p></div>
        </div>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mx-form-card">
          <div className="mx-form-title">Cliente</div>
          <div ref={ddRef} style={{position:'relative',marginBottom:8}}>
            <div style={{display:'flex',alignItems:'center',gap:8,border:`1px solid ${showDD?'#0071E3':'#E5E5EA'}`,borderRadius:12,padding:'9px 12px',background:'#fff',boxShadow:showDD?'0 0 0 3px rgba(0,113,227,0.12)':'none'}}>
              <Search size={14} color="#86868B"/>
              <input value={clientQ} onChange={e=>{setClientQ(e.target.value);setClientId('');setShowDD(true);}} onFocus={()=>setShowDD(true)} placeholder="Escribe nombre o RUC del cliente…" style={{flex:1,border:'none',outline:'none',fontSize:13,background:'transparent',fontFamily:'inherit'}}/>
            </div>
            {showDD&&filteredClients.length>0&&(
              <div style={{position:'absolute',top:'100%',left:0,right:0,marginTop:4,background:'#fff',border:'0.5px solid #E5E5EA',borderRadius:12,boxShadow:'0 8px 24px rgba(0,0,0,0.10)',zIndex:50,overflow:'hidden'}}>
                {filteredClients.map(c=>(
                  <button key={c.id} onMouseDown={()=>{setClientId(c.id);setClientQ(c.name);setShowDD(false);}} style={{width:'100%',display:'flex',flexDirection:'column',padding:'10px 14px',border:'none',background:'transparent',cursor:'pointer',borderBottom:'0.5px solid #F2F2F7',fontFamily:'inherit',textAlign:'left'}}
                    onMouseEnter={e=>(e.currentTarget.style.background='#F9F9FB')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                    <p style={{fontSize:13,fontWeight:500,color:'#1D1D1F'}}>{c.name}</p>
                    <p style={{fontSize:11,color:'#86868B'}}>{c.taxId}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedClient&&<div style={{background:'#F9F9FB',borderRadius:10,padding:'10px 14px',fontSize:12,color:'#86868B'}}><span style={{color:'#1D1D1F',fontWeight:500}}>{selectedClient.name}</span>{' · '}{selectedClient.taxId}</div>}
        </div>

        <div className="mx-form-card">
          <div className="mx-form-title">Condiciones</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:16}}>
            <div><label className="mx-label">Fecha</label><input type="date" className="mx-input" value={date} onChange={e=>setDate(e.target.value)} required/></div>
            <div><label className="mx-label">Válida hasta</label><input type="date" className="mx-input" value={validUntil} onChange={e=>setValidUntil(e.target.value)} required/></div>
            <div><label className="mx-label">Notas</label><input className="mx-input" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Observaciones…"/></div>
            <div><label className="mx-label">Condiciones</label><input className="mx-input" value={conditions} onChange={e=>setConditions(e.target.value)} placeholder="Condiciones de pago…"/></div>
          </div>
        </div>

        <div className="mx-form-card" style={{padding:0,overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'0.5px solid #E5E5EA'}}>
            <div className="mx-form-title" style={{margin:0}}>Productos / Servicios</div>
            <button type="button" onClick={addLine} className="mx-btn mx-btn-secondary" style={{padding:'7px 14px',fontSize:12}}><Plus size={13}/>Agregar línea</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'100px 1fr 80px 110px 70px 36px',gap:8,padding:'8px 20px',background:'#FAFAFA',borderBottom:'0.5px solid #E5E5EA'}}>
            {['Código','Descripción','Cantidad','P. Unit.','Desc. %',''].map((h,i)=><div key={i} style={{fontSize:10,fontWeight:600,color:'#86868B',textTransform:'uppercase',letterSpacing:'0.5px'}}>{h}</div>)}
          </div>
          <div style={{padding:'12px 20px',display:'flex',flexDirection:'column',gap:8}}>
            {lines.map((line,i)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'100px 1fr 80px 110px 70px 36px',gap:8,alignItems:'center'}}>
                <input className="mx-input" placeholder="SVC" value={line.product_code} onChange={e=>updateLine(i,'product_code',e.target.value)} style={{padding:'8px 10px',fontSize:12}}/>
                <ProductSearch value={line.product_name} onChange={v=>updateLine(i,'product_name',v)} onSelect={p=>selectProduct(i,p)} products={products}/>
                <input type="number" className="mx-input" min="0.01" step="0.01" value={line.quantity} onChange={e=>updateLine(i,'quantity',e.target.value)} style={{padding:'8px 10px',fontSize:12,textAlign:'right'}}/>
                <input type="number" className="mx-input" min="0" step="0.01" value={line.unit_price} onChange={e=>updateLine(i,'unit_price',e.target.value)} style={{padding:'8px 10px',fontSize:12,textAlign:'right'}}/>
                <input type="number" className="mx-input" min="0" max="100" step="0.01" value={line.discount_pct} onChange={e=>updateLine(i,'discount_pct',e.target.value)} style={{padding:'8px 10px',fontSize:12,textAlign:'right'}}/>
                {lines.length>1?<button type="button" onClick={()=>removeLine(i)} style={{background:'none',border:'none',cursor:'pointer',color:'#FF3B30',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={14}/></button>:<div/>}
              </div>
            ))}
          </div>
          <div style={{borderTop:'0.5px solid #E5E5EA',padding:'16px 20px',display:'flex',justifyContent:'flex-end'}}>
            <div style={{minWidth:220}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'#86868B'}}>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'#86868B'}}>IGV (18%)</span><span>{formatCurrency(igv)}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:700,borderTop:'0.5px solid #E5E5EA',paddingTop:8,marginTop:4}}><span>Total</span><span style={{color:'#0071E3'}}>{formatCurrency(total)}</span></div>
            </div>
          </div>
        </div>

        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:8}}>
          <Link href="/quotes" className="mx-btn mx-btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="mx-btn mx-btn-primary" style={{minWidth:160}}>{loading?'Guardando…':'Crear cotización'}</button>
        </div>
      </form>
    </div>
  );
}
