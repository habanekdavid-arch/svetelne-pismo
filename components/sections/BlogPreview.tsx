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
      <div className="mx-auto max-w-360 px-20">

        {/* Heading */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="reveal main-heading text-[50px]">
            Prečítajte si viac
            <br />
            v našom blogu
          </h2>
          <p
            className="reveal delay-1 mx-auto mt-5 max-w-xl text-[20px] leading-relaxed"
            style={{ color: "var(--color-muted)" }}
          >
            Pokiaľ si neviete rady, v pár krokoch jednoducho
            <br className="hidden sm:block" />
            a rýchlo vám pomôžeme s výberom svetelného textu.
          </p>
        </div>

        {/* Cards — 401 px wide each, 284 px image, 10 px radius per Figma */}
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <li key={post.slug} className={`reveal delay-${i + 1}`}>
              <a
                href="#"
                aria-label={post.title}
                className="card-hover group block overflow-hidden rounded-[10px] outline-none"
                style={{ border: "1px solid var(--color-border)" }}
              >
                {/* Image placeholder — 284 px tall per Figma */}
                <div
                  className="img-zoom h-71 w-full"
                  style={{ background: "var(--color-surface-raised)" }}
                  aria-hidden="true"
                />

                {/* Text */}
                <div className="p-5">
                  <h3
                    className="text-[24px] font-black uppercase leading-tight"
                    style={{
                      fontFamily: "var(--font-century-gothic)",
                      color: "var(--color-foreground)",
                    }}
                  >
                    {post.title}
                  </h3>
                  <p
                    className="mt-2 text-[13px]"
                    style={{ color: "var(--color-muted)", lineHeight: 1.2 }}
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
