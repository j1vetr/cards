---
name: SEO SSR/SPA parity contract
description: Rules for keeping server-rendered SEO metadata and the client SPA's post-hydration metadata identical on this project.
---

When a page has both a bot-facing SSR renderer (server/seo/render.ts) and a client SPA component that also sets meta tags (client/src/components/SEO.tsx usage), any admin-editable SEO override must produce byte-identical title/description/H1/intro/robots after hydration as it does in the raw SSR HTML. This project's completion review checks this strictly and rejects on any drift, including:

- Different default fallback text between SSR and SPA when no override is set (crawler sees one description, browser shows another after hydration).
- Truncation applied on one side only (server clamps to 70/160 chars via `shared/seoText.ts`, client must import the same helpers rather than reimplementing clamping/HTML-stripping inline).
- A locale-sensitive transform (e.g. Turkish uppercase `toLocaleUpperCase('tr-TR')`) applied in the SPA component but not in the SSR string, or vice versa.
- Manually appending the site name suffix in a page's title string in addition to the shared `SEO`/render.ts component already appending it — always let the single owning layer add the suffix; the override value itself must never include it (fix admin field placeholders accordingly, not just the code).
- Adding an override field to only the "owner" landing route (e.g. `/pokemon`) and not also its generic counterpart (e.g. `/oyun/:slug` SPA route + `renderGame` SSR) when the task says "full override for games/sets/categories".
- Hand-duplicating structured-content arrays (FAQ items, JSON-LD builder logic) separately in the SSR renderer and the SPA component instead of a shared module both import — the two copies always drift (wording, date field choice, schema shape) even when the reviewer's own diff looks intentional.

**Why:** admin-editable SEO field work on this project repeatedly went through multiple rejected completion reviews, each catching one more instance of this same class of drift (including hardcoded FAQ/content arrays duplicated between server and client instead of a shared module). It is cheaper to centralize resolution logic in `shared/seoText.ts` (resolveSeoTitle/resolveSeoDescription/resolveSeoH1/resolveSeoIntro/stripHtmlToText/truncateSeoText) and any shared structured content (e.g. FAQ items) up front, importing it from both server and client, than to patch page-by-page after review.

**How to apply:** when adding or editing any SEO override field, (1) put the fallback-and-clamp logic in `shared/seoText.ts` once, (2) import it from both `server/seo/render.ts` (or `server/seo/seoDefaults.ts`, which now just re-exports the shared module) and the relevant client page, (3) grep for every route that renders the same entity (owner page + generic page) and update both, (4) verify with curl against the dev server using a Googlebot user-agent for SSR and a screenshot/curl-after-hydration comparison for SPA before calling markTaskComplete.

Additional parity rule (production SEO audit): Product JSON-LD emits an Offer ONLY when a real active listing with a finite positive price exists — otherwise a clean Product with no offers key. Never a price-less Offer with availability/currency ("half schema"), never a 0/fake price. This rule must hold identically in server/seo/render.ts (renderCard) and client/src/components/SEO.tsx product schema. Also: 404/410 pages emit NO canonical at all (RenderResult.canonical is nullable, client SEO has suppressCanonical for the not-found page only — normal noindex listing pages keep self-canonicals). Sitemap and llms.txt/llms-full.txt must exclude any path present in the redirects table (only final canonical URLs are listed).
