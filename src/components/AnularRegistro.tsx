"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { anularRegistro } from "@/app/(app)/cargar/actions";
import { Icon } from "./Icon";

const inputCls =
  "w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/50";

export function AnularRegistro({
  tabla,
  registroId,
  etiqueta,
}: {
  tabla: "turno" | "gasto";
  registroId: number;
  etiqueta: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function cerrar() {
    if (pending) return;
    setOpen(false);
    setMotivo("");
    setMsg(null);
  }

  function confirmar() {
    setMsg(null);
    start(async () => {
      const res = await anularRegistro({
        tabla,
        registro_id: registroId,
        motivo,
      });
      if (!res.ok) {
        setMsg({ ok: false, text: res.error ?? "No se pudo anular." });
        return;
      }
      setOpen(false);
      setMotivo("");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg border border-error/40 px-2.5 py-1 text-label-sm font-semibold text-error hover:bg-error/10 active:scale-95 transition"
      >
        <Icon name="block" className="text-[16px]" />
        Anular
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Anular ${etiqueta}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrar();
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-low p-space-md space-y-space-sm shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-headline-sm font-bold text-on-surface">
                  Anular {tabla}
                </h2>
                <p className="text-body-sm text-on-surface-variant">{etiqueta}</p>
              </div>
              <button
                type="button"
                onClick={cerrar}
                disabled={pending}
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container"
                aria-label="Cerrar"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-space-sm text-body-sm text-on-surface">
              <p className="font-semibold">El registro no se borra.</p>
              <p className="text-on-surface-variant">
                Queda guardado como evidencia y deja de contar en los reportes.
                La anulación también queda registrada con tu usuario y la fecha.
              </p>
            </div>

            <label className="block space-y-1">
              <span className="text-label-md text-on-surface-variant">
                Motivo de la anulación
              </span>
              <textarea
                className={inputCls}
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej.: turno cargado por error, monto duplicado…"
                autoFocus
              />
            </label>

            {msg && (
              <p className="text-body-sm text-error" role="alert">
                {msg.text}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={cerrar}
                disabled={pending}
                className="rounded-lg border border-outline-variant px-3 py-1.5 text-label-md font-semibold text-on-surface hover:bg-surface-container disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={pending || motivo.trim().length < 5}
                className="inline-flex items-center gap-1.5 rounded-lg bg-error px-3 py-1.5 text-label-md font-bold text-on-error hover:brightness-95 active:scale-95 transition disabled:opacity-60"
              >
                <Icon
                  name={pending ? "hourglass_top" : "block"}
                  className="text-[18px]"
                />
                Confirmar anulación
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
