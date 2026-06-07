'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileText, Users, ShoppingCart,
  Truck, Package, RefreshCw, Building2,
  BookOpen, Receipt, Landmark, Settings, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const NAV = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/invoices', label: 'Facturación', icon: FileText },
  { href: '/clients', label: 'Clientes', icon: Users },
  { href: '/purchases', label: 'Compras', icon: ShoppingCart },
  { href: '/suppliers', label: 'Proveedores', icon: Truck },
  { href: '/products', label: 'Productos', icon: Package },
  { href: '/subscriptions', label: 'Suscripciones', icon: RefreshCw },
  { href: '/assets', label: 'Activos fijos', icon: Building2 },
  { href: '/accounting', label: 'Contabilidad', icon: BookOpen },
  { href: '/taxes', label: 'Impuestos', icon: Receipt },
  { href: '/collections', label: 'Tesorería', icon: Landmark },
  { href: '/reports', label: 'Reportes', icon: BarChart2 },
  { href: '/settings', label: 'Configuración', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  return (
    <aside className="mx-sidebar">
      {/* Logo */}
      <div className="px-3 mb-6">
        <span className="text-lg font-semibold text-[#1D1D1F]">Monetix</span>
        {user && (
          <p className="text-xs text-[#86868B] mt-0.5 truncate">{user.email}</p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`mx-sidebar-item ${active ? 'active' : ''}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="mx-sidebar-item w-full mt-4 text-[#FF3B30]"
      >
        <LogOut size={16} />
        Cerrar sesión
      </button>
    </aside>
  );
}
