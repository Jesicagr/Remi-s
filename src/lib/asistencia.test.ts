import { describe, expect, it } from "vitest";
import {
  agruparAsistencia,
  asistenciaDeTurno,
  combinarAsistencia,
  type MarcaAsistencia,
  type MarcaAsistenciaRegistro,
} from "./asistencia";

describe("asistenciaDeTurno", () => {
  it("turno mañana marca Asis 1 con el horario", () => {
    expect(asistenciaDeTurno("manana", "05:55")).toEqual({
      asis1: true,
      asis2: false,
      asis1_hora: "05:55",
      asis2_hora: null,
    });
  });

  it("turno día marca Asis 1", () => {
    const m = asistenciaDeTurno("dia", "07:00");
    expect(m.asis1).toBe(true);
    expect(m.asis2).toBe(false);
    expect(m.asis1_hora).toBe("07:00");
  });

  it("turno tarde marca Asis 2 con el horario", () => {
    expect(asistenciaDeTurno("tarde", "14:00")).toEqual({
      asis1: false,
      asis2: true,
      asis1_hora: null,
      asis2_hora: "14:00",
    });
  });

  it("turno noche marca Asis 2", () => {
    const m = asistenciaDeTurno("noche", "22:00");
    expect(m.asis1).toBe(false);
    expect(m.asis2).toBe(true);
    expect(m.asis2_hora).toBe("22:00");
  });

  it("sin horario, la hora queda nula", () => {
    const m = asistenciaDeTurno("manana", null);
    expect(m.asis1).toBe(true);
    expect(m.asis1_hora).toBeNull();
  });
});

describe("combinarAsistencia", () => {
  it("sin registro previo devuelve la marca nueva", () => {
    const marca: MarcaAsistencia = {
      asis1: true,
      asis2: false,
      asis1_hora: "06:00",
      asis2_hora: null,
    };
    expect(combinarAsistencia(null, marca)).toEqual(marca);
  });

  it("no pisa un turno previo: suma las marcas (mañana + tarde)", () => {
    const prev: MarcaAsistencia = {
      asis1: true,
      asis2: false,
      asis1_hora: "05:55",
      asis2_hora: null,
    };
    const tarde = asistenciaDeTurno("tarde", "14:00");
    const r = combinarAsistencia(prev, tarde);
    expect(r).toEqual({
      asis1: true,
      asis2: true,
      asis1_hora: "05:55",
      asis2_hora: "14:00",
    });
  });

  it("el horario nuevo reemplaza al del mismo slot", () => {
    const prev: MarcaAsistencia = {
      asis1: true,
      asis2: false,
      asis1_hora: "05:55",
      asis2_hora: null,
    };
    const r = combinarAsistencia(prev, asistenciaDeTurno("manana", "06:30"));
    expect(r.asis1_hora).toBe("06:30");
    expect(r.asis1).toBe(true);
  });
});

function marca(
  id: number,
  chofer_id: number,
  fecha: string,
  tipo: "asis1" | "asis2",
  hora: string | null
): MarcaAsistenciaRegistro {
  return {
    id,
    chofer_id,
    turno_id: id,
    fecha,
    tipo,
    hora,
    origen: "turno",
    registrado_por: null,
    creado_en: `${fecha}T12:00:00Z`,
  };
}

describe("agruparAsistencia", () => {
  it("junta asis1 y asis2 del mismo día en una sola fila", () => {
    const r = agruparAsistencia([
      marca(1, 1, "2026-10-01", "asis1", "05:55"),
      marca(2, 1, "2026-10-01", "asis2", "14:00"),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      chofer_id: 1,
      fecha: "2026-10-01",
      asis1: true,
      asis2: true,
      asis1_hora: "05:55",
      asis2_hora: "14:00",
    });
  });

  it("separa choferes y ordena por fecha descendente", () => {
    const r = agruparAsistencia([
      marca(1, 1, "2026-10-01", "asis1", null),
      marca(2, 2, "2026-10-03", "asis1", null),
      marca(3, 1, "2026-10-02", "asis2", null),
    ]);
    expect(r.map((x) => `${x.chofer_id}:${x.fecha}`)).toEqual([
      "2:2026-10-03",
      "1:2026-10-02",
      "1:2026-10-01",
    ]);
  });

  it("sin marcas devuelve una lista vacía", () => {
    expect(agruparAsistencia([])).toEqual([]);
  });
});
