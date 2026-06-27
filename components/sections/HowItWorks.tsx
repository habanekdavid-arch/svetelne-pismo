const steps = [
  {
    n: 1,
    title: "Napíš svoj text",
    desc: "Zadaj text, ktorý chceš mať na svetelnom nápise. Môže to byť meno, slogan alebo čokoľvek iné.",
  },
  {
    n: 2,
    title: "Vyberieš si svoje parametre",
    desc: "Zvol font, materiál, hrúbku a režim svietenia. Živý náhľad ti ukáže výsledok okamžite.",
  },
  {
    n: 3,
    title: "Objednáš si",
    desc: "Potvrdíš objednávku, my overíme parametre a pošleme ti záväznú cenu a termín.",
  },
  {
    n: 4,
    title: "A pár dní bude u vás",
    desc: "Nápis vyrobíme a doručíme priamo k vám. Inštalácia je jednoduchá a rýchla.",
  },
] as const;

export default function HowItWorks() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">

        {/* Heading */}
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="main-heading text-3xl md:text-5xl xl:text-6xl">
            Ako to funguje
          </h2>
          <p
            className="mx-auto mt-5 max-w-sm text-sm leading-relaxed"
            style={{ color: "var(--color-muted)" }}
          >
            Pokiaľ si neviete rady, v pár krokoch jednoducho
            <br className="hidden sm:block" />
            a rýchlo vám pomôžeme s výberom svetelného textu.
          </p>
        </div>

        {/* Steps */}
        <ol className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {steps.map((step) => (
            <li key={step.n} className="flex flex-col items-center text-center">

              {/* Circle */}
              <div
                className="mb-5 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full"
                style={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <span
                  className="text-lg font-black leading-none"
                  style={{ color: "var(--color-foreground)" }}
                >
                  {step.n}
                </span>
              </div>

              {/* Title */}
              <h3
                className="mb-2 text-[13px] font-black uppercase tracking-widest"
                style={{ color: "var(--color-foreground)" }}
              >
                {step.title}
              </h3>

              {/* Description */}
              <p
                className="max-w-[200px] text-[13px] leading-5"
                style={{ color: "var(--color-muted)" }}
              >
                {step.desc}
              </p>
            </li>
          ))}
        </ol>

      </div>
    </section>
  );
}
