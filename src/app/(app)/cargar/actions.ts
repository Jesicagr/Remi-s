"use server";

import { createHash, randomUUID } from "node:crypto";
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
 * Registra la asistencia como marcas inmutables derivadas del turno. Es
 * idempotente: un segundo turno del mismo dia/hora no duplica la marca.
 * Si la tabla nueva no existe (deploy viejo), cae al upsert historico.
 */
async function registrarAsistencia(
  choferId: number,
  turnoId: number,
  fecha: string,
  tipo: TipoTurno,
  horaInicio: string | null
) {
  if (!isAdminConfigured()) return;
  try {
    const admin = createAdminClient();
    const marca = asistenciaDeTurno(tipo, horaInicio);

    const marcas: Record<string, unknown>[] = [];
    if (marca.asis1) {
      marcas.push({
        chofer_id: choferId,
        turno_id: turnoId,
        fecha,
        tipo: "asis1",
        hora: marca.asis1_hora,
        origen: "turno",
      });
    }
    if (marca.asis2) {
      marcas.push({
        chofer_id: choferId,
        turno_id: turnoId,
        fecha,
        tipo: "asis2",
        hora: marca.asis2_hora,
        origen: "turno",
      });
    }

    if (marcas.length === 0) return;

    const { error } = await admin.from("marca_asistencia").upsert(marcas, {
      onConflict: "chofer_id,fecha,tipo",
      ignoreDuplicates: true,
    });

    if (!error) return;

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

  const turnoPayload = {
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
  };

  interface GastoNuevo {
    categoria: string;
    monto: number;
    litros: number | null;
    numero_ticket: string | null;
    detalle: string | null;
  }

  const gastos: GastoNuevo[] = [];

  if (input.combustible.monto > 0) {
    gastos.push({
      categoria: "combustible",
      monto: input.combustible.monto,
      litros: input.combustible.litros,
      numero_ticket: input.combustible.numero_ticket,
      detalle: input.combustible.detalle,
    });
  }

  if (input.gomeria.monto > 0) {
    gastos.push({
      categoria: "gomeria",
      monto: input.gomeria.monto,
      litros: null,
      numero_ticket: null,
      detalle: input.gomeria.detalle,
    });
  }

  let turnoId: number | null = null;

  // Alta atomica (turno + gastos en una sola transaccion).
  const { data: rpcId, error: rpcError } = await supabase.rpc("registrar_turno", {
    p_turno: turnoPayload,
    p_gastos: gastos,
  });

  if (!rpcError) {
    turnoId = Number(rpcId);
  } else if (rpcError.code === "PGRST202") {
    // La migracion todavia no se aplico: alta historica en dos pasos.
    const { data: turno, error } = await supabase
      .from("turno")
      .insert(turnoPayload)
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    turnoId = turno.id;

    if (gastos.length > 0) {
      const { error: gastoError } = await supabase
        .from("gasto")
        .insert(gastos.map((g) => ({ ...g, turno_id: turno.id })));
      if (gastoError) return { ok: false, error: gastoError.message };
    }
  } else {
    return { ok: false, error: rpcError.message };
  }

  if (turnoId == null || !Number.isFinite(turnoId)) {
    return { ok: false, error: "No se pudo identificar el turno guardado." };
  }

  await registrarAsistencia(
    input.chofer_id,
    turnoId,
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

const MAX_EVIDENCIA_BYTES = 10 * 1024 * 1024;
const TIPOS_EVIDENCIA = new Set([
  "foto_tablero",
  "ticket",
  "comprobante",
  "firma",
  "otro",
]);
const MIME_EVIDENCIA = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

function nombreSeguro(nombre: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return (
    base
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "archivo"
  );
}

/**
 * Guarda una evidencia (foto/ticket/PDF) en Storage y su metadata en la base.
 * El archivo original no se modifica: si hace falta corregir, se sube otro.
 */
export async function subirEvidencia(
  formData: FormData
): Promise<CrearTurnoResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Supabase no está configurado (modo demo): no se puede subir.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sesión expirada. Volvé a ingresar." };
  }

  const turnoId = Number(formData.get("turno_id"));
  if (!Number.isInteger(turnoId) || turnoId <= 0) {
    return { ok: false, error: "Turno inválido." };
  }

  const tipo = String(formData.get("tipo") ?? "");
  if (!TIPOS_EVIDENCIA.has(tipo)) {
    return { ok: false, error: "Tipo de evidencia inválido." };
  }

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: "Seleccioná un archivo." };
  }
  if (archivo.size > MAX_EVIDENCIA_BYTES) {
    return { ok: false, error: "El archivo supera los 10 MB." };
  }
  if (!archivo.type || !MIME_EVIDENCIA.has(archivo.type)) {
    return {
      ok: false,
      error: "Formato no admitido. Usá JPG, PNG, WEBP, HEIC o PDF.",
    };
  }

  const { data: turno } = await supabase
    .from("turno")
    .select("id,chofer_id")
    .eq("id", turnoId)
    .maybeSingle();

  if (!turno) {
    return { ok: false, error: "El turno no existe." };
  }

  const { data: perfil } = await supabase
    .from("perfil")
    .select("rol,chofer_id")
    .eq("id", user.id)
    .maybeSingle();

  const permitido =
    perfil?.rol === "duenio" ||
    (perfil?.chofer_id != null && perfil.chofer_id === turno.chofer_id);

  if (!permitido) {
    return { ok: false, error: "No tenés permiso para adjuntar a este turno." };
  }

  const hash = createHash("sha256")
    .update(new Uint8Array(await archivo.arrayBuffer()))
    .digest("hex");
  const storagePath = `${turnoId}/${randomUUID()}-${nombreSeguro(archivo.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("evidencias")
    .upload(storagePath, archivo, {
      contentType: archivo.type,
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const descripcion = String(formData.get("descripcion") ?? "").trim();

  const { error } = await supabase.from("evidencia").insert({
    turno_id: turnoId,
    tipo,
    storage_path: storagePath,
    nombre_archivo: archivo.name,
    descripcion: descripcion || null,
    mime_type: archivo.type,
    tamano_bytes: archivo.size,
    sha256: hash,
    registrado_por: user.id,
  });

  if (error) {
    if (isAdminConfigured()) {
      const admin = createAdminClient();
      await admin.storage.from("evidencias").remove([storagePath]);
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/turno");
  revalidatePath("/gastos");
  return { ok: true };
}

const pathsRegistro = [
  "/turno",
  "/recaudacion",
  "/gastos",
  "/choferes",
  "/cargar",
];

/**
 * Anula un turno o un gasto sin borrarlo ni modificarlo. El original queda
 * como evidencia y los reportes dejan de contarlo.
 */
export async function anularRegistro(input: {
  tabla: "turno" | "gasto";
  registro_id: number;
  motivo: string;
}): Promise<CrearTurnoResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Supabase no está configurado (modo demo): no se puede anular.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sesión expirada. Volvé a ingresar." };
  }

  const { data: perfil } = await supabase
    .from("perfil")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();

  if (perfil?.rol !== "duenio") {
    return { ok: false, error: "Solo el dueño puede anular registros." };
  }

  const motivo = input.motivo.trim();
  if (motivo.length < 5) {
    return {
      ok: false,
      error: "Escribí un motivo de al menos 5 caracteres para dejar trazabilidad.",
    };
  }

  const fuente = input.tabla === "turno" ? "turno" : "gasto";
  const { data: original } = await supabase
    .from(fuente)
    .select("id")
    .eq("id", input.registro_id)
    .maybeSingle();

  if (!original) {
    return { ok: false, error: "El registro que querés anular no existe." };
  }

  const { data: previa } = await supabase
    .from("correccion")
    .select("id")
    .eq("tabla", input.tabla)
    .eq("registro_id", input.registro_id)
    .eq("tipo", "anulacion")
    .maybeSingle();

  if (previa) {
    return { ok: false, error: "Ese registro ya estaba anulado." };
  }

  const { error } = await supabase.from("correccion").insert({
    tabla: input.tabla,
    registro_id: input.registro_id,
    tipo: "anulacion",
    motivo,
    creado_por: user.id,
  });

  if (error) return { ok: false, error: error.message };

  for (const p of pathsRegistro) revalidatePath(p);
  return { ok: true };
}
