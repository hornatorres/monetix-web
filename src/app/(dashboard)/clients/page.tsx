'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { formatDate, errMsg } from '@/lib/utils';
import { Plus, Search, AlertCircle } from 'lucide-react';

interface Client {
  id:        string;
  name:      string;
  taxId:     string;
  email:     string;
  phone:     string;
  address:   string;
  status:    string;
  notes:     string;
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:   'mx-badge mx-badge-success',
  INACTIVE: 'mx-badge mx-badge-neutral',
  BLOCKED:  'mx-badge mx-badge-danger',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filtered, setFiltered] = useState<Client[]>([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    authClient.get('/clients')
      .then(r => { setClients(r.data); setFiltered(r.data); })
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.taxId.includes(q) ||
      c.email.toLowerCase().includes(q)
    ));
  }, [search, clients]);

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <h1 className="mx-page-title">Clientes</h1>
        <Link href="/clients/new" className="mx-btn-primary">
          <Plus size={15} /> Nuevo cliente
        </Link>
      </div>

      {/* Búsqueda */}
      <div className="mx-card p-3 mb-4 flex items-center gap-2">
        <Search size={15} className="text-[#86868B]" />
        <input
          className="flex-1 outline-none text-sm bg-transparent placeholder:text-[#86868B]"
          placeholder="Buscar por nombre, RUC o email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-card p-4 flex items-center gap-2 text-[#FF3B30] mb-4">
          <AlertCircle size={16} /> <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Tabla */}
      <div className="mx-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="mx-skeleton h-12 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#86868B]">
            {search ? 'Sin resultados para tu búsqueda' : 'No hay clientes registrados'}
          </div>
        ) : (
          <table className="mx-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RUC / DNI</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Creado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/clients/${c.id}`} className="font-medium text-[#0071E3] hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="text-[#86868B]">{c.taxId}</td>
                  <td className="text-[#86868B]">{c.email}</td>
                  <td className="text-[#86868B]">{c.phone}</td>
                  <td><span className={STATUS_BADGE[c.status] ?? 'mx-badge mx-badge-neutral'}>{c.status}</span></td>
                  <td className="text-[#86868B]">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-[#86868B] mt-2 px-1">{filtered.length} cliente(s)</p>
      )}
    </div>
  );
}
