import { describe, expect, it } from "vitest";
import type { Dataset } from "./data";
import { PCT_CHOFER } from "./format";
import {
  fechaReferencia,
  gastosPorTurno,
  indicadoresTurno,
  nombreChofer,
  pctChofer,
  resumenPorChofer,
  resumenPorDia,
  resumenPorMes,
  resumenRango,
  resumenTotal,
} from "./reportes";
import type { Chofer, Gasto, Turno } from "./types";

const choferes: Chofer[] = [
  {
    id: 1,
    nombre: "Ana",
    apellido: "Diaz",
    telefono: null,
    activo: true,
    pct_chofer: 0.7,
    user_id: null,
  },
  {
    id: 2,
    nombre: "Beto",
    apellido: null,
    telefono: null,
    activo: true,
    pct_chofer: 0.5,
    user_id: null,
  },
];

const turnos: Turno[] = [
  {
    id: 1,
    chofer_id: 1,
    vehiculo_id: null,
    fecha: "2026-10-01",
    tipo: "manana",
    hora_inicio: null,
    hora_fin: null,
    km_libres: 10,
    km_ocupados: 20,
    cantidad_viajes: 5,
    recaudacion: 1000,
    pactado: 900,
    efectivo: 600,
    transferencia: 300,
    bonos: 100,
    creado_en: null,
  },
  {
    id: 2,
    chofer_id: 1,
    vehiculo_id: null,
    fecha: "2026-10-02",
    tipo: "tarde",
    hora_inicio: null,
    hora_fin: null,
    km_libres: 5,
    km_ocupados: 5,
    cantidad_viajes: 2,
    recaudacion: 500,
    pactado: null,
    efectivo: 500,
    transferencia: 0,
    bonos: 0,
    creado_en: null,
  },
  {
    id: 3,
    chofer_id: 2,
    vehiculo_id: null,
    fecha: "2026-11-05",
    tipo: "noche",
    hora_inicio: null,
    hora_fin: null,
    km_libres: 0,
    km_ocupados: 0,
    cantidad_viajes: 8,
    recaudacion: 2000,
    pactado: 2200,
    efectivo: 1000,
    transferencia: 600,
    bonos: 400,
    creado_en: null,
  },
];

const gastos: Gasto[] = [
  {
    id: 1,
    turno_id: 1,
    categoria: "combustible",
    monto: 100,
    litros: null,
    numero_ticket: null,
    comprobante_url: null,
    detalle: null,
    creado_en: "",
  },
  {
    id: 2,
    turno_id: 1,
    categoria: "gomeria",
    monto: 50,
    litros: null,
    numero_ticket: null,
    comprobante_url: null,
    detalle: null,
    creado_en: "",
  },
  {
    id: 3,
    turno_id: 3,
    categoria: "peajes",
    monto: 30,
    litros: null,
    numero_ticket: null,
    comprobante_url: null,
    detalle: null,
    creado_en: "",
  },
];

const ds: Dataset = {
  choferes,
  vehiculos: [],
  turnos,
  gastos,
  asistencia: [],
  demo: false,
};

describe("gastosPorTurno", () => {
  it("agrupa los gastos por turno", () => {
    const map = gastosPorTurno(gastos);
    expect(map.get(1)?.length).toBe(2);
    expect(map.get(3)?.length).toBe(1);
    expect(map.get(99)).toBeUndefined();
  });
});

describe("pctChofer", () => {
  it("toma el % configurado del chofer", () => {
    expect(pctChofer(ds, 1)).toBe(0.7);
    expect(pctChofer(ds, 2)).toBe(0.5);
  });

  it("cae al default si el chofer no existe", () => {
    expect(pctChofer(ds, 99)).toBe(PCT_CHOFER);
  });
});

