// ===========================================================================
// AppRemi - Formato y calculos de negocio
// Regla: % chofer configurable por chofer (default 67%), resto dueño,
//        diezmo 10% de la parte del duenio,
//        gastos se descuentan de la parte del duenio.
// ===========================================================================

import type { Gasto } from "./types";

export const PCT_DUENIO = 0.33;
export const PCT_CHOFER = 0.67;
export const PCT_DIEZMO = 0.1;

export const catLabels: Record<Gasto["categoria"], string> = {
  combustible: "Combustible",
  gomeria: "Gomería - Repuestos",
  peajes: "Peajes",
  lavadero: "Lavadero",
  mecanica: "Mecánica",
  pinchadura: "Pinchadura",
  otros: "Otros",
};

export const catIcon: Record<Gasto["categoria"], string> = {
  combustible: "local_gas_station",
  gomeria: "construction",
  peajes: "toll",
  lavadero: "local_car_wash",
  mecanica: "car_repair",
  pinchadura: "tire_repair",
  otros: "more_horiz",
};

export const turnoLabel: Record<string, string> = {
  manana: "Turno Mañana",
  tarde: "Turno Tarde",
  noche: "Turno Noche",
  dia: "Turno Día",
};

export function money(n: number, decimals = 0): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n || 0);
}

export function num(n: number, decimals = 0): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n || 0);
}

export function fecha(d: string): string {
  // d = YYYY-MM-DD
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function mesLabel(d: string): string {
  const [y, m] = d.split("-").map(Number);
  const txt = new Date(y, (m || 1) - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export function r2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Calcula los indicadores de un turno a partir de la recaudacion y sus gastos. */
export function calcular(
  recaudacion: number,
  gastos: Pick<Gasto, "categoria" | "monto">[] = [],
  pct_chofer: number = PCT_CHOFER
) {
  const pct = pct_chofer > 0 && pct_chofer < 1 ? pct_chofer : PCT_CHOFER;
  const parte_chofer = r2(recaudacion * pct);
  const monto_33 = r2(recaudacion * (1 - pct));
  const diezmo = r2(monto_33 * PCT_DIEZMO);
  const duenio_neto = r2(monto_33 - diezmo);

  let gasto_combustible = 0;
  let gasto_gomeria = 0;
  let gasto_otros = 0;
  for (const g of gastos) {
    if (g.categoria === "combustible") gasto_combustible += Number(g.monto);
    else if (g.categoria === "gomeria") gasto_gomeria += Number(g.monto);
    else gasto_otros += Number(g.monto);
  }
  gasto_combustible = r2(gasto_combustible);
  gasto_gomeria = r2(gasto_gomeria);
  gasto_otros = r2(gasto_otros);
  const gasto_total = r2(gasto_combustible + gasto_gomeria + gasto_otros);
  const duenio_utilidad = r2(duenio_neto - gasto_total);

  return {
    parte_chofer,
    monto_33,
    diezmo,
    duenio_neto,
    gasto_combustible,
    gasto_gomeria,
    gasto_otros,
    gasto_total,
    duenio_utilidad,
  };
}

export function iniciales(nombre: string, apellido?: string | null): string {
  const a = nombre?.trim()?.[0] ?? "";
  const b = apellido?.trim()?.[0] ?? "";
  return (a + b).toUpperCase() || "??";
}
