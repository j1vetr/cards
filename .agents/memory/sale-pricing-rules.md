---
name: Sale pricing policy
description: User's USD-to-TRY pricing formula and stock-preserving safety constraints.
---

Use market USD × automatically retrieved TCMB USD/TRY foreign-exchange selling rate × a configurable margin multiplier, initially 1.9, for site sale prices.

For Riftbound only, enforce these minimum TRY sale prices after conversion and multiplier: Common normal 15, Uncommon normal 25, Rare normal 90, Common foil 50, Uncommon foil 70. Higher calculated prices stay unchanged. No new floor applies to Rare foil or unspecified rarities.

**Why:** The user explicitly requested fixed lower limits and confirmed “Yalnızca Riftbound”. They were told Rare Foil and unspecified types would not receive a new floor.

**How to apply:** Use the canonical source rarity and finish consistently in preview, import, stock entry and scheduled pricing. Local display metadata must not alter price identity. Do not invent a market price for missing or stale source prices. Preserve stock and keep Pokémon pricing unchanged.

**Why:** The user explicitly wants site prices derived from the external market, not an Excel-only market-price report, and selected automatic central-bank exchange rates.

**How to apply:** Show the rate's publication date and preview proposed prices before changing existing active in-stock listings. Preserve inventory counts and skip uncertain variant matches. Do not interpret multiplying USD by 1.9 alone as a TRY conversion or use a graded high price for an ungraded card.

Keep exactly one admin price-fetching and sale-price update workflow. Do not reintroduce a separate raw-price sync or automatic-listing tool alongside it.

**Why:** The user explicitly asked to remove the old/new pricing alternatives because they were confusing and to keep only the latest automatic-TCMB workflow.

**How to apply:** Keep metadata import and ordinary manual inventory editing separate from automatic pricing. Removing obsolete pricing tools must not delete actual cards, listings, inventory or pricing history.

Use a single upstream provider for both card catalog data and market prices when migrating providers.

**Why:** The user asked to move away from separate card and price sources after observing incorrect prices and inconsistent card identities.

**How to apply:** Verify full printing identifiers, currency and commercial usage rights before replacing providers. The user selected a Riftbound-only RiftHunt migration and a zero-stock installation, then explicitly removed the backup requirement for the one-time deletion. Keep Pokémon unchanged. After that reset, preserve inventory during all price and catalog updates. See the RiftHunt identity contract for the scope decision. A provider change cannot reconstruct previously overwritten stock.
