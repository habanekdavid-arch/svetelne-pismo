import ConfiguratorStage from "@/components/configurator/ConfiguratorStage";
import EyebrowPill from "@/components/ui/EyebrowPill";

// Deliberately NOT reading the session here (no getUserSession()/cookies())
// — that would force this page to opt out of static rendering. OrderModal
// fetches /api/auth/me itself, client-side, only once it's actually opened.
//
// The section clips with overflow-x-clip, not overflow-hidden: `hidden` turns
// it into a scroll container, which silently disables the sticky preview
// column inside ConfiguratorStage. `clip` clips the same way without that.
export default function HeroConfigurator() {
  return (
    <section
      id="konfigurator"
      className="relative overflow-x-clip pb-24 pt-16"
      style={{ background: "var(--color-background)" }}
    >
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <div className="reveal mb-4 flex justify-center">
            <EyebrowPill>Konfigurátor</EyebrowPill>
          </div>

          <h1
            className="reveal delay-1 main-heading text-4xl md:text-6xl"
            style={{ color: "var(--color-foreground)" }}
          >
            Poď si s nami vytvoriť svetelný nápis,
            <br />
            ktorý tvojej značke svieti aj po zotmení
          </h1>

          <p
            className="reveal delay-2 mx-auto mt-5 max-w-md text-sm leading-6"
            style={{ color: "var(--color-muted)" }}
          >
            Napíš text, vyber font, materiál, farbu a svietenie.
            Náhľad aj cena sa menia okamžite podľa tvojich nastavení.
          </p>
        </div>

        <ConfiguratorStage />
      </div>
    </section>
  );
}
