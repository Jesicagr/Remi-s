// ===========================================================================
// AppRemi - Tipos de dominio
// ===========================================================================

export type TipoTurno = "manana" | "tarde" | "noche" | "dia";

export type CategoriaGasto =
  | "combustible"
  | "peajes"
  | "lavadero"
  | "mecanica"
  | "pinchadura"
  | "otros";

export interface Chofer {
  id: number;
  nombre: string;
  apellido: string | null;
  telefono: string | null;
  activo: boolean;
}

export interface Vehiculo {
  id: number;
  movil: string;
  marca: string | null;
  modelo: string | null;
  patente: string | null;
  chofer_id: number | null;
}

export interface Turno {
  id: number;
  chofer_id: number;
  vehiculo_id: number | null;
  fecha: string; // ISO date
  tipo: TipoTurno;
  hora_inicio: string | null;
  hora_fin: string | null;
  km_libres: number;
  km_ocupados: number;
  cantidad_viajes: number;
  recaudacion: number;
}

export interface Gasto {
  id: number;
  turno_id: number;
  categoria: CategoriaGasto;
  monto: number;
  litros: number | null;
  numero_ticket: string | null;
  comprobante_url: string | null;
  detalle: string | null;
  creado_en: string;
}

export interface Asistencia {
  id: number;
  chofer_id: number;
  fecha: string;
  asis1: boolean;
  asis2: boolean;
  asis1_hora: string | null;
  asis2_hora: string | null;
}

// --- Indicadores calculados (regla: dueño 33% / chofer 67%, diezmo 10% del 33%) ---

export interface IndicadoresTurno {
  parte_chofer: number; // 67%
  monto_33: number; // 33% -> dueño
  diezmo: number; // 10% del 33%
  duenio_neto: number; // 33% - diezmo
  gasto_combustible: number;
  gasto_otros: number;
  gasto_total: number;
  duenio_utilidad: number; // duenio_neto - gastos
}
