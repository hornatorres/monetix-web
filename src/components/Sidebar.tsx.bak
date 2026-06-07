'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileText, Users, ShoppingCart,
  Truck, Package, RefreshCw, Building2, ClipboardList,
  BookOpen, Receipt, Landmark, Settings, LogOut, BarChart2,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { usePermissions } from '@/hooks/usePermissions';
import { RoleBadge } from '@/components/RoleBadge';

const NAV = [
  { href: '/dashboard',     label: 'Inicio',         icon: LayoutDashboard, permission: null },
  { href: '/invoices',      label: 'Facturación',     icon: FileText,        permission: null },
  { href: '/quotes',        label: 'Cotizaciones',    icon: ClipboardList,   permission: null },
  { href: '/clients',       label: 'Clientes',        icon: Users,           permission: null },
  { href: '/purchases',     label: 'Compras',         icon: ShoppingCart,    permission: null },
  { href: '/suppliers',     label: 'Proveedores',     icon: Truck,           permission: null },
  { href: '/products',      label: 'Productos',       icon: Package,         permission: null },
  { href: '/subscriptions', label: 'Suscripciones',   icon: RefreshCw,       permission: null },
  { href: '/assets',        label: 'Activos fijos',   icon: Building2,       permission: null },
  { href: '/accounting',    label: 'Contabilidad',    icon: BookOpen,        permission: null },
  { href: '/taxes',         label: 'Impuestos',       icon: Receipt,         permission: null },
  { href: '/collections',   label: 'Tesorería',       icon: Landmark,        permission: null },
  { href: '/reports',       label: 'Reportes',        icon: BarChart2,       permission: 'canViewReports' },
  { href: '/settings',      label: 'Configuración',   icon: Settings,        permission: 'canEditSettings' },
];

export function Sidebar() {
  const pathname    = usePathname();
  const router      = useRouter();
  const { user, clearAuth } = useAuthStore();
  const permissions = usePermissions();

  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  // Filtrar rutas según permisos
  const visibleNav = NAV.filter(item => {
    if (!item.permission) return true;
    return (permissions as any)[item.permission] === true;
  });

  return (
    <aside className="mx-sidebar">
      {/* Logo + usuario */}
      <div className="px-3 mb-6">
        <span className="text-lg font-semibold text-[#1D1D1F]">Monetix</span>
        {user && (
          <div className="mt-1.5 space-y-1">
            <p className="text-xs text-[#86868B] truncate">{user.email}</p>
            <RoleBadge />
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {visibleNav.map(({ href, label, icon: Icon }) => {
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
