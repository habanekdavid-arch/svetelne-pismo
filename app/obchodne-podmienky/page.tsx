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
      updated="30. 9. 2026"
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

      <LegalSection title="2. Objednávka, cena a platba">
        <p>
          Dielo si zákazník nastaví v konfigurátore (text, font, rozmer,
          svietenie, prevedenie, farby). Cena sa zobrazí prihlásenému
          zákazníkovi s overenou e-mailovou adresou a je uvedená vrátane DPH.
        </p>
        <p>
          Objednávku zákazník odošle v košíku po výbere spôsobu doručenia a
          platby a po potvrdení súhlasu s týmito obchodnými podmienkami.
          Odoslaním objednávky vzniká záväzná objednávka; jej prijatie
          potvrdíme e-mailom.
        </p>
        <p>
          Cena sa platí vopred — <strong>kartou</strong> cez platobnú bránu
          Stripe alebo <strong>bankovým prevodom</strong> na účet uvedený v
          potvrdení objednávky. Výroba začne po prijatí platby.
        </p>
        <p>
          Pri objednávke <strong>s montážou</strong> zákazník rovnako najprv
          zaplatí za dielo. Po prijatí platby ho kontaktujeme a dohodneme
          montáž a realizáciu — termín, podrobnosti a cenu montáže, ktorá sa
          účtuje samostatne.
        </p>
        <p>
          Ak sa po odoslaní objednávky ukáže, že dielo s danými parametrami
          nie je technicky možné vyrobiť, zákazníka kontaktujeme a dohodneme
          úpravu; ak k dohode nedôjde, zaplatenú sumu v plnej výške vrátime.
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
          Výroba diela trvá spravidla <strong>do 3 týždňov</strong> od
          prijatia platby. Keď je dielo hotové, zákazníka vopred kontaktujeme
          a dohodneme odovzdanie.
        </p>
        <p>
          Spôsoby doručenia: osobný odber v Prievidzi (4from media, s.r.o.,
          M. Hodžu 393/5, 971 01 Prievidza), osobné odovzdanie kdekoľvek v
          Bratislave, alebo kuriér DPD na adresu. Cena dopravy je uvedená v
          košíku pred odoslaním objednávky; dielo, ktoré je na balík príliš
          veľké, posielame prepravou na dohodu.
        </p>
        <p>
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
