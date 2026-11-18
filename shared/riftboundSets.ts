// Set identity follows the provider's canonical code, never a translated label.
const expansionLogos: Record<string, string> = {
  ogn: "/logo-riftbound.png",
  ogs: "/logo-riftbound.png",
  sfd: "/riftbound/sets/sfd.webp",
  unl: "/riftbound/sets/unl.webp",
  ven: "/riftbound/sets/ven.webp",
  rad: "/riftbound/sets/rad.webp",
};
const promotionalSets = new Set(["opp", "pr", "jdg", "sgn", "rwb"]);

export function getRiftboundSetAssets(codeOrSlug: string): { logo: string; symbol: string } | null {
  const code = codeOrSlug.toLowerCase().replace(/^riftbound-/, "");
  const logo = expansionLogos[code] ?? (promotionalSets.has(code) ? "/icon-riftbound.svg" : null);
  return logo ? { logo, symbol: "/icon-riftbound.svg" } : null;
}

export function withRiftboundSetAssets<T extends { game_slug: string; slug: string; logo_url: string | null; symbol_url: string | null }>(set: T): T {
  const assets = set.game_slug === "riftbound" ? getRiftboundSetAssets(set.slug) : null;
  return assets ? { ...set, logo_url: assets.logo, symbol_url: assets.symbol } : set;
}
