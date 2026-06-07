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

const ROLE_LABEL: Record<string, string> = {
  ADMIN:      'Administrador',
  ACCOUNTANT: 'Contador',
  SUPERVISOR: 'Supervisor',
  OPERATOR:   'Operador',
  VIEWER:     'Visor',
};

const ROLE_COLOR: Record<string, string> = {
  ADMIN:      '#FF3B30',
  ACCOUNTANT: '#9B59B6',
  SUPERVISOR: '#0071E3',
  OPERATOR:   '#34C759',
  VIEWER:     '#86868B',
};

export function Sidebar() {
  const pathname    = usePathname();
  const router      = useRouter();
  const { user, clearAuth } = useAuthStore();
  const permissions = usePermissions();

  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  const visibleNav = NAV.filter(item => {
    if (!item.permission) return true;
    return (permissions as any)[item.permission] === true;
  });

  const initials = user
    ? (user.firstName?.[0] ?? user.email[0]).toUpperCase()
    : '?';

  return (
    <aside style={{
      width: 230,
      minHeight: '100vh',
      background: '#FFFFFF',
      borderRight: '0.5px solid #E5E5EA',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 10px 16px',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 40,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 10px 16px', borderBottom: '0.5px solid #F2F2F7' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.3px' }}>
          Monetix
        </div>
        {user && (
          <div style={{ marginTop: 4 }}>
            <p style={{ fontSize: 12, color: '#86868B' }}>{user.email}</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: ROLE_COLOR[user.role] ?? '#86868B', marginTop: 2 }}>
              {ROLE_LABEL[user.role] ?? user.role}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: 12 }}>
        {/* Label de sección */}
        <div style={{
          fontSize: 10, fontWeight: 600, color: '#AEAEB2',
          letterSpacing: '0.8px', textTransform: 'uppercase',
          padding: '0 10px', marginBottom: 6,
        }}>
          NAVEGACIÓN
        </div>

        {visibleNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none', display: 'block', marginBottom: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 9,
                background: active ? '#F2F2F7' : 'transparent',
                transition: 'background 0.12s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F9F9F9'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <Icon
                    size={15}
                    style={{ color: active ? '#0071E3' : '#86868B', flexShrink: 0 }}
                  />
                  <span style={{
                    fontSize: 13,
                    fontWeight: active ? 500 : 400,
                    color: active ? '#1D1D1F' : '#3A3A3C',
                  }}>
                    {label}
                  </span>
                </div>
                {/* Punto activo */}
                {active && (
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#0071E3', flexShrink: 0,
                  }} />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer — Avatar + Cerrar sesión */}
      <div style={{ borderTop: '0.5px solid #F2F2F7', paddingTop: 12, marginTop: 8 }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '8px 10px', borderRadius: 9,
            background: 'transparent', border: 'none', cursor: 'pointer',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FFF0EF'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          {/* Avatar circular */}
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#1D1D1F', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, flexShrink: 0,
            position: 'relative',
          }}>
            {initials}
            {/* Punto de notificación */}
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 8, height: 8, borderRadius: '50%',
              background: '#34C759', border: '1.5px solid #fff',
            }} />
          </div>
          <span style={{ fontSize: 13, color: '#FF3B30', fontWeight: 500 }}>
            Cerrar sesión
          </span>
          <LogOut size={14} style={{ color: '#FF3B30', marginLeft: 'auto' }} />
        </button>
      </div>
    </aside>
  );
}
