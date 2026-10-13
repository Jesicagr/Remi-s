import { Icon } from "./Icon";
import { money, num } from "@/lib/format";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-surface-container-low border border-outline-variant/60 rounded-xl p-space-md ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  icon,
  children,
  right,
}: {
  icon?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-space-sm">
      <h2 className="flex items-center gap-1.5 text-headline-md font-semibold text-on-surface tracking-tight">
        {icon && <Icon name={icon} className="text-primary text-xl" />}
        {children}
      </h2>
      {right}
    </div>
  );
}

export function Kpi({
  label,
  value,
  sub,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: string;
  tone?: "default" | "primary" | "tertiary" | "amber" | "error";
}) {
  const toneText = {
    default: "text-on-surface",
    primary: "text-primary",
    tertiary: "text-tertiary",
    amber: "text-amber-500",
    error: "text-error",
  }[tone];
  const toneIcon = {
    default: "text-on-surface-variant",
    primary: "text-primary",
    tertiary: "text-tertiary",
    amber: "text-amber-500",
    error: "text-error",
  }[tone];

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-space-md flex flex-col justify-between">
      <div className="flex items-center justify-between mb-space-sm gap-2">
        <span className="text-label-sm uppercase tracking-wider text-on-surface-variant">
          {label}
        </span>
        {icon && (
          <span className="p-1 rounded bg-surface-container">
            <Icon name={icon} className={`text-[18px] ${toneIcon}`} />
          </span>
        )}
      </div>
      <div>
        <div
          className={`text-metric-display-mobile lg:text-metric-display font-bold tracking-tight tabular-nums ${toneText}`}
        >
          {value}
        </div>
        {sub && (
          <p className="text-body-sm text-on-surface-variant mt-1">{sub}</p>
        )}
      </div>
    </div>
  );
}

/** Fila de la liquidacion (etiqueta - valor) */
export function LiqRow({
  label,
  value,
  dot,
  highlight = false,
  sub,
}: {
  label: string;
  value: number;
  dot?: string;
  highlight?: boolean;
  sub?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between px-space-xs py-1.5 rounded ${
        highlight ? "bg-primary/10 border border-primary/30" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        {dot && (
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        )}
        <span
          className={`text-body-md ${
            highlight ? "font-semibold text-on-surface" : "text-on-surface"
          }`}
        >
          {label}
        </span>
        {sub && (
          <span className="text-label-sm text-on-surface-variant">{sub}</span>
        )}
      </div>
      <span
        className={`text-body-lg font-bold tabular-nums ${
          highlight ? "text-primary" : "text-on-surface"
        }`}
      >
        {money(value)}
      </span>
    </div>
  );
}

export function Bar({
  value,
  max,
  className = "bg-primary",
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${className}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function KmBadge({ ocupados, libres }: { ocupados: number; libres: number }) {
  const total = ocupados + libres;
  const po = total > 0 ? (ocupados / total) * 100 : 0;
  const pl = total > 0 ? 100 - po : 0;
  return (
    <div className="space-y-1.5">
      <div className="h-3.5 w-full bg-surface-container-highest rounded-full overflow-hidden flex p-0.5 border border-outline-variant/60">
        <div
          className="h-full bg-primary rounded-full"
          style={{ width: `${po}%` }}
          title={`${num(ocupados)} km ocupados`}
        />
        <div
          className="h-full bg-surface-variant rounded-full ml-0.5"
          style={{ width: `${pl}%` }}
          title={`${num(libres)} km libres`}
        />
      </div>
      <div className="flex justify-between text-label-sm text-on-surface-variant px-0.5">
        <span className="flex items-center gap-1 text-primary">
          <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          {num(ocupados)} km ocupados ({Math.round(po)}%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-surface-variant inline-block" />
          {num(libres)} km libres ({Math.round(pl)}%)
        </span>
      </div>
    </div>
  );
}
