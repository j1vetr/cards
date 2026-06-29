/**
 * Shared HTTP utilities for TCG adapters.
 * Provides fetch with retry/backoff for transient failures (429, 5xx).
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;

export interface FetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch a URL with automatic retry + exponential backoff.
 * Throws on permanent failures (4xx except 429, network errors).
 * Retries on transient failures: 429, 500, 502, 503, 504.
 */
export async function httpFetchWithRetry(
  url: string,
  opts: FetchOptions,
): Promise<any> {
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        headers: opts.headers,
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Transient failures — retry
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        if (attempt < MAX_RETRIES) {
          const retryAfter = res.headers.get("Retry-After");
          const delay = retryAfter
            ? Math.min(parseInt(retryAfter, 10) * 1000, 30_000)
            : INITIAL_BACKOFF_MS * 2 ** attempt;
          console.warn(`[http-retry] ${res.status} for ${url} — retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
          await sleep(delay);
          continue;
        }
        throw new Error(`HTTP ${res.status} (${res.statusText}) — ${MAX_RETRIES} retries exhausted: ${url}`);
      }

      // Permanent client errors
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} (${res.statusText}): ${url}`);
      }

      return res.json();
    } catch (err) {
      clearTimeout(timer);

      // AbortError (timeout) — retry
      if (err instanceof Error && err.name === "AbortError") {
        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_BACKOFF_MS * 2 ** attempt;
          console.warn(`[http-retry] timeout for ${url} — retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
          await sleep(delay);
          continue;
        }
        throw new Error(`Request timed out after ${MAX_RETRIES} retries: ${url}`);
      }

      // Network errors — retry
      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_BACKOFF_MS * 2 ** attempt;
        console.warn(`[http-retry] network error for ${url} — retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
        await sleep(delay);
        continue;
      }

      throw err;
    }
  }

  // Should never reach here
  throw new Error(`Unexpected end of retry loop: ${url}`);
}
