import { connection } from "next/server";
import { getDataset } from "@/lib/data";
import {
  gastosPorTurno,
  nombreChofer,
  resumenPorMes,
  resumenTotal,
} from "@/lib/reportes";
import { catIcon, catLabels, fecha, money, num } from "@/lib/format";
import type { CategoriaGasto } from "@/lib/types";
import { Bar, Card, Kpi, SectionTitle } from "@/components/ui";
import { Icon } from "@/components/Icon";

export const instant = false;

export default async function GastosPage() {
  await connection();
  const ds = await getDataset();
  const total = resumenTotal(ds);
  const porMes = resumenPorMes(ds);
  const rMes = porMes[0]?.resumen ?? total;
  const gxT = gastosPorTurno(ds.gastos);
  const turnoById = new Map(ds.turnos.map((t) => [t.id, t]));

  // Combustible por mes
  const combMes = porMes
    .map((m) => ({ clave: m.clave, monto: m.resumen.gasto_combustible }))
    .slice(0, 6)
    .reverse();
  const maxMes = Math.max(1, ...combMes.map((m) => m.monto));

  // Combustible / gasto por día
  const porDia = new Map<string, number>();
  for (const t of ds.turnos) {
    const gs = gxT.get(t.id) ?? [];
    const c = gs
      .filter((g) => g.categoria === "combustible")
      .reduce((s, g) => s + Number(g.monto), 0);
    if (c > 0) porDia.set(t.fecha, (porDia.get(t.fecha) ?? 0) + c);
  }
  const combustibleDia = [...porDia.entries()]
    .map(([clave, monto]) => ({ clave, monto }))
    .sort((a, b) => b.clave.localeCompare(a.clave))
    .slice(0, 7);
  const maxDia = Math.max(1, ...combustibleDia.map((d) => d.monto));

  // Por categoría
  const porCat = new Map<CategoriaGasto, number>();
  for (const g of ds.gastos) {
    porCat.set(g.categoria, (porCat.get(g.categoria) ?? 0) + Number(g.monto));
  }
  const categorias = [...porCat.entries()]
    .map(([clave, monto]) => ({ clave, monto }))
    .sort((a, b) => b.monto - a.monto);
  const maxCat = Math.max(1, ...categorias.map((c) => c.monto));

  // Historial de tickets
  const historial = [...ds.gastos]
    .sort((a, b) => b.creado_en.localeCompare(a.creado_en))
    .slice(0, 12);

  const litrosMes = ds.gastos
    .filter((g) => g.categoria === "combustible")
    .reduce((s, g) => s + Number(g.litros ?? 0), 0);

  return (
    <div className="space-y-space-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm">
        <div>
          <span className="text-label-sm text-on-surface-variant tracking-wider">
            CONTROL DE COSTOS
          </span>
          <h1 className="text-headline-md font-bold text-on-surface tracking-tight">
            Gastos &amp; Combustible
          </h1>
        </div>
        <span className="text-label-sm text-on-surface-variant bg-surface-container-low border border-outline-variant px-space-md py-space-xs rounded-lg flex items-center gap-1">
          <Icon name="local_gas_station" className="text-[16px] text-primary" />
          {num(litrosMes)} L cargados
        </span>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <Kpi
          label="Combustible Mes"
          value={money(rMes.gasto_combustible)}
          sub={`${((rMes.gasto_combustible / (rMes.gasto_total || 1)) * 100).toFixed(0)}% del gasto total`}
          icon="local_gas_station"
          tone="error"
        />
        <Kpi
          label="Otros Gastos Mes"
          value={money(rMes.gasto_otros)}
          sub="Peajes, mecánica, lavadero…"
          icon="build"
          tone="tertiary"
        />
        <Kpi
          label="Gasto Total Mes"
          value={money(rMes.gasto_total)}
          sub="Se descuenta de la parte del dueño"
          icon="receipt_long"
        />
        <Kpi
          label="Utilidad Dueño Mes"
          value={money(rMes.duenio_utilidad)}
          sub="Neto dueño − gastos"
          icon="trending_up"
          tone="primary"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        {/* Combustible por mes */}
        <Card>
          <SectionTitle icon="calendar_month">Combustible por Mes</SectionTitle>
          <div className="space-y-space-sm">
            {combMes.map((m) => (
              <div key={m.clave}>
                <div className="flex items-center justify-between text-body-sm mb-1">
                  <span className="text-on-surface">{m.clave}</span>
                  <span className="tabular-nums font-semibold">
                    {money(m.monto)}
                  </span>
                </div>
                <Bar value={m.monto} max={maxMes} className="bg-error" />
              </div>
            ))}
          </div>
        </Card>

        {/* Combustible por día */}
        <Card>
          <SectionTitle icon="today">Combustible por Día</SectionTitle>
          <div className="space-y-space-sm">
            {combustibleDia.length === 0 && (
              <p className="text-body-sm text-on-surface-variant">
                Sin cargas de combustible registradas.
              </p>
            )}
            {combustibleDia.map((d) => (
              <div key={d.clave}>
                <div className="flex items-center justify-between text-body-sm mb-1">
                  <span className="text-on-surface">
                    {d.clave.split("-").reverse().join("/")}
                  </span>
                  <span className="tabular-nums font-semibold">
                    {money(d.monto)}
                  </span>
                </div>
                <Bar value={d.monto} max={maxDia} className="bg-error" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
        {/* Por categoría */}
        <Card>
          <SectionTitle icon="donut_small">Por Categoría</SectionTitle>
          <div className="space-y-space-sm">
            {categorias.map((c) => (
              <div key={c.clave}>
                <div className="flex items-center justify-between text-body-sm mb-1">
                  <span className="flex items-center gap-1.5 text-on-surface">
                    <Icon
                      name={catIcon[c.clave]}
                      className="text-[16px] text-primary"
                    />
                    {catLabels[c.clave]}
                  </span>
                  <span className="tabular-nums font-semibold">
                    {money(c.monto)}
                  </span>
                </div>
                <Bar value={c.monto} max={maxCat} />
              </div>
            ))}
          </div>
        </Card>

        {/* Combustible por turno */}
        <Card className="lg:col-span-2">
          <SectionTitle icon="swap_horiz">Combustible por Turno</SectionTitle>
          <div className="space-y-space-xs">
            {[...gxT.entries()]
              .map(([turno_id, gs]) => ({
                turno_id,
                litros: gs
                  .filter((g) => g.categoria === "combustible")
                  .reduce((s, g) => s + Number(g.litros ?? 0), 0),
                monto: gs
                  .filter((g) => g.categoria === "combustible")
                  .reduce((s, g) => s + Number(g.monto), 0),
                tickets: gs.filter((g) => g.categoria === "combustible").length,
              }))
              .filter((x) => x.monto > 0)
              .sort((a, b) => b.monto - a.monto)
              .slice(0, 6)
              .map((x) => {
                const t = turnoById.get(x.turno_id);
                return (
                  <div
                    key={x.turno_id}
                    className="bg-surface-container border border-outline-variant/60 rounded p-space-sm flex items-center justify-between"
                  >
                    <div>
                      <div className="text-body-md text-on-surface font-medium">
                        {t ? fecha(t.fecha) : `Turno #${x.turno_id}`}
                      </div>
                      <div className="text-body-sm text-on-surface-variant">
                        {t ? nombreChofer(ds, t.chofer_id) : "—"} •{" "}
                        {num(x.litros, 1)} L • {x.tickets} ticket(s)
                      </div>
                    </div>
                    <span className="text-body-lg font-bold text-error tabular-nums">
                      {money(x.monto)}
                    </span>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>

      {/* Historial de tickets */}
      <Card>
        <SectionTitle icon="receipt_long">Historial de Comprobantes</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm tabular-nums">
            <thead>
              <tr className="text-on-surface-variant text-label-sm text-left">
                <th className="py-2">Ticket</th>
                <th className="py-2">Categoría</th>
                <th className="py-2">Turno / Chofer</th>
                <th className="py-2 text-right">Litros</th>
                <th className="py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((g) => {
                const t = turnoById.get(g.turno_id);
                return (
                  <tr key={g.id} className="border-t border-outline-variant/40">
                    <td className="py-2 font-mono text-on-surface">
                      {g.numero_ticket ? `#${g.numero_ticket}` : "—"}
                    </td>
                    <td className="py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon
                          name={catIcon[g.categoria]}
                          className="text-[16px] text-primary"
                        />
                        {catLabels[g.categoria]}
                      </span>
                    </td>
                    <td className="py-2 text-on-surface-variant">
                      {t ? `${fecha(t.fecha)} • ${nombreChofer(ds, t.chofer_id)}` : "—"}
                    </td>
                    <td className="py-2 text-right">
                      {g.litros ? `${num(g.litros, 1)} L` : "—"}
                    </td>
                    <td className="py-2 text-right font-bold text-error">
                      {money(g.monto)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
