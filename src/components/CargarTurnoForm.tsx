"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, LiqRow, SectionTitle } from "./ui";
import { Icon } from "./Icon";
import { money, num } from "@/lib/format";
import { crearTurno } from "@/app/(app)/cargar/actions";
import type { Chofer, TipoTurno } from "@/lib/types";

const TURNOS: { value: TipoTurno; label: string }[] = [
  { value: "manana", label: "Mañana" },
  { value: "tarde", label: "Tarde" },
  { value: "noche", label: "Noche" },
  { value: "dia", label: "Día" },
];

function toNum(v: string): number {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-label-sm text-on-surface-variant mt-1 block">
          {hint}
        </span>
      )}
    </label>
  );
}

const inputCls =
  "w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary tabular-nums";

export function CargarTurnoForm({
  choferes,
  choferFijo,
  hoy,
}: {
  choferes: Chofer[];
  choferFijo: number | null;
  hoy: string;
}) {
  const [choferId, setChoferId] = useState<number>(
    choferFijo ?? choferes[0]?.id ?? 0
  );
  const [fecha, setFecha] = useState(hoy);
  const [tipo, setTipo] = useState<TipoTurno>("manana");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [kmLibres, setKmLibres] = useState("");
  const [kmOcupados, setKmOcupados] = useState("");
  const [viajes, setViajes] = useState("");
  const [recaudacion, setRecaudacion] = useState("");
  const [pactado, setPactado] = useState("");
  const [efectivo, setEfectivo] = useState("");
  const [transferencia, setTransferencia] = useState("");
  const [bonos, setBonos] = useState("");
  const [combustible, setCombustible] = useState("");
  const [litros, setLitros] = useState("");
  const [ticketComb, setTicketComb] = useState("");
  const [gomeria, setGomeria] = useState("");
  const [detalleGomeria, setDetalleGomeria] = useState("");

  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const chofer = choferes.find((c) => c.id === choferId);
  const pct = chofer?.pct_chofer ?? 0.67;
  const pctLabel = `${Math.round(pct * 100)}%`;

  const recNum = toNum(recaudacion);
  const cobroTotal = useMemo(
    () => toNum(efectivo) + toNum(transferencia) + toNum(bonos),
    [efectivo, transferencia, bonos]
  );
  const pactadoNum = pactado.trim() === "" ? null : toNum(pactado);
  const diferencia = pactadoNum === null ? null : recNum - pactadoNum;
  const parteChofer = recNum * pct;
  const gastoTotal = toNum(combustible) + toNum(gomeria);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!choferId) {
      setMsg({ ok: false, text: "Seleccioná un chofer." });
      return;
    }
    if (recNum <= 0) {
      setMsg({ ok: false, text: "Ingresá la recaudación del turno." });
      return;
    }

    startTransition(async () => {
      const res = await crearTurno({
        chofer_id: choferId,
        vehiculo_id: null,
        fecha,
        tipo,
        hora_inicio: horaInicio || null,
        hora_fin: horaFin || null,
        km_libres: toNum(kmLibres),
        km_ocupados: toNum(kmOcupados),
        cantidad_viajes: toNum(viajes),
        recaudacion: recNum,
        pactado: pactadoNum,
        efectivo: toNum(efectivo),
        transferencia: toNum(transferencia),
        bonos: toNum(bonos),
        combustible: {
          monto: toNum(combustible),
          litros: litros.trim() === "" ? null : toNum(litros),
          numero_ticket: ticketComb || null,
          detalle: null,
        },
        gomeria: {
          monto: toNum(gomeria),
          detalle: detalleGomeria || null,
        },
      });

      if (res.ok) {
        setMsg({ ok: true, text: "Turno guardado correctamente." });
        setRecaudacion("");
        setPactado("");
        setEfectivo("");
        setTransferencia("");
        setBonos("");
        setCombustible("");
        setLitros("");
        setTicketComb("");
        setGomeria("");
        setDetalleGomeria("");
        setKmLibres("");
        setKmOcupados("");
        setViajes("");
      } else {
        setMsg({ ok: false, text: res.error ?? "No se pudo guardar." });
      }
    });
  }

  const sinChoferes = choferes.length === 0;

  return (
    <form onSubmit={onSubmit} className="space-y-space-md">
      <Card className="space-y-space-sm">
        <SectionTitle icon="badge">Datos del Turno</SectionTitle>
        {sinChoferes && (
          <p className="text-body-sm text-error">
            No hay choferes cargados. Agregá uno antes de registrar un turno.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
          <Field label="Chofer">
            <select
              className={inputCls}
              value={choferId}
              onChange={(e) => setChoferId(Number(e.target.value))}
              disabled={choferFijo !== null}
            >
              {choferes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.apellido ?? ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha">
            <input
              type="date"
              className={inputCls}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </Field>
          <Field label="Turno">
            <select
              className={inputCls}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoTurno)}
            >
              {TURNOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-space-sm">
            <Field label="Hora inicio">
              <input
                type="time"
                className={inputCls}
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
              />
            </Field>
            <Field label="Hora fin">
              <input
                type="time"
                className={inputCls}
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card className="space-y-space-sm">
        <SectionTitle icon="account_balance_wallet">
          Recaudación y Pactado
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
          <Field label="Recaudación del turno">
            <input
              type="number"
              inputMode="decimal"
              className={inputCls}
              value={recaudacion}
              onChange={(e) => setRecaudacion(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Diferencia pactado" hint="Monto acordado del turno (opcional)">
            <input
              type="number"
              inputMode="decimal"
              className={inputCls}
              value={pactado}
              onChange={(e) => setPactado(e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>
        <div className="bg-surface-container-low border border-outline-variant rounded-lg p-space-sm space-y-space-xs">
          <LiqRow label={`Remuneración chofer (${pctLabel})`} value={parteChofer} dot="bg-tertiary" />
          <LiqRow
            label={`Comisión dueño (${Math.round((1 - pct) * 100)}%)`}
            value={recNum * (1 - pct)}
            dot="bg-primary"
          />
          {diferencia !== null && (
            <div className="flex items-center justify-between px-space-xs pt-1 border-t border-outline-variant/50">
              <span className="text-body-md text-on-surface-variant">
                Diferencia vs. pactado
              </span>
              <span
                className={`text-body-lg font-bold tabular-nums ${
                  diferencia >= 0 ? "text-primary" : "text-error"
                }`}
              >
                {money(diferencia)}
              </span>
            </div>
          )}
        </div>
      </Card>

      <Card className="space-y-space-sm">
        <SectionTitle icon="payments">Cobro</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
          <Field label="Efectivo">
            <input
              type="number"
              inputMode="decimal"
              className={inputCls}
              value={efectivo}
              onChange={(e) => setEfectivo(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Transferencia">
            <input
              type="number"
              inputMode="decimal"
              className={inputCls}
              value={transferencia}
              onChange={(e) => setTransferencia(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Bonos">
            <input
              type="number"
              inputMode="decimal"
              className={inputCls}
              value={bonos}
              onChange={(e) => setBonos(e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>
        <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg px-space-sm py-2">
          <span className="text-body-md font-semibold text-on-surface">
            Total cobrado
          </span>
          <span className="text-body-lg font-bold text-primary tabular-nums">
            {money(cobroTotal)}
          </span>
        </div>
        {recNum > 0 && cobroTotal !== recNum && (
          <p className="text-body-sm text-amber-500">
            El cobro ({money(cobroTotal)}) no coincide con la recaudación (
            {money(recNum)}).
          </p>
        )}
      </Card>

      <Card className="space-y-space-sm">
        <SectionTitle icon="local_gas_station">Gastos del Turno</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
          <Field label="Combustible ($)">
            <input
              type="number"
              inputMode="decimal"
              className={inputCls}
              value={combustible}
              onChange={(e) => setCombustible(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Litros">
            <input
              type="number"
              inputMode="decimal"
              className={inputCls}
              value={litros}
              onChange={(e) => setLitros(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="N° ticket combustible">
            <input
              type="text"
              className={inputCls}
              value={ticketComb}
              onChange={(e) => setTicketComb(e.target.value)}
            />
          </Field>
          <Field label="Gomería - Repuestos ($)">
            <input
              type="number"
              inputMode="decimal"
              className={inputCls}
              value={gomeria}
              onChange={(e) => setGomeria(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Detalle gomería / repuestos">
            <input
              type="text"
              className={inputCls}
              value={detalleGomeria}
              onChange={(e) => setDetalleGomeria(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex items-center justify-between bg-surface-container-low border border-outline-variant rounded-lg px-space-sm py-2">
          <span className="text-body-md font-semibold text-on-surface">
            Total gastos
          </span>
          <span className="text-body-lg font-bold text-error tabular-nums">
            -{money(gastoTotal)}
          </span>
        </div>
      </Card>

      <Card className="space-y-space-sm">
        <SectionTitle icon="speed">Kilometraje y Viajes</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
          <Field label="Km ocupados">
            <input
              type="number"
              inputMode="decimal"
              className={inputCls}
              value={kmOcupados}
              onChange={(e) => setKmOcupados(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Km libres">
            <input
              type="number"
              inputMode="decimal"
              className={inputCls}
              value={kmLibres}
              onChange={(e) => setKmLibres(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Cantidad de viajes">
            <input
              type="number"
              inputMode="decimal"
              className={inputCls}
              value={viajes}
              onChange={(e) => setViajes(e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>
        {(toNum(kmOcupados) > 0 || toNum(kmLibres) > 0) && (
          <p className="text-body-sm text-on-surface-variant">
            Km totales: {num(toNum(kmOcupados) + toNum(kmLibres))} km
          </p>
        )}
      </Card>

      {msg && (
        <div
          className={`rounded-lg px-space-sm py-2 text-body-md border ${
            msg.ok
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-error/10 border-error/30 text-error"
          }`}
        >
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || sinChoferes}
        className="w-full inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-bold rounded-xl px-space-md py-3 hover:brightness-95 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Icon name={pending ? "hourglass_top" : "save"} className="text-xl" />
        {pending ? "Guardando…" : "Guardar turno"}
      </button>
    </form>
  );
}
