import { storage } from "../storage";
import { escapeHtml, stripHtml, truncate, normalizeImageUrl, formatTRY, sanitizeRichHtml } from "./htmlUtils";
import { SITE_NAME } from "../../shared/siteConfig";

export interface RenderResult {
  status: 200 | 404;
  title: string;
  description: string;
  canonical: string;
  robots: "index, follow" | "noindex, follow" | "noindex, nofollow";
  ogType: "website" | "product" | "article";
  ogImage: string;
  jsonLd: any[];
  bodyHtml: string;
}

function orgSchema(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GoCards TCG",
    legalName: "GO CARDS TCG İÇ VE DIŞ TİC. LTD. ŞTİ.",
    url: baseUrl,
    logo: `${baseUrl}/gocards-logo-white.png`,
    sameAs: ["https://instagram.com/gocardstcg"],
  };
}

function breadcrumbSchema(baseUrl: string, items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.path}`,
    })),
  };
}

function breadcrumbHtml(items: Array<{ name: string; path: string }>): string {
  const parts = items
    .map((item, i) =>
      i === items.length - 1
        ? `<span>${escapeHtml(item.name)}</span>`
        : `<a href="${escapeHtml(item.path)}">${escapeHtml(item.name)}</a>`
    )
    .join(" &rsaquo; ");
  return `<nav aria-label="breadcrumb">${parts}</nav>`;
}

function notFoundResult(baseUrl: string, pathname: string): RenderResult {
  return {
    status: 404,
    title: `Sayfa Bulunamadı | ${SITE_NAME}`,
    description: "Aradığınız sayfa bulunamadı. Bu ürün, kart veya kategori artık mevcut olmayabilir.",
    canonical: `${baseUrl}${pathname}`,
    robots: "noindex, nofollow",
    ogType: "website",
    ogImage: `${baseUrl}/logo.png`,
    jsonLd: [orgSchema(baseUrl)],
    bodyHtml: `
      <main>
        <h1>Sayfa Bulunamadı</h1>
        <p>Aradığınız sayfa bulunamadı. Ürün, kart veya kategori kaldırılmış ya da hiç var olmamış olabilir.</p>
        <p><a href="/">Ana sayfaya dön</a></p>
      </main>
    `,
  };
}

async function renderHome(baseUrl: string): Promise<RenderResult> {
  const [games, boxes] = await Promise.all([
    storage.listCardGames().catch(() => []),
    storage.getBoxProducts().catch(() => []),
  ]);

  const featuredCards = await storage
    .getCardsPublic({ featured: true, limit: 12, sort: "newest" })
    .catch(() => ({ cards: [] as any[], total: 0 }));

  const gameLinks = games
    .map((g: any) => `<li><a href="/oyun/${escapeHtml(g.slug)}">${escapeHtml(g.name)}</a></li>`)
    .join("");

  const cardItems = featuredCards.cards
    .slice(0, 12)
    .map((c: any) => {
      const price = c.min_price != null ? formatTRY(c.min_price) : "Stokta yok";
      return `<li><a href="/kart/${escapeHtml(c.slug)}">${escapeHtml(c.name)} (${escapeHtml(c.set_name || "")}) — ${price}</a></li>`;
    })
    .join("");

  const boxItems = boxes
    .slice(0, 12)
    .map((p: any) => `<li><a href="/urun/${escapeHtml(p.slug)}">${escapeHtml(p.name)} — ${formatTRY(p.basePrice)}</a></li>`)
    .join("");

  return {
    status: 200,
    title: `${SITE_NAME} | Pokémon TCG & Riftbound Kart Pazaryeri`,
    description: "Go|Cards TCG — Türkiye'nin TCG mağazası. Pokémon TCG ve Riftbound booster pack, kapalı kutu ve tekli kart satışı. Gerçek stok, güncel fiyat, güvenli alışveriş.",
    canonical: `${baseUrl}/`,
    robots: "index, follow",
    ogType: "website",
    ogImage: `${baseUrl}/gocards-logo-white.png`,
    jsonLd: [
      orgSchema(baseUrl),
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: baseUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${baseUrl}/kartlar?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
    bodyHtml: `
      <main>
        <h1>Pokémon TCG &amp; Riftbound Kart Pazaryeri</h1>
        <p>Türkiye'nin TCG mağazasında tekli kartlar, booster paketler ve kapalı kutular gerçek stok ve güncel fiyatla satışta.</p>
        <nav aria-label="oyunlar"><ul>${gameLinks}</ul></nav>
        <section>
          <h2>Öne Çıkan Kartlar</h2>
          <ul>${cardItems}</ul>
        </section>
        <section>
          <h2>Booster ve Kapalı Kutular</h2>
          <ul>${boxItems}</ul>
        </section>
      </main>
    `,
  };
}

async function renderGame(gameSlug: string, baseUrl: string, canonicalPath?: string): Promise<RenderResult> {
  const games = await storage.listCardGames().catch(() => []);
  const game = games.find((g: any) => g.slug === gameSlug);
  if (!game) return notFoundResult(baseUrl, canonicalPath || `/oyun/${gameSlug}`);

  const [sets, boxes] = await Promise.all([
    storage.getCardSetsPublic(gameSlug).catch(() => []),
    storage.getBoxProducts(gameSlug).catch(() => []),
  ]);

  const path = canonicalPath || `/oyun/${gameSlug}`;
  const setItems = sets
    .map((s: any) => `<li><a href="/set/${escapeHtml(s.slug)}">${escapeHtml(s.name)}</a>${s.listed_cards ? ` (${s.listed_cards} kart stokta)` : ""}</li>`)
    .join("");
  const boxItems = boxes
    .slice(0, 24)
    .map((p: any) => `<li><a href="/urun/${escapeHtml(p.slug)}">${escapeHtml(p.name)} — ${formatTRY(p.basePrice)} — ${p.stock > 0 ? "Stokta" : "Tükendi"}</a></li>`)
    .join("");

  const description = `${game.name} setleri, tekli kartlar, booster pack ve kapalı kutular Go|Cards TCG'de gerçek stok ve güncel fiyatla satışta.`;

  return {
    status: 200,
    title: `${game.name} Kartları ve Setleri | ${SITE_NAME}`,
    description: truncate(description, 160),
    canonical: `${baseUrl}${path}`,
    robots: "index, follow",
    ogType: "website",
    ogImage: game.logoUrl ? normalizeImageUrl(baseUrl, game.logoUrl) : `${baseUrl}/logo.png`,
    jsonLd: [
      orgSchema(baseUrl),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${game.name} | ${SITE_NAME}`,
        url: `${baseUrl}${path}`,
      },
      breadcrumbSchema(baseUrl, [
        { name: "Ana Sayfa", path: "/" },
        { name: game.name, path },
      ]),
    ],
    bodyHtml: `
      <main>
        ${breadcrumbHtml([{ name: "Ana Sayfa", path: "/" }, { name: game.name, path }])}
        <h1>${escapeHtml(game.name)} Kartları ve Setleri</h1>
        <p>${escapeHtml(description)}</p>
        <section>
          <h2>Setler</h2>
          <ul>${setItems}</ul>
        </section>
        <section>
          <h2>Booster ve Kapalı Kutular</h2>
          <ul>${boxItems}</ul>
        </section>
      </main>
    `,
  };
}

async function renderSet(setSlug: string, baseUrl: string): Promise<RenderResult> {
  const set = await storage.getCardSetPublicBySlug(setSlug).catch(() => null);
  if (!set) return notFoundResult(baseUrl, `/set/${setSlug}`);

  const { cards } = await storage.getCardsPublic({ setSlug, limit: 48 }).catch(() => ({ cards: [] as any[], total: 0 }));
  const path = `/set/${setSlug}`;
  const cardItems = cards
    .map((c: any) => {
      const price = c.min_price != null ? formatTRY(c.min_price) : "Stokta yok";
      return `<li><a href="/kart/${escapeHtml(c.slug)}">${escapeHtml(c.name)} #${escapeHtml(c.card_number || "")} — ${price}</a></li>`;
    })
    .join("");

  const description = `${set.name} (${set.game_name}) setine ait tüm kartlar, gerçek stok ve güncel fiyatlarla Go|Cards TCG'de.`;

  return {
    status: 200,
    title: `${set.name} Seti Kartları | ${SITE_NAME}`,
    description: truncate(description, 160),
    canonical: `${baseUrl}${path}`,
    robots: "index, follow",
    ogType: "website",
    ogImage: set.logo_url ? normalizeImageUrl(baseUrl, set.logo_url) : `${baseUrl}/logo.png`,
    jsonLd: [
      orgSchema(baseUrl),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${set.name} | ${SITE_NAME}`,
        url: `${baseUrl}${path}`,
      },
      breadcrumbSchema(baseUrl, [
        { name: "Ana Sayfa", path: "/" },
        { name: set.game_name, path: `/oyun/${set.game_slug}` },
        { name: set.name, path },
      ]),
    ],
    bodyHtml: `
      <main>
        ${breadcrumbHtml([
          { name: "Ana Sayfa", path: "/" },
          { name: set.game_name, path: `/oyun/${set.game_slug}` },
          { name: set.name, path },
        ])}
        <h1>${escapeHtml(set.name)} Seti</h1>
        <p>${escapeHtml(description)}</p>
        ${set.total_cards ? `<p>Toplam kart sayısı: ${escapeHtml(String(set.total_cards))}</p>` : ""}
        <section>
          <h2>Kartlar</h2>
          <ul>${cardItems}</ul>
        </section>
      </main>
    `,
  };
}

async function renderCard(cardSlug: string, baseUrl: string): Promise<RenderResult> {
  const card = await storage.getCardPublicBySlug(cardSlug).catch(() => null);
  if (!card) return notFoundResult(baseUrl, `/kart/${cardSlug}`);

  const path = `/kart/${cardSlug}`;
  const image = normalizeImageUrl(baseUrl, card.image_url_hi_res || card.image_url);
  const lowestListing = card.listings?.[0];
  const inStock = Array.isArray(card.listings) && card.listings.some((l: any) => l.stock > 0);
  const availability = inStock ? "InStock" : "OutOfStock";
  const description = card.description
    ? truncate(stripHtml(card.description), 160)
    : truncate(`${card.name} — ${card.set_name} seti, ${card.rarity || "TCG"} kart. Go|Cards TCG'de gerçek stok ve güncel fiyatla.`, 160);

  const listingsHtml = (card.listings || [])
    .map((l: any) => `<li>${escapeHtml(l.condition)}: ${formatTRY(l.price)} — ${l.stock > 0 ? `${l.stock} adet stokta` : "Tükendi"}</li>`)
    .join("");

  const attacksHtml = Array.isArray(card.attacks) && card.attacks.length
    ? `<section><h2>Saldırılar</h2><ul>${card.attacks
        .map((a: any) => `<li>${escapeHtml(a.name || "")}${a.damage ? ` — ${escapeHtml(String(a.damage))}` : ""}</li>`)
        .join("")}</ul></section>`
    : "";

  const productSchema: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: card.name,
    description,
    image: [image],
    sku: card.id,
    category: card.set_name,
    offers: {
      "@type": "Offer",
      url: `${baseUrl}${path}`,
      priceCurrency: "TRY",
      price: lowestListing ? lowestListing.price : undefined,
      availability: `https://schema.org/${availability}`,
      seller: { "@type": "Organization", name: "GoCards TCG", url: baseUrl },
    },
  };
  if (!lowestListing) delete productSchema.offers.price;

  return {
    status: 200,
    title: `${card.name} (${card.set_name}) | ${SITE_NAME}`,
    description,
    canonical: `${baseUrl}${path}`,
    robots: "index, follow",
    ogType: "product",
    ogImage: image,
    jsonLd: [
      orgSchema(baseUrl),
      productSchema,
      breadcrumbSchema(baseUrl, [
        { name: "Ana Sayfa", path: "/" },
        { name: card.game_name, path: `/oyun/${card.game_slug}` },
        { name: card.set_name, path: `/set/${card.set_slug}` },
        { name: card.name, path },
      ]),
    ],
    bodyHtml: `
      <main>
        ${breadcrumbHtml([
          { name: "Ana Sayfa", path: "/" },
          { name: card.game_name, path: `/oyun/${card.game_slug}` },
          { name: card.set_name, path: `/set/${card.set_slug}` },
          { name: card.name, path },
        ])}
        <h1>${escapeHtml(card.name)}</h1>
        <img src="${escapeHtml(image)}" alt="${escapeHtml(card.name)}" width="400" height="558">
        <p>${escapeHtml(description)}</p>
        <dl>
          ${card.card_number ? `<dt>Kart Numarası</dt><dd>${escapeHtml(card.card_number)}</dd>` : ""}
          ${card.rarity ? `<dt>Nadirlik</dt><dd>${escapeHtml(card.rarity)}</dd>` : ""}
          <dt>Set</dt><dd><a href="/set/${escapeHtml(card.set_slug)}">${escapeHtml(card.set_name)}</a></dd>
        </dl>
        ${attacksHtml}
        <section>
          <h2>Fiyat ve Stok</h2>
          <ul>${listingsHtml || "<li>Şu anda satışta değil</li>"}</ul>
        </section>
      </main>
    `,
  };
}

