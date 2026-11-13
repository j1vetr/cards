---
name: RiftHunt printing identity
description: Safe join keys, finishes and catalog scope when considering RiftHunt as a source.
---

Use `printing_id` to join RiftHunt catalog and price bulk exports. Never join on `riftboundId` alone or use the bulk numeric `num` as the full collector identifier.

**Why:** Live evaluation confirmed shared Riot identifiers across separate printings. The Vendetta special Kai'Sa has bulk `num: 1` but printed collector `sp1`. Price identity mistakes can otherwise recur even when catalog and prices use the same provider.

**How to apply:** Preserve special collector tokens and distinguish printings from oracle-level cards. Use the catalog's supported `finishes` before selecting a price finish. Price rows may contain both normal and foil keys even for foil-only printings. TCGplayer market is decimal USD, Cardmarket trend is decimal EUR, neither is integer cents.

RiftHunt serves Riftbound, not the user's entire Pokémon and Riftbound catalog.

**Why:** The user wants one source for both games. RiftHunt can unify Riftbound metadata and prices but cannot fulfill the two-game requirement alone.

**How to apply:** Do not silently replace the agreed single-provider goal with a multi-provider setup. Discuss that tradeoff before migration. Use bulk snapshots at most daily and inspect per-row price timestamps rather than the export creation time.
