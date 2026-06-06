'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/authClient';
import { formatCurrency, errMsg } from '@/lib/utils';
import { Plus, Search, AlertCircle } from 'lucide-react';

interface Product {
  id: string; code: string; name: string; description: string;
  type: string; unitPrice: number; currency: string; isActive: boolean;
}

const TYPE_BADGE: Record<string, string> = {
  ONE_TIME:     'mx-badge mx-badge-info',
  SUBSCRIPTION: 'mx-badge mx-badge-purple',
  METERED:      'mx-badge mx-badge-warning',
  ASSET:        'mx-badge mx-badge-neutral',
};

const TYPE_LABEL: Record<string, string> = {
  ONE_TIME: 'Único', SUBSCRIPTION: 'Suscripción',
  METERED: 'Medido', ASSET: 'Activo',
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [search,   setSearch]   = useState('');
  const [type,     setType]     = useState('');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const load = () => {
    setLoading(true);
    authClient.get('/products')
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
        setProducts(data); setFiltered(data);
      })
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(products.filter(p => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
      const matchType   = !type || p.type === type;
      return matchSearch && matchType;
    }));
  }, [search, type, products]);

  const handleToggle = async (id: string) => {
    try {
      await authClient.patch(`/products/${id}/toggle-active`);
      load();
    } catch (ex) { setError(errMsg(ex)); }
  };

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <h1 className="mx-page-title">Productos</h1>
        <Link href="/products/new" className="mx-btn-primary">
          <Plus size={15} /> Nuevo producto
        </Link>
      </div>

      <div className="mx-card p-3 mb-4 flex items-center gap-3">
        <Search size={15} className="text-[#86868B]" />
        <input
          className="flex-1 outline-none text-sm bg-transparent placeholder:text-[#86868B]"
          placeholder="Buscar por nombre o código…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select
          value={type} onChange={e => setType(e.target.value)}
          className="text-sm border-0 outline-none bg-transparent text-[#86868B] cursor-pointer"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {error && (
        <div className="mx-card p-4 flex items-center gap-2 text-[#FF3B30] mb-4">
          <AlertCircle size={16} /><span className="text-sm">{error}</span>
        </div>
      )}

      <div className="mx-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="mx-skeleton h-12 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#86868B]">
            {search || type ? 'Sin resultados' : 'No hay productos registrados'}
          </div>
        ) : (
          <table className="mx-table">
            <thead>
              <tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Precio</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td className="text-[#86868B] font-mono text-xs">{p.code}</td>
                  <td>
                    <Link href={`/products/${p.id}`} className="font-medium text-[#0071E3] hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td><span className={TYPE_BADGE[p.type] ?? 'mx-badge mx-badge-neutral'}>{TYPE_LABEL[p.type] ?? p.type}</span></td>
                  <td className="font-medium">{formatCurrency(p.unitPrice, p.currency)}</td>
                  <td>
                    <span className={p.isActive ? 'mx-badge mx-badge-success' : 'mx-badge mx-badge-neutral'}>
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggle(p.id)}
                      className="text-xs text-[#86868B] hover:text-[#1D1D1F]"
                    >
                      {p.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-[#86868B] mt-2 px-1">{filtered.length} producto(s)</p>
      )}
    </div>
  );
}
