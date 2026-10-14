"use server";

import { revalidatePath } from "next/cache";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import type { Rol } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function revalidar() {
  for (const p of ["/equipo", "/choferes", "/turno", "/recaudacion", "/gastos"]) {
    revalidatePath(p);
  }
}

async function clienteAutorizado() {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase no está configurado (modo demo)." as string, supabase: null };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Volvé a ingresar.", supabase: null };
  return { error: null, supabase };
}

export interface ChoferInput {
  id?: number;
  nombre: string;
  apellido: string | null;
  telefono: string | null;
  pct_chofer: number;
  activo: boolean;
}

export async function crearChofer(input: ChoferInput): Promise<ActionResult> {
  const { error, supabase } = await clienteAutorizado();
  if (error || !supabase) return { ok: false, error: error ?? undefined };

  if (!input.nombre.trim()) {
    return { ok: false, error: "El nombre es obligatorio." };
  }
  if (!(input.pct_chofer > 0 && input.pct_chofer < 1)) {
    return { ok: false, error: "El porcentaje debe estar entre 0 y 100." };
  }

  const { error: dbError } = await supabase.from("chofer").insert({
    nombre: input.nombre.trim(),
    apellido: input.apellido?.trim() || null,
    telefono: input.telefono?.trim() || null,
    pct_chofer: input.pct_chofer,
    activo: input.activo,
  });

  if (dbError) return { ok: false, error: dbError.message };
  revalidar();
  return { ok: true };
}

export async function actualizarChofer(input: ChoferInput): Promise<ActionResult> {
  const { error, supabase } = await clienteAutorizado();
  if (error || !supabase) return { ok: false, error: error ?? undefined };
  if (!input.id) return { ok: false, error: "Chofer inválido." };

  if (!input.nombre.trim()) {
    return { ok: false, error: "El nombre es obligatorio." };
  }
  if (!(input.pct_chofer > 0 && input.pct_chofer < 1)) {
    return { ok: false, error: "El porcentaje debe estar entre 0 y 100." };
  }

  const { error: dbError } = await supabase
    .from("chofer")
    .update({
      nombre: input.nombre.trim(),
      apellido: input.apellido?.trim() || null,
      telefono: input.telefono?.trim() || null,
      pct_chofer: input.pct_chofer,
      activo: input.activo,
    })
    .eq("id", input.id);

  if (dbError) return { ok: false, error: dbError.message };
  revalidar();
  return { ok: true };
}

export interface PerfilInput {
  id: string;
  rol: Rol;
  chofer_id: number | null;
}

export async function actualizarPerfil(input: PerfilInput): Promise<ActionResult> {
  const { error, supabase } = await clienteAutorizado();
  if (error || !supabase) return { ok: false, error: error ?? undefined };

  const { error: dbError } = await supabase
    .from("perfil")
    .update({
      rol: input.rol,
      chofer_id: input.rol === "chofer" ? input.chofer_id : null,
    })
    .eq("id", input.id);

  if (dbError) return { ok: false, error: dbError.message };
  revalidar();
  return { ok: true };
}

export interface NuevoUsuarioInput {
  email: string;
  password: string;
  nombre: string | null;
  rol: Rol;
  chofer_id: number | null;
}

export async function crearUsuario(
  input: NuevoUsuarioInput
): Promise<ActionResult> {
  // Verificar que quien llama sea el dueño (el admin client saltea RLS).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada. Volvé a ingresar." };

  const { data: perfil } = await supabase
    .from("perfil")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();

  if (perfil?.rol !== "duenio") {
    return { ok: false, error: "Solo el dueño puede crear usuarios." };
  }

  if (!isAdminConfigured()) {
    return {
      ok: false,
      error:
        "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor para crear usuarios.",
    };
  }

  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) {
    return { ok: false, error: "Ingresá un email válido." };
  }
  if (!input.password || input.password.length < 6) {
    return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }
  if (input.rol === "chofer" && !input.chofer_id) {
    return { ok: false, error: "Elegí a qué chofer corresponde el usuario." };
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });

  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: "No se pudo crear el usuario." };

  const { error: perfilError } = await admin.from("perfil").upsert({
    id: data.user.id,
    rol: input.rol,
    chofer_id: input.rol === "chofer" ? input.chofer_id : null,
    nombre: input.nombre?.trim() || email,
    email,
  });

  if (perfilError) {
    return {
      ok: false,
      error: `Usuario creado, pero falló el perfil: ${perfilError.message}`,
    };
  }

  revalidar();
  return { ok: true };
}
