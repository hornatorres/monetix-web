'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { formatDate, errMsg } from '@/lib/utils';
import { Plus, Search, AlertCircle } from 'lucide-react';

interface Supplier {
  id: string; name: string; taxId: string; currency: string;
  paymentTermsDays: number; contactName: string; contactEmail: string;
  contactPhone: string; isActive: boolean; createdAt: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filtered,  setFiltered]  = useState<Supplier[]>([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    authClient.get('/suppliers?limit=100')
      .then(r => {
        const data = r.data?.data ?? r.data ?? [];
        setSuppliers(data); setFiltered(data);
      })
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.taxId.includes(q) ||
      s.contactEmail?.toLowerCase().includes(q)
    ));
  }, [search, suppliers]);

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <h1 className="mx-page-title">Proveedores</h1>
        <Link href="/suppliers/new" className="mx-btn-primary">
          <Plus size={15} /> Nuevo proveedor
        </Link>
      </div>

      <div className="mx-card p-3 mb-4 flex items-center gap-2">
        <Search size={15} className="text-[#86868B]" />
        <input
          className="flex-1 outline-none text-sm bg-transparent placeholder:text-[#86868B]"
          placeholder="Buscar por nombre, RUC o email…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="mx-card p-4 flex items-center gap-2 text-[#FF3B30] mb-4">
          <AlertCircle size={16} /><span className="text-sm">{error}</span>
        </div>
      )}

      <div className="mx-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1,2,3].map(i => <div key={i} className="mx-skeleton h-12 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#86868B]">
            {search ? 'Sin resultados' : 'No hay proveedores registrados'}
          </div>
        ) : (
          <table className="mx-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RUC</th>
                <th>Contacto</th>
                <th>Email</th>
                <th>Plazo pago</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/suppliers/${s.id}`} className="font-medium text-[#0071E3] hover:underline">
                      {s.name}
                    </Link>
                  </td>
                  <td className="text-[#86868B]">{s.taxId}</td>
                  <td className="text-sm">{s.contactName || '—'}</td>
                  <td className="text-[#86868B]">{s.contactEmail || '—'}</td>
                  <td className="text-[#86868B]">{s.paymentTermsDays}d</td>
                  <td>
                    <span className={s.isActive ? 'mx-badge mx-badge-success' : 'mx-badge mx-badge-neutral'}>
                      {s.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-[#86868B] mt-2 px-1">{filtered.length} proveedor(es)</p>
      )}
    </div>
  );
}
