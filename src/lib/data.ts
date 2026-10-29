// ===========================================================================
// AppRemi - Acceso a datos.
// Usa Supabase si esta configurado; si no, cae a los datos demo.
// ===========================================================================

import {
  demoAsistencia,
  demoChoferes,
  demoGastos,
  demoTurnos,
  demoVehiculos,
} from "./demo";
import {
  agruparAsistencia,
  type MarcaAsistenciaRegistro,
} from "./asistencia";
import { createClient, isSupabaseConfigured } from "./supabase/server";
import type {
  Asistencia,
  Chofer,
  Correccion,
  Evidencia,
  Gasto,
  Perfil,
  PeriodoCerrado,
  Turno,
  Vehiculo,
} from "./types";

export interface Dataset {
  choferes: Chofer[];
  vehiculos: Vehiculo[];
  turnos: Turno[];
  gastos: Gasto[];
  asistencia: Asistencia[];
  /** Anulaciones/ajustes. Los registros anulados se excluyen del dataset. */
  correcciones: Correccion[];
  demo: boolean;
}

export async function getDataset(): Promise<Dataset> {
  if (!isSupabaseConfigured()) {
    return {
      choferes: demoChoferes,
      vehiculos: demoVehiculos,
      turnos: demoTurnos,
      gastos: demoGastos,
      asistencia: demoAsistencia,
      correcciones: [],
      demo: true,
    };
  }

  try {
    const supabase = await createClient();
    const [
      choferes,
      vehiculos,
      turnos,
      gastos,
      asistenciaHistorica,
      marcas,
      correcciones,
    ] = await Promise.all([
      supabase.from("chofer").select("*").order("nombre"),
      supabase.from("vehiculo").select("*").order("movil"),
      supabase.from("turno").select("*").order("fecha", { ascending: false }),
      supabase.from("gasto").select("*").order("creado_en", { ascending: false }),
      supabase.from("asistencia").select("*").order("fecha", { ascending: false }),
      supabase
        .from("marca_asistencia")
        .select("*")
        .order("fecha", { ascending: false }),
      supabase
        .from("correccion")
        .select("*")
        .order("creado_en", { ascending: false }),
    ]);

    const todasCorrecciones = (correcciones.data ?? []) as Correccion[];
    const anuladosTurno = new Set(
      todasCorrecciones
        .filter((c) => c.tabla === "turno" && c.tipo === "anulacion")
        .map((c) => c.registro_id)
    );
    const anuladosGasto = new Set(
      todasCorrecciones
        .filter((c) => c.tabla === "gasto" && c.tipo === "anulacion")
        .map((c) => c.registro_id)
    );

    // Si la migracion de marcas todavia no se aplico, usa la tabla historica.
    const asistencia: Asistencia[] =
      marcas.error || !marcas.data
        ? ((asistenciaHistorica.data ?? []) as Asistencia[])
        : agruparAsistencia(marcas.data as MarcaAsistenciaRegistro[]);

    return {
      choferes: (choferes.data ?? []) as Chofer[],
      vehiculos: (vehiculos.data ?? []) as Vehiculo[],
      turnos: ((turnos.data ?? []) as Turno[]).filter(
        (t) => !anuladosTurno.has(t.id)
      ),
      gastos: ((gastos.data ?? []) as Gasto[]).filter(
        (g) => !anuladosGasto.has(g.id) && !anuladosTurno.has(g.turno_id)
      ),
      asistencia,
      correcciones: todasCorrecciones,
      demo: false,
    };
  } catch {
    return {
      choferes: demoChoferes,
      vehiculos: demoVehiculos,
      turnos: demoTurnos,
      gastos: demoGastos,
      asistencia: demoAsistencia,
      correcciones: [],
      demo: true,
    };
  }
}

export interface EvidenciaConUrl extends Evidencia {
  /** URL firmada temporal (el bucket es privado). */
  url: string | null;
}

/** Evidencias de un turno, con URL firmada para verlas en la app. */
export async function getEvidencias(
  turnoId: number
): Promise<EvidenciaConUrl[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("evidencia")
      .select("*")
      .eq("turno_id", turnoId)
      .order("creado_en", { ascending: false });

    if (error || !data) return [];

    const evidencias = data as Evidencia[];
    return await Promise.all(
      evidencias.map(async (e) => {
        const { data: signed } = await supabase.storage
          .from("evidencias")
          .createSignedUrl(e.storage_path, 60 * 60);
        return { ...e, url: signed?.signedUrl ?? null };
      })
    );
  } catch {
    return [];
  }
}

/** Meses cerrados (solo el dueño puede cerrar/reabrir por RLS). */
export async function getPeriodosCerrados(): Promise<PeriodoCerrado[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("periodo_cerrado")
      .select("*")
      .order("mes", { ascending: false });

    if (error || !data) return [];
    return data as PeriodoCerrado[];
  } catch {
    return [];
  }
}

/** Perfiles de usuario (solo el dueño puede listar todos por RLS). */
export async function getPerfiles(): Promise<Perfil[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = await createClient();
    const { data } = await supabase.from("perfil").select("*").order("email");
    return (data ?? []) as Perfil[];
  } catch {
    return [];
  }
}
