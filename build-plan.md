# Build plán — 3DPÍSMO / rozsvietto

Postupuj zhora dole, jeden prompt = jeden krok. Po každom kroku porovnaj
výsledok so screenshotom v `/design` a doladíš, až potom ďalej.

Projekt: `C:\Users\David\rozsvietto` · Next.js (App Router) + TS + Tailwind
Screenshoty: `01-hero+configurator.png` (header, hero, konfigurátor),
`02-sections.png` (video, ako to funguje, blog).

> Pred štartom: nahádž screenshoty do `/design`, hoď `CLAUDE.md` do rootu.

---

## Krok 0 — Design tokeny

```
Prečítaj CLAUDE.md. Nastav token systém (zatiaľ wireframe → neutrálny základ
+ modrý akcent z hlavičky):
1. tailwind.config.ts — theme.extend: farby (primary = modrá z hlavičky,
   background biela, foreground čierna, surface/border sivé odtiene),
   fontSize škála, spacing, borderRadius, boxShadow.
2. app/globals.css — CSS premenné pre farby + import fontov.
Farby sú zatiaľ provizórne, neskôr ich nahradíme brand paletou. Ukáž oba súbory.
Na záver spusti `npx tsc --noEmit` a over že je čisto.
```

---

## Krok 1 — Layout + Header

```
Pozri /design/01-hero+configurator.png (vrchná lišta).
Postav components/layout/Header.tsx a zapoj ho do app/layout.tsx.

Header obsahuje:
- vľavo logo "3DPÍSMO" (bold)
- vpravo nav linky: MATERIÁLY, CENY, FAQ, BLOG, PRIHLÁS SA
  (POZOR: na screenshote je preklep "FQA", správne je "FAQ")
- "PRIHLÁS SA" vizuálne zvýraznené (bold)
- pod hlavičkou tenká modrá akcentová linka (primary)
- sticky na vrchu, mobile-first → na mobile hamburger menu

Použi tokeny z CLAUDE.md. Po dokončení spusti `npx tsc --noEmit`.
Vypíš mi, kde si si nebol istý.
```

---

## Krok 2 — Hero

```
Pozri /design/01-hero+configurator.png (sekcia s nadpisom).
Postav components/sections/Hero.tsx:
- veľký centrovaný nadpis na 2 riadky: "POĎ SI S NAMI" / "VYTVORIŤ VÁŠ SVETELNÝ TEXT"
- pod ním centrovaný tlmený podtext (2 riadky): pomoc / návod ako na to
Responzívne, tokeny z CLAUDE.md. `npx tsc --noEmit` na záver.
```

---

## Krok 3 — Konfigurátor (rozdeľ na 3a–3d)

Toto je srdce stránky. **Ak máš starý HTML prototyp konfigurátora, prilož ho**
a v 3a povedz Claude Code nech z neho prenesie logiku (6 režimov svietenia,
materiály, ceny) namiesto vymýšľania od nuly.

### 3a — Layout konfigurátora + stav

```
Pozri /design/01-hero+configurator.png (stredná časť).
Postav components/sections/Configurator.tsx ako 3-stĺpcový layout
(na mobile pod seba):
- ĽAVÝ stĺpec: "ODPORÚČANÉ PÍSMO" (výber písma) + "MATERIÁLY"
  (ALLUBOND, PLEXI SKLO, 3D TLAČ, PVC — jeden aktívny)
- STREDNÝ stĺpec: input na text + živý 3D náhľad + "OTÁČANIE" so stupňami
- PRAVÝ stĺpec: "SVIETENIE" (6 režimov), "FARBA" (rainbow slider), "HRÚBKA"
- dole centrovaný CTA "OBJEDNAŤ"

Zatiaľ len layout + React state (useState) pre: text, font, materiál,
režim svietenia, farba, hrúbka, rotácia. Žiadna 3D logika ešte.
Tokeny z CLAUDE.md, mobile-first. `npx tsc --noEmit`.
```

### 3b — Živý 3D náhľad textu

