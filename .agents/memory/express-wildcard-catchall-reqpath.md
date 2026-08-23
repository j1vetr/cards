---
name: Express app.use("*", ...) breaks req.path
description: Why req.path/req.url read "/" inside a wildcard catch-all middleware, and what to use instead.
---

In Express 4, `app.use("*", handler)` treats `"*"` as a **mount path**, not a plain
middleware. Express recalculates `req.url`/`req.path` relative to that mount
point before calling `handler`, so inside it `req.path` collapses to `"/"`
(or empty) regardless of the actual incoming URL.

**Why this matters:** any per-route logic inside a `"*"` catch-all (e.g. SPA
shell prerendering, per-path SEO injection, custom 404 handling) that reads
`req.path` will silently behave as if every request were `/`. It fails
quietly (no error, just wrong content/wrong status) — easy to miss without
explicitly asserting the rendered path.

**How to apply:** inside a `"*"` (or any wildcard-mounted) catch-all, derive
the real request path from `req.originalUrl` instead of `req.path`/`req.url`
(strip query/hash yourself: `req.originalUrl.split("?")[0].split("#")[0]`).
`req.originalUrl` is untouched by mount-relative rewriting.
