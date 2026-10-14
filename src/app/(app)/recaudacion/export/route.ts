import { connection } from "next/server";
import { getDataset } from "@/lib/data";
import { getSesion } from "@/lib/perfil";
import {
  fechaReferencia,
  gastosPorTurno,
  indicadoresTurno,
  nombreChofer,
  pctChofer,
  resumenRango,
  type Resumen,
} from "@/lib/reportes";
import {
  labelBucket,
  seriePeriodos,
  type Periodo,
} from "@/lib/periodos";
import { CSV_BOM, toCSV } from "@/lib/csv";

const PERIODOS_VALIDOS: Periodo[] = ["dia", "semana", "mes", "anio"];

function nBuckets(p: Periodo): number {
  if (p === "dia") return 14;
  if (p === "anio") return 6;
  return 12;
}

function filaPeriodo(label: string, r: Resumen): (string | number)[] {
  return [
    label,
    r.turnos,
    r.viajes,
    r.km_totales,
    r.recaudacion,
    r.efectivo,
    r.transferencia,
    r.bonos,
    r.cobro_total,
    r.parte_chofer,
    r.monto_33,
    r.diezmo,
    r.gasto_combustible,
    r.gasto_gomeria,
    r.gasto_otros,
    r.gasto_total,
    r.duenio_utilidad,
  ];
}

const ENCABEZADO_PERIODO = [
  "Período",
  "Turnos",
  "Viajes",
  "Km totales",
  "Recaudación",
  "Efectivo",
  "Transferencia",
  "Bonos",
  "Cobro total",
  "Remuneración chofer",
  "Comisión dueño",
  "Diezmo",
  "Combustible",
  "Gomería",
  "Otros gastos",
  "Gastos totales",
  "Utilidad dueño",
];

const ENCABEZADO_TURNO = [
  "Fecha",
  "Turno",
  "Chofer",
  "Recaudación",
  "Efectivo",
  "Transferencia",
  "Bonos",
  "Cobro total",
  "Remuneración chofer",
  "Comisión dueño",
  "Diezmo",
  "Combustible",
  "Gomería",
  "Otros gastos",
  "Gastos totales",
  "Utilidad dueño",
  "Km totales",
  "Viajes",
];

export async function GET(req: Request) {
  await connection();

  const sesion = await getSesion();
  if (!sesion.demo && (!sesion.autenticado || sesion.rol !== "duenio")) {
    return new Response("No autorizado", { status: 403 });
  }

  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo") === "turnos" ? "turnos" : "periodos";
  const pParam = url.searchParams.get("p") as Periodo | null;
  const periodo: Periodo =
    pParam && PERIODOS_VALIDOS.includes(pParam) ? pParam : "mes";

  const ds = await getDataset();
  const ref = fechaReferencia(ds);

  const filas: (string | number)[][] = [];
  let nombre = "";

  if (tipo === "turnos") {
    const gxT = gastosPorTurno(ds.gastos);
    const turnos = [...ds.turnos].sort((a, b) =>
      a.fecha === b.fecha ? a.id - b.id : a.fecha.localeCompare(b.fecha)
    );
    filas.push(ENCABEZADO_TURNO);
    for (const t of turnos) {
      const i = indicadoresTurno(t, gxT.get(t.id) ?? [], pctChofer(ds, t.chofer_id));
      filas.push([
        t.fecha,
        t.tipo,
        nombreChofer(ds, t.chofer_id),
        Number(t.recaudacion),
        Number(t.efectivo ?? 0),
        Number(t.transferencia ?? 0),
        Number(t.bonos ?? 0),
        i.cobro_total,
        i.parte_chofer,
        i.monto_33,
        i.diezmo,
        i.gasto_combustible,
        i.gasto_gomeria,
        i.gasto_otros,
        i.gasto_total,
        i.duenio_utilidad,
        i.km_totales,
        t.cantidad_viajes,
      ]);
    }
    nombre = `remi-turnos-${ref}.csv`;
  } else {
    const buckets = seriePeriodos(periodo, ref, nBuckets(periodo));
    filas.push(ENCABEZADO_PERIODO);
    const total: Resumen = buckets.reduce(
      (acc, b) => {
        const r = resumenRango(ds, b.desde, b.hasta);
        filas.push(filaPeriodo(labelBucket(periodo, b.clave), r));
        acc.recaudacion += r.recaudacion;
        acc.efectivo += r.efectivo;
        acc.transferencia += r.transferencia;
        acc.bonos += r.bonos;
        acc.cobro_total += r.cobro_total;
        acc.parte_chofer += r.parte_chofer;
        acc.monto_33 += r.monto_33;
        acc.diezmo += r.diezmo;
        acc.gasto_combustible += r.gasto_combustible;
        acc.gasto_gomeria += r.gasto_gomeria;
        acc.gasto_otros += r.gasto_otros;
        acc.gasto_total += r.gasto_total;
        acc.duenio_utilidad += r.duenio_utilidad;
        acc.turnos += r.turnos;
        acc.viajes += r.viajes;
        acc.km_totales += r.km_totales;
        return acc;
      },
      {
        recaudacion: 0,
        viajes: 0,
        km_libres: 0,
        km_ocupados: 0,
        km_totales: 0,
        efectivo: 0,
        transferencia: 0,
        bonos: 0,
        cobro_total: 0,
        parte_chofer: 0,
        monto_33: 0,
        diezmo: 0,
        duenio_neto: 0,
        gasto_combustible: 0,
        gasto_gomeria: 0,
        gasto_otros: 0,
        gasto_total: 0,
        duenio_utilidad: 0,
        turnos: 0,
      }
    );
    filas.push(filaPeriodo("TOTAL", total));
    nombre = `remi-metricas-${periodo}-${ref}.csv`;
  }

  const csv = CSV_BOM + toCSV(filas);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
