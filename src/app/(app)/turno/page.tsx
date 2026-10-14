import { connection } from "next/server";
import { getDataset } from "@/lib/data";
import {
  gastosPorTurno,
  indicadoresTurno,
  nombreChofer,
  pctChofer,
  vehiculoChofer,
} from "@/lib/reportes";
import {
  catIcon,
  catLabels,
  fecha,
  money,
  num,
  turnoLabel,
} from "@/lib/format";
import { Card, KmBadge, LiqRow } from "@/components/ui";
import { Icon } from "@/components/Icon";

export const instant = false;

export default async function TurnoPage() {
  await connection();
  const ds = await getDataset();
  const gxT = gastosPorTurno(ds.gastos);

  const turnos = [...ds.turnos].sort((a, b) =>
    a.fecha === b.fecha ? b.id - a.id : b.fecha.localeCompare(a.fecha)
  );
  const t = turnos[0];

  if (!t) {
    return (
      <Card>
        <p className="text-body-md text-on-surface-variant">
          No hay turnos cargados todavía.
        </p>
      </Card>
    );
  }

  const gastos = gxT.get(t.id) ?? [];
  const pct = pctChofer(ds, t.chofer_id);
  const ind = indicadoresTurno(t, gastos, pct);
  const veh = vehiculoChofer(ds, t.chofer_id);
  const chofer = nombreChofer(ds, t.chofer_id);
  const pctLabel = `${Math.round(pct * 100)}%`;

  return (
    <div className="max-w-lg mx-auto space-y-space-md">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-bold text-on-surface tracking-tight">
          Turno Activo
        </h1>
        <span className="text-label-sm text-on-surface-variant bg-surface-container-low px-space-md py-space-xs rounded-lg border border-outline-variant flex items-center gap-1">
          <Icon name="calendar_today" className="text-[16px] text-primary" />
          {fecha(t.fecha)}
        </span>
      </div>

      {/* Estado actual */}
      <Card className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-label-sm tracking-wider text-on-surface-variant">
              ESTADO ACTUAL
            </span>
            <span className="bg-primary/20 text-primary border border-primary/40 px-1 rounded text-[10px] font-bold">
              EN LÍNEA
            </span>
          </div>
          <p className="text-headline-sm font-bold text-on-surface">
            {turnoLabel[t.tipo]}
          </p>
          <p className="text-body-sm text-on-surface-variant flex items-center gap-1">
            <Icon name="badge" className="text-[14px]" />
            {chofer}
            {veh && ` • ${veh.movil} (${veh.marca ?? ""} ${veh.modelo ?? ""})`}
          </p>
        </div>
        <span className="p-space-sm rounded bg-surface-container-high border border-outline-variant text-on-surface">
          <Icon name="swap_horiz" />
        </span>
      </Card>

      {/* Telemetría */}
      <Card className="space-y-space-md">
        <div className="flex items-center justify-between">
          <span className="text-label-md text-on-surface-variant">
            TELEMETRÍA DE VIAJES
          </span>
          <span className="flex items-center gap-1 bg-surface-container-highest px-2 py-0.5 rounded text-primary text-label-md tabular-nums">
            <Icon name="route" className="text-[16px]" />
            {num(ind.km_totales)} km Totales
          </span>
        </div>
        <KmBadge ocupados={Number(t.km_ocupados)} libres={Number(t.km_libres)} />
        <div className="grid grid-cols-3 gap-space-xs pt-1 border-t border-outline-variant/40">
          <div className="bg-surface-container-low border border-outline-variant p-space-sm rounded">
            <span className="text-label-sm text-on-surface-variant block">
              Viajes Hechos
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-metric-display-mobile tabular-nums font-bold">
                {t.cantidad_viajes}
              </span>
              <span className="text-body-sm text-primary">serv.</span>
            </div>
          </div>
          <div className="bg-surface-container-low border border-outline-variant p-space-sm rounded">
            <span className="text-label-sm text-on-surface-variant block">
              Km Ocupados
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-metric-display-mobile tabular-nums font-bold text-primary">
                {num(t.km_ocupados)}
              </span>
              <span className="text-body-sm text-on-surface-variant">km</span>
            </div>
          </div>
          <div className="bg-surface-container-low border border-outline-variant p-space-sm rounded">
            <span className="text-label-sm text-on-surface-variant block">
              Km Libres
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-metric-display-mobile tabular-nums font-bold">
                {num(t.km_libres)}
              </span>
              <span className="text-body-sm text-on-surface-variant">km</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Liquidación */}
      <Card className="space-y-space-md">
        <div className="flex items-center justify-between border-b border-outline-variant/50 pb-space-xs">
          <div className="flex items-center gap-1.5">
            <Icon name="calculate" className="text-primary text-xl" />
            <h2 className="text-headline-sm font-bold text-on-surface">
              Liquidación del Turno
            </h2>
          </div>
          <span className="bg-tertiary-container/20 text-tertiary border border-tertiary/30 px-2 py-0.5 rounded text-label-sm tabular-nums">
            Chofer {pctLabel} / Dueño {Math.round((1 - pct) * 100)}%
          </span>
        </div>

        <div className="bg-surface-container-low border border-outline-variant p-space-md rounded flex items-center justify-between">
          <div>
            <span className="text-label-sm text-on-surface-variant block">
              RECAUDACIÓN BRUTA TOTAL
            </span>
            <p className="text-body-sm text-on-surface-variant">
              {t.cantidad_viajes} viajes facturados en turno
            </p>
          </div>
          <span className="text-metric-display-mobile tabular-nums font-bold">
            {money(t.recaudacion)}
          </span>
        </div>

        {t.pactado !== null && ind.diferencia_pactado !== null && (
          <div className="bg-surface-container-low border border-outline-variant p-space-md rounded grid grid-cols-3 gap-space-xs text-center tabular-nums">
            <div>
              <span className="text-label-sm text-on-surface-variant block">
                Pactado
              </span>
              <span className="text-body-lg font-semibold text-on-surface">
                {money(t.pactado)}
              </span>
            </div>
            <div>
              <span className="text-label-sm text-on-surface-variant block">
                Recaudado
              </span>
              <span className="text-body-lg font-semibold text-on-surface">
                {money(t.recaudacion)}
              </span>
            </div>
            <div>
              <span className="text-label-sm text-on-surface-variant block">
                Diferencia
              </span>
              <span
                className={`text-body-lg font-bold ${
                  ind.diferencia_pactado >= 0 ? "text-primary" : "text-error"
                }`}
              >
                {money(ind.diferencia_pactado)}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-space-xs tabular-nums">
          <LiqRow
            label={`Neto Chofer (${pctLabel})`}
            value={ind.parte_chofer}
            dot="bg-tertiary"
          />
          <LiqRow
            label={`Comisión Dueño (${Math.round((1 - pct) * 100)}%)`}
            value={ind.monto_33}
            dot="bg-primary"
          />
          <LiqRow
            label="Diezmo / Retención (10% de la comisión)"
            value={-ind.diezmo}
          />
          <LiqRow
            label="Neto Dueño (tras diezmo)"
            value={ind.duenio_neto}
            highlight
          />
        </div>
      </Card>

      {/* Cobro del turno */}
      <Card className="space-y-space-sm">
        <div className="flex items-center justify-between border-b border-outline-variant/50 pb-space-xs">
          <div className="flex items-center gap-1.5">
            <Icon name="payments" className="text-primary text-xl" />
            <h2 className="text-headline-sm font-bold text-on-surface">
              Cobro del Turno
            </h2>
          </div>
          <span className="text-label-md tabular-nums font-bold text-primary">
            {money(ind.cobro_total)}
          </span>
        </div>
        <div className="space-y-space-xs tabular-nums">
          <LiqRow label="Efectivo" value={Number(t.efectivo ?? 0)} />
          <LiqRow label="Transferencia" value={Number(t.transferencia ?? 0)} />
          <LiqRow label="Bonos" value={Number(t.bonos ?? 0)} />
          <LiqRow label="Total cobrado" value={ind.cobro_total} highlight />
        </div>
        {ind.cobro_total !== Number(t.recaudacion) && (
          <p className="text-body-sm text-error">
            El cobro ({money(ind.cobro_total)}) no coincide con la recaudación
            ({money(t.recaudacion)}).
          </p>
        )}
      </Card>

      {/* Gastos del turno */}
      <Card className="space-y-space-sm">
        <div className="flex items-center justify-between border-b border-outline-variant/50 pb-space-xs">
          <div className="flex items-center gap-1.5">
            <Icon name="local_gas_station" className="text-error text-xl" />
            <h2 className="text-headline-sm font-bold text-on-surface">
              Gastos Operativos del Turno
            </h2>
          </div>
          <span className="text-label-md tabular-nums font-bold text-error">
            -{money(ind.gasto_total)}
          </span>
        </div>

        {gastos.length === 0 && (
          <p className="text-body-sm text-on-surface-variant">
            Sin gastos cargados en este turno.
          </p>
        )}

        {gastos.map((g) => (
          <div
            key={g.id}
            className="bg-surface-container-low border border-outline-variant p-space-sm rounded flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-surface-container-high border border-outline-variant flex items-center justify-center">
                <Icon
                  name={catIcon[g.categoria]}
                  className="text-primary text-[18px]"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-body-md font-bold text-on-surface">
                    {catLabels[g.categoria]}
                  </span>
                  {g.numero_ticket && (
                    <span className="bg-surface-container-highest text-on-surface-variant text-[10px] px-1.5 rounded border border-outline-variant">
                      #{g.numero_ticket}
                    </span>
                  )}
                </div>
                <span className="text-body-sm text-on-surface-variant">
                  {g.litros ? `${g.litros} L` : ""}
                  {g.detalle ? ` • ${g.detalle}` : ""}
                </span>
              </div>
            </div>
            <span className="text-body-lg font-bold text-error tabular-nums">
              -{money(g.monto)}
            </span>
          </div>
        ))}
      </Card>

      {/* Balance dueño */}
      <div className="bg-surface-container-high border-2 border-primary/50 p-space-md rounded-lg space-y-space-md">
        <div>
          <span className="text-label-md text-primary font-bold tracking-wider">
            UTILIDAD DUEÑO EN EL TURNO
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-metric-display text-primary font-bold tabular-nums">
              {money(ind.duenio_utilidad)}
            </span>
            <span className="text-label-md text-on-surface-variant text-right">
              Neto dueño ({money(ind.duenio_neto)})
              <br />- Gastos ({money(ind.gasto_total)})
            </span>
          </div>
        </div>
        <div className="border-t border-outline-variant/60 pt-space-sm grid grid-cols-2 gap-space-xs text-body-sm tabular-nums">
          <div className="text-on-surface-variant">
            Neto chofer: <strong className="text-on-surface">{money(ind.parte_chofer)}</strong>
          </div>
          <div className="text-on-surface-variant text-right">
            Comisión dueño: <strong className="text-tertiary">{money(ind.monto_33)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
