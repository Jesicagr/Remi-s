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
import { createClient, isSupabaseConfigured } from "./supabase/server";
import type {
  Asistencia,
  Chofer,
  Gasto,
  Perfil,
  Turno,
  Vehiculo,
} from "./types";

export interface Dataset {
  choferes: Chofer[];
  vehiculos: Vehiculo[];
  turnos: Turno[];
  gastos: Gasto[];
  asistencia: Asistencia[];
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
      demo: true,
    };
  }

  try {
    const supabase = await createClient();
    const [choferes, vehiculos, turnos, gastos, asistencia] = await Promise.all(
      [
        supabase.from("chofer").select("*").order("nombre"),
        supabase.from("vehiculo").select("*").order("movil"),
        supabase.from("turno").select("*").order("fecha", { ascending: false }),
        supabase.from("gasto").select("*").order("creado_en", { ascending: false }),
        supabase.from("asistencia").select("*").order("fecha", { ascending: false }),
      ]
    );

    return {
      choferes: (choferes.data ?? []) as Chofer[],
      vehiculos: (vehiculos.data ?? []) as Vehiculo[],
      turnos: (turnos.data ?? []) as Turno[],
      gastos: (gastos.data ?? []) as Gasto[],
      asistencia: (asistencia.data ?? []) as Asistencia[],
      demo: false,
    };
  } catch {
    return {
      choferes: demoChoferes,
      vehiculos: demoVehiculos,
      turnos: demoTurnos,
      gastos: demoGastos,
      asistencia: demoAsistencia,
      demo: true,
    };
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
