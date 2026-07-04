/**
 * TCG Card Image Downloader
 *
 * Downloads an external card image, optimises it to WebP via sharp,
 * and stores it under client/public/cards/{game}/{slug}.webp.
 *
 * Idempotent — if the local file already exists the download is skipped
 * and the existing local path is returned.
 *
 * Returns the local URL path (e.g. /cards/pokemon/pokemon-sv1-001.webp).
 * On any fetch/optimise failure the original external URL is returned so
 * the card still renders — the error is logged but does NOT abort the sync.
 */

import fs from "fs";
import path from "path";
import { optimizeImageBuffer } from "../imageOptimizer";

const PUBLIC_DIR = path.join(process.cwd(), "client", "public");

function localCardPath(game: string, slug: string): { abs: string; rel: string } {
  const dir = path.join(PUBLIC_DIR, "cards", game);
  const abs = path.join(dir, `${slug}.webp`);
  const rel = `/cards/${game}/${slug}.webp`;
  return { abs, rel };
}

function localSetPath(slug: string): { abs: string; rel: string } {
  const dir = path.join(PUBLIC_DIR, "cards", "sets");
  const abs = path.join(dir, `${slug}.webp`);
  const rel = `/cards/sets/${slug}.webp`;
  return { abs, rel };
}

function ensureDirSync(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "GoCards-ImageSync/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Download + optimise a card's main image.
 * @returns { localUrl, skipped } — skipped=true when the file already existed.
 */
export async function downloadCardImage(
  externalUrl: string | null | undefined,
  slug: string,
  game: string,
): Promise<{ localUrl: string; skipped: boolean }> {
  if (!externalUrl) return { localUrl: externalUrl ?? "", skipped: true };

  // Already a local path — nothing to do
  if (externalUrl.startsWith("/cards/")) {
    return { localUrl: externalUrl, skipped: true };
  }

  const { abs, rel } = localCardPath(game, slug);

  // File already on disk — skip download
  if (fs.existsSync(abs)) {
    return { localUrl: rel, skipped: true };
  }

  try {
    ensureDirSync(abs);
    const buffer = await fetchImageBuffer(externalUrl);
    const savedPath = await optimizeImageBuffer(buffer, abs, { maxWidth: 600, maxHeight: 840, quality: 82 });
    // Use actual saved path (may be .jpg fallback if WebP optimization failed)
    const localUrl = "/" + path.relative(PUBLIC_DIR, savedPath).replace(/\\/g, "/");
    return { localUrl, skipped: false };
  } catch (err) {
    console.error(`[img-dl] Failed to download card image for ${slug}: ${(err as Error).message}`);
    return { localUrl: externalUrl, skipped: true };
  }
}

/**
 * Download + optimise a set logo or symbol image.
 * @returns { localUrl, skipped }
 */
export async function downloadSetImage(
  externalUrl: string | null | undefined,
  slug: string,
): Promise<{ localUrl: string; skipped: boolean }> {
  if (!externalUrl) return { localUrl: externalUrl ?? "", skipped: true };
  if (externalUrl.startsWith("/cards/")) return { localUrl: externalUrl, skipped: true };

  const { abs, rel } = localSetPath(slug);

  if (fs.existsSync(abs)) return { localUrl: rel, skipped: true };

  try {
    ensureDirSync(abs);
    const buffer = await fetchImageBuffer(externalUrl);
    await optimizeImageBuffer(buffer, abs, { maxWidth: 400, maxHeight: 160, quality: 85 });
    return { localUrl: rel, skipped: false };
  } catch (err) {
    console.error(`[img-dl] Failed to download set image for ${slug}: ${(err as Error).message}`);
    return { localUrl: externalUrl, skipped: true };
  }
}