async function renderProduct(productSlug: string, baseUrl: string): Promise<RenderResult> {
  const product = await storage.getProductBySlug(productSlug).catch(() => null);
  if (!product || !product.isActive) return notFoundResult(baseUrl, `/urun/${productSlug}`);

  const path = `/urun/${productSlug}`;
  const image = product.images && product.images.length > 0 ? normalizeImageUrl(baseUrl, product.images[0]) : `${baseUrl}/logo.png`;
  const price = parseFloat(product.basePrice || "0");
  const inStock = (product.stock ?? 0) > 0;
  const description = product.description
    ? truncate(stripHtml(product.description), 160)
    : truncate(`${product.name} — ${SITE_NAME} mağazasında satın al.`, 160);

  const category = product.categoryId ? await storage.getCategory(product.categoryId).catch(() => null) : null;

  const breadcrumbItems = category
    ? [
        { name: "Ana Sayfa", path: "/" },
        { name: category.name, path: `/kategori/${category.slug}` },
        { name: product.name, path },
      ]
    : [
        { name: "Ana Sayfa", path: "/" },
        { name: product.name, path },
      ];

  return {
    status: 200,
    title: `${product.name} | ${SITE_NAME}`,
    description,
    canonical: `${baseUrl}${path}`,
    robots: "index, follow",
    ogType: "product",
    ogImage: image,
    jsonLd: [
      orgSchema(baseUrl),
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description,
        image: [image],
        sku: product.id,
        offers: {
          "@type": "Offer",
          url: `${baseUrl}${path}`,
          priceCurrency: "TRY",
          price,
          availability: `https://schema.org/${inStock ? "InStock" : "OutOfStock"}`,
          seller: { "@type": "Organization", name: "GoCards TCG", url: baseUrl },
        },
      },
      breadcrumbSchema(baseUrl, breadcrumbItems),
    ],
    bodyHtml: `
      <main>
        ${breadcrumbHtml(breadcrumbItems)}
        <h1>${escapeHtml(product.name)}</h1>
        <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" width="600" height="600">
        <p>${escapeHtml(description)}</p>
        <p>Fiyat: ${formatTRY(price)}</p>
        <p>${inStock ? `Stokta (${product.stock} adet)` : "Tükendi"}</p>
      </main>
    `,
  };
}

