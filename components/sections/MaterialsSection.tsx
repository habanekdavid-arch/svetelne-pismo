import EyebrowPill from "@/components/ui/EyebrowPill";
import { MATERIALS } from "@/lib/options";

// Glyphs are FILLED, not stroked — solid white shapes sitting on the same
// solid amber badge the HowItWorks steps use, so the two sections read as one
// system rather than two icon styles.

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="white" aria-hidden="true">
      <path d="M12 2 3 6v6c0 5.2 3.7 9.9 9 11 5.3-1.1 9-5.8 9-11V6l-9-4Z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="white" aria-hidden="true">
      <path d="M12 2c.4 3.6 1.9 5.6 5.5 6.2C13.9 8.8 12.4 10.8 12 14.4c-.4-3.6-1.9-5.6-5.5-6.2C10.1 7.6 11.6 5.6 12 2Z" />
      <path d="M18.5 13.5c.2 1.9 1 2.9 2.9 3.2-1.9.3-2.7 1.3-2.9 3.2-.2-1.9-1-2.9-2.9-3.2 1.9-.3 2.7-1.3 2.9-3.2Z" />
      <path d="M6 15c.2 1.6.9 2.4 2.5 2.7C6.9 18 6.2 18.8 6 20.4c-.2-1.6-.9-2.4-2.5-2.7C5.1 17.4 5.8 16.6 6 15Z" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="white" aria-hidden="true">
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="M2 12.5 12 17.5l10-5-2.4-1.2L12 15.1 4.4 11.3 2 12.5Z" />
      <path d="M2 17.3 12 22.3l10-5-2.4-1.2L12 19.9 4.4 16.1 2 17.3Z" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="white" aria-hidden="true">
      <path d="M11.6 2H4a2 2 0 0 0-2 2v7.6c0 .5.2 1 .6 1.4l8.4 8.4a2 2 0 0 0 2.8 0l7.6-7.6a2 2 0 0 0 0-2.8L13 2.6c-.4-.4-.9-.6-1.4-.6ZM7 8.5A1.5 1.5 0 1 1 7 5.5a1.5 1.5 0 0 1 0 3Z" />
    </svg>
  );
}

// Everything shown here — name, tagline, sentence and bullets — comes from
// lib/options.ts MATERIALS, the same list the configurator offers, in the same
// order. The two used to be separate hand-kept lists, so the section could
// promise a material under one name and the configurator offer it under
// another. Only the icons live here; they are presentation, not catalogue.
const ICONS: Record<string, React.ReactNode> = {
  kompozit: <ShieldIcon />,
  plexi:    <SparkleIcon />,
  "3dtlac": <LayersIcon />,
  pvc:      <TagIcon />,
};

export default function MaterialsSection() {
  return (
    <section id="materialy" className="px-6 py-20 md:py-28" style={{ background: "var(--color-background)" }}>
      <div className="mx-auto max-w-7xl">

        {/* Heading */}
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <div className="mb-4 flex justify-center">
            <EyebrowPill>Materiály</EyebrowPill>
          </div>
          <h2
            className="section-heading text-4xl sm:text-5xl"
            style={{ color: "var(--color-foreground)" }}
          >
            Z čoho môže byť vaše písmo
          </h2>
          <p
            className="mx-auto mt-4 max-w-md leading-7"
            style={{ color: "var(--color-muted)" }}
          >
            4 materiály, 4 použitia — vyberte podľa toho, kde bude nápis visieť.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {MATERIALS.map((mat) => (
            <article
              key={mat.id}
              className="field-card material-card group flex flex-col rounded-field p-6"
            >
              {/* Solid amber badge with a blurred bloom behind it on hover —
                  the same treatment as the HowItWorks step badges. */}
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-full shadow-sm transition-all duration-500 ease-out group-hover:rotate-3 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-[#FFAE00]/30"
                style={{ background: "var(--accent)" }}
              >
                <div
                  className="absolute inset-0 rounded-full opacity-0 blur-xl transition-all duration-500 group-hover:scale-125 group-hover:opacity-40"
                  style={{ background: "var(--accent)" }}
                  aria-hidden="true"
                />
                <span className="relative z-10">{ICONS[mat.id]}</span>
              </div>

              <p
                className="mb-1 text-xs font-bold"
                style={{ color: "var(--color-accent-text)" }}
              >
                {mat.tagline}
              </p>

              <h3
                className="text-lg font-extrabold tracking-tight"
                style={{ color: "var(--color-foreground)" }}
              >
                {mat.displayName}
              </h3>

              {/* min-h reserves three lines so the bullet lists start at the
                  same height across all four cards — vytlacto3d uses the same
                  trick (min-h-[36px]) on its parameter-card hints. */}
              <p
                className="mt-2 min-h-21 text-sm leading-7"
                style={{ color: "var(--color-muted)" }}
              >
                {mat.subtitle}
              </p>

              {/* Variants as a bulleted list — markers fill amber in sequence
                  as the card is hovered (see .material-bullet in globals.css). */}
              <ul className="mt-5 flex-1 space-y-2.5">
                {mat.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <span
                      className="material-bullet mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      aria-hidden="true"
                    />
                    <span className="text-[13px] leading-5" style={{ color: "var(--color-foreground-soft)" }}>
                      {b}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
}
