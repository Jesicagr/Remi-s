import { connection } from "next/server";
import { getDataset } from "@/lib/data";
import {
  fechaReferencia,
  resumenPorMes,
  resumenPorTipoTurno,
  resumenRango,
} from "@/lib/reportes";
import {
  labelBucket,
  periodoLabel,
  rangoDePeriodo,
  seriePeriodos,
  type Periodo,
} from "@/lib/periodos";
import { money, mesLabel, num, turnoLabel } from "@/lib/format";
import { Bar, Card, Kpi, LiqRow, SectionTitle } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { PeriodoTabs } from "@/components/PeriodoTabs";

export const instant = false;

const PERIODOS_VALIDOS: Periodo[] = ["dia", "semana", "mes", "anio"];

export default async function RecaudacionPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  await connection();
  const sp = await searchParams;
  const periodo: Periodo = PERIODOS_VALIDOS.includes(sp.p as Periodo)
    ? (sp.p as Periodo)
    : "mes";

  const ds = await getDataset();
  const ref = fechaReferencia(ds);

  const rango = rangoDePeriodo(periodo, ref);
  const rPer = resumenRango(ds, rango.desde, rango.hasta);

  const nBuckets = periodo === "dia" ? 14 : periodo === "semana" ? 12 : periodosTabla(periodo);
  const buckets = seriePeriodos(periodo, ref, nBuckets);
  const serie = buckets.map((b) => ({
    ...b,
    resumen: resumenRango(ds, b.desde, b.hasta),
  }));
  const maxSerie = Math.max(1, ...serie.map((s) => s.resumen.recaudacion));

  const porTipo = resumenPorTipoTurno(ds);
  const maxTipo = Math.max(1, ...porTipo.map((t) => t.resumen.recaudacion));
  const porMes = resumenPorMes(ds);

  const serieReciente = [...serie].reverse();
  const etiquetaPeriodo = periodoLabel(periodo, ref);

  return (
    <div className="space-y-space-md">
      <div className="flex flex-col gap-space-sm">
        <div className="flex items-center gap-1.5 text-on-surface-variant text-label-sm">
          <span>OPERACIONES FINANCIERAS</span>
          <span>•</span>
          <span className="text-primary font-semibold">MÉTRICAS</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm">
          <h1 className="text-headline-md font-bold text-on-surface tracking-tight">
            Métricas &amp; Rendición
          </h1>
          <PeriodoTabs active={periodo} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-label-sm text-on-surface-variant bg-surface-container-low border border-outline-variant px-space-md py-space-xs rounded-lg flex items-center gap-1">
            <Icon name="calendar_month" className="text-[16px] text-primary" />
            {etiquetaPeriodo}
          </span>
          <a
            href={`/recaudacion/export?p=${periodo}&tipo=periodos`}
            className="text-label-sm font-semibold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 px-space-md py-space-xs rounded-lg flex items-center gap-1 transition-colors"
          >
            <Icon name="download" className="text-[16px]" />
            CSV período
          </a>
          <a
            href={`/recaudacion/export?p=${periodo}&tipo=turnos`}
            className="text-label-sm font-semibold bg-surface-container-high text-on-surface border border-outline-variant hover:bg-surface-container-highest px-space-md py-space-xs rounded-lg flex items-center gap-1 transition-colors"
          >
            <Icon name="download" className="text-[16px]" />
            CSV turnos
          </a>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <Kpi
          label="Recaudación"
          value={money(rPer.recaudacion)}
          sub={`${rPer.turnos} turnos • ${num(rPer.viajes)} viajes`}
          icon="account_balance_wallet"
        />
        <Kpi
          label="Comisión Dueño"
          value={money(rPer.monto_33)}
          sub={`Diezmo ${money(rPer.diezmo)}`}
          icon="pie_chart"
          tone="primary"
        />
        <Kpi
          label="Gastos"
          value={money(rPer.gasto_total)}
          sub={`Combustible ${money(rPer.gasto_combustible)}`}
          icon="local_gas_station"
          tone="error"
        />
        <Kpi
          label="Utilidad Dueño"
          value={money(rPer.duenio_utilidad)}
          sub="Comisión − diezmo − gastos"
          icon="trending_up"
          tone="tertiary"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
        <Card className="lg:col-span-2">
          <SectionTitle
            right={
              <span className="text-label-sm text-on-surface-variant">
                Últimos {serie.length}
              </span>
            }
          >
            Evolución de Recaudación
          </SectionTitle>
          <div className="pt-space-md">
            <div className="h-44 w-full flex items-end justify-between gap-1.5 border-b border-outline-variant pb-2">
              {serie.map((d) => {
                const h = Math.max(
                  6,
                  Math.round((d.resumen.recaudacion / maxSerie) * 160)
                );
                return (
                  <div
                    key={d.clave}
                    className="flex-1 flex flex-col items-center gap-1 group"
                  >
                    <span className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity font-mono whitespace-nowrap">
                      {money(d.resumen.recaudacion)}
                    </span>
                    <div
                      className="w-full max-w-[20px] bg-primary rounded-t-sm"
                      style={{ height: `${h}px` }}
                    />
                    <span className="text-[10px] font-mono text-on-surface-variant whitespace-nowrap">
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-label-sm text-on-surface-variant pt-space-xs">
              <span>
                Promedio:{" "}
                <span className="text-on-surface font-semibold">
                  {money(
                    serie.reduce((s, d) => s + d.resumen.recaudacion, 0) /
                      (serie.length || 1)
                  )}
                </span>
              </span>
              <span>
                Total período:{" "}
                <span className="text-primary font-semibold">
                  {money(rPer.recaudacion)}
                </span>
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle
            right={
              <span className="text-label-sm text-on-surface-variant">Por tipo</span>
            }
          >
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
        <Card>
          <SectionTitle icon="view_list">Detalle por período</SectionTitle>
          <div className="space-y-space-xs">
            {serieReciente.slice(0, 10).map((d) => (
              <div
                key={d.clave}
                className="bg-surface-container border border-outline-variant/60 rounded p-space-sm flex items-center justify-between"
              >
                <div>
                  <div className="text-body-md text-on-surface font-medium">
                    {labelBucket(periodo, d.clave)}
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

        <Card className="flex flex-col justify-between">
          <SectionTitle icon="receipt_long">Liquidación del período</SectionTitle>
          <div className="grid grid-cols-2 gap-space-sm my-space-sm">
            <div className="bg-surface-container border border-outline-variant/60 rounded p-space-sm">
              <span className="text-label-sm text-on-surface-variant block">
                Combustible
              </span>
              <span className="text-body-lg font-bold tabular-nums text-error">
                {money(rPer.gasto_combustible)}
              </span>
            </div>
            <div className="bg-surface-container border border-outline-variant/60 rounded p-space-sm">
              <span className="text-label-sm text-on-surface-variant block">
                Gomería / Otros
              </span>
              <span className="text-body-lg font-bold tabular-nums text-error">
                {money(rPer.gasto_gomeria + rPer.gasto_otros)}
              </span>
            </div>
          </div>
          <div className="space-y-space-xs tabular-nums">
            <LiqRow label="Recaudación bruta" value={rPer.recaudacion} />
            <LiqRow
              label="Remuneración chofer"
              value={rPer.parte_chofer}
              dot="bg-tertiary"
            />
            <LiqRow label="Comisión dueño" value={rPer.monto_33} dot="bg-primary" />
            <LiqRow label="Diezmo (10% de la comisión)" value={-rPer.diezmo} />
            <LiqRow label="Gastos" value={-rPer.gasto_total} />
            <LiqRow label="Utilidad dueño" value={rPer.duenio_utilidad} highlight />
          </div>
        </Card>
      </div>

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
                  <td className="py-2 text-right">{money(m.resumen.parte_chofer)}</td>
                  <td className="py-2 text-right text-primary">
                    {money(m.resumen.monto_33)}
                  </td>
                  <td className="py-2 text-right text-amber-500">
                    {money(m.resumen.diezmo)}
                  </td>
                  <td className="py-2 text-right text-error">
                    {money(m.resumen.gasto_total)}
                  </td>
                  <td className="py-2 text-right font-semibold">
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

function periodosTabla(periodo: Periodo): number {
  return periodo === "mes" ? 12 : 6;
}
