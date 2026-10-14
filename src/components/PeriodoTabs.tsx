import Link from "next/link";
import { PERIODOS, type Periodo } from "@/lib/periodos";

export function PeriodoTabs({
  active,
  basePath = "/recaudacion",
}: {
  active: Periodo;
  basePath?: string;
}) {
  return (
    <div className="inline-flex rounded-lg border border-outline-variant bg-surface-container-low p-0.5">
      {PERIODOS.map((p) => {
        const on = p.value === active;
        return (
          <Link
            key={p.value}
            href={`${basePath}?p=${p.value}`}
            className={`px-3 py-1.5 rounded-md text-label-md font-semibold transition-colors ${
              on
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}
