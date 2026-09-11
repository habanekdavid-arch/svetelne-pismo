import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Ochrana osobných údajov | rozsvieťTO",
  description: "Informácie o spracúvaní osobných údajov pri používaní konfigurátora a spracovaní objednávok na rozsvieťTO.",
};

export default function GdprPage() {
  return (
    <LegalPage
      eyebrow="GDPR"
      title="Ochrana osobných údajov"
      updated="11. 9. 2026"
    >
      <LegalSection title="Prevádzkovateľ">
        <p>
          Prevádzkovateľom stránky rozsvieťTO a spracovateľom osobných
          údajov je <strong>4from media, s.r.o.</strong>, so sídlom M. Hodžu
          393/5, 971 01 Prievidza. V otázkach ochrany osobných údajov nás
          môžete kontaktovať na{" "}
          <a href="mailto:info@4frommedia.sk" className="underline">
            info@4frommedia.sk
          </a>{" "}
          alebo telefonicky na{" "}
          <a href="tel:+421907907097" className="underline">
            +421 907 907 097
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Aké údaje spracúvame">
        <p>Pri odoslaní objednávky cez konfigurátor spracúvame:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>meno a priezvisko,</li>
          <li>e-mailovú adresu,</li>
          <li>
            nastavenia objednávky (text nápisu, font, materiál, farby,
            rozmery, svietenie) a vypočítanú orientačnú cenu.
          </li>
        </ul>
        <p>
          Pri návšteve stránky, ak s tým súhlasíte v cookie lište, môžeme
          anonymne spracúvať aj údaje o návštevnosti a priebehu objednávky na
          účely merania (pozri stránku{" "}
          <a href="/cookies" className="underline">
            Cookies
          </a>
          ).
        </p>
      </LegalSection>

      <LegalSection title="Účel a právny základ spracúvania">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Vybavenie objednávky</strong> — na základe vášho súhlasu
            odoslaním formulára a nášho oprávneného záujmu pripraviť cenovú
            ponuku (čl. 6 ods. 1 písm. b) GDPR).
          </li>
          <li>
            <strong>Komunikácia</strong> — odpoveď na vašu objednávku alebo
            otázku e-mailom či telefonicky.
          </li>
          <li>
            <strong>Meranie návštevnosti</strong> — len ak s tým súhlasíte v
            cookie lište (čl. 6 ods. 1 písm. a) GDPR).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Doba uchovávania">
        <p>
          Údaje z objednávky uchovávame po dobu potrebnú na vybavenie
          objednávky a prípadnú komunikáciu s vami, najviac však 24 mesiacov
          od odoslania, pokiaľ osobitný predpis (napr. účtovná či daňová
          legislatíva pri uzatvorenej zákazke) nevyžaduje dlhšiu dobu.
        </p>
      </LegalSection>

      <LegalSection title="Príjemcovia údajov">
        <p>
          Vaše údaje neposkytujeme tretím stranám na marketingové účely.
          Prístup k nim môžu mať výlučne poskytovatelia technických služieb
          nevyhnutných na prevádzku stránky (napr. hosting na Vercel Inc.) a,
          len pri udelenom súhlase s cookies, poskytovateľ analytických
          nástrojov (Google Analytics/GTM).
        </p>
      </LegalSection>

      <LegalSection title="Vaše práva">
        <p>Ako dotknutá osoba máte právo najmä na:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>prístup k svojim osobným údajom,</li>
          <li>opravu nesprávnych alebo neaktuálnych údajov,</li>
          <li>výmaz údajov (&bdquo;právo na zabudnutie&ldquo;),</li>
          <li>obmedzenie spracúvania,</li>
          <li>prenosnosť údajov,</li>
          <li>
            odvolanie súhlasu (kedykoľvek, bez vplyvu na zákonnosť
            spracúvania pred jeho odvolaním),
          </li>
          <li>
            podanie sťažnosti na Úrad na ochranu osobných údajov SR
            (dataprotection.gov.sk).
          </li>
        </ul>
        <p>
          Práva si môžete uplatniť napísaním na{" "}
          <a href="mailto:info@4frommedia.sk" className="underline">
            info@4frommedia.sk
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
