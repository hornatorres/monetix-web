'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

interface Product { id:string;code:string;name:string;description:string;type:string;unitPrice:number;currency:string;igvExempt:boolean;accountCodeIncome:string|null;accountCodeCogs:string|null;isActive:boolean; }
const TYPE_LABEL: Record<string,string> = { ONE_TIME:'Único', SUBSCRIPTION:'Suscripción', METERED:'Medido', ASSET:'Activo' };

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { canEditMaster } = usePermissions();
  const [product, setProduct] = useState<Product|null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Product>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { authClient.get(`/products/${id}`).then(r=>{setProduct(r.data);setForm(r.data);}).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); }, [id]);

  const set = (f:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setForm(p=>({...p,[f]:e.target.value}));

  const handleSave = async () => {
    setSaving(true); setError('');
    try { const r=await authClient.put(`/products/${id}`,{name:form.name,description:form.description,unitPrice:Number(form.unitPrice),accountCodeIncome:form.accountCodeIncome||null,accountCodeCogs:form.accountCodeCogs||null}); setProduct(r.data); setEditing(false); }
    catch (ex) { setError(errMsg(ex)); }
    finally { setSaving(false); }
  };

  const handleToggle = async () => {
    try { const r=await authClient.patch(`/products/${id}/toggle-active`); setProduct(r.data); }
    catch (ex) { setError(errMsg(ex)); }
  };

  if (loading) return <div className="mx-skeleton h-64 rounded-2xl max-w-2xl"/>;
  if (!product) return <div className="mx-card p-6 flex items-center gap-2 text-[#FF3B30]"><AlertCircle size={16}/><span className="text-sm">{error||'Producto no encontrado'}</span></div>;

  return (
    <div className="mx-fade-in max-w-2xl">
      <div className="mx-page-header">
        <div className="flex items-center gap-3"><Link href="/products" className="mx-btn-secondary px-3 py-2"><ArrowLeft size={15}/></Link><div><h1 className="mx-page-title">{product.name}</h1><p className="text-xs text-[#86868B]">{product.code} · {TYPE_LABEL[product.type]??product.type}</p></div></div>
        <div className="flex gap-2">
          {canEditMaster && <button onClick={handleToggle} className="mx-btn-secondary text-sm">{product.isActive?'Desactivar':'Activar'}</button>}
          {canEditMaster && (editing ? <>
            <button onClick={()=>setEditing(false)} className="mx-btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="mx-btn-primary"><Save size={14}/>{saving?'Guardando…':'Guardar'}</button>
          </> : <button onClick={()=>setEditing(true)} className="mx-btn-secondary">Editar</button>)}
        </div>
      </div>
      {error&&<div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}
      <div className="mx-card p-6">
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-xs text-[#86868B] mb-1">Código</p><p className="text-sm font-mono">{product.code}</p></div>
          <div><p className="text-xs text-[#86868B] mb-1">Tipo</p><p className="text-sm">{TYPE_LABEL[product.type]??product.type}</p></div>
          <div className="col-span-2"><p className="text-xs text-[#86868B] mb-1">Nombre</p>{editing&&canEditMaster?<input className="mx-input" value={form.name??''} onChange={set('name')}/>:<p className="text-sm font-medium">{product.name}</p>}</div>
          <div className="col-span-2"><p className="text-xs text-[#86868B] mb-1">Descripción</p>{editing&&canEditMaster?<textarea className="mx-input resize-none" rows={2} value={form.description??''} onChange={set('description')}/>:<p className="text-sm">{product.description||'—'}</p>}</div>
          <div><p className="text-xs text-[#86868B] mb-1">Precio unitario</p>{editing&&canEditMaster?<input type="number" className="mx-input" value={form.unitPrice??''} onChange={set('unitPrice')} min="0" step="0.01"/>:<p className="text-sm font-medium">{formatCurrency(product.unitPrice,product.currency)}</p>}</div>
          <div><p className="text-xs text-[#86868B] mb-1">IGV</p><p className="text-sm">{product.igvExempt?'Exonerado':'Gravado (18%)'}</p></div>
          <div><p className="text-xs text-[#86868B] mb-1">Cuenta ingresos</p>{editing&&canEditMaster?<input className="mx-input" value={form.accountCodeIncome??''} onChange={set('accountCodeIncome')} placeholder="70.1"/>:<p className="text-sm">{product.accountCodeIncome||'—'}</p>}</div>
          <div><p className="text-xs text-[#86868B] mb-1">Cuenta costo</p>{editing&&canEditMaster?<input className="mx-input" value={form.accountCodeCogs??''} onChange={set('accountCodeCogs')} placeholder="69.1"/>:<p className="text-sm">{product.accountCodeCogs||'—'}</p>}</div>
          <div><p className="text-xs text-[#86868B] mb-1">Estado</p><span className={product.isActive?'mx-badge mx-badge-success':'mx-badge mx-badge-neutral'}>{product.isActive?'Activo':'Inactivo'}</span></div>
        </div>
      </div>
    </div>
  );
}
