import type { Category } from "@shared/schema";

export interface CategoryGroupRule {
  title: string;
  matches: string[];
}

export const CATEGORY_GROUP_RULES: CategoryGroupRule[] = [
  {
    title: "Kadın Jean",
    matches: [
      "kadın",
      "kadin",
      "women",
      "bayan",
      "lady",
      "kız",
      "kiz",
      "femme",
    ],
  },
  {
    title: "Erkek Jean",
    matches: [
      "erkek",
      "men",
      "bay",
      "man",
      "male",
      "homme",
    ],
  },
  {
    title: "Çocuk Jean",
    matches: [
      "çocuk",
      "cocuk",
      "kids",
      "kid",
      "bebek",
      "junior",
      "çocuk jean",
      "cocuk jean",
      "kız çocuk",
      "erkek çocuk",
    ],
  },
  {
    title: "Skinny & Slim Fit",
    matches: [
      "skinny",
      "slim",
      "slim fit",
      "dar",
      "fitted",
      "super slim",
      "super skinny",
      "extra slim",
    ],
  },
  {
    title: "Mom & Straight Leg",
    matches: [
      "mom",
      "mom jean",
      "straight",
      "straight leg",
      "düz",
      "duz",
      "klasik",
      "classic",
      "regular",
      "orta bel",
    ],
  },
  {
    title: "Wide Leg & Baggy",
    matches: [
      "wide",
      "wide leg",
      "baggy",
      "bol",
      "loose",
      "relaxed",
      "oversize",
      "flare",
      "bootcut",
      "boot cut",
      "palazzo",
    ],
  },
  {
    title: "Premium Koleksiyon",
    matches: [
      "premium",
      "koleksiyon",
      "collection",
      "limited",
      "özel",
      "ozel",
      "special",
      "exclusive",
      "luxury",
      "high end",
    ],
  },
  {
    title: "Kampanya & Outlet",
    matches: [
      "kampanya",
      "indirim",
      "sale",
      "outlet",
      "fırsat",
      "firsat",
      "sezon sonu",
      "clearance",
      "yüzde",
      "yuzde",
    ],
  },
];

export const FALLBACK_GROUP_TITLE = "Diğer Jean";

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "c")
    .trim();
}

/**
 * Bir kategoriyi en uygun ana gruba ata.
 * Eşleşme yoksa FALLBACK_GROUP_TITLE döner.
 */
export function classifyCategory(categoryName: string): string {
  const name = normalize(categoryName);
  if (!name) return FALLBACK_GROUP_TITLE;

  let bestGroup = FALLBACK_GROUP_TITLE;
  let bestScore = 0;

  for (const rule of CATEGORY_GROUP_RULES) {
    for (const keyword of rule.matches) {
      const k = normalize(keyword);
      if (!k) continue;
      if (name.includes(k)) {
        // Daha uzun keyword = daha spesifik eşleşme → öncelikli
        if (k.length > bestScore) {
          bestScore = k.length;
          bestGroup = rule.title;
        }
      }
    }
  }

  return bestGroup;
}

export interface GroupingPlan {
  groups: Array<{
    title: string;
    categories: Array<{ id: string; name: string; slug: string }>;
  }>;
  totalCategories: number;
  unmatchedCount: number;
}

/**
 * Tüm kategorileri kuralları uygulayarak gruplara böler.
 * Boş gruplar dönen plana DAHİL EDİLMEZ.
 */
export function buildGroupingPlan(categories: Category[]): GroupingPlan {
  const buckets = new Map<string, Array<{ id: string; name: string; slug: string }>>();

  // Ana grup sırasını koru (kuralların sırası), fallback en sona
  const orderedTitles = [
    ...CATEGORY_GROUP_RULES.map((r) => r.title),
    FALLBACK_GROUP_TITLE,
  ];
  for (const title of orderedTitles) buckets.set(title, []);

  let unmatchedCount = 0;
  for (const cat of categories) {
    const groupTitle = classifyCategory(cat.name);
    if (groupTitle === FALLBACK_GROUP_TITLE) unmatchedCount++;
    buckets.get(groupTitle)!.push({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
    });
  }

  // Her grubun içinde alfabetik sırala
  Array.from(buckets.values()).forEach((list) => {
    list.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "tr"));
  });

  // Boş olmayan grupları sırada döndür
  const groups = orderedTitles
    .map((title) => ({
      title,
      categories: buckets.get(title) ?? [],
    }))
    .filter((g) => g.categories.length > 0);

  return {
    groups,
    totalCategories: categories.length,
    unmatchedCount,
  };
}

/**
 * Otomatik üretilen menu_items'ı işaretlemek için displayOrder aralığı.
 * Kullanıcının manuel eklediği öğeleri korumak için bu aralıkta olanlar
 * regenerate sırasında silinir.
 */
export const AUTO_GROUP_DISPLAY_ORDER_BASE = 1000;
export const AUTO_GROUP_DISPLAY_ORDER_MAX = 99999;
