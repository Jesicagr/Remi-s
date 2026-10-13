import { connection } from "next/server";
import { getDataset } from "@/lib/data";
import { resumenPorChofer, resumenPorMes, resumenTotal, vehiculoChofer } from "@/lib/reportes";
import { iniciales, money, num } from "@/lib/format";
import { Card, Kpi, SectionTitle } from "@/components/ui";
import { Icon } from "@/components/Icon";

export const instant = false;

export default async function ChoferesPage() {
  await connection();
  const ds = await getDataset();
  const total = resumenTotal(ds);
  const mes = resumenPorMes(ds)[0]?.clave ?? new Date().toISOString().slice(0, 7);
  const rMes = resumenPorMes(ds)[0]?.resumen ?? total;
  const porChofer = resumenPorChofer(ds, mes);

  const asisMes = ds.asistencia.filter((a) => a.fecha.slice(0, 7) === mes);

  function asist(choferId: number) {
    const rows = asisMes.filter((a) => a.chofer_id === choferId);
    return {
      registros: rows.length,
      asis1: rows.filter((a) => a.asis1).length,
      asis2: rows.filter((a) => a.asis2).length,
      trabajo: rows.filter((a) => a.asis1 || a.asis2).length,
      faltas: rows.filter((a) => !a.asis1 && !a.asis2).length,
    };
  }

  const activos = ds.choferes.filter((c) => c.activo).length;

  return (
    <div className="space-y-space-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm">
        <div>
          <span className="text-label-sm text-on-surface-variant tracking-wider">
            GESTIÓN DE PERSONAL
          </span>
          <h1 className="text-headline-md font-bold text-on-surface tracking-tight">
            Choferes &amp; Rendición
          </h1>
        </div>
        <span className="text-label-sm text-on-surface-variant bg-surface-container-low border border-outline-variant px-space-md py-space-xs rounded-lg flex items-center gap-1">
          <Icon name="groups" className="text-[16px] text-primary" />
          {activos} activos / {ds.choferes.length} totales
        </span>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <Kpi
          label="Recaudación Mes"
          value={money(rMes.recaudacion)}
          sub={`${rMes.turnos} turnos • ${num(rMes.viajes)} viajes`}
          icon="payments"
        />
        <Kpi
          label="Choferes (67%)"
          value={money(rMes.parte_chofer)}
          sub="A liquidar a los choferes"
          icon="badge"
          tone="tertiary"
        />
        <Kpi
          label="Dueño (33%)"
          value={money(rMes.monto_33)}
          sub="Comisión de la central"
          icon="pie_chart"
          tone="primary"
        />
        <Kpi
          label="Diezmo (10% del 33%)"
          value={money(rMes.diezmo)}
          sub={`Neto dueño ${money(rMes.duenio_neto)}`}
          icon="corporate_fare"
          tone="amber"
        />
      </section>

      {/* Tabla de liquidación por chofer */}
      <Card>
        <SectionTitle icon="receipt_long">Liquidación por Chofer</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm tabular-nums">
            <thead>
              <tr className="text-on-surface-variant text-label-sm text-left">
                <th className="py-2">Chofer</th>
                <th className="py-2 text-right">Turnos</th>
                <th className="py-2 text-right">Recaudación</th>
                <th className="py-2 text-right">Neto 67%</th>
                <th className="py-2 text-right">Dueño 33%</th>
                <th className="py-2 text-right">Diezmo</th>
                <th className="py-2 text-right">Neto dueño</th>
              </tr>
            </thead>
            <tbody>
              {porChofer.map(({ chofer_id, resumen }) => {
                const c = ds.choferes.find((x) => x.id === chofer_id);
                return (
                  <tr key={chofer_id} className="border-t border-outline-variant/40">
                    <td className="py-2 text-on-surface font-medium">
                      {c ? `${c.nombre} ${c.apellido ?? ""}` : "—"}
                    </td>
                    <td className="py-2 text-right">{resumen.turnos}</td>
                    <td className="py-2 text-right">
                      {money(resumen.recaudacion)}
                    </td>
                    <td className="py-2 text-right text-tertiary font-semibold">
                      {money(resumen.parte_chofer)}
                    </td>
                    <td className="py-2 text-right">{money(resumen.monto_33)}</td>
                    <td className="py-2 text-right text-amber-500">
                      {money(resumen.diezmo)}
                    </td>
                    <td className="py-2 text-right font-bold">
                      {money(resumen.duenio_neto)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Fichas de chofer con asistencia */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
        {ds.choferes.map((c) => {
          const a = asist(c.id);
          const veh = vehiculoChofer(ds, c.id);
          const r = porChofer.find((x) => x.chofer_id === c.id)?.resumen;
          const trabajoPct = a.registros > 0 ? (a.trabajo / a.registros) * 100 : 0;

          return (
            <Card key={c.id} className="space-y-space-sm">
              <div className="flex items-center gap-space-sm">
                <div className="w-11 h-11 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
                  {iniciales(c.nombre, c.apellido)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-body-lg font-bold text-on-surface truncate">
                      {c.nombre} {c.apellido ?? ""}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 rounded border ${
                        c.activo
                          ? "bg-primary/15 text-primary border-primary/40"
                          : "bg-surface-container-high text-on-surface-variant border-outline-variant"
                      }`}
                    >
                      {c.activo ? "ACTIVO" : "INACTIVO"}
                    </span>
                  </div>
                  <span className="text-body-sm text-on-surface-variant flex items-center gap-1">
                    <Icon name="directions_car" className="text-[14px]" />
                    {veh ? `${veh.movil} • ${veh.patente ?? ""}` : "Sin móvil"}
                  </span>
                </div>
              </div>

              <div className="bg-surface-container-low border border-outline-variant rounded p-space-sm">
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="text-label-sm text-on-surface-variant">
                    ASISTENCIA DEL MES
                  </span>
                  <span className="text-body-sm font-semibold text-primary">
                    {a.trabajo}/{a.registros} días
                  </span>
                </div>
                <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden mb-space-sm">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${trabajoPct}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="bg-surface-container rounded py-1">
                    <div className="text-body-lg font-bold text-primary tabular-nums">
                      {a.asis1}
                    </div>
                    <div className="text-label-sm text-on-surface-variant">
                      Asis 1
                    </div>
                  </div>
                  <div className="bg-surface-container rounded py-1">
                    <div className="text-body-lg font-bold text-tertiary tabular-nums">
                      {a.asis2}
                    </div>
                    <div className="text-label-sm text-on-surface-variant">
                      Asis 2
                    </div>
                  </div>
                  <div className="bg-surface-container rounded py-1">
                    <div className="text-body-lg font-bold text-error tabular-nums">
                      {a.faltas}
                    </div>
                    <div className="text-label-sm text-on-surface-variant">
                      Faltas
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-body-sm space-y-1 tabular-nums">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Recaudación</span>
                  <span className="font-semibold">{money(r?.recaudacion ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Neto chofer (67%)</span>
                  <span className="font-semibold text-tertiary">
                    {money(r?.parte_chofer ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Dueño 33%</span>
                  <span className="font-semibold">{money(r?.monto_33 ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Diezmo</span>
                  <span className="font-semibold text-amber-500">
                    {money(r?.diezmo ?? 0)}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
