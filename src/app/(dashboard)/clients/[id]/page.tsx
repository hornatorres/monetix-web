'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { formatDate, formatCurrency, errMsg } from '@/lib/utils';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

interface Client {
  id: string; name: string; taxId: string; email: string;
  phone: string; address: string; status: string; notes: string; createdAt: string;
}

interface Invoice {
  id: string; invoiceNumber: string; invoiceDate: string;
  totalAmount: number; status: string;
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT:    'mx-badge mx-badge-neutral',
  ISSUED:   'mx-badge mx-badge-info',
  PARTIAL:  'mx-badge mx-badge-warning',
  PAID:     'mx-badge mx-badge-success',
  OVERDUE:  'mx-badge mx-badge-danger',
  VOID:     'mx-badge mx-badge-neutral',
  CANCELLED:'mx-badge mx-badge-neutral',
};

export default function ClientDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [client,   setClient]   = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [editing,  setEditing]  = useState(false);
  const [form,     setForm]     = useState<Partial<Client>>({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    Promise.all([
      authClient.get(`/clients/${id}`),
      authClient.get(`/invoices?clientId=${id}`).catch(() => ({ data: [] })),
    ]).then(([c, inv]) => {
      setClient(c.data);
      setForm(c.data);
      setInvoices(Array.isArray(inv.data) ? inv.data : inv.data?.items ?? []);
    }).catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name, taxId: form.taxId, email: form.email,
        phone: form.phone, address: form.address, notes: form.notes,
      };
      const r = await authClient.put(`/clients/${id}`, body);
      setClient(r.data);
      setEditing(false);
    } catch (ex) {
      setError(errMsg(ex));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="space-y-4">
      <div className="mx-skeleton h-10 w-48 rounded-xl" />
      <div className="mx-skeleton h-64 rounded-2xl" />
    </div>
  );

  if (error && !client) return (
    <div className="mx-card p-6 flex items-center gap-2 text-[#FF3B30]">
      <AlertCircle size={16} /> <span className="text-sm">{error}</span>
    </div>
  );

  return (
    <div className="mx-fade-in max-w-3xl">
      <div className="mx-page-header">
        <div className="flex items-center gap-3">
          <Link href="/clients" className="mx-btn-secondary px-3 py-2">
            <ArrowLeft size={15} />
          </Link>
          <h1 className="mx-page-title">{client?.name}</h1>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="mx-btn-secondary">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="mx-btn-primary">
                <Save size={14} /> {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="mx-btn-secondary">Editar</button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>
      )}

      {/* Datos del cliente */}
      <div className="mx-card p-6 mb-4">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Nombre / Razón social', field: 'name' },
            { label: 'RUC / DNI',             field: 'taxId' },
            { label: 'Email',                  field: 'email' },
            { label: 'Teléfono',               field: 'phone' },
            { label: 'Dirección',              field: 'address' },
          ].map(({ label, field }) => (
            <div key={field} className={field === 'address' ? 'col-span-2' : ''}>
              <label className="block text-xs text-[#86868B] mb-1">{label}</label>
              {editing ? (
                <input
                  className="mx-input"
                  value={(form as any)[field] ?? ''}
                  onChange={set(field)}
                />
              ) : (
                <p className="text-sm text-[#1D1D1F]">{(client as any)[field] || '—'}</p>
              )}
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-xs text-[#86868B] mb-1">Notas</label>
            {editing ? (
              <textarea className="mx-input resize-none" rows={2} value={form.notes ?? ''} onChange={set('notes')} />
            ) : (
              <p className="text-sm text-[#1D1D1F]">{client?.notes || '—'}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-[#86868B] mb-1">Estado</label>
            <p className="text-sm text-[#1D1D1F]">{client?.status}</p>
          </div>
          <div>
            <label className="block text-xs text-[#86868B] mb-1">Cliente desde</label>
            <p className="text-sm text-[#1D1D1F]">{client ? formatDate(client.createdAt) : '—'}</p>
          </div>
        </div>
      </div>

      {/* Facturas del cliente */}
      <div className="mx-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E5EA] flex items-center justify-between">
          <h3 className="text-sm font-medium text-[#1D1D1F]">Facturas</h3>
          <Link href={`/invoices/new?clientId=${id}`} className="mx-btn-primary text-xs px-3 py-1.5">
            + Nueva factura
          </Link>
        </div>
        {invoices.length === 0 ? (
          <div className="p-6 text-center text-sm text-[#86868B]">Sin facturas registradas</div>
        ) : (
          <table className="mx-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td>
                    <Link href={`/invoices/${inv.id}`} className="text-[#0071E3] hover:underline font-medium">
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="text-[#86868B]">{formatDate(inv.invoiceDate)}</td>
                  <td className="font-medium">{formatCurrency(inv.totalAmount)}</td>
                  <td><span className={STATUS_BADGE[inv.status] ?? 'mx-badge mx-badge-neutral'}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
