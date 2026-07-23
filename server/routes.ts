import type { Express, Request, Response, NextFunction } from "express";
import { aiStatusHandler, aiTopicsHandler, aiGenerateHandler, aiCoverHandler } from './ai-blog';
import { createServer, type Server } from "http";
import { storage, db } from "./storage";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { cache, CACHE_KEYS, CACHE_TTL } from "./cache";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { insertAdminUserSchema, insertCategorySchema, insertProductSchema, insertCartItemSchema, insertOrderSchema, insertOrderItemSchema, insertUserSchema, couponRedemptions, orders, orderItems as orderItemsTable, coupons, products, stockAdjustments, productCategories, cardListings, cards as cardsTable, cardSets, cardGames } from "@shared/schema";
import { authLimiter, registerLimiter, passwordResetLimiter, trackingLimiter, couponLimiter } from "./rateLimit";
import {
  validateBody, firstZodMessage,
  profileUpdateSchema, addressCreateSchema, addressUpdateSchema,
  categoryUpdateSchema, productUpdateSchema, bulkPriceSchema, bulkBadgeSchema,
  cartUpdateSchema, orderStatusUpdateSchema, orderTrackingSchema, orderUpdateSchema,
  orderNoteSchema, orderCancelSchema, couponWriteSchema, couponUpdateSchema,
  inventoryBulkUpdateSchema, campaignWriteSchema, campaignUpdateSchema,
  settingsWriteSchema, testEmailSchema, updateCredentialsSchema,
  menuItemWriteSchema, menuItemUpdateSchema, menuReorderSchema,
  woocommerceSettingsSchema, woocommerceTestSchema, iyzicoCredentialsSchema, adminInitSchema,
  influencerBulkSchema, paymentCreateSchema, whatsappTestSchema,
  confirmBankTransferSchema, rejectBankTransferSchema,
  adminLoginSchema, userLoginSchema, registerWriteSchema, forgotPasswordSchema, resetPasswordSchema,
  bankTransferOrderSchema, couponValidateSchema, maintenanceSchema,
  adminAccountUpdateSchema, productReviewSchema, dbClearTableSchema,
  menuRegenerateSchema, cartAddSchema,
  reviewRejectSchema, iyzicoCallbackSchema,
} from "./validation";
import { optimizeImage, optimizeImageBuffer, optimizeUploadedFiles } from "./imageOptimizer";
import { downloadVideo } from "./marketplaces/sync/engine";
import { 
  sendWelcomeEmail, 
  sendOrderConfirmationEmail, 
  sendPreparingNotificationEmail,
  sendShippingNotificationEmail, 
  sendAdminOrderNotificationEmail,
  sendPasswordResetEmail,
  sendReviewRequestEmail,
  sendTestEmail,
  sendAbandonedCartEmail,
  sendBankTransferPendingEmail,
  sendAdminReviewNotificationEmail,
  sendGuestReviewApprovedEmail,
  sendGuestReviewRejectedEmail,
  type AdminReviewNotificationPayload,
} from "./emailService";
import { verifyTurnstile, getClientIp } from "./captcha";
import {
  sendOrderReceivedToCustomer,
  sendOrderReceivedToAdmin,
  sendOrderPreparingToCustomer,
  sendOrderShippedToCustomer,
  sendOrderDeliveredToCustomer,
  sendOrderCancelledToCustomer,
  sendOrderCancelledToAdmin,
  sendBankTransferPendingToCustomer,
  sendBankTransferPendingToAdmin,
  sendTestWhatsApp,
  sendReviewPendingToAdmin,
} from "./whatsappService";
import { BANK_TRANSFER_DISCOUNT_RATE } from "./bankTransfer";
import {
  createCheckoutFormInitialize,
  retrieveCheckoutForm,
  isIyzicoConfigured,
  testIyzicoConnection,
  type IyzicoBasketItem,
} from "./iyzico";
import {
  buildGroupingPlan,
  AUTO_GROUP_DISPLAY_ORDER_BASE,
  AUTO_GROUP_DISPLAY_ORDER_MAX,
} from "./menu-grouping";
import { menuItems as menuItemsTable } from "@shared/schema";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  validateAndRotateRefreshToken,
  revokeRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  getOrCreateCartToken,
  type JwtPayload
} from "./jwt";

async function getAuthPayload(req: Request, res: Response): Promise<JwtPayload | null> {
  const accessToken = req.cookies?.access_token;
  
  if (accessToken) {
    const payload = verifyAccessToken(accessToken);
    if (payload) {
      return payload;
    }
  }
  
  const refreshToken = req.cookies?.refresh_token;
  if (refreshToken) {
    // Use rotation to revoke old token and issue new one
    const result = await validateAndRotateRefreshToken(
      refreshToken,
      req.headers['user-agent'],
      req.ip
    );
    if (result) {
      const newAccessToken = generateAccessToken(result.payload);
      const isProduction = process.env.NODE_ENV === 'production';
      // Set both new access token and rotated refresh token
      setAuthCookies(res, newAccessToken, result.newRefreshToken, isProduction);
      return result.payload;
    }
  }
  
  return null;
}

// ─── Cart line expansion (retail + TCG cards) ─────────────────────────────
type ExpandedLine = {
  productId: string | null;
  variantId: string | null;
  cardListingId: string | null;
  quantity: number;
  productName: string;
  variantDetails: string | null;
  price: string;
};

async function expandCartLinesToOrderItems(
  cartItems: any[]
): Promise<{ lines: ExpandedLine[]; subtotal: number; error?: string }> {
  const lines: ExpandedLine[] = [];
  let subtotal = 0;

  for (const cartItem of cartItems) {
    // ── Card-listing path (TCG primary) ──────────────────────────────────────
    if (cartItem.cardListingId) {
      const listing = await storage.getCardListing(cartItem.cardListingId);
      if (!listing || !listing.isActive) continue;
      const card = await storage.getCard(listing.cardId);
      const itemPrice = parseFloat(listing.price as string);
      subtotal += itemPrice * cartItem.quantity;
      lines.push({
        productId: null,
        variantId: null,
        cardListingId: listing.id,
        quantity: cartItem.quantity,
        productName: card ? card.name : 'Kart',
        variantDetails: listing.condition || null,
        price: listing.price as string,
      });
      continue;
    }
    // ── Product/variant path (fallback) ─────────────────────────────────────
    const variant = cartItem.variantId ? await storage.getProductVariant(cartItem.variantId) : null;
    const actualProductId = variant?.productId || cartItem.productId;
    const product = actualProductId ? await storage.getProduct(actualProductId) : null;
    if (!product) continue;
    const itemPrice = parseFloat(product.basePrice);
    subtotal += itemPrice * cartItem.quantity;
    lines.push({
      productId: product.id,
      variantId: variant?.id || null,
      cardListingId: null,
      quantity: cartItem.quantity,
      productName: product.name,
      variantDetails: variant ? `${variant.size || ''} ${variant.color || ''}`.trim() || null : null,
      price: product.basePrice,
    });
  }
  return { lines, subtotal };
}

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "client/public/uploads");

// Ensure upload directories exist
const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};
ensureDir(path.join(uploadDir, "products"));
ensureDir(path.join(uploadDir, "categories"));
ensureDir(path.join(uploadDir, "hero"));
ensureDir(path.join(uploadDir, "blog"));

const VALID_UPLOAD_TYPES = ['products', 'categories', 'hero', 'branding', 'blog'];

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.params.type || "products";
    if (!VALID_UPLOAD_TYPES.includes(type)) {
      return cb(new Error("Invalid upload type"), "");
    }
    const dest = path.join(uploadDir, type);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});


