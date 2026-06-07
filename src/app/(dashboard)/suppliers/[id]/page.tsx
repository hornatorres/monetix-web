'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { usePermissions } from '@/hooks/usePermissions';
import { errMsg } from '@/lib/utils';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

interface Supplier {
  id: string; name: string; taxId: string; currency: string;
  paymentTermsDays: number; contactName: string; contactEmail: string;
  contactPhone: string; isActive: boolean;
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { canEditMaster, canDeleteMaster } = usePermissions();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [editing,  setEditing]  = useState(false);
  const [form,     setForm]     = useState<Partial<Supplier>>({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    authClient.get(`/suppliers/${id}`)
      .then(r => { setSupplier(r.data); setForm(r.data); })
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const r = await authClient.put(`/suppliers/${id}`, { name: form.name, taxId: form.taxId, currency: form.currency, paymentTermsDays: Number(form.paymentTermsDays), contactName: form.contactName, contactEmail: form.contactEmail, contactPhone: form.contactPhone });
      setSupplier(r.data); setEditing(false);
    } catch (ex) { setError(errMsg(ex)); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async () => {
    try { const r = await authClient.patch(`/suppliers/${id}/toggle-active`); setSupplier(r.data); }
    catch (ex) { setError(errMsg(ex)); }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este proveedor?')) return;
    try { await authClient.delete(`/suppliers/${id}`); router.push('/suppliers'); }
    catch (ex) { setError(errMsg(ex)); }
  };

  if (loading) return <div className="mx-skeleton h-64 rounded-2xl max-w-2xl" />;
  if (!supplier) return <div className="mx-card p-6 flex items-center gap-2 text-[#FF3B30]"><AlertCircle size={16}/><span className="text-sm">{error||'Proveedor no encontrado'}</span></div>;

  return (
    <div className="mx-fade-in max-w-2xl">
      <div className="mx-page-header">
        <div className="flex items-center gap-3">
          <Link href="/suppliers" className="mx-btn-secondary px-3 py-2"><ArrowLeft size={15}/></Link>
          <div><h1 className="mx-page-title">{supplier.name}</h1><p className="text-xs text-[#86868B]">{supplier.taxId}</p></div>
        </div>
        <div className="flex gap-2">
          {canEditMaster && <button onClick={handleToggleActive} className="mx-btn-secondary text-sm">{supplier.isActive?'Desactivar':'Activar'}</button>}
          {canEditMaster && !editing && <button onClick={()=>setEditing(true)} className="mx-btn-secondary">Editar</button>}
          {editing && <>
            <button onClick={()=>setEditing(false)} className="mx-btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="mx-btn-primary"><Save size={14}/>{saving?'Guardando…':'Guardar'}</button>
          </>}
          {canDeleteMaster && !editing && <button onClick={handleDelete} className="mx-btn-danger text-sm">Eliminar</button>}
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}

      <div className="mx-card p-6">
        <div className="grid grid-cols-2 gap-4">
          {[{label:'Razón social',field:'name'},{label:'RUC',field:'taxId'},{label:'Contacto',field:'contactName'},{label:'Email',field:'contactEmail'},{label:'Teléfono',field:'contactPhone'},{label:'Plazo de pago (días)',field:'paymentTermsDays'}].map(({label,field})=>(
            <div key={field}>
              <label className="block text-xs text-[#86868B] mb-1">{label}</label>
              {editing && canEditMaster ? <input className="mx-input" value={(form as any)[field]??''} onChange={set(field)}/> : <p className="text-sm text-[#1D1D1F]">{(supplier as any)[field]||'—'}</p>}
            </div>
          ))}
          <div><label className="block text-xs text-[#86868B] mb-1">Estado</label><span className={supplier.isActive?'mx-badge mx-badge-success':'mx-badge mx-badge-neutral'}>{supplier.isActive?'Activo':'Inactivo'}</span></div>
        </div>
      </div>
    </div>
  );
}
