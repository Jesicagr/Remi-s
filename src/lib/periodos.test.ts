import { describe, expect, it } from "vitest";
import {
  labelBucket,
  rangoDePeriodo,
  seriePeriodos,
} from "./periodos";

// 2026-10-02 es viernes; su semana (lunes-domingo) es 2026-09-28 .. 2026-10-04.
describe("rangoDePeriodo", () => {
  it("día: mismo desde y hasta", () => {
    expect(rangoDePeriodo("dia", "2026-10-02")).toEqual({
      desde: "2026-10-02",
      hasta: "2026-10-02",
    });
  });

  it("semana: lunes a domingo", () => {
    expect(rangoDePeriodo("semana", "2026-10-02")).toEqual({
      desde: "2026-09-28",
      hasta: "2026-10-04",
    });
  });

  it("semana: si cae lunes, empieza ese mismo día", () => {
    expect(rangoDePeriodo("semana", "2026-09-28")).toEqual({
      desde: "2026-09-28",
      hasta: "2026-10-04",
    });
  });

  it("mes: primer al último día", () => {
    expect(rangoDePeriodo("mes", "2026-10-02")).toEqual({
      desde: "2026-10-01",
      hasta: "2026-10-31",
    });
  });

  it("mes: febrero no bisiesto termina el 28", () => {
    expect(rangoDePeriodo("mes", "2026-02-15")).toEqual({
      desde: "2026-02-01",
      hasta: "2026-02-28",
    });
  });

  it("año: 1 de enero al 31 de diciembre", () => {
    expect(rangoDePeriodo("anio", "2026-10-02")).toEqual({
      desde: "2026-01-01",
      hasta: "2026-12-31",
    });
  });
});

describe("seriePeriodos", () => {
  it("día: termina en la referencia y tiene n items", () => {
    const s = seriePeriodos("dia", "2026-10-02", 3);
    expect(s.map((b) => b.clave)).toEqual([
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
  });

  it("semana: claves son el lunes de cada semana", () => {
    const s = seriePeriodos("semana", "2026-10-02", 2);
    expect(s.map((b) => b.clave)).toEqual(["2026-09-21", "2026-09-28"]);
    expect(s[1].hasta).toBe("2026-10-04");
  });

  it("mes: claves YYYY-MM en orden", () => {
    const s = seriePeriodos("mes", "2026-10-02", 3);
    expect(s.map((b) => b.clave)).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    expect(s[2].desde).toBe("2026-10-01");
    expect(s[2].hasta).toBe("2026-10-31");
  });

  it("año: claves de 4 dígitos", () => {
    const s = seriePeriodos("anio", "2026-10-02", 3);
    expect(s.map((b) => b.clave)).toEqual(["2024", "2025", "2026"]);
  });

  it("respeta la cantidad pedida", () => {
    expect(seriePeriodos("mes", "2026-10-02", 12)).toHaveLength(12);
    expect(seriePeriodos("dia", "2026-10-02", 14)).toHaveLength(14);
  });
});

describe("labelBucket", () => {
  it("día en formato dd/mm/aaaa", () => {
    expect(labelBucket("dia", "2026-10-02")).toBe("02/10/2026");
  });

  it("año: el año como texto", () => {
    expect(labelBucket("anio", "2026")).toBe("2026");
  });

  it("mes: capitalizado y con el año", () => {
    const l = labelBucket("mes", "2026-10");
    expect(l.startsWith("Octubre")).toBe(true);
    expect(l).toContain("2026");
  });
});
