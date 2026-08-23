---
name: Legacy URL redirect/410 decision map
description: How old/defunct URLs are handled — DB-driven redirect decisions, not hardcoded code, plus the reasoning for 410 vs 301 and why catalog cleanup must stay separate.
---

Old indexed URLs from a brand/catalog change need a per-URL decision (301 to a real equivalent, or 410 gone) that must not require a code deploy every time a slug changes.

**Decision:** Old-URL 301/404/410 decisions are DB-managed data, not hardcoded logic or a one-off script, so a slug rename never needs a code deploy — just a new row, and the data is provisioned automatically on any environment (including a fresh production database).

**Why:** Hardcoding old-URL decisions means every slug rename needs a deploy; DB-managed data keeps the decision (and its reasoning) attached to the data itself.

**How to apply:**
- A 301 decision must always carry a real internal target path (never external) — an admin-entered redirect target must be constrained to same-site paths, or it becomes an open-redirect vector.
- Serving the redirect/410 decision for an old path must not depend on also deleting the underlying old record (category/product/etc). Keep "map the old URL" and "clean up the underlying catalog data" as separate, independently-failing concerns — coupling them means one FK constraint or dependent-row problem in the cleanup can silently break the whole redirect rollout.
- Deleting a catalog row referenced by other tables (e.g. a category that still has products) can hit a non-cascading foreign key; don't delete such rows opportunistically inside an unrelated migration. Removal of dependent data needs its own explicit, transactional migration.
