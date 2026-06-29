import type { Category } from "@shared/schema";

export interface CategoryGroupRule {
  title: string;
  matches: string[];
}

export const AUTO_GROUP_DISPLAY_ORDER_BASE = 1000;
export const AUTO_GROUP_DISPLAY_ORDER_MAX = 99999;

// TCG category grouping rules
export const CATEGORY_GROUP_RULES: CategoryGroupRule[] = [
  {
    title: "Pokemon TCG",
    matches: [
      "pokemon",
      "pokémon",
      "pikachu",
      "poke",
    ],
  },
  {
    title: "Riftbound",
    matches: [
      "riftbound",
      "rift",
      "rift bound",
    ],
  },
  {
    title: "Koleksiyon Kartları",
    matches: [
      "koleksiyon",
      "collection",
      "collector",
    ],
  },
  {
    title: "Booster & Set",
    matches: [
      "booster",
      "set",
      "expansion",
      "genişleme",
      "paket",
    ],
  },
  {
    title: "Aksesuar",
    matches: [
      "aksesuar",
      "accessory",
      "sleeve",
      "koruyucu",
      "binder",
      "deck",
      "box",
      "kutu",
      "klasör",
    ],
  },
  {
    title: "Psa & Gradlenmiş",
    matches: [
      "psa",
      "bgs",
      "cgc",
      "grade",
      "gradlenmiş",
      "derecelendirilmiş",
    ],
  },
  {
    title: "Single Kart",
    matches: [
      "single",
      "tekil",
      "kart",
      "card",
    ],
  },
  {
    title: "Diğer",
    matches: [],
  },
];

const FALLBACK_GROUP = "Diğer";

export function classifyCategoryByRules(name: string): string {
  const normalized = name.toLowerCase().trim();
  for (const rule of CATEGORY_GROUP_RULES) {
    if (rule.matches.length === 0) continue;
    if (rule.matches.some((m) => normalized.includes(m))) {
      return rule.title;
    }
  }
  return FALLBACK_GROUP;
}

export function buildMenuGroupingFromCategories(
  categories: Category[],
): Map<string, Category[]> {
  const groups = new Map<string, Category[]>();

  for (const cat of categories) {
    const groupTitle = classifyCategoryByRules(cat.name);
    if (!groups.has(groupTitle)) {
      groups.set(groupTitle, []);
    }
    groups.get(groupTitle)!.push(cat);
  }

  return groups;
}

export interface GroupingPlan {
  groups: Array<{ title: string; categories: Category[] }>;
}

export function buildGroupingPlan(categories: Category[]): GroupingPlan {
  const map = buildMenuGroupingFromCategories(categories);
  const groups: Array<{ title: string; categories: Category[] }> = [];
  for (const [title, cats] of Array.from(map.entries())) {
    if (cats.length > 0) {
      groups.push({ title, categories: cats });
    }
  }
  return { groups };
}
