// Jeden údaj v zákazníckej zóne: štítok navrchu, hodnota pod ním.
//
// Dlaždice namiesto riadkov tabuľky — tak vyzerá účet na vytlačto3d a obe
// stránky teraz čítajú rovnako. Prázdna hodnota sa nezamlčí, ukáže sa
// pomlčka: zákazník má vidieť, že údaj chýba.

export default function DataTile({
  label,
  value,
  children,
}: {
  label: string;
  /** Prostý text. Pre štítok alebo čokoľvek vlastné použite `children`. */
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="data-tile">
      <div
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--color-muted)" }}
      >
        {label}
      </div>
      <div className="mt-2">
        {children ?? (
          <span className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
            {value || "—"}
          </span>
        )}
      </div>
    </div>
  );
}
