import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/layout/LegalPage";
import CookieSettingsControls from "@/components/layout/CookieSettingsControls";
import { getT } from "@/lib/i18n/server";
import { rich } from "@/lib/i18n/rich";

export const metadata: Metadata = {
  title: "Cookies | rozsvieťTO",
  description: "Aké cookies rozsvieťTO používa a ako môžete zmeniť svoj súhlas.",
};

export default async function CookiesPage() {
  const { t } = await getT();
  return (
    // Not a binding document — translated in full, so no "Slovak only" note.
    <LegalPage eyebrow="Nastavenia" title={t("Cookies")} updated="14. 10. 2026" translated>
      <LegalSection title={t("Čo sú cookies")}>
        <p>
          {t("Cookies sú malé textové súbory, ktoré si prehliadač ukladá pri návšteve stránky. Umožňujú stránke zapamätať si vaše nastavenia alebo nám (so súhlasom) pomáhajú pochopiť, ako stránku a konfigurátor používate.")}
        </p>
      </LegalSection>

      <LegalSection title={t("Aké cookies používame")}>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>{t("Nevyhnutné")}</strong> — {t("potrebné na fungovanie stránky (napr. zapamätanie si vášho súhlasu s cookies). Tieto sa ukladajú vždy a nedajú sa vypnúť.")}
          </li>
          <li>
            <strong>{t("Analytické")}</strong> — {t("pomáhajú nám merať návštevnosť a priebeh objednávok cez konfigurátor (Google Analytics / Google Tag Manager). Ukladajú sa len ak s tým súhlasíte nižšie alebo v cookie lište.")}
          </li>
          <li>
            <strong>{t("Marketingové")}</strong> — {t("pomáhajú nám merať, ktoré reklamy Google Ads priviedli návštevníkov a objednávky. Ukladajú sa len ak s tým súhlasíte nižšie alebo v cookie lište.")}
          </li>
        </ul>
      </LegalSection>

      <LegalSection title={t("Zmeňte svoj súhlas")}>
        <CookieSettingsControls />
      </LegalSection>

      <LegalSection title={t("Viac informácií")}>
        <p>
          {rich(t("Podrobnosti o spracúvaní osobných údajov nájdete na stránke {link}."), {
            link: (
              <a href="/gdpr" className="underline">
                {t("Ochrana osobných údajov")}
              </a>
            ),
          })}
        </p>
      </LegalSection>
    </LegalPage>
  );
}
