"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cerrarPeriodo,
  reabrirPeriodo,
} from "@/app/(app)/recaudacion/actions";
import type { PeriodoCerrado } from "@/lib/types";
import { Icon } from "./Icon";

const inputCls =
  "w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/50";

function mesLabel(mes: string): string {
  const [anio, m] = mes.slice(0, 7).split("-");
  return `${m}/${anio}`;
}

export function CerrarPeriodo({ periodos }: { periodos: PeriodoCerrado[] }) {
  const router = useRouter();
  const hoy = new Date();
  const [mes, setMes] = useState(
    `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`
  );
  const [motivo, setMotivo] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function cerrar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const res = await cerrarPeriodo(mes, motivo);
      if (!res.ok) {
        setMsg({ ok: false, text: res.error ?? "No se pudo cerrar." });
        return;
      }
      setMotivo("");
      setMsg({ ok: true, text: "Período cerrado." });
      router.refresh();
    });
  }

  function reabrir(mesCerrar: string) {
    const ok = window.confirm(
      `¿Reabrir ${mesLabel(mesCerrar)}? Se van a poder cargar turnos y gastos de ese mes.`
    );
    if (!ok) return;

    setMsg(null);
    start(async () => {
      const res = await reabrirPeriodo(mesCerrar.slice(0, 7));
      if (!res.ok) {
        setMsg({ ok: false, text: res.error ?? "No se pudo reabrir." });
        return;
      }
      setMsg({ ok: true, text: "Período reabierto." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-space-sm">
      <p className="text-body-sm text-on-surface-variant">
        Al cerrar un mes, no se pueden cargar turnos ni gastos con fecha dentro
        de ese período. Los registros existentes no se modifican.
      </p>

      <form onSubmit={cerrar} className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
        <label className="block space-y-1">
          <span className="text-label-md text-on-surface-variant">Mes</span>
          <input
            type="month"
            className={inputCls}
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            disabled={pending}
          />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-label-md text-on-surface-variant">
            Motivo del cierre
          </span>
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej.: mes conciliado y rendido"
              disabled={pending}
            />
            <button
              type="submit"
              disabled={pending || motivo.trim().length < 5}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-label-md font-bold text-on-primary hover:brightness-95 active:scale-95 transition disabled:opacity-60"
            >
              <Icon
                name={pending ? "hourglass_top" : "lock"}
                className="text-[18px]"
              />
              Cerrar
            </button>
          </div>
        </label>
      </form>

      {msg && (
        <p
          className={`text-body-sm ${msg.ok ? "text-primary" : "text-error"}`}
          role={msg.ok ? "status" : "alert"}
        >
          {msg.text}
        </p>
      )}

      {periodos.length > 0 && (
        <div className="space-y-space-xs pt-space-xs border-t border-outline-variant/50">
          {periodos.map((p) => (
            <div
              key={p.mes}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-outline-variant bg-surface-container-low p-space-sm"
            >
              <div>
                <p className="text-body-md font-semibold text-on-surface flex items-center gap-1.5">
                  <Icon name="lock" className="text-[16px] text-primary" />
                  {mesLabel(p.mes)}
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  {p.motivo ?? "Sin motivo"}
                  {` • ${new Date(p.cerrado_en).toLocaleDateString("es-AR")}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => reabrir(p.mes)}
                disabled={pending}
                className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-2.5 py-1 text-label-sm font-semibold text-on-surface hover:bg-surface-container disabled:opacity-60"
              >
                <Icon name="lock_open" className="text-[16px]" />
                Reabrir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
