export type Realization = {
  id: string;
  title: string;
  client: string;
  year: string;
  category: string;
  featured?: boolean;
  signType: ("illuminated" | "plain")[];
  // material IDs matching lib/options.ts MATERIALS: plexi | 3dtlac | kompozit | pvc
  materials: string[];
  tags: string[];
  // Priame URL z 4from.media CDN — bez lokálnych kópií.
  // Ak chceš vlastné fotky, stiahni ich do /public/realizacie/ a zmeň na /realizacie/{id}.jpg
  // (potom treba pridať unoptimized={false} v ShowcaseSection a odstrániť ?query z URL).
  image: string;
  url: string;
};

export const realizations: Realization[] = [

  // ── ILLUMINATED ─────────────────────────────────────────────────────────────

  {
    id: "garo-burger",
    title: "Garo Burger – Svetelné Logo",
    client: "Burger house Garo s. r. o.",
    year: "04/2025",
    category: "Svetelné písmo",
    featured: true,                      // fallback keď nič nesedí
    signType: ["illuminated"],
    materials: ["3dtlac", "plexi"],
    tags: ["reštaurácia", "pismo", "exterier", "halo", "fast-food"],
    image: "https://www.4from.media/sub/4from.media/images/blog/garo-burger-svetelna-reklama/garo_burger_0001_svetelna_reklama.jpg",
    url: "https://www.4from.media/realizacie/garo-burger-svetelne-logo/",
  },

  {
    id: "chlebicek",
    title: "Chlebíček – Svetelné Logo",
    client: "NOIRES s. r. o.",
    year: "03/2025",
    category: "Svetelné logo",
    signType: ["illuminated"],
    materials: ["plexi"],
    tags: ["food", "logo", "interier", "front", "halo", "bistro"],
    image: "https://www.4from.media/sub/4from.media/images/blog/chlebicek_svetelna-reklama/00_Chlebicek_svetelna_reklama_hlavna.jpg.avif?606546",
    url: "https://www.4from.media/realizacie/chlebicek-svetelna-reklama/",
  },

  {
    id: "banovecka-mliekaren",
    title: "Bánovecká Mliekareň – Interierové Svetelné Logo",
    client: "MILSY a.s.",
    year: "05/2026",
    category: "Svetelné logo",
    signType: ["illuminated"],
    materials: ["plexi", "kompozit"],
    tags: ["logo", "interier", "halo", "combined", "potravinarstvo"],
    image: "https://www.4from.media/sub/4from.media/images/blog/banovecka-mliekaren-interierove-svetelne-logo/Banovecka_mliekaren_interierove_svetelne_logo_1.jpeg.avif?912361",
    url: "https://www.4from.media/realizacie/banovecka-mliekaren-interierove-svetelne-logo/",
  },

  {
    id: "ak-barbers",
    title: "AK Barbers – Svetelné Logo a Neon Flex",
    client: "AK Barbers",
    year: "08/2025",
    category: "Svetelná reklama",
    signType: ["illuminated"],
    materials: ["plexi", "3dtlac"],
    tags: ["barber", "pismo", "exterier", "halo", "combined"],
    image: "https://www.4from.media/sub/4from.media/images/blog/ak_barbers_svetelne_logo_a_neon_flex/AK_Barbers_sveteln%C3%A9_loga_a_neon_flex_text_na_stenu_(1).jpg.avif?606546",
    url: "https://www.4from.media/realizacie/ak-barbers-svetelna-reklama/",
  },

  {
    id: "neobalance",
    title: "Neobalance – 3D Podsvietené Logo",
    client: "Neobalance",
    year: "03/2025",
    category: "Svetelné logo",
    signType: ["illuminated"],
    materials: ["3dtlac"],
    tags: ["logo", "interier", "wellness", "front", "3d-tlac"],
    image: "https://www.4from.media/sub/4from.media/images/blog/neobalance-svetelne-logo/3D_podsvietene_logo_interier_(1).jpg.avif?606546",
    url: "https://www.4from.media/realizacie/neobalance-3d-podsvietene-logo/",
  },

  {
    id: "mestska-policia",
    title: "Mestská Polícia Trenčín – Svetelné Logo",
    client: "Mesto Trenčín",
    year: "08/2025",
    category: "Svetelné písmo",
    signType: ["illuminated"],
    materials: ["kompozit"],
    tags: ["logo", "verejne", "exterier", "halo"],
    image: "https://www.4from.media/sub/4from.media/images/blog/mestska_policia_trencin_svetelne_logo/Mestk%C3%A1_Policia_Tren%C4%8D%C3%ADn_sveteln%C3%A9_logo_(1).jpg.avif?606546",
    url: "https://www.4from.media/realizacie/mestska-policia-trencin-svetelne-logo/",
  },

  {
    id: "milsy-svetelna-reklama",
    title: "Milsy – Svetelná Reklama",
    client: "Milsy a.s.",
    year: "07/2024",
    category: "Svetelná reklama",
    signType: ["illuminated"],
    materials: ["kompozit", "plexi"],
    tags: ["logo", "exterier", "halo", "combined"],
    image: "https://www.4from.media/sub/4from.media/images/blog/milsy_svetelna_reklama/02_milsy_svetelna_reklama_3D_pismo.jpg.avif?606546",
    url: "https://www.4from.media/realizacie/milsy-a-s-svetelna-reklama/",
  },

  // ── PLAIN ────────────────────────────────────────────────────────────────────

  {
    id: "gentleman",
    title: "Gentleman – 3D Plexi Písmo",
    client: "GENTLEMAN fasthion s.r.o.",
    year: "05/2021",
    category: "3D písmo",
    signType: ["plain", "illuminated"],
    materials: ["plexi"],
    tags: ["fashion", "plexi", "pismo", "interier", "premium"],
    image: "https://www.4from.media/sub/4from.media/images/blog/gentleman/gentleman_2.jpg.avif?606546",
    url: "https://www.4from.media/realizacie/gentleman-3d-plexi-pismo/",
  },

  {
    id: "medicentrum-navig",
    title: "Medicentrum – Navigačný Systém",
    client: "FARMENA s.r.o.",
    year: "03/2025",
    category: "3D písmo",
    signType: ["plain"],
    materials: ["pvc", "kompozit"],
    tags: ["medicinska", "navigacia", "interier", "plain", "pismo"],
    image: "https://www.4from.media/sub/4from.media/images/blog/medicentrum_navigacny-system/01_farmena_medicentrum_navigacny_system.jpg.avif?606546",
    url: "https://www.4from.media/realizacie/medicentrum-navigacny-system/",
  },

  {
    id: "matchiaren-kiosk",
    title: "Matchiareň – 3D Tlač Loga na Kiosk",
    client: "Matchiareň",
    year: "2025",
    category: "3D tlač",
    signType: ["plain"],
    materials: ["3dtlac"],
    tags: ["logo", "kiosk", "plain", "3d-tlac", "gastro"],
    image: "https://www.4from.media/sub/4from.media/images/blog/matchiaren-3d-logo-kiosk/3D_loga_3D_tlac_matchiaren_kiosk.jpg.avif?606546",
    url: "https://www.4from.media/realizacie/matchiaren-3d-tlac-loga-na-kiosk/",
  },

  {
    id: "tauros-tech",
    title: "Tauros.Tech – Brand Predajne",
    client: "Autoprima s.r.o.",
    year: "09/2024",
    category: "Store dizajn",
    signType: ["plain"],
    materials: ["pvc", "3dtlac"],
    tags: ["auto", "store-dizajn", "plain", "pismo", "interier"],
    image: "https://www.4from.media/sub/4from.media/images/blog/tauros_brand-predajne/01_4frommedia_tauros_brand_predajne.jpg.avif?606546",
    url: "https://www.4from.media/realizacie/tauros-tech-brand-predajne/",
  },

  {
    id: "zmrzlina-skalka",
    title: "Zmrzlina Skalka – Reklamné Označenie",
    client: "Zmrzlina Skalka",
    year: "06/2026",
    category: "Store dizajn",
    signType: ["plain"],
    materials: ["pvc"],
    tags: ["store", "exterier", "plain", "gastro"],
    image: "https://www.4from.media/sub/4from.media/images/blog/zmrzlina-skalka/Polep_zmrzlina_Skalka_1.jpg.avif?892598",
    url: "https://www.4from.media/realizacie/zmrzlina-skalka/",
  },
];

// ── Prisma model (pripravený na zapnutie) ─────────────────────────────────────
//
// model Realization {
//   id        String   @id @default(cuid())
//   title     String
//   client    String
//   year      String
//   category  String
//   featured  Boolean  @default(false)
//   signType  String[]
//   materials String[]
//   tags      String[]
//   image     String
//   url       String
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt
// }
//
// Server component / route:
//   const rows = await prisma.realization.findMany({ orderBy: { createdAt: "desc" } });
