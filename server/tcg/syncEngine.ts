/**
 * TCG Sync Engine
 * Orchestrates set/card import from Pokemon TCG API and Riftbound (RiftCodex).
 * Creates and manages exactly ONE tcg_sync_run record per call.
 *
 * Modes:
 *   full   — sets + cards + local image download (recommended, used by admin UI)
 *   sets   — set metadata only
 *   cards  — card data + local image download (sets must already exist)
 *   prices — PriceCharting price sync only
 */

import { storage } from "../storage";
import {
  fetchPokemonSets,
  fetchPokemonCardsBySet,
  mapPokemonSetToDb,
  mapPokemonCardToDb,
} from "./pokemonAdapter";
import {
  fetchRiftboundSets,
  fetchRiftboundCardsBySet,
  mapRiftboundSetToDb,
  mapRiftboundCardToDb,
} from "./riftboundAdapter";
import {
  searchPriceCharting,
  mapPriceToDb,
  sleep,
  RATE_DELAY_MS,
} from "./priceChartingService";
import { downloadCardImage, downloadSetImage } from "./imageDownloader";

export type SyncGame = "pokemon_tcg" | "riftbound";
export type SyncMode = "sets" | "cards" | "prices" | "full";

export interface SyncOptions {
  game: SyncGame;
  mode: SyncMode;
  setApiId?: string;
  pokemonApiKey?: string;
  pricechartingApiKey?: string;
  /** If provided, engine uses this existing run record instead of creating a new one. */
  existingRunId?: string;
  onProgress?: (msg: string) => void;
}

export interface SyncResult {
  runId: string;
  status: "completed" | "failed";
  stats: {
    setsProcessed: number;
    cardsProcessed: number;
    cardsInserted: number;
    cardsUpdated: number;
    imagesDownloaded: number;
    imagesSkipped: number;
    pricesUpdated: number;
    errors: number;
  };
  errors: Array<{ context: string; message: string }>;
}

async function getGameId(slug: "pokemon" | "riftbound"): Promise<string> {
  const games = await storage.listCardGames();
  const game = games.find((g) => g.slug === slug);
  if (!game) throw new Error(`Oyun bulunamadı: slug="${slug}". Veritabanında card_games seeded mi?`);
  return game.id;
}

/**
 * Run a TCG sync.
 * If opts.existingRunId is provided, reuses that run record (avoids duplication).
 * Otherwise creates a new run record.
 */
