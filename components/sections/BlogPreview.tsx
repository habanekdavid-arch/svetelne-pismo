const posts = [
  {
    slug: "kto-sme",
    title: "Kto sme a čo robíme?",
    desc: "Zoznámte sa s nami a zistite, ako vyrábame svetelné nápisy na mieru priamo na Slovensku.",
  },
  {
    slug: "aky-material",
    title: "Aký materiál si vybrať?",
    desc: "Porovnanie Alubond, Plexiskla, 3D tlače a PVC — výhody a nevýhody každého materiálu.",
  },
  {
    slug: "aky-obrazok",
    title: "Aký obrázok je kvalitný?",
    desc: "Čo musí spĺňať predloha, aby bol výsledný nápis čistý, ostrý a presný podľa vašich predstáv.",
  },
] as const;

export default function BlogPreview() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">

        {/* Heading */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="main-heading text-3xl md:text-5xl xl:text-6xl">
            Prečítajte si viac
            <br />
            v našom blogu
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

        {/* Cards */}
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <a
                href="#"
                aria-label={post.title}
                className="group block outline-none focus-visible:ring-2"
                style={
                  { "--ring-color": "var(--color-primary)" } as React.CSSProperties
                }
              >
                {/* Image placeholder */}
                <div
                  className="w-full overflow-hidden rounded-xl"
                  style={{
                    aspectRatio: "4 / 3",
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    className="h-full w-full transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                    style={{ background: "var(--color-surface-raised)" }}
                    aria-hidden="true"
                  />
                </div>

                {/* Text */}
                <div className="mt-4 px-1">
                  <h3
                    className="text-[12px] font-black uppercase tracking-widest transition-opacity group-hover:opacity-70"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    {post.title}
                  </h3>
                  <p
                    className="mt-1.5 text-[13px] leading-5"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {post.desc}
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>

      </div>
    </section>
  );
}
