# Ecarte TCG Marketplace

## Overview
Ecarte is a full-stack trading card game marketplace for the Turkish market. The platform serves collectors and competitive players looking to buy and sell Pokemon TCG and Riftbound single cards, booster boxes, and sealed products. Customers browse by game, set, and rarity; administrators manage card listings, card data, and orders. Brand identity centers on clean white/dark palette with a deep indigo accent.

## User Preferences
Preferred communication style: Simple, everyday language.

## Date & Time Formatting
All user-visible date/time rendering for orders (admin panel, customer profile, order tracking, emails, WhatsApp messages) uses helpers in `shared/dateFormat.ts` (`formatTRDate`, `formatTRDateTime`, `formatTRDateNumeric`, `formatTRDateShort`, `formatTRTime`, `formatTRDateTimeNumeric`). Helpers always render in `Europe/Istanbul` timezone with `tr-TR` locale via `Intl.DateTimeFormat`, so the production server's UTC clock does not bleed into the UI. Do not call `toLocaleString('tr-TR')` or `date-fns/format` directly on order timestamps — use the helpers.

## Brand & Theme
- **Brand**: Ecarte (TCG Marketplace)
- **Domain**: ecartejeans.com · **Email**: info@ecartejeans.com · **Instagram**: @ecarte
- **Logo**: Horizontal wordmark — tiger mascot left, "ECARTE" text right. Two versions in `client/public/`:
  - `ecarte-logo-dark.png` — dark/black design, transparent bg → use on white/light backgrounds with `style={{ mixBlendMode: 'multiply' }}`
  - `ecarte-logo-white.png` — white design, transparent bg → use on dark navy backgrounds with `style={{ mixBlendMode: 'screen' }}`
- **Color tokens** (in `client/src/index.css`, token names kept for backward compat):
  - `--polen-orange: 220 65% 36%` — deep indigo/blue (primary accent)
  - `--polen-orange-deep: 220 72% 27%` — darker indigo for hover states
  - `--polen-stone: 220 18% 12%` — near-black charcoal (header/footer bg)
  - `--polen-cream: 218 30% 96%` — light blue-tinted off-white
- **Typography**: Oswald display font for wordmark/headlines; Inter for body. Blue accent used for CTA buttons, badges, accent text.
- **Business model**: TCG single card marketplace + sealed product sales.

## System Architecture

### Core Technologies
- **Frontend**: React 18 + TypeScript, Wouter routing, TanStack React Query, Tailwind CSS with shadcn/ui (New York style), Framer Motion, Vite.
- **Backend**: Node.js + Express, TypeScript, JWT auth (HttpOnly cookies + refresh token rotation), bcrypt, esbuild.
- **Database**: PostgreSQL with Drizzle ORM and Drizzle Kit.
- **UI/UX**: Component-based, reusable UI elements. Admin panel at `/toov-admin`.

### TCG Data Model (Primary)
- **card_games**: Pokemon TCG, Riftbound game definitions.
- **card_sets**: Set definitions per game (e.g. Scarlet & Violet, Base Set).
- **cards**: Individual card records — name, number, rarity, image URL, slug.
- **card_listings**: The purchaseable unit — one listing per card × condition × seller. Has price, stock, condition (NM/LP/MP/HP/DMG/PSA10/etc.).
- **card_prices**: Historical price tracking per card.
- **Cart/order flow**: `cardListingId` is the primary key for TCG items. `storage.addToCart()` deduplicates by `(sessionId, cardListingId, productId, variantId)`. `storage.getCartItems()` joins card_listings + cards to enrich frontend display. Order creation decrements `card_listings.stock`.

### Legacy Product Tables (Retained for catalog compatibility)
- **products / categories**: Legacy product catalog retained; `product_variants` table dropped (migration: `DROP TABLE IF EXISTS product_variants CASCADE`). Storage methods for variants are no-op stubs.
- Wholesale/dealer/quote tables removed: `wholesale_series`, `dealer_companies`, `quote_requests`, `quote_items`.

### Navigation
- Header navigation reads from the `menu_items` table (`/api/menu`).
- When `menu_items` is empty, Header falls back to a "Kategoriler" dropdown built from `categories`.

### Key Features
- **Authentication**: JWT-based for customers and admins, with refresh token rotation and HttpOnly cookies.
- **TCG Card Listings**: card_listings is the purchaseable unit with per-condition stock tracking.
- **Cart / Order**: cardListingId-first cart flow; listing stock decremented on order creation (bank transfer + iyzico). Legacy product/variant fallback retained.
- **Payment System**: iyzico Checkout Form (3DS) integration for credit card payments. API keys stored in `site_settings`.
- **Coupon System**: Percentage/fixed discounts, usage limits, validity periods.
- **Email Notifications**: Database-configurable SMTP.
- **WhatsApp Notifications (wpileti)**: Auto-sent on order lifecycle events. Per-event admin on/off toggles. Customer opt-out via profile page.
- **Meta Pixel + CAPI Integration**: Server- and client-side e-commerce event tracking.
- **AI Chatbot**: Conversational AI using product embeddings for semantic search.

## External Dependencies

### Database
- **PostgreSQL**: Main data store.

### Third-Party Services & APIs
- **OpenAI**: AI product descriptions and chatbot.
- **iyzico**: Payment gateway (Checkout Form / 3D Secure).
- **Facebook (Meta Pixel/CAPI)**: Advertising and event tracking.

### Libraries & Frameworks
- **shadcn/ui + Radix UI**: UI primitives.
- **TanStack React Query**: Data fetching and caching.
- **Framer Motion**: Animations.
- **Lucide React**: Icons.
- **Sharp**: Image optimization.

## Marketplace Sync (multi-marketplace adapter framework)
- **One-way pull**: marketplace → site catalog (categories, products, images, stock, price). No order/push.
- **Adapter pattern**: `MarketplaceAdapter` interface + registry. Trendyol adapter is the only live implementation.
- **Sync engine** (`server/marketplaces/sync/engine.ts`): two modes — `delta` (price + stock) and `full` (categories + products + images). Note: variant sync calls in engine.ts are no-ops after product_variants drop.
- **Scheduler**: node-cron — delta hourly, full daily at 03:00.
- **Credentials encryption**: `MARKETPLACE_ENCRYPTION_KEY` Replit Secret (32-byte hex/base64) required at startup.

## Product Detail Page
- `client/src/pages/ProductDetail.tsx` — TCG-adapted layout. `addToCart` accepts `cardListingId` via opts.
- Layout: 2-column on `lg+`. Desktop hero uses zoom + lightbox. Mobile uses embla carousel.
- `QuickViewModal` — single-click add-to-cart with quantity.

## Future Work
- Build TCG-specific browse/search UI (by set, rarity, condition, price range).
- Admin UI for card_games / card_sets / cards / card_listings management.
- Implement N11 / Hepsiburada marketplace adapters when needed.
- Full removal of legacy product catalog routes once TCG catalog is seeded.
