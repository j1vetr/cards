// Eski/kalkmış URL'ler için denetlenmiş 301/410 karar listesi (bkz.
// docs/legacy-url-audit.md — tam denetim raporu). server/index.ts bunu
// başlangıçta `redirects` tablosuna idempotent olarak seed eder; tests/
// içindeki testler aynı listeyi zincirsizlik/iç tutarlılık için doğrular.
export interface LegacyUrlDecision {
  fromPath: string;
  toPath: string | null;
  statusCode: 301 | 404 | 410;
  note: string;
}

const OLD_APPAREL_CATEGORY_SLUGS = [
  "mermer", "pantolon", "jeans", "buyuk-beden-pantolon", "ozel-seri",
  "esofman", "t-shirt", "salvar-pantolon", "sifir-kol-atlet", "sort",
  "tshirt", "ceket", "gomlek", "kazak", "kumas-pantolon",
] as const;

export { OLD_APPAREL_CATEGORY_SLUGS };

export const LEGACY_URL_DECISIONS: LegacyUrlDecision[] = [
  ...OLD_APPAREL_CATEGORY_SLUGS.map((slug) => ({
    fromPath: `/kategori/${slug}`,
    toPath: null,
    statusCode: 410 as const,
    note: "Eski Ecarte Jeans giyim kategorisi — TCG mağazasına geçişte kalıcı olarak kaldırıldı, karşılığı yok.",
  })),
  {
    fromPath: "/urun/riftbound-league-of-legends-tcg-set-2-spiritforged-booster-pack",
    toPath: "/set/riftbound-sfd",
    statusCode: 301,
    note: "Eski ürün sayfası — Spiritforged setinin en yakın güncel karşılığına (set sayfası) yönlendirildi.",
  },
];
