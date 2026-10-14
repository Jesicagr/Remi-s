// ===========================================================================
// AppRemi - Datos demo (se usan cuando Supabase no esta configurado)
// ===========================================================================

import type {
  Asistencia,
  Chofer,
  Gasto,
  Turno,
  Vehiculo,
} from "./types";

export const demoChoferes: Chofer[] = [
  { id: 1, nombre: "Carlos", apellido: "Giménez", telefono: "+54 11 5555-0001", activo: true, pct_chofer: 0.67, user_id: null },
  { id: 2, nombre: "Martín", apellido: "Sosa", telefono: "+54 11 5555-0002", activo: true, pct_chofer: 0.67, user_id: null },
  { id: 3, nombre: "Roberto", apellido: "Álvarez", telefono: "+54 11 5555-0003", activo: true, pct_chofer: 0.6, user_id: null },
  { id: 4, nombre: "Lucía", apellido: "Vega", telefono: "+54 11 5555-0004", activo: true, pct_chofer: 0.7, user_id: null },
];

export const demoVehiculos: Vehiculo[] = [
  { id: 1, movil: "#04", marca: "Chevrolet", modelo: "Classic", patente: "AC 294 KO", chofer_id: 1 },
  { id: 2, movil: "#12", marca: "Fiat", modelo: "Cronos", patente: "AF 109 ZX", chofer_id: 2 },
  { id: 3, movil: "#07", marca: "Renault", modelo: "Logan", patente: "AE 433 PL", chofer_id: 3 },
  { id: 4, movil: "#19", marca: "Toyota", modelo: "Etios", patente: "AD 882 MP", chofer_id: 4 },
];

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20261012);

const turnosDemo: Turno[] = [];
const gastosDemo: Gasto[] = [];
let turnoId = 0;
let gastoId = 0;

const tipos: Turno["tipo"][] = ["manana", "tarde", "noche"];

for (let dia = 1; dia <= 11; dia++) {
  for (const chofer of demoChoferes) {
    // cada chofer trabaja 1 turno por dia
    const tipo = tipos[(chofer.id + dia) % tipos.length];
    const vehiculo = demoVehiculos.find((v) => v.chofer_id === chofer.id) ?? null;
    const viajes = 12 + Math.floor(rnd() * 10);
    const km_ocupados = 80 + Math.floor(rnd() * 60);
    const km_libres = 25 + Math.floor(rnd() * 40);
    const recaudacion = 38000 + Math.floor(rnd() * 26000);
    const pactado = 42000 + Math.floor(rnd() * 8000);
    const transferencia = Math.floor(recaudacion * (0.15 + rnd() * 0.2));
    const bonos = Math.floor(recaudacion * (rnd() * 0.12));
    const efectivo = recaudacion - transferencia - bonos;
    turnoId += 1;
    turnosDemo.push({
      id: turnoId,
      chofer_id: chofer.id,
      vehiculo_id: vehiculo?.id ?? null,
      fecha: `2026-10-${String(dia).padStart(2, "0")}`,
      tipo,
      hora_inicio: tipo === "noche" ? "22:00" : tipo === "tarde" ? "14:00" : "06:00",
      hora_fin: tipo === "noche" ? "06:00" : tipo === "tarde" ? "22:00" : "14:00",
      km_libres,
      km_ocupados,
      cantidad_viajes: viajes,
      recaudacion,
      pactado,
      efectivo,
      transferencia,
      bonos,
      creado_en: `2026-10-${String(dia).padStart(2, "0")}T12:00:00Z`,
    });

    // combustible casi todos los dias
    gastoId += 1;
    gastosDemo.push({
      id: gastoId,
      turno_id: turnoId,
      categoria: "combustible",
      monto: 4200 + Math.floor(rnd() * 2600),
      litros: 14 + Math.round(rnd() * 12 * 10) / 10,
      numero_ticket: `0004-${91000 + gastoId}`,
      comprobante_url: null,
      detalle: rnd() > 0.5 ? "Nafta YPF" : "GNC",
      creado_en: `2026-10-${String(dia).padStart(2, "0")}T09:00:00Z`,
    });

    if (rnd() > 0.7) {
      gastoId += 1;
      gastosDemo.push({
        id: gastoId,
        turno_id: turnoId,
        categoria: "gomeria",
        monto: 1200 + Math.floor(rnd() * 3800),
        litros: null,
        numero_ticket: `G-${7000 + gastoId}`,
        comprobante_url: null,
        detalle: "Gomería / repuestos",
        creado_en: `2026-10-${String(dia).padStart(2, "0")}T09:30:00Z`,
      });
    }

    if (rnd() > 0.6) {
      gastoId += 1;
      const extra = rnd();
      const categoria: Gasto["categoria"] =
        extra > 0.66 ? "lavadero" : extra > 0.33 ? "peajes" : "mecanica";
      gastosDemo.push({
        id: gastoId,
        turno_id: turnoId,
        categoria,
        monto: 800 + Math.floor(rnd() * 2400),
        litros: null,
        numero_ticket: `R-${4000 + gastoId}`,
        comprobante_url: null,
        detalle: null,
        creado_en: `2026-10-${String(dia).padStart(2, "0")}T10:00:00Z`,
      });
    }
  }
}

export const demoTurnos = turnosDemo;
export const demoGastos = gastosDemo;

export const demoAsistencia: Asistencia[] = demoChoferes.flatMap((c) =>
  Array.from({ length: 11 }, (_, i) => {
    const dia = i + 1;
    const fecha = `2026-10-${String(dia).padStart(2, "0")}`;
    const r = rnd();
    const falta = dia === 3 && c.id === 2;
    const asis1 = !falta;
    const asis2 = !falta && r > 0.15;
    return {
      id: c.id * 100 + dia,
      chofer_id: c.id,
      fecha,
      asis1,
      asis2,
      asis1_hora: asis1 ? "05:55" : null,
      asis2_hora: asis2 ? "14:00" : null,
    };
  })
);
