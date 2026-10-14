// ===========================================================================
// AppRemi - Generacion de CSV
// ===========================================================================

export function toCSV(
  rows: (string | number | null | undefined)[][],
  delimiter = ";"
): string {
  const esc = (v: string | number | null | undefined): string => {
    const s = v === null || v === undefined ? "" : String(v);
    if (s.includes('"') || s.includes("\n") || s.includes("\r") || s.includes(delimiter)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  return rows.map((r) => r.map(esc).join(delimiter)).join("\r\n");
}

/** Prefijo BOM para que Excel respete los acentos (UTF-8). */
export const CSV_BOM = "\uFEFF";
