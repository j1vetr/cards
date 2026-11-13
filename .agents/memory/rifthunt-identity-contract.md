---
name: RiftHunt printing identity
description: Safe join keys, finishes and catalog scope when considering RiftHunt as a source.
---

Use `printing_id` to join RiftHunt catalog and price bulk exports. Never join on `riftboundId` alone or use the bulk numeric `num` as the full collector identifier.

**Why:** Live evaluation confirmed shared Riot identifiers across separate printings. The Vendetta special Kai'Sa has bulk `num: 1` but printed collector `sp1`. Price identity mistakes can otherwise recur even when catalog and prices use the same provider.

**How to apply:** Preserve special collector tokens and distinguish printings from oracle-level cards. Use the catalog's supported `finishes` before selecting a price finish. Price rows may contain both normal and foil keys even for foil-only printings. TCGplayer market is decimal USD, Cardmarket trend is decimal EUR, neither is integer cents.

Use RiftHunt for Riftbound only. Do not change Pokémon's catalog or provider.

**Why:** After reviewing RiftHunt's scope, the user explicitly chose “Pokémon’a dokunma, Riftbound’u değiştir”. This supersedes the earlier two-game single-provider goal.

**How to apply:** Keep every reset, import, automatic pricing and legacy-provider guard scoped to Riftbound. Use bulk snapshots at most daily and inspect per-row price timestamps rather than the export creation time.

The user approved a backup-first clean Riftbound installation, including deletion of old stock. New source printings start at zero stock. Customer accounts and historical orders must survive.

**Why:** The user asked to remove every old Riftbound listing and image and explicitly answered “Evet, yedekli temiz kurulum yap” after the stock-deletion warning. This is a one-time migration, not permission to delete stock during later price updates.

**How to apply:** On the external production server require a completed backup download and explicit reset confirmation before deleting old Riftbound data. Subsequent catalog and price refreshes must preserve stock. Do not silently reset production during development or testing.

Some unpriced token and rune identifiers omit the printed-total suffix, such as `sfd-t03` or `rad-r06b`.

**Why:** Live bulk evaluation found these alongside normal `ven-sp1-006` identities. Requiring the final total excludes the entire otherwise-valid catalog.

**How to apply:** Preserve their complete token or rune collector code even without prices. Never fall back to numeric `num`.
