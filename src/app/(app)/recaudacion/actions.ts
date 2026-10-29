"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface PeriodoResult {
  ok: boolean;
  error?: string;
}

const paths = ["/recaudacion", "/cargar", "/turno", "/gastos", "/choferes"];

function mesISO(mes: string): string | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return null;
  return `${mes}-01`;
}

export async function cerrarPeriodo(
  mes: string,
  motivo: string
): Promise<PeriodoResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Supabase no está configurado (modo demo): no se puede cerrar.",
    };
  }

  const fechaMes = mesISO(mes);
  if (!fechaMes) return { ok: false, error: "Mes inválido." };

  const texto = motivo.trim();
  if (texto.length < 5) {
    return { ok: false, error: "Escribí un motivo de al menos 5 caracteres." };
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
    return { ok: false, error: "Solo el dueño puede cerrar un período." };
  }

  const { error } = await supabase.from("periodo_cerrado").insert({
    mes: fechaMes,
    motivo: texto,
    cerrado_por: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ese período ya está cerrado." };
    }
    return { ok: false, error: error.message };
  }

  for (const p of paths) revalidatePath(p);
  return { ok: true };
}

export async function reabrirPeriodo(mes: string): Promise<PeriodoResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Supabase no está configurado (modo demo): no se puede reabrir.",
    };
  }

  const fechaMes = mesISO(mes);
  if (!fechaMes) return { ok: false, error: "Mes inválido." };

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
    return { ok: false, error: "Solo el dueño puede reabrir un período." };
  }

  const { data: eliminados, error } = await supabase
    .from("periodo_cerrado")
    .delete()
    .eq("mes", fechaMes)
    .select("mes");

  if (error) return { ok: false, error: error.message };
  if (!eliminados || eliminados.length === 0) {
    return { ok: false, error: "Ese período no estaba cerrado." };
  }

  for (const p of paths) revalidatePath(p);
  return { ok: true };
}
