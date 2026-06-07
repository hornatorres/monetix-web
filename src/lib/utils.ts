export function formatCurrency(value: number | string, currency = 'PEN'): string {
  const n = Number(value);
  if (isNaN(n)) return 'S/ 0.00';
  const symbol = currency === 'USD' ? '$ ' : 'S/ ';
  return symbol + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return '—'; }
}

export function errMsg(ex: any): string {
  return ex?.response?.data?.message ?? ex?.message ?? 'Error inesperado';
}

export function fmtAbbr(value: number): string {
  if (value >= 1_000_000) return `S/${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `S/${Math.round(value / 1_000)}K`;
  return `S/${Math.round(value)}`;
}