describe("indicadoresTurno", () => {
  it("calcula km totales, cobro y diferencia de pactado", () => {
    const i = indicadoresTurno(turnos[0], [gastos[0], gastos[1]], 0.7);
    expect(i.parte_chofer).toBe(700);
    expect(i.duenio_utilidad).toBe(120); // 270 neto - 150 gastos
    expect(i.km_totales).toBe(30);
    expect(i.cobro_total).toBe(1000);
    expect(i.diferencia_pactado).toBe(100);
  });

  it("diferencia de pactado es null si no hay pactado", () => {
    const i = indicadoresTurno(turnos[1], [], 0.7);
    expect(i.diferencia_pactado).toBeNull();
    expect(i.cobro_total).toBe(500);
    expect(i.km_totales).toBe(10);
  });
});

describe("resumenTotal", () => {
  it("agrega todos los turnos con su % por chofer", () => {
    const t = resumenTotal(ds);
    expect(t.turnos).toBe(3);
    expect(t.recaudacion).toBe(3500);
    expect(t.viajes).toBe(15);
    expect(t.km_libres).toBe(15);
    expect(t.km_ocupados).toBe(25);
    expect(t.km_totales).toBe(40);
    expect(t.efectivo).toBe(2100);
    expect(t.transferencia).toBe(900);
    expect(t.bonos).toBe(500);
    expect(t.cobro_total).toBe(3500);
    expect(t.parte_chofer).toBe(2050);
    expect(t.monto_33).toBe(1450);
    expect(t.diezmo).toBe(145);
    expect(t.duenio_neto).toBe(1305);
    expect(t.gasto_combustible).toBe(100);
    expect(t.gasto_gomeria).toBe(50);
    expect(t.gasto_otros).toBe(30);
    expect(t.gasto_total).toBe(180);
    expect(t.duenio_utilidad).toBe(1125);
  });
});

describe("resumenRango", () => {
  it("incluye los bordes del rango", () => {
    const r = resumenRango(ds, "2026-10-01", "2026-10-02");
    expect(r.turnos).toBe(2);
    expect(r.recaudacion).toBe(1500);
    expect(r.parte_chofer).toBe(1050);
    expect(r.cobro_total).toBe(1500);
  });

  it("un rango de un día devuelve solo ese día", () => {
    const r = resumenRango(ds, "2026-10-01", "2026-10-01");
    expect(r.turnos).toBe(1);
    expect(r.recaudacion).toBe(1000);
  });

  it("un rango sin turnos da todo en cero", () => {
    const r = resumenRango(ds, "2030-01-01", "2030-12-31");
    expect(r.turnos).toBe(0);
    expect(r.recaudacion).toBe(0);
  });
});

describe("fechaReferencia", () => {
  it("devuelve la fecha del turno más reciente", () => {
    expect(fechaReferencia(ds)).toBe("2026-11-05");
  });

  it("sin turnos devuelve la fecha de hoy (ISO)", () => {
    const vacio: Dataset = { ...ds, turnos: [] };
    expect(fechaReferencia(vacio)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("agrupaciones", () => {
  it("resumenPorDia ordenado descendente", () => {
    const claves = resumenPorDia(ds).map((x) => x.clave);
    expect(claves).toEqual(["2026-11-05", "2026-10-02", "2026-10-01"]);
  });

  it("resumenPorMes ordenado descendente", () => {
    const claves = resumenPorMes(ds).map((x) => x.clave);
    expect(claves).toEqual(["2026-11", "2026-10"]);
  });

  it("resumenPorChofer separa por chofer y filtra por mes", () => {
    const todos = resumenPorChofer(ds);
    expect(todos.length).toBe(2);
    const ana = todos.find((x) => x.chofer_id === 1);
    const beto = todos.find((x) => x.chofer_id === 2);
    expect(ana?.resumen.recaudacion).toBe(1500);
    expect(beto?.resumen.recaudacion).toBe(2000);

    const octubre = resumenPorChofer(ds, "2026-10");
    expect(octubre.length).toBe(1);
    expect(octubre[0].chofer_id).toBe(1);
  });
});

describe("nombreChofer", () => {
  it("arma nombre y apellido", () => {
    expect(nombreChofer(ds, 1)).toBe("Ana Diaz");
    expect(nombreChofer(ds, 2)).toBe("Beto");
    expect(nombreChofer(ds, 99)).toBe("—");
  });
});
