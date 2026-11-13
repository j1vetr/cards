---
name: KartFiyat live API contract
description: Live API differs from the published examples, particularly prices, plan access and printing codes.
---

Treat KartFiyat documentation as a starting point, not a verified response contract.

**Why:** Read-only testing with the user's trial access showed REST prices as formatted USD strings such as `$65.00`, while GraphQL returned empty price arrays for the same products. The documented GraphQL `prices(markets: ...)` argument was rejected as unknown. REST category access was denied for the trial despite item and price access working. These results do not establish what a paid plan returns.

**How to apply:** Probe actual schema and response shapes with the current subscription before choosing an adapter. Never apply PriceCharting's integer-cents conversion to KartFiyat formatted prices. Empty GraphQL prices are not evidence that REST has no price. Require verified currency and explicit grade selection.

Preserve printing distinctions independently of nullable product codes.

**Why:** Riftbound results distinguished Origins, Alternate Art and Vendetta Foil special printings, but some `code` fields were null even when full special identifiers were present in names.

**How to apply:** Bind validated upstream IDs to existing local records using game, set, full collector identifier and variant. Do not replace special identifiers with their numeric portions or match only by card name. Source changes must preserve existing listing identities and stock.
