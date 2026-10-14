"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, SectionTitle } from "./ui";
import { Icon } from "./Icon";
import { crearChofer, actualizarChofer, actualizarPerfil, crearUsuario } from "@/app/(app)/equipo/actions";
import type { Chofer, Perfil, Rol } from "@/lib/types";

const inputCls =
  "bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-body-md text-on-surface focus:outline-none focus:border-primary tabular-nums w-full";

function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <span
      className={`text-label-sm ${msg.ok ? "text-primary" : "text-error"}`}
    >
      {msg.text}
    </span>
  );
}

function Nombre({ c }: { c: Chofer }) {
  return (
    <span className="text-body-md font-semibold text-on-surface">
      {c.nombre} {c.apellido ?? ""}
    </span>
  );
}

function ChoferRow({ chofer }: { chofer: Chofer }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(chofer.nombre);
  const [apellido, setApellido] = useState(chofer.apellido ?? "");
  const [telefono, setTelefono] = useState(chofer.telefono ?? "");
  const [pct, setPct] = useState(String(Math.round(chofer.pct_chofer * 100)));
  const [activo, setActivo] = useState(chofer.activo);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function guardar() {
    setMsg(null);
    start(async () => {
      const res = await actualizarChofer({
        id: chofer.id,
        nombre,
        apellido,
        telefono,
        pct_chofer: Number(pct) / 100,
        activo,
      });
      setMsg({ ok: res.ok, text: res.ok ? "Guardado" : res.error ?? "Error" });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-space-sm space-y-space-xs">
      <div className="flex items-center justify-between">
        <Nombre c={{ ...chofer, nombre, apellido, activo }} />
        <label className="inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="accent-primary"
          />
          Activo
        </label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs">
        <input
          className={inputCls}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
        />
        <input
          className={inputCls}
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          placeholder="Apellido"
        />
        <input
          className={inputCls}
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Teléfono"
        />
        <div className="flex items-center gap-1">
          <input
            type="number"
            className={inputCls}
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            placeholder="%"
          />
          <span className="text-body-md text-on-surface-variant">%</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Msg msg={msg} />
        <button
          onClick={guardar}
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-md font-bold hover:brightness-95 active:scale-95 transition disabled:opacity-60"
        >
          <Icon name={pending ? "hourglass_top" : "save"} className="text-[18px]" />
          Guardar
        </button>
      </div>
    </div>
  );
}

function NuevoChofer() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [pct, setPct] = useState("67");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function crear() {
    setMsg(null);
    if (!nombre.trim()) {
      setMsg({ ok: false, text: "Ingresá el nombre." });
      return;
    }
    start(async () => {
      const res = await crearChofer({
        nombre,
        apellido,
        telefono,
        pct_chofer: Number(pct) / 100,
        activo: true,
      });
      if (res.ok) {
        setNombre("");
        setApellido("");
        setTelefono("");
        setPct("67");
        setMsg({ ok: true, text: "Chofer creado" });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "Error" });
      }
    });
  }

  return (
    <Card className="space-y-space-sm">
      <SectionTitle icon="person_add">Nuevo chofer</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs">
        <input
          className={inputCls}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
        />
        <input
          className={inputCls}
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          placeholder="Apellido"
        />
        <input
          className={inputCls}
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Teléfono"
        />
        <div className="flex items-center gap-1">
          <input
            type="number"
            className={inputCls}
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            placeholder="%"
          />
          <span className="text-body-md text-on-surface-variant">%</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Msg msg={msg} />
        <button
          onClick={crear}
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-md font-bold hover:brightness-95 active:scale-95 transition disabled:opacity-60"
        >
          <Icon name={pending ? "hourglass_top" : "add"} className="text-[18px]" />
          Crear chofer
        </button>
      </div>
    </Card>
  );
}

function generarPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function NuevoUsuario({ choferes }: { choferes: Chofer[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<Rol>("chofer");
  const [choferId, setChoferId] = useState<string>(
    choferes[0] ? String(choferes[0].id) : ""
  );
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function crear() {
    setMsg(null);
    start(async () => {
      const res = await crearUsuario({
        email,
        password,
        nombre,
        rol,
        chofer_id: rol === "chofer" && choferId ? Number(choferId) : null,
      });
      if (res.ok) {
        setMsg({ ok: true, text: `Usuario ${email} creado.` });
        setEmail("");
        setPassword("");
        setNombre("");
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "Error" });
      }
    });
  }

  return (
    <Card className="space-y-space-sm">
      <SectionTitle icon="person_add_alt">Nuevo usuario</SectionTitle>
      <p className="text-body-sm text-on-surface-variant">
        Crea la cuenta (email + contraseña) y define el rol. El chofer podrá
        ingresar y cargar sus turnos.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs">
        <input
          className={inputCls}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          autoComplete="off"
        />
        <div className="flex items-center gap-1">
          <input
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            type="text"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setPassword(generarPassword())}
            title="Generar contraseña"
            className="shrink-0 p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <Icon name="casino" className="text-[18px]" />
          </button>
        </div>
        <input
          className={inputCls}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre a mostrar (opcional)"
        />
        <select
          className={inputCls}
          value={rol}
          onChange={(e) => setRol(e.target.value as Rol)}
        >
          <option value="chofer">Chofer</option>
          <option value="duenio">Dueño</option>
        </select>
        {rol === "chofer" && (
          <select
            className={inputCls}
            value={choferId}
            onChange={(e) => setChoferId(e.target.value)}
          >
            {choferes.length === 0 && <option value="">— Creá un chofer primero —</option>}
            {choferes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.apellido ?? ""}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <Msg msg={msg} />
        <button
          onClick={crear}
          disabled={pending || !email || !password}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-md font-bold hover:brightness-95 active:scale-95 transition disabled:opacity-60"
        >
          <Icon name={pending ? "hourglass_top" : "person_add"} className="text-[18px]" />
          Crear usuario
        </button>
      </div>
    </Card>
  );
}

function PerfilRow({
  perfil,
  choferes,
}: {
  perfil: Perfil;
  choferes: Chofer[];
}) {
  const router = useRouter();
  const [rol, setRol] = useState<Rol>(perfil.rol);
  const [choferId, setChoferId] = useState<string>(
    perfil.chofer_id ? String(perfil.chofer_id) : ""
  );
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function guardar() {
    setMsg(null);
    start(async () => {
      const res = await actualizarPerfil({
        id: perfil.id,
        rol,
        chofer_id: choferId ? Number(choferId) : null,
      });
      setMsg({ ok: res.ok, text: res.ok ? "Guardado" : res.error ?? "Error" });
      if (res.ok) router.refresh();
    });
  }

  const vinculado = choferes.find((c) => c.id === perfil.chofer_id);
  const sinVinculo = rol === "chofer" && !choferId;

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-space-sm space-y-space-xs">
      <div className="flex items-center gap-2">
        <Icon name="account_circle" className="text-on-surface-variant" />
        <span className="text-body-md text-on-surface font-medium truncate">
          {perfil.email ?? perfil.nombre ?? perfil.id.slice(0, 8)}
        </span>
        {rol === "duenio" ? (
          <span className="bg-primary/20 text-primary border border-primary/40 px-1.5 py-0.5 rounded text-[10px] font-bold">
            DUEÑO
          </span>
        ) : vinculado ? (
          <span className="bg-tertiary-container/20 text-tertiary border border-tertiary/30 px-1.5 py-0.5 rounded text-[10px] font-bold">
            {vinculado.nombre} {vinculado.apellido ?? ""}
          </span>
        ) : (
          <span className="bg-error/10 text-error border border-error/30 px-1.5 py-0.5 rounded text-[10px] font-bold">
            SIN VÍNCULO
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs">
        <select
          className={inputCls}
          value={rol}
          onChange={(e) => setRol(e.target.value as Rol)}
        >
          <option value="chofer">Chofer</option>
          <option value="duenio">Dueño</option>
        </select>
        <select
          className={inputCls}
          value={choferId}
          onChange={(e) => setChoferId(e.target.value)}
          disabled={rol !== "chofer"}
        >
          <option value="">— Sin chofer vinculado —</option>
          {choferes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} {c.apellido ?? ""}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Msg msg={msg} />
        <button
          onClick={guardar}
          disabled={pending || sinVinculo}
          title={sinVinculo ? "Elegí un chofer para vincular" : undefined}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-md font-bold hover:brightness-95 active:scale-95 transition disabled:opacity-60"
        >
          <Icon name={pending ? "hourglass_top" : "save"} className="text-[18px]" />
          Guardar
        </button>
      </div>
    </div>
  );
}

export function EquipoManager({
  choferes,
  perfiles,
}: {
  choferes: Chofer[];
  perfiles: Perfil[];
}) {
  const yaVinculados = new Set(
    perfiles.map((p) => p.chofer_id).filter((x): x is number => x !== null)
  );

  return (
    <div className="space-y-space-md">
      <NuevoChofer />

      <Card className="space-y-space-sm">
        <SectionTitle icon="badge" right={
          <span className="text-label-sm text-on-surface-variant">
            {choferes.length} choferes
          </span>
        }>
          Choferes
        </SectionTitle>
        {choferes.length === 0 && (
          <p className="text-body-sm text-on-surface-variant">
            Todavía no hay choferes cargados.
          </p>
        )}
        <div className="space-y-space-xs">
          {choferes.map((c) => (
            <ChoferRow key={c.id} chofer={c} />
          ))}
        </div>
      </Card>

      <NuevoUsuario choferes={choferes} />

      <Card className="space-y-space-sm">
        <SectionTitle icon="manage_accounts" right={
          <span className="text-label-sm text-on-surface-variant">
            {perfiles.length} usuarios
          </span>
        }>
          Usuarios y roles
        </SectionTitle>
        <p className="text-body-sm text-on-surface-variant">
          Cambiá el rol de cada usuario y vinculá a los choferes con su cuenta.
        </p>
        {perfiles.length === 0 && (
          <p className="text-body-sm text-on-surface-variant">
            No hay usuarios para administrar.
          </p>
        )}
        <div className="space-y-space-xs">
          {perfiles.map((p) => (
            <PerfilRow key={p.id} perfil={p} choferes={choferes} />
          ))}
        </div>
        <p className="text-label-sm text-on-surface-variant">
          Vinculados: {yaVinculados.size} de {choferes.length} choferes.
        </p>
      </Card>
    </div>
  );
}
