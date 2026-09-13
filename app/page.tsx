import { ConfigProvider } from "@/lib/config-context";
import HeroConfigurator from "@/components/sections/HeroConfigurator";
import ShowcaseSection from "@/components/sections/ShowcaseSection";
import HowItWorks from "@/components/sections/HowItWorks";
import MaterialsSection from "@/components/sections/MaterialsSection";
import FaqContactSection from "@/components/sections/FaqContactSection";

export default function Home() {
  return (
    <main>
      {/*
        ConfigProvider zdieľa config state medzi konfiguratorom a realizáciami.
        Obe sú client components komunikujúce cez React Context.
      */}
      <ConfigProvider>
        {/* 1 — Úvod + konfigurátor: vyskúšaj si vlastný text */}
        <HeroConfigurator />

        {/* 2 — Realizácie zodpovedajúce výberu v konfigurátore */}
        <ShowcaseSection />
      </ConfigProvider>

      {/* 3 — Ako to funguje: 3 kroky objednávky */}
      <HowItWorks />

      {/* 4 — Materiály */}
      <MaterialsSection />

      {/* 5 — Časté otázky a kontaktný formulár */}
      <FaqContactSection />
    </main>
  );
}
