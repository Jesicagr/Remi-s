import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDataset, getPerfiles } from "@/lib/data";
import { getSesion } from "@/lib/perfil";
import { EquipoManager } from "@/components/EquipoManager";
import { Icon } from "@/components/Icon";

export const instant = false;

export default async function EquipoPage() {
  await connection();

  const sesion = await getSesion();
  if (sesion.rol !== "duenio") redirect("/turno");

  const [ds, perfiles] = await Promise.all([getDataset(), getPerfiles()]);

  return (
    <div className="max-w-3xl mx-auto space-y-space-md">
      <div className="flex items-center gap-2">
        <Icon name="groups" className="text-primary text-3xl" />
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface tracking-tight">
            Equipo
          </h1>
          <p className="text-body-sm text-on-surface-variant">
            Choferes, porcentajes y accesos de usuario.
          </p>
        </div>
      </div>

      {ds.demo && (
        <div className="bg-tertiary-container/20 border border-tertiary/30 rounded-lg px-space-sm py-2 text-body-sm text-tertiary">
          Modo demo: para administrar el equipo hay que configurar Supabase.
        </div>
      )}

      <EquipoManager choferes={ds.choferes} perfiles={perfiles} />
    </div>
  );
}
