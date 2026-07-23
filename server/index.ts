import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

app.set('trust proxy', 1);
app.use(compression());
app.use(cookieParser());

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Eager olarak pazaryeri şifreleme anahtarını doğrula. Production'da
  // MARKETPLACE_ENCRYPTION_KEY yoksa burada throw eder ve sunucu açılmaz.
  try {
    const { assertEncryptionKeyConfigured } = await import("./marketplaces/crypto");
    assertEncryptionKeyConfigured();
  } catch (err) {
    console.error("[index] FATAL — marketplace encryption key check failed:", err);
    throw err;
  }

  const { maintenanceMiddleware } = await import("./maintenance");
  app.use(maintenanceMiddleware());

  await registerRoutes(httpServer, app);

  // WhatsApp şablonları: önceki varsayılanları yeni şablonlara yükselt
  // (admin tarafından özelleştirilenler korunur)
  try {
    const { upgradeOldDefaultTemplates } = await import("./whatsappService");
    await upgradeOldDefaultTemplates();
  } catch (err) {
    console.error("[index] WhatsApp default-template upgrade failed:", err);
  }

  // products tablosuna game_id, product_type, stock ve linked_set_id kolonlarını idempotent ekle
  try {
    const { db } = await import("./db");
    const { sql: sqlTag } = await import("drizzle-orm");
    await db.execute(sqlTag`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS game_id VARCHAR REFERENCES card_games(id),
        ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'other',
        ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS linked_set_id VARCHAR REFERENCES card_sets(id)
    `);
    console.log("[migrate] products.game_id + product_type + stock + linked_set_id ensured");
  } catch (err) {
    console.error("[migrate] products column migration failed:", err);
  }

  // cards tablosuna attacks ve abilities jsonb kolonlarını idempotent ekle
  try {
    const { db } = await import("./db");
    const { sql: sqlTag } = await import("drizzle-orm");
    await db.execute(sqlTag`
      ALTER TABLE cards
        ADD COLUMN IF NOT EXISTS attacks JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS abilities JSONB DEFAULT '[]'
    `);
    console.log("[migrate] cards.attacks + abilities ensured");
  } catch (err) {
    console.error("[migrate] cards attacks/abilities migration failed:", err);
  }

  // Aksesuar kategorilerini idempotent olarak seed et
  try {
    const { db } = await import("./db");
    const { categories } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");
    const accessorySeeds = [
      { name: "Aksesuarlar", slug: "aksesuarlar", displayOrder: 50 },
      { name: "Binder",      slug: "binder",      displayOrder: 51 },
      { name: "Sleeve",      slug: "sleeve",      displayOrder: 52 },
      { name: "Playmat",     slug: "playmat",     displayOrder: 53 },
    ];
    for (const cat of accessorySeeds) {
      const existing = await db.select().from(categories).where(eq(categories.slug, cat.slug)).limit(1);
      if (existing.length === 0) {
        await db.insert(categories).values(cat);
        console.log(`[seed] category created: ${cat.slug}`);
      }
    }
  } catch (err) {
    console.error("[index] accessory category seed failed:", err);
  }

  // blog_posts tablosunu idempotent oluştur
  try {
    const { db } = await import("./db");
    const { sql: sqlTag } = await import("drizzle-orm");
    await db.execute(sqlTag`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        summary TEXT,
        cover_image_url TEXT,
        content TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'general',
        status TEXT NOT NULL DEFAULT 'draft',
        meta_title TEXT,
        meta_description TEXT,
        published_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    // Add faq_items column if missing (idempotent)
    await db.execute(sqlTag`
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS faq_items JSONB DEFAULT NULL
    `);
    console.log("[migrate] blog_posts table ensured");
  } catch (err) {
    console.error("[migrate] blog_posts migration failed:", err);
  }

  // Pazaryeri senkron zamanlayıcısı (Trendyol delta saatlik / full 03:00)
  try {
    const { startScheduler } = await import("./scheduler");
    startScheduler();
  } catch (err) {
    console.error("[index] failed to start marketplace scheduler:", err);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const isProduction = process.env.NODE_ENV === 'production';

    console.error(`[error] ${status} — ${message}`, isProduction ? '' : err.stack || '');

    if (!res.headersSent) {
      res.status(status).json({ message: isProduction && status === 500 ? "Sunucu hatası oluştu" : message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