// ── URL import helpers ────────────────────────────────────────────────────────
function fetchUrlHtml(url: string, redirects = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    const mod = url.startsWith('https:') ? require('https') : require('http');
    const opts = { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GoCardsBot/1.0)', 'Accept': 'text/html', 'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8' } };
    const req = mod.get(url, opts, (res: any) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).toString();
        return resolve(fetchUrlHtml(next, redirects + 1));
      }
      if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c: string) => { data += c; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractBodyDescription(html: string): string {
  // Find the opening tag position with one of the known description markers,
  // then extract a raw chunk (up to 6000 chars) from after the opening tag.
  // This avoids the nested-div truncation problem of lazy regex matching.
  const markerPatterns = [
    /itemprop=["']description["'][^>]*>/i,
    /class=["'][^"']*woocommerce-product-details__short-description[^"']*["'][^>]*>/i,
    /class=["'][^"']*product-description[^"']*["'][^>]*>/i,
    /id=["']tab-description["'][^>]*>/i,
    /class=["'][^"']*product__description[^"']*["'][^>]*>/i,
    /class=["'][^"']*product-detail[^"']*description[^"']*["'][^>]*>/i,
  ];
  for (const re of markerPatterns) {
    const m = re.exec(html);
    if (!m) continue;
    const contentStart = m.index + m[0].length;
    const chunk = html.slice(contentStart, contentStart + 6000);
    const text = stripHtmlTags(chunk);
    if (text && text.length > 30) return text.substring(0, 3000);
  }
  return '';
}

function parseProductFromHtml(html: string, sourceUrl: string): { name: string; description: string; price: string; images: string[]; gameId: string | null } {
  const ldBlocks = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) || [];
  for (const block of ldBlocks) {
    try {
      const json = block.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
      const d = JSON.parse(json);
      const prod = d['@type'] === 'Product' ? d : (Array.isArray(d['@graph']) ? d['@graph'].find((n: any) => n['@type'] === 'Product') : null);
      if (prod) {
        const name = prod.name || '';
        let description = prod.description || '';
        if (!description || description.length < 80) {
          const bodyDesc = extractBodyDescription(html);
          if (bodyDesc.length > description.length) description = bodyDesc;
        }
        const imgs: string[] = Array.isArray(prod.image) ? prod.image : (prod.image ? [prod.image] : []);
        const offer = Array.isArray(prod.offers) ? prod.offers[0] : prod.offers;
        const price = offer?.price ? String(offer.price) : '';
        const lower = (sourceUrl + name).toLowerCase();
        const gameId = lower.includes('riftbound') ? 'riftbound' : lower.includes('pokemon') ? 'pokemon' : null;
        return { name, description, price, images: imgs, gameId };
      }
    } catch { /* skip */ }
  }
  // fallback: try to extract from HTML body first, then og:description
  const bodyDesc = extractBodyDescription(html);
  const get = (prop: string) => html.match(new RegExp(`property=["']${prop}["'][^>]*content=["']([^"']+)`))?.[1]
    || html.match(new RegExp(`content=["']([^"']+)["'][^>]*property=["']${prop}["']`))?.[1] || '';
  const name = get('og:title');
  const ogDescription = get('og:description');
  const description = bodyDesc.length > ogDescription.length ? bodyDesc : ogDescription;
  const ogImage = get('og:image');
  const lower = (sourceUrl + name).toLowerCase();
  const gameId = lower.includes('riftbound') ? 'riftbound' : lower.includes('pokemon') ? 'pokemon' : null;
  return { name, description, price: '', images: ogImage ? [ogImage] : [], gameId };
}

async function downloadProductImage(imageUrl: string, destDir: string): Promise<string | null> {
  if (!imageUrl) return null;
  try {
    const hash = crypto.createHash('md5').update(imageUrl).digest('hex').substring(0, 8);
    const rawExt = (imageUrl.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
    const ext = ['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg';
    const filename = `imported-${Date.now()}-${hash}.${ext}`;
    const destPath = path.join(destDir, 'products', filename);
    await new Promise<void>((resolve, reject) => {
      const mod = imageUrl.startsWith('https:') ? require('https') : require('http');
      const file = fs.createWriteStream(destPath);
      const req = mod.get(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res: any) => {
        if (res.statusCode < 200 || res.statusCode >= 300) { file.close(); reject(new Error(`Image HTTP ${res.statusCode}`)); return; }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      });
      req.on('error', (e: Error) => { file.close(); reject(e); });
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('Image timeout')); });
    });
    return `/uploads/products/${filename}`;
  } catch (e) {
    console.warn('[import-url] image download failed:', e);
    return null;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // 301 redirect — SEO alternate URL for Riftbound
  app.get('/league-of-legends-riftbound-tcg', (_req, res) => {
    res.redirect(301, '/riftbound');
  });

  // Dynamic sitemap.xml — categories + products + static pages
  app.get(["/sitemap.xml", "/sitemap_index.xml"], async (req, res) => {
    try {
      const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const today = new Date().toISOString().split("T")[0];

      const staticPages: Array<{ loc: string; priority: string; changefreq: string }> = [
        { loc: "/", priority: "1.0", changefreq: "daily" },
        { loc: "/magaza", priority: "0.9", changefreq: "daily" },
        { loc: "/pokemon", priority: "0.9", changefreq: "weekly" },
        { loc: "/riftbound", priority: "0.9", changefreq: "weekly" },
        { loc: "/hakkimizda", priority: "0.6", changefreq: "monthly" },
        { loc: "/teslimat-kosullari", priority: "0.4", changefreq: "yearly" },
        { loc: "/mesafeli-satis-sozlesmesi", priority: "0.4", changefreq: "yearly" },
        { loc: "/iptal-ve-iade", priority: "0.4", changefreq: "yearly" },
        { loc: "/kvkk", priority: "0.4", changefreq: "yearly" },
      ];

      const [categories, products] = await Promise.all([
        storage.getCategories().catch(() => []),
        storage.getAllProducts().catch(() => []),
      ]);

      const escapeXml = (str: string) =>
        str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

      const urls: string[] = [];

      for (const page of staticPages) {
        urls.push(
          `  <url>\n    <loc>${baseUrl}${page.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`
        );
      }

      for (const cat of categories) {
        if (!cat?.slug) continue;
        urls.push(
          `  <url>\n    <loc>${baseUrl}/kategori/${escapeXml(cat.slug)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
        );
      }

      for (const product of products) {
        if (!product?.slug) continue;
        const lastmod = (product as any).updatedAt
          ? new Date((product as any).updatedAt).toISOString().split("T")[0]
          : today;
        urls.push(
          `  <url>\n    <loc>${baseUrl}/urun/${escapeXml(product.slug)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`
        );
      }

      // Blog posts in sitemap
      urls.push(
        `  <url>\n    <loc>${baseUrl}/blog</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`
      );
      try {
        const blogPosts = await storage.getBlogPosts({ status: "published" });
        for (const post of blogPosts) {
          const lastmod = post.updatedAt
            ? new Date(post.updatedAt).toISOString().split("T")[0]
            : today;
          urls.push(
            `  <url>\n    <loc>${baseUrl}/blog/${escapeXml(post.slug)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`
          );
        }
      } catch (_) {}

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;

      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (error) {
      console.error("[sitemap] generation failed:", error);
      res.status(500).type("text/plain").send("Sitemap generation failed");
    }
  });

  // ── Google Merchant Center Feed ──────────────────────────────────────────
  app.get("/api/merchant-feed.xml", async (req, res) => {
    try {
      const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;

      const escXml = (s: string) =>
        String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');

      const stripHtmlFeed = (s: string) =>
        s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      const conditionGoogleMap = (cond: string): 'new' | 'used' => {
        const c = (cond || '').toUpperCase();
        return c === 'NM' || c === 'LP' ? 'new' : 'used';
      };

      const conditionLabel: Record<string, string> = {
        NM: 'Near Mint', LP: 'Lightly Played', MP: 'Moderately Played',
        HP: 'Heavily Played', DMG: 'Damaged',
        PSA10: 'PSA 10', PSA9: 'PSA 9', PSA8: 'PSA 8', PSA7: 'PSA 7',
      };

      // ── Query active card listings with card + set + game info ────────────
      const listingRows = await db
        .select({
          listingId: cardListings.id,
          condition: cardListings.condition,
          price: cardListings.price,
          stock: cardListings.stock,
          cardSlug: cardsTable.slug,
          cardName: cardsTable.name,
          cardRarity: cardsTable.rarity,
          cardApiId: cardsTable.apiId,
          cardImageUrl: cardsTable.imageUrl,
          cardImageHiRes: cardsTable.imageUrlHiRes,
          setName: cardSets.name,
          gameName: cardGames.name,
        })
        .from(cardListings)
        .innerJoin(cardsTable, eq(cardListings.cardId, cardsTable.id))
        .innerJoin(cardSets, eq(cardsTable.setId, cardSets.id))
        .innerJoin(cardGames, eq(cardSets.gameId, cardGames.id))
        .where(
          and(
            eq(cardListings.isActive, true),
            eq(cardsTable.isActive, true),
            gte(cardListings.stock, 1)
          )
        )
        .orderBy(desc(cardListings.updatedAt))
        .limit(5000);

      // ── Query active box/sealed products with stock > 0 ──────────────────
      const boxRows = await db
        .select()
        .from(products)
        .where(and(eq(products.isActive, true), gte(products.stock, 1)))
        .orderBy(desc(products.updatedAt))
        .limit(1000);

      const items: string[] = [];

      for (const row of listingRows) {
        const condLabel = conditionLabel[row.condition] || row.condition;
        const title = escXml(`${row.cardName} — ${condLabel} — ${row.setName}`);
        const desc = escXml(
          `${row.cardName}${row.cardRarity ? ' (' + row.cardRarity + ')' : ''} — ${condLabel} koşulunda ${row.setName} seti kartı. Go|Cards'da satın al.`
        );
        const link = `${baseUrl}/kart/${escXml(row.cardSlug)}`;
        const image = row.cardImageHiRes || row.cardImageUrl || '';
        const price = parseFloat(row.price as string).toFixed(2);
        const availability = 'in_stock';
        const googleCondition = conditionGoogleMap(row.condition);
        const brand = escXml(row.gameName);
        const productType = escXml(`${row.gameName} > ${row.setName}`);

        items.push(`    <item>
      <g:id>${escXml(row.listingId)}</g:id>
      <g:title>${title}</g:title>
      <g:description>${desc}</g:description>
      <g:link>${link}</g:link>${image ? `\n      <g:image_link>${escXml(image)}</g:image_link>` : ''}
      <g:availability>${availability}</g:availability>
      <g:price>${price} TRY</g:price>
      <g:brand>${brand}</g:brand>
      <g:condition>${googleCondition}</g:condition>
      <g:google_product_category>5710</g:google_product_category>
      <g:product_type>${productType}</g:product_type>${row.cardApiId ? `\n      <g:mpn>${escXml(row.cardApiId)}</g:mpn>` : ''}
    </item>`);
      }

      for (const prod of boxRows) {
        const title = escXml(prod.name);
        const rawDesc = prod.description ? stripHtmlFeed(prod.description).substring(0, 500) : prod.name;
        const desc = escXml(rawDesc);
        const link = `${baseUrl}/urun/${escXml(prod.slug)}`;
        const images = (prod.images as string[]) || [];
        const image = images[0] || '';
        const normalizedImage = image
          ? (image.startsWith('http') ? image : `${baseUrl}${image.startsWith('/') ? image : '/' + image}`)
          : '';
        const price = parseFloat(prod.basePrice).toFixed(2);

        const prodStock = typeof (prod as any).stock === 'number' ? (prod as any).stock : 1;
        const prodAvailability = prodStock > 0 ? 'in_stock' : 'out_of_stock';

        items.push(`    <item>
      <g:id>${escXml('prod_' + prod.id)}</g:id>
      <g:title>${title}</g:title>
      <g:description>${desc}</g:description>
      <g:link>${link}</g:link>${normalizedImage ? `\n      <g:image_link>${escXml(normalizedImage)}</g:image_link>` : ''}
      <g:availability>${prodAvailability}</g:availability>
      <g:price>${price} TRY</g:price>
      <g:brand>GoCards TCG</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>5710</g:google_product_category>
    </item>`);
      }

      const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Go|Cards — Pokémon TCG &amp; Riftbound</title>
    <link>${baseUrl}</link>
    <description>Go|Cards Türkiye TCG mağazası — Pokémon TCG ve Riftbound tekli kart ve sealed ürünler</description>
${items.join('\n')}
  </channel>
</rss>`;

      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(feed);
    } catch (error) {
      console.error('[merchant-feed] generation failed:', error);
      res.status(500).type('text/plain').send('Merchant feed generation failed');
    }
  });

  // Social Media Crawler Detection - serves pre-rendered OG tags for bots
  const crawlerPatterns = [
    'facebookexternalhit',
    'Facebot',
    'WhatsApp',
    'Twitterbot',
    'LinkedInBot',
    'Slackbot',
    'TelegramBot',
    'Pinterest',
    'Discordbot',
    'Googlebot',
    'bingbot'
  ];

  const isCrawler = (userAgent: string | undefined): boolean => {
    if (!userAgent) return false;
    return crawlerPatterns.some(pattern => 
      userAgent.toLowerCase().includes(pattern.toLowerCase())
    );
  };

  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const stripHtml = (str: string): string =>
    str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const normalizeImageUrl = (baseUrl: string, imageUrl: string): string => {
    if (!imageUrl) return `${baseUrl}/logo.png`;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    return `${baseUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
  };

  // Product page crawler middleware
  app.get('/urun/:slug', async (req, res, next) => {
    const userAgent = req.get('user-agent');
    
    if (!isCrawler(userAgent)) {
      return next();
    }

    try {
      const product = await storage.getProductBySlug(req.params.slug);
      if (!product) {
        return next();
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const pageUrl = `${baseUrl}/urun/${product.slug}`;
      const mainImage = product.images && product.images.length > 0 
        ? normalizeImageUrl(baseUrl, product.images[0])
        : `${baseUrl}/logo.png`;
      const price = parseFloat(product.basePrice || '0');
      const description = product.description 
        ? escapeHtml(stripHtml(product.description).substring(0, 200))
        : `${escapeHtml(product.name)} — Go|Cards TCG mağazasında satın al.`;

      const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(product.name)} | Go|Cards</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="product">
  <meta property="og:title" content="${escapeHtml(product.name)}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${mainImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:site_name" content="Go|Cards">
  <meta property="og:locale" content="tr_TR">
  <meta property="product:price:amount" content="${price}">
  <meta property="product:price:currency" content="TRY">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(product.name)} | Go|Cards">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${mainImage}">
  
  <link rel="canonical" href="${pageUrl}">
</head>
<body>
  <h1>${escapeHtml(product.name)}</h1>
  <p>${description}</p>
  <p>Fiyat: ${price.toLocaleString('tr-TR')} TL</p>
  <img src="${mainImage}" alt="${escapeHtml(product.name)}">
  <a href="${pageUrl}">Ürünü Görüntüle</a>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      console.error('Crawler middleware error:', error);
      next();
    }
  });

  // Category page crawler middleware
  app.get('/kategori/:slug', async (req, res, next) => {
    const userAgent = req.get('user-agent');
    
    if (!isCrawler(userAgent)) {
      return next();
    }

    try {
      const category = await storage.getCategoryBySlug(req.params.slug);
      if (!category) {
        return next();
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const pageUrl = `${baseUrl}/kategori/${category.slug}`;
      const mainImage = category.image 
        ? normalizeImageUrl(baseUrl, category.image)
        : `${baseUrl}/logo.png`;
      const description = `${escapeHtml(category.name)} — Go|Cards TCG mağazasında satın al.`;

      const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(category.name)} | Go|Cards</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(category.name)} | Go|Cards">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${mainImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:site_name" content="Go|Cards">
  <meta property="og:locale" content="tr_TR">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(category.name)} | Go|Cards">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${mainImage}">
  
  <link rel="canonical" href="${pageUrl}">
</head>
<body>
  <h1>${escapeHtml(category.name)}</h1>
  <p>${description}</p>
  <img src="${mainImage}" alt="${escapeHtml(category.name)}">
  <a href="${pageUrl}">Ürünleri Görüntüle</a>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      console.error('Crawler middleware error:', error);
      next();
    }
  });

  // Admin Authentication with JWT
  app.post("/api/admin/login", authLimiter, async (req: Request, res) => {
    try {
      const parsedLogin = adminLoginSchema.safeParse(req.body);
      if (!parsedLogin.success) return res.status(400).json({ error: firstZodMessage(parsedLogin.error) });
      const { username, password } = parsedLogin.data;
      const user = await storage.getAdminUserByUsername(username);
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const payload = { adminUserId: user.id, email: user.username, type: 'admin' as const };
      const accessToken = generateAccessToken(payload);
      const refreshToken = await generateRefreshToken(
        payload,
        req.headers['user-agent'],
        req.ip
      );

      const isProduction = process.env.NODE_ENV === 'production';
      setAuthCookies(res, accessToken, refreshToken, isProduction);

      res.json({ success: true, user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/admin/logout", async (req: Request, res) => {
    try {
      const refreshToken = req.cookies?.refresh_token;
      if (refreshToken) {
        await revokeRefreshToken(refreshToken);
      }
      clearAuthCookies(res);
      res.json({ success: true });
    } catch (error) {
      clearAuthCookies(res);
      res.json({ success: true });
    }
  });

  app.get("/api/admin/me", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'admin' || !payload.adminUserId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getAdminUser(payload.adminUserId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ id: user.id, username: user.username });
  });

  app.patch("/api/admin/account", async (req: Request, res) => {
    try {
      const payload = await getAuthPayload(req, res);
      if (!payload || payload.type !== 'admin' || !payload.adminUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getAdminUser(payload.adminUserId);
      if (!user) {
        return res.status(404).json({ error: "Yönetici bulunamadı" });
      }

      const parsedAccount = adminAccountUpdateSchema.safeParse(req.body);
      if (!parsedAccount.success) return res.status(400).json({ error: firstZodMessage(parsedAccount.error) });
      const { currentPassword, newUsername, newPassword } = parsedAccount.data;

      const passwordOk = await bcrypt.compare(currentPassword, user.password);
      if (!passwordOk) {
        return res.status(401).json({ error: "Mevcut şifre hatalı" });
      }

      const update: Partial<{ username: string; password: string }> = {};

      if (typeof newUsername === 'string' && newUsername.trim().length > 0 && newUsername.trim() !== user.username) {
        const trimmed = newUsername.trim();
        if (trimmed.length < 3) {
          return res.status(400).json({ error: "Kullanıcı adı en az 3 karakter olmalı" });
        }
        if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
          return res.status(400).json({ error: "Kullanıcı adı yalnızca harf, rakam, '.', '_' ve '-' içerebilir" });
        }
        const existing = await storage.getAdminUserByUsername(trimmed);
        if (existing && existing.id !== user.id) {
          return res.status(409).json({ error: "Bu kullanıcı adı zaten kullanılıyor" });
        }
        update.username = trimmed;
      }

      if (typeof newPassword === 'string' && newPassword.length > 0) {
        if (newPassword.length < 8) {
          return res.status(400).json({ error: "Yeni şifre en az 8 karakter olmalı" });
        }
        update.password = await bcrypt.hash(newPassword, 10);
      }

      if (!update.username && !update.password) {
        return res.status(400).json({ error: "Değiştirilecek bir bilgi girin" });
      }

      const updated = await storage.updateAdminUser(user.id, update);
      if (!updated) {
        return res.status(500).json({ error: "Güncelleme başarısız" });
      }

      console.log(`[AdminAccount] ${user.username} updated -> username:${update.username ? 'changed' : '-'} password:${update.password ? 'changed' : '-'}`);

      res.json({
        success: true,
        user: { id: updated.id, username: updated.username },
        usernameChanged: Boolean(update.username),
        passwordChanged: Boolean(update.password),
      });
    } catch (error) {
      console.error('[AdminAccount] update error:', error);
      res.status(500).json({ error: "Hesap güncellenemedi" });
    }
  });

  // Middleware for admin routes
  const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'admin' || !payload.adminUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    (req as any).adminId = payload.adminUserId;
    next();
  };

  // Typed accessor — `requireAdmin` middleware'inden sonra çağrılırsa
  // her zaman string döner. `(req as any).adminId` cast'lerini kapsüller.
  const getAdminId = (req: Request): string => {
    const id = (req as Request & { adminId?: unknown }).adminId;
    if (typeof id !== 'string' || !id) {
      throw new Error('Admin context missing — requireAdmin middleware did not run.');
    }
    return id;
  };

  // Allowed upload types for security
  const ALLOWED_UPLOAD_TYPES = ['products', 'categories', 'hero', 'branding', 'blog'];

  // File Upload Route with type validation and image optimization
  app.post("/api/admin/upload/:type", requireAdmin, (req, res, next) => {
    upload.array("images", 20)(req, res, (err) => {
      if (err) {
        console.error('[Upload] Multer error:', err.message);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "Dosya boyutu 10MB'ı geçemez" });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: "En fazla 20 dosya yüklenebilir" });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: "Geçersiz dosya alanı" });
        }
        return res.status(400).json({ error: err.message || "Yükleme hatası" });
      }
      next();
    });
  }, async (req, res) => {
    try {
      const type = req.params.type;
      
      if (!ALLOWED_UPLOAD_TYPES.includes(type)) {
        return res.status(400).json({ error: "Invalid upload type" });
      }
      
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }
      
      // Optimize uploaded images
      const urls = await optimizeUploadedFiles(files);
      console.log(`[Upload] Optimized ${urls.length} images for ${type}`);
      res.json({ urls });
    } catch (error) {
      console.error('[Upload] Error:', error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // ── URL'den ürün içe aktar — paylaşılan core mantık ──────────────────────
  async function importProductFromUrl(url: string, productType: string): Promise<{ scraped: { name: string; price: string; imageCount: number; foundCount: number } }> {
    const html = await fetchUrlHtml(url.trim());
    const data = parseProductFromHtml(html, url);
    if (!data.name) throw new Error('Sayfadan ürün bilgisi çıkarılamadı. Lütfen manuel oluşturun.');

    const candidateImages = data.images
      .filter(img => img && !img.includes('/theme-images/') && img.startsWith('http'))
      .slice(0, 10);
    const downloadedPaths = (
      await Promise.all(candidateImages.map(img => downloadProductImage(img, uploadDir)))
    ).filter((p): p is string => p !== null);

    const cleanName = data.name.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim();
    const slugBase = cleanName.toLowerCase()
      .replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g').replace(/[ıİ]/g, 'i')
      .replace(/[öÖ]/g, 'o').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 80);
    const slug = `${slugBase}-${Date.now()}`;

    const allCategories = await storage.getCategories();
    const categoryId = allCategories[0]?.id || '';

    await storage.createProduct({
      name: cleanName,
      slug,
      description: data.description || '',
      basePrice: data.price ? data.price.replace(',', '.') : '0',
      categoryId,
      images: downloadedPaths,
      isActive: false,
      isFeatured: false,
      isNew: true,
      gameId: data.gameId,
      productType,
    } as any);

    return { scraped: { name: cleanName, price: data.price, imageCount: downloadedPaths.length, foundCount: data.images.length } };
  }

  app.post("/api/admin/import-product-url", requireAdmin, async (req, res) => {
    try {
      const { url, productType: overrideType } = req.body;
      if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL gerekli' });
      const { scraped } = await importProductFromUrl(url.trim(), overrideType || 'sealed');
      res.json({ success: true, scraped });
    } catch (err: any) {
      console.error('[import-url]', err);
      const status = err.message?.includes('çıkarılamadı') ? 422 : 500;
      res.status(status).json({ error: err.message || 'İçe aktarma başarısız' });
    }
  });

  // ── Toplu URL'den ürün içe aktar ──────────────────────────────────────────
  app.post("/api/admin/import-product-url-bulk", requireAdmin, async (req, res) => {
    try {
      const { urls, productType: overrideType } = req.body;
      if (!Array.isArray(urls) || urls.length === 0) return res.status(400).json({ error: 'urls dizisi gerekli' });
      if (urls.length > 100) return res.status(400).json({ error: 'En fazla 100 URL desteklenir' });

      const results: Array<{ url: string; status: 'success' | 'error'; scraped?: { name: string; price: string; imageCount: number; foundCount: number }; error?: string }> = [];

      for (const rawUrl of urls) {
        if (!rawUrl || typeof rawUrl !== 'string') {
          results.push({ url: String(rawUrl), status: 'error', error: 'Geçersiz URL' });
          continue;
        }
        try {
          const { scraped } = await importProductFromUrl(rawUrl.trim(), overrideType || 'sealed');
          results.push({ url: rawUrl, status: 'success', scraped });
        } catch (err: any) {
          console.error('[import-url-bulk]', rawUrl, err.message);
          results.push({ url: rawUrl, status: 'error', error: err.message || 'İçe aktarma başarısız' });
        }
      }

      res.json({ success: true, results });
    } catch (err: any) {
      console.error('[import-url-bulk]', err);
      res.status(500).json({ error: err.message || 'Toplu içe aktarma başarısız' });
    }
  });

  // Delete uploaded file with path validation
  app.delete("/api/admin/upload", requireAdmin, (req, res) => {
    try {
      const { path: filePath } = req.body;
      
      if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({ error: "Invalid file path" });
      }
      
      if (!filePath.startsWith("/uploads/")) {
        return res.status(400).json({ error: "Invalid file path" });
      }
      
      if (filePath.includes('..') || filePath.includes('//')) {
        return res.status(400).json({ error: "Invalid file path" });
      }
      
      const pathParts = filePath.split('/').filter(Boolean);
      if (pathParts.length < 3 || pathParts[0] !== 'uploads' || !ALLOWED_UPLOAD_TYPES.includes(pathParts[1])) {
        return res.status(400).json({ error: "Invalid file path" });
      }
      
      const fullPath = path.join(process.cwd(), "client/public", filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Delete failed" });
    }
  });

  // Admin Stats
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Admin Users Management
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const { search } = req.query;
      const users = await storage.getUsers(search as string);
      res.json(users.map(u => ({ ...u, password: undefined })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Admin Products (all products including inactive)
  app.get("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      // Add categoryIds to each product for multi-category support
      const productsWithCategoryIds = await Promise.all(
        products.map(async (product) => {
          const categoryIds = await storage.getProductCategoryIds(product.id);
          return { ...product, categoryIds };
        })
      );
      res.json(productsWithCategoryIds);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // User Authentication
  app.post("/api/auth/register", registerLimiter, async (req: Request, res) => {
    try {
      const parsed = registerWriteSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const { email, password, firstName, lastName, phone, address, city, district, postalCode } = parsed.data;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Bu e-posta adresi zaten kayıtlı" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        address,
        city,
        district,
        postalCode,
      });

      // Set JWT cookies for the new user
      const payload = { userId: user.id, email: user.email, type: 'user' as const };
      const accessToken = generateAccessToken(payload);
      const refreshToken = await generateRefreshToken(
        payload,
        req.headers['user-agent'],
        req.ip
      );
      const isProduction = process.env.NODE_ENV === 'production';
      setAuthCookies(res, accessToken, refreshToken, isProduction);
      
      // If address info is provided, create a saved address
      if (address && city && district && firstName && lastName && phone) {
        await storage.createUserAddress({
          userId: user.id,
          title: 'Ev Adresi',
          firstName,
          lastName,
          phone,
          address,
          city,
          district,
          postalCode: postalCode || undefined,
          isDefault: true,
        });
      }
      
      // Send welcome email (don't wait)
      sendWelcomeEmail(user).catch(err => console.error('[Email] Welcome email failed:', err));
      
      res.status(201).json({ 
        success: true, 
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: "Kayıt işlemi başarısız" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req: Request, res) => {
    try {
      const parsedLogin = userLoginSchema.safeParse(req.body);
      if (!parsedLogin.success) return res.status(400).json({ error: firstZodMessage(parsedLogin.error) });
      const { email, password } = parsedLogin.data;
      const user = await storage.getUserByEmail(email);
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "E-posta veya şifre hatalı" });
      }

      const payload = { userId: user.id, email: user.email, type: 'user' as const };
      const accessToken = generateAccessToken(payload);
      const refreshToken = await generateRefreshToken(
        payload,
        req.headers['user-agent'],
        req.ip
      );

      const isProduction = process.env.NODE_ENV === 'production';
      setAuthCookies(res, accessToken, refreshToken, isProduction);

      res.json({ 
        success: true, 
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } 
      });
    } catch (error) {
      console.error('User login error:', error);
      res.status(500).json({ error: "Giriş işlemi başarısız" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res) => {
    try {
      const refreshToken = req.cookies?.refresh_token;
      if (refreshToken) {
        await revokeRefreshToken(refreshToken);
      }
      clearAuthCookies(res);
      res.json({ success: true });
    } catch (error) {
      clearAuthCookies(res);
      res.json({ success: true });
    }
  });

  app.get("/api/auth/me", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'user' || !payload.userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    const user = await storage.getUser(payload.userId);
    if (!user) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı" });
    }

    res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone, address: user.address, city: user.city, district: user.district, postalCode: user.postalCode, country: user.country, whatsappOptIn: user.whatsappOptIn, createdAt: user.createdAt });
  });

  app.patch("/api/auth/profile", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'user' || !payload.userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    try {
      const parsed = profileUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const { firstName, lastName, phone, whatsappOptIn } = parsed.data;
      const updates: { firstName?: string; lastName?: string; phone?: string; whatsappOptIn?: boolean } = {};
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (phone !== undefined) updates.phone = phone;
      if (typeof whatsappOptIn === 'boolean') updates.whatsappOptIn = whatsappOptIn;

      const updated = await storage.updateUser(payload.userId, updates);
      if (!updated) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }
      res.json({ id: updated.id, email: updated.email, firstName: updated.firstName, lastName: updated.lastName, phone: updated.phone, whatsappOptIn: updated.whatsappOptIn });
    } catch (error) {
      res.status(500).json({ error: "Profil güncellenemedi" });
    }
  });

  // User Addresses API
  app.get("/api/auth/addresses", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'user' || !payload.userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    try {
      const addresses = await storage.getUserAddresses(payload.userId);
      res.json(addresses);
    } catch (error) {
      res.status(500).json({ error: "Adresler yüklenemedi" });
    }
  });

  app.post("/api/auth/addresses", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'user' || !payload.userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    try {
      const parsed = addressCreateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const { title, firstName, lastName, phone, address, city, district, postalCode, isDefault } = parsed.data;
      
      // Check if this is the first address - if so, make it default
      const existingAddresses = await storage.getUserAddresses(payload.userId);
      const shouldBeDefault = existingAddresses.length === 0 ? true : !!isDefault;
      
      const newAddress = await storage.createUserAddress({
        userId: payload.userId,
        title: title || 'Adresim',
        firstName,
        lastName,
        phone,
        address,
        city,
        district,
        postalCode,
        isDefault: shouldBeDefault,
      });
      res.status(201).json(newAddress);
    } catch (error) {
      res.status(500).json({ error: "Adres eklenemedi" });
    }
  });

  app.patch("/api/auth/addresses/:id", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'user' || !payload.userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    try {
      const parsed = addressUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const existingAddress = await storage.getUserAddress(req.params.id);
      if (!existingAddress || existingAddress.userId !== payload.userId) {
        return res.status(404).json({ error: "Adres bulunamadı" });
      }

      const { title, firstName, lastName, phone, address, city, district, postalCode, isDefault } = parsed.data;
      const updated = await storage.updateUserAddress(req.params.id, {
        title,
        firstName,
        lastName,
        phone,
        address,
        city,
        district,
        postalCode,
        isDefault,
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Adres güncellenemedi" });
    }
  });

  app.delete("/api/auth/addresses/:id", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'user' || !payload.userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    try {
      const existingAddress = await storage.getUserAddress(req.params.id);
      if (!existingAddress || existingAddress.userId !== payload.userId) {
        return res.status(404).json({ error: "Adres bulunamadı" });
      }

      await storage.deleteUserAddress(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Adres silinemedi" });
    }
  });

  app.patch("/api/auth/addresses/:id/default", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'user' || !payload.userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    try {
      const existingAddress = await storage.getUserAddress(req.params.id);
      if (!existingAddress || existingAddress.userId !== payload.userId) {
        return res.status(404).json({ error: "Adres bulunamadı" });
      }

      await storage.setDefaultAddress(payload.userId, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Varsayılan adres ayarlanamadı" });
    }
  });

  app.get("/api/orders/my", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'user' || !payload.userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    try {
      const user = await storage.getUser(payload.userId);
      if (!user) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }
      const orders = await storage.getOrdersByEmail(user.email);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Siparişler yüklenemedi" });
    }
  });

  app.get("/api/orders/my/:id", async (req: Request, res) => {
    const payload = await getAuthPayload(req, res);
    if (!payload || payload.type !== 'user' || !payload.userId) {
      return res.status(401).json({ error: "Giriş yapılmamış" });
    }

    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Sipariş bulunamadı" });
      }
      const user = await storage.getUser(payload.userId);
      if (!user || order.customerEmail !== user.email) {
        return res.status(403).json({ error: "Bu siparişe erişim yetkiniz yok" });
      }
      const items = await storage.getOrderItems(order.id);
      res.json({ ...order, items });
    } catch (error) {
      res.status(500).json({ error: "Sipariş yüklenemedi" });
    }
  });

  // Public Order Tracking API
  app.get("/api/orders/track", trackingLimiter, async (req: Request, res) => {
    try {
      const { orderNumber, email } = req.query;
      
      if (!orderNumber || typeof orderNumber !== 'string') {
        return res.status(400).json({ error: "Sipariş numarası gerekli" });
      }

      const order = await storage.getOrderByNumber(orderNumber);
      if (!order) {
        return res.status(404).json({ error: "Sipariş bulunamadı" });
      }

      // If email provided, verify it matches (optional security)
      if (email && typeof email === 'string' && order.customerEmail.toLowerCase() !== email.toLowerCase()) {
        return res.status(404).json({ error: "Sipariş bulunamadı" });
      }

      const items = await storage.getOrderItems(order.id);
      
      // Return limited info for public tracking
      res.json({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        customerName: order.customerName,
        createdAt: order.createdAt,
        processingAt: order.processingAt,
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
        cancelledAt: order.cancelledAt,
        total: order.total,
        shippingCost: order.shippingCost,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        shippingCarrier: order.shippingCarrier,
        shippingAddress: order.shippingAddress,
        items: items.map(item => ({
          id: item.id,
          productName: item.productName,
          variantDetails: item.variantDetails,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })),
      });
    } catch (error) {
      console.error('[Order Track] Error:', error);
      res.status(500).json({ error: "Sipariş bilgisi alınamadı" });
    }
  });

  // Categories API
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/:slug", async (req, res) => {
    try {
      const category = await storage.getCategoryBySlug(req.params.slug);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch category" });
    }
  });

  app.post("/api/admin/categories", requireAdmin, async (req, res) => {
    try {
      const validated = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validated);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: firstZodMessage(error) });
      console.error('Category creation error:', error);
      res.status(500).json({ error: "Kategori oluşturulamadı" });
    }
  });

  app.patch("/api/admin/categories/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = categoryUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const category = await storage.updateCategory(req.params.id, parsed.data);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(400).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/admin/categories/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Products API
  app.get("/api/products", async (req, res) => {
    try {
      const { categoryId, isFeatured, isNew, search, minPrice, maxPrice, sort, page, limit, sizes, colors, fits, discounted } = req.query;
      const sizesArr = sizes ? String(sizes).split(',').map(s => s.trim()).filter(Boolean) : undefined;
      const colorsArr = colors ? String(colors).split(',').map(s => s.trim()).filter(Boolean) : undefined;
      const fitsArr = fits ? String(fits).split(',').map(s => s.trim()).filter(Boolean) : undefined;
      const pageNum = page ? parseInt(page as string, 10) : undefined;
      const limitNum = limit ? parseInt(limit as string, 10) : undefined;
      const result = await storage.getProducts({
        categoryId: categoryId as string || undefined,
        isFeatured: isFeatured !== undefined ? isFeatured === 'true' : undefined,
        isNew: isNew !== undefined ? isNew === 'true' : undefined,
        search: search as string || undefined,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        sort: sort as 'price_asc' | 'price_desc' | 'newest' | 'popular' | undefined,
        sizes: sizesArr,
        colors: colorsArr,
        fits: fitsArr,
        discounted: discounted === 'true' ? true : undefined,
        page: pageNum,
        limit: limitNum,
      });
      const pageLimit = limitNum ?? 24;
      const currentPage = pageNum ?? 1;
      res.json({
        products: result.products,
        total: result.total,
        page: currentPage,
        limit: pageLimit,
        totalPages: pageNum !== undefined ? Math.ceil(result.total / pageLimit) : 1,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/boxes", async (req, res) => {
    try {
      const gameSlug = req.query.game as string | undefined;
      const boxes = await storage.getBoxProducts(gameSlug);
      res.json(boxes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch box products" });
    }
  });

  app.get("/api/products/facets", async (req, res) => {
    try {
      const { categoryId, search, minPrice, maxPrice } = req.query;
      const facets = await storage.getProductFacets({
        categoryId: categoryId as string || undefined,
        search: search as string || undefined,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      });
      res.json(facets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch facets" });
    }
  });

  app.get("/api/products/:slug", async (req, res) => {
    try {
      const product = await storage.getProductBySlug(req.params.slug);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      const variants = await storage.getProductVariants(product.id);
      const categoryIds = await storage.getProductCategoryIds(product.id);
      res.json({ ...product, variants, categoryIds });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const { categoryIds, initialStock, ...productData } = req.body;
      if (productData.categoryId === '') productData.categoryId = null;
      if (productData.gameId === '') productData.gameId = null;
      const validated = insertProductSchema.parse(productData);
      const product = await storage.createProduct(validated);
      
      // Set product categories (multi-category support)
      if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
        await storage.setProductCategories(product.id, categoryIds);
      } else if (product.categoryId) {
        // Fallback: also add the main categoryId to product_categories for consistency
        await storage.setProductCategories(product.id, [product.categoryId]);
      }
      
      // Auto-create a default variant if no variants exist yet
      const baseSku = product.sku || '';
      const stockValue = initialStock ? parseInt(initialStock, 10) : 0;
      await storage.createProductVariant({
        productId: product.id,
        size: null,
        color: null,
        sku: baseSku || null,
        stock: stockValue,
        price: product.basePrice,
      });

      // Return product with categoryIds
      const productCategoryIds = await storage.getProductCategoryIds(product.id);
      res.status(201).json({ ...product, categoryIds: productCategoryIds });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: firstZodMessage(error) });
      console.error('Product creation error:', error);
      res.status(500).json({ error: "Ürün oluşturulamadı" });
    }
  });

  app.patch("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      const { categoryIds, ...productData } = req.body;
      if (productData.categoryId === '') productData.categoryId = null;
      if (productData.gameId === '') productData.gameId = null;
      if (productData.linkedSetId === '' || productData.linkedSetId === undefined) productData.linkedSetId = null;
      const parsed = productUpdateSchema.safeParse(productData);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });

      // Video URL harici bir link ise otomatik indir, yerel yola dönüştür
      const dataToSave = { ...parsed.data } as Record<string, unknown>;
      const rawVideoUrl = dataToSave.videoUrl as string | undefined | null;
      if (rawVideoUrl && (rawVideoUrl.startsWith("http://") || rawVideoUrl.startsWith("https://"))) {
        try {
          const localPath = await downloadVideo(rawVideoUrl);
          if (localPath) {
            dataToSave.videoUrl = localPath;
            console.log(`[admin] Video indirildi: ${rawVideoUrl} → ${localPath}`);
          }
        } catch (err) {
          console.warn(`[admin] Video indirilemedi, CDN URL kaydediliyor: ${err}`);
          // İndirme başarısız olursa CDN URL'si ile devam et
        }
      }

      console.log('Updating product:', req.params.id, 'with data:', JSON.stringify(dataToSave, null, 2));
      const product = await storage.updateProduct(req.params.id, dataToSave as any);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      // Auto-create a default variant if no variants exist yet
      const existingVariants = await storage.getProductVariants(product.id);
      const baseSku = product.sku || '';
      if (existingVariants.length === 0) {
        // Hiç varyant yoksa default tek varyant oluştur (stok yönetimi için)
        await storage.createProductVariant({
          productId: product.id,
          size: null,
          color: null,
          sku: baseSku || null,
          stock: 0,
          price: product.basePrice,
        });
      }

      // Update product categories (multi-category support)
      if (categoryIds && Array.isArray(categoryIds)) {
        await storage.setProductCategories(product.id, categoryIds);
      }
      
      console.log('Updated product result:', JSON.stringify(product, null, 2));
      
      // Return product with categoryIds
      const productCategoryIds = await storage.getProductCategoryIds(product.id);
      res.json({ ...product, categoryIds: productCategoryIds });
    } catch (error) {
      console.error('Product update error:', error);
      res.status(400).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Products] Delete product error:', error.message || error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Bulk price update by category
  app.post("/api/admin/products/bulk-price", requireAdmin, async (req, res) => {
    try {
      const parsed = bulkPriceSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const { categoryId, productIds, action, value: numericValue, autoBadge, badgeText } = parsed.data;

      const { products: allProducts } = await storage.getProducts();

      let targetProducts;
      if (productIds && Array.isArray(productIds) && productIds.length > 0) {
        // Specific product IDs selected
        const idSet = new Set(productIds);
        targetProducts = allProducts.filter(p => idSet.has(p.id));
      } else if (categoryId) {
        // Category filter
        targetProducts = allProducts.filter(p => p.categoryId === categoryId);
      } else {
        // All products
        targetProducts = allProducts;
      }
      
      if (targetProducts.length === 0) {
        return res.status(400).json({ error: "Ürün bulunamadı" });
      }
      
      let updated = 0;
      
      for (const product of targetProducts) {
        const currentPrice = parseFloat(product.basePrice);
        if (isNaN(currentPrice)) continue;

        let newPrice: number;
        
        switch (action) {
          case 'set':
            newPrice = numericValue;
            break;
          case 'increase':
            newPrice = currentPrice + numericValue;
            break;
          case 'decrease':
            newPrice = Math.max(0, currentPrice - numericValue);
            break;
          case 'percent_increase':
            newPrice = currentPrice * (1 + numericValue / 100);
            break;
          case 'percent_decrease':
            newPrice = currentPrice * (1 - numericValue / 100);
            break;
          default:
            continue;
        }
        
        // Round to 2 decimal places
        newPrice = Math.round(newPrice * 100) / 100;
        
        const updateData: any = { basePrice: String(newPrice) };
        if (autoBadge && badgeText) {
          updateData.discountBadge = badgeText;
        }
        await storage.updateProduct(product.id, updateData);
        updated++;
      }
      
      res.json({ success: true, updated });
    } catch (error) {
      console.error('Bulk price update error:', error);
      res.status(500).json({ error: "Toplu fiyat güncellemesi başarısız" });
    }
  });

  app.post("/api/admin/products/bulk-badge", requireAdmin, async (req, res) => {
    try {
      const parsed = bulkBadgeSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const { productIds, badge } = parsed.data;
      
      let updated = 0;
      for (const id of productIds) {
        await storage.updateProduct(id, { discountBadge: badge || null });
        updated++;
      }
      
      res.json({ success: true, updated });
    } catch (error) {
      console.error('Bulk badge update error:', error);
      res.status(500).json({ error: "Toplu etiket güncellemesi başarısız" });
    }
  });

  // Delete all products (for WooCommerce re-import)
  app.delete("/api/admin/products-all", requireAdmin, async (req, res) => {
    try {
      const result = await storage.deleteAllProducts();
      
      // Delete image files
      for (const imagePath of result.imagePaths) {
        try {
          const fullPath = path.join(process.cwd(), 'client/public', imagePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (fileError) {
          console.error(`Failed to delete image: ${imagePath}`, fileError);
        }
      }
      
      res.json({ 
        success: true, 
        deletedProducts: result.deletedProducts,
        deletedVariants: result.deletedVariants,
        deletedImages: result.imagePaths.length
      });
    } catch (error: any) {
      console.error('Delete all products error:', error);
      res.status(500).json({ error: error.message || "Failed to delete products" });
    }
  });


  // Cart API
  app.get("/api/cart", async (req: Request, res) => {
    try {
      const cartToken = getOrCreateCartToken(req, res);
      const items = await storage.getCartItems(cartToken);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cart" });
    }
  });

  app.post("/api/cart", async (req: Request, res) => {
    try {
      const cartToken = getOrCreateCartToken(req, res);
      const parsedCart = cartAddSchema.safeParse(req.body);
      if (!parsedCart.success) return res.status(400).json({ error: firstZodMessage(parsedCart.error) });
      const { cardListingId, productId, variantId: rawVariantId, quantity } = parsedCart.data;

      // ── Card-listing path (TCG primary) ──────────────────────────────────
      if (cardListingId) {
        const listing = await storage.getCardListing(cardListingId);
        if (!listing || !listing.isActive) {
          return res.status(400).json({ error: "Geçersiz kart listesi" });
        }
        if ((listing.stock ?? 0) < quantity) {
          return res.status(400).json({ error: "Yeterli stok yok" });
        }
        const existingItems = await storage.getCartItems(cartToken);
        const existingLine = existingItems.find((i: any) => i.cardListingId === cardListingId);
        if (existingLine) {
          await storage.updateCartItem(existingLine.id, existingLine.quantity + quantity);
        } else {
          await storage.addToCart({ sessionId: cartToken, cardListingId, productId: null, variantId: null, quantity } as any);
        }
        const updatedCart = await storage.getCartItems(cartToken);
        return res.json(updatedCart);
      }

      // ── Product/variant path (fallback) ──────────────────────────────────
      if (!productId) {
        return res.status(400).json({ error: "cardListingId veya productId zorunludur" });
      }

      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(400).json({ error: "Geçersiz ürün" });
      }

      // Existing cart
      const existingCart = await storage.getCartItems(cartToken);

      let variantId: string | null = rawVariantId ?? null;
      let resolvedVariant = variantId ? await storage.getProductVariant(variantId) : null;

      if (variantId && !resolvedVariant) {
        return res.status(400).json({ error: "Geçersiz varyant seçimi" });
      }
      if (resolvedVariant && resolvedVariant.productId !== productId) {
        return res.status(400).json({ error: "Geçersiz varyant" });
      }

      if (!resolvedVariant) {
        const variants = await storage.getProductVariants(productId);
        const candidate = variants.find(v => v.isActive && (v.stock ?? 0) > 0)
          ?? variants.find(v => (v.stock ?? 0) > 0);
        if (candidate) {
          resolvedVariant = candidate;
          variantId = candidate.id;
        }
      }

      // Stok kontrolü: hem variant hem toplam ürün bazlı.
      if (resolvedVariant && (resolvedVariant.stock ?? 0) <= 0) {
        return res.status(400).json({ error: "Ürün stokta yok" });
      }
      if (!resolvedVariant) {
        // Hiç variant yoksa ürün public'te de gösterilmemeli; güvenlik için engelle.
        return res.status(400).json({ error: "Ürün stokta yok" });
      }

      const validated = insertCartItemSchema.parse({
        productId,
        variantId,
        quantity: quantity || 1,
        sessionId: cartToken,
        itemType: "retail",
      });
      const item = await storage.addToCart(validated);
      res.status(201).json(item);
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(400).json({ error: "Sepete eklenemedi" });
    }
  });

  app.patch("/api/cart/:id", async (req, res) => {
    try {
      const parsed = cartUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const { quantity } = parsed.data;
      const item = await storage.updateCartItem(req.params.id, quantity);
      if (!item) {
        return res.status(404).json({ error: "Cart item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Failed to update cart item" });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    try {
      await storage.removeFromCart(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove from cart" });
    }
  });

  app.delete("/api/cart", async (req: Request, res) => {
    try {
      const cartToken = getOrCreateCartToken(req, res);
      await storage.clearCart(cartToken);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear cart" });
    }
  });

  // Favorites API
  app.get("/api/favorites", async (req: Request, res) => {
    try {
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId : null;
      if (!userId) {
        return res.status(401).json({ error: "Please login to view favorites" });
      }
      const favoriteProducts = await storage.getFavoriteProducts(userId);
      res.json(favoriteProducts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch favorites" });
    }
  });

  app.get("/api/favorites/ids", async (req: Request, res) => {
    try {
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId : null;
      if (!userId) {
        return res.json([]);
      }
      const ids = await storage.getUserFavoriteProductIds(userId);
      res.json(ids);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch favorite ids" });
    }
  });

  app.get("/api/favorites/:productId/check", async (req: Request, res) => {
    try {
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId : null;
      if (!userId) {
        return res.json({ isFavorite: false });
      }
      const isFavorite = await storage.isFavorite(userId, req.params.productId);
      res.json({ isFavorite });
    } catch (error) {
      res.status(500).json({ error: "Failed to check favorite status" });
    }
  });

  app.post("/api/favorites/:productId", async (req: Request, res) => {
    try {
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId : null;
      if (!userId) {
        return res.status(401).json({ error: "Please login to add favorites" });
      }
      const favorite = await storage.addFavorite({ userId, productId: req.params.productId });
      res.status(201).json(favorite);
    } catch (error) {
      res.status(500).json({ error: "Failed to add favorite" });
    }
  });

  app.delete("/api/favorites/:productId", async (req: Request, res) => {
    try {
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId : null;
      if (!userId) {
        return res.status(401).json({ error: "Please login to remove favorites" });
      }
      await storage.removeFavorite(userId, req.params.productId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove favorite" });
    }
  });

  // Reviews API
  app.get("/api/config/captcha", async (_req, res) => {
    try {
      const fromDb = (await storage.getSiteSetting('turnstile_site_key')) || '';
      const siteKey = fromDb.trim() || process.env.TURNSTILE_SITE_KEY || '';
      res.json({ provider: 'turnstile', siteKey });
    } catch (err) {
      console.error('[Captcha] config lookup failed:', err);
      res.json({ provider: 'turnstile', siteKey: process.env.TURNSTILE_SITE_KEY || '' });
    }
  });

  app.get("/api/products/:productId/reviews", async (req, res) => {
    try {
      const reviews = await storage.getProductReviews(req.params.productId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.get("/api/products/:productId/rating", async (req, res) => {
    try {
      const rating = await storage.getProductAverageRating(req.params.productId);
      res.json(rating);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rating" });
    }
  });

  app.post("/api/products/:productId/reviews", async (req: Request, res) => {
    try {
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId : null;

      const parsedReview = productReviewSchema.safeParse(req.body);
      if (!parsedReview.success) return res.status(400).json({ error: firstZodMessage(parsedReview.error) });
      const { rating, title, content, guestName, guestEmail, captchaToken } = parsedReview.data;

      const cleanTitle = typeof title === 'string' ? title.trim().slice(0, 200) : '';
      const cleanContent = typeof content === 'string' ? content.trim().slice(0, 4000) : '';

      // Ürün gerçekten var mı?
      const product = await storage.getProduct(req.params.productId);
      if (!product) {
        return res.status(404).json({ error: "Ürün bulunamadı." });
      }

      if (userId) {
        // Üye yorumu — captcha bypass, çift yorum kontrolü
        const existingReview = await storage.getUserReview(userId, req.params.productId);
        if (existingReview) {
          return res.status(400).json({ error: "Bu ürün için zaten bir değerlendirme yazdınız." });
        }

        const review = await storage.createReview({
          productId: req.params.productId,
          userId,
          guestName: null,
          guestEmail: null,
          rating,
          title: cleanTitle || null,
          content: cleanContent || null,
        });

        // Bildirim — admin'e yeni yorum bekliyor
        const user = await storage.getUser(userId);
        const author = user
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
          : 'Üye';
        notifyAdminNewReview({
          productName: product.name,
          productSlug: product.slug,
          authorName: author,
          authorEmail: user?.email || null,
          rating,
          title: cleanTitle || null,
          content: cleanContent || null,
          isGuest: false,
        }).catch(err => console.error('[Reviews] notify admin failed:', err));

        return res.status(201).json({
          ...review,
          message: "Yorumunuz alındı, onay sonrası ürün sayfasında görünecektir.",
        });
      }

      // Misafir yorumu — captcha + form alan zorunluluğu
      const trimmedName = typeof guestName === 'string' ? guestName.trim().slice(0, 100) : '';
      const trimmedEmail = typeof guestEmail === 'string' ? guestEmail.trim().toLowerCase().slice(0, 200) : '';

      if (!trimmedName || trimmedName.length < 2) {
        return res.status(400).json({ error: "Lütfen adınızı yazın." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return res.status(400).json({ error: "Lütfen geçerli bir e-posta adresi girin." });
      }

      const captcha = await verifyTurnstile(captchaToken, getClientIp(req));
      if (!captcha.success) {
        return res.status(400).json({
          error: captcha.error || "Captcha doğrulaması başarısız. Lütfen tekrar deneyin.",
        });
      }

      // 24 saat içinde aynı e-postadan aynı ürüne tekrar
      const recent = await storage.getRecentGuestReview(
        trimmedEmail,
        req.params.productId,
        24 * 60 * 60 * 1000,
      );
      if (recent) {
        return res.status(400).json({
          error: "Bu ürün için son 24 saat içinde zaten bir değerlendirme gönderdiniz. Onay sürecini bekleyin.",
        });
      }

      const review = await storage.createReview({
        productId: req.params.productId,
        userId: null,
        guestName: trimmedName,
        guestEmail: trimmedEmail,
        rating,
        title: cleanTitle || null,
        content: cleanContent || null,
      });

      // Bildirim — admin'e yeni misafir yorumu bekliyor
      notifyAdminNewReview({
        productName: product.name,
        productSlug: product.slug,
        authorName: trimmedName,
        authorEmail: trimmedEmail,
        rating,
        title: cleanTitle || null,
        content: cleanContent || null,
        isGuest: true,
      }).catch(err => console.error('[Reviews] notify admin failed:', err));

      return res.status(201).json({
        ...review,
        message: "Yorumunuz alındı, onay sonrası ürün sayfasında görünecektir.",
      });
    } catch (error) {
      console.error('[Reviews] create error:', error);
      res.status(500).json({ error: "Yorum gönderilemedi. Lütfen tekrar deneyin." });
    }
  });

  // ─── Admin Reviews ──────────────────────────────────────────────────────
  app.get("/api/admin/reviews", requireAdmin, async (req, res) => {
    try {
      const status = (req.query.status as string) || 'pending';
      const filter = ['pending', 'approved', 'rejected', 'all'].includes(status)
        ? (status as 'pending' | 'approved' | 'rejected' | 'all')
        : 'pending';
      const reviews = await storage.getAdminReviews(filter);
      res.json(reviews);
    } catch (error) {
      console.error('[Admin Reviews] list error:', error);
      res.status(500).json({ error: "Yorumlar getirilemedi" });
    }
  });

  app.get("/api/admin/reviews/pending-count", requireAdmin, async (_req, res) => {
    try {
      const count = await storage.getPendingReviewsCount();
      res.json({ count });
    } catch (error) {
      console.error('[Admin Reviews] pending count error:', error);
      res.json({ count: 0 });
    }
  });

  app.post("/api/admin/reviews/:id/approve", requireAdmin, async (req, res) => {
    try {
      const adminId = getAdminId(req);
      const review = await storage.getReviewById(req.params.id);
      if (!review) return res.status(404).json({ error: "Yorum bulunamadı" });

      const updated = await storage.approveReview(req.params.id, adminId);

      // Misafir e-postası varsa bilgilendir
      if (review.guestEmail) {
        try {
          const product = await storage.getProduct(review.productId);
          if (product) {
            sendGuestReviewApprovedEmail({
              to: review.guestEmail,
              guestName: review.guestName || 'Değerli müşterimiz',
              productName: product.name,
              productSlug: product.slug,
              rating: review.rating,
            }).catch(err => console.error('[Reviews] approval email failed:', err));
          }
        } catch (err) {
          console.error('[Reviews] product lookup for approval email failed:', err);
        }
      }

      res.json(updated);
    } catch (error) {
      console.error('[Admin Reviews] approve error:', error);
      res.status(500).json({ error: "Yorum onaylanamadı" });
    }
  });

  app.post("/api/admin/reviews/:id/reject", requireAdmin, async (req, res) => {
    try {
      const parsedReject = reviewRejectSchema.safeParse(req.body);
      if (!parsedReject.success) return res.status(400).json({ error: firstZodMessage(parsedReject.error) });
      const adminId = getAdminId(req);
      const reason = parsedReject.data.reason.trim();
      const review = await storage.getReviewById(req.params.id);
      if (!review) return res.status(404).json({ error: "Yorum bulunamadı" });

      const updated = await storage.rejectReview(req.params.id, reason, adminId);

      if (review.guestEmail && review.guestName) {
        const product = await storage.getProduct(review.productId);
        if (product) {
          sendGuestReviewRejectedEmail({
            to: review.guestEmail,
            guestName: review.guestName,
            productName: product.name,
            reason,
          }).catch(err => console.error('[Admin Reviews] guest reject email failed:', err));
        }
      }

      res.json(updated);
    } catch (error) {
      console.error('[Admin Reviews] reject error:', error);
      res.status(500).json({ error: "Yorum reddedilemedi" });
    }
  });

  app.delete("/api/admin/reviews/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteReview(req.params.id);
      res.json({ ok: true });
    } catch (error) {
      console.error('[Admin Reviews] delete error:', error);
      res.status(500).json({ error: "Yorum silinemedi" });
    }
  });

  app.get("/api/products/:productId/my-review", async (req: Request, res) => {
    try {
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId : null;
      if (!userId) {
        return res.json(null);
      }
      const review = await storage.getUserReview(userId, req.params.productId);
      res.json(review || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch review" });
    }
  });

  // iyzico Payment API
  app.post("/api/payment/create", async (req: Request, res) => {
    try {
      const cartToken = getOrCreateCartToken(req, res);
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId ?? null : null;
      const cartItems = await storage.getCartItems(cartToken);
      
      if (cartItems.length === 0) {
        return res.status(400).json({ error: "Sepet boş" });
      }

      const parsedPayment = paymentCreateSchema.safeParse(req.body);
      if (!parsedPayment.success) return res.status(400).json({ error: firstZodMessage(parsedPayment.error) });
      const { customerName, customerEmail, customerPhone, address, city, district, postalCode, country, couponCode, createAccount, accountPassword } = parsedPayment.data;
      const selectedCountry = country || 'Türkiye';

      // Validate password if creating account
      let accountPasswordHash = null;
      if (createAccount && accountPassword) {
        if (accountPassword.length < 6) {
          return res.status(400).json({ error: "Şifre en az 6 karakter olmalı" });
        }
        // Check if email already exists
        const existingUser = await storage.getUserByEmail(customerEmail);
        if (existingUser) {
          return res.status(400).json({ error: "Bu e-posta adresi zaten kayıtlı. Giriş yaparak devam edebilirsiniz." });
        }
        accountPasswordHash = await bcrypt.hash(accountPassword, 10);
      }

      // Calculate actual subtotal from cart items (server-side verification).
      // Wholesale "seri" rows explode into per-size lines here; retail rows pass through 1:1.
      const expanded = await expandCartLinesToOrderItems(cartItems);
      if (expanded.error) {
        return res.status(400).json({ error: expanded.error });
      }

      const serverSubtotal = expanded.subtotal;
      const cartItemsForStorage = expanded.lines;

      // iyzico basket: one row per unit so sum(basketItems.price) === price
      const iyzicoBasketItems: IyzicoBasketItem[] = [];
      for (const line of cartItemsForStorage) {
        const linePrice = parseFloat(line.price);
        for (let qi = 0; qi < line.quantity; qi++) {
          iyzicoBasketItems.push({
            id: `${line.productId}-${line.variantId || 'base'}-${qi}`,
            name: line.productName.substring(0, 250),
            category1: 'Giyim',
            category2: 'Moda',
            itemType: 'PHYSICAL',
            price: linePrice.toFixed(2),
          });
        }
      }

      // Handle coupon validation
      let validatedCoupon = null;
      let discountAmount = 0;
      let couponFreeShipping = false;
      
      if (couponCode) {
        const couponResult = await storage.validateCoupon(couponCode, serverSubtotal, userId || undefined);
        if (couponResult.valid && couponResult.coupon) {
          validatedCoupon = couponResult.coupon;
          couponFreeShipping = validatedCoupon.freeShipping || false;
          if (validatedCoupon.discountType === 'percentage') {
            discountAmount = (serverSubtotal * parseFloat(validatedCoupon.discountValue)) / 100;
          } else {
            discountAmount = parseFloat(validatedCoupon.discountValue);
          }
          if (validatedCoupon.maxDiscountAmount) {
            discountAmount = Math.min(discountAmount, parseFloat(validatedCoupon.maxDiscountAmount));
          }
          discountAmount = Math.min(discountAmount, serverSubtotal);
        }
      }

      // Calculate shipping and total
      const freeShipSetting1 = await storage.getSiteSetting('free_shipping_threshold');
      const FREE_SHIPPING_THRESHOLD = freeShipSetting1 ? parseFloat(freeShipSetting1) : 500;
      const DOMESTIC_SHIPPING_COST = 200;
      const INTERNATIONAL_SHIPPING_COST = 2500;
      const IRAQ_SHIPPING_COST = 5700;
      
      const isDomestic = selectedCountry === 'Türkiye';
      const isIraq = selectedCountry === 'Irak';
      let shippingCost = isDomestic 
        ? (serverSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DOMESTIC_SHIPPING_COST)
        : isIraq ? IRAQ_SHIPPING_COST : INTERNATIONAL_SHIPPING_COST;
      
      if (couponFreeShipping) {
        shippingCost = 0;
      }

      if (validatedCoupon?.appliesToShipping && shippingCost > 0) {
        const totalWithShipping = serverSubtotal + shippingCost;
        if (validatedCoupon.discountType === 'percentage') {
          discountAmount = (totalWithShipping * parseFloat(validatedCoupon.discountValue)) / 100;
        } else {
          discountAmount = parseFloat(validatedCoupon.discountValue);
        }
        if (validatedCoupon.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, parseFloat(validatedCoupon.maxDiscountAmount));
        }
        discountAmount = Math.min(discountAmount, totalWithShipping);
      }

      const serverTotal = Math.max(0, serverSubtotal - discountAmount + shippingCost);

      // Generate unique merchant order ID
      const merchantOid = `PLN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Get user IP
      const userIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 
                     req.socket.remoteAddress || 
                     '127.0.0.1';

      // Get base URL for callback - use production domain in prod
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? (process.env.PUBLIC_BASE_URL || 'https://gocards.toov.com.tr')
        : `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host || 'localhost:5000'}`;

      // Add shipping as a basket line so sum(basketItems.price) === priceTry
      if (shippingCost > 0) {
        iyzicoBasketItems.push({
          id: `shipping-${merchantOid}`,
          name: 'Kargo',
          category1: 'Kargo',
          itemType: 'VIRTUAL',
          price: shippingCost.toFixed(2),
        });
      }

      // iyzico requires sum(basketItems.price) === price (pre-discount).
      // paidPrice is the actual amount charged. discount is implicit in (price - paidPrice).
      const priceTry = (serverSubtotal + shippingCost).toFixed(2);
      const paidPriceTry = serverTotal.toFixed(2);

      // Split customer name -> name/surname for iyzico
      const nameParts = customerName.trim().split(/\s+/);
      const firstName = nameParts[0] || customerName;
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;

      // Phone normalization: only auto-prefix +90 for Türkiye orders.
      // International phones are kept as-is (or just +-prefixed) so iyzico can validate them.
      let gsmNumber = customerPhone.trim();
      if (!gsmNumber.startsWith('+')) {
        if (selectedCountry === 'Türkiye') {
          gsmNumber = `+90${gsmNumber.replace(/^0/, '')}`;
        } else {
          gsmNumber = `+${gsmNumber.replace(/^0+/, '')}`;
        }
      }

      // Create pending payment record
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Expires in 1 hour

      await storage.createPendingPayment({
        merchantOid,
        sessionId: cartToken,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress: { address, city, district, postalCode: postalCode || '', country: selectedCountry },
        cartItems: cartItemsForStorage as any,
        subtotal: serverSubtotal.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        couponCode: validatedCoupon?.code || null,
        total: serverTotal.toFixed(2),
        status: 'pending',
        paymentToken: null,
        iyzicoPaymentId: null,
        createAccount: createAccount || false,
        accountPasswordHash: accountPasswordHash,
        clientIp: userIp,
        clientUserAgent: req.headers['user-agent'] || '',
        expiresAt,
      });

      if (!(await isIyzicoConfigured())) {
        await storage.deletePendingPayment(merchantOid);
        console.error('[iyzico] API anahtarları yapılandırılmamış. Admin Paneli → Ayarlar → iyzico bölümünden ekleyin.');
        return res.status(500).json({
          error: 'Ödeme sistemi henüz yapılandırılmadı. Lütfen daha sonra tekrar deneyin.',
        });
      }

      // Initialize iyzico Checkout Form
      const iyzicoResp = await createCheckoutFormInitialize({
        conversationId: merchantOid,
        price: priceTry,
        paidPrice: paidPriceTry,
        currency: 'TRY',
        basketId: merchantOid,
        callbackUrl: `${baseUrl}/api/payment/iyzico/callback`,
        enabledInstallments: [1],
        buyer: {
          id: cartToken.substring(0, 64),
          name: firstName,
          surname: lastName,
          gsmNumber,
          email: customerEmail,
          identityNumber: '11111111111',
          registrationAddress: `${address}, ${district}, ${city}`,
          city: city,
          country: selectedCountry,
          ip: userIp,
          zipCode: postalCode || undefined,
        },
        shippingAddress: {
          contactName: customerName,
          city: city,
          country: selectedCountry,
          address: `${address}, ${district}`,
          zipCode: postalCode || undefined,
        },
        billingAddress: {
          contactName: customerName,
          city: city,
          country: selectedCountry,
          address: `${address}, ${district}`,
          zipCode: postalCode || undefined,
        },
        basketItems: iyzicoBasketItems,
      });

      if (iyzicoResp.status === 'success' && iyzicoResp.token) {
        await storage.updatePendingPaymentToken(merchantOid, iyzicoResp.token);
        await storage.updatePendingPaymentStatus(merchantOid, 'token_received');

        res.json({
          success: true,
          token: iyzicoResp.token,
          merchantOid,
          checkoutFormContent: iyzicoResp.checkoutFormContent,
          paymentPageUrl: iyzicoResp.paymentPageUrl,
        });
      } else {
        await storage.deletePendingPayment(merchantOid);
        console.error('[iyzico] Checkout form init failed:', iyzicoResp.errorCode, iyzicoResp.errorMessage);
        res.status(400).json({
          error: iyzicoResp.errorMessage || 'Ödeme sistemi bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.',
        });
      }
    } catch (error) {
      console.error('[iyzico] Payment creation error:', error);
      res.status(500).json({ error: "Ödeme işlemi başlatılamadı" });
    }
  });

  // ── Havale (Bank Transfer) Ödeme ──────────────────────────────────────
  // Müşteri havale (EFT) seçtiğinde sepet doğrulanır, %10 indirim uygulanır,
  // sipariş 'pending' / 'awaiting_transfer' olarak oluşturulur. Stok düşmez,
  // iyzico'ya gidilmez. Admin onayında stok düşer, kupon redeem edilir,
  // standart sipariş onay e-posta + WhatsApp tetiklenir.
  app.post("/api/payment/bank-transfer", async (req: Request, res) => {
    try {
      const cartToken = getOrCreateCartToken(req, res);
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId ?? null : null;
      const cartItems = await storage.getCartItems(cartToken);

      if (cartItems.length === 0) {
        return res.status(400).json({ error: "Sepet boş" });
      }

      const parsedBT = bankTransferOrderSchema.safeParse(req.body);
      if (!parsedBT.success) return res.status(400).json({ error: firstZodMessage(parsedBT.error) });
      const { customerName, customerEmail, customerPhone, address, city, district, postalCode, country, couponCode, createAccount, accountPassword } = parsedBT.data;
      const selectedCountry = country || 'Türkiye';

      let accountPasswordHash: string | null = null;
      if (createAccount && accountPassword) {
        if (accountPassword.length < 6) {
          return res.status(400).json({ error: "Şifre en az 6 karakter olmalı" });
        }
        const existingUser = await storage.getUserByEmail(customerEmail);
        if (existingUser) {
          return res.status(400).json({ error: "Bu e-posta adresi zaten kayıtlı. Giriş yaparak devam edebilirsiniz." });
        }
        accountPasswordHash = await bcrypt.hash(accountPassword, 10);
      }

      // Server-side cart validation
      const expandedBT = await expandCartLinesToOrderItems(cartItems);
      if (expandedBT.error) {
        return res.status(400).json({ error: expandedBT.error });
      }
      const serverSubtotal = expandedBT.subtotal;
      const cartItemsForOrder = expandedBT.lines;

      // Coupon validation
      let validatedCoupon = null;
      let couponDiscount = 0;
      let couponFreeShipping = false;
      if (couponCode) {
        const couponResult = await storage.validateCoupon(couponCode, serverSubtotal, userId || undefined);
        if (couponResult.valid && couponResult.coupon) {
          validatedCoupon = couponResult.coupon;
          couponFreeShipping = validatedCoupon.freeShipping || false;
          if (validatedCoupon.discountType === 'percentage') {
            couponDiscount = (serverSubtotal * parseFloat(validatedCoupon.discountValue)) / 100;
          } else {
            couponDiscount = parseFloat(validatedCoupon.discountValue);
          }
          if (validatedCoupon.maxDiscountAmount) {
            couponDiscount = Math.min(couponDiscount, parseFloat(validatedCoupon.maxDiscountAmount));
          }
          couponDiscount = Math.min(couponDiscount, serverSubtotal);
        }
      }

      // Shipping
      const freeShipSetting2 = await storage.getSiteSetting('free_shipping_threshold');
      const FREE_SHIPPING_THRESHOLD = freeShipSetting2 ? parseFloat(freeShipSetting2) : 500;
      const DOMESTIC_SHIPPING_COST = 200;
      const INTERNATIONAL_SHIPPING_COST = 2500;
      const IRAQ_SHIPPING_COST = 5700;
      const isDomestic = selectedCountry === 'Türkiye';
      const isIraq = selectedCountry === 'Irak';
      let shippingCost = isDomestic
        ? (serverSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DOMESTIC_SHIPPING_COST)
        : isIraq ? IRAQ_SHIPPING_COST : INTERNATIONAL_SHIPPING_COST;
      if (couponFreeShipping) shippingCost = 0;

      // Bank transfer 10% discount applies to (subtotal - couponDiscount + shippingCost)
      // Bank-transfer 10% perk does not apply to wholesale orders.
      const baseAfterCoupon = Math.max(0, serverSubtotal - couponDiscount) + shippingCost;
      const bankTransferDiscount = Math.round(baseAfterCoupon * BANK_TRANSFER_DISCOUNT_RATE * 100) / 100;
      const totalDiscount = couponDiscount + bankTransferDiscount;
      const serverTotal = Math.max(0, serverSubtotal - totalDiscount + shippingCost);

      const orderNumber = `PLN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Optional account creation
      if (createAccount && accountPasswordHash) {
        try {
          const nameParts = customerName.trim().split(/\s+/);
          await storage.createUser({
            email: customerEmail,
            password: accountPasswordHash,
            firstName: nameParts[0] || customerName,
            lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '',
            phone: customerPhone,
          });
        } catch (err) {
          console.error('[bank-transfer] Account auto-create failed:', err);
        }
      }

      // Atomic: order row + items in one transaction (stock NOT reduced — confirmed by admin later)
      const order = await db.transaction(async (tx) => {
        const [newOrder] = await tx.insert(orders).values({
          orderNumber,
          customerName,
          customerEmail,
          customerPhone,
          shippingAddress: { address, city, district, postalCode: postalCode || '', country: selectedCountry },
          subtotal: serverSubtotal.toFixed(2),
          shippingCost: shippingCost.toFixed(2),
          discountAmount: totalDiscount.toFixed(2),
          couponCode: validatedCoupon?.code || null,
          total: serverTotal.toFixed(2),
          status: 'pending',
          paymentMethod: 'bank_transfer',
          paymentStatus: 'awaiting_transfer',
        }).returning();

        for (const item of cartItemsForOrder) {
          await tx.insert(orderItemsTable).values({
            orderId: newOrder.id,
            productId: item.productId,
            variantId: item.variantId,
            cardListingId: item.cardListingId,
            productName: item.productName,
            variantDetails: item.variantDetails,
            price: item.price,
            quantity: item.quantity,
            subtotal: (parseFloat(item.price) * item.quantity).toFixed(2),
          });
          // card_listings stock deferred — decremented only on admin confirmation (bank transfer)
          // This matches the variant stock pattern: create order first, reduce stock on confirm.
        }

        return newOrder;
      });

      // Clear cart so user doesn't accidentally re-checkout
      await storage.clearCart(cartToken);

      // Notifications (best-effort)
      const bankOrderItems = await storage.getOrderItems(order.id);
      sendBankTransferPendingEmail(order, bankOrderItems).catch(err => console.error('[Email] Bank transfer pending email failed:', err));
      sendAdminOrderNotificationEmail(order, bankOrderItems).catch(err => console.error('[Email] Admin notification (bank transfer) failed:', err));
      sendBankTransferPendingToCustomer(order).catch(err => console.error('[WhatsApp] Bank transfer pending (customer) failed:', err));
      sendBankTransferPendingToAdmin(order).catch(err => console.error('[WhatsApp] Bank transfer pending (admin) failed:', err));

      res.json({
        success: true,
        orderNumber: order.orderNumber,
        orderId: order.id,
        total: order.total,
        bankTransferDiscount: bankTransferDiscount.toFixed(2),
      });
    } catch (error) {
      console.error('[bank-transfer] Order creation error:', error);
      res.status(500).json({ error: "Sipariş oluşturulamadı" });
    }
  });


  // iyzico Callback - browser POSTs here after Checkout Form completes.
  // The legacy /api/payment/callback path is kept as an alias for older webhooks.
  const iyzicoCallbackHandler = async (req: Request, res: Response) => {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.PUBLIC_BASE_URL || 'https://gocards.toov.com.tr')
      : `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host || 'localhost:5000'}`;

    const sendRedirect = (path: string) => {
      const url = `${baseUrl}${path}`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(
        `<!DOCTYPE html><html><head><meta charset="utf-8">` +
        `<script>` +
        `try{if(window.top&&window.top!==window){window.top.location.href=${JSON.stringify(url)};}else{window.location.href=${JSON.stringify(url)};}}` +
        `catch(e){window.location.href=${JSON.stringify(url)};}` +
        `</script>` +
        `<noscript><meta http-equiv="refresh" content="0;url=${url}"></noscript>` +
        `</head><body></body></html>`
      );
    };

    // Track whether we hold the 'processing' claim so the catch block can
    // release it back to 'failed' on any unexpected error (no permanent locks).
    let claimedMerchantOid: string | null = null;
    let terminalized = false;

    try {
      const parsedCallback = iyzicoCallbackSchema.safeParse(req.body ?? {});
      const token = (parsedCallback.success ? parsedCallback.data.token : undefined) ?? '';
      console.log('[iyzico Callback] Received token:', token ? token.substring(0, 12) + '…' : '(none)');

      if (!token) {
        console.error('[iyzico Callback] Missing token in callback body');
        return sendRedirect('/odeme-basarisiz');
      }

      // Verify with iyzico
      const result = await retrieveCheckoutForm(token);
      const merchantOid = result.basketId || result.conversationId || '';
      console.log('[iyzico Callback] Retrieve result:', {
        status: result.status,
        paymentStatus: result.paymentStatus,
        merchantOid,
        paymentId: result.paymentId,
      });

      if (!merchantOid) {
        console.error('[iyzico Callback] No merchantOid in iyzico response');
        return sendRedirect('/odeme-basarisiz');
      }

      // Atomically claim this payment for processing. Only one concurrent caller wins.
      const pendingPayment = await storage.claimPendingPaymentForProcessing(merchantOid);
      if (pendingPayment) claimedMerchantOid = merchantOid;
      if (!pendingPayment) {
        // Either not found, already processed, or another worker is processing it.
        const existing = await storage.getPendingPaymentByMerchantOid(merchantOid);
        if (!existing) {
          console.error('[iyzico Callback] Pending payment not found:', merchantOid);
          return sendRedirect(`/odeme-basarisiz?oid=${merchantOid}`);
        }
        if (existing.status === 'completed') {
          return sendRedirect(`/odeme-basarili?oid=${merchantOid}`);
        }
        if (existing.status === 'failed') {
          return sendRedirect(`/odeme-basarisiz?oid=${merchantOid}`);
        }
        // 'processing' — another callback is in flight; SPA polling will pick up the final state.
        console.log('[iyzico Callback] Already processing, redirecting to status page:', merchantOid);
        return sendRedirect(`/odeme-basarili?oid=${merchantOid}`);
      }

      // Verify token belongs to this pending payment
      if (pendingPayment.paymentToken && pendingPayment.paymentToken !== token) {
        console.error('[iyzico Callback] Token mismatch for', merchantOid);
        await storage.updatePendingPaymentStatus(merchantOid, 'failed');
        terminalized = true;
        return sendRedirect(`/odeme-basarisiz?oid=${merchantOid}`);
      }

      const isPaid = result.status === 'success' && result.paymentStatus === 'SUCCESS';

      if (isPaid) {
        // Verify amount matches the pending total (within 1 kuruş)
        const expected = parseFloat(pendingPayment.total);
        const paid = result.paidPrice ?? 0;
        if (Math.abs(expected - paid) > 0.01) {
          console.error('[iyzico Callback] Amount mismatch', { expected, paid, merchantOid });
          await storage.updatePendingPaymentStatus(merchantOid, 'failed');
          terminalized = true;
          return sendRedirect(`/odeme-basarisiz?oid=${merchantOid}`);
        }

        if (result.paymentId) {
          await storage.setPendingPaymentIyzicoId(merchantOid, result.paymentId);
        }

        // Payment successful - create the actual order
        const orderNumber = merchantOid;

        // Pre-fetch variant stock data + coupon before transaction to minimise lock time
        type PendingItem = (typeof pendingPayment.cartItems)[number];
        type ItemWithVariant = { item: PendingItem; variantStock: number | null };
        const itemsWithVariants: ItemWithVariant[] = [];
        for (const item of pendingPayment.cartItems) {
          if (item.variantId) {
            const v = await storage.getProductVariant(item.variantId);
            itemsWithVariants.push({ item, variantStock: v ? v.stock : null });
          } else {
            itemsWithVariants.push({ item, variantStock: null });
          }
        }
        const iyzicoCoupon = pendingPayment.couponCode
          ? await storage.getCouponByCode(pendingPayment.couponCode)
          : null;

        // Atomic: order + items + stock + coupon — all succeed or all roll back.
        // Payment was already captured; if this transaction fails the order shows as
        // 'failed' and admins can reconcile via iyzico dashboard (logged below).
        const order = await db.transaction(async (tx) => {
          const [newOrder] = await tx.insert(orders).values({
            orderNumber,
            customerName: pendingPayment.customerName,
            customerEmail: pendingPayment.customerEmail,
            customerPhone: pendingPayment.customerPhone,
            shippingAddress: pendingPayment.shippingAddress,
            subtotal: pendingPayment.subtotal,
            shippingCost: pendingPayment.shippingCost,
            discountAmount: pendingPayment.discountAmount || '0',
            couponCode: pendingPayment.couponCode,
            total: pendingPayment.total,
            status: 'confirmed',
            paymentMethod: 'iyzico',
            paymentStatus: 'paid',
          }).returning();

          for (const { item, variantStock } of itemsWithVariants) {
            await tx.insert(orderItemsTable).values({
              orderId: newOrder.id,
              productId: item.productId,
              variantId: item.variantId,
              cardListingId: item.cardListingId ?? null,
              productName: item.productName,
              variantDetails: item.variantDetails,
              price: item.price,
              quantity: item.quantity,
              subtotal: (parseFloat(item.price) * item.quantity).toFixed(2),
            });

            // Decrement card listing stock for TCG items
            if (item.cardListingId) {
              await tx.update(cardListings)
                .set({ stock: sql`GREATEST(0, ${cardListings.stock} - ${item.quantity})` })
                .where(eq(cardListings.id, item.cardListingId));
            }

          }

          if (iyzicoCoupon) {
            await tx.insert(couponRedemptions).values({
              couponId: iyzicoCoupon.id,
              orderId: newOrder.id,
              userId: null,
              discountAmount: String(parseFloat(pendingPayment.discountAmount || '0')),
            });
            await tx.execute(sql`UPDATE coupons SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = ${iyzicoCoupon.id}`);

            if (iyzicoCoupon.isInfluencerCode) {
              let commission = 0;
              const orderTotal = parseFloat(pendingPayment.total);
              switch (iyzicoCoupon.commissionType) {
                case 'percentage': commission = (orderTotal * parseFloat(iyzicoCoupon.commissionValue || '0')) / 100; break;
                case 'per_use': commission = parseFloat(iyzicoCoupon.commissionValue || '0'); break;
              }
              if (commission > 0) {
                const currentCommission = parseFloat(iyzicoCoupon.totalCommissionEarned || '0');
                await tx.update(coupons).set({
                  totalCommissionEarned: (currentCommission + commission).toFixed(2),
                  updatedAt: new Date(),
                }).where(eq(coupons.id, iyzicoCoupon.id));
              }
            }
          }

          return newOrder;
        });

        // Clear cart (outside tx — non-critical)
        await storage.clearCart(pendingPayment.sessionId);

        // Update pending payment status
        await storage.updatePendingPaymentStatus(merchantOid, 'completed');
        terminalized = true;

        // Send confirmation emails
        const iyzicoOrderItems = await storage.getOrderItems(order.id);
        sendOrderConfirmationEmail(order, iyzicoOrderItems).catch(err => console.error('[Email] Order confirmation failed:', err));
        sendAdminOrderNotificationEmail(order, iyzicoOrderItems).catch(err => console.error('[Email] Admin notification failed:', err));

        // Send WhatsApp notifications (best-effort, never blocks order flow)
        sendOrderReceivedToCustomer(order).catch(err => console.error('[WhatsApp] Order received (customer) failed:', err));
        sendOrderReceivedToAdmin(order).catch(err => console.error('[WhatsApp] Order received (admin) failed:', err));

        // Fetch variant SKUs for invoice
        const variantSkus = new Map<string, string>();
        for (const item of iyzicoOrderItems) {
          if (item.variantId) {
            const variant = await storage.getProductVariant(item.variantId);
            if (variant?.sku) {
              variantSkus.set(item.variantId, variant.sku);
            }
          }
        }

        // Create user account if requested during checkout
        if (pendingPayment.createAccount && pendingPayment.accountPasswordHash) {
          try {
            // Check if user doesn't already exist
            const existingUser = await storage.getUserByEmail(pendingPayment.customerEmail);
            if (!existingUser) {
              // Parse name to firstName and lastName
              const nameParts = pendingPayment.customerName.trim().split(' ');
              const firstName = nameParts[0] || '';
              const lastName = nameParts.slice(1).join(' ') || '';
              
              const shippingAddr = pendingPayment.shippingAddress as {
                address: string;
                city: string;
                district: string;
                postalCode: string;
              };

              // Create the user
              const newUser = await storage.createUser({
                email: pendingPayment.customerEmail,
                password: pendingPayment.accountPasswordHash, // Already hashed
                firstName,
                lastName,
                phone: pendingPayment.customerPhone,
                address: shippingAddr.address,
                city: shippingAddr.city,
                district: shippingAddr.district,
                postalCode: shippingAddr.postalCode || null,
              });

              // Create saved address
              await storage.createUserAddress({
                userId: newUser.id,
                title: 'Teslimat Adresi',
                firstName,
                lastName,
                phone: pendingPayment.customerPhone,
                address: shippingAddr.address,
                city: shippingAddr.city,
                district: shippingAddr.district,
                postalCode: shippingAddr.postalCode || null,
                isDefault: true,
              });

              // Send welcome email
              sendWelcomeEmail(newUser).catch(err => console.error('[Email] Welcome email failed:', err));

              console.log('[iyzico Callback] User account created:', newUser.email);
            }
          } catch (userError) {
            console.error('[iyzico Callback] Failed to create user account:', userError);
            // Don't fail the order, just log the error
          }
        }

        console.log('[iyzico Callback] Order created successfully:', orderNumber);
        return sendRedirect(`/odeme-basarili?oid=${merchantOid}`);
      } else {
        // Payment failed
        await storage.updatePendingPaymentStatus(merchantOid, 'failed');
        terminalized = true;
        const reason = result.errorMessage || result.paymentStatus || 'Ödeme tamamlanamadı';
        console.log('[iyzico Callback] Payment failed:', merchantOid, reason);
        return sendRedirect(`/odeme-basarisiz?oid=${merchantOid}&reason=${encodeURIComponent(reason)}`);
      }
    } catch (error) {
      console.error('[iyzico Callback] Error:', error);
      // CRITICAL: if we claimed the row but didn't reach a terminal state,
      // release the claim back to 'failed' so the row never gets stuck in 'processing'.
      //
      // NOTE on reconciliation trade-off: a charge that succeeded on iyzico's side
      // but threw downstream (e.g. order creation crash) will be marked 'failed'
      // here. The customer is shown /odeme-basarisiz and we always log the
      // merchantOid + iyzico paymentId (when known) so admins can manually
      // reconcile via iyzico's dashboard. A dedicated `needs_reconciliation`
      // status is tracked as a future hardening follow-up.
      if (claimedMerchantOid && !terminalized) {
        try {
          await storage.updatePendingPaymentStatus(claimedMerchantOid, 'failed');
          console.error('[iyzico Callback] Released stranded claim → failed:', claimedMerchantOid);
        } catch (releaseErr) {
          console.error('[iyzico Callback] Failed to release stranded claim:', releaseErr);
        }
      }
      return sendRedirect(claimedMerchantOid ? `/odeme-basarisiz?oid=${claimedMerchantOid}` : '/odeme-basarisiz');
    }
  };

  // Primary iyzico callback path (used in createCheckoutFormInitialize.callbackUrl)
  app.post("/api/payment/iyzico/callback", iyzicoCallbackHandler);
  // Backwards-compatible alias for any legacy webhook configuration
  app.post("/api/payment/callback", iyzicoCallbackHandler);

  // ── Maintenance mode admin controls ────────────────────────────────────
  app.get("/api/admin/maintenance", requireAdmin, async (_req, res) => {
    try {
      const { getMaintenanceMode } = await import("./maintenance");
      const enabled = await getMaintenanceMode();
      res.json({ enabled });
    } catch (error) {
      console.error("[maintenance get] error:", error);
      res.status(500).json({ error: "Bakım modu durumu alınamadı" });
    }
  });

  app.post("/api/admin/maintenance", requireAdmin, async (req, res) => {
    try {
      const parsedMaint = maintenanceSchema.safeParse(req.body);
      if (!parsedMaint.success) return res.status(400).json({ error: firstZodMessage(parsedMaint.error) });
      const { enabled } = parsedMaint.data;
      const { setMaintenanceMode } = await import("./maintenance");
      await setMaintenanceMode(enabled);
      console.log("[maintenance] mode switched →", enabled ? "ON" : "OFF");
      res.json({ success: true, enabled });
    } catch (error) {
      console.error("[maintenance set] error:", error);
      res.status(500).json({ error: "Bakım modu değiştirilemedi" });
    }
  });

  // ── iyzico admin controls (production-only, DB-backed credentials) ─────
  // Mask helper: leaks only first 4 / last 4 characters of long secrets so
  // the admin can verify the saved key without exposing the raw value.
  const maskSecret = (raw: string): string => {
    if (!raw) return '';
    if (raw.length <= 8) return '••••••••';
    return `${raw.slice(0, 4)}••••${raw.slice(-4)}`;
  };

  app.get("/api/admin/iyzico/config", requireAdmin, async (_req, res) => {
    try {
      const apiKey = (await storage.getSiteSetting('iyzico_api_key')) || '';
      const secretKey = (await storage.getSiteSetting('iyzico_secret_key')) || '';
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://gocards.toov.com.tr';
      res.json({
        configured: Boolean(apiKey && secretKey),
        apiKeyMasked: maskSecret(apiKey),
        secretKeyMasked: maskSecret(secretKey),
        hasApiKey: Boolean(apiKey),
        hasSecretKey: Boolean(secretKey),
        callbackUrl: `${baseUrl}/api/payment/iyzico/callback`,
        baseUrl,
        mode: 'live' as const,
      });
    } catch (error) {
      console.error('[iyzico config] error:', error);
      res.status(500).json({ error: 'iyzico ayarları alınamadı' });
    }
  });

  app.post("/api/admin/iyzico/test", requireAdmin, async (_req, res) => {
    try {
      const result = await testIyzicoConnection();
      console.log('[iyzico] connection test:', {
        ok: result.ok,
        status: result.status,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        apiKeyLength: result.apiKeyLength,
        secretKeyLength: result.secretKeyLength,
      });
      res.json(result);
    } catch (error) {
      console.error('[iyzico test] error:', error);
      res.status(500).json({ error: 'Test çağrısı başarısız' });
    }
  });

  app.post("/api/admin/iyzico/credentials", requireAdmin, async (req, res) => {
    try {
      const parsed = iyzicoCredentialsSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const apiKey = parsed.data.apiKey.trim();
      const secretKey = parsed.data.secretKey.trim();
      await storage.setSiteSetting('iyzico_api_key', apiKey);
      await storage.setSiteSetting('iyzico_secret_key', secretKey);
      console.log('[iyzico] credentials updated via admin panel');
      res.json({ success: true });
    } catch (error) {
      console.error('[iyzico credentials] error:', error);
      res.status(500).json({ error: 'iyzico anahtarları kaydedilemedi' });
    }
  });

  // Check payment status
  app.get("/api/payment/status/:merchantOid", async (req: Request, res) => {
    try {
      const merchantOid = req.params.merchantOid;
      const pendingPayment = await storage.getPendingPaymentByMerchantOid(merchantOid);

      // No pendingPayment row → it might be a bank transfer order (havale flow
      // doesn't create pendingPayment records). Look up by order number.
      if (!pendingPayment) {
        const order = await storage.getOrderByNumber(merchantOid);
        if (!order) {
          return res.status(404).json({ error: "Ödeme bulunamadı" });
        }
        if (order.paymentMethod === 'bank_transfer') {
          const orderItems = await storage.getOrderItems(order.id);
          return res.json({
            status: order.paymentStatus === 'awaiting_transfer' ? 'awaiting_transfer' : 'completed',
            paymentMethod: 'bank_transfer',
            paymentStatus: order.paymentStatus,
            orderStatus: order.status,
            orderNumber: order.orderNumber,
            orderId: order.id,
            total: order.total,
            items: orderItems.map(item => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              price: item.price,
            })),
          });
        }
        return res.status(404).json({ error: "Ödeme bulunamadı" });
      }

      // If completed, get the order
      if (pendingPayment.status === 'completed') {
        const order = await storage.getOrderByNumber(pendingPayment.merchantOid);
        const orderItems = order ? await storage.getOrderItems(order.id) : [];
        return res.json({
          status: 'completed',
          orderNumber: order?.orderNumber,
          orderId: order?.id,
          total: order?.total,
          items: orderItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
          })),
        });
      }

      res.json({ status: pendingPayment.status });
    } catch (error) {
      res.status(500).json({ error: "Ödeme durumu alınamadı" });
    }
  });

  // Orders API
  app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      const items = await storage.getOrderItems(order.id);
      
      // Enrich items with SKU, product image and active product slug
      // (productSlug, ürün adına tıklanabilir link için kullanılır)
      const itemsWithDetails = await Promise.all(
        items.map(async (item) => {
          let sku = null;
          let productImage = null;
          let productSlug: string | null = null;

          if (item.variantId) {
            const variant = await storage.getProductVariant(item.variantId);
            sku = variant?.sku || null;
            if (variant?.productId) {
              const product = await storage.getProduct(variant.productId);
              productImage = product?.images?.[0] || null;
              productSlug = product?.slug || null;
              if (!sku) sku = product?.sku || null;
            }
          }
          if (item.productId && (!productImage || !productSlug)) {
            const product = await storage.getProduct(item.productId);
            if (!productImage) productImage = product?.images?.[0] || null;
            if (!productSlug) productSlug = product?.slug || null;
            if (!sku) sku = product?.sku || null;
          }
          return { ...item, sku, productImage, productSlug };
        })
      );
      
      res.json({ ...order, items: itemsWithDetails });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", async (req: Request, res) => {
    try {
      const cartToken = getOrCreateCartToken(req, res);
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId ?? null : null;
      const cartItems = await storage.getCartItems(cartToken);
      
      if (cartItems.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      // Generate order number
      const orderNumber = `HNK${Date.now()}`;
      
      // Calculate actual subtotal from cart items (server-side verification)
      let serverSubtotal = 0;
      for (const cartItem of cartItems) {
        const variant = cartItem.variantId 
          ? await storage.getProductVariant(cartItem.variantId)
          : null;
        // Use variant's productId if available to ensure consistency
        const actualProductId = variant?.productId || cartItem.productId;
        const product = await storage.getProduct(actualProductId);
        if (product) {
          const itemPrice = parseFloat(product.basePrice);
          serverSubtotal += itemPrice * cartItem.quantity;
        }
      }
      
      // Handle coupon validation and redemption - recalculate discount on server
      let validatedCoupon = null;
      let discountAmount = 0;
      
      if (req.body.couponCode) {
        const couponResult = await storage.validateCoupon(
          req.body.couponCode,
          serverSubtotal,
          userId || undefined
        );
        
        if (couponResult.valid && couponResult.coupon) {
          validatedCoupon = couponResult.coupon;
          
          // Recalculate discount on server to prevent tampering
          if (validatedCoupon.discountType === 'percentage') {
            discountAmount = (serverSubtotal * parseFloat(validatedCoupon.discountValue)) / 100;
          } else {
            discountAmount = parseFloat(validatedCoupon.discountValue);
          }
          // Clamp discount to subtotal
          discountAmount = Math.min(discountAmount, serverSubtotal);
        }
      }
      
      // Calculate shipping and total on server
      const freeShipSetting3 = await storage.getSiteSetting('free_shipping_threshold');
      const FREE_SHIPPING_THRESHOLD = freeShipSetting3 ? parseFloat(freeShipSetting3) : 500;
      const DOMESTIC_SHIPPING_COST = 200;
      const INTERNATIONAL_SHIPPING_COST = 2500;
      const IRAQ_SHIPPING_COST = 5700;
      
      const orderCountry = req.body.shippingAddress?.country || 'Türkiye';
      const isDomestic = orderCountry === 'Türkiye';
      const isIraq = orderCountry === 'Irak';
      const shippingCost = isDomestic 
        ? (serverSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DOMESTIC_SHIPPING_COST)
        : isIraq ? IRAQ_SHIPPING_COST : INTERNATIONAL_SHIPPING_COST;
      const serverTotal = Math.max(0, serverSubtotal - discountAmount + shippingCost);
      
      const validated = insertOrderSchema.parse({
        ...req.body,
        orderNumber,
        subtotal: serverSubtotal.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        couponCode: validatedCoupon?.code || null,
        discountAmount: discountAmount.toFixed(2),
        total: serverTotal.toFixed(2),
      });

      // Pre-fetch variant + product data before transaction to minimise lock time
      type CartItemWithData = {
        cartItem: typeof cartItems[number];
        variant: Awaited<ReturnType<typeof storage.getProductVariant>>;
        product: NonNullable<Awaited<ReturnType<typeof storage.getProduct>>>;
      };
      const cartItemsWithData: CartItemWithData[] = [];
      for (const cartItem of cartItems) {
        const variant = cartItem.variantId ? (await storage.getProductVariant(cartItem.variantId) ?? undefined) : undefined;
        const actualProductId = variant?.productId || cartItem.productId;
        const product = await storage.getProduct(actualProductId);
        if (product) cartItemsWithData.push({ cartItem, variant, product });
      }

      // Atomic: order + items + stock + coupon — all succeed or all roll back
      const order = await db.transaction(async (tx) => {
        const [newOrder] = await tx.insert(orders).values({
          ...validated,
          shippingAddress: validated.shippingAddress as { address: string; city: string; district: string; postalCode: string; country?: string },
        }).returning();

        for (const { cartItem, variant, product } of cartItemsWithData) {
          await tx.insert(orderItemsTable).values({
            orderId: newOrder.id,
            productId: product.id,
            variantId: variant?.id,
            productName: product.name,
            variantDetails: variant ? `${variant.size || ''} ${variant.color || ''}`.trim() : null,
            price: product.basePrice,
            quantity: cartItem.quantity,
            subtotal: (parseFloat(product.basePrice) * cartItem.quantity).toFixed(2),
          });

        }

        if (validatedCoupon) {
          await tx.insert(couponRedemptions).values({
            couponId: validatedCoupon.id,
            orderId: newOrder.id,
            userId,
            discountAmount: String(discountAmount),
          });
          await tx.execute(sql`UPDATE coupons SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = ${validatedCoupon.id}`);

          if (validatedCoupon.isInfluencerCode) {
            let commission = 0;
            switch (validatedCoupon.commissionType) {
              case 'percentage': commission = (serverTotal * parseFloat(validatedCoupon.commissionValue || '0')) / 100; break;
              case 'per_use': commission = parseFloat(validatedCoupon.commissionValue || '0'); break;
            }
            if (commission > 0) {
              const currentCommission = parseFloat(validatedCoupon.totalCommissionEarned || '0');
              await tx.update(coupons).set({
                totalCommissionEarned: (currentCommission + commission).toFixed(2),
                updatedAt: new Date(),
              }).where(eq(coupons.id, validatedCoupon.id));
            }
          }
        }

        return newOrder;
      });

      // Clear cart (outside tx — non-critical)
      await storage.clearCart(cartToken);
      
      // Get order items for email
      const orderItemsList = await storage.getOrderItems(order.id);
      
      // Send order confirmation emails (don't wait)
      sendOrderConfirmationEmail(order, orderItemsList).catch(err => console.error('[Email] Order confirmation failed:', err));
      sendAdminOrderNotificationEmail(order, orderItemsList).catch(err => console.error('[Email] Admin notification failed:', err));

      // Send WhatsApp notifications (best-effort, never blocks order flow)
      sendOrderReceivedToCustomer(order).catch(err => console.error('[WhatsApp] Order received (customer) failed:', err));
      sendOrderReceivedToAdmin(order).catch(err => console.error('[WhatsApp] Order received (admin) failed:', err));

      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: firstZodMessage(error) });
      }
      console.error('Order creation error:', error);
      res.status(500).json({ error: "Sipariş oluşturulamadı" });
    }
  });

  app.patch("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
    try {
      const parsed = orderStatusUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const { status, trackingNumber } = parsed.data;
      
      // If shipped status, update tracking info as well
      let updateData: any = { status };
      if (status === 'shipped' && trackingNumber) {
        const arasTrackingUrl = `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${trackingNumber}`;
        updateData = {
          ...updateData,
          trackingNumber,
          shippingCarrier: 'Aras Kargo',
          trackingUrl: arasTrackingUrl,
        };
      }

      // Stamp the timestamp for this status transition (only set if not already set)
      const now = new Date();
      const existingOrder = await storage.getOrder(req.params.id);
      if (existingOrder) {
        if (status === 'processing' && !existingOrder.processingAt) {
          updateData.processingAt = now;
        } else if (status === 'shipped' && !existingOrder.shippedAt) {
          updateData.shippedAt = now;
        } else if ((status === 'delivered' || status === 'completed') && !existingOrder.deliveredAt) {
          updateData.deliveredAt = now;
        } else if ((status === 'cancelled' || status === 'refunded') && !existingOrder.cancelledAt) {
          updateData.cancelledAt = now;
        }
      }

      const order = await storage.updateOrder(req.params.id, updateData);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Send status change emails
      if (status === 'processing') {
        sendPreparingNotificationEmail(order).catch(err => 
          console.error('[Email] Preparing notification failed:', err)
        );
      } else if (status === 'shipped') {
        sendShippingNotificationEmail(order).catch(err => 
          console.error('[Email] Shipping notification failed:', err)
        );
      }

      // Send WhatsApp status notifications (best-effort)
      if (status === 'processing') {
        sendOrderPreparingToCustomer(order).catch(err =>
          console.error('[WhatsApp] Preparing notification failed:', err)
        );
      } else if (status === 'shipped') {
        sendOrderShippedToCustomer(order).catch(err =>
          console.error('[WhatsApp] Shipping notification failed:', err)
        );
      } else if (status === 'delivered') {
        sendOrderDeliveredToCustomer(order).catch(err =>
          console.error('[WhatsApp] Delivered notification failed:', err)
        );
      } else if (status === 'cancelled' || status === 'refunded') {
        sendOrderCancelledToCustomer(order).catch(err =>
          console.error('[WhatsApp] Cancelled notification (customer) failed:', err)
        );
        sendOrderCancelledToAdmin(order).catch(err =>
          console.error('[WhatsApp] Cancelled notification (admin) failed:', err)
        );
      }

      res.json(order);
    } catch (error) {
      console.error('Order status update error:', error);
      res.status(400).json({ error: "Failed to update order status" });
    }
  });

  // Initialize first admin user if none exists
  app.post("/api/admin/init", async (req, res) => {
    try {
      const parsed = adminInitSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const { username, password } = parsed.data;
      
      // Check if any admin exists
      const existingAdmin = await storage.getAdminUserByUsername(username);
      if (existingAdmin) {
        return res.status(400).json({ error: "Admin user already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const admin = await storage.createAdminUser({
        username,
        password: hashedPassword,
      });

      res.status(201).json({ id: admin.id, username: admin.username });
    } catch (error) {
      res.status(500).json({ error: "Failed to create admin user" });
    }
  });

  // WooCommerce Integration API
  app.get("/api/admin/woocommerce/settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getWoocommerceSettings();
      if (settings) {
        // Mask the secret for security
        res.json({
          ...settings,
          consumerSecret: settings.consumerSecret ? '••••••••' : '',
        });
      } else {
        res.json(null);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch WooCommerce settings" });
    }
  });

  app.post("/api/admin/woocommerce/settings", requireAdmin, async (req, res) => {
    try {
      const parsed = woocommerceSettingsSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const { siteUrl, consumerKey, consumerSecret, isActive } = parsed.data;
      const settings = await storage.saveWoocommerceSettings({
        siteUrl,
        consumerKey,
        consumerSecret,
        isActive: isActive ?? true,
      });
      res.json({
        ...settings,
        consumerSecret: '••••••••',
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to save WooCommerce settings" });
    }
  });

  app.delete("/api/admin/woocommerce/settings", requireAdmin, async (req, res) => {
    try {
      await storage.deleteWoocommerceSettings();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete WooCommerce settings" });
    }
  });

  app.post("/api/admin/woocommerce/test", requireAdmin, async (req, res) => {
    try {
      const parsed = woocommerceTestSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const { siteUrl, consumerKey, consumerSecret } = parsed.data;
      
      // Test connection to WooCommerce API
      const url = new URL('/wp-json/wc/v3/products', siteUrl);
      url.searchParams.set('per_page', '1');
      
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(400).json({ 
          success: false, 
          error: `WooCommerce API hatası: ${response.status}`,
          details: errorText
        });
      }
      
      const products = await response.json();
      
      // Get total product count from headers
      const totalProducts = response.headers.get('X-WP-Total') || '0';
      const totalCategories = await fetch(new URL('/wp-json/wc/v3/products/categories?per_page=1', siteUrl).toString(), {
        headers: { 'Authorization': `Basic ${auth}` },
      }).then(r => r.headers.get('X-WP-Total') || '0').catch(() => '0');
      
      res.json({ 
        success: true, 
        productCount: parseInt(totalProducts),
        categoryCount: parseInt(totalCategories),
        message: 'Bağlantı başarılı!'
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Bağlantı hatası'
      });
    }
  });

  app.get("/api/admin/woocommerce/logs", requireAdmin, async (req, res) => {
    try {
      const logs = await storage.getWoocommerceSyncLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sync logs" });
    }
  });

  app.post("/api/admin/woocommerce/import", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getWoocommerceSettings();
      if (!settings) {
        return res.status(400).json({ error: "WooCommerce ayarları bulunamadı" });
      }

      // Create sync log
      const syncLog = await storage.createWoocommerceSyncLog('running');

      // Start import in background
      (async () => {
        let productsImported = 0;
        let categoriesImported = 0;
        let imagesDownloaded = 0;
        const errors: string[] = [];

        try {
          const auth = Buffer.from(`${settings.consumerKey}:${settings.consumerSecret}`).toString('base64');
          
          // Import categories first
          const categoriesUrl = new URL('/wp-json/wc/v3/products/categories', settings.siteUrl);
          categoriesUrl.searchParams.set('per_page', '100');
          
          const catResponse = await fetch(categoriesUrl.toString(), {
            headers: { 'Authorization': `Basic ${auth}` },
          });
          
          if (catResponse.ok) {
            const wooCategories = await catResponse.json();
            for (const wooCat of wooCategories) {
              try {
                const existingCat = await storage.getCategoryBySlugOrCreate(wooCat.slug);
                if (!existingCat) {
                  // Download and optimize category image if exists
                  let categoryImage = '';
                  if (wooCat.image?.src) {
                    try {
                      const imgRes = await fetch(wooCat.image.src);
                      if (imgRes.ok) {
                        const imgBuffer = await imgRes.arrayBuffer();
                        const fileName = `${wooCat.slug}-${Date.now()}`;
                        const tempFilePath = path.join(process.cwd(), 'client/public/uploads/categories', `${fileName}.tmp`);
                        const optimizedPath = await optimizeImageBuffer(
                          Buffer.from(imgBuffer),
                          tempFilePath
                        );
                        const relativePath = optimizedPath.replace(process.cwd() + '/client/public', '');
                        categoryImage = relativePath;
                        imagesDownloaded++;
                      }
                    } catch (imgError) {
                      errors.push(`Kategori resmi indirilemedi: ${wooCat.name}`);
                    }
                  }
                  
                  await storage.createCategory({
                    name: wooCat.name,
                    slug: wooCat.slug,
                    image: categoryImage,
                    displayOrder: wooCat.menu_order || 0,
                  });
                  categoriesImported++;
                }
              } catch (catError: any) {
                errors.push(`Kategori aktarılamadı: ${wooCat.name} - ${catError.message}`);
              }
            }
          }

          // Import products
          let page = 1;
          let hasMore = true;
          
          while (hasMore) {
            const productsUrl = new URL('/wp-json/wc/v3/products', settings.siteUrl);
            productsUrl.searchParams.set('per_page', '20');
            productsUrl.searchParams.set('page', page.toString());
            productsUrl.searchParams.set('status', 'publish');
            
            const prodResponse = await fetch(productsUrl.toString(), {
              headers: { 'Authorization': `Basic ${auth}` },
            });
            
            if (!prodResponse.ok) {
              errors.push(`Ürünler alınamadı (sayfa ${page})`);
              break;
            }
            
            const wooProducts = await prodResponse.json();
            
            if (wooProducts.length === 0) {
              hasMore = false;
              break;
            }
            
            for (const wooProd of wooProducts) {
              try {
                const existingProd = await storage.getProductBySlug(wooProd.slug);
                if (!existingProd) {
                  // Download and optimize product images
                  const productImages: string[] = [];
                  for (const img of (wooProd.images || [])) {
                    try {
                      const imgRes = await fetch(img.src);
                      if (imgRes.ok) {
                        const imgBuffer = await imgRes.arrayBuffer();
                        const fileName = `${wooProd.slug}-${Date.now()}-${productImages.length + 1}`;
                        const tempFilePath = path.join(process.cwd(), 'client/public/uploads/products', `${fileName}.tmp`);
                        const optimizedPath = await optimizeImageBuffer(
                          Buffer.from(imgBuffer),
                          tempFilePath
                        );
                        const relativePath = optimizedPath.replace(process.cwd() + '/client/public', '');
                        productImages.push(relativePath);
                        imagesDownloaded++;
                      }
                    } catch (imgError) {
                      errors.push(`Ürün resmi indirilemedi: ${wooProd.name}`);
                    }
                  }
                  
                  // Get category ID
                  let categoryId = null;
                  if (wooProd.categories && wooProd.categories.length > 0) {
                    const cat = await storage.getCategoryBySlugOrCreate(wooProd.categories[0].slug);
                    categoryId = cat?.id || null;
                  }
                  
                  // Extract sizes and colors from attributes (for variant creation)
                  const wooSizes: string[] = [];
                  const wooColors: { name: string; hex: string }[] = [];
                  
                  for (const attr of (wooProd.attributes || [])) {
                    if (attr.name.toLowerCase().includes('beden') || attr.name.toLowerCase().includes('size')) {
                      wooSizes.push(...(attr.options || []));
                    }
                    if (attr.name.toLowerCase().includes('renk') || attr.name.toLowerCase().includes('color')) {
                      for (const colorName of (attr.options || [])) {
                        wooColors.push({ name: colorName, hex: '#000000' });
                      }
                    }
                  }
                  
                  const newProduct = await storage.createProduct({
                    name: wooProd.name,
                    slug: wooProd.slug,
                    description: wooProd.description?.replace(/<[^>]*>/g, '') || '',
                    sku: wooProd.sku || null,
                    categoryId,
                    basePrice: wooProd.price || wooProd.regular_price || '0',
                    images: productImages,
                    isActive: wooProd.status === 'publish',
                    isFeatured: wooProd.featured || false,
                    isNew: false,
                  });
                  productsImported++;
                  
                  // Fetch and create variations for variable products
                  if (wooProd.type === 'variable' && newProduct) {
                    try {
                      const variationsUrl = new URL(`/wp-json/wc/v3/products/${wooProd.id}/variations`, settings.siteUrl);
                      variationsUrl.searchParams.set('per_page', '100');
                      
                      const varResponse = await fetch(variationsUrl.toString(), {
                        headers: { 'Authorization': `Basic ${auth}` },
                      });
                      
                      if (varResponse.ok) {
                        const wooVariations = await varResponse.json();
                        for (const wooVar of wooVariations) {
                          let size = '';
                          let color = '';
                          let colorHex = '#000000';
                          
                          for (const attr of (wooVar.attributes || [])) {
                            if (attr.name.toLowerCase().includes('beden') || attr.name.toLowerCase().includes('size')) {
                              size = attr.option || '';
                            }
                            if (attr.name.toLowerCase().includes('renk') || attr.name.toLowerCase().includes('color')) {
                              color = attr.option || '';
                            }
                          }
                          
                          await storage.createProductVariant({
                            productId: newProduct.id,
                            sku: wooVar.sku || null,
                            size: size || null,
                            color: color || null,
                            colorHex: colorHex,
                            price: wooVar.price || wooProd.price || '0',
                            stock: wooVar.stock_quantity || 0,
                            isActive: wooVar.status === 'publish',
                          });
                        }
                      }
                    } catch (varError: any) {
                      errors.push(`Varyasyonlar alınamadı: ${wooProd.name}`);
                    }
                  } else if (newProduct) {
                    // Simple product - create variants from extracted sizes/colors
                    if (wooSizes.length > 0 && wooColors.length > 0) {
                      for (const size of wooSizes) {
                        for (const colorObj of wooColors) {
                          await storage.createProductVariant({
                            productId: newProduct.id,
                            sku: wooProd.sku ? `${wooProd.sku}-${size}-${colorObj.name}` : null,
                            size,
                            color: colorObj.name,
                            colorHex: colorObj.hex,
                            price: wooProd.price || '0',
                            stock: wooProd.stock_quantity || 0,
                            isActive: true,
                          });
                        }
                      }
                    } else if (wooSizes.length > 0) {
                      for (const size of wooSizes) {
                        await storage.createProductVariant({
                          productId: newProduct.id,
                          sku: wooProd.sku ? `${wooProd.sku}-${size}` : null,
                          size,
                          color: null,
                          colorHex: null,
                          price: wooProd.price || '0',
                          stock: wooProd.stock_quantity || 0,
                          isActive: true,
                        });
                      }
                    } else if (wooColors.length > 0) {
                      for (const colorObj of wooColors) {
                        await storage.createProductVariant({
                          productId: newProduct.id,
                          sku: wooProd.sku ? `${wooProd.sku}-${colorObj.name}` : null,
                          size: null,
                          color: colorObj.name,
                          colorHex: colorObj.hex,
                          price: wooProd.price || '0',
                          stock: wooProd.stock_quantity || 0,
                          isActive: true,
                        });
                      }
                    } else {
                      // No size or color - create single variant
                      await storage.createProductVariant({
                        productId: newProduct.id,
                        sku: wooProd.sku || null,
                        size: null,
                        color: null,
                        colorHex: null,
                        price: wooProd.price || '0',
                        stock: wooProd.stock_quantity || 0,
                        isActive: true,
                      });
                    }
                  }
                }
              } catch (prodError: any) {
                errors.push(`Ürün aktarılamadı: ${wooProd.name} - ${prodError.message}`);
              }
            }
            
            page++;
            // Safety limit
            if (page > 50) break;
          }

          await storage.updateWoocommerceLastSync();
          await storage.updateWoocommerceSyncLog(syncLog.id, {
            status: 'completed',
            productsImported,
            categoriesImported,
            imagesDownloaded,
            errors,
            completedAt: new Date(),
          });
        } catch (syncError: any) {
          await storage.updateWoocommerceSyncLog(syncLog.id, {
            status: 'failed',
            productsImported,
            categoriesImported,
            imagesDownloaded,
            errors: [...errors, syncError.message],
            completedAt: new Date(),
          });
        }
      })();

      res.json({ success: true, logId: syncLog.id, message: 'İçe aktarma başlatıldı' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "İçe aktarma başlatılamadı" });
    }
  });

  // Analytics Routes
  app.get("/api/admin/analytics/sales", requireAdmin, async (req, res) => {
    try {
      const period = (req.query.period as 'day' | 'week' | 'month' | 'year') || 'month';
      const data = await storage.getSalesAnalytics(period);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales analytics" });
    }
  });

  app.get("/api/admin/analytics/best-sellers", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const data = await storage.getBestSellingProducts(limit);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch best sellers" });
    }
  });

  app.get("/api/admin/analytics/comparison", requireAdmin, async (req, res) => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const data = await storage.getPeriodComparison(thirtyDaysAgo, now, sixtyDaysAgo, thirtyDaysAgo);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comparison data" });
    }
  });

  app.get("/api/admin/analytics/kpi", requireAdmin, async (req, res) => {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const [thisMonth, lastMonth] = await Promise.all([
        storage.getRevenueByPeriod(thisMonthStart, now),
        storage.getRevenueByPeriod(lastMonthStart, lastMonthEnd),
      ]);

      const cancelledThisMonth = await db.execute(sql`
        SELECT COUNT(*) as count, COALESCE(SUM(CAST(total AS DECIMAL)), 0) as total
        FROM orders WHERE created_at >= ${thisMonthStart} AND status = 'cancelled'
      `);
      const cancelledRow = (cancelledThisMonth.rows || [])[0] as any;
      const cancelledCount = Number(cancelledRow?.count || 0);
      const cancelRate = thisMonth.orderCount > 0 ? (cancelledCount / thisMonth.orderCount) * 100 : 0;

      const newCustomersResult = await db.execute(sql`
        SELECT COUNT(DISTINCT customer_email) as count FROM orders
        WHERE created_at >= ${thisMonthStart}
        AND customer_email NOT IN (
          SELECT customer_email FROM orders WHERE created_at < ${thisMonthStart}
        )
      `);
      const newCustomers = Number(((newCustomersResult.rows || [])[0] as any)?.count || 0);

      const revenueChange = lastMonth.total > 0 ? ((thisMonth.total - lastMonth.total) / lastMonth.total) * 100 : 0;
      const ordersChange = lastMonth.orderCount > 0 ? ((thisMonth.orderCount - lastMonth.orderCount) / lastMonth.orderCount) * 100 : 0;
      const avgChange = lastMonth.averageOrderValue > 0 ? ((thisMonth.averageOrderValue - lastMonth.averageOrderValue) / lastMonth.averageOrderValue) * 100 : 0;

      res.json({
        thisMonth: {
          revenue: thisMonth.total,
          orders: thisMonth.orderCount,
          avgOrder: thisMonth.averageOrderValue,
          cancelRate,
          newCustomers,
        },
        lastMonth: {
          revenue: lastMonth.total,
          orders: lastMonth.orderCount,
          avgOrder: lastMonth.averageOrderValue,
        },
        changes: { revenue: revenueChange, orders: ordersChange, avgOrder: avgChange },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch KPI data" });
    }
  });

  app.get("/api/admin/analytics/status-breakdown", requireAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT status, COUNT(*) as count, COALESCE(SUM(CAST(total AS DECIMAL)), 0) as revenue
        FROM orders GROUP BY status ORDER BY count DESC
      `);
      res.json((result.rows || []).map((r: any) => ({
        status: r.status,
        count: Number(r.count),
        revenue: Number(r.revenue),
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch status breakdown" });
    }
  });

  app.get("/api/admin/analytics/country-breakdown", requireAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          shipping_address->>'country' as country,
          COUNT(*) as count,
          COALESCE(SUM(CAST(total AS DECIMAL)), 0) as revenue
        FROM orders
        WHERE status != 'cancelled'
        GROUP BY shipping_address->>'country'
        ORDER BY revenue DESC
        LIMIT 10
      `);
      res.json((result.rows || []).map((r: any) => ({
        country: r.country || 'Bilinmiyor',
        count: Number(r.count),
        revenue: Number(r.revenue),
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch country breakdown" });
    }
  });

  // Coupon Routes
  app.get("/api/admin/coupons", requireAdmin, async (req, res) => {
    try {
      const coupons = await storage.getCoupons();
      res.json(coupons);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch coupons" });
    }
  });

  app.get("/api/admin/coupons/:id", requireAdmin, async (req, res) => {
    try {
      const coupon = await storage.getCoupon(req.params.id);
      if (!coupon) return res.status(404).json({ error: "Coupon not found" });
      res.json(coupon);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch coupon" });
    }
  });

  app.post("/api/admin/coupons", requireAdmin, async (req, res) => {
    try {
      const parsed = couponWriteSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const data = { ...parsed.data };
      if (data.startsAt) data.startsAt = new Date(data.startsAt as string);
      else data.startsAt = null;
      if (data.expiresAt) data.expiresAt = new Date(data.expiresAt as string);
      else data.expiresAt = null;
      const coupon = await storage.createCoupon(data as any);
      res.status(201).json(coupon);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create coupon" });
    }
  });

  app.put("/api/admin/coupons/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = couponUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const data = { ...parsed.data };
      if (data.startsAt) data.startsAt = new Date(data.startsAt as string);
      else if (data.startsAt === '' || data.startsAt === null) data.startsAt = null;
      if (data.expiresAt) data.expiresAt = new Date(data.expiresAt as string);
      else if (data.expiresAt === '' || data.expiresAt === null) data.expiresAt = null;
      const coupon = await storage.updateCoupon(req.params.id, data as any);
      if (!coupon) return res.status(404).json({ error: "Coupon not found" });
      res.json(coupon);
    } catch (error) {
      res.status(500).json({ error: "Failed to update coupon" });
    }
  });

  app.delete("/api/admin/coupons/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCoupon(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete coupon" });
    }
  });

  app.get("/api/admin/coupons/by-code/:code", requireAdmin, async (req, res) => {
    try {
      const coupon = await storage.getCouponByCode(req.params.code);
      if (!coupon) return res.status(404).json({ error: "Coupon not found" });
      res.json(coupon);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch coupon" });
    }
  });

  // Public coupon validation
  app.post("/api/coupons/validate", couponLimiter, async (req: Request, res) => {
    try {
      const parsedCV = couponValidateSchema.safeParse(req.body);
      if (!parsedCV.success) return res.status(400).json({ error: firstZodMessage(parsedCV.error) });
      const { code, orderTotal } = parsedCV.data;
      const payload = await getAuthPayload(req, res);
      const userId = payload?.type === 'user' ? payload.userId ?? null : null;
      const result = await storage.validateCoupon(code.trim().toUpperCase(), orderTotal, userId || undefined);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to validate coupon" });
    }
  });

  // Stock Management Routes
  app.get("/api/admin/inventory", requireAdmin, async (req, res) => {
    try {
      const variants = await storage.getAllVariantsWithProducts();
      res.json(variants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  app.get("/api/admin/inventory/low-stock", requireAdmin, async (req, res) => {
    try {
      const threshold = parseInt(req.query.threshold as string) || 5;
      const variants = await storage.getLowStockVariants(threshold);
      res.json(variants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch low stock items" });
    }
  });

  app.post("/api/admin/inventory/bulk-update", requireAdmin, async (req, res) => {
    try {
      const parsed = inventoryBulkUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const { updates } = parsed.data;
      await storage.bulkUpdateStock(updates.map((u: any) => ({
        ...u,
        authorId: (req as any).adminId,
      })));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk update stock" });
    }
  });

  app.get("/api/admin/inventory/adjustments", requireAdmin, async (req, res) => {
    try {
      const variantId = req.query.variantId as string | undefined;
      const adjustments = await storage.getStockAdjustments(variantId);
      res.json(adjustments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stock adjustments" });
    }
  });

  // Data consistency check
  app.get("/api/admin/inventory/data-check", requireAdmin, async (req, res) => {
    try {
      const { products } = await storage.getProducts();
      const allVariants = await storage.getAllVariantsWithProducts();
      const orders = await storage.getOrders();
      
      const issues = {
        productsWithoutVariants: [] as { id: string; name: string; sku: string | null }[],
        productsWithMissingVariants: [] as { id: string; name: string; definedSizes: string[]; existingVariantSizes: string[] }[],
        ordersWithoutVariants: [] as { id: string; orderNumber: string; itemsWithoutVariant: { productName: string; variantDetails: string | null }[] }[],
      };

      // Check for products without any variants
      for (const product of products) {
        const productVariants = allVariants.filter(v => v.productId === product.id);
        
        if (productVariants.length === 0) {
          issues.productsWithoutVariants.push({
            id: product.id,
            name: product.name,
            sku: product.sku,
          });
        }
      }

      // Check for orders with items that have no variant
      for (const order of orders) {
        const orderItems = await storage.getOrderItems(order.id);
        const itemsWithoutVariant = orderItems.filter(item => !item.variantId);
        
        if (itemsWithoutVariant.length > 0) {
          issues.ordersWithoutVariants.push({
            id: order.id,
            orderNumber: order.orderNumber,
            itemsWithoutVariant: itemsWithoutVariant.map(item => ({
              productName: item.productName,
              variantDetails: item.variantDetails,
            })),
          });
        }
      }

      res.json({
        summary: {
          productsWithoutVariants: issues.productsWithoutVariants.length,
          productsWithMissingVariants: issues.productsWithMissingVariants.length,
          ordersWithoutVariants: issues.ordersWithoutVariants.length,
        },
        issues,
      });
    } catch (error) {
      console.error('Data check error:', error);
      res.status(500).json({ error: "Failed to check data consistency" });
    }
  });

  // Sync variants for a single product
  app.post("/api/admin/products/:id/sync-variants", requireAdmin, async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Ürün bulunamadı" });
      }

      const productVariants = await storage.getProductVariants(product.id);

      // If no variants exist, create a default one
      let createdCount = 0;
      if (productVariants.length === 0) {
        await storage.createProductVariant({
          productId: product.id,
          size: null,
          color: null,
          sku: product.sku || null,
          stock: 0,
          price: product.basePrice,
        });
        createdCount = 1;
      }

      const message = createdCount > 0 ? `${createdCount} varyant oluşturuldu` : 'Varyantlar zaten senkronize';
      res.json({ success: true, createdCount, deletedCount: 0, message });
    } catch (error) {
      console.error('Sync variants error:', error);
      res.status(500).json({ error: "Varyant senkronizasyonu başarısız" });
    }
  });

  // Fix missing variants - syncs variants with product's defined sizes
  app.post("/api/admin/inventory/fix-variants", requireAdmin, async (req, res) => {
    try {
      const { products } = await storage.getProducts();
      const allVariants = await storage.getAllVariantsWithProducts();
      
      let createdCount = 0;
      let deletedCount = 0;
      const createdVariants: { productName: string; size: string; sku: string | null }[] = [];
      const deletedVariants: { productName: string; size: string | null }[] = [];

      for (const product of products) {
        const productVariants = allVariants.filter(v => v.productId === product.id);
        // Ensure every product has at least one variant
        if (productVariants.length === 0) {
          await storage.createProductVariant({
            productId: product.id,
            size: null,
            color: null,
            sku: product.sku || null,
            stock: 0,
            price: product.basePrice,
          });
          createdCount++;
          createdVariants.push({ productName: product.name, size: 'default', sku: product.sku });
        }
      }

      let message = '';
      if (createdCount > 0 && deletedCount > 0) {
        message = `${createdCount} varyant oluşturuldu, ${deletedCount} varyant silindi`;
      } else if (createdCount > 0) {
        message = `${createdCount} eksik varyant oluşturuldu`;
      } else if (deletedCount > 0) {
        message = `${deletedCount} fazla varyant silindi`;
      } else {
        message = 'Tüm varyantlar senkronize, değişiklik yok';
      }

      res.json({
        success: true,
        createdCount,
        deletedCount,
        createdVariants,
        deletedVariants,
        message,
      });
    } catch (error) {
      console.error('Fix variants error:', error);
      res.status(500).json({ error: "Failed to fix missing variants" });
    }
  });

  // Order Management Routes (enhanced)
  app.get("/api/admin/orders/:id/notes", requireAdmin, async (req, res) => {
    try {
      const notes = await storage.getOrderNotes(req.params.id);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order notes" });
    }
  });

  app.post("/api/admin/orders/:id/notes", requireAdmin, async (req, res) => {
    try {
      const parsed = orderNoteSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const note = await storage.createOrderNote({
        orderId: req.params.id,
        authorId: (req as any).adminId,
        content: parsed.data.content,
        isPrivate: parsed.data.isInternal !== false,
      });
      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ error: "Failed to create order note" });
    }
  });

  // Aras Kargo label endpoint removed (not needed for TCG platform)
  app.get("/api/admin/orders/:id/aras-kargo/label", requireAdmin, (_req, res) => {
    res.status(410).json({ error: 'Bu endpoint kaldırıldı' });
  });
  app.put("/api/admin/orders/:id/tracking", requireAdmin, async (req, res) => {
    try {
      const parsed = orderTrackingSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const { trackingNumber, trackingUrl, shippingCarrier } = parsed.data;
      const order = await storage.updateOrderTracking(req.params.id, {
        trackingNumber,
        trackingUrl: trackingUrl || undefined,
        shippingCarrier,
      });
      if (!order) return res.status(404).json({ error: "Order not found" });

      if (trackingNumber && (order.status === 'shipped' || order.status === 'delivered')) {
        sendOrderShippedToCustomer(order).catch(err =>
          console.error('[WhatsApp] Shipping notification (tracking update) failed:', err)
        );
        sendShippingNotificationEmail(order).catch(err =>
          console.error('[Email] Shipping notification (tracking update) failed:', err)
        );
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update tracking" });
    }
  });

  app.put("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = orderUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const order = await storage.updateOrder(req.params.id, parsed.data);
      if (!order) return res.status(404).json({ error: "Order not found" });
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  // Order cancellation with stock restoration
  app.post("/api/admin/orders/:id/cancel", requireAdmin, async (req, res) => {
    try {
      const parsed = orderCancelSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });

      // Get order items to restore stock
      const orderItems = await storage.getOrderItems(order.id);
      
      // Restore stock for each variant
      for (const item of orderItems) {
        if (item.variantId) {
          const variant = await storage.getProductVariant(item.variantId);
          if (variant) {
            const newStock = variant.stock + item.quantity;
            await storage.updateProductVariant(variant.id, { stock: newStock });
            await storage.createStockAdjustment({
              variantId: variant.id,
              previousStock: variant.stock,
              newStock: newStock,
              adjustmentType: 'return',
              reason: `Sipariş iptali: ${order.orderNumber}`,
            });
          }
        }
      }

      // Update order status to cancelled
      const updatedOrder = await storage.updateOrder(req.params.id, { 
        status: 'cancelled',
        paymentStatus: 'refunded',
        cancelledAt: order.cancelledAt || new Date(),
      });

      // Add cancellation note
      await storage.createOrderNote({
        orderId: req.params.id,
        authorType: 'admin',
        noteType: 'status_change',
        content: `Sipariş iptal edildi. Sebep: ${req.body.reason || 'Belirtilmedi'}`,
        isPrivate: false,
      });

      res.json(updatedOrder);
    } catch (error) {
      console.error('Order cancellation error:', error);
      res.status(500).json({ error: "Failed to cancel order" });
    }
  });

  // ── Bank Transfer (Havale) Onaylama ────────────────────────────────────
  // Admin havale ödemesini onaylar: paymentStatus -> paid, status -> confirmed,
  // stok düşer, kupon redeem edilir, müşteriye sipariş onay e-posta + WhatsApp
  // bildirimi gönderilir.
  app.post("/api/admin/orders/:id/confirm-bank-transfer", requireAdmin, async (req, res) => {
    try {
      const parsed = confirmBankTransferSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Sipariş bulunamadı" });

      if (order.paymentMethod !== 'bank_transfer') {
        return res.status(400).json({ error: "Bu sipariş havale ödeme değil" });
      }
      if (order.paymentStatus !== 'awaiting_transfer') {
        return res.status(400).json({ error: "Sipariş zaten işlem görmüş" });
      }

      const orderItems = await storage.getOrderItems(order.id);

      // Reduce stock now (was deferred at order creation time)
      for (const item of orderItems) {
        if (item.cardListingId) {
          // TCG listing: decrement card_listings.stock on confirmation
          await db.update(cardListings)
            .set({ stock: sql`GREATEST(0, ${cardListings.stock} - ${item.quantity})` })
            .where(eq(cardListings.id, item.cardListingId));
        } else if (item.variantId) {
          // Legacy product variant (no-op stubs — product_variants dropped)
          const variant = await storage.getProductVariant(item.variantId);
          if (variant) {
            const newStock = Math.max(0, variant.stock - item.quantity);
            await storage.updateProductVariant(item.variantId, { stock: newStock });
          }
        }
      }

      // Coupon redemption
      if (order.couponCode) {
        try {
          const coupon = await storage.getCouponByCode(order.couponCode);
          if (coupon) {
            await storage.redeemCoupon(coupon.id, order.id, null, parseFloat(order.discountAmount || '0'));
            if (coupon.isInfluencerCode) {
              let commission = 0;
              const orderTotal = parseFloat(order.total);
              switch (coupon.commissionType) {
                case 'percentage':
                  commission = (orderTotal * parseFloat(coupon.commissionValue || '0')) / 100;
                  break;
                case 'per_use':
                  commission = parseFloat(coupon.commissionValue || '0');
                  break;
              }
              if (commission > 0) {
                const currentCommission = parseFloat(coupon.totalCommissionEarned || '0');
                await storage.updateCoupon(coupon.id, {
                  totalCommissionEarned: (currentCommission + commission).toFixed(2),
                });
              }
            }
          }
        } catch (err) {
          console.error('[bank-transfer confirm] Coupon redeem failed:', err);
        }
      }

      const updatedOrder = await storage.updateOrder(req.params.id, {
        status: 'confirmed',
        paymentStatus: 'paid',
      });

      await storage.createOrderNote({
        orderId: req.params.id,
        authorType: 'admin',
        noteType: 'status_change',
        content: 'Havale ödemesi onaylandı.',
        isPrivate: false,
      });

      // Standard order received notifications now that payment is confirmed
      if (updatedOrder) {
        sendOrderConfirmationEmail(updatedOrder, orderItems).catch(err =>
          console.error('[Email] Order confirmation (bank transfer confirmed) failed:', err)
        );
        sendOrderReceivedToCustomer(updatedOrder).catch(err =>
          console.error('[WhatsApp] Order received (bank transfer confirmed) failed:', err)
        );
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error('[bank-transfer confirm] error:', error);
      res.status(500).json({ error: "Havale onaylanamadı" });
    }
  });

  // ── Bank Transfer (Havale) Reddetme ────────────────────────────────────
  // Admin havale ödemesini reddeder: sipariş iptal edilir.
  // card_listings stock creation'da düşürülmediğinden restore gerekmez
  // (stok yalnızca confirm adımında azaltılır — deferral pattern).
  app.post("/api/admin/orders/:id/reject-bank-transfer", requireAdmin, async (req, res) => {
    try {
      const parsed = rejectBankTransferSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Sipariş bulunamadı" });

      if (order.paymentMethod !== 'bank_transfer') {
        return res.status(400).json({ error: "Bu sipariş havale ödeme değil" });
      }
      if (order.paymentStatus !== 'awaiting_transfer') {
        return res.status(400).json({ error: "Sipariş zaten işlem görmüş" });
      }

      // No stock restore needed: card_listings stock is decremented only at confirm, not at creation.

      const updatedOrder = await storage.updateOrder(req.params.id, {
        status: 'cancelled',
        paymentStatus: 'failed',
        cancelledAt: order.cancelledAt || new Date(),
      });

      const reason = (parsed.data.reason as string | undefined) || 'Havale ödemesi alınamadı';
      await storage.createOrderNote({
        orderId: req.params.id,
        authorType: 'admin',
        noteType: 'status_change',
        content: `Havale reddedildi. Sebep: ${reason}`,
        isPrivate: false,
      });

      if (updatedOrder) {
        sendOrderCancelledToCustomer(updatedOrder).catch(err =>
          console.error('[WhatsApp] Cancelled (bank transfer rejected) failed:', err)
        );
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error('[bank-transfer reject] error:', error);
      res.status(500).json({ error: "Havale reddedilemedi" });
    }
  });

  // User order stats for detail modal
  app.get("/api/admin/users/:id/stats", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      
      const stats = await storage.getUserOrderStats(user.email);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });

  // Influencer coupons routes
  app.get("/api/admin/influencer-coupons", requireAdmin, async (req, res) => {
    try {
      const coupons = await storage.getInfluencerCoupons();
      res.json(coupons);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch influencer coupons" });
    }
  });

  app.post("/api/admin/influencer-coupons/:id/pay", requireAdmin, async (req, res) => {
    try {
      const coupon = await storage.markInfluencerPaid(req.params.id);
      if (!coupon) return res.status(404).json({ error: "Coupon not found" });
      res.json(coupon);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark as paid" });
    }
  });

  // Bulk add influencers
  app.post("/api/admin/influencer-coupons/bulk", requireAdmin, async (req, res) => {
    try {
      const parsed = influencerBulkSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const { influencers } = parsed.data;

      const results = [];
      for (const inf of influencers) {
        try {
          const coupon = await storage.createCoupon({
            code: inf.code.toUpperCase(),
            description: `${inf.name || inf.code} - Influencer Kodu`,
            discountType: 'percentage',
            discountValue: String(inf.customerDiscount || 10),
            isActive: true,
            isInfluencerCode: true,
            influencerName: inf.name || inf.code,
            influencerInstagram: inf.instagram || null,
            commissionType: 'percentage',
            commissionValue: String(inf.commissionPercent || 5),
          });
          results.push({ code: inf.code, success: true, id: coupon.id });
        } catch (err: any) {
          results.push({ code: inf.code, success: false, error: err.message });
        }
      }

      res.json({ results, success: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length });
    } catch (error) {
      console.error('Bulk influencer add error:', error);
      res.status(500).json({ error: "Failed to add influencers" });
    }
  });

  // Influencer analytics - monthly usage
  app.get("/api/admin/influencer-analytics", requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate, couponId } = req.query;
      
      // Get all influencer coupons with their redemptions
      const influencerCoupons = await storage.getInfluencerCoupons();
      
      // Get redemption details with order info
      const redemptionsQuery = await db.select({
        redemption: couponRedemptions,
        order: orders,
        coupon: coupons,
      })
      .from(couponRedemptions)
      .leftJoin(orders, eq(couponRedemptions.orderId, orders.id))
      .leftJoin(coupons, eq(couponRedemptions.couponId, coupons.id))
      .where(eq(coupons.isInfluencerCode, true))
      .orderBy(desc(couponRedemptions.createdAt));

      // Filter by date if provided
      let filteredRedemptions = redemptionsQuery;
      if (startDate) {
        const start = new Date(startDate as string);
        filteredRedemptions = filteredRedemptions.filter(r => new Date(r.redemption.createdAt) >= start);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filteredRedemptions = filteredRedemptions.filter(r => new Date(r.redemption.createdAt) <= end);
      }
      if (couponId) {
        filteredRedemptions = filteredRedemptions.filter(r => r.coupon?.id === couponId);
      }

      // Group by month
      const monthlyData: Record<string, { month: string; count: number; revenue: number; commission: number }> = {};
      
      for (const r of filteredRedemptions) {
        const date = new Date(r.redemption.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { month: monthKey, count: 0, revenue: 0, commission: 0 };
        }
        
        monthlyData[monthKey].count += 1;
        monthlyData[monthKey].revenue += parseFloat(r.order?.total || '0');
        
        // Calculate commission
        const coupon = r.coupon;
        if (coupon && coupon.commissionType === 'percentage') {
          monthlyData[monthKey].commission += (parseFloat(r.order?.total || '0') * parseFloat(coupon.commissionValue || '0')) / 100;
        } else if (coupon && coupon.commissionType === 'per_use') {
          monthlyData[monthKey].commission += parseFloat(coupon.commissionValue || '0');
        }
      }

      // Convert to array and sort
      const monthlyArray = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

      res.json({
        influencers: influencerCoupons,
        monthlyData: monthlyArray,
        redemptions: filteredRedemptions.map(r => ({
          id: r.redemption.id,
          couponId: r.redemption.couponId,
          couponCode: r.coupon?.code,
          influencerName: r.coupon?.influencerName,
          orderId: r.order?.id,
          orderNumber: r.order?.orderNumber,
          orderTotal: r.order?.total,
          discountAmount: r.redemption.discountAmount,
          createdAt: r.redemption.createdAt,
        })),
        totals: {
          totalRedemptions: filteredRedemptions.length,
          totalRevenue: filteredRedemptions.reduce((sum, r) => sum + parseFloat(r.order?.total || '0'), 0),
          totalCommission: Object.values(monthlyData).reduce((sum, m) => sum + m.commission, 0),
        },
      });
    } catch (error) {
      console.error('Influencer analytics error:', error);
      res.status(500).json({ error: "Failed to fetch influencer analytics" });
    }
  });

  // Influencer detail endpoint
  app.get("/api/admin/influencer/:couponId/detail", requireAdmin, async (req, res) => {
    try {
      const { couponId } = req.params;

      // Get the influencer coupon
      const [coupon] = await db.select().from(coupons).where(eq(coupons.id, couponId));
      if (!coupon || !coupon.isInfluencerCode) {
        return res.status(404).json({ error: "Influencer not found" });
      }

      // Get all redemptions for this influencer
      const redemptionsData = await db.select({
        redemption: couponRedemptions,
        order: orders,
      })
      .from(couponRedemptions)
      .leftJoin(orders, eq(couponRedemptions.orderId, orders.id))
      .where(eq(couponRedemptions.couponId, couponId))
      .orderBy(desc(couponRedemptions.createdAt));

      // Group by month
      const monthlyMap: Record<string, { month: string; label: string; count: number; revenue: number; commission: number }> = {};
      let totalRevenue = 0;
      let totalCommissionAllTime = 0;

      for (const r of redemptionsData) {
        const date = new Date(r.redemption.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });

        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { month: monthKey, label, count: 0, revenue: 0, commission: 0 };
        }

        const orderTotal = parseFloat(r.order?.total || '0');
        monthlyMap[monthKey].count += 1;
        monthlyMap[monthKey].revenue += orderTotal;
        totalRevenue += orderTotal;

        let commission = 0;
        if (coupon.commissionType === 'percentage') {
          commission = orderTotal * (parseFloat(coupon.commissionValue || '0') / 100);
        } else if (coupon.commissionType === 'per_use') {
          commission = parseFloat(coupon.commissionValue || '0');
        }
        monthlyMap[monthKey].commission += commission;
        totalCommissionAllTime += commission;
      }

      const monthlyData = Object.values(monthlyMap).sort((a, b) => b.month.localeCompare(a.month));

      // Get payment history
      const paymentHistory = await storage.getInfluencerPayments(couponId);

      // Format redemptions
      const redemptions = redemptionsData.map(r => ({
        id: r.redemption.id,
        orderId: r.order?.id,
        orderNumber: r.order?.orderNumber,
        orderTotal: r.order?.total,
        discountAmount: r.redemption.discountAmount,
        createdAt: r.redemption.createdAt,
        orderStatus: r.order?.status,
      }));

      res.json({
        influencer: coupon,
        monthlyData,
        redemptions,
        paymentHistory,
        totals: {
          totalOrders: redemptionsData.length,
          totalRevenue,
          totalCommissionAllTime,
          pendingCommission: parseFloat(coupon.totalCommissionEarned || '0'),
        },
      });
    } catch (error) {
      console.error('Influencer detail error:', error);
      res.status(500).json({ error: "Failed to fetch influencer detail" });
    }
  });

  // Admin credentials update route
  app.post("/api/admin/update-credentials", requireAdmin, async (req, res) => {
    try {
      const parsed = updateCredentialsSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const { newUsername, newPassword } = parsed.data;

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Get current admin and update
      const admin = await storage.getAdminUser((req as any).adminId);
      if (!admin) return res.status(404).json({ error: "Admin not found" });

      await storage.updateAdminUser(admin.id, {
        username: newUsername,
        password: hashedPassword,
      });

      res.json({ success: true, message: "Credentials updated" });
    } catch (error) {
      console.error('Credentials update error:', error);
      res.status(500).json({ error: "Failed to update credentials" });
    }
  });

  // Campaign Routes
  app.get("/api/admin/campaigns", requireAdmin, async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/admin/campaigns/:id", requireAdmin, async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaign" });
    }
  });

  app.post("/api/admin/campaigns", requireAdmin, async (req, res) => {
    try {
      const parsed = campaignWriteSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const campaign = await storage.createCampaign(parsed.data as any);
      res.status(201).json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create campaign" });
    }
  });

  app.put("/api/admin/campaigns/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = campaignUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const campaign = await storage.updateCampaign(req.params.id, parsed.data as any);
      if (!campaign) return res.status(404).json({ error: "Campaign not found" });
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  app.delete("/api/admin/campaigns/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCampaign(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete campaign" });
    }
  });

  app.get("/api/admin/campaigns/:id/emails", requireAdmin, async (req, res) => {
    try {
      const emails = await storage.getEmailJobsByCampaign(req.params.id);
      res.json(emails);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaign emails" });
    }
  });

  app.get("/api/admin/email-recipients", requireAdmin, async (req, res) => {
    try {
      const segment = (req.query.segment as 'all' | 'active' | 'new') || 'all';
      const recipients = await storage.getEmailsForBulkSend(segment);
      res.json(recipients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch email recipients" });
    }
  });

  // Site Settings Routes
  app.get("/api/config", async (req, res) => {
    try {
      const freeShipSetting = await storage.getSiteSetting('free_shipping_threshold');
      res.json({ freeShippingThreshold: freeShipSetting ? parseFloat(freeShipSetting) : 500 });
    } catch {
      res.json({ freeShippingThreshold: 500 });
    }
  });

  app.get("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      // Mask sensitive credentials
      if (settings.smtp_pass) {
        settings.smtp_pass = '••••••••';
      }
      if (settings.wpileti_api_key) {
        settings.wpileti_api_key = '••••••••';
      }
      if (settings.turnstile_secret_key) {
        settings.turnstile_secret_key = '••••••••';
      }
      if (settings.aras_kargo_password) {
        settings.aras_kargo_password = '••••••••';
      }
      if (settings.pricecharting_api_key) {
        settings.pricecharting_api_key = '••••••••';
      }
      if (settings.pokemon_tcg_api_key) {
        settings.pokemon_tcg_api_key = '••••••••';
      }
      if (settings.openai_api_key) {
        settings.openai_api_key = '••••••••';
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const parsed = settingsWriteSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const settings = parsed.data;
      // Don't update masked credentials
      if (settings.smtp_pass === '••••••••') {
        delete settings.smtp_pass;
      }
      if (settings.wpileti_api_key === '••••••••') {
        delete settings.wpileti_api_key;
      }
      if (settings.turnstile_secret_key === '••••••••') {
        delete settings.turnstile_secret_key;
      }
      if (settings.aras_kargo_password === '••••••••') {
        delete settings.aras_kargo_password;
      }
      if (settings.pricecharting_api_key === '••••••••') {
        delete settings.pricecharting_api_key;
      }
      if (settings.pokemon_tcg_api_key === '••••••••') {
        delete settings.pokemon_tcg_api_key;
      }
      if (settings.openai_api_key === '••••••••') {
        delete settings.openai_api_key;
      }
      await storage.setSiteSettings(settings as any);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // Hero fan config — public read, admin write
  app.get("/api/settings/hero-config", async (_req, res) => {
    try {
      const raw = await storage.getSiteSetting('hero_config');
      const defaultConfig = { mode: 'random', count: 5, game: 'riftbound', cardIds: [] };
      if (!raw) return res.json(defaultConfig);
      try { return res.json(JSON.parse(raw)); } catch { return res.json(defaultConfig); }
    } catch (err) {
      res.status(500).json({ error: "Hero config yüklenemedi" });
    }
  });

  app.put("/api/admin/settings/hero-config", requireAdmin, async (req, res) => {
    try {
      const baseSchema = z.object({
        mode: z.enum(['random', 'manual']),
        count: z.number().int().min(3).max(6),
        game: z.enum(['riftbound', 'pokemon', 'all']),
        cardIds: z.array(z.string()).max(6),
      }).refine(
        (d) => d.mode === 'random' || d.cardIds.length >= 3,
        { message: 'Manuel modda en az 3 kart seçilmelidir.', path: ['cardIds'] },
      );
      const parsed = baseSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      // In manual mode, count is auto-derived from the selected card list (clamped 3–6)
      const configToSave = { ...parsed.data };
      if (configToSave.mode === 'manual') {
        configToSave.count = Math.max(3, Math.min(6, configToSave.cardIds.length));
      }
      await storage.setSiteSetting('hero_config', JSON.stringify(configToSave));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Hero config kaydedilemedi" });
    }
  });

  app.post("/api/admin/settings/test-email", requireAdmin, async (req, res) => {
    try {
      const parsed = testEmailSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const { email } = parsed.data;
      const result = await sendTestEmail(email);
      if (result.success) {
        res.json({ success: true, message: "Test e-postası gönderildi" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Test e-postası gönderilemedi" });
    }
  });

  app.post("/api/admin/whatsapp/test", requireAdmin, async (req, res) => {
    try {
      const parsed = whatsappTestSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ success: false, error: firstZodMessage(parsed.error) });
      const { phone, message } = parsed.data;
      const result = await sendTestWhatsApp(phone, message);
      if (result.success) {
        res.json({ success: true, message: "Test WhatsApp mesajı gönderildi" });
      } else {
        res.status(400).json({ success: false, error: result.error || "Test mesajı gönderilemedi" });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || "Test mesajı gönderilemedi" });
    }
  });

  // Abandoned Cart Reminder - Get users with cart items
  app.get("/api/admin/abandoned-carts", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsersWithCartItems();
      res.json(users);
    } catch (error) {
      console.error('[Admin] Abandoned carts error:', error);
      res.status(500).json({ error: "Sepet bilgileri alınamadı" });
    }
  });

  // Send cart reminder email to a specific user
  app.post("/api/admin/abandoned-carts/:userId/remind", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }

      const cartItems = await storage.getCartItems(userId);
      if (cartItems.length === 0) {
        return res.status(400).json({ error: "Kullanıcının sepetinde ürün yok" });
      }

      // Get product details for cart items
      const cartItemsWithDetails = await Promise.all(
        cartItems.map(async (item) => {
          const variant = item.variantId ? await storage.getProductVariant(item.variantId) : null;
          // Use variant's productId if available to ensure consistency
          const actualProductId = variant?.productId || item.productId;
          const product = await storage.getProduct(actualProductId);
          return {
            productName: product?.name || 'Ürün',
            variantDetails: variant ? `${variant.size || ''} ${variant.color || ''}`.trim() : '',
            price: product?.basePrice || '0',
            quantity: item.quantity,
          };
        })
      );

      const cartTotal = cartItemsWithDetails.reduce(
        (sum, item) => sum + parseFloat(item.price) * item.quantity,
        0
      );

      const result = await sendAbandonedCartEmail(
        user.email,
        user.firstName || 'Değerli Müşterimiz',
        cartItemsWithDetails,
        cartTotal
      );

      if (result.success) {
        res.json({ success: true, message: "Sepet hatırlatma e-postası gönderildi" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      console.error('[Admin] Cart reminder error:', error);
      res.status(500).json({ error: error.message || "E-posta gönderilemedi" });
    }
  });

  // Send cart reminder to all users with items in cart
  app.post("/api/admin/abandoned-carts/remind-all", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsersWithCartItems();
      
      if (users.length === 0) {
        return res.json({ success: true, sent: 0, message: "Sepetinde ürün olan kullanıcı yok" });
      }

      let sent = 0;
      let failed = 0;

      for (const user of users) {
        try {
          const cartItems = await storage.getCartItems(user.id);
          
          const cartItemsWithDetails = await Promise.all(
            cartItems.map(async (item) => {
              const variant = item.variantId ? await storage.getProductVariant(item.variantId) : null;
              // Use variant's productId if available to ensure consistency
              const actualProductId = variant?.productId || item.productId;
              const product = await storage.getProduct(actualProductId);
              return {
                productName: product?.name || 'Ürün',
                variantDetails: variant ? `${variant.size || ''} ${variant.color || ''}`.trim() : '',
                price: product?.basePrice || '0',
                quantity: item.quantity,
              };
            })
          );

          const cartTotal = cartItemsWithDetails.reduce(
            (sum, item) => sum + parseFloat(item.price) * item.quantity,
            0
          );

          const result = await sendAbandonedCartEmail(
            user.email,
            user.firstName || 'Değerli Müşterimiz',
            cartItemsWithDetails,
            cartTotal
          );

          if (result.success) {
            sent++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error(`[Admin] Failed to send cart reminder to ${user.email}:`, err);
          failed++;
        }
      }

      res.json({ 
        success: true, 
        sent, 
        failed, 
        message: `${sent} kullanıcıya e-posta gönderildi${failed > 0 ? `, ${failed} başarısız` : ''}` 
      });
    } catch (error: any) {
      console.error('[Admin] Bulk cart reminder error:', error);
      res.status(500).json({ error: error.message || "E-postalar gönderilemedi" });
    }
  });

  // Password Reset Routes
  app.post("/api/auth/forgot-password", passwordResetLimiter, async (req, res) => {
    try {
      const parsedForgot = forgotPasswordSchema.safeParse(req.body);
      if (!parsedForgot.success) return res.status(400).json({ error: firstZodMessage(parsedForgot.error) });
      const { email } = parsedForgot.data;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal if email exists
        return res.json({ success: true, message: "Eğer bu e-posta kayıtlıysa, şifre sıfırlama bağlantısı gönderildi." });
      }
      
      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      await storage.createPasswordResetToken(user.id, token, expiresAt);
      await sendPasswordResetEmail(user, token);
      
      res.json({ success: true, message: "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi." });
    } catch (error) {
      console.error('[Auth] Forgot password error:', error);
      res.status(500).json({ error: "Şifre sıfırlama işlemi başarısız" });
    }
  });

  app.post("/api/auth/reset-password", passwordResetLimiter, async (req, res) => {
    try {
      const parsedReset = resetPasswordSchema.safeParse(req.body);
      if (!parsedReset.success) return res.status(400).json({ error: firstZodMessage(parsedReset.error) });
      const { token, newPassword } = parsedReset.data;
      
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ error: "Geçersiz veya süresi dolmuş bağlantı" });
      }
      
      if (resetToken.usedAt) {
        return res.status(400).json({ error: "Bu bağlantı zaten kullanılmış" });
      }
      
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ error: "Bağlantının süresi dolmuş" });
      }
      
      // Update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(resetToken.userId, { password: hashedPassword });
      
      // Mark token as used
      await storage.markPasswordResetTokenUsed(token);
      
      res.json({ success: true, message: "Şifreniz başarıyla güncellendi" });
    } catch (error) {
      console.error('[Auth] Reset password error:', error);
      res.status(500).json({ error: "Şifre sıfırlama işlemi başarısız" });
    }
  });

  app.get("/api/auth/verify-reset-token/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken || resetToken.usedAt || new Date() > resetToken.expiresAt) {
        return res.json({ valid: false });
      }
      
      const user = await storage.getUser(resetToken.userId);
      res.json({ valid: true, email: user?.email || '' });
    } catch (error) {
      res.json({ valid: false });
    }
  });

  // Send shipping notification email when status changes to shipped
  app.post("/api/admin/orders/:id/send-shipping-email", requireAdmin, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Sipariş bulunamadı" });
      
      const result = await sendShippingNotificationEmail(order);
      if (result.success) {
        res.json({ success: true, message: "Kargo bildirimi gönderildi" });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: "E-posta gönderilemedi" });
    }
  });

  // Send review request email
  app.post("/api/admin/orders/:id/send-review-request", requireAdmin, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Sipariş bulunamadı" });
      
      const items = await storage.getOrderItems(order.id);
      const productObjs = items.map(item => ({ name: item.productName }));
      const reviewToken = crypto.randomBytes(24).toString('hex');
      
      const result = await sendReviewRequestEmail(
        order.customerEmail,
        order.customerName,
        order.orderNumber,
        productObjs,
        reviewToken
      );
      
      if (result.success) {
        res.json({ success: true, message: "Değerlendirme talebi gönderildi" });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: "E-posta gönderilemedi" });
    }
  });

  // Sitemap XML
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = req.protocol + '://' + req.get('host');
      const { products } = await storage.getProducts();
      const categories = await storage.getCategories();
      
      const escapeXml = (str: string) => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };
      
      const normalizeUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }
        return baseUrl + (url.startsWith('/') ? url : '/' + url);
      };
      
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
      
      const staticPages = [
        { loc: '/', priority: '1.0', changefreq: 'daily' },
        { loc: '/giris', priority: '0.5', changefreq: 'monthly' },
        { loc: '/kayit', priority: '0.5', changefreq: 'monthly' },
        { loc: '/sepet', priority: '0.6', changefreq: 'weekly' },
      ];
      
      for (const page of staticPages) {
        xml += '  <url>\n';
        xml += `    <loc>${escapeXml(baseUrl + page.loc)}</loc>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        xml += '  </url>\n';
      }
      
      for (const category of categories) {
        xml += '  <url>\n';
        xml += `    <loc>${escapeXml(baseUrl + '/kategori/' + category.slug)}</loc>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.8</priority>\n';
        xml += '  </url>\n';
      }
      
      for (const product of products) {
        xml += '  <url>\n';
        xml += `    <loc>${escapeXml(baseUrl + '/urun/' + product.slug)}</loc>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.9</priority>\n';
        if (product.images && product.images.length > 0) {
          const imageUrl = normalizeUrl(product.images[0]);
          xml += '    <image:image>\n';
          xml += `      <image:loc>${escapeXml(imageUrl)}</image:loc>\n`;
          xml += `      <image:title>${escapeXml(product.name)}</image:title>\n`;
          xml += '    </image:image>\n';
        }
        xml += '  </url>\n';
      }
      
      xml += '</urlset>';
      
      res.set('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error('Sitemap error:', error);
      res.status(500).send('Error generating sitemap');
    }
  });

  // Robots.txt
  app.get("/robots.txt", (req, res) => {
    const host = req.get('host') || '';
    const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${host}`;
    const robotsTxt = `User-agent: *
Allow: /

Disallow: /sepet
Disallow: /odeme
Disallow: /odeme-basarili
Disallow: /odeme-basarisiz
Disallow: /siparis-takip
Disallow: /hesabim
Disallow: /hesabim/
Disallow: /giris
Disallow: /kayit
Disallow: /sifremi-unuttum
Disallow: /sifre-sifirla
Disallow: /toov-admin
Disallow: /toov-admin/
Disallow: /api/
Disallow: /uploads/temp/

Sitemap: ${baseUrl}/sitemap.xml
`;
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(robotsTxt);
  });

  // Cache invalidation endpoint for admin
  app.post("/api/admin/cache/clear", requireAdmin, (req, res) => {
    cache.clear();
    res.json({ success: true, message: "Cache cleared" });
  });

  app.get("/api/admin/cache/stats", requireAdmin, (req, res) => {
    res.json(cache.getStats());
  });

  // Database Management Endpoints - for clearing specific tables
  app.get("/api/admin/database/stats", requireAdmin, async (req, res) => {
    try {
      const [ordersCount, cartItemsCount, pendingPaymentsCount, reviewsCount, couponUsageCount, productsCount] = await Promise.all([
        storage.getOrdersCount(),
        storage.getCartItemsCount(),
        storage.getPendingPaymentsCount(),
        storage.getReviewsCount(),
        storage.getCouponUsageCount(),
        storage.getProductsCount(),
      ]);
      
      res.json({
        orders: ordersCount,
        cartItems: cartItemsCount,
        pendingPayments: pendingPaymentsCount,
        reviews: reviewsCount,
        couponUsage: couponUsageCount,
        products: productsCount,
      });
    } catch (error) {
      console.error('[Database] Stats error:', error);
      res.status(500).json({ error: "Veritabanı istatistikleri alınamadı" });
    }
  });

  app.post("/api/admin/database/clear/:table", requireAdmin, async (req: Request, res) => {
    try {
      const { table } = req.params;
      const parsedClear = dbClearTableSchema.safeParse(req.body);
      if (!parsedClear.success) return res.status(400).json({ error: firstZodMessage(parsedClear.error) });
      const { confirmCode } = parsedClear.data;
      
      // Ürünler için ekstra güvenli onay kodu — yanlışlıkla katalog silinmesin
      const requiredCode = table === 'products' ? 'TUM_URUNLERI_SIL' : 'SIFIRLA';
      if (confirmCode !== requiredCode) {
        return res.status(400).json({ error: `Onay kodu hatalı. '${requiredCode}' yazmalısınız.` });
      }
      
      // List of safe-to-clear tables (NOT users, categories)
      const allowedTables = ['orders', 'order_items', 'cart_items', 'pending_payments', 'reviews', 'review_requests', 'coupon_usage', 'stock_adjustments', 'products'];
      
      if (!allowedTables.includes(table)) {
        return res.status(403).json({ error: "Bu tablo silinemez" });
      }
      
      let deletedCount = 0;
      
      switch (table) {
        case 'orders':
          // First delete order items, then orders
          await storage.clearOrderItems();
          deletedCount = await storage.clearOrders();
          break;
        case 'order_items':
          deletedCount = await storage.clearOrderItems();
          break;
        case 'cart_items':
          deletedCount = await storage.clearAllCartItems();
          break;
        case 'pending_payments':
          deletedCount = await storage.clearPendingPayments();
          break;
        case 'reviews':
          deletedCount = await storage.clearReviews();
          break;
        case 'review_requests':
          deletedCount = await storage.clearReviewRequests();
          break;
        case 'coupon_usage':
          deletedCount = await storage.clearCouponUsage();
          // Also reset coupon usage counts
          await storage.resetCouponUsageCounts();
          break;
        case 'stock_adjustments':
          deletedCount = await storage.clearStockAdjustments();
          break;
        case 'products': {
          // Tüm ürünleri ve bağlı kayıtları sil; order_items.product_id NULL olur (sipariş geçmişi korunur).
          const result = await storage.deleteAllProducts();
          deletedCount = result.deletedProducts;
          // Ürün fotoğraflarını dosya sisteminden de temizle
          let removedFiles = 0;
          for (const imgPath of result.imagePaths) {
            if (typeof imgPath !== 'string' || !imgPath.startsWith('/uploads/')) continue;
            try {
              const absolute = path.join(process.cwd(), 'client/public', imgPath);
              await fs.promises.unlink(absolute);
              removedFiles += 1;
            } catch (e: any) {
              if (e?.code !== 'ENOENT') {
                console.warn(`[Database] Could not remove image ${imgPath}:`, e?.message || e);
              }
            }
          }
          console.log(`[Database] Products cleared: ${result.deletedProducts} products, ${result.deletedVariants} variants, ${removedFiles}/${result.imagePaths.length} images removed from disk.`);
          break;
        }
        default:
          return res.status(400).json({ error: "Geçersiz tablo adı" });
      }
      
      console.log(`[Database] Table ${table} cleared by admin. ${deletedCount} records deleted.`);
      res.json({ success: true, table, deletedCount });
    } catch (error) {
      console.error('[Database] Clear error:', error);
      res.status(500).json({ error: "Tablo temizlenemedi" });
    }
  });

  // Clear all sales data (orders, order_items, pending_payments, coupon_usage)
  app.post("/api/admin/database/clear-all-sales", requireAdmin, async (req: Request, res) => {
    try {
      const parsedClearSales = dbClearTableSchema.safeParse(req.body);
      if (!parsedClearSales.success) return res.status(400).json({ error: firstZodMessage(parsedClearSales.error) });
      const { confirmCode } = parsedClearSales.data;
      
      if (confirmCode !== 'TUM_SATISLARI_SIL') {
        return res.status(400).json({ error: "Onay kodu hatalı. 'TUM_SATISLARI_SIL' yazmalısınız." });
      }
      
      // Clear in order of dependencies
      await storage.clearOrderItems();
      await storage.clearOrders();
      await storage.clearPendingPayments();
      await storage.clearCouponUsage();
      await storage.resetCouponUsageCounts();
      await storage.clearAllCartItems();
      
      console.log('[Database] All sales data cleared by admin');
      res.json({ success: true, message: "Tüm satış verileri silindi" });
    } catch (error) {
      console.error('[Database] Clear all sales error:', error);
      res.status(500).json({ error: "Satış verileri silinemedi" });
    }
  });


  // ==================== MENU ITEMS ====================
  // Public endpoint for active menu items
  app.get("/api/menu", async (req, res) => {
    try {
      const items = await storage.getActiveMenuItems();
      const categories = await storage.getCategories();
      
      // Build nested structure with category details
      const menuItemsWithDetails = items.map(item => {
        let categoryDetails = null;
        if (item.type === 'category' && item.categoryId) {
          const category = categories.find(c => c.id === item.categoryId);
          if (category) {
            categoryDetails = {
              id: category.id,
              name: category.name,
              slug: category.slug,
            };
          }
        }
        return {
          ...item,
          category: categoryDetails,
        };
      });

      // Build tree structure (parent items with children)
      const rootItems = menuItemsWithDetails.filter(item => !item.parentId);
      const result = rootItems.map(item => ({
        ...item,
        children: menuItemsWithDetails.filter(child => child.parentId === item.id),
      }));

      res.json(result);
    } catch (error) {
      console.error('[Menu] Get menu error:', error);
      res.status(500).json({ error: "Menü alınamadı" });
    }
  });

  // Admin: Get all menu items
  app.get("/api/admin/menu-items", requireAdmin, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    try {
      const items = await storage.getMenuItems();
      console.log('[Menu] Admin fetched menu items:', items.length, 'items');
      const categories = await storage.getCategories();
      
      const menuItemsWithDetails = items.map(item => {
        let categoryDetails = null;
        if (item.type === 'category' && item.categoryId) {
          const category = categories.find(c => c.id === item.categoryId);
          if (category) {
            categoryDetails = {
              id: category.id,
              name: category.name,
              slug: category.slug,
            };
          }
        }
        return {
          ...item,
          category: categoryDetails,
        };
      });

      res.json(menuItemsWithDetails);
    } catch (error) {
      console.error('[Menu] Get all menu items error:', error);
      res.status(500).json({ error: "Menü öğeleri alınamadı" });
    }
  });

  // Admin: Create menu item
  app.post("/api/admin/menu-items", requireAdmin, async (req, res) => {
    try {
      const parsed = menuItemWriteSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const { title, type, categoryId, url, parentId, displayOrder, isActive, openInNewTab } = parsed.data;
      const menuItem = await storage.createMenuItem({
        title,
        type,
        categoryId: categoryId ?? null,
        url: url ?? null,
        parentId: parentId ?? null,
        displayOrder: displayOrder ?? 0,
        isActive: isActive !== false,
        openInNewTab: openInNewTab ?? false,
      });

      res.json(menuItem);
    } catch (error) {
      console.error('[Menu] Create menu item error:', error);
      res.status(500).json({ error: "Menü öğesi oluşturulamadı" });
    }
  });

  // Admin: Update menu item
  app.put("/api/admin/menu-items/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = menuItemUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      const { title, type, categoryId, url, parentId, displayOrder, isActive, openInNewTab } = parsed.data;
      const menuItem = await storage.updateMenuItem(req.params.id, {
        title,
        type,
        categoryId: categoryId ?? null,
        url: url ?? null,
        parentId: parentId ?? null,
        displayOrder,
        isActive,
        openInNewTab,
      });

      if (!menuItem) {
        return res.status(404).json({ error: "Menü öğesi bulunamadı" });
      }

      res.json(menuItem);
    } catch (error) {
      console.error('[Menu] Update menu item error:', error);
      res.status(500).json({ error: "Menü öğesi güncellenemedi" });
    }
  });

  // Admin: Delete menu item
  app.delete("/api/admin/menu-items/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteMenuItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('[Menu] Delete menu item error:', error);
      res.status(500).json({ error: "Menü öğesi silinemedi" });
    }
  });

  // Admin: Reorder menu items
  app.post("/api/admin/menu-items/reorder", requireAdmin, async (req, res) => {
    try {
      const parsed = menuReorderSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: firstZodMessage(parsed.error) });
      await storage.reorderMenuItems(parsed.data.items);
      res.json({ success: true });
    } catch (error) {
      console.error('[Menu] Reorder menu items error:', error);
      res.status(500).json({ error: "Menü sıralaması güncellenemedi" });
    }
  });

  // Admin: Önizleme — kategorileri kurallara göre nasıl gruplayacağını göster (yazma yok)
  app.get("/api/admin/menu-items/grouping-preview", requireAdmin, async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      const plan = buildGroupingPlan(categories);
      res.json(plan);
    } catch (error) {
      console.error('[Menu] Grouping preview error:', error);
      res.status(500).json({ error: "Önizleme oluşturulamadı" });
    }
  });

  // Admin: Kategorileri otomatik gruplandır → menu_items üret
  // Sadece displayOrder >= AUTO_GROUP_DISPLAY_ORDER_BASE olan kayıtları siler.
  // Kullanıcının manuel eklediği menüler korunur.
  app.post("/api/admin/menu-items/regenerate-from-categories", requireAdmin, async (req, res) => {
    try {
      const parsedRegen = menuRegenerateSchema.safeParse(req.body ?? {});
      if (!parsedRegen.success) return res.status(400).json({ error: firstZodMessage(parsedRegen.error) });
      const wipeAll = parsedRegen.data.wipeAll === true;
      const categories = await storage.getCategories();
      const plan = buildGroupingPlan(categories);

      // 1) Eski kayıtları sil
      //    wipeAll=true  → tüm menu_items tablosunu sıfırla (manuel öğeler dahil)
      //    wipeAll=false → sadece auto-generated displayOrder aralığını sil
      if (wipeAll) {
        await db.delete(menuItemsTable);
      } else {
        await db
          .delete(menuItemsTable)
          .where(
            and(
              gte(menuItemsTable.displayOrder, AUTO_GROUP_DISPLAY_ORDER_BASE),
              lte(menuItemsTable.displayOrder, AUTO_GROUP_DISPLAY_ORDER_MAX),
            ),
          );
      }

      // 2) Her ana grup için submenu kaydı + altına category çocukları
      let createdParents = 0;
      let createdChildren = 0;
      let parentOrder = AUTO_GROUP_DISPLAY_ORDER_BASE; // 1000, 1001, ...
      let childOrder = AUTO_GROUP_DISPLAY_ORDER_BASE + 100; // 1100+

      for (const group of plan.groups) {
        const parent = await storage.createMenuItem({
          title: group.title,
          type: "submenu",
          categoryId: null,
          url: null,
          parentId: null,
          displayOrder: parentOrder++,
          isActive: true,
          openInNewTab: false,
        });
        createdParents++;

        for (const cat of group.categories) {
          await storage.createMenuItem({
            title: cat.name,
            type: "category",
            categoryId: cat.id,
            url: null,
            parentId: parent.id,
            displayOrder: childOrder++,
            isActive: true,
            openInNewTab: false,
          });
          createdChildren++;
        }
      }

      res.json({
        success: true,
        createdParents,
        createdChildren,
        groups: plan.groups.map((g) => ({
          title: g.title,
          count: g.categories.length,
        })),
      });
    } catch (error) {
      console.error('[Menu] Regenerate from categories error:', error);
      res.status(500).json({ error: "Otomatik gruplandırma yapılamadı" });
    }
  });


  // Meta Pixel + CAPI tracking removed. Stub endpoints kept as no-ops so any cached/old client deploys do not get 404s.
  const noopTrackHandler = (_req: Request, res: Response) => res.json({ success: true });
  app.post("/api/track/view-content", noopTrackHandler);
  app.post("/api/track/add-to-cart", noopTrackHandler);
  app.post("/api/track/initiate-checkout", noopTrackHandler);
  app.post("/api/track/purchase", noopTrackHandler);
  app.post("/api/track/add-payment-info", noopTrackHandler);

  // ==========================================================================
  // Marketplaces (Trendyol / N11 / Hepsiburada ...) — admin-only
  // ==========================================================================

  const { registerMarketplaceRoutes } = await import("./marketplaces/routes");
  registerMarketplaceRoutes(app, requireAdmin);

  // ==========================================================================
  // TCG Card API — admin-only
  // ==========================================================================

  // List card games
  app.get("/api/admin/tcg/games", requireAdmin, async (_req, res) => {
    try {
      const games = await storage.listCardGames();
      res.json(games);
    } catch (err) {
      console.error("[TCG] listCardGames:", err);
      res.status(500).json({ error: "Oyunlar listelenemedi" });
    }
  });

  // List card sets for a game
  app.get("/api/admin/tcg/sets", requireAdmin, async (req, res) => {
    try {
      const { gameId } = req.query as { gameId?: string };
      if (!gameId) return res.status(400).json({ error: "gameId gerekli" });
      const sets = await storage.listCardSetsByGame(gameId);
      res.json(sets);
    } catch (err) {
      console.error("[TCG] listCardSets:", err);
      res.status(500).json({ error: "Setler listelenemedi" });
    }
  });

  // List sync run history
  app.get("/api/admin/tcg/sync-runs", requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || "30", 10), 100);
      const runs = await storage.listTcgSyncRuns(limit);
      res.json(runs);
    } catch (err) {
      console.error("[TCG] listSyncRuns:", err);
      res.status(500).json({ error: "Sync geçmişi listelenemedi" });
    }
  });

  // Trigger a TCG sync (sets or cards or prices)
  app.post("/api/admin/tcg/sync", requireAdmin, async (req, res) => {
    try {
      const { game, mode, setApiId } = req.body as {
        game: "pokemon_tcg" | "riftbound";
        mode: "sets" | "cards" | "prices" | "full";
        setApiId?: string;
      };

      if (!game || !mode) {
        return res.status(400).json({ error: "game ve mode gerekli" });
      }

      // Get API keys from site_settings
      const pokemonApiKey = (await storage.getSiteSetting("pokemon_tcg_api_key")) || undefined;
      const pricechartingApiKey = (await storage.getSiteSetting("pricecharting_api_key")) || undefined;

      if (mode === "prices" && !pricechartingApiKey) {
        return res.status(400).json({
          error: "PriceCharting API key ayarlanmamış. Ayarlar → pricecharting_api_key.",
        });
      }

      // Engine creates exactly one run record; fire-and-forget background execution
      const { runTcgSync } = await import("./tcg/syncEngine");

      // Start sync in background so route responds immediately
      // runTcgSync creates the DB run record itself — we pre-create a placeholder
      // row so the client has an ID to poll before the engine has started
      const pendingRun = await storage.createTcgSyncRun({
        game,
        mode,
        status: "running",
        setApiId: setApiId ?? null,
        stats: {},
        errors: [],
      });

      // Fire and forget — engine will NOT create a duplicate run when given
      // a pre-created runId (engine reads opts.existingRunId if present)
      runTcgSync({
        game,
        mode,
        setApiId,
        pokemonApiKey,
        pricechartingApiKey,
        existingRunId: pendingRun.id,
        onProgress: (msg) => console.log(`[tcg-sync:${pendingRun.id}] ${msg}`),
      }).catch((err) => {
        console.error("[tcg-sync] unexpected engine error:", err);
      });

      res.json({ runId: pendingRun.id, message: "Sync başlatıldı" });
    } catch (err) {
      console.error("[TCG] sync error:", err);
      res.status(500).json({ error: "Sync başlatılamadı" });
    }
  });

  // Auto-list cards from PriceCharting prices × multiplier
  app.post("/api/admin/tcg/auto-list", requireAdmin, async (req, res) => {
    try {
      const { multiplier = 1.9, condition = "NM", stock = 1, gameSlug } = req.body as {
        multiplier?: number;
        condition?: string;
        stock?: number;
        gameSlug?: string;
      };

      if (multiplier <= 0 || multiplier > 100) {
        return res.status(400).json({ error: "Çarpan 0-100 arasında olmalı" });
      }
      if (stock < 0 || stock > 9999) {
        return res.status(400).json({ error: "Stok 0-9999 arasında olmalı" });
      }

      const result = await storage.bulkAutoListFromPrices({
        multiplier: Number(multiplier),
        condition: condition || "NM",
        stock: Number(stock),
        gameSlug: gameSlug || undefined,
      });

      res.json({
        message: `${result.created} yeni listing oluşturuldu, ${result.updated} güncellendi`,
        ...result,
      });
    } catch (err) {
      console.error("[TCG] auto-list error:", err);
      res.status(500).json({ error: "Otomatik listeleme başarısız" });
    }
  });

  // TCG stats for admin
  app.get("/api/admin/tcg/stats", requireAdmin, async (_req, res) => {
    try {
      const stats = await storage.getTcgStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: "İstatistikler alınamadı" });
    }
  });

  // Delete all TCG data (cards + sets, optionally filtered by game slug)
  app.delete("/api/admin/tcg/data", requireAdmin, async (req, res) => {
    try {
      const { game } = req.query as { game?: string };
      const result = await storage.deleteAllTcgData(game || undefined);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error("[tcg-delete]", err);
      res.status(500).json({ error: "Silme işlemi başarısız" });
    }
  });

  // Get a single sync run (for polling)
  app.get("/api/admin/tcg/sync-runs/:id", requireAdmin, async (req, res) => {
    try {
      const runs = await storage.listTcgSyncRuns(100);
      const run = runs.find((r) => r.id === req.params.id);
      if (!run) return res.status(404).json({ error: "Run bulunamadı" });
      res.json(run);
    } catch (err) {
      res.status(500).json({ error: "Run bilgisi alınamadı" });
    }
  });

  // ── Admin TCG card management ─────────────────────────────────────────────

  app.get("/api/admin/cards", requireAdmin, async (req, res) => {
    try {
      const { search, gameId, setId, rarity, page, limit } = req.query as Record<string, string>;
      const result = await storage.getAdminCards({
        search: search || undefined,
        gameId: gameId || undefined,
        setId: setId || undefined,
        rarity: rarity || undefined,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 30,
      });
      res.json(result);
    } catch (err) {
      console.error("[admin] getAdminCards:", err);
      res.status(500).json({ error: "Kartlar yüklenemedi" });
    }
  });

  app.post("/api/admin/cards", requireAdmin, async (req, res) => {
    try {
      const { setId, name, cardNumber, rarity, cardTypes, hp, artist, imageUrl, description, isActive, isFeatured, isNew } = req.body;
      if (!setId || !name) return res.status(400).json({ error: "setId ve name gerekli" });
      const slug = name.toLowerCase()
        .replace(/[^a-z0-9\u00e7\u011f\u0131\u00f6\u015f\u00fc\u00c7\u011e\u0130\u00d6\u015e\u00dc]+/gi, '-')
        .replace(/^-|-$/g, '');
      const card = await storage.createAdminCard({
        setId, name, slug: slug || `card-${Date.now()}`,
        cardNumber: cardNumber || null,
        rarity: rarity || null,
        cardTypes: Array.isArray(cardTypes) ? cardTypes : undefined,
        hp: hp != null ? Number(hp) : null,
        artist: artist || null,
        imageUrl: imageUrl || null,
        description: description || null,
        isActive: isActive !== false,
        isFeatured: !!isFeatured,
        isNew: !!isNew,
      });
      res.status(201).json(card);
    } catch (err) {
      console.error("[admin] createAdminCard:", err);
      res.status(500).json({ error: "Kart oluşturulamadı" });
    }
  });

  app.put("/api/admin/cards/:id", requireAdmin, async (req, res) => {
    try {
      const {
        isActive, isFeatured, isNew,
        name, setId, cardNumber, rarity, cardTypes, hp, artist,
        imageUrl, imageUrlHiRes, description,
      } = req.body;
      const patch: Record<string, unknown> = {};
      if (isActive !== undefined) patch.isActive = isActive;
      if (isFeatured !== undefined) patch.isFeatured = isFeatured;
      if (isNew !== undefined) patch.isNew = isNew;
      if (name !== undefined) patch.name = name;
      if (setId !== undefined) patch.setId = setId;
      if (cardNumber !== undefined) patch.cardNumber = cardNumber;
      if (rarity !== undefined) patch.rarity = rarity;
      if (cardTypes !== undefined) patch.cardTypes = cardTypes;
      if (hp !== undefined) patch.hp = hp === null ? null : Number(hp);
      if (artist !== undefined) patch.artist = artist;
      if (imageUrl !== undefined) patch.imageUrl = imageUrl;
      if (imageUrlHiRes !== undefined) patch.imageUrlHiRes = imageUrlHiRes;
      if (description !== undefined) patch.description = description;
      const updated = await storage.updateAdminCard(req.params.id, patch as any);
      if (!updated) return res.status(404).json({ error: "Kart bulunamadı" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Kart güncellenemedi" });
    }
  });

  app.delete("/api/admin/cards/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteAdminCard(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Kart silinemedi" });
    }
  });

  app.get("/api/admin/cards/:id/listings", requireAdmin, async (req, res) => {
    try {
      const listings = await storage.getAdminCardListings(req.params.id);
      res.json(listings);
    } catch (err) {
      res.status(500).json({ error: "Listing'ler yüklenemedi" });
    }
  });

  app.post("/api/admin/cards/:id/listings", requireAdmin, async (req, res) => {
    try {
      const { condition, price, stock, isActive } = req.body;
      if (!condition || price == null || stock == null) {
        return res.status(400).json({ error: "condition, price ve stock gerekli" });
      }
      const listing = await storage.createAdminCardListing({
        cardId: req.params.id,
        condition,
        price: String(price),
        stock: Number(stock),
        isActive: isActive !== false,
      });
      res.status(201).json(listing);
    } catch (err) {
      res.status(500).json({ error: "Listing oluşturulamadı" });
    }
  });

  app.put("/api/admin/cards/:id/listings/:listingId", requireAdmin, async (req, res) => {
    try {
      const { price, stock, isActive } = req.body;
      if (price == null || stock == null) {
        return res.status(400).json({ error: "price ve stock gerekli" });
      }
      const listing = await storage.updateAdminCardListingById(req.params.listingId, {
        price: String(price),
        stock: Number(stock),
        isActive: isActive !== false,
      });
      if (!listing) return res.status(404).json({ error: "Listing bulunamadı" });
      res.json(listing);
    } catch (err) {
      res.status(500).json({ error: "Listing güncellenemedi" });
    }
  });

  app.delete("/api/admin/cards/:id/listings/:listingId", requireAdmin, async (req, res) => {
    try {
      await storage.deleteAdminCardListing(req.params.listingId);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Listing silinemedi" });
    }
  });

  app.get("/api/admin/card-sets", requireAdmin, async (req, res) => {
    try {
      const { gameId } = req.query as Record<string, string>;
      const sets = await storage.getAdminCardSets(gameId || undefined);
      res.json(sets);
    } catch (err) {
      res.status(500).json({ error: "Setler yüklenemedi" });
    }
  });

  app.post("/api/admin/card-sets", requireAdmin, async (req, res) => {
    try {
      const { gameId, name, series, logoUrl, symbolUrl, releaseDate, isActive } = req.body;
      if (!gameId || !name) return res.status(400).json({ error: "gameId ve name gerekli" });
      const slug = name.toLowerCase()
        .replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
      const set = await storage.createAdminCardSet({
        gameId, name, slug: slug || `set-${Date.now()}`,
        series: series || null,
        logoUrl: logoUrl || null,
        symbolUrl: symbolUrl || null,
        releaseDate: releaseDate || null,
        isActive: isActive !== false,
      });
      res.status(201).json(set);
    } catch (err) {
      console.error("[admin] createAdminCardSet:", err);
      res.status(500).json({ error: "Set oluşturulamadı" });
    }
  });

  app.put("/api/admin/card-sets/:id", requireAdmin, async (req, res) => {
    try {
      const { isActive } = req.body;
      const updated = await storage.updateAdminCardSet(req.params.id, { isActive });
      if (!updated) return res.status(404).json({ error: "Set bulunamadı" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Set güncellenemedi" });
    }
  });

  app.delete("/api/admin/card-sets/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteAdminCardSet(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Set silinemedi" });
    }
  });

  app.get("/api/admin/cards/:id/price-reference", requireAdmin, async (req, res) => {
    try {
      const price = await storage.getCardPriceReference(req.params.id);
      res.json(price);
    } catch (err) {
      res.status(500).json({ error: "Fiyat referansı yüklenemedi" });
    }
  });

  app.get("/api/admin/card-games", requireAdmin, async (req, res) => {
    try {
      const games = await storage.getAdminCardGames();
      res.json(games);
    } catch (err) {
      res.status(500).json({ error: "Oyunlar yüklenemedi" });
    }
  });

  // ── Public TCG routes ─────────────────────────────────────────────────────

  app.get("/api/card-games", async (_req, res) => {
    try {
      const games = await storage.listCardGames();
      res.json(games);
    } catch (err) {
      res.status(500).json({ error: "Oyunlar yüklenemedi" });
    }
  });

  app.get("/api/card-sets", async (req, res) => {
    try {
      const gameSlug = req.query.game as string | undefined;
      const sets = await storage.getCardSetsPublic(gameSlug);
      res.json(sets);
    } catch (err) {
      res.status(500).json({ error: "Setler yüklenemedi" });
    }
  });

  app.get("/api/card-sets/:slug", async (req, res) => {
    try {
      const cardSet = await storage.getCardSetPublicBySlug(req.params.slug);
      if (!cardSet) return res.status(404).json({ error: "Set bulunamadı" });
      res.json(cardSet);
    } catch (err) {
      res.status(500).json({ error: "Set yüklenemedi" });
    }
  });

  app.get("/api/cards", async (req, res) => {
    try {
      const {
        game, set, setId, rarity, type, condition, search, sort, page, limit,
        minPrice, maxPrice, featured, inStock,
      } = req.query as Record<string, string>;
      const result = await storage.getCardsPublic({
        gameSlug: game || undefined,
        setSlug: set || undefined,
        ...(setId ? { setId } : {}),
        rarity: rarity || undefined,
        cardType: type || undefined,
        condition: condition || undefined,
        search: search || undefined,
        sort: (sort as any) || 'newest',
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 24,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        featured: featured === 'true' ? true : undefined,
        inStock: inStock === 'true' ? true : undefined,
      });
      res.json(result);
    } catch (err) {
      console.error("[TCG] getCardsPublic error:", err);
      res.status(500).json({ error: "Kartlar yüklenemedi" });
    }
  });

  app.get("/api/cards/rarities", async (req, res) => {
    try {
      const game = req.query.game as string | undefined;
      const rarities = await storage.getRaritiesByGame(game);
      res.json(rarities);
    } catch (err) {
      res.status(500).json({ error: "Rarities yüklenemedi" });
    }
  });

  app.get("/api/cards/types", async (req, res) => {
    try {
      const game = req.query.game as string | undefined;
      const types = await storage.getCardTypesPublic(game);
      res.json(types);
    } catch (err) {
      res.status(500).json({ error: "Tipler yüklenemedi" });
    }
  });

  app.get("/api/cards/by-ids", async (req, res) => {
    try {
      const idsParam = req.query.ids as string;
      if (!idsParam) return res.json([]);
      const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 6);
      if (ids.length === 0) return res.json([]);
      const result = await storage.getCardsByIds(ids);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Kartlar yüklenemedi" });
    }
  });

  app.get("/api/cards/:slug", async (req, res) => {
    try {
      const card = await storage.getCardPublicBySlug(req.params.slug);
      if (!card) return res.status(404).json({ error: "Kart bulunamadı" });
      res.json(card);
    } catch (err) {
      console.error("[TCG] getCardPublicBySlug error:", err);
      res.status(500).json({ error: "Kart yüklenemedi" });
    }
  });

  app.get("/api/cards/:slug/similar", async (req, res) => {
    try {
      const card = await storage.getCardPublicBySlug(req.params.slug);
      if (!card) return res.status(404).json({ error: "Kart bulunamadı" });
      const similar = await storage.getSimilarCards(card.id, card.set_id);
      res.json(similar);
    } catch (err) {
      res.status(500).json({ error: "Benzer kartlar yüklenemedi" });
    }
  });

  // ── Blog / Rehber (public) ─────────────────────────────────────────────────

  app.get("/api/blog", async (_req, res) => {
    try {
      const posts = await storage.getBlogPosts({ status: "published" });
      res.json(posts);
    } catch (err) {
      res.status(500).json({ error: "Blog yazıları yüklenemedi" });
    }
  });

  app.get("/api/blog/:slug", async (req, res) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      if (!post || post.status !== "published")
        return res.status(404).json({ error: "Yazı bulunamadı" });
      res.json(post);
    } catch (err) {
      res.status(500).json({ error: "Blog yazısı yüklenemedi" });
    }
  });

  // ── Blog / Rehber (admin) ─────────────────────────────────────────────────

  app.get("/api/admin/blog", requireAdmin, async (_req, res) => {
    try {
      const posts = await storage.getBlogPosts();
      res.json(posts);
    } catch (err) {
      res.status(500).json({ error: "Blog yazıları yüklenemedi" });
    }
  });

  app.post("/api/admin/blog", requireAdmin, async (req, res) => {
    try {
      const { insertBlogPostSchema } = await import("@shared/schema");
      const body = insertBlogPostSchema.parse(req.body);
      const post = await storage.createBlogPost(body);
      res.status(201).json(post);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Yazı oluşturulamadı" });
    }
  });

  app.patch("/api/admin/blog/:id", requireAdmin, async (req, res) => {
    try {
      const { insertBlogPostSchema } = await import("@shared/schema");
      const partial = insertBlogPostSchema.partial().parse(req.body);
      const post = await storage.updateBlogPost(req.params.id, partial);
      if (!post) return res.status(404).json({ error: "Yazı bulunamadı" });
      res.json(post);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Yazı güncellenemedi" });
    }
  });

  app.delete("/api/admin/blog/:id", requireAdmin, async (req, res) => {
    try {
      const ok = await storage.deleteBlogPost(req.params.id);
      if (!ok) return res.status(404).json({ error: "Yazı bulunamadı" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Yazı silinemedi" });
    }
  });

  // ── AI blog generation ────────────────────────────────────────────────────
  app.get("/api/admin/blog/ai/status", requireAdmin, aiStatusHandler);
  app.post("/api/admin/blog/ai/topics", requireAdmin, aiTopicsHandler);
  app.post("/api/admin/blog/ai/generate", requireAdmin, aiGenerateHandler);
  app.post("/api/admin/blog/ai/cover", requireAdmin, aiCoverHandler);

  return httpServer;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function notifyAdminNewReview(payload: AdminReviewNotificationPayload): Promise<void> {
  try {
    await Promise.allSettled([
      sendAdminReviewNotificationEmail(payload),
      sendReviewPendingToAdmin({
        productName: payload.productName,
        rating: payload.rating,
        comment: payload.content,
        reviewerName: payload.authorName,
      }),
    ]);
  } catch (error) {
    console.error('[Reviews] notifyAdminNewReview unexpected:', error);
  }
}
