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
        a: "Nakonfigurujte nápis v našom konfigurátore, zadajte meno a e-mail a odošlite nezáväznú objednávku. Do 24 hodín vám pošleme záväznú cenovú ponuku s termínom výroby. Po potvrdení a zaplatení zálohy začneme vyrábať.",
      },
      {
        q: "Ako dlho trvá výroba?",
        a: "Štandardná výroba trvá 5–10 pracovných dní od potvrdenia objednávky a zaplatenia zálohy. Pri väčších zákazkách alebo špeciálnych materiáloch vás o termíne informujeme vopred.",
      },
      {
        q: "Môžem objednávku zrušiť alebo zmeniť?",
        a: "Zmeny sú možné do 24 hodín od potvrdenia. Po začatí výroby zmeny nie sú možné, pretože materiál je už orezaný na váš konkrétny text a rozmery.",
      },
      {
        q: "Vyrábate nápisy na mieru?",
        a: "Áno, každý nápis vyrábame na mieru. Môžete si zvoliť vlastný text, font, materiál, farbu, hrúbku aj spôsob svietenia. Pokiaľ máte špeciálne požiadavky mimo konfigurátora, kontaktujte nás priamo.",
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
        a: "Pracujeme s Alubondom (hliníkový sendvičový plech), Plexisklom (akrylát), 3D tlačou (FDM/SLA) a PVC. Každý materiál má iné vlastnosti — porovnanie nájdete v blogu.",
      },
      {
        q: "Ktorý materiál je vhodný na vonkajšie použitie?",
        a: "Na vonkajšie použitie odporúčame Alubond alebo Plexisklo. Oba materiály sú odolné voči poveternostným podmienkam, UV žiareniu aj teplotným výkyvom. PVC a 3D tlač sú primárne určené pre interiér.",
      },
      {
        q: "Aká je životnosť LED svietenia?",
        a: "Kvalitné LED pásky, ktoré používame, majú životnosť 50 000+ hodín. Pri prevádzke 12 hodín denne je to viac ako 10 rokov bez výmeny. Napájací zdroj odporúčame skontrolovať každé 3–4 roky.",
      },
      {
        q: "Môžem si vybrať vlastnú farbu nápisu?",
        a: "Áno. Telo nápisu si vyberiete z ôsmich farieb priamo v konfigurátore, pri svetelnom písme aj v matnej bielej. Farbu svietenia vyberáte tam isto — teplá biela, intenzívna biela a červená, zelená alebo modrá; pri svietení zozadu ponúkame len obe biele.",
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
        a: "Doručujeme po celom Slovensku a Česku. Na požiadanie posielame aj do iných krajín EÚ — cena dopravy sa stanoví individuálne podľa hmotnosti a rozmeru nápisu.",
      },
      {
        q: "Ako je nápis zabalený pri preprave?",
        a: "Každý nápis je zabalený do ochrannej fólie a uložený v pevnej kartónovej krabici s výplňou. Väčšie nápisy putujú v drevenom ráme. Zákazku poisťujeme pre prípad poškodenia prepravcom.",
      },
      {
        q: "Aká je cena dopravy?",
        a: "Doručenie po Slovensku prostredníctvom kuriéra stojí od 5 € do 15 € podľa rozmerov. Pri objednávkach nad 300 € je doprava zdarma.",
      },
      {
        q: "Ponúkate osobné prevzatie?",
        a: "Áno, nápis si môžete prevziať osobne v našej dielni v Prievidzi. Dohodnutie termínu je nutné vopred telefonicky alebo e-mailom.",
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
        a: "Akceptujeme bankový prevod a platbu kartou cez bezpečnú platobnú bránu. Pre firemných zákazníkov je možná úhrada na faktúru so splatnosťou 14 dní (po dohode).",
      },
      {
        q: "Musím platiť vopred?",
        a: "Pred výrobou vyžadujeme zálohu vo výške 50 % z ceny. Zvyšok uhradíte po dokončení a pred odoslaním nápisu. Pre overených firemných zákazníkov je možné dohodnúť iné podmienky.",
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
        a: "Inštalácia nie je zahrnutá v cene, ale vieme odporučiť montážnu firmu vo vašom regióne. Ku každému nápisu prikladáme montážny návod a schému zapojenia.",
      },
      {
        q: "Potrebujem elektrikára na zapojenie?",
        a: "Pre nápisy napájané z 230 V siete odporúčame elektrikára. Menšie nápisy s 12 V napájaním (napájací adaptér) môžete zapojiť sami podľa priloženého návodu.",
      },
      {
        q: "Na akú vzdialenosť od steny sa montuje nápis?",
        a: "Väčšina písmen sa montuje 5–10 cm od steny pomocou priložených dištančníkov. Táto vzdialenosť vytvára halo efekt na stene za nápisom. Na požiadanie môžeme dištančníky prispôsobiť.",
      },
      {
        q: "Môžem nápis presunúť na inú stenu?",
        a: "Áno, nápisy sú navrhnuté pre opakovanú montáž. Stačí opatrne odskrutkovať, zazátkovať staré diery a namontovať na novom mieste.",
      },
    ],
  },
];
