import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function errMsg(ex: any): string {
  return ex?.response?.data?.message ?? ex?.message ?? 'Error inesperado';
}

export function formatCurrency(amount: number | string, currency = 'PEN'): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency', currency,
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date;
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('es-PE', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}
