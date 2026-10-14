// ===========================================================================
// AppRemi - Utilidades de fecha (ISO YYYY-MM-DD)
// ===========================================================================

export function hoyISO(base: Date = new Date()): string {
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  const d = String(base.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const RE_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Valida que sea una fecha ISO real (YYYY-MM-DD, sin desbordes tipo 2026-02-31). */
export function esFechaISO(v: string): boolean {
  if (!RE_ISO.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
  );
}

/** True si `iso` es posterior a `hoy` (comparación lexicográfica de ISO). */
export function fechaEsFutura(iso: string, hoy: string = hoyISO()): boolean {
  return iso > hoy;
}
