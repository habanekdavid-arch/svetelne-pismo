export default function Hero() {
  return (
    <section className="pb-12 pt-20 md:pb-16 md:pt-28">
      <div className="mx-auto max-w-5xl px-5 text-center">
        <h1 className="main-heading text-5xl md:text-6xl xl:text-7xl">
          Poď si s nami
          <br />
          vytvoriť váš svetelný text
        </h1>

        <p
          className="mx-auto mt-6 max-w-sm text-sm leading-relaxed md:mt-8 md:text-base"
          style={{ color: "var(--color-muted)" }}
        >
          Pokiaľ si neviete rady, v pár krokoch jednoducho
          <br className="hidden sm:block" />
          a rýchlo vám pomôžeme s výberom svetelného textu.
        </p>
      </div>
    </section>
  );
}
