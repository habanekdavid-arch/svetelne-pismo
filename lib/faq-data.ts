export type FaqItem = {
  q: string;
  a: string;
};

export type FaqCategory = {
  id: string;
  label: string;
  icon: string; // icon key
  items: FaqItem[];
};

export const faqCategories: FaqCategory[] = [
  {
    id: "objednavka",
    label: "Objednávka",
    icon: "cart",
    items: [
      {
        q: "Ako prebieha objednávka?",
        a: "Nastavte si nápis v konfigurátore — text a font, výšku, svietenie, prevedenie a farby. Cenu uvidíte po prihlásení a overení e-mailu. V košíku vyberiete doručenie a zaplatíte kartou alebo prevodom; po prijatí platby začneme vyrábať. Ak chcete nápis aj namontovať, zvoľte montáž — pošleme vám cenovú ponuku a vopred nič neplatíte.",
      },
      {
        q: "Ako dlho trvá výroba?",
        a: "Výroba nápisu môže trvať až 3 týždne od potvrdenia objednávky a zaplatenia — podľa veľkosti, materiálu a počtu zákaziek. Keď je nápis hotový, vopred vás kontaktujeme a dohodneme odovzdanie alebo odoslanie.",
      },
      {
        q: "Môžem objednávku zrušiť alebo zmeniť?",
        a: "Ak potrebujete niečo zmeniť, napíšte nám čo najskôr po objednaní. Kým výroba nezačala, zmenu zapracujeme. Po začatí výroby to už nie je možné, pretože materiál je orezaný na váš konkrétny text a rozmery.",
      },
      {
        q: "Vyrábate nápisy na mieru?",
        a: "Áno, každý nápis vyrábame na mieru. V konfigurátore si zvolíte text, font, výšku písmen, spôsob svietenia, prevedenie aj farby čela a tela. Pokiaľ máte špeciálne požiadavky mimo konfigurátora — napríklad logo — kontaktujte nás priamo.",
      },
    ],
  },
  {
    id: "materialy",
    label: "Materiály",
    icon: "layers",
    items: [
      {
        q: "Z akých materiálov vyrábate nápisy?",
        a: "Vyrábame v troch skupinách: hliník (profil Alurol — na veľké formáty a fasády), plast (3D tlačené telo s plexi čelom alebo plné 3D tlačené písmo) a plexi (30 mm svetelné plexi z jedného kusa alebo rezané číre plexi s UV potlačou). Ktoré prevedenie sa hodí, vyberie konfigurátor podľa svietenia, textu a výšky.",
      },
      {
        q: "Ktorý materiál je vhodný na vonkajšie použitie?",
        a: "Na fasády a vonkajšie použitie odporúčame hliníkový profil Alurol — je najodolnejší voči počasiu, UV žiareniu aj teplotným výkyvom. Plexi zvládne aj exteriér pod strieškou. 3D tlačené písmo je určené najmä do interiéru.",
      },
      {
        q: "Aká je životnosť LED svietenia?",
        a: "Kvalitné LED pásky, ktoré používame, majú životnosť 50 000+ hodín. Pri prevádzke 12 hodín denne je to viac ako 10 rokov bez výmeny. Napájací zdroj odporúčame skontrolovať každé 3–4 roky.",
      },
      {
        q: "Môžem si vybrať vlastnú farbu nápisu?",
        a: "Áno. Čelo aj telo nápisu si vyberiete priamo v konfigurátore — bielu, žltú, oranžovú, červenú, zelenú, modrú, čiernu, striebornú alebo zlatú. Pri svietení spredu musí čelo prepúšťať svetlo, preto je na výber len v presvitných farbách. Plexi s UV tlačou má telo z číreho plexi, 30 mm plexi má mliečne hrany. Svieti sa vždy bielym LED svetlom — spredu svieti nápis vo farbe čela, zozadu dopadá na stenu biele svetlo.",
      },
    ],
  },
  {
    id: "dorucenie",
    label: "Doručenie",
    icon: "truck",
    items: [
      {
        q: "Kam doručujete?",
        a: "Kuriérom DPD doručujeme po celom Slovensku. Nápis si môžete prevziať aj osobne v Prievidzi, alebo vám ho odovzdáme kdekoľvek v Bratislave. Do zahraničia posielame po dohode — napíšte nám.",
      },
      {
        q: "Ako je nápis zabalený pri preprave?",
        a: "Každý nápis je zabalený do ochrannej fólie a uložený v pevnej kartónovej krabici s výplňou. Väčšie nápisy putujú v drevenom ráme. Zákazku poisťujeme pre prípad poškodenia prepravcom.",
      },
      {
        q: "Aká je cena dopravy?",
        a: "Osobný odber je zadarmo — v Prievidzi na adrese 4from media, s.r.o., M. Hodžu 393/5, alebo vám nápis odovzdáme osobne kdekoľvek v Bratislave. Kuriérom DPD na adresu 6,15 € (s DPH). Nápis, ktorý je na balík príliš veľký, posielame prepravou na dohodu — cenu potvrdíme pred výrobou.",
      },
      {
        q: "Ponúkate osobné prevzatie?",
        a: "Áno, zadarmo — v Prievidzi (4from media, s.r.o., M. Hodžu 393/5) alebo osobne kdekoľvek v Bratislave. Keď bude nápis hotový, ozveme sa vám a dohodneme termín odovzdania.",
      },
    ],
  },
  {
    id: "platba",
    label: "Platba",
    icon: "card",
    items: [
      {
        q: "Aké sú platobné možnosti?",
        a: "Platiť môžete kartou cez zabezpečenú platobnú bránu Stripe alebo bankovým prevodom — platobné údaje (IBAN, variabilný symbol, suma) uvidíte hneď po objednaní. Pri objednávke s montážou platíte až podľa zaslanej cenovej ponuky.",
      },
      {
        q: "Musím platiť vopred?",
        a: "Áno, nápis sa platí vopred celý — kartou alebo prevodom. Výrobu začneme po prijatí platby. Pri objednávke s montážou dostanete najprv cenovú ponuku a platíte až podľa nej.",
      },
      {
        q: "Vystavujete faktúru?",
        a: "Áno, ku každej objednávke vystavujeme faktúru. Pre firemných zákazníkov je možné uviesť IČO a DPH číslo na faktúre.",
      },
    ],
  },
  {
    id: "instalacia",
    label: "Inštalácia",
    icon: "wrench",
    items: [
      {
        q: "Je inštalácia v cene nápisu?",
        a: "Cena z konfigurátora je bez montáže. Ak chcete nápis aj namontovať, vyberte v košíku „Montáž u vás — na cenovú ponuku“: zadáte adresu a my vám pošleme cenovú ponuku s montážou. Ku každému nápisu prikladáme montážny návod a schému zapojenia.",
      },
      {
        q: "Potrebujem elektrikára na zapojenie?",
        a: "Pre nápisy napájané z 230 V siete odporúčame elektrikára. Menšie nápisy s 12 V napájaním (napájací adaptér) môžete zapojiť sami podľa priloženého návodu.",
      },
      {
        q: "Na akú vzdialenosť od steny sa montuje nápis?",
        a: "Písmo svietiace spredu a nesvetelné písmo sa montuje tesne na stenu. Písmo svietiace zozadu sa montuje na dištančníkoch s odstupom od steny, aby svetlo vytvorilo na stene za nápisom halo efekt. Odstup vieme na požiadanie prispôsobiť.",
      },
      {
        q: "Môžem nápis presunúť na inú stenu?",
        a: "Áno, nápisy sú navrhnuté pre opakovanú montáž. Stačí opatrne odskrutkovať, zazátkovať staré diery a namontovať na novom mieste.",
      },
    ],
  },
];