async function renderCardsSearch(baseUrl: string): Promise<RenderResult> {
  const { cards } = await storage
    .getCardsPublic({ limit: 48, sort: "newest" })
    .catch(() => ({ cards: [] as any[], total: 0 }));

  const cardItems = cards
    .map((c: any) => {
      const price = c.min_price != null ? formatTRY(c.min_price) : "Stokta yok";
      return `<li><a href="/kart/${escapeHtml(c.slug)}">${escapeHtml(c.name)} (${escapeHtml(c.set_name || "")}) — ${price}</a></li>`;
    })
    .join("");

  const description = "Pokemon TCG ve Riftbound single kartları fiyat, nadirlik, kondisyon ve sete göre filtrele. Türkiye'nin TCG marketplace'i.";
  const path = "/kartlar";

  return {
    status: 200,
    title: `Tüm Kartlar — ${SITE_NAME} Marketplace`,
    description,
    canonical: `${baseUrl}${path}`,
    robots: "index, follow",
    ogType: "website",
    ogImage: `${baseUrl}/logo.png`,
    jsonLd: [
      orgSchema(baseUrl),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `Tüm Kartlar | ${SITE_NAME}`,
        url: `${baseUrl}${path}`,
      },
      breadcrumbSchema(baseUrl, [{ name: "Ana Sayfa", path: "/" }, { name: "Tüm Kartlar", path }]),
    ],
    bodyHtml: `
      <main>
        ${breadcrumbHtml([{ name: "Ana Sayfa", path: "/" }, { name: "Tüm Kartlar", path }])}
        <h1>Tüm Kartlar</h1>
        <p>${escapeHtml(description)}</p>
        <ul>${cardItems}</ul>
      </main>
    `,
  };
}

