export function Icon({
  name,
  className = "",
  fill = false,
}: {
  name: string;
  className?: string;
  fill?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`msi ${fill ? "msi-fill" : ""} ${className}`}
    >
      {name}
    </span>
  );
}
