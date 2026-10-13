"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

export default function LoginPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/turno");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-gutter-mobile py-space-xl bg-surface">
      <div className="w-full max-w-sm bg-surface-container-low border border-outline-variant rounded-xl p-space-lg space-y-space-md">
        <div className="flex items-center gap-space-sm">
          <Icon name="local_taxi" className="text-primary text-3xl" />
          <div>
            <h1 className="text-headline-md font-bold text-primary tracking-tight">
              Remi&apos;s
            </h1>
            <p className="text-body-sm text-on-surface-variant">
              Choferes &amp; Rendición mensual
            </p>
          </div>
        </div>

        {!configured ? (
          <div className="space-y-space-sm">
            <div className="p-space-sm rounded-lg bg-tertiary-container/20 border border-tertiary/30 text-body-sm text-on-surface">
              Supabase no está configurado. Defini{" "}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en{" "}
              <code className="font-mono">.env.local</code> para activar el login.
            </div>
            <a
              href="/turno"
              className="w-full min-h-[48px] bg-primary text-on-primary font-bold rounded flex items-center justify-center gap-2"
            >
              Entrar en modo demo
              <Icon name="arrow_forward" />
            </a>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-space-md">
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface px-3 py-3 rounded-lg outline-none"
                placeholder="chofer@remise.com"
              />
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-on-surface px-3 py-3 rounded-lg outline-none"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-body-sm text-error bg-error-container/40 border border-error/30 rounded p-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] bg-primary text-on-primary font-bold rounded flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Icon name={loading ? "hourglass_top" : "login"} />
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