export async function runTcgSync(opts: SyncOptions): Promise<SyncResult> {
  const run = opts.existingRunId
    ? { id: opts.existingRunId }
    : await storage.createTcgSyncRun({
        game: opts.game,
        mode: opts.mode,
        status: "running",
        setApiId: opts.setApiId ?? null,
        stats: {},
        errors: [],
      });

  const stats = {
    setsProcessed: 0,
    cardsProcessed: 0,
    cardsInserted: 0,
    cardsUpdated: 0,
    imagesDownloaded: 0,
    imagesSkipped: 0,
    pricesUpdated: 0,
    errors: 0,
  };
  const errors: Array<{ context: string; message: string }> = [];

  const log = (msg: string) => {
    opts.onProgress?.(msg);
    console.log(`[tcg-sync:${run.id}] ${msg}`);
  };

  try {
    if (opts.mode === "full") {
      // Full sync: sets → cards (with image download)
      await syncSets(opts, stats, errors, log);
      await syncCards(opts, stats, errors, log, true);
    } else if (opts.mode === "sets") {
      await syncSets(opts, stats, errors, log);
    } else if (opts.mode === "cards") {
      await syncCards(opts, stats, errors, log, true);
    } else if (opts.mode === "prices") {
      await syncPrices(opts, stats, errors, log);
    }

    await storage.completeTcgSyncRun(run.id, "completed", stats, errors);
    return { runId: run.id, status: "completed", stats, errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push({ context: "sync-engine", message: msg });
    stats.errors++;
    await storage.completeTcgSyncRun(run.id, "failed", stats, errors);
    return { runId: run.id, status: "failed", stats, errors };
  }
}

async function syncSets(
  opts: SyncOptions,
  stats: SyncResult["stats"],
  errors: SyncResult["errors"],
  log: (m: string) => void,
) {
  if (opts.game === "pokemon_tcg") {
    log("Pokemon TCG setlerini çekiyor…");
    const gameId = await getGameId("pokemon");
    const sets = await fetchPokemonSets(opts.pokemonApiKey);
    log(`${sets.length} set bulundu`);

    for (const set of sets) {
      // When a set filter is requested, skip all non-matching sets
      if (opts.setApiId && set.id !== opts.setApiId) continue;
      try {
        // Download logo + symbol first, then single upsert with both local URLs
        const baseData = mapPokemonSetToDb(set, gameId);
        let logoUrl = baseData.logoUrl;
        let symbolUrl = baseData.symbolUrl;

        if (set.images?.logo) {
          const { localUrl } = await downloadSetImage(set.images.logo, `${baseData.slug}-logo`);
          logoUrl = localUrl || logoUrl;
        }
        if (set.images?.symbol) {
          const { localUrl } = await downloadSetImage(set.images.symbol, `${baseData.slug}-symbol`);
          symbolUrl = localUrl || symbolUrl;
        }

        await storage.upsertCardSet({ ...baseData, logoUrl, symbolUrl });
        stats.setsProcessed++;
      } catch (err) {
        errors.push({ context: `set:${set.id}`, message: String(err) });
        stats.errors++;
      }
    }
  } else if (opts.game === "riftbound") {
    log("Riftbound setlerini çekiyor (api.riftcodex.com)…");
    const gameId = await getGameId("riftbound");
    const sets = await fetchRiftboundSets();
    log(`${sets.length} set bulundu`);

    for (const set of sets) {
      try {
        await storage.upsertCardSet(mapRiftboundSetToDb(set, gameId));
        stats.setsProcessed++;
      } catch (err) {
        errors.push({ context: `set:${set.set_id}`, message: String(err) });
        stats.errors++;
      }
    }
  }
  log(`Set sync tamamlandı: ${stats.setsProcessed} set işlendi`);
}

async function syncCards(
  opts: SyncOptions,
  stats: SyncResult["stats"],
  errors: SyncResult["errors"],
  log: (m: string) => void,
  downloadImages = true,
) {
  const gameSlug = opts.game === "pokemon_tcg" ? "pokemon" : "riftbound";
  const gameId = await getGameId(gameSlug);
  const apiSource = opts.game === "pokemon_tcg" ? "pokemon_tcg" : "riftbound";

  const setsToProcess = opts.setApiId
    ? [await storage.getCardSetByApiId(opts.setApiId, apiSource)].filter(Boolean)
    : await storage.listCardSetsByGame(gameId);

  if (setsToProcess.length === 0) {
    throw new Error(
      "İşlenecek set bulunamadı. Önce set sync'i çalıştırın veya 'full' modunu kullanın.",
    );
  }

  log(`${setsToProcess.length} set için kart import başlıyor…`);

  for (const set of setsToProcess) {
    if (!set) continue;
    try {
      log(`Set işleniyor: ${set.name} (apiId: ${set.apiId})`);

      const rawCards =
        opts.game === "pokemon_tcg"
          ? await fetchPokemonCardsBySet(set.apiId!, opts.pokemonApiKey)
          : await fetchRiftboundCardsBySet(set.apiId!);

      log(`  ${rawCards.length} kart bulundu`);

      for (const raw of rawCards) {
        try {
          const dbData =
            opts.game === "pokemon_tcg"
              ? mapPokemonCardToDb(raw as any, set.id)
              : mapRiftboundCardToDb(raw as any, set.id);

          const result = await storage.upsertCard(dbData);
          if (result.inserted) stats.cardsInserted++;
          else stats.cardsUpdated++;
          stats.cardsProcessed++;

          // ── Download card image locally ──────────────────────────────────
          if (downloadImages && dbData.imageUrl) {
            const { localUrl, skipped } = await downloadCardImage(
              dbData.imageUrl,
              result.card.slug,
              gameSlug,
            );
            // Always persist local URL when it's a local path — covers both
            // new downloads AND re-syncs where the file already existed on disk
            // but the DB was overwritten by upsertCard with an external URL.
            if (localUrl.startsWith("/cards/")) {
              await storage.updateCardImageUrl(result.card.id, localUrl);
              if (!skipped) stats.imagesDownloaded++;
              else stats.imagesSkipped++;
            } else {
              // Download failed — kept external URL, count as skipped
              stats.imagesSkipped++;
            }

            // Also download hi-res if different from main image
            if (dbData.imageUrlHiRes && dbData.imageUrlHiRes !== dbData.imageUrl) {
              await downloadCardImage(
                dbData.imageUrlHiRes,
                `${result.card.slug}-hires`,
                gameSlug,
              );
            }
          }
        } catch (err) {
          errors.push({ context: `card:${(raw as any).id}`, message: String(err) });
          stats.errors++;
        }
      }
      stats.setsProcessed++;

      // Log image progress every set
      if (downloadImages) {
        log(`  Resimler: ${stats.imagesDownloaded} indirildi, ${stats.imagesSkipped} atlandı`);
      }
    } catch (err) {
      errors.push({ context: `set:${set.name}`, message: String(err) });
      stats.errors++;
    }
  }

  log(`Kart sync tamamlandı: ${stats.cardsInserted} eklendi, ${stats.cardsUpdated} güncellendi`);
  if (downloadImages) {
    log(`Resim indirme: ${stats.imagesDownloaded} indirildi, ${stats.imagesSkipped} atlandı`);
  }
}

async function syncPrices(
  opts: SyncOptions,
  stats: SyncResult["stats"],
  errors: SyncResult["errors"],
  log: (m: string) => void,
) {
  if (!opts.pricechartingApiKey) {
    throw new Error("PriceCharting API key gerekli. Ayarlar → site_settings → pricecharting_api_key.");
  }

  log("PriceCharting fiyat güncellemesi başlıyor…");
  const allCards = await storage.listAllActiveCards();
  log(`${allCards.length} kart için fiyat çekilecek`);

  for (const card of allCards) {
    try {
      const product = await searchPriceCharting(card.name, opts.pricechartingApiKey!);
      if (product) {
        const priceData = mapPriceToDb(card.id, product);
        await storage.upsertCardPrice({
          cardId: priceData.cardId,
          source: priceData.source,
          priceMarket: priceData.priceMarket,
          priceLow: priceData.priceLow,
          priceHigh: priceData.priceHigh,
          currency: priceData.currency,
        });
        stats.pricesUpdated++;
      }
      await sleep(RATE_DELAY_MS);
    } catch (err) {
      errors.push({ context: `price:${card.name}`, message: String(err) });
      stats.errors++;
    }
  }

  log(`Fiyat sync tamamlandı: ${stats.pricesUpdated} fiyat güncellendi`);
}
