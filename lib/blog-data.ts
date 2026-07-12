export type BlogPost = {
  slug: string;
  title: string;
  desc: string;
  category: string;
  date: string;
  readMin: number;
  content: string;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "kto-sme",
    title: "Kto sme a čo robíme?",
    desc: "Zoznámte sa s nami a zistite, ako vyrábame svetelné nápisy na mieru priamo na Slovensku.",
    category: "O nás",
    date: "2026-06-01",
    readMin: 3,
    content: `
Sme slovenská firma so sídlom v Prievidzi, ktorá sa špecializuje na výrobu **svetelných nápisov a 3D písmen na mieru**. Každý projekt riešime individuálne — od návrhu až po doručenie.

## Čo vyrábame

Vyrábame reklamné a dekoračné nápisy z rôznych materiálov:
- **Alubond** — prémiový sendvičový hliníkový plech
- **Plexisklo** — čistý svetelný efekt s hladkým povrchom
- **3D tlač** — tvarová voľnosť za dobrú cenu
- **PVC** — ľahký a cenovo dostupný variant

## Ako to funguje

Celý proces je jednoduchý. Stačí nakonfigurovať nápis v našom online konfigurátore, zadať e-mail a my sa ozveme so záväznou cenovou ponukou. Výroba trvá spravidla 5–10 pracovných dní.

## Prečo my

Každý nápis vyrábame ručne v našej dielni na Slovensku. Nepoužívame čínskych sprostredkovateľov — kvalitu kontrolujeme od začiatku do konca. Záleží nám na tom, aby ste boli s výsledkom spokojní.
    `.trim(),
  },
  {
    slug: "aky-material",
    title: "Aký materiál si vybrať?",
    desc: "Porovnanie Alubond, Plexiskla, 3D tlače a PVC — výhody a nevýhody každého materiálu.",
    category: "Materiály",
    date: "2026-06-10",
    readMin: 5,
    content: `
Výber materiálu je kľúčové rozhodnutie, ktoré ovplyvní výzor, trvanlivosť aj cenu vášho nápisu. Tu je prehľad všetkých možností.

## Alubond

Alubond je sendvičový materiál — dve hliníkové vrstvy s plastovým jadrom. Je **pevný, ľahký a odolný** voči počasiu, preto je ideálny pre vonkajšie použitie.

**Výhody:** prémiový vzhľad, dlhá životnosť, odolnosť voči UV žiareniu
**Nevýhody:** vyššia cena

## Plexisklo

Plexisklo (PMMA) je priehľadný alebo farebný akrylát. **Vytvára krásny svetelný efekt**, pretože svetlo sa rovnomerne šíri cez celý materiál.

**Výhody:** čistý glow efekt, elegantný vzhľad, ľahká váha
**Nevýhody:** krehkejšie ako kov, vyššia cena

## 3D tlač

Pomocou FDM alebo SLA tlačiarne vieme vytvoriť **takmer akýkoľvek tvar**. Ideálne pre logo s komplexnou geometriou.

**Výhody:** tvarová voľnosť, rýchla výroba prototypov
**Nevýhody:** viditeľné vrstvy pri lacnejšej tlači, menej odolné voči UV

## PVC

PVC je cenovo najdostupnejší materiál. Hodí sa pre **interiérové použitie** a krátkodobé akcie.

**Výhody:** najnižšia cena, ľahká manipulácia
**Nevýhody:** nie je vhodné vonku, menej prémiový vzhľad

## Čo si vybrať?

| Použitie | Odporúčaný materiál |
|---|---|
| Vonkajší firemný nápis | Alubond |
| Dekorácia interiéru s glow efektom | Plexisklo |
| Logo s komplexným tvarom | 3D tlač |
| Akcia / event / pop-up | PVC |
    `.trim(),
  },
  {
    slug: "aky-obrazok",
    title: "Aký obrázok je kvalitný?",
    desc: "Čo musí spĺňať predloha, aby bol výsledný nápis čistý, ostrý a presný podľa vašich predstáv.",
    category: "Dizajn",
    date: "2026-06-18",
    readMin: 4,
    content: `
Kvalita výsledného nápisu závisí od kvality predlohy. Tu je všetko, čo potrebujete vedieť.

## Vektorový vs. rastrový súbor

Najlepší formát pre výrobu je **vektorový súbor** (SVG, AI, EPS, PDF s vektormi). Vektory sú nezávislé od rozlíšenia — dajú sa škálovať do ľubovoľnej veľkosti bez straty kvality.

Rastrové obrázky (JPG, PNG) sú použiteľné iba ak majú **dostatočné rozlíšenie** — aspoň 300 DPI pri výslednej veľkosti nápisu.

## Minimálna hrúbka ťahu

Pri frézovaní a rezaní platí pravidlo: **minimálna hrúbka akéhokoľvek prvku** by mala byť aspoň 3–5 mm vo výslednej veľkosti. Príliš tenké detaily sa môžu odlomiť alebo deformovať.

## Fonty

Ak posielate súbor s textom, uistite sa, že máte **fonty prevedené na krivky** (Outlines / Create Outlines v Adobe Illustrator). Inak môžu byť písmená nahradené iným fontom.

## Odporúčané formáty

1. **SVG** — ideálny pre web-based nástroje
2. **AI** (Adobe Illustrator) — štandard v polygrafii
3. **EPS** — kompatibilný s väčšinou CNC strojov
4. **PDF** — ak obsahuje vektorové krivky

## Čo ak nemám vektorový súbor?

Nevadí! Napíšte nám a naši grafici vám logo alebo text prevektorujú. Táto služba je pri objednávke zadarmo.
    `.trim(),
  },
  {
    slug: "instalacia-napisu",
    title: "Ako nainštalovať svetelný nápis?",
    desc: "Postup inštalácie krok za krokom — aj bez elektrikára a špeciálneho náradia.",
    category: "Návod",
    date: "2026-06-25",
    readMin: 4,
    content: `
Inštalácia svetelného nápisu je jednoduchšia, ako sa zdá. Tu je postup pre väčšinu typov montáže.

## Čo budete potrebovať

- Vrtačka a sada bitov
- Vodováha alebo laserový merač
- Ceruzka a meter
- Hmoždinky a skrutky (väčšinou sú priložené)
- Sieťový kábel alebo rozvodnica (podľa svietenia)

## Postup

### 1. Označenie pozície
Priložte nápis k stene a ceruzkou označte miesta dier. Použite vodováhu, aby bol nápis rovnobežný s podlahou.

### 2. Vŕtanie
Vyvŕtajte diery podľa značiek. Pre tehlu alebo betón použite príklepovú vrtačku. Pre sadrokartón použite špeciálne hmoždinky.

### 3. Montáž dištančníkov
Väčšina písmen má na zadnej strane dištančníky (väčšinou 5–10 cm), vďaka ktorým sa vytvorí vzduchová medzera. Táto medzera je dôležitá pre halo efekt.

### 4. Zapojenie LED
Každé písmeno má vývod pre napájanie. Jednotlivé písmená sa zapájajú do série alebo paralelne podľa schémy. Schému prikladáme ku každej objednávke.

### 5. Test

Pred finálnou montážou otestujte zapojenie. Overte, že všetky písmená svietia rovnomerne.

## Potrebujete pomoc?

Ak si s inštaláciou neviete rady, kontaktujte nás. Vieme odporučiť elektrikára vo vašom regióne alebo poskytnúť video návod.
    `.trim(),
  },
  {
    slug: "led-vs-neon",
    title: "LED vs. neón — čo je lepšie?",
    desc: "Porovnanie klasických neónových trubíc a moderných LED svetelných nápisov z pohľadu ceny, spotreby aj vzhľadu.",
    category: "Technológia",
    date: "2026-07-01",
    readMin: 5,
    content: `
Klasický neón má nezameniteľnú atmosféru. LED je moderné a úsporné. Ktoré riešenie je pre vás správne?

## Klasický neón

Neónové reklamy fungujú od 20. storočia. Plynová trubica naplnená neónom alebo iným vzácnym plynom vyžaruje charakteristické teplé svetlo.

**Výhody:** unikátna estetika, mäkké žiarenie, vintage atmosféra
**Nevýhody:** vyššia spotreba, krehkosť, nákladná oprava, obsahuje nebezpečné plyny

## LED nápisy

Moderné LED nápisy napodobňujú vzhľad neónu, ale používajú energeticky úsporné LED pásky.

**Výhody:**
- **Spotreba:** až 80 % menej energie ako neón
- **Životnosť:** 50 000+ hodín (vs. 10 000 h neón)
- **Bezpečnosť:** nízkonapäťové, bez nebezpečných plynov
- **Farby:** akákoľvek farba, aj RGB meniteľná
- **Cena:** lacnejšia výroba aj prevádzka

**Nevýhody:** iný charakter svetla ako pravý neón (pre niektorých)

## Verdict

Pre väčšinu komerčných aplikácií odporúčame **LED nápisy**. Sú úsporné, odolné a dajú sa vyrobiť v akejkoľvek farbe.

Ak chcete autentický retro look pre bar, kaviareň alebo event, klasický neón má stále svoje čaro.

Oba typy vyrábame — napíšte nám čo potrebujete.
    `.trim(),
  },
  {
    slug: "firemny-napis-preco",
    title: "Prečo má každá firma potrebovať svetelný nápis?",
    desc: "Svetelný nápis nie je len ozdoba — je to investícia do viditeľnosti, brandu a prvého dojmu.",
    category: "Marketing",
    date: "2026-07-04",
    readMin: 3,
    content: `
Prečo investovať do svetelného nápisu, keď existuje digitálna reklama? Odpoveď je jednoduchá — fyzická prítomnosť a viditeľnosť 24/7.

## Viditeľnosť bez platenia

Svetelný nápis pracuje za vás non-stop. Raz zaplatíte výrobu a nápis vás propaguje každý deň — aj v noci, keď je ostatná reklama vypnutá.

## Prvý dojem

Štúdie ukazujú, že **68 % zákazníkov vstúpi do obchodu na základe vizuálneho dojmu** z exteriéru. Kvalitný nápis hovorí o profesionalite firmy skôr, ako zákazník vojde dnu.

## Brand identity

Svetelný nápis s vaším logom je 3D realizácia vašej značky. Je hmatateľný, fotogenický (zákazníci ho fotia a zdieľajú na sociálnych sieťach) a nezameniteľný.

## ROI

Priemerná životnosť LED nápisu je 5–8 rokov. Pri cene od 300 € vychádza denná propagácia na menej ako 20 centov. Žiadna iná forma reklamy nemá takýto pomer cena/výkon.

## Kde nápisy fungujú najlepšie

- Reštaurácie a kaviarne
- Salóny krásy a wellness
- Fitness centrá
- Kancelárie a showroomy
- Eventy a pop-up predajne

Máte záujem? Nakonfigurujte si nápis v našom konfigurátore — cena vám vyjde okamžite.
    `.trim(),
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
