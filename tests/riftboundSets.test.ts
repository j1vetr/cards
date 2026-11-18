import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { getRiftboundSetAssets, withRiftboundSetAssets } from "../shared/riftboundSets";

describe("canonical Riftbound set branding", () => {
  it.each(["ogn", "ogs", "sfd", "unl", "ven", "rad", "opp", "pr", "jdg", "sgn", "rwb"])("ships a local logo for %s and accepts public slugs", code => {
    const assets = getRiftboundSetAssets(code);
    expect(assets).not.toBeNull();
    expect(getRiftboundSetAssets(`riftbound-${code}`)).toEqual(assets);
    expect(getRiftboundSetAssets(code.toUpperCase())).toEqual(assets);
    expect(existsSync(`client/public${assets!.logo}`)).toBe(true);
    expect(existsSync(`client/public${assets!.symbol}`)).toBe(true);
  });
  it("does not invent a mark for future sets or modify Pokémon branding", () => {
    expect(getRiftboundSetAssets("future")).toBeNull();
    const pokemon = { game_slug: "pokemon", slug: "pokemon-sv", logo_url: "pokemon-logo", symbol_url: "pokemon-symbol" };
    expect(withRiftboundSetAssets(pokemon)).toBe(pokemon);
    const future = { ...pokemon, game_slug: "riftbound", slug: "riftbound-future" };
    expect(withRiftboundSetAssets(future)).toBe(future);
  });
  it("supplies current marks to existing imports without a resync", () => {
    expect(withRiftboundSetAssets({ game_slug: "riftbound", slug: "riftbound-ven", logo_url: null, symbol_url: null }).logo_url).toBe("/riftbound/sets/ven.webp");
  });
});
