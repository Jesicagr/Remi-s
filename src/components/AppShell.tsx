"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const NAV = [
  { href: "/turno", label: "Turno", icon: "schedule" },
  { href: "/recaudacion", label: "Recaudación", icon: "payments" },
  { href: "/gastos", label: "Gastos", icon: "local_gas_station" },
  { href: "/choferes", label: "Choferes", icon: "badge" },
];

export function AppShell({
  children,
  demo,
}: {
  children: React.ReactNode;
  demo: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface shadow-md">
        <div className="flex items-center justify-between w-full px-gutter-mobile py-space-sm max-w-7xl mx-auto">
          <div className="flex items-center gap-space-sm">
            <Icon name="local_taxi" className="text-primary text-2xl" />
            <h1 className="text-headline-sm font-bold text-primary tracking-tight">
              Remi&apos;s
            </h1>
            {demo && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-tertiary-container/20 text-tertiary border border-tertiary/30 text-label-sm font-bold">
                Modo demo
              </span>
            )}
          </div>
          <div className="flex items-center gap-space-sm">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-high text-primary border border-primary/30 text-label-md font-semibold">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Turno Mañana
            </span>
            {isSupabaseConfigured() && (
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <Icon name="logout" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-gutter-mobile py-space-md pb-28 flex-1">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-gutter-mobile py-space-xs bg-surface-container-lowest shadow-2xl">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-space-xs px-space-sm rounded-lg active:scale-95 transition-all duration-100 ${
                active
                  ? "bg-surface-container-high text-primary border border-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icon
                name={item.icon}
                fill={active}
                className="text-2xl"
              />
              <span
                className={`text-label-sm mt-0.5 ${
                  active ? "font-bold" : ""
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
