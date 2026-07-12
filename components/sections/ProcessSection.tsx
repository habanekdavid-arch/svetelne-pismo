const steps = [
  {
    title: "Napíš svoj text",
    text: "Zadaj text, ktorý chceš vyrobiť ako svetelné alebo 3D písmo na mieru.",
  },
  {
    title: "Vyber parametre",
    text: "Zvoľ font, materiál, farbu, hrúbku a typ svietenia. Cena sa mení naživo.",
  },
  {
    title: "Objednaj",
    text: "Stačí meno a e-mail. Záväznú cenu potvrdíme po overení konfigurácie.",
  },
  {
    title: "O pár dní u teba",
    text: "Po potvrdení objednávky spustíme výrobu, prekontrolujeme a doručíme.",
  },
];

export default function ProcessSection() {
  return (
    <section className="bg-neutral-50 py-28" id="ako-funguje">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="main-heading text-3xl md:text-5xl">Ako to funguje</h2>
          <p className="mt-4 text-sm leading-6 text-neutral-500">
            Štyri kroky od nápadu po hotový nápis na stene.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="text-center">
              <div
                className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full text-sm font-black text-black"
                style={{ background: "var(--accent)" }}
              >
                {index + 1}
              </div>
              <h3 className="text-sm font-black uppercase tracking-tight">
                {step.title}
              </h3>
              <p className="mx-auto mt-3 max-w-50 text-xs leading-5 text-neutral-500">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
