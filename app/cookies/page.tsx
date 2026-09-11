import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/layout/LegalPage";
import CookieSettingsControls from "@/components/layout/CookieSettingsControls";

export const metadata: Metadata = {
  title: "Cookies | rozsvieťTO",
  description: "Aké cookies rozsvieťTO používa a ako môžete zmeniť svoj súhlas.",
};

export default function CookiesPage() {
  return (
    <LegalPage eyebrow="Nastavenia" title="Cookies" updated="11. 9. 2026">
      <LegalSection title="Čo sú cookies">
        <p>
          Cookies sú malé textové súbory, ktoré si prehliadač ukladá pri
          návšteve stránky. Umožňujú stránke zapamätať si vaše nastavenia
          alebo nám (so súhlasom) pomáhajú pochopiť, ako stránku a
          konfigurátor používate.
        </p>
      </LegalSection>

      <LegalSection title="Aké cookies používame">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Nevyhnutné</strong> — potrebné na fungovanie stránky
            (napr. zapamätanie si vášho súhlasu s cookies). Tieto sa
            ukladajú vždy a nedajú sa vypnúť.
          </li>
          <li>
            <strong>Analytické</strong> — pomáhajú nám merať návštevnosť a
            priebeh objednávok cez konfigurátor (Google Analytics / Google
            Tag Manager). Ukladajú sa len ak s tým súhlasíte nižšie alebo v
            cookie lište.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Zmeňte svoj súhlas">
        <CookieSettingsControls />
      </LegalSection>

      <LegalSection title="Viac informácií">
        <p>
          Podrobnosti o spracúvaní osobných údajov nájdete na stránke{" "}
          <a href="/gdpr" className="underline">
            Ochrana osobných údajov
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
