/**
 * TCG Sync Engine
 * Orchestrates set/card import from Pokemon TCG API and Riftbound (RiftCodex).
 * Logs progress to tcg_sync_runs table.
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

export type SyncGame = "pokemon_tcg" | "riftbound";
export type SyncMode = "sets" | "cards" | "prices";

export interface SyncOptions {
  game: SyncGame;
  mode: SyncMode;
  setApiId?: string;    // if undefined and mode='cards': sync all sets for game
  pokemonApiKey?: string;
  pricechartingApiKey?: string;
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
    pricesUpdated: number;
    errors: number;
  };
  errors: Array<{ context: string; message: string }>;
}

async function getGameId(slug: "pokemon" | "riftbound"): Promise<string | null> {
  const games = await storage.listCardGames();
  const game = games.find((g) => g.slug === slug);
  return game?.id ?? null;
}

export async function runTcgSync(opts: SyncOptions): Promise<SyncResult> {
  const run = await storage.createTcgSyncRun({
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
    pricesUpdated: 0,
    errors: 0,
  };
  const errors: Array<{ context: string; message: string }> = [];

  const log = (msg: string) => {
    opts.onProgress?.(msg);
    console.log(`[tcg-sync] ${msg}`);
  };

  try {
    if (opts.mode === "sets") {
      await syncSets(opts, stats, errors, log);
    } else if (opts.mode === "cards") {
      await syncCards(opts, stats, errors, log);
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
    if (!gameId) throw new Error("Pokemon oyunu veritabanında bulunamadı");

    const sets = await fetchPokemonSets(opts.pokemonApiKey);
    log(`${sets.length} set bulundu`);

    for (const set of sets) {
      try {
        const dbData = mapPokemonSetToDb(set, gameId);
        await storage.upsertCardSet(dbData);
        stats.setsProcessed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ context: `set:${set.id}`, message: msg });
        stats.errors++;
      }
    }
  } else if (opts.game === "riftbound") {
    log("Riftbound setlerini çekiyor…");
    const gameId = await getGameId("riftbound");
    if (!gameId) throw new Error("Riftbound oyunu veritabanında bulunamadı");

    const sets = await fetchRiftboundSets();
    log(`${sets.length} set bulundu`);

    for (const set of sets) {
      try {
        const dbData = mapRiftboundSetToDb(set, gameId);
        await storage.upsertCardSet(dbData);
        stats.setsProcessed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ context: `set:${set.id}`, message: msg });
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
) {
  const gameSlug = opts.game === "pokemon_tcg" ? "pokemon" : "riftbound";
  const gameId = await getGameId(gameSlug);
  if (!gameId) throw new Error(`${opts.game} oyunu veritabanında bulunamadı`);

  const apiSource = opts.game === "pokemon_tcg" ? "pokemon_tcg" : "riftbound";
  const setsToProcess = opts.setApiId
    ? [await storage.getCardSetByApiId(opts.setApiId, apiSource)]
    : await storage.listCardSetsByGame(gameId);

  const validSets = setsToProcess.filter(Boolean) as Awaited<ReturnType<typeof storage.listCardSetsByGame>>;

  if (validSets.length === 0) {
    log("İşlenecek set bulunamadı. Önce set sync yapın.");
    return;
  }

  log(`${validSets.length} set için kart import başlıyor…`);

  for (const set of validSets) {
    if (!set) continue;
    try {
      log(`Set işleniyor: ${set.name} (${set.apiId})`);

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
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push({ context: `card:${(raw as any).id}`, message: msg });
          stats.errors++;
        }
      }
      stats.setsProcessed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ context: `set:${set.name}`, message: msg });
      stats.errors++;
    }
  }

  log(`Kart sync tamamlandı: ${stats.cardsInserted} eklendi, ${stats.cardsUpdated} güncellendi`);
}

async function syncPrices(
  opts: SyncOptions,
  stats: SyncResult["stats"],
  errors: SyncResult["errors"],
  log: (m: string) => void,
) {
  if (!opts.pricechartingApiKey) {
    throw new Error("PriceCharting API key gerekli. Ayarlar → pricecharting_api_key.");
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
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ context: `price:${card.name}`, message: msg });
      stats.errors++;
    }
  }

  log(`Fiyat sync tamamlandı: ${stats.pricesUpdated} fiyat güncellendi`);
}
