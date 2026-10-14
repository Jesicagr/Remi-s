"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import {
  asistenciaDeTurno,
  combinarAsistencia,
  type MarcaAsistencia,
} from "@/lib/asistencia";
import { esFechaISO, fechaEsFutura, hoyISO } from "@/lib/fechas";
import type { TipoTurno } from "@/lib/types";

export interface CrearTurnoInput {
  chofer_id: number;
  vehiculo_id: number | null;
  fecha: string;
  tipo: TipoTurno;
  hora_inicio: string | null;
  hora_fin: string | null;
  km_libres: number;
  km_ocupados: number;
  cantidad_viajes: number;
  recaudacion: number;
  pactado: number | null;
  efectivo: number;
  transferencia: number;
  bonos: number;
  combustible: {
    monto: number;
    litros: number | null;
    numero_ticket: string | null;
    detalle: string | null;
  };
  gomeria: {
    monto: number;
    detalle: string | null;
  };
}

export interface CrearTurnoResult {
  ok: boolean;
  error?: string;
}

/**
 * Registra la asistencia del dia derivada del turno. Es idempotente: si ya
 * habia asistencia ese dia, la combina. No falla el guardado del turno si la
 * asistencia no se puede escribir.
 */
async function registrarAsistencia(
  choferId: number,
  fecha: string,
  tipo: TipoTurno,
  horaInicio: string | null
) {
  if (!isAdminConfigured()) return;
  try {
    const admin = createAdminClient();
    const marca = asistenciaDeTurno(tipo, horaInicio);
    const { data: prev } = await admin
      .from("asistencia")
      .select("asis1,asis2,asis1_hora,asis2_hora")
      .eq("chofer_id", choferId)
      .eq("fecha", fecha)
      .maybeSingle();
    const combinada = combinarAsistencia(
      (prev as MarcaAsistencia | null) ?? null,
      marca
    );
    await admin
      .from("asistencia")
      .upsert(
        { chofer_id: choferId, fecha, ...combinada },
        { onConflict: "chofer_id,fecha" }
      );
  } catch (e) {
    console.error("No se pudo registrar la asistencia:", e);
  }
}

export async function crearTurno(
  input: CrearTurnoInput
): Promise<CrearTurnoResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Supabase no está configurado (modo demo): no se puede guardar.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sesión expirada. Volvé a ingresar." };
  }

  if (!esFechaISO(input.fecha)) {
    return { ok: false, error: "Fecha inválida." };
  }
  if (fechaEsFutura(input.fecha, hoyISO())) {
    return { ok: false, error: "No se pueden cargar turnos con fecha futura." };
  }

  const { data: turno, error } = await supabase
    .from("turno")
    .insert({
      chofer_id: input.chofer_id,
      vehiculo_id: input.vehiculo_id,
      fecha: input.fecha,
      tipo: input.tipo,
      hora_inicio: input.hora_inicio,
      hora_fin: input.hora_fin,
      km_libres: input.km_libres,
      km_ocupados: input.km_ocupados,
      cantidad_viajes: input.cantidad_viajes,
      recaudacion: input.recaudacion,
      pactado: input.pactado,
      efectivo: input.efectivo,
      transferencia: input.transferencia,
      bonos: input.bonos,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  const gastos: Record<string, unknown>[] = [];

  if (input.combustible.monto > 0) {
    gastos.push({
      turno_id: turno.id,
      categoria: "combustible",
      monto: input.combustible.monto,
      litros: input.combustible.litros,
      numero_ticket: input.combustible.numero_ticket,
      detalle: input.combustible.detalle,
    });
  }

  if (input.gomeria.monto > 0) {
    gastos.push({
      turno_id: turno.id,
      categoria: "gomeria",
      monto: input.gomeria.monto,
      detalle: input.gomeria.detalle,
    });
  }

  if (gastos.length > 0) {
    const { error: gastoError } = await supabase.from("gasto").insert(gastos);
    if (gastoError) return { ok: false, error: gastoError.message };
  }

  await registrarAsistencia(
    input.chofer_id,
    input.fecha,
    input.tipo,
    input.hora_inicio
  );

  revalidatePath("/turno");
  revalidatePath("/recaudacion");
  revalidatePath("/gastos");
  revalidatePath("/choferes");
  revalidatePath("/cargar");

  return { ok: true };
}
