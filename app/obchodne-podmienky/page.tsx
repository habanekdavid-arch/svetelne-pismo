import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Obchodné podmienky | rozsvieťTO",
  description: "Obchodné podmienky pre objednávky svetelných a 3D nápisov na mieru cez konfigurátor rozsvieťTO.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Právne"
      title="Obchodné podmienky"
      updated="11. 9. 2026"
    >
      <LegalSection title="1. Úvodné ustanovenia">
        <p>
          Tieto obchodné podmienky upravujú vzťah medzi spoločnosťou{" "}
          <strong>4from media, s.r.o.</strong>, M. Hodžu 393/5, 971 01
          Prievidza (ďalej len „predávajúci“), prevádzkujúcou stránku
          rozsvieťTO, a zákazníkom, ktorý si cez konfigurátor na tejto
          stránke objedná svetelný alebo 3D nápis na mieru (ďalej len
          „dielo“).
        </p>
      </LegalSection>

      <LegalSection title="2. Objednávka a cena">
        <p>
          Cena zobrazená v konfigurátore je <strong>orientačná</strong> a
          vychádza z vami zvolených parametrov (text, font, materiál,
          rozmery, svietenie). Odoslaním formulára v konfigurátore
          nevzniká záväzná kúpna zmluva — ide o nezáväzný dopyt.
        </p>
        <p>
          Záväznú cenu a termín výroby vám potvrdíme e-mailom alebo
          telefonicky po overení technických parametrov diela. Zmluva sa
          považuje za uzatvorenú až týmto obojstranným potvrdením.
        </p>
      </LegalSection>

      <LegalSection title="3. Výroba diela na mieru">
        <p>
          Každé dielo je vyrábané na základe individuálnych požiadaní
          zákazníka (text, rozmer, farba, materiál). V súlade s § 7 ods. 6
          písm. c) zákona č. 102/2014 Z. z. sa preto na dielo{" "}
          <strong>nevzťahuje právo na odstúpenie od zmluvy</strong> do 14
          dní, keďže ide o tovar zhotovený podľa osobitných požiadaviek
          spotrebiteľa a upravený na mieru.
        </p>
      </LegalSection>

      <LegalSection title="4. Dodacie podmienky">
        <p>
          Orientačná doba výroby a dodania je uvedená v cenovej ponuke.
          Predávajúci si vyhradzuje právo predĺžiť dodaciu lehotu z dôvodu
          vyššej pracovnej vyťaženosti alebo dostupnosti materiálu, o čom
          zákazníka bezodkladne informuje.
        </p>
      </LegalSection>

      <LegalSection title="5. Reklamácie">
        <p>
          Na dielo sa vzťahuje zákonná záručná doba. Reklamáciu uplatňujte
          písomne na{" "}
          <a href="mailto:info@4frommedia.sk" className="underline">
            info@4frommedia.sk
          </a>{" "}
          spolu s popisom vady a fotodokumentáciou. Reklamáciu vybavíme v
          zákonnej lehote.
        </p>
      </LegalSection>

      <LegalSection title="6. Záverečné ustanovenia">
        <p>
          Vzťahy neupravené týmito podmienkami sa spravujú príslušnými
          ustanoveniami Občianskeho zákonníka a zákona o ochrane
          spotrebiteľa. Predávajúci si vyhradzuje právo tieto podmienky
          meniť; aktuálne znenie je vždy dostupné na tejto stránke.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
