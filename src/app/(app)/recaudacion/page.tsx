import { connection } from "next/server";
import { getDataset } from "@/lib/data";
import {
  resumenPorDia,
  resumenPorMes,
  resumenPorTipoTurno,
  resumenTotal,
} from "@/lib/reportes";
import { money, mesLabel, num, turnoLabel } from "@/lib/format";
import { Bar, Card, Kpi, LiqRow, SectionTitle } from "@/components/ui";
import { Icon } from "@/components/Icon";

export const instant = false;

export default async function RecaudacionPage() {
  await connection();
  const ds = await getDataset();
  const total = resumenTotal(ds);
  const porMes = resumenPorMes(ds);
  const mesActual = porMes[0];
  const rMes = mesActual?.resumen ?? total;
  const porTipo = resumenPorTipoTurno(ds);
  const porDia = resumenPorDia(ds);
  const ultimos7 = porDia.slice(0, 7).reverse();
  const maxDia = Math.max(1, ...ultimos7.map((d) => d.resumen.recaudacion));
  const maxTipo = Math.max(1, ...porTipo.map((t) => t.resumen.recaudacion));

  return (
    <div className="space-y-space-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm">
        <div>
          <div className="flex items-center gap-1.5 text-on-surface-variant text-label-sm mb-0.5">
            <span>OPERACIONES FINANCIERAS</span>
            <span>•</span>
            <span className="text-primary font-semibold">CIERRE DE CICLO</span>
          </div>
          <h1 className="text-headline-md font-bold text-on-surface tracking-tight">
            Recaudación &amp; Rendición
          </h1>
        </div>
        <span className="text-label-sm text-on-surface-variant bg-surface-container-low border border-outline-variant px-space-md py-space-xs rounded-lg flex items-center gap-1">
          <Icon name="calendar_month" className="text-[16px] text-primary" />
          {mesActual ? mesLabel(mesActual.clave + "-01") : "Sin datos"}
        </span>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <Kpi
          label="Recaudación Total Mes"
          value={money(rMes.recaudacion)}
          sub={`${rMes.turnos} turnos • ${num(rMes.viajes)} viajes`}
          icon="account_balance_wallet"
        />
        <Kpi
          label="Comisión Dueño Acum."
          value={money(rMes.monto_33)}
          sub="Parte del dueño de la recaudación"
          icon="pie_chart"
          tone="primary"
        />
        <Kpi
          label="Diezmo Central (10% comisión)"
          value={money(rMes.diezmo)}
          sub="Retención de administración"
          icon="corporate_fare"
          tone="amber"
        />
        <Kpi
          label="Gastos Totales Mes"
          value={money(rMes.gasto_total)}
          sub={`Combustible ${money(rMes.gasto_combustible)}`}
          icon="local_gas_station"
          tone="error"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
        {/* Tendencia últimos días */}
        <Card className="lg:col-span-2">
          <SectionTitle right={
            <span className="text-label-sm text-on-surface-variant">
              Últimos {ultimos7.length} días
            </span>
          }>
            Tendencia de Recaudación
          </SectionTitle>
          <div className="pt-space-md">
            <div className="h-44 w-full flex items-end justify-between gap-2 border-b border-outline-variant pb-2">
              {ultimos7.map((d) => {
                const h = Math.max(
                  6,
                  Math.round((d.resumen.recaudacion / maxDia) * 160)
                );
                return (
                  <div
                    key={d.clave}
                    className="flex-1 flex flex-col items-center gap-1 group"
                  >
                    <span className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                      {money(d.resumen.recaudacion)}
                    </span>
                    <div
                      className="w-full max-w-[18px] bg-primary rounded-t-sm"
                      style={{ height: `${h}px` }}
                    />
                    <span className="text-[11px] font-mono text-on-surface-variant">
                      {d.clave.slice(8, 10)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-label-sm text-on-surface-variant pt-space-xs">
              <span>
                Promedio diario:{" "}
                <span className="text-on-surface font-semibold">
                  {money(
                    ultimos7.reduce((s, d) => s + d.resumen.recaudacion, 0) /
                      (ultimos7.length || 1)
                  )}
                </span>
              </span>
            </div>
          </div>
        </Card>

        {/* Recaudación por turno */}
        <Card>
          <SectionTitle right={
            <span className="text-label-sm text-on-surface-variant">
              Por tipo
            </span>
          }>
            Recaudación por Turno
          </SectionTitle>
          <div className="space-y-space-sm">
            {porTipo.map((t) => (
              <div
                key={t.clave}
                className="bg-surface-container border border-outline-variant/60 rounded p-space-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-label-md text-on-surface">
                    {turnoLabel[t.clave] ?? t.clave}
                  </span>
                  <span className="text-body-md font-bold tabular-nums">
                    {money(t.resumen.recaudacion)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-body-sm text-on-surface-variant mb-2">
                  <span>
                    Dueño:{" "}
                    <strong className="text-tertiary font-mono">
                      {money(t.resumen.monto_33)}
                    </strong>
                  </span>
                  <span>{t.resumen.turnos} turnos</span>
                </div>
                <Bar value={t.resumen.recaudacion} max={maxTipo} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        {/* Detalle diario */}
        <Card>
          <SectionTitle icon="view_list">Detalle Diario &amp; Comisión Dueño</SectionTitle>
          <div className="space-y-space-xs">
            {porDia.slice(0, 8).map((d) => (
              <div
                key={d.clave}
                className="bg-surface-container border border-outline-variant/60 rounded p-space-sm flex items-center justify-between"
              >
                <div>
                  <div className="text-body-md text-on-surface font-medium">
                    {d.clave.split("-").reverse().join("/")}
                  </div>
                  <div className="text-body-sm text-on-surface-variant">
                    {d.resumen.turnos} turnos • {num(d.resumen.km_totales)} km
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-body-lg font-bold tabular-nums">
                    {money(d.resumen.recaudacion)}
                  </div>
                  <div className="text-body-sm text-tertiary font-mono">
                    Dueño: <strong>{money(d.resumen.monto_33)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Gastos consolidados */}
        <Card className="flex flex-col justify-between">
          <SectionTitle icon="receipt_long">Gastos del Mes</SectionTitle>
          <div className="grid grid-cols-2 gap-space-sm my-space-sm">
            <div className="bg-surface-container border border-outline-variant/80 rounded p-space-sm">
              <div className="flex items-center gap-1 text-label-sm text-on-surface-variant mb-1">
                <Icon name="local_gas_station" className="text-[16px] text-error" />
                Combustible
              </div>
              <div className="text-headline-sm font-bold tabular-nums">
                {money(rMes.gasto_combustible)}
              </div>
            </div>
            <div className="bg-surface-container border border-outline-variant/80 rounded p-space-sm">
              <div className="flex items-center gap-1 text-label-sm text-on-surface-variant mb-1">
                <Icon name="build" className="text-[16px] text-tertiary" />
                Otros
              </div>
              <div className="text-headline-sm font-bold tabular-nums">
                {money(rMes.gasto_otros + rMes.gasto_gomeria)}
              </div>
            </div>
          </div>
          <div className="space-y-space-xs tabular-nums">
            <LiqRow label="Recaudación bruta" value={rMes.recaudacion} />
            <LiqRow label="Comisión dueño" value={rMes.monto_33} dot="bg-primary" />
            <LiqRow label="Diezmo (10% de la comisión)" value={-rMes.diezmo} />
            <LiqRow label="Gastos del mes" value={-rMes.gasto_total} />
            <LiqRow label="Utilidad dueño" value={rMes.duenio_utilidad} highlight />
          </div>
        </Card>
      </div>

      {/* Resumen mensual */}
      <Card>
        <SectionTitle icon="calendar_month">Resumen por Mes</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm tabular-nums">
            <thead>
              <tr className="text-on-surface-variant text-label-sm text-left">
                <th className="py-2">Mes</th>
                <th className="py-2 text-right">Recaudación</th>
                <th className="py-2 text-right">Chofer</th>
                <th className="py-2 text-right">Comisión dueño</th>
                <th className="py-2 text-right">Diezmo</th>
                <th className="py-2 text-right">Gastos</th>
                <th className="py-2 text-right">Utilidad dueño</th>
              </tr>
            </thead>
            <tbody>
              {porMes.map((m) => (
                <tr key={m.clave} className="border-t border-outline-variant/40">
                  <td className="py-2 text-on-surface font-medium">
                    {mesLabel(m.clave + "-01")}
                  </td>
                  <td className="py-2 text-right">{money(m.resumen.recaudacion)}</td>
                  <td className="py-2 text-right text-tertiary">
                    {money(m.resumen.parte_chofer)}
                  </td>
                  <td className="py-2 text-right">{money(m.resumen.monto_33)}</td>
                  <td className="py-2 text-right text-amber-500">
                    {money(m.resumen.diezmo)}
                  </td>
                  <td className="py-2 text-right text-error">
                    {money(m.resumen.gasto_total)}
                  </td>
                  <td className="py-2 text-right font-bold">
                    {money(m.resumen.duenio_utilidad)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
