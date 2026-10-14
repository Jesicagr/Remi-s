import { describe, expect, it } from "vitest";
import {
  asistenciaDeTurno,
  combinarAsistencia,
  type MarcaAsistencia,
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
