// ===========================================================================
// AppRemi - Periodos (dia / semana / mes / anio) para metricas
// Fechas en formato ISO YYYY-MM-DD, sin dependencias externas.
// ===========================================================================

export type Periodo = "dia" | "semana" | "mes" | "anio";

export const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "dia", label: "Día" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "anio", label: "Año" },
];

export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Lunes de la semana que contiene `d`. */
function lunes(d: Date): Date {
  const dow = (d.getDay() + 6) % 7; // 0 = lunes
  return addDays(d, -dow);
}

export interface Rango {
  desde: string;
  hasta: string;
}

/** Rango (desde/hasta) del período que contiene `refISO`. */
export function rangoDePeriodo(periodo: Periodo, refISO: string): Rango {
  const ref = parseISO(refISO);
  switch (periodo) {
    case "dia":
      return { desde: toISO(ref), hasta: toISO(ref) };
    case "semana": {
      const l = lunes(ref);
      return { desde: toISO(l), hasta: toISO(addDays(l, 6)) };
    }
    case "mes": {
      const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const last = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
      return { desde: toISO(first), hasta: toISO(last) };
    }
    case "anio":
      return {
        desde: toISO(new Date(ref.getFullYear(), 0, 1)),
        hasta: toISO(new Date(ref.getFullYear(), 11, 31)),
      };
  }
}

export function periodoLabel(periodo: Periodo, refISO: string): string {
  const ref = parseISO(refISO);
  switch (periodo) {
    case "dia":
      return ref.toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    case "semana": {
      const l = lunes(ref);
      const s = addDays(l, 6);
      const fmt = (d: Date) =>
        d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
      return `Semana ${fmt(l)} – ${fmt(s)}`;
    }
    case "mes": {
      const txt = ref.toLocaleDateString("es-AR", {
        month: "long",
        year: "numeric",
      });
      return txt.charAt(0).toUpperCase() + txt.slice(1);
    }
    case "anio":
      return String(ref.getFullYear());
  }
}

export interface Bucket {
  clave: string;
  desde: string;
  hasta: string;
  label: string;
}

/** Últimos `n` buckets del período, terminando en el que contiene `refISO`. */
export function seriePeriodos(
  periodo: Periodo,
  refISO: string,
  n = 12
): Bucket[] {
  const ref = parseISO(refISO);
  const out: Bucket[] = [];

  for (let i = n - 1; i >= 0; i--) {
    switch (periodo) {
      case "dia": {
        const d = addDays(ref, -i);
        out.push({ clave: toISO(d), desde: toISO(d), hasta: toISO(d), label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}` });
        break;
      }
      case "semana": {
        const l = addDays(lunes(ref), -i * 7);
        const h = addDays(l, 6);
        out.push({ clave: toISO(l), desde: toISO(l), hasta: toISO(h), label: `${String(l.getDate()).padStart(2, "0")}/${String(l.getMonth() + 1).padStart(2, "0")}` });
        break;
      }
      case "mes": {
        const first = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
        const last = new Date(ref.getFullYear(), ref.getMonth() - i + 1, 0);
        const label = first.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
        out.push({ clave: toISO(first).slice(0, 7), desde: toISO(first), hasta: toISO(last), label });
        break;
      }
      case "anio": {
        const y = ref.getFullYear() - i;
        out.push({ clave: String(y), desde: `${y}-01-01`, hasta: `${y}-12-31`, label: String(y) });
        break;
      }
    }
  }

  return out;
}

/** Etiqueta legible de un bucket (para tablas). */
export function labelBucket(periodo: Periodo, clave: string): string {
  switch (periodo) {
    case "dia":
      return clave.split("-").reverse().join("/");
    case "semana": {
      const d = parseISO(clave);
      const h = addDays(d, 6);
      return `${d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })} – ${h.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}`;
    }
    case "mes": {
      const [y, m] = clave.split("-").map(Number);
      const txt = new Date(y, m - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
      return txt.charAt(0).toUpperCase() + txt.slice(1);
    }
    case "anio":
      return clave;
  }
}
