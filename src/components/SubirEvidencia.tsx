"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { subirEvidencia } from "@/app/(app)/cargar/actions";
import { Icon } from "./Icon";

const inputCls =
  "w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/50";

const TIPOS = [
  { value: "foto_tablero", label: "Foto del tablero" },
  { value: "ticket", label: "Ticket de combustible" },
  { value: "comprobante", label: "Comprobante de gasto" },
  { value: "firma", label: "Firma / conformidad" },
  { value: "otro", label: "Otro" },
];

export function SubirEvidencia({ turnoId }: { turnoId: number }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState("foto_tablero");
  const [descripcion, setDescripcion] = useState("");
  const [archivoNombre, setArchivoNombre] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const archivo = fileRef.current?.files?.[0];
    if (!archivo) {
      setMsg({ ok: false, text: "Seleccioná una foto o un PDF." });
      return;
    }
    if (archivo.size > 10 * 1024 * 1024) {
      setMsg({ ok: false, text: "El archivo supera los 10 MB." });
      return;
    }

    const fd = new FormData();
    fd.set("turno_id", String(turnoId));
    fd.set("tipo", tipo);
    fd.set("descripcion", descripcion);
    fd.set("archivo", archivo);

    start(async () => {
      const res = await subirEvidencia(fd);
      if (!res.ok) {
        setMsg({ ok: false, text: res.error ?? "No se pudo subir." });
        return;
      }
      setMsg({ ok: true, text: "Evidencia guardada." });
      setDescripcion("");
      setArchivoNombre("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-space-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
        <label className="block space-y-1">
          <span className="text-label-md text-on-surface-variant">Tipo</span>
          <select
            className={inputCls}
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            disabled={pending}
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-label-md text-on-surface-variant">
            Archivo (máx. 10 MB)
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
            onChange={(e) =>
              setArchivoNombre(e.target.files?.[0]?.name ?? "")
            }
            disabled={pending}
            className="block w-full text-body-sm text-on-surface-variant file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-label-md file:font-bold file:text-on-primary hover:file:brightness-95"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-label-md text-on-surface-variant">
          Detalle (opcional)
        </span>
        <input
          className={inputCls}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej.: tablero al inicio del turno"
          disabled={pending}
        />
      </label>

      {msg && (
        <p
          className={`text-body-sm ${msg.ok ? "text-primary" : "text-error"}`}
          role={msg.ok ? "status" : "alert"}
        >
          {msg.text}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || !archivoNombre}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-label-md font-bold text-on-primary hover:brightness-95 active:scale-95 transition disabled:opacity-60"
        >
          <Icon
            name={pending ? "hourglass_top" : "upload"}
            className="text-[18px]"
          />
          {pending ? "Subiendo…" : "Adjuntar evidencia"}
        </button>
      </div>
    </form>
  );
}
