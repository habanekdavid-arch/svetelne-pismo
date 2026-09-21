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
