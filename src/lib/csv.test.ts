import { describe, expect, it } from "vitest";
import { CSV_BOM, toCSV } from "./csv";

describe("toCSV", () => {
  it("usa ; por defecto y CRLF entre filas", () => {
    expect(toCSV([["a", "b"], ["1", 2]])).toBe("a;b\r\n1;2");
  });

  it("permite otro delimitador", () => {
    expect(toCSV([["a", "b"], ["1", "2"]], ",")).toBe("a,b\r\n1,2");
  });

  it("escapa valores que contienen el delimitador", () => {
    expect(toCSV([["x;y"]])).toBe('"x;y"');
  });

  it("duplica comillas y encierra el valor", () => {
    expect(toCSV([['a"b']])).toBe('"a""b"');
  });

  it("escapa saltos de línea", () => {
    expect(toCSV([["a\nb"]])).toBe('"a\nb"');
  });

  it("convierte null/undefined en vacío", () => {
    expect(toCSV([[null, undefined, "x"]])).toBe(";;x");
  });

  it("el BOM es el prefijo de Excel", () => {
    expect(CSV_BOM).toBe("\uFEFF");
  });
});
