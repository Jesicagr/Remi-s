// ===========================================================================
// AppRemi - Tipos de dominio
// ===========================================================================

export type TipoTurno = "manana" | "tarde" | "noche" | "dia";

export type Rol = "chofer" | "duenio";

export type CategoriaGasto =
  | "combustible"
  | "gomeria"
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
  /** Porcentaje de la recaudación que le corresponde al chofer (0..1). */
  pct_chofer: number;
  /** Usuario de Supabase Auth asociado (opcional). */
  user_id: string | null;
}

export interface Perfil {
  id: string; // auth.users.id
  rol: Rol;
  chofer_id: number | null;
  nombre: string | null;
  email: string | null;
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
  /** Monto acordado del turno ("pactado"). Null si no aplica. */
  pactado: number | null;
  /** Desglose del cobro. */
  efectivo: number;
  transferencia: number;
  bonos: number;
  creado_en: string | null;
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

// --- Indicadores calculados (regla: % chofer configurable, resto dueño,
//     diezmo 10% de la parte del dueño) ---

export interface IndicadoresTurno {
  parte_chofer: number; // % del chofer
  monto_33: number; // parte del dueño
  diezmo: number; // 10% de la parte del dueño
  duenio_neto: number; // parte dueño - diezmo
  gasto_combustible: number;
  gasto_gomeria: number;
  gasto_otros: number;
  gasto_total: number;
  duenio_utilidad: number; // duenio_neto - gastos
  cobro_total: number; // efectivo + transferencia + bonos
  diferencia_pactado: number | null; // recaudacion - pactado
}
