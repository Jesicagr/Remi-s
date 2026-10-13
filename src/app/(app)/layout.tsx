import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const instant = false;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  const configured = isSupabaseConfigured();

  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  }

  return <AppShell demo={!configured}>{children}</AppShell>;
}
