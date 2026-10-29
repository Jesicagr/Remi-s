// ===========================================================================
// AppRemi - Asistencia derivada del turno
// Regla: cada chofer hace un turno por dia; al cargarlo (dia + horario),
// la asistencia de ese dia se registra automaticamente.
// ===========================================================================

import type { Asistencia, TipoTurno } from "./types";

/** Fila cruda de `marca_asistencia` (una marca por turno). */
export interface MarcaAsistenciaRegistro {
  id: number;
  chofer_id: number;
  turno_id: number | null;
  fecha: string;
  tipo: "asis1" | "asis2";
  hora: string | null;
  origen: string;
  registrado_por: string | null;
  creado_en: string;
}

export interface MarcaAsistencia {
  asis1: boolean;
  asis2: boolean;
  asis1_hora: string | null;
  asis2_hora: string | null;
}

/** Turnos de arranque temprano -> Asis 1; tarde/noche -> Asis 2. */
export function asistenciaDeTurno(
  tipo: TipoTurno,
  horaInicio: string | null
): MarcaAsistencia {
  const primera = tipo === "manana" || tipo === "dia";
  return {
    asis1: primera,
    asis2: !primera,
    asis1_hora: primera ? horaInicio : null,
    asis2_hora: primera ? null : horaInicio,
  };
}

/** Combina una marca nueva con lo ya registrado, sin pisar un turno previo. */
export function combinarAsistencia(
  prev: MarcaAsistencia | null,
  marca: MarcaAsistencia
): MarcaAsistencia {
  if (!prev) return marca;
  return {
    asis1: prev.asis1 || marca.asis1,
    asis2: prev.asis2 || marca.asis2,
    asis1_hora: marca.asis1 ? marca.asis1_hora : prev.asis1_hora,
    asis2_hora: marca.asis2 ? marca.asis2_hora : prev.asis2_hora,
  };
}

/**
 * Agrupa las marcas inmutables en el formato que usan las pantallas.
 * Un día con asis1 y asis2 genera una sola fila con ambas marcas.
 */
export function agruparAsistencia(
  marcas: MarcaAsistenciaRegistro[]
): Asistencia[] {
  const map = new Map<string, Asistencia>();

  for (const m of marcas) {
    const key = `${m.chofer_id}|${m.fecha}`;
    const row = map.get(key) ?? {
      id: m.id,
      chofer_id: m.chofer_id,
      fecha: m.fecha,
      asis1: false,
      asis2: false,
      asis1_hora: null,
      asis2_hora: null,
    };

    if (m.tipo === "asis1") {
      row.asis1 = true;
      row.asis1_hora = m.hora;
    } else {
      row.asis2 = true;
      row.asis2_hora = m.hora;
    }

    map.set(key, row);
  }

  return [...map.values()].sort((a, b) => b.fecha.localeCompare(a.fecha));
}
