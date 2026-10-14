// ===========================================================================
// AppRemi - Sesión y rol del usuario
// ===========================================================================

import { createClient, isSupabaseConfigured } from "./supabase/server";
import type { Perfil, Rol } from "./types";

export interface Sesion {
  demo: boolean;
  autenticado: boolean;
  rol: Rol;
  chofer_id: number | null;
  nombre: string | null;
}

export async function getSesion(): Promise<Sesion> {
  if (!isSupabaseConfigured()) {
    return {
      demo: true,
      autenticado: false,
      rol: "duenio",
      chofer_id: null,
      nombre: "Demo",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      demo: false,
      autenticado: false,
      rol: "chofer",
      chofer_id: null,
      nombre: null,
    };
  }

  const { data } = await supabase
    .from("perfil")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const perfil = data as Perfil | null;

  return {
    demo: false,
    autenticado: true,
    rol: perfil?.rol ?? "chofer",
    chofer_id: perfil?.chofer_id ?? null,
    nombre: perfil?.nombre ?? user.email ?? null,
  };
}
