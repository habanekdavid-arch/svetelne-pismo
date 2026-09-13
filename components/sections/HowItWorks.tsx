// Structure, spacing and every hover transition are taken verbatim from
// vytlacto3d's HowItWorks: a round amber badge with a blurred glow behind it,
// a black number bubble clipped to its top-right corner, and a card that lifts
// while the badge scales and tilts. Only the icons and the copy differ — they
// describe ordering a lit sign instead of uploading an STL for 3D printing.
//
// The four glyphs are drawn in the sister site's own icon idiom: 24×24 box,
// white 2.2-weight strokes, round caps and joins, and a small per-icon motion
// on hover driven by the `group/icon` scope.

function TypeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-7 w-7 transition-transform duration-500 group-hover/icon:-translate-y-0.5"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4 7V5h16v2" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 5v14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 19h6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-7 w-7 transition-transform duration-700 group-hover/icon:rotate-45"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z" stroke="white" strokeWidth="2.2" />
      <path
        d="M19.4 15A1.7 1.7 0 0 0 19.74 16.87L19.8 16.93A2 2 0 1 1 16.97 19.76L16.91 19.7A1.7 1.7 0 0 0 15.04 19.36A1.7 1.7 0 0 0 14 20.92V21A2 2 0 1 1 10 21V20.91A1.7 1.7 0 0 0 8.89 19.35A1.7 1.7 0 0 0 7.03 19.69L6.97 19.75A2 2 0 1 1 4.14 16.92L4.2 16.86A1.7 1.7 0 0 0 4.54 15A1.7 1.7 0 0 0 3 13.96H2.91A2 2 0 1 1 2.91 9.96H3A1.7 1.7 0 0 0 4.54 8.92A1.7 1.7 0 0 0 4.2 7.06L4.14 7A2 2 0 1 1 6.97 4.17L7.03 4.23A1.7 1.7 0 0 0 8.89 4.57H8.98A1.7 1.7 0 0 0 10 3V2.91A2 2 0 1 1 14 2.91V3A1.7 1.7 0 0 0 15.04 4.54A1.7 1.7 0 0 0 16.91 4.2L16.97 4.14A2 2 0 1 1 19.8 6.97L19.74 7.03A1.7 1.7 0 0 0 19.4 8.89V8.98A1.7 1.7 0 0 0 20.97 10H21.09A2 2 0 1 1 21.09 14H21A1.7 1.7 0 0 0 19.46 15.04L19.4 15Z"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-7 w-7 transition-transform duration-500 group-hover/icon:translate-x-0.5 group-hover/icon:-translate-y-0.5"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M22 2L11 13" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SignIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-7 w-7 transition-transform duration-500 group-hover/icon:-translate-y-0.5 group-hover/icon:scale-105"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* A mounted, lit sign: the panel, its rays, and the wall line */}
      <path d="M4 5h16v10H4V5Z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 19h6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 15v4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 10h7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Copy is in consistent vykanie throughout. It used to switch person
// mid-section — "Napíšte svoj text" followed by "Zadaj text, ktorý chceš" —
// which read as two different voices; vytlacto3d addresses the customer
// formally in every step, so this does too.
const steps = [
  {
    n: 1,
    icon: <TypeIcon />,
    title: "Napíšte svoj text",
    text: "Zadajte text, ktorý chcete rozsvietiť — meno, slogan alebo logo prevádzky. V živom 3D náhľade hneď uvidíte, ako bude nápis vyzerať.",
  },
  {
    n: 2,
    icon: <SettingsIcon />,
    title: "Vyberte si parametre",
    text: "Zvoľte si font, materiál, výšku písmen, hrúbku, farbu tela aj LED podsvietenia. Cena sa automaticky prepočíta na základe vašich nastavení.",
  },
  {
    n: 3,
    icon: <SendIcon />,
    title: "Odoslanie objednávky",
    text: "Skontrolujte si zhrnutie a odošlite objednávku. Parametre overíme a pošleme vám záväznú cenu spolu s termínom výroby.",
  },
  {
    n: 4,
    icon: <SignIcon />,
    title: "Výroba a dodanie",
    text: "Nápis vyrobíme, odskúšame svietivosť a bezpečne ho odošleme priamo na vašu adresu. Montáž na stenu je jednoduchá a rýchla.",
  },
] as const;

export default function HowItWorks() {
  return (
    <section className="px-6 py-20" style={{ background: "var(--color-background)" }}>
      <div className="mx-auto max-w-7xl">
        <h2
          className="reveal text-center text-4xl font-extrabold tracking-tight sm:text-5xl"
          style={{ color: "var(--color-foreground)" }}
        >
          Ako to funguje
        </h2>

        <ol className="mt-16 grid gap-10 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step) => (
            // `reveal` sits on the <li> and the hover lift on the <article>:
            // both animate `transform`, so on one element the scroll-in offset
            // and the hover offset would overwrite each other.
            <li key={step.n} className={`reveal delay-${step.n}`}>
              <article className="group text-center transition-transform duration-500 ease-out hover:-translate-y-1">
                <div className="mx-auto flex w-fit items-center justify-center">
                  <div
                    // shadow-[#FFAE00]/30 as a literal, like the source: the
                    // shadow COLOUR cannot come from an inline style, and the
                    // brand amber is fixed in both themes anyway.
                    className="group/icon relative flex h-16 w-16 items-center justify-center rounded-full shadow-sm transition-all duration-500 ease-out group-hover:rotate-3 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-[#FFAE00]/30"
                    style={{ background: "var(--accent)" }}
                  >
                    {/* Glow that blooms out from behind the badge on hover */}
                    <div
                      className="absolute inset-0 rounded-full opacity-0 blur-xl transition-all duration-500 group-hover:scale-125 group-hover:opacity-40"
                      style={{ background: "var(--accent)" }}
                      aria-hidden="true"
                    />

                    <div className="relative z-10">{step.icon}</div>

                    <div
                      className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-110"
                      style={{ background: "#000000", color: "#ffffff" }}
                    >
                      {step.n}
                    </div>
                  </div>
                </div>

                <h3
                  className="mx-auto mt-6 max-w-xs text-2xl font-extrabold leading-snug transition-colors duration-300"
                  style={{ color: "var(--color-foreground)" }}
                >
                  {step.title}
                </h3>

                <p
                  className="mx-auto mt-4 max-w-xs text-sm leading-8"
                  style={{ color: "var(--color-muted)" }}
                >
                  {step.text}
                </p>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
