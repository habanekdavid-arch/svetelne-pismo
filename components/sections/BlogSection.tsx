const posts = [
  {
    title: "Kto sme a čo robíme",
    excerpt:
      "Tvoríme svetelné a 3D nápisy na mieru od návrhu až po výrobu. Zoznámte sa s naším tímom.",
  },
  {
    title: "Aký materiál si vybrať",
    excerpt:
      "Luxusné, interiérové, odolné exteriérové alebo cenovo dostupné? Porovnanie materiálov podľa použitia a ceny.",
  },
  {
    title: "Ako pripraviť kvalitný podklad",
    excerpt:
      "Tipy na prípravu loga a textu pred objednávkou, aby výsledok vyzeral presne tak, ako si predstavuješ.",
  },
];

export default function BlogSection() {
  return (
    <section id="blog" className="bg-white pb-28 pt-8">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="main-heading text-3xl md:text-5xl">
            Prečítaj si viac
            <br />
            na našom blogu
          </h2>
          <p className="mt-4 text-sm leading-6 text-neutral-500">
            Rady, tipy a pohľad za oponu výroby svetelných nápisov.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.title}
              className="group overflow-hidden rounded-3xl border border-neutral-100 transition hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Placeholder image */}
              <div className="h-48 bg-neutral-100 transition group-hover:bg-neutral-200" />

              <div className="p-5">
                <h3 className="text-sm font-black uppercase leading-tight tracking-tight text-black">
                  {post.title}
                </h3>
                <p className="mt-2 text-xs leading-5 text-neutral-500">
                  {post.excerpt}
                </p>
                <p
                  className="mt-4 text-[11px] font-black uppercase tracking-widest transition group-hover:opacity-80"
                  style={{ color: "var(--color-accent-text)" }}
                >
                  Čítať ďalej →
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
