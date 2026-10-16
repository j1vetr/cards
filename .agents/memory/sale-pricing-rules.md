---
name: Sale pricing policy
description: User's USD-to-TRY pricing formula and stock-preserving safety constraints.
---

Use market USD × automatically retrieved TCMB USD/TRY foreign-exchange selling rate × a configurable margin multiplier, initially 1.9, for site sale prices.

**Why:** The user explicitly wants site prices derived from the external market, not an Excel-only market-price report, and selected automatic central-bank exchange rates.

**How to apply:** Show the rate's publication date and preview proposed prices before changing existing active in-stock listings. Preserve inventory counts and skip uncertain variant matches. Do not interpret multiplying USD by 1.9 alone as a TRY conversion or use a graded high price for an ungraded card.

Keep exactly one admin price-fetching and sale-price update workflow. Do not reintroduce a separate raw-price sync or automatic-listing tool alongside it.

**Why:** The user explicitly asked to remove the old/new pricing alternatives because they were confusing and to keep only the latest automatic-TCMB workflow.

**How to apply:** Keep metadata import and ordinary manual inventory editing separate from automatic pricing. Removing obsolete pricing tools must not delete actual cards, listings, inventory or pricing history.