```
Pridaj do Configurator.tsx živý náhľad zadaného textu ako svetelné/3D písmo.
- text z inputu sa zobrazuje v strednom paneli (default "VÁŠ TEXT")
- efekt: extrudované písmená s glow/svetelným efektom (CSS 3D transform +
  text-shadow), reaguje na zvolenú farbu (FARBA) a hrúbku (HRÚBKA)
- pod textom oblúk + ovládanie "OTÁČANIE" (slider 0–360°, default 24°),
  ktorý otáča náhľad cez CSS transform rotateY
(Ak chcem neskôr pravý 3D, vieme prejsť na Three.js — teraz stačí CSS.)
`npx tsc --noEmit`.
```

### 3c — Režimy svietenia + materiály + písmo

```
Zapoj ovládacie prvky do náhľadu:
- "SVIETENIE": 6 režimov (ikony v mriežke). Definuj ich ako pole objektov
  { id, nazov, popis } a každý mení vzhľad glow efektu náhľadu. Aktívny zvýrazni.
  [Ak prikladám starý prototyp, prenes presne tých 6 režimov z neho.]
- "MATERIÁLY": výber mení label/štýl náhľadu, aktívny zvýraznený (ako ALLUBOND
  na screenshote)
- "ODPORÚČANÉ PÍSMO": carousel so šípkami, mení font-family náhľadu
`npx tsc --noEmit`.
```

### 3d — Cena + OBJEDNAŤ

```
Pridaj výpočet ceny podľa: materiál, hrúbka, dĺžka textu, režim svietenia.
[Ak prikladám prototyp, prenes cenovú logiku z neho.] Cenu zobraz nad/pri
tlačidle "OBJEDNAŤ". Tlačidlo zatiaľ len console.log so zhrnutím konfigurácie.
`npx tsc --noEmit`.
```

---

## Krok 4 — Video sekcia

```
Pozri /design/02-sections.png (vrch).
Postav components/sections/VideoPreview.tsx:
- nadpis "TU SA MÔŽETE POZIEŤ AKO VYZERÁ VÁŠ TEXT V PRAXI" + podtext
- veľký 16:9 placeholder blok (sivý) s textom o tom, že sa tu zobrazí
  video podľa zadaného textu
Tokeny z CLAUDE.md. `npx tsc --noEmit`.
```

---

## Krok 5 — Ako to funguje

```
Pozri /design/02-sections.png (stred).
Postav components/sections/HowItWorks.tsx:
- nadpis "AKO TO FUNGUJE" + podtext
- 4 kroky vedľa seba (na mobile pod seba), každý: kruhová ikona/číslo,
  nadpis, krátky popis:
  1. NAPÍŠ SVOJ TEXT
  2. VYBERIEŠ SI SVOJE PARAMETRE
  3. OBJEDNÁŠ SI
  4. A PÁR DNÍ BUDE U VÁS
Tokeny z CLAUDE.md, responzívne. `npx tsc --noEmit`.
```

---

## Krok 6 — Blog

```
Pozri /design/02-sections.png (spodok).
Postav components/sections/BlogPreview.tsx:
- nadpis "PREČÍTAJTE SI VIAC V NAŠOM BLOGU" + podtext
- 3 karty (na mobile pod seba), každá: obrázkový placeholder, nadpis, popis:
  "KTO SME A ČO ROBÍME?", "AKÝ MATERIÁL SI VYBRAŤ?", "AKÝ OBRÁZOK JE KVALITNÝ?"
- karty sú klikateľné (zatiaľ # odkaz)
Tokeny z CLAUDE.md. `npx tsc --noEmit`.
```

---

## Krok 7 — Footer

```
Postav components/layout/Footer.tsx v štýle vytlacto3d.sk:
- názov projektu + krátky popis
- Kontakt: info@4frommedia.sk, +421 907 907 097
- Výroba: 4from media, s.r.o., M. Hodžu 393/5, 971 01 Prievidza
- odkazy: GDPR, Obchodné podmienky, Kontakt
- copyright "© 2026 ... Projekt spoločnosti 4from media, s.r.o."
Zapoj do layoutu. `npx tsc --noEmit`.
```

---

## Krok 8 — Skladba stránky

```
Poskladaj app/page.tsx v poradí: Hero → Configurator → VideoPreview →
HowItWorks → BlogPreview. Header a Footer sú v layoute.
Over `npm run build` že celé prejde bez chýb a skontroluj responzivitu.
```
