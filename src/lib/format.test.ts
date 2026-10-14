import { describe, expect, it } from "vitest";
import {
  PCT_CHOFER,
  PCT_DIEZMO,
  calcular,
  iniciales,
  r2,
} from "./format";

describe("r2", () => {
  it("redondea a 2 decimales", () => {
    expect(r2(1.005)).toBe(1.01);
    expect(r2(2.675)).toBe(2.68);
    expect(r2(0.1 + 0.2)).toBe(0.3);
    expect(r2(10)).toBe(10);
  });
});

describe("calcular", () => {
  it("reparte con el % por defecto (67/33) y descuenta el diezmo", () => {
    const r = calcular(1000, [], PCT_CHOFER);
    expect(r.parte_chofer).toBe(670);
    expect(r.monto_33).toBe(330);
    expect(r.diezmo).toBe(33); // 10% de la parte del dueño
    expect(r.duenio_neto).toBe(297);
    expect(r.gasto_total).toBe(0);
    expect(r.duenio_utilidad).toBe(297);
  });

  it("usa un % de chofer configurable", () => {
    const r = calcular(1000, [], 0.5);
    expect(r.parte_chofer).toBe(500);
    expect(r.monto_33).toBe(500);
    expect(r.diezmo).toBe(50);
    expect(r.duenio_neto).toBe(450);
  });

  it("cae al 67% si el % es inválido (<=0 o >=1)", () => {
    expect(calcular(1000, [], 0).parte_chofer).toBe(670);
    expect(calcular(1000, [], 1).parte_chofer).toBe(670);
    expect(calcular(1000, [], 1.5).parte_chofer).toBe(670);
  });

  it("separa gastos por categoría y calcula la utilidad del dueño", () => {
    const r = calcular(
      1000,
      [
        { categoria: "combustible", monto: 100 },
        { categoria: "gomeria", monto: 50 },
        { categoria: "peajes", monto: 30 },
      ],
      PCT_CHOFER
    );
    expect(r.gasto_combustible).toBe(100);
    expect(r.gasto_gomeria).toBe(50);
    expect(r.gasto_otros).toBe(30);
    expect(r.gasto_total).toBe(180);
    // 297 de parte neta del dueño - 180 de gastos
    expect(r.duenio_utilidad).toBe(117);
  });

  it("trata cualquier categoría que no sea combustible/gomería como otros", () => {
    const r = calcular(
      500,
      [
        { categoria: "lavadero", monto: 10 },
        { categoria: "mecanica", monto: 20 },
        { categoria: "pinchadura", monto: 5 },
      ],
      PCT_CHOFER
    );
    expect(r.gasto_otros).toBe(35);
    expect(r.gasto_combustible).toBe(0);
    expect(r.gasto_gomeria).toBe(0);
  });

  it("el diezmo es el 10% de la parte del dueño", () => {
    expect(PCT_DIEZMO).toBe(0.1);
    const r = calcular(2000, [], 0.5);
    expect(r.monto_33).toBe(1000);
    expect(r.diezmo).toBe(100);
  });
});

describe("iniciales", () => {
  it("toma la primera letra de nombre y apellido en mayúscula", () => {
    expect(iniciales("Juan", "Perez")).toBe("JP");
    expect(iniciales("juan", null)).toBe("J");
    expect(iniciales("  ana ", " lopez ")).toBe("AL");
  });

  it("devuelve ?? cuando no hay datos", () => {
    expect(iniciales("")).toBe("??");
    expect(iniciales("", null)).toBe("??");
  });
});
