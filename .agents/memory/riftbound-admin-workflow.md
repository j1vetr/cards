---
name: Riftbound admin workflow
description: The owner's dedicated Riftbound inventory and price-exploration workspace.
---

Keep routine Riftbound stock entry and price-list exploration together in a dedicated admin section named “Riftbound Panel”, rather than embedding the entire workflow in Card API Sync.

**Why:** The user asked “Riftbound Panel sekmesi yapalım adminde orada toplayalım kartları” and specifically wants to investigate high-priced cards that are not in stock.

**How to apply:** Keep the generic API Sync page focused on its other providers and link to the Riftbound section. Preserve easy access to out-of-stock cards, highest-price ordering and price filters alongside stock entry. Highest and lowest prices must represent the complete filtered result, not only one page. Do not extend this provider-specific workflow into Pokémon.

Use Turkish-aware title case for the Riftbound panel's headings, field labels and selectable items, with every word starting uppercase. Use the Riftbound brand icon for its admin menu entry.

**Why:** The user requested “2. 3. kelimeler büyük başlasın” for panel headings, fields and selectable items, and asked to replace its generic menu icon with the Riftbound icon.

**How to apply:** Keep brand names and acronyms intact, use `tr-TR` for Turkish casing, and leave source identifiers, option values and stored card data unchanged. Do not title-case full explanatory paragraphs.
