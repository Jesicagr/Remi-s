import { describe, expect, it } from "vitest";
import { esFechaISO, fechaEsFutura, hoyISO } from "./fechas";

describe("hoyISO", () => {
  it("formatea una fecha base como YYYY-MM-DD", () => {
    expect(hoyISO(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(hoyISO(new Date(2026, 9, 13))).toBe("2026-10-13");
    expect(hoyISO(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("esFechaISO", () => {
  it("acepta fechas válidas", () => {
    expect(esFechaISO("2026-10-02")).toBe(true);
    expect(esFechaISO("2024-02-29")).toBe(true); // bisiesto
  });

  it("rechaza formatos y fechas inexistentes", () => {
    expect(esFechaISO("2026-2-2")).toBe(false);
    expect(esFechaISO("02/10/2026")).toBe(false);
    expect(esFechaISO("2026-13-01")).toBe(false);
    expect(esFechaISO("2026-02-31")).toBe(false);
    expect(esFechaISO("2025-02-29")).toBe(false);
    expect(esFechaISO("")).toBe(false);
    expect(esFechaISO("abc")).toBe(false);
  });
});

describe("fechaEsFutura", () => {
  const hoy = "2026-10-13";

  it("detecta fechas posteriores a hoy", () => {
    expect(fechaEsFutura("2026-10-14", hoy)).toBe(true);
    expect(fechaEsFutura("2026-11-01", hoy)).toBe(true);
    expect(fechaEsFutura("2027-01-01", hoy)).toBe(true);
  });

  it("no marca hoy ni fechas pasadas", () => {
    expect(fechaEsFutura("2026-10-13", hoy)).toBe(false);
    expect(fechaEsFutura("2026-10-12", hoy)).toBe(false);
    expect(fechaEsFutura("2020-01-01", hoy)).toBe(false);
  });
});
