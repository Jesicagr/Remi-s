// ===========================================================================
// AppRemi - Cliente Supabase con service_role (SOLO SERVIDOR)
// Nunca importar desde un componente cliente. Permite crear usuarios de Auth.
// ===========================================================================

import { createClient } from "@supabase/supabase-js";

export function isAdminConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
