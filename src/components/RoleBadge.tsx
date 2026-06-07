'use client';

import { useAuthStore } from '@/store/useAuthStore';

const ROLE_STYLES: Record<string, string> = {
  ADMIN:      'bg-[#FCEBEB] text-[#791F1F]',
  ACCOUNTANT: 'bg-[#F3E8FF] text-[#5B21B6]',
  SUPERVISOR: 'bg-[#E3F2FD] text-[#0C447C]',
  OPERATOR:   'bg-[#EAF3DE] text-[#27500A]',
  VIEWER:     'bg-[#F2F2F7] text-[#3A3A3C]',
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN:      'Administrador',
  ACCOUNTANT: 'Contador',
  SUPERVISOR: 'Supervisor',
  OPERATOR:   'Operador',
  VIEWER:     'Visor',
};

/**
 * RoleBadge — muestra el rol del usuario actual en el sidebar o header.
 * Uso: <RoleBadge />
 */
export function RoleBadge() {
  const user = useAuthStore(s => s.user);
  if (!user) return null;

  const style = ROLE_STYLES[user.role] ?? ROLE_STYLES.VIEWER;
  const label = ROLE_LABEL[user.role]  ?? user.role;

  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ${style}`}>
      {label}
    </span>
  );
}
