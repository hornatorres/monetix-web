'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface Line { id?:string;productName:string;productCode:string;productType:string;quantity:number;unitPrice:number;subtotal:number; }
const IGV=0.18;

export default function EditPurchasePage() {
  const { id }=useParams<{id:string}>();
  const router=useRouter();
  const [date,setDate]=useState('');
  const [notes,setNotes]=useState('');
  const [lines,setLines]=useState<Line[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{ authClient.get(`/purchases/${id}`).then(r=>{const p=r.data;setDate(p.purchaseDate??'');setNotes(p.notes??'');setLines((p.items??[]).map((item:any)=>({id:item.id,productName:item.productName??item.product_name??'',productCode:item.productCode??item.product_code??'',productType:item.productType??'ONE_TIME',quantity:Number(item.quantity),unitPrice:Number(item.unitPrice??item.unit_price),subtotal:Number(item.subtotal)})));}).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); },[id]);

  const updateLine=(i:number,field:keyof Line,value:any)=>{ setLines(prev=>{const u=[...prev];(u[i] as any)[field]=value;u[i].subtotal=Number(u[i].quantity)*Number(u[i].unitPrice);return u;}); };
  const addLine=()=>setLines(p=>[...p,{productName:'',productCode:'',productType:'ONE_TIME',quantity:1,unitPrice:0,subtotal:0}]);
  const removeLine=(i:number)=>setLines(p=>p.filter((_,idx)=>idx!==i));

  const subtotal=lines.reduce((s,l)=>s+Number(l.subtotal),0);
  const igv=subtotal*IGV;
  const total=subtotal+igv;

  const handleSubmit=async(e:React.FormEvent)=>{ e.preventDefault();setSaving(true);setError('');
    try{await authClient.put(`/purchases/${id}`,{purchaseDate:date,notes,items:lines.map((l,idx)=>({lineOrder:idx+1,productName:l.productName,productCode:l.productCode||null,productType:l.productType,quantity:Number(l.quantity),unitPrice:Number(l.unitPrice),subtotal:Number(l.subtotal)}))});router.push(`/purchases/${id}`);}
    catch(ex){setError(errMsg(ex));setSaving(false);}
  };

  if(loading) return <div className="mx-skeleton" style={{height:320,borderRadius:16,maxWidth:720}}/>;

  return (
    <div className="mx-fade-in" style={{maxWidth:720}}>
      <div className="mx-page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link href={`/purchases/${id}`} className="mx-btn mx-btn-secondary" style={{padding:'8px 12px'}}><ArrowLeft size={15}/></Link>
          <div><h1 className="mx-page-title">Editar compra</h1><p className="mx-page-subtitle">Modifica los datos de esta compra</p></div>
        </div>
      </div>
      {error&&<div className="mx-alert mx-alert-error" style={{marginBottom:16}}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mx-form-card">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div><label className="mx-label">Fecha *</label><input type="date" className="mx-input" value={date} onChange={e=>setDate(e.target.value)} required/></div>
            <div><label className="mx-label">Notas</label><input className="mx-input" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Referencia…"/></div>
          </div>
        </div>
        <div className="mx-form-card" style={{padding:0,overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'0.5px solid #E5E5EA'}}>
            <div className="mx-form-title" style={{margin:0}}>Ítems</div>
            <button type="button" onClick={addLine} className="mx-btn mx-btn-secondary" style={{padding:'7px 14px',fontSize:12}}><Plus size={13}/>Agregar ítem</button>
          </div>
          <div style={{padding:'12px 20px',display:'flex',flexDirection:'column',gap:8}}>
            {lines.map((line,i)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'100px 1fr 80px 120px 36px',gap:8,alignItems:'center'}}>
                <input className="mx-input" placeholder="COD" value={line.productCode} onChange={e=>updateLine(i,'productCode',e.target.value)} style={{padding:'8px 10px',fontSize:12}}/>
                <input className="mx-input" placeholder="Descripción *" value={line.productName} onChange={e=>updateLine(i,'productName',e.target.value)} required style={{padding:'8px 10px',fontSize:12}}/>
                <input type="number" className="mx-input" min="0.01" step="0.01" value={line.quantity} onChange={e=>updateLine(i,'quantity',e.target.value)} style={{padding:'8px 10px',fontSize:12,textAlign:'right'}}/>
                <input type="number" className="mx-input" min="0" step="0.01" value={line.unitPrice} onChange={e=>updateLine(i,'unitPrice',e.target.value)} style={{padding:'8px 10px',fontSize:12,textAlign:'right'}}/>
                {lines.length>1?<button type="button" onClick={()=>removeLine(i)} style={{background:'none',border:'none',cursor:'pointer',color:'#FF3B30',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={14}/></button>:<div/>}
              </div>
            ))}
          </div>
          <div style={{borderTop:'0.5px solid #E5E5EA',padding:'16px 20px',display:'flex',justifyContent:'flex-end'}}>
            <div style={{minWidth:200}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'#86868B'}}>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}><span style={{color:'#86868B'}}>IGV (18%)</span><span>{formatCurrency(igv)}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:700,borderTop:'0.5px solid #E5E5EA',paddingTop:8,marginTop:4}}><span>Total</span><span style={{color:'#0071E3'}}>{formatCurrency(total)}</span></div>
            </div>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:8}}>
          <Link href={`/purchases/${id}`} className="mx-btn mx-btn-secondary">Cancelar</Link>
          <button type="submit" disabled={saving} className="mx-btn mx-btn-primary">{saving?'Guardando…':'Guardar cambios'}</button>
        </div>
      </form>
    </div>
  );
}
