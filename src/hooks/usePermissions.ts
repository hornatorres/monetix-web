import { useAuthStore } from '@/store/useAuthStore';

/**
 * usePermissions — Nivel 1
 * Lee el rol del usuario desde Zustand y expone
 * helpers booleanos para controlar la UI.
 *
 * Jerarquía: ADMIN > ACCOUNTANT > SUPERVISOR > OPERATOR > VIEWER
 */

export type Role = 'ADMIN' | 'ACCOUNTANT' | 'SUPERVISOR' | 'OPERATOR' | 'VIEWER';

const HIERARCHY: Record<Role, number> = {
  ADMIN:      5,
  ACCOUNTANT: 4,
  SUPERVISOR: 3,
  OPERATOR:   2,
  VIEWER:     1,
};

function hasRole(userRole: string, required: Role): boolean {
  return (HIERARCHY[userRole as Role] ?? 0) >= HIERARCHY[required];
}

export function usePermissions() {
  const role = useAuthStore(s => s.user?.role ?? 'VIEWER') as Role;

  return {
    role,

    // ── Niveles generales ──────────────────────────────────────
    isAdmin:      role === 'ADMIN',
    isAccountant: hasRole(role, 'ACCOUNTANT'),
    isSupervisor: hasRole(role, 'SUPERVISOR'),
    isOperator:   hasRole(role, 'OPERATOR'),
    isViewer:     true,  // todos pueden ver

    // ── Maestros (Clientes, Proveedores, Productos) ────────────
    canCreateMaster:   hasRole(role, 'OPERATOR'),
    canEditMaster:     hasRole(role, 'OPERATOR'),
    canDeleteMaster:   hasRole(role, 'SUPERVISOR'),  // soft delete

    // ── Facturas ───────────────────────────────────────────────
    canCreateInvoice:  hasRole(role, 'OPERATOR'),
    canIssueInvoice:   hasRole(role, 'OPERATOR'),
    canPayInvoice:     hasRole(role, 'OPERATOR'),
    canAnnulInvoice:   hasRole(role, 'SUPERVISOR'),  // anular requiere supervisor

    // ── Compras ────────────────────────────────────────────────
    canCreatePurchase: hasRole(role, 'OPERATOR'),
    canEditPurchase:   hasRole(role, 'SUPERVISOR'),
    canCancelPurchase: hasRole(role, 'SUPERVISOR'),
    canDeletePurchase: hasRole(role, 'ADMIN'),        // solo DRAFT canceladas

    // ── Cotizaciones ───────────────────────────────────────────
    canCreateQuote:    hasRole(role, 'OPERATOR'),
    canSendQuote:      hasRole(role, 'OPERATOR'),
    canAcceptQuote:    hasRole(role, 'SUPERVISOR'),
    canRejectQuote:    hasRole(role, 'SUPERVISOR'),
    canConvertQuote:   hasRole(role, 'SUPERVISOR'),
    canDeleteQuote:    hasRole(role, 'ADMIN'),

    // ── Contabilidad ───────────────────────────────────────────
    canPostEntry:      hasRole(role, 'ACCOUNTANT'),
    canReverseEntry:   hasRole(role, 'ACCOUNTANT'),
    canCreateManualEntry: hasRole(role, 'ACCOUNTANT'),

    // ── Activos fijos ──────────────────────────────────────────
    canCreateAsset:    hasRole(role, 'OPERATOR'),
    canEditAsset:      hasRole(role, 'SUPERVISOR'),
    canDisposeAsset:   hasRole(role, 'SUPERVISOR'),

    // ── Suscripciones ──────────────────────────────────────────
    canCreateSubscription: hasRole(role, 'OPERATOR'),
    canPauseSubscription:  hasRole(role, 'SUPERVISOR'),
    canCancelSubscription: hasRole(role, 'SUPERVISOR'),

    // ── Configuración ──────────────────────────────────────────
    canEditSettings:   hasRole(role, 'ADMIN'),
    canManageUsers:    hasRole(role, 'ADMIN'),

    // ── Reportes ───────────────────────────────────────────────
    canViewReports:    hasRole(role, 'SUPERVISOR'),
    canExportReports:  hasRole(role, 'SUPERVISOR'),

    // ── Auditoría ──────────────────────────────────────────────
    canViewAudit:      hasRole(role, 'ADMIN'),
  };
}
