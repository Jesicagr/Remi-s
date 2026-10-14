// ===========================================================================
// AppRemi - Asistencia derivada del turno
// Regla: cada chofer hace un turno por dia; al cargarlo (dia + horario),
// la asistencia de ese dia se registra automaticamente.
// ===========================================================================

import type { TipoTurno } from "./types";

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
