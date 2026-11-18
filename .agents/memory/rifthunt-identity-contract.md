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

The user wants direct deletion of the old Riftbound catalog and stock without creating or downloading a backup. New source printings start at zero stock. Customer accounts and historical orders must survive.

**Why:** The user explicitly superseded the earlier backup-first choice with “Yedekli silme işlemine gerek yok direkt sil işlemi yapalım”. This is a one-time migration, not permission to delete stock during later price updates.

**How to apply:** Keep explicit destructive confirmation but do not require a backup for the one-time cleanup. Explain that preview fetches RiftHunt data and apply imports sets and cards at zero stock. Subsequent catalog and price refreshes must preserve stock. Do not silently reset production during development or testing.

Some unpriced token and rune identifiers omit the printed-total suffix, such as `sfd-t03` or `rad-r06b`.

**Why:** Live bulk evaluation found these alongside normal `ven-sp1-006` identities. Requiring the final total excludes the entire otherwise-valid catalog.

**How to apply:** Preserve their complete token or rune collector code even without prices. Never fall back to numeric `num`.

Allow admins to edit local card metadata, including rarity and description, without unlocking manual sale-price or printing-identity changes.

**Why:** The user requested testing of stock and rarity editing in the new RiftHunt admin flow. A broad provider-protection rule also blocked ordinary metadata edits and made the existing admin unusable.

**How to apply:** Protect pricing and canonical source set/printing identity separately from local metadata. Preserve manually edited metadata during refreshes, but continue automatic pricing and stock management against the original source printing.

Scheduled daily source refreshes must account for the Istanbul calendar day, not just an exact 24-hour cache lifetime.

**Why:** A download that finishes just after the scheduled minute is still a few seconds under 24 hours old at the next run. Reusing it can delay a daily source refresh by another whole day.

**How to apply:** Let scheduled refreshes reject yesterday's cached export while manual previews continue reusing the normal cache. Keep the provider's daily bulk-download limits in mind when changing either path.

Preserve the source rich rules field, not only plain text, when preparing card descriptions.

**Why:** Actual RiftHunt plain text concatenates some choice lists without separators. The rich field retains their paragraphs and list items. Cost codes and keyword brackets also need semantic rendering instead of literal display.

**How to apply:** Render allowlisted structure as React nodes with local symbols, never inject source HTML directly. Keep unknown identifiers readable. Treat `[>]` and `[>>]` as neutral effect separators, not instructions to activate twice. Use local edited descriptions instead of stale source rich text when the description differs, but retain source formatting after unrelated rarity or name edits.

Do not show a separate “Riftbound baskı verisi” section or its source-market, price-history and ruling content on the public card detail page.

**Why:** The user explicitly asked “Kart Detay sayfasından Riftbound baskı verisi ve altındaki tüm şeyleri sil”.

**How to apply:** Keep the main card description with icons, sale price and purchasing controls. This removes the extra public section, not the provider integration, admin tools or stored data.
