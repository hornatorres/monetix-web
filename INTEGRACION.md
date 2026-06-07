# Permisos Nivel 1 — Guía de integración

## Archivos entregados

| Archivo | Destino |
|---|---|
| `src/hooks/usePermissions.ts` | `src/hooks/usePermissions.ts` |
| `src/components/RoleBadge.tsx` | `src/components/RoleBadge.tsx` |
| `src/components/Sidebar.tsx` | Reemplaza `src/components/Sidebar.tsx` |

---

## Cómo usar usePermissions en cualquier página

```tsx
import { usePermissions } from '@/hooks/usePermissions';

export default function InvoicesPage() {
  const { canCreateInvoice, canAnnulInvoice } = usePermissions();

  return (
    <div>
      {/* Solo OPERATOR o superior ve el botón Nueva factura */}
      {canCreateInvoice && (
        <Link href="/invoices/new" className="mx-btn-primary">
          Nueva factura
        </Link>
      )}
    </div>
  );
}
```

---

## Integración rápida por módulo

### /invoices/[id] — botones de acción
```tsx
const { canIssueInvoice, canPayInvoice, canAnnulInvoice } = usePermissions();

{canIssueInvoice  && invoice.status === 'DRAFT'   && <button>Emitir</button>}
{canPayInvoice    && ['ISSUED','PARTIAL'].includes(invoice.status) && <button>Cobrar</button>}
{canAnnulInvoice  && ['ISSUED','PARTIAL'].includes(invoice.status) && <button>Anular</button>}
```

### /purchases/[id] — botones de acción
```tsx
const { canEditPurchase, canCancelPurchase, canDeletePurchase } = usePermissions();

{canEditPurchase   && purchase.status === 'CONFIRMED' && <Link href={`/purchases/${id}/edit`}>Editar</Link>}
{canCancelPurchase && ['CONFIRMED','PARTIAL'].includes(purchase.status) && <button>Cancelar</button>}
{canDeletePurchase && purchase.status === 'CANCELLED' && <button>Eliminar</button>}
```

### /quotes/[id] — botones de acción
```tsx
const { canSendQuote, canAcceptQuote, canRejectQuote, canConvertQuote, canDeleteQuote } = usePermissions();

{canSendQuote    && quote.status === 'DRAFT'    && <button>Enviar</button>}
{canAcceptQuote  && quote.status === 'SENT'     && <button>Aceptar</button>}
{canRejectQuote  && quote.status === 'SENT'     && <button>Rechazar</button>}
{canConvertQuote && quote.status === 'ACCEPTED' && <button>Convertir</button>}
{canDeleteQuote  && quote.status === 'DRAFT'    && <button>Eliminar</button>}
```

### /clients, /suppliers, /products — botones de lista y detalle
```tsx
const { canCreateMaster, canEditMaster, canDeleteMaster } = usePermissions();

{canCreateMaster && <Link href="/clients/new">Nuevo cliente</Link>}
{canEditMaster   && <button>Editar</button>}
{canDeleteMaster && <button>Archivar</button>}
```

### /accounting — postear asientos
```tsx
const { canPostEntry, canReverseEntry } = usePermissions();

{canPostEntry   && entry.status === 'DRAFT'  && <button>Postear</button>}
{canReverseEntry && entry.status === 'POSTED' && <button>Revertir</button>}
```

---

## Tabla de permisos por rol

| Acción | VIEWER | OPERATOR | SUPERVISOR | ACCOUNTANT | ADMIN |
|---|---|---|---|---|---|
| Ver cualquier módulo | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crear maestros | ❌ | ✅ | ✅ | ✅ | ✅ |
| Editar maestros | ❌ | ✅ | ✅ | ✅ | ✅ |
| Archivar maestros | ❌ | ❌ | ✅ | ✅ | ✅ |
| Crear/emitir facturas | ❌ | ✅ | ✅ | ✅ | ✅ |
| Anular facturas | ❌ | ❌ | ✅ | ✅ | ✅ |
| Editar compras | ❌ | ❌ | ✅ | ✅ | ✅ |
| Aceptar/rechazar cotizaciones | ❌ | ❌ | ✅ | ✅ | ✅ |
| Postear asientos contables | ❌ | ❌ | ❌ | ✅ | ✅ |
| Ver reportes | ❌ | ❌ | ✅ | ✅ | ✅ |
| Configuración | ❌ | ❌ | ❌ | ❌ | ✅ |
| Gestionar usuarios | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Nota importante

Este es el Nivel 1 — control visual en el frontend.
El backend YA valida los roles en cada endpoint con guards.
Si un VIEWER intenta llamar directamente a la API, recibirá 403.
El frontend solo mejora la experiencia ocultando lo que el usuario no puede hacer.
