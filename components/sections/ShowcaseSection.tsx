"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSharedConfig } from "@/lib/config-context";
import { realizations } from "@/data/realizations";
import { matchRealization } from "@/lib/matchRealization";
import type { Realization } from "@/data/realizations";
import type { Config } from "@/lib/types";
import EyebrowPill from "@/components/ui/EyebrowPill";

// ── Default config used before the configurator publishes its first state ─────
const DEFAULT_CONFIG: Pick<Config, "signType" | "material"> = {
  signType: "illuminated",
  material: "plexi",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ShowcaseSection() {
  const { config } = useSharedConfig();
  const [visible, setVisible] = useState(true);

  const effective = config ?? DEFAULT_CONFIG;
  const { best, alternatives, isFallback } = matchRealization(effective, realizations);

  // Fade out → in whenever the matched realization changes
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 180);
    return () => clearTimeout(t);
  }, [best.id]);

  return (
    <section
      id="realizacie"
      className="py-24"
      style={{ background: "var(--color-background)" }}
    >
      <div className="mx-auto max-w-7xl px-5">

        {/* ── Heading ─────────────────────────────────────────────────────── */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-4 flex justify-center">
            <EyebrowPill>Realizácie</EyebrowPill>
          </div>
          <h2
            className="section-heading text-4xl sm:text-5xl"
            style={{ color: "var(--color-foreground)" }}
          >
            Pozri si, ako tvoj text
            <br />
            vyzerá v praxi
          </h2>
          <p
            className="mx-auto mt-4 max-w-lg leading-7"
            style={{ color: "var(--color-muted)" }}
          >
            {isFallback
              ? "Ukážka z nášho portfólia — vyber materiál a typ v konfigurátore pre personalizovaný výber."
              : "Na základe tvojho výberu sme vybrali najsedejúcu realizáciu z nášho portfólia."}
          </p>
        </div>

        {/* ── Cards — fade on match change ────────────────────────────────── */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        >
          {/* ── Main card ─────────────────────────────────────────────────── */}
          <MainCard realization={best} />

          {/* ── Alternative cards ─────────────────────────────────────────── */}
          {alternatives.length > 0 && (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {alternatives.map((r) => (
                <AltCard key={r.id} realization={r} />
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

function MainCard({ realization: r }: { realization: Realization }) {
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block overflow-hidden rounded-panel shadow-v3d-panel transition duration-300 hover:-translate-y-1"
      style={{ background: "var(--color-background)" }}
      aria-label={`Otvoriť realizáciu: ${r.title}`}
    >
      {/* Image */}
      <div className="relative aspect-[16/7] w-full overflow-hidden">
        <Image
          src={r.image}
          alt={r.title}
          fill
          sizes="(max-width: 768px) 100vw, 1280px"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          priority
          unoptimized
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)",
          }}
        />
        {/* Badges */}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Badge>{r.category}</Badge>
          <Badge variant="dim">{r.year}</Badge>
        </div>
      </div>

      {/* Text row */}
      <div className="flex items-end justify-between gap-4 p-6">
        <div>
          <p
            className="text-[11px] font-black uppercase tracking-widest"
            style={{ color: "var(--color-muted)" }}
          >
            {r.client}
          </p>
          <h3
            className="mt-1 text-2xl font-extrabold tracking-tight"
            style={{ color: "var(--color-foreground)" }}
          >
            {r.title}
          </h3>
        </div>

        <span
          className="shrink-0 rounded-full px-6 py-3 text-[11px] font-black uppercase tracking-widest transition-opacity group-hover:opacity-80"
          style={{
            background: "var(--color-foreground)",
            color: "var(--color-background)",
          }}
        >
          Pozrieť realizáciu
        </span>
      </div>
    </a>
  );
}

// ── Alternative card ──────────────────────────────────────────────────────────

function AltCard({ realization: r }: { realization: Realization }) {
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      className="field-card group flex gap-4 overflow-hidden rounded-field p-3"
      aria-label={`Otvoriť realizáciu: ${r.title}`}
    >
      {/* Thumbnail */}
      <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg">
        <Image
          src={r.image}
          alt={r.title}
          fill
          sizes="96px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-col justify-center">
        <p
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ color: "var(--color-muted)" }}
        >
          {r.category} · {r.year}
        </p>
        <p
          className="mt-0.5 truncate text-sm font-black leading-snug"
          style={{ color: "var(--color-foreground)" }}
        >
          {r.title}
        </p>
        <p
          className="mt-0.5 truncate text-[11px]"
          style={{ color: "var(--color-muted)" }}
        >
          {r.client}
        </p>
      </div>
    </a>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

function Badge({
  children,
  variant = "accent",
}: {
  children: React.ReactNode;
  variant?: "accent" | "dim";
}) {
  return (
    <span
      className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider"
      style={
        variant === "accent"
          ? { background: "var(--accent)", color: "#000" }
          : { background: "rgba(255,255,255,0.15)", color: "#fff" }
      }
    >
      {children}
    </span>
  );
}