interface StaticInfoPageConfig {
  path: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
}

// Yasal/bilgilendirme sayfaları için gerçek istemci metniyle çakışmayan,
// kısa ama gerçek (JS'siz görünür) özet içerik. Tam yasal metin ilgili
// client sayfasında kalır; burada amaç arama motorlarının ilk yanıtta boş
// bir kabuk yerine sayfaya özgü başlık, açıklama ve görünür bir H1/özet
// bulmasıdır.
const STATIC_INFO_PAGES: ReadonlyArray<StaticInfoPageConfig> = [
  {
    path: "/hakkimizda",
    h1: "Hakkımızda",
    title: `Hakkımızda | ${SITE_NAME}`,
    description: "Pokemon TCG ve Riftbound trading card oyunları için Türkiye'nin TCG kart pazaryeri Go|Cards TCG hakkında.",
    intro: "Go|Cards TCG, Pokemon TCG ve Riftbound tekli kartlarını, booster paketlerini ve kapalı kutularını gerçek stok ve güncel fiyatla sunan Türkiye merkezli bir TCG pazaryeridir.",
  },
  {
    path: "/teslimat-kosullari",
    h1: "Teslimat Koşulları",
    title: `Teslimat Koşulları | ${SITE_NAME}`,
    description: "Go|Cards TCG teslimat koşulları, kargo süreleri ve ücretsiz kargo bilgileri.",
    intro: "Siparişleriniz güvenli paketleme ile anlaşmalı kargo firmaları üzerinden gönderilir. Kargo süreleri ve ücretsiz kargo koşulları için detaylı bilgiyi bu sayfada bulabilirsiniz.",
  },
  {
    path: "/mesafeli-satis-sozlesmesi",
    h1: "Mesafeli Satış Sözleşmesi",
    title: `Mesafeli Satış Sözleşmesi | ${SITE_NAME}`,
    description: "Go|Cards TCG mesafeli satış sözleşmesi ve alışveriş koşulları.",
    intro: "6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca Go|Cards TCG üzerinden yapılan alışverişlerin şartlarını düzenleyen sözleşme metni.",
  },
  {
    path: "/iptal-ve-iade",
    h1: "İptal ve İade Politikası",
    title: `İptal ve İade Politikası | ${SITE_NAME}`,
    description: "Go|Cards TCG ürün iade, değişim ve iptal koşulları.",
    intro: "Ürün iade, değişim ve sipariş iptali süreçleriyle ilgili koşulları ve süreleri bu sayfada bulabilirsiniz.",
  },
  {
    path: "/kvkk",
    h1: "KVKK Aydınlatma Metni",
    title: `KVKK Aydınlatma Metni | ${SITE_NAME}`,
    description: "Go|Cards TCG kişisel verilerin korunması kanunu aydınlatma metni.",
    intro: "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında Go|Cards TCG'nin kişisel verilerinizi hangi amaçlarla işlediğine dair aydınlatma metni.",
  },
  {
    path: "/iletisim",
    h1: "İletişim",
    title: `İletişim | ${SITE_NAME}`,
    description: "Go|Cards TCG ile iletişime geçin. Telefon, WhatsApp ve e-posta ile bize ulaşabilirsiniz.",
    intro: "Sorularınız ve siparişlerinizle ilgili bize telefon, WhatsApp veya e-posta üzerinden ulaşabilirsiniz.",
  },
];

