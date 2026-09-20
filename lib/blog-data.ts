export type BlogPost = {
  slug: string;
  title: string;
  desc: string;
  category: string;
  date: string;
  readMin: number;
  content: string;
  /** Cover photo — local /public path or external URL. Optional: older posts have none. */
  image?: string;
  /** Extra photos of the same realization, shown below the article body. */
  gallery?: string[];
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
- **Odolné exteriérové** — hliníkový kompozit odolný voči počasiu
- **Luxusné** — priehľadný akryl s prémiovým leskom a hĺbkou presvitu
- **Interiérové** — 3D tlačený plast s jemným presvitom
- **Cenovo dostupné** — ľahká penová doska, najúspornejšia voľba

## Ako to funguje

Celý proces je jednoduchý. Stačí nakonfigurovať nápis v našom online konfigurátore, zadať e-mail a my sa ozveme so záväznou cenovou ponukou. Výroba trvá spravidla 5–10 pracovných dní.

## Prečo my

Každý nápis vyrábame ručne v našej dielni na Slovensku. Nepoužívame čínskych sprostredkovateľov — kvalitu kontrolujeme od začiatku do konca. Záleží nám na tom, aby ste boli s výsledkom spokojní.
    `.trim(),
  },
  {
    slug: "aky-material",
    title: "Aký materiál si vybrať?",
    desc: "Porovnanie Odolného exteriérového, Luxusného, Interiérového a Cenovo dostupného materiálu — výhody a nevýhody každého z nich.",
    category: "Materiály",
    date: "2026-06-10",
    readMin: 5,
    content: `
Výber materiálu je kľúčové rozhodnutie, ktoré ovplyvní výzor, trvanlivosť aj cenu vášho nápisu. Tu je prehľad všetkých možností.

## Odolné exteriérové

Hliníkový kompozit — dve hliníkové vrstvy s plastovým jadrom. Je **pevný, ľahký a odolný** voči počasiu, preto je ideálny pre vonkajšie použitie.

**Výhody:** prémiový vzhľad, dlhá životnosť, odolnosť voči UV žiareniu
**Nevýhody:** vyššia cena

## Luxusné

Priehľadný akrylát (plexisklo) s prémiovým leskom. **Vytvára krásny svetelný efekt**, pretože svetlo sa rovnomerne šíri cez celý materiál.

**Výhody:** čistý glow efekt, elegantný vzhľad, ľahká váha
**Nevýhody:** krehkejšie ako kov, vyššia cena

## Interiérové

3D tlačený plast s jemným presvitom. Pomocou FDM alebo SLA tlačiarne vieme vytvoriť **takmer akýkoľvek tvar**. Ideálne pre logo s komplexnou geometriou.

**Výhody:** tvarová voľnosť, rýchla výroba prototypov
**Nevýhody:** viditeľné vrstvy pri lacnejšej tlači, menej odolné voči UV

## Cenovo dostupné

Ľahká penová doska — cenovo najdostupnejší materiál. Hodí sa pre **interiérové použitie** a krátkodobé akcie.

**Výhody:** najnižšia cena, ľahká manipulácia
**Nevýhody:** nie je vhodné vonku, menej prémiový vzhľad

## Čo si vybrať?

| Použitie | Odporúčaný materiál |
|---|---|
| Vonkajší firemný nápis | Odolné exteriérové |
| Dekorácia interiéru s glow efektom | Luxusné |
| Logo s komplexným tvarom | Interiérové |
| Akcia / event / pop-up | Cenovo dostupné |
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
  {
    slug: "3d-tlac-svetlo-spredu",
    title: "3D tlač so svetlom spredu — ako vyzerá naživo",
    desc: "Ukážka z našej dielne: 3D tlačené písmeno s plexisklovým čelom, presvietené spredu. Presne takto bude vyzerať aj vaše.",
    category: "Materiály",
    date: "2026-08-04",
    readMin: 3,
    image: "/realizacie-ukazky/3d-tlac-svetlo-spredu.avif",
    gallery: ["/realizacie-ukazky/3d-tlac-svetlo-spredu-detail.avif"],
    content: `
Jedna z najčastejšie objednávaných kombinácií je **3D tlačené telo s plexisklovým čelom**, presvietené spredu. Na fotkách nižšie vidíte presne to, čo v konfigurátore označujeme ako materiál "3D tlač s plexi" so svietením "spredu".

## Prečo túto kombináciu ľudia volia

3D tlač dáva telu písmena ľubovoľný tvar — zvládne aj zložité logo alebo neštandardné písmo. Plexisklové čelo potom rozptýli svetlo LED pásikov rovnomerne po celej ploche, takže písmeno svieti čisto, bez viditeľných bodiek jednotlivých diód.

## Kde to funguje najlepšie

- **Interiér aj exteriér** — telo znesie oba typy prevádzky
- **Logá s tenkými detailmi**, ktoré by sa z hliníka ťažko vyrábali
- **Prevádzky, kde má nápis svietiť aj cez deň** slabšie, aj v noci naplno

## Ako to vidieť v konfigurátore

Ak si v našom konfigurátore vyberiete materiál **3D tlač s plexi** a svietenie **spredu**, presne táto realizácia sa vám zobrazí v sekcii "Pozri si, ako tvoj text vyzerá v praxi" — aby ste vedeli, do čoho idete ešte pred objednávkou.
    `.trim(),
  },
  {
    slug: "3d-tlac-plne-pismo-bez-svetla",
    title: "Plné 3D tlačené písmo bez podsvietenia",
    desc: "Najľahšia a najtenšia stavba, ktorú ponúkame — celé vytlačené písmeno bez elektriky, ideálne do interiéru.",
    category: "Materiály",
    date: "2026-08-06",
    readMin: 3,
    image: "/realizacie-ukazky/3d-tlac-plne-bez-svetla.avif",
    content: `
Nie každý nápis potrebuje svietiť. Táto ukážka zobrazuje materiál **3D tlač plné písmo** — celé vytlačené telo bez akéhokoľvek podsvietenia.

## Výhody plnej 3D tlače

- **Najtenšia a najľahšia stavba** spomedzi všetkých materiálov, ktoré ponúkame
- **Bez elektriky** — žiadne LED pásiky, žiadny zdroj, žiadna montáž káblov
- **Nižšia cena** oproti svetelným variantom rovnakého tvaru

## Pre koho je to vhodné

Hodí sa najmä tam, kde je nápis dostatočne viditeľný vďaka osvetleniu priestoru — recepcie, showroomy, kancelárie, alebo dekoratívne logo na stene, ktoré nemusí svietiť samo.

## V konfigurátore

V konfigurátore túto verziu nájdete pod materiálom **3D tlač plné písmo** — konfigurátor vám pri jej výbere automaticky skryje možnosti svietenia, keďže táto stavba sa vyrába výhradne bez neho.
    `.trim(),
  },
  {
    slug: "alurol-podsvietenie-spredu",
    title: "Alurol s podsvietením spredu",
    desc: "Hliníkový profil Alurol s LED podsvietením spredu — najpevnejšia stavba pre veľké exteriérové nápisy a fasády.",
    category: "Materiály",
    date: "2026-08-10",
    readMin: 3,
    image: "/realizacie-ukazky/alurol-svetlo-spredu.avif",
    content: `
**Alurol** je hliníkový profil, z ktorého staviame naše najpevnejšie a najväčšie realizácie. Na fotke vidíte podsvietenie spredu — LED pásiky vo vnútri profilu presvecujú prednú plochu rovnomerným svetlom.

## Prečo Alurol na veľké formáty

- **Pevná konštrukcia** — zvládne aj nápisy s výškou písmena cez meter
- **Odolnosť voči počasiu** — hliník aj tesnenia sú stavané na exteriér
- **Profil 60 / 80 / 100 / 120 mm** podľa výšky písmena a požadovanej sily svetla

## Svietenie spredu vs. iné možnosti

Alurol vieme podsvietiť aj zozadu (halo efekt, kde svetlo dopadá na stenu za písmenom) — o tom píšeme v samostatnom článku. Svietenie spredu je priamočiarejšie: písmeno samo svieti rovnomerne po celej svojej ploche a je najlepšie čitateľné aj cez deň.

## V konfigurátore

Táto realizácia sa vám zobrazí, keď si vyberiete materiál **Alurol** so svietením **spredu** — presne taká, akú v tomto nastavení naozaj vyrábame.
    `.trim(),
  },
  {
    slug: "plexisklo-bez-podsvietenia",
    title: "Plexi s UV tlačou bez podsvietenia",
    desc: "Cenovo najdostupnejšia voľba do interiéru — rezané plexisklo s farebnou UV potlačou, bez elektriky.",
    category: "Materiály",
    date: "2026-08-13",
    readMin: 3,
    image: "/realizacie-ukazky/plexi-nesvetelne.avif",
    gallery: ["/realizacie-ukazky/plexi-nesvetelne-detail.avif"],
    content: `
Nie každé plexisklové písmeno svieti — táto ukážka zobrazuje **plexi s UV tlačou**, rezané na presný tvar a farebne potlačené UV tlačou, bez podsvietenia.

## Čo ponúka

- **Cenovo najdostupnejšia** plexisklová voľba, akú máme
- **Ľubovoľná farba** vďaka UV potlači priamo na materiál
- **Rýchla výroba** — bez elektroinštalácie a testovania svietenia

## Kde sa hodí

Táto stavba je určená **iba do interiéru** — recepcie, kancelárie, navigačné systémy, prevádzky, kde stačí, že nápis je vidieť pri bežnom osvetlení miestnosti.

## V konfigurátore

Vyberte materiál **Plexi s UV tlačou** a typ **nesvetelné** — presne túto kombináciu potom uvidíte aj v sekcii realizácií pri vašom konfigurátore.
    `.trim(),
  },
  {
    slug: "plexi-30mm-svetlo-spredu-a-hrany",
    title: "30 mm plexi: svetlo spredu aj z hrany naraz",
    desc: "Náš najuniverzálnejší svetelný materiál — 30 mm hrubé plexisklo, ktoré vieme presvietiť spredu, hranami, alebo oboma spôsobmi naraz.",
    category: "Materiály",
    date: "2026-08-17",
    readMin: 4,
    image: "/realizacie-ukazky/plexi30-svetlo-spredu-a-hrany.avif",
    content: `
**30 mm plexi** je náš najžiadanejší svetelný materiál — vďaka svojej hrúbke dokáže viesť svetlo dvoma smermi naraz: cez prednú plochu aj cez hrany po obvode písmena.

## Prečo kombinácia spredu + hrana

Keď LED pásik osvetlí 30 mm hrubý blok plexiskla z jednej strany, časť svetla presvieti von cez celú prednú plochu a časť sa "zachytí" v hranách a vykreslí jemný obrys okolo celého písmena. Výsledkom je nápis, ktorý svieti plošne aj má výrazný obrysový efekt zároveň.

## Technické parametre

- **Hrúbka 30 mm**, výška písmena 150 – 600 mm
- Svietenie **spredu**, **hranami**, alebo **oboma spôsobmi**
- Vhodné do interiéru aj exteriéru

## V konfigurátore

Ak v konfigurátore zapnete pri materiáli **30 mm plexi** obe možnosti svietenia naraz, uvidíte v sekcii realizácií presne túto ukážku.
    `.trim(),
  },
  {
    slug: "svietenie-hranami-detail",
    title: "Svietenie hranami zblízka — ako vyzerá obrysový efekt",
    desc: "Detailný záber na 30 mm plexi presvietené výhradne hranami — jemný, obrysový glow efekt okolo celého písmena.",
    category: "Materiály",
    date: "2026-08-20",
    readMin: 3,
    image: "/realizacie-ukazky/svietenie-hranami.avif",
    gallery: ["/realizacie-ukazky/svietenie-hranami-detail.avif"],
    content: `
Táto ukážka je detailný záber na **svietenie hranami** — variantu, kde LED svetlo presvecuje výhradne bočné hrany 30 mm plexiskla, nie prednú plochu.

## Ako efekt vzniká

Svetlo sa privádza z boku profilu a v materiáli sa čiastočne odráža smerom von cez hrany, zatiaľ čo predná plocha zostáva tmavšia. Vznikne tak jemný, obrysový glow — písmeno akoby malo svietiacu siluetu.

## Kedy hranové svietenie voliť

- Keď chcete **decentnejší, menej agresívny** svetelný efekt ako plné podsvietenie
- Pri **veľkých formátoch**, kde by plošné svietenie pôsobilo príliš silno
- Ako **doplnkový efekt** ku klasickému svieteniu spredu (viď kombinovaný variant "spredu aj z hrany")

## V konfigurátore

Nastavte materiál **30 mm plexi** a svietenie **hranami** — presne túto ukážku potom uvidíte pri svojom nastavení.
    `.trim(),
  },
  {
    slug: "halo-efekt-svetlo-zozadu",
    title: "Halo efekt — svetlo, ktoré vychádza spoza písmena",
    desc: "Klasický halo efekt na hliníkovom profile Alurol — písmeno samo zostáva tmavé, no za ním žiari jemný svetelný okraj na stene.",
    category: "Materiály",
    date: "2026-08-24",
    readMin: 4,
    image: "/realizacie-ukazky/halo-svetlo-zozadu.avif",
    gallery: ["/realizacie-ukazky/halo-svetlo-zozadu-detail.avif"],
    content: `
**Halo efekt** je jeden z najžiadanejších spôsobov svietenia pre exteriérové nápisy z hliníkového profilu Alurol. LED pásiky smerujú svetlo dozadu, cez dištančníky na stenu za písmenom — samotné písmeno zostáva tmavé, ale okolo neho žiari jemná svetelná žiara.

## Prečo je halo efekt taký obľúbený

- **Elegantný, premium vzhľad** — často používaný pre značky, ktoré chcú pôsobiť diskrétne, no výrazne
- **Nižšia svietivosť do očí** — svetlo nesvieti priamo, ale odráža sa od steny
- **Funguje najlepšie na tmavšom podklade**, kde svetelný okraj vynikne

## Ako sa to robí technicky

Písmeno má na zadnej strane dištančníky (zvyčajne 5 – 10 cm), ktoré vytvoria vzduchovú medzeru medzi písmenom a stenou. LED pásik nasmerovaný dozadu potom osvetlí práve túto medzeru a stenu za ňou.

## V konfigurátore

Vyberte materiál **Alurol** a svietenie **zozadu** — presne tento halo efekt sa vám zobrazí v sekcii realizácií, aby ste vedeli, ako bude váš nápis v skutočnosti vyzerať na stene.
    `.trim(),
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
