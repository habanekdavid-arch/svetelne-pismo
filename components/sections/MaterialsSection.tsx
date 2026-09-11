import EyebrowPill from "@/components/ui/EyebrowPill";

type Material = {
  name: string;
  tagline: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
};

const MATERIALS: Material[] = [
  {
    name: "Odolné exteriérové",
    tagline: "Prémiový exteriér",
    description: "Hliníkový kompozit odolný voči počasiu — pevný aj v náročných podmienkach.",
    features: ["Odolný", "Exteriér"],
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7L12 2z" />
      </svg>
    ),
  },
  {
    name: "Luxusné",
    tagline: "Čistý svetelný efekt",
    description: "Priehľadný akryl s prémiovým leskom a hĺbkou presvitu — do interiéru aj exteriéru.",
    features: ["Čistý efekt", "Interiér aj exteriér"],
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    name: "Interiérové",
    tagline: "Tvarová voľnosť",
    description: "3D tlačený plast s jemným presvitom — ideálny pre detailné tvary dovnútra.",
    features: ["Tvarová voľnosť", "Interiér"],
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
  {
    name: "Cenovo dostupné",
    tagline: "Praktický interiér",
    description: "Ľahká penová doska — najúspornejšia voľba pre jednoduché interiérové nápisy.",
    features: ["Ľahký", "Dostupná cena"],
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <circle cx="7" cy="7" r="1" fill="currentColor" />
      </svg>
    ),
  },
];

export default function MaterialsSection() {
  return (
    <section id="materialy" className="py-24 md:py-32" style={{ background: "var(--color-background)" }}>
      <div className="mx-auto max-w-7xl px-5">

        {/* Heading */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-4 flex justify-center">
            <EyebrowPill>Materiály</EyebrowPill>
          </div>
          <h2
            className="main-heading text-3xl md:text-5xl"
            style={{ color: "var(--color-foreground)" }}
          >
            Z čoho môže byť vaše písmo
          </h2>
          <p
            className="mx-auto mt-4 max-w-md text-sm leading-6"
            style={{ color: "var(--color-muted)" }}
          >
            4 materiály, 4 použitia — vyberte podľa toho, kde bude nápis visieť.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MATERIALS.map((mat) => (
            <article
              key={mat.name}
              className="group relative flex flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              {/* Accent border overlay on hover */}
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ boxShadow: "inset 0 0 0 2px var(--accent)" }}
                aria-hidden="true"
              />

              {/* Icon — subtly yellow-tinted at rest, full accent on hover */}
              <div
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-300 group-hover:bg-(--accent)"
                style={{ background: "color-mix(in srgb, var(--accent) 12%, var(--color-background))" }}
              >
                <span
                  className="transition-colors duration-300 group-hover:text-black"
                  style={{ color: "var(--color-foreground)" }}
                >
                  {mat.icon}
                </span>
              </div>

              {/* Tagline */}
              <p
                className="mb-1 text-[10px] font-black uppercase tracking-[0.2em]"
                style={{ color: "var(--color-primary)" }}
              >
                {mat.tagline}
              </p>

              {/* Name */}
              <h3
                className="text-lg font-black uppercase tracking-tight"
                style={{ color: "var(--color-foreground)" }}
              >
                {mat.name}
              </h3>

              {/* Description */}
              <p
                className="mt-3 flex-1 text-sm leading-6"
                style={{ color: "var(--color-muted)" }}
              >
                {mat.description}
              </p>

              {/* Feature pills */}
              <div className="mt-6 flex flex-wrap gap-1.5">
                {mat.features.map((f) => (
                  <span
                    key={f}
                    className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase transition-colors duration-300 group-hover:bg-(--accent) group-hover:text-black"
                    style={{
                      background: "var(--color-background)",
                      color: "var(--color-muted)",
                    }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
}