function renderStaticInfoPage(config: StaticInfoPageConfig, baseUrl: string): RenderResult {
  return {
    status: 200,
    title: config.title,
    description: config.description,
    canonical: `${baseUrl}${config.path}`,
    robots: "index, follow",
    ogType: "website",
    ogImage: `${baseUrl}/logo.png`,
    jsonLd: [orgSchema(baseUrl), breadcrumbSchema(baseUrl, [{ name: "Ana Sayfa", path: "/" }, { name: config.h1, path: config.path }])],
    bodyHtml: `
      <main>
        ${breadcrumbHtml([{ name: "Ana Sayfa", path: "/" }, { name: config.h1, path: config.path }])}
        <h1>${escapeHtml(config.h1)}</h1>
        <p>${escapeHtml(config.intro)}</p>
      </main>
    `,
  };
}

const ACCESSORY_CATEGORY_SLUGS = ["binder", "sleeve", "playmat"];

async function renderAccessories(baseUrl: string): Promise<RenderResult> {
  const categories = await storage.getCategories().catch(() => [] as any[]);
  const accessoryCategories = categories.filter((c: any) => ACCESSORY_CATEGORY_SLUGS.includes(c.slug));

  const productLists = await Promise.all(
    accessoryCategories.map((c: any) => storage.getProducts({ categoryId: c.id, limit: 100 }).catch(() => ({ products: [] as any[], total: 0 })))
  );
  const seen = new Set<string>();
  const products = productLists
    .flatMap((r) => r.products)
    .filter((p: any) => {
      if (!p.isActive || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

  const items = products
    .map((p: any) => `<li><a href="/urun/${escapeHtml(p.slug)}">${escapeHtml(p.name)} — ${formatTRY(p.basePrice)}</a></li>`)
    .join("");

  const description = "Kart koruma ve saklama aksesuarları: binder, sleeve ve playmat. Go|Cards TCG'de gerçek stok ve güncel fiyatla.";
  const path = "/aksesuarlar";

  return {
    status: 200,
    title: `Aksesuarlar | ${SITE_NAME}`,
    description,
    canonical: `${baseUrl}${path}`,
    robots: "index, follow",
    ogType: "website",
    ogImage: `${baseUrl}/logo.png`,
    jsonLd: [
      orgSchema(baseUrl),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `Aksesuarlar | ${SITE_NAME}`,
        url: `${baseUrl}${path}`,
      },
      breadcrumbSchema(baseUrl, [{ name: "Ana Sayfa", path: "/" }, { name: "Aksesuarlar", path }]),
    ],
    bodyHtml: `
      <main>
        ${breadcrumbHtml([{ name: "Ana Sayfa", path: "/" }, { name: "Aksesuarlar", path }])}
        <h1>Aksesuarlar</h1>
        <p>${escapeHtml(description)}</p>
        <ul>${items}</ul>
      </main>
    `,
  };
}

async function renderLegacyCategory(categorySlug: string, baseUrl: string): Promise<RenderResult> {
  const category = await storage.getCategoryBySlug(categorySlug).catch(() => null);
  if (!category) return notFoundResult(baseUrl, `/kategori/${categorySlug}`);

  const path = `/kategori/${categorySlug}`;
  const { products } = await storage.getProducts({ categoryId: category.id, limit: 48 }).catch(() => ({ products: [] as any[], total: 0 }));
  const items = products
    .map((p: any) => `<li><a href="/urun/${escapeHtml(p.slug)}">${escapeHtml(p.name)} — ${formatTRY(p.basePrice)}</a></li>`)
    .join("");

  const description = `${category.name} — Go|Cards TCG mağazasında gerçek stok ve güncel fiyatla satışta.`;

  return {
    status: 200,
    title: `${category.name} | ${SITE_NAME}`,
    description: truncate(description, 160),
    canonical: `${baseUrl}${path}`,
    robots: "index, follow",
    ogType: "website",
    ogImage: category.image ? normalizeImageUrl(baseUrl, category.image) : `${baseUrl}/logo.png`,
    jsonLd: [
      orgSchema(baseUrl),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${category.name} | ${SITE_NAME}`,
        url: `${baseUrl}${path}`,
      },
      breadcrumbSchema(baseUrl, [{ name: "Ana Sayfa", path: "/" }, { name: category.name, path }]),
    ],
    bodyHtml: `
      <main>
        ${breadcrumbHtml([{ name: "Ana Sayfa", path: "/" }, { name: category.name, path }])}
        <h1>${escapeHtml(category.name)}</h1>
        <p>${escapeHtml(description)}</p>
        <ul>${items}</ul>
      </main>
    `,
  };
}

async function renderBlogList(baseUrl: string): Promise<RenderResult> {
  const posts = await storage.getBlogPosts({ status: "published" }).catch(() => []);
  const items = posts
    .map((p: any) => `<li><a href="/blog/${escapeHtml(p.slug)}">${escapeHtml(p.title)}</a>${p.summary ? ` — ${escapeHtml(truncate(p.summary, 120))}` : ""}</li>`)
    .join("");

  return {
    status: 200,
    title: `Rehber ve Blog | ${SITE_NAME}`,
    description: "Pokémon TCG ve Riftbound hakkında rehberler, kart tanıtımları ve koleksiyon ipuçları.",
    canonical: `${baseUrl}/blog`,
    robots: "index, follow",
    ogType: "website",
    ogImage: `${baseUrl}/logo.png`,
    jsonLd: [orgSchema(baseUrl), breadcrumbSchema(baseUrl, [{ name: "Ana Sayfa", path: "/" }, { name: "Blog", path: "/blog" }])],
    bodyHtml: `
      <main>
        ${breadcrumbHtml([{ name: "Ana Sayfa", path: "/" }, { name: "Blog", path: "/blog" }])}
        <h1>Rehber ve Blog</h1>
        <ul>${items}</ul>
      </main>
    `,
  };
}

async function renderBlogDetail(slug: string, baseUrl: string): Promise<RenderResult> {
  const post = await storage.getBlogPostBySlug(slug).catch(() => null);
  if (!post || post.status !== "published") return notFoundResult(baseUrl, `/blog/${slug}`);

  const path = `/blog/${slug}`;
  const description = post.metaDescription || truncate(stripHtml(post.summary || post.content || ""), 160);
  const image = post.coverImageUrl ? normalizeImageUrl(baseUrl, post.coverImageUrl) : `${baseUrl}/logo.png`;

  return {
    status: 200,
    title: post.metaTitle || `${post.title} | ${SITE_NAME}`,
    description,
    canonical: `${baseUrl}${path}`,
    robots: "index, follow",
    ogType: "article",
    ogImage: image,
    jsonLd: [
      orgSchema(baseUrl),
      {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description,
        image: [image],
        datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
        dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
        author: { "@type": "Organization", name: "GoCards TCG" },
        mainEntityOfPage: `${baseUrl}${path}`,
      },
      breadcrumbSchema(baseUrl, [{ name: "Ana Sayfa", path: "/" }, { name: "Blog", path: "/blog" }, { name: post.title, path }]),
    ],
    bodyHtml: `
      <main>
        ${breadcrumbHtml([{ name: "Ana Sayfa", path: "/" }, { name: "Blog", path: "/blog" }, { name: post.title, path }])}
        <article>
          <h1>${escapeHtml(post.title)}</h1>
          ${post.summary ? `<p>${escapeHtml(post.summary)}</p>` : ""}
          <div>${sanitizeRichHtml(post.content)}</div>
        </article>
      </main>
    `,
  };
}

/**
 * Verilen path için tam server-side render sonucu döndürür. Path bu modülün
 * bildiği bir "içerik" rotasına ait değilse (örn. /sepet, /giris, /toov-admin)
 * null döner ve çağıran taraf varsayılan kabuğu (default meta ile) kullanır.
 */
export async function renderPublicPage(pathname: string, baseUrl: string): Promise<RenderResult | null> {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/") return renderHome(baseUrl);
  if (clean === "/kartlar") return renderCardsSearch(baseUrl);
  if (clean === "/aksesuarlar") return renderAccessories(baseUrl);

  const staticInfo = STATIC_INFO_PAGES.find((p) => p.path === clean);
  if (staticInfo) return renderStaticInfoPage(staticInfo, baseUrl);

  const segments = clean.split("/").filter(Boolean);

  // Her dinamik rota TAM OLARAK "/prefix/:param" şeklinde iki segmentten
  // oluşmalıdır. Fazladan segment içeren yollar (örn. /urun/gecerli-slug/x)
  // client router'da NotFound gösterir; sunucu da bunu 404 olarak ele almalı,
  // aksi halde geçerli bir sayfanın 200/kanonik'i yanlışlıkla döner.
  if (segments.length === 2) {
    const [prefix, param] = segments;
    const decoded = decodeURIComponent(param);
    if (prefix === "urun") return renderProduct(decoded, baseUrl);
    if (prefix === "kategori") return renderLegacyCategory(decoded, baseUrl);
    if (prefix === "kart") return renderCard(decoded, baseUrl);
    if (prefix === "set") return renderSet(decoded, baseUrl);
    if (prefix === "oyun") return renderGame(decoded, baseUrl);
    if (prefix === "blog") return renderBlogDetail(decoded, baseUrl);
  }

  if (segments.length === 1) {
    if (segments[0] === "riftbound") return renderGame("riftbound", baseUrl, "/riftbound");
    if (segments[0] === "blog") return renderBlogList(baseUrl);
  }

  // Bilinen bir prefix ile başlayıp segment sayısı uymayan her yol (fazla ya
  // da eksik segment) gerçek 404 almalı; renderPublicPage null dönerse
  // renderAppShellResponse bunu yalnızca isKnownAppPath ile statik bir yol
  // ise 200 sayar — o yüzden burada açıkça 404 üretiyoruz.
  const knownPrefixes = ["urun", "kategori", "kart", "set", "oyun", "blog", "riftbound"];
  if (knownPrefixes.includes(segments[0])) {
    return notFoundResult(baseUrl, pathname);
  }

  return null;
}

export { notFoundResult };
