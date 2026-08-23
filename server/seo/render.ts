import { storage } from "../storage";
import { escapeHtml, stripHtml, truncate, normalizeImageUrl, formatTRY, sanitizeRichHtml } from "./htmlUtils";
import { resolveSeoTitle, resolveSeoDescription, resolveSeoH1, resolveSeoIntro } from "./seoDefaults";
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
    "@id": `${baseUrl}/#organization`,
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
    .map((g: any) => {
      const ownerPath = GAME_OWNER_PATHS[g.slug] || `/oyun/${g.slug}`;
      return `<li><a href="${escapeHtml(ownerPath)}">${escapeHtml(g.name)}</a></li>`;
    })
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
    title: `Riftbound & Pokémon TCG Kartları | ${SITE_NAME}`,
    description: "Go|Cards TCG — Türkiye'nin TCG mağazası. Riftbound ve Pokémon TCG için single kartlar, booster paketler ve kapalı kutular. Gerçek stok, güncel fiyat, güvenli alışveriş.",
    canonical: `${baseUrl}/`,
    robots: "index, follow",
    ogType: "website",
    ogImage: `${baseUrl}/gocards-logo-white.png`,
    jsonLd: [
      orgSchema(baseUrl),
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        name: SITE_NAME,
        url: baseUrl,
        publisher: { "@id": `${baseUrl}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${baseUrl}/kartlar?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
    bodyHtml: `
      <main>
        <h1>Riftbound &amp; Pokémon TCG Kartları</h1>
        <p>Türkiye'nin TCG mağazasında Riftbound ve Pokémon TCG için tekli kartlar, booster paketler ve kapalı kutular gerçek stok ve güncel fiyatla satışta.</p>
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

/**
 * Bir oyun için ayrılmış tek bir ticari "owner" sayfası varsa (ör. Riftbound
 * için /riftbound, Pokémon için /pokemon), /oyun/:game gibi ikincil/gezinme
 * sayfaları bu owner'a canonical verir — aynı anahtar kelime için iki sayfanın
 * birbirini kanibalize etmesini önler. Owner'ı olmayan oyunlar kendi
 * /oyun/:game yolunu canonical olarak kullanmaya devam eder.
 */
const GAME_OWNER_PATHS: Record<string, string> = {
  riftbound: "/riftbound",
  pokemon: "/pokemon",
};

async function renderGame(gameSlug: string, baseUrl: string): Promise<RenderResult> {
  const games = await storage.listCardGames().catch(() => []);
  const game = games.find((g: any) => g.slug === gameSlug);
  const path = `/oyun/${gameSlug}`;
  if (!game) return notFoundResult(baseUrl, path);

  const [sets, boxes] = await Promise.all([
    storage.getCardSetsPublic(gameSlug).catch(() => []),
    storage.getBoxProducts(gameSlug).catch(() => []),
  ]);

  const canonicalPath = GAME_OWNER_PATHS[gameSlug] || path;
  const setItems = sets
    .map((s: any) => `<li><a href="/set/${escapeHtml(s.slug)}">${escapeHtml(s.name)}</a>${s.listed_cards ? ` (${s.listed_cards} kart stokta)` : ""}</li>`)
    .join("");
  const boxItems = boxes
    .slice(0, 24)
    .map((p: any) => `<li><a href="/urun/${escapeHtml(p.slug)}">${escapeHtml(p.name)} — ${formatTRY(p.basePrice)} — ${p.stock > 0 ? "Stokta" : "Tükendi"}</a></li>`)
    .join("");

  const defaultDescription = `${game.name} setleri, tekli kartlar, booster pack ve kapalı kutular Go|Cards TCG'de gerçek stok ve güncel fiyatla satışta.`;
  const title = resolveSeoTitle(game.seoTitle, `${game.name} Kartları ve Setleri`);
  const description = resolveSeoDescription(game.seoDescription, defaultDescription);
  const h1 = resolveSeoH1(game.seoH1, `${game.name} Kartları ve Setleri`);
  const intro = resolveSeoIntro(game.seoIntro, description);

  return {
    status: 200,
    title: `${title} | ${SITE_NAME}`,
    description,
    canonical: `${baseUrl}${canonicalPath}`,
    robots: game.seoNoIndex ? "noindex, follow" : "index, follow",
    ogType: "website",
    ogImage: game.logoUrl ? normalizeImageUrl(baseUrl, game.logoUrl) : `${baseUrl}/logo.png`,
    jsonLd: [
      orgSchema(baseUrl),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${title} | ${SITE_NAME}`,
        url: `${baseUrl}${canonicalPath}`,
      },
      breadcrumbSchema(baseUrl, [
        { name: "Ana Sayfa", path: "/" },
        { name: game.name, path },
      ]),
    ],
    bodyHtml: `
      <main>
        ${breadcrumbHtml([{ name: "Ana Sayfa", path: "/" }, { name: game.name, path }])}
        <h1>${escapeHtml(h1)}</h1>
        <p>${escapeHtml(intro)}</p>
        ${canonicalPath !== path ? `<p><a href="${escapeHtml(canonicalPath)}">${escapeHtml(game.name)} hakkında detaylı bilgi ve SSS</a></p>` : ""}
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

interface GameOwnerConfig {
  gameSlug: string;
  path: string;
  keyword: string;
  title: string;
  description: string;
  h1: string;
  introParagraphs: string[];
  faqItems: Array<{ q: string; a: string }>;
}

const GAME_OWNER_CONFIGS: Record<string, GameOwnerConfig> = {
  riftbound: {
    gameSlug: "riftbound",
    path: "/riftbound",
    keyword: "Riftbound",
    title: "League of Legends Riftbound TCG Ürünleri ve Kartları",
    description: "Türkiye'nin LoL TCG mağazası Go|Cards. Riftbound booster pack, kapalı kutu ve tekli kart satışı. NM/LP/MP koşullu single card stoğu. Hızlı kargo, güvenli alışveriş.",
    h1: "League of Legends Riftbound TCG Ürünleri ve Kartları",
    introParagraphs: [
      "Riftbound TCG, Riot Games tarafından geliştirilen ve dünya genelinde milyonlarca oyuncuya hitap eden League of Legends evreninin resmi kart oyunudur. Oyuncular tanıdık şampiyonları ve yeteneklerini kullanarak stratejik desteler kurar, sıra tabanlı bir sistemle rakiplerine meydan okur. League of Legends kart oyunu (LoL TCG) hem yeni başlayanlar için öğrenmesi kolay hem de rekabetçi oyuncular için derinlikli bir sistem sunar.",
      "Go|Cards olarak Riftbound TCG'nin ürünlerini Türkiye'ye getiriyoruz. Booster paket, kapalı kutu (Display Box) ve tekli kart (single card) seçenekleriyle koleksiyonunuzu büyütebilir ya da tournament destesi için ihtiyacınız olan belirli kartları tek tek satın alabilirsiniz. Riftbound kartları setlere göre listelenir; her set kendi sayfasında toplam kart sayısı ve stoktaki kart adediyle birlikte görüntülenir, böylece hangi setten hangi kartların satışta olduğunu kolayca görebilirsiniz.",
      "Tüm Riftbound tekli kartlarımız gerçek stok durumuyla ve koşul bilgisiyle (NM, LP, MP, HP) listelenmiştir; fiyatlar güncel piyasa verisine göre düzenli olarak takip edilir. Kapalı kutu ve booster pack ürünlerinde stok adedi ve fiyat her ürün sayfasında açıkça belirtilir. 500₺ ve üzeri siparişlerde kargo ücretsizdir, siparişler güvenli paketleme ile anlaşmalı kargo firmaları üzerinden gönderilir.",
      "Riftbound TCG'ye yeni başlıyorsanız önce bir başlangıç destesi (starter deck) veya birkaç booster pack ile setleri tanımanızı, ardından tournament için ihtiyaç duyduğunuz belirli şampiyon ve birim kartlarını tekli kart olarak tamamlamanızı öneririz. Koleksiyonculuk odaklı alışveriş yapıyorsanız ultra rare ve secret rare nadirlikteki kartlar setler sayfasında ayrı ayrı incelenebilir.",
    ],
    faqItems: [
      {
        q: "Riftbound TCG nedir?",
        a: "Riftbound TCG, Riot Games tarafından League of Legends (LoL TCG) evrenine dayalı olarak geliştirilen stratejik kart oyunudur. Oyuncular şampiyonlardan oluşan desteler kurarak rakiplerine karşı mücadele eder.",
      },
      {
        q: "Riftbound booster pack kaç kart içerir?",
        a: "Riftbound booster pack içeriği sete göre değişmekle birlikte standart paketler genellikle 10-12 kart içerir. Kapalı Display Box ise 24-36 booster pack'ten oluşur. Kesin içerik bilgisi her ürün sayfasında belirtilmektedir.",
      },
      {
        q: "League of Legends kart oyunu (LoL TCG) nasıl oynanır?",
        a: "League of Legends Riftbound TCG'de her oyuncu bir şampiyon destesiyle oynar. Kartlar sıra tabanlı olarak oynanır, birimler, büyüler ve donanımlar aracılığıyla rakip şampiyonun can puanını sıfırlamak hedeflenir.",
      },
      {
        q: "En değerli Riftbound kartları hangileridir?",
        a: "En değerli Riftbound kartları genellikle ultra rare ve secret rare nadirlik seviyesindeki şampiyon kartlarıdır. Popüler şampiyonların özel baskı versiyonları koleksiyoncular arasında en çok aranan Riftbound kartları arasındadır.",
      },
      {
        q: "Riftbound tekli kart (single card) alabilir miyim?",
        a: "Evet. Go|Cards olarak Riftbound tekli kart (single card) satışı yapıyoruz. Her kart NM, LP, MP veya HP koşuluyla ayrı ayrı listelenmektedir, böylece tournament destesi için ihtiyacınız olan belirli kartları satın alabilirsiniz.",
      },
    ],
  },
  pokemon: {
    gameSlug: "pokemon",
    path: "/pokemon",
    keyword: "Pokémon TCG",
    title: "Pokémon TCG Kartları ve Setleri",
    description: "Türkiye'nin Pokémon TCG mağazası Go|Cards. Pokémon booster pack, kapalı kutu ve tekli kart satışı. NM/LP/MP koşullu single card stoğu. Hızlı kargo, güvenli alışveriş.",
    h1: "Pokémon TCG Kartları ve Setleri",
    introParagraphs: [
      "Pokémon TCG (Trading Card Game), Pokémon evrenindeki canlıları ve eğitmenleri temsil eden kartlarla oynanan, dünya genelinde en çok oynanan koleksiyonluk kart oyunlarından biridir. Oyuncular kendi destelerini kurar, enerji kartlarıyla Pokémon'larını güçlendirir ve rakip oyuncunun tüm Pokémon'larını yenerek ya da ödül kartlarını toplayarak kazanmayı hedefler.",
      "Go|Cards olarak Pokémon TCG'nin güncel ve klasik setlerine ait ürünleri Türkiye'ye getiriyoruz. Booster paket, kapalı kutu (Elite Trainer Box, Booster Box) ve tekli kart (single card) seçenekleriyle koleksiyonunuzu büyütebilir ya da destenizi tamamlamak için ihtiyacınız olan belirli kartları tek tek satın alabilirsiniz. Pokémon kartları setlere göre listelenir, her set sayfasında toplam kart sayısı ve stoktaki kart adedi görüntülenir.",
      "Tüm Pokémon tekli kartlarımız gerçek stok durumuyla ve koşul bilgisiyle (NM, LP, MP, HP) listelenmiştir, fiyatlar güncel piyasa verisine göre düzenli olarak takip edilir. Kapalı kutu ve booster pack ürünlerinde stok adedi ve fiyat her ürün sayfasında açıkça belirtilir. 500₺ ve üzeri siparişlerde kargo ücretsizdir, siparişler güvenli paketleme ile anlaşmalı kargo firmaları üzerinden gönderilir.",
      "Pokémon TCG koleksiyonuna yeni başlıyorsanız güncel bir setten birkaç booster pack açarak setleri tanımanızı, ardından deste için ihtiyaç duyduğunuz belirli kartları tekli kart olarak tamamlamanızı öneririz. Koleksiyonculuk odaklı alışveriş yapıyorsanız ultra rare, secret rare ve full art nadirlikteki kartlar ilgili set sayfasında ayrı ayrı incelenebilir.",
    ],
    faqItems: [
      {
        q: "Pokémon TCG nedir?",
        a: "Pokémon TCG, Pokémon evrenindeki canlıları ve eğitmenleri temsil eden kartlarla oynanan koleksiyonluk kart oyunudur. Oyuncular destelerini kurar, Pokémon'larını enerji kartlarıyla güçlendirerek rakip oyuncuya karşı mücadele eder.",
      },
      {
        q: "Pokémon booster pack kaç kart içerir?",
        a: "Standart bir Pokémon TCG booster pack genellikle 10-11 kart içerir. Bir Booster Box ise sete göre 30-36 booster pack'ten oluşur. Kesin içerik bilgisi her ürün sayfasında belirtilmektedir.",
      },
      {
        q: "Pokémon TCG'ye yeni başlayanlar nereden başlamalı?",
        a: "Yeni başlayanlar için güncel bir setten birkaç booster pack açmak ya da hazır bir başlangıç ürünüyle temel mekanikleri öğrenmek iyi bir başlangıçtır. Ardından ihtiyacınız olan belirli kartları tekli kart olarak tamamlayabilirsiniz.",
      },
      {
        q: "En değerli Pokémon kartları hangileridir?",
        a: "En değerli Pokémon kartları genellikle ultra rare, secret rare ve full art nadirlik seviyesindeki kartlardır. Popüler Pokémon'ların özel baskı versiyonları koleksiyoncular arasında en çok aranan kartlar arasındadır.",
      },
      {
        q: "Pokémon tekli kart (single card) alabilir miyim?",
        a: "Evet. Go|Cards olarak Pokémon tekli kart (single card) satışı yapıyoruz. Her kart NM, LP, MP veya HP koşuluyla ayrı ayrı listelenmektedir, böylece destenize eksik olan belirli kartları satın alabilirsiniz.",
      },
    ],
  },
};

async function renderGameOwner(config: GameOwnerConfig, baseUrl: string): Promise<RenderResult> {
  const games = await storage.listCardGames().catch(() => []);
  const game = games.find((g: any) => g.slug === config.gameSlug);

  const [sets, boxes, cardsResult] = await Promise.all([
    storage.getCardSetsPublic(config.gameSlug).catch(() => []),
    storage.getBoxProducts(config.gameSlug).catch(() => []),
    storage.getCardsPublic({ gameSlug: config.gameSlug, limit: 24, sort: "newest" }).catch(() => ({ cards: [] as any[], total: 0 })),
  ]);

  const path = config.path;
  const setItems = sets
    .map((s: any) => `<li><a href="/set/${escapeHtml(s.slug)}">${escapeHtml(s.name)}</a>${s.listed_cards ? ` (${s.listed_cards} kart stokta)` : ""}</li>`)
    .join("");
  const boxItems = boxes
    .slice(0, 24)
    .map((p: any) => `<li><a href="/urun/${escapeHtml(p.slug)}">${escapeHtml(p.name)} — ${formatTRY(p.basePrice)} — ${p.stock > 0 ? "Stokta" : "Tükendi"}</a></li>`)
    .join("");
  const cardItems = cardsResult.cards
    .map((c: any) => {
      const price = c.min_price != null ? formatTRY(c.min_price) : "Stokta yok";
      return `<li><a href="/kart/${escapeHtml(c.slug)}">${escapeHtml(c.name)} (${escapeHtml(c.set_name || "")}) — ${price}</a></li>`;
    })
    .join("");
  const introHtml = config.introParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  const faqHtml = config.faqItems
    .map((item) => `<div><h3>${escapeHtml(item.q)}</h3><p>${escapeHtml(item.a)}</p></div>`)
    .join("");

  const ogImage = game?.logoUrl ? normalizeImageUrl(baseUrl, game.logoUrl) : `${baseUrl}/logo.png`;
  const title = resolveSeoTitle(game?.seoTitle, config.title);
  const description = resolveSeoDescription(game?.seoDescription, config.description);
  const h1 = resolveSeoH1(game?.seoH1, config.h1);
  // Admin bir giriş metni girdiyse tek paragraf olarak, girmediyse zengin
  // varsayılan FAQ/tanıtım paragrafları kullanılır.
  const introHtmlResolved = game?.seoIntro ? `<p>${escapeHtml(game.seoIntro)}</p>` : introHtml;

  return {
    status: 200,
    title: `${title} | ${SITE_NAME}`,
    description,
    canonical: `${baseUrl}${path}`,
    robots: game?.seoNoIndex ? "noindex, follow" : "index, follow",
    ogType: "website",
    ogImage,
    jsonLd: [
      orgSchema(baseUrl),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${title} | ${SITE_NAME}`,
        url: `${baseUrl}${path}`,
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${config.keyword} Setleri`,
        itemListElement: sets.map((s: any, index: number) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${baseUrl}/set/${s.slug}`,
          name: s.name,
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: config.faqItems.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
      breadcrumbSchema(baseUrl, [
        { name: "Ana Sayfa", path: "/" },
        { name: config.keyword, path },
      ]),
    ],
    bodyHtml: `
      <main>
        ${breadcrumbHtml([{ name: "Ana Sayfa", path: "/" }, { name: config.keyword, path }])}
        <h1>${escapeHtml(h1)}</h1>
        ${introHtmlResolved}
        <section>
          <h2>${escapeHtml(config.keyword)} Kart Setleri</h2>
          <ul>${setItems}</ul>
        </section>
        <section>
          <h2>${escapeHtml(config.keyword)} Booster ve Kapalı Kutular</h2>
          <ul>${boxItems}</ul>
        </section>
        <section>
          <h2>${escapeHtml(config.keyword)} Tekli Kartları</h2>
          <ul>${cardItems}</ul>
        </section>
        <section>
          <h2>Sık Sorulan Sorular</h2>
          ${faqHtml}
        </section>
      </main>
    `,
  };
}

async function renderSet(setSlug: string, baseUrl: string, search: string = ""): Promise<RenderResult> {
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

  const defaultDescription = `${set.name} (${set.game_name}) setine ait tüm kartlar, gerçek stok ve güncel fiyatlarla Go|Cards TCG'de.`;
  const { robots: listingRobots, canonical } = listingRobotsAndCanonical(baseUrl, path, search, SET_FILTER_KEYS);
  const title = resolveSeoTitle(set.seo_title, `${set.name} Seti Kartları`);
  const description = resolveSeoDescription(set.seo_description, defaultDescription);
  const h1 = resolveSeoH1(set.seo_h1, `${set.name} Seti`);
  const intro = resolveSeoIntro(set.seo_intro, description);
  const robots = set.seo_no_index ? "noindex, follow" : listingRobots;

  return {
    status: 200,
    title: `${title} | ${SITE_NAME}`,
    description,
    canonical,
    robots,
    ogType: "website",
    ogImage: set.logo_url ? normalizeImageUrl(baseUrl, set.logo_url) : `${baseUrl}/logo.png`,
    jsonLd: [
      orgSchema(baseUrl),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${title} | ${SITE_NAME}`,
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
        <h1>${escapeHtml(h1)}</h1>
        <p>${escapeHtml(intro)}</p>
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
  const defaultDescription = card.description
    ? stripHtml(card.description)
    : `${card.name} — ${card.set_name} seti, ${card.rarity || "TCG"} kart. Go|Cards TCG'de gerçek stok ve güncel fiyatla.`;
  const description = resolveSeoDescription(card.seo_description, defaultDescription);
  const title = resolveSeoTitle(card.seo_title, `${card.name} (${card.set_name})`);

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
    title: `${title} | ${SITE_NAME}`,
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

  const category = product.categoryId ? await storage.getCategory(product.categoryId).catch(() => null) : null;
  const rating = await storage.getProductAverageRating(product.id).catch(() => ({ average: 0, count: 0 }));

  const defaultDescription = product.description
    ? stripHtml(product.description)
    : `${product.name}${category ? ` — ${category.name}` : ""}. Go|Cards TCG'de ${inStock ? "gerçek stok ve güncel fiyatla" : "yakında stokta"} satışta.`;
  const description = resolveSeoDescription((product as any).seoDescription, defaultDescription);
  const title = resolveSeoTitle((product as any).seoTitle, product.name);

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

  const productSchema: any = {
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
  };
  // Sahte/varsayılan puan üretilmez — sadece gerçek onaylı değerlendirme verisi varsa eklenir
  if (rating && rating.count > 0) {
    productSchema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating.average,
      reviewCount: rating.count,
    };
  }

  return {
    status: 200,
    title: `${title} | ${SITE_NAME}`,
    description,
    canonical: `${baseUrl}${path}`,
    robots: "index, follow",
    ogType: "product",
    ogImage: image,
    jsonLd: [orgSchema(baseUrl), productSchema, breadcrumbSchema(baseUrl, breadcrumbItems)],
    bodyHtml: `
      <main>
        ${breadcrumbHtml(breadcrumbItems)}
        <h1>${escapeHtml(product.name)}</h1>
        <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)} ürün görseli" width="600" height="600">
        <p>${escapeHtml(description)}</p>
        <p>Fiyat: ${formatTRY(price)}</p>
        <p>${inStock ? `Stokta (${product.stock} adet)` : "Tükendi"}</p>
      </main>
    `,
  };
}

/**
 * Filtre/arama query parametresi taşıyan listeleme sayfaları (/kartlar,
 * /kategori/:slug) için ortak index kontrolü: yalnızca sayfalama (page) ve
 * sıralama (sort) parametreleri içerik kümesini değiştirmez — bu sayfalar
 * index,follow kalır ve KENDİ query'leriyle kanonikleşir (asla körlemesine
 * 1. sayfaya toplanmaz). Gerçek bir filtre veya arama parametresi varsa
 * sayfa noindex,follow olur ve yine kendi URL'ine self-canonical verilir.
 */
// Bazı parametreler "no-op" varsayılan değerle de URL'de açıkça yazılabilir
// (ör. ?minPrice=0 veya ?maxPrice=5000) — client tarafındaki gerçek filtre
// algısıyla aynı sonucu vermek için sadece anahtarın VAR olması değil,
// varsayılandan FARKLI bir değer taşıması filtre sayılır.
const NOOP_FILTER_VALUES: Record<string, string[]> = {
  minPrice: ["0"],
  maxPrice: ["5000", "10000"],
  inStock: ["false"],
  new: ["0"],
  discounted: ["0"],
};

function listingRobotsAndCanonical(
  baseUrl: string,
  pathname: string,
  search: string,
  filterKeys: readonly string[]
): { robots: RenderResult["robots"]; canonical: string } {
  const params = new URLSearchParams(search);
  const hasFilters = filterKeys.some((key) => {
    const value = params.get(key);
    if (value === null || value === "") return false;
    const noopValues = NOOP_FILTER_VALUES[key];
    if (noopValues && noopValues.includes(value)) return false;
    return true;
  });

  if (hasFilters) {
    return { robots: "noindex, follow", canonical: `${baseUrl}${pathname}${search}` };
  }

  const page = params.get("page");
  const canonicalSuffix = page && page !== "1" ? `?page=${encodeURIComponent(page)}` : "";
  return { robots: "index, follow", canonical: `${baseUrl}${pathname}${canonicalSuffix}` };
}

const CARDS_SEARCH_FILTER_KEYS = ["game", "set", "rarity", "type", "condition", "productType", "search", "inStock", "minPrice", "maxPrice"] as const;
const CATEGORY_FILTER_KEYS = ["minPrice", "maxPrice", "sizes", "colors", "fits", "new", "discounted"] as const;
const SET_FILTER_KEYS = ["search", "type"] as const;

async function renderCardsSearch(baseUrl: string, search: string = ""): Promise<RenderResult> {
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
  const { robots, canonical } = listingRobotsAndCanonical(baseUrl, path, search, CARDS_SEARCH_FILTER_KEYS);

  return {
    status: 200,
    title: `Tüm Kartlar — ${SITE_NAME} Marketplace`,
    description,
    canonical,
    robots,
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

async function renderLegacyCategory(categorySlug: string, baseUrl: string, search: string = ""): Promise<RenderResult> {
  const category = await storage.getCategoryBySlug(categorySlug).catch(() => null);
  if (!category) return notFoundResult(baseUrl, `/kategori/${categorySlug}`);

  const path = `/kategori/${categorySlug}`;
  const { products } = await storage.getProducts({ categoryId: category.id, limit: 48 }).catch(() => ({ products: [] as any[], total: 0 }));
  const items = products
    .map((p: any) => `<li><a href="/urun/${escapeHtml(p.slug)}">${escapeHtml(p.name)} — ${formatTRY(p.basePrice)}</a></li>`)
    .join("");

  const defaultDescription = `${category.name} — Go|Cards TCG mağazasında gerçek stok ve güncel fiyatla satışta.`;
  const listingResult = listingRobotsAndCanonical(baseUrl, path, search, CATEGORY_FILTER_KEYS);
  const title = resolveSeoTitle((category as any).seoTitle, category.name);
  const description = resolveSeoDescription((category as any).seoDescription, defaultDescription);
  const h1 = resolveSeoH1((category as any).seoH1, category.name);
  const intro = resolveSeoIntro((category as any).seoIntro, description);
  // Boş kategori (henüz hiç ürün yok) düşük değerli sayılır ve indexlenmez —
  // ürün eklenince bir sonraki render'da otomatik index,follow'a döner.
  // Admin seoNoIndex ise her koşulda noindex kalır.
  const robots = (category as any).seoNoIndex
    ? "noindex, follow"
    : products.length === 0
      ? "noindex, follow"
      : listingResult.robots;
  const canonical = listingResult.canonical;

  return {
    status: 200,
    title: `${title} | ${SITE_NAME}`,
    description,
    canonical,
    robots,
    ogType: "website",
    ogImage: category.image ? normalizeImageUrl(baseUrl, category.image) : `${baseUrl}/logo.png`,
    jsonLd: [
      orgSchema(baseUrl),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${title} | ${SITE_NAME}`,
        url: `${baseUrl}${path}`,
      },
      breadcrumbSchema(baseUrl, [{ name: "Ana Sayfa", path: "/" }, { name: category.name, path }]),
    ],
    bodyHtml: `
      <main>
        ${breadcrumbHtml([{ name: "Ana Sayfa", path: "/" }, { name: category.name, path }])}
        <h1>${escapeHtml(h1.toLocaleUpperCase("tr-TR"))}</h1>
        <p>${escapeHtml(intro)}</p>
        <ul>${items}</ul>
      </main>
    `,
  };
}

async function renderBlogList(baseUrl: string, search: string = ""): Promise<RenderResult> {
  const posts = await storage.getBlogPosts({ status: "published" }).catch(() => []);
  const items = posts
    .map((p: any) => `<li><a href="/blog/${escapeHtml(p.slug)}">${escapeHtml(p.title)}</a>${p.summary ? ` — ${escapeHtml(truncate(p.summary, 120))}` : ""}</li>`)
    .join("");

  // "category" bir filtre parametresidir — aynı rehber listesinin bir alt
  // kümesini gösterir, kendi query'siyle self-canonical + noindex olur.
  const { robots, canonical } = listingRobotsAndCanonical(baseUrl, "/blog", search, ["category"] as const);

  return {
    status: 200,
    title: `Rehber ve Blog | ${SITE_NAME}`,
    description: "Pokémon TCG ve Riftbound hakkında rehberler, kart tanıtımları ve koleksiyon ipuçları.",
    canonical,
    robots,
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
export async function renderPublicPage(pathname: string, baseUrl: string, search: string = ""): Promise<RenderResult | null> {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/") return renderHome(baseUrl);
  if (clean === "/kartlar") return renderCardsSearch(baseUrl, search);
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
    if (prefix === "kategori") return renderLegacyCategory(decoded, baseUrl, search);
    if (prefix === "kart") return renderCard(decoded, baseUrl);
    if (prefix === "set") return renderSet(decoded, baseUrl, search);
    if (prefix === "oyun") return renderGame(decoded, baseUrl);
    if (prefix === "blog") return renderBlogDetail(decoded, baseUrl);
  }

  if (segments.length === 1) {
    const owner = GAME_OWNER_CONFIGS[segments[0]];
    if (owner) return renderGameOwner(owner, baseUrl);
    if (segments[0] === "blog") return renderBlogList(baseUrl, search);
  }

  // Bilinen bir prefix ile başlayıp segment sayısı uymayan her yol (fazla ya
  // da eksik segment) gerçek 404 almalı; renderPublicPage null dönerse
  // renderAppShellResponse bunu yalnızca isKnownAppPath ile statik bir yol
  // ise 200 sayar — o yüzden burada açıkça 404 üretiyoruz.
  const knownPrefixes = ["urun", "kategori", "kart", "set", "oyun", "blog", "riftbound", "pokemon"];
  if (knownPrefixes.includes(segments[0])) {
    return notFoundResult(baseUrl, pathname);
  }

  return null;
}

export { notFoundResult };
