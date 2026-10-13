// ===========================================================================
// AppRemi - Reportes agregados (todos los indicadores se calculan)
// ===========================================================================

import { calcular, r2 } from "./format";
import type { Dataset } from "./data";
import type { Gasto, Turno } from "./types";

export interface Resumen {
  recaudacion: number;
  viajes: number;
  km_libres: number;
  km_ocupados: number;
  km_totales: number;
  parte_chofer: number;
  monto_33: number;
  diezmo: number;
  duenio_neto: number;
  gasto_combustible: number;
  gasto_otros: number;
  gasto_total: number;
  duenio_utilidad: number;
  turnos: number;
}

const vacio = (): Resumen => ({
  recaudacion: 0,
  viajes: 0,
  km_libres: 0,
  km_ocupados: 0,
  km_totales: 0,
  parte_chofer: 0,
  monto_33: 0,
  diezmo: 0,
  duenio_neto: 0,
  gasto_combustible: 0,
  gasto_otros: 0,
  gasto_total: 0,
  duenio_utilidad: 0,
  turnos: 0,
});

export function gastosPorTurno(gastos: Gasto[]): Map<number, Gasto[]> {
  const map = new Map<number, Gasto[]>();
  for (const g of gastos) {
    const arr = map.get(g.turno_id) ?? [];
    arr.push(g);
    map.set(g.turno_id, arr);
  }
  return map;
}

export function indicadoresTurno(t: Turno, gastos: Gasto[]) {
  const ind = calcular(Number(t.recaudacion), gastos);
  return {
    ...ind,
    km_totales: r2(Number(t.km_libres) + Number(t.km_ocupados)),
  };
}

function acumular(acc: Resumen, t: Turno, gastos: Gasto[]) {
  const i = indicadoresTurno(t, gastos);
  acc.turnos += 1;
  acc.recaudacion = r2(acc.recaudacion + Number(t.recaudacion));
  acc.viajes += t.cantidad_viajes;
  acc.km_libres = r2(acc.km_libres + Number(t.km_libres));
  acc.km_ocupados = r2(acc.km_ocupados + Number(t.km_ocupados));
  acc.km_totales = r2(acc.km_totales + i.km_totales);
  acc.parte_chofer = r2(acc.parte_chofer + i.parte_chofer);
  acc.monto_33 = r2(acc.monto_33 + i.monto_33);
  acc.diezmo = r2(acc.diezmo + i.diezmo);
  acc.duenio_neto = r2(acc.duenio_neto + i.duenio_neto);
  acc.gasto_combustible = r2(acc.gasto_combustible + i.gasto_combustible);
  acc.gasto_otros = r2(acc.gasto_otros + i.gasto_otros);
  acc.gasto_total = r2(acc.gasto_total + i.gasto_total);
  acc.duenio_utilidad = r2(acc.duenio_utilidad + i.duenio_utilidad);
}

export function resumenTotal(ds: Dataset): Resumen {
  const gxT = gastosPorTurno(ds.gastos);
  const acc = vacio();
  for (const t of ds.turnos) acumular(acc, t, gxT.get(t.id) ?? []);
  return acc;
}

export function resumenPorDia(ds: Dataset): { clave: string; resumen: Resumen }[] {
  const gxT = gastosPorTurno(ds.gastos);
  const map = new Map<string, Resumen>();
  for (const t of ds.turnos) {
    const r = map.get(t.fecha) ?? vacio();
    acumular(r, t, gxT.get(t.id) ?? []);
    map.set(t.fecha, r);
  }
  return [...map.entries()]
    .map(([clave, resumen]) => ({ clave, resumen }))
    .sort((a, b) => b.clave.localeCompare(a.clave));
}

export function resumenPorMes(ds: Dataset): { clave: string; resumen: Resumen }[] {
  const gxT = gastosPorTurno(ds.gastos);
  const map = new Map<string, Resumen>();
  for (const t of ds.turnos) {
    const mes = t.fecha.slice(0, 7);
    const r = map.get(mes) ?? vacio();
    acumular(r, t, gxT.get(t.id) ?? []);
    map.set(mes, r);
  }
  return [...map.entries()]
    .map(([clave, resumen]) => ({ clave, resumen }))
    .sort((a, b) => b.clave.localeCompare(a.clave));
}

export function resumenPorTipoTurno(
  ds: Dataset
): { clave: string; resumen: Resumen }[] {
  const gxT = gastosPorTurno(ds.gastos);
  const map = new Map<string, Resumen>();
  for (const t of ds.turnos) {
    const r = map.get(t.tipo) ?? vacio();
    acumular(r, t, gxT.get(t.id) ?? []);
    map.set(t.tipo, r);
  }
  return [...map.entries()].map(([clave, resumen]) => ({ clave, resumen }));
}

export function resumenPorChofer(
  ds: Dataset,
  mes?: string
): { chofer_id: number; resumen: Resumen }[] {
  const gxT = gastosPorTurno(ds.gastos);
  const map = new Map<number, Resumen>();
  for (const t of ds.turnos) {
    if (mes && t.fecha.slice(0, 7) !== mes) continue;
    const r = map.get(t.chofer_id) ?? vacio();
    acumular(r, t, gxT.get(t.id) ?? []);
    map.set(t.chofer_id, r);
  }
  return [...map.entries()].map(([chofer_id, resumen]) => ({
    chofer_id,
    resumen,
  }));
}

export function nombreChofer(ds: Dataset, id: number): string {
  const c = ds.choferes.find((x) => x.id === id);
  if (!c) return "—";
  return `${c.nombre}${c.apellido ? " " + c.apellido : ""}`;
}

export function vehiculoChofer(ds: Dataset, choferId: number) {
  return ds.vehiculos.find((v) => v.chofer_id === choferId) ?? null;
}
