import { connection } from "next/server";
import { getDataset } from "@/lib/data";
import { getSesion } from "@/lib/perfil";
import { hoyISO } from "@/lib/fechas";
import { CargarTurnoForm } from "@/components/CargarTurnoForm";
import { Icon } from "@/components/Icon";

export const instant = false;

export default async function CargarPage() {
  await connection();
  const [ds, sesion] = await Promise.all([getDataset(), getSesion()]);

  const choferes = ds.choferes.filter((c) => c.activo);
  const choferFijo = sesion.rol === "chofer" ? sesion.chofer_id : null;

  return (
    <div className="max-w-2xl mx-auto space-y-space-md">
      <div className="flex items-center gap-2">
        <Icon name="edit_note" className="text-primary text-3xl" />
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface tracking-tight">
            Cargar Turno
          </h1>
          <p className="text-body-sm text-on-surface-variant">
            Registrá la recaudación y los gastos del turno del chofer.
          </p>
        </div>
      </div>

      {ds.demo && (
        <div className="bg-tertiary-container/20 border border-tertiary/30 rounded-lg px-space-sm py-2 text-body-sm text-tertiary">
          Modo demo: el guardado requiere configurar Supabase.
        </div>
      )}

      <CargarTurnoForm
        choferes={choferes}
        choferFijo={choferFijo}
        hoy={hoyISO()}
      />
    </div>
  );
}
