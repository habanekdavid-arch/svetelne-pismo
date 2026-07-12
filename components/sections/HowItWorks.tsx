const steps = [
  {
    n: 1,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    title: "Napíšte svoj text",
    desc: "Zadaj text, ktorý chceš mať na svetelnom nápise. Môže to byť meno, slogan alebo čokoľvek iné.",
  },
  {
    n: 2,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    title: "Vyberte si svoje parametre",
    desc: "Zvol font, materiál, hrúbku a režim svietenia. Živý náhľad ti ukáže výsledok okamžite.",
  },
  {
    n: 3,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
    title: "Objednajte si",
    desc: "Potvrdíš objednávku, my overíme parametre a pošleme ti záväznú cenu a termín.",
  },
  {
    n: 4,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 5v3h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    title: "A pár dní bude u Vás",
    desc: "Nápis vyrobíme a doručíme priamo k vám. Inštalácia je jednoduchá a rýchla.",
  },
] as const;

export default function HowItWorks() {
  return (
    <section className="py-20 md:py-28" style={{ background: "var(--color-background)" }}>
      <div className="mx-auto max-w-7xl px-5">

        {/* Heading */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2
            className="reveal main-heading text-[50px]"
            style={{ color: "var(--color-foreground)" }}
          >
            Ako to funguje
          </h2>
          <p
            className="reveal delay-1 mx-auto mt-5 max-w-xl text-[20px] leading-relaxed"
            style={{ color: "var(--color-muted)" }}
          >
            Od nápadu k hotovému nápisu v štyroch jednoduchých krokoch.
          </p>
        </div>

        {/* Steps */}
        <ol className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li key={step.n} className={`reveal delay-${step.n} step-card flex flex-col items-center text-center`}>

              {/* Yellow icon badge */}
              <div
                className="icon-pop yellow-pulse mb-6 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: "var(--color-yellow)" }}
              >
                {step.icon}
              </div>

              {/* Step number */}
              <p
                className="mb-2 text-[10px] font-black uppercase tracking-[0.3em]"
                style={{ color: "var(--color-yellow)" }}
              >
                Krok {step.n}
              </p>

              {/* Title */}
              <h3
                className="mb-3 text-[18px] font-black uppercase leading-tight"
                style={{
                  fontFamily: "var(--font-century-gothic)",
                  color: "var(--color-foreground)",
                }}
              >
                {step.title}
              </h3>

              {/* Description */}
              <p
                className="max-w-52 text-[13px] leading-5"
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
