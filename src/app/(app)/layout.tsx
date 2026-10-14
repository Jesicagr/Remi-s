import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { getSesion } from "@/lib/perfil";

export const instant = false;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  const sesion = await getSesion();

  if (!sesion.demo && !sesion.autenticado) redirect("/login");

  return (
    <AppShell demo={sesion.demo} rol={sesion.rol} nombre={sesion.nombre}>
      {children}
    </AppShell>
  );
}
