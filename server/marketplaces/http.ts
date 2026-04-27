/**
 * Pazaryeri adapter'ları için ortak HTTP helper:
 *  - Basic auth header üretimi
 *  - User-Agent zorunluluğu (Trendyol header denetlemesi)
 *  - Retry (3 deneme, exponential backoff) — sadece retryable hatalarda
 *  - Rate-limit gözetimi (basit token-bucket; dakikada N istek)
 */

import { MarketplaceError } from "./types";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

interface ClientOptions {
  baseUrl: string;
  basicAuthUser: string;
  basicAuthPass: string;
  userAgent: string;
  /** Dakika başına izin verilen istek sayısı. */
  rateLimitPerMinute?: number;
}

/** Basit token bucket — saniyede yeniden dolar. */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  constructor(private readonly perMinute: number) {
    this.tokens = perMinute;
    this.lastRefill = Date.now();
  }
  async take(): Promise<void> {
    while (true) {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      // 100 ms bekle, tekrar dene
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  private refill() {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    if (elapsedMs <= 0) return;
    const refillRate = this.perMinute / 60_000; // token / ms
    this.tokens = Math.min(this.perMinute, this.tokens + elapsedMs * refillRate);
    this.lastRefill = now;
  }
}

export class MarketplaceHttpClient {
  private readonly authHeader: string;
  private readonly limiter: RateLimiter;

  constructor(private readonly opts: ClientOptions) {
    const credentials = `${opts.basicAuthUser}:${opts.basicAuthPass}`;
    this.authHeader = `Basic ${Buffer.from(credentials, "utf8").toString("base64")}`;
    this.limiter = new RateLimiter(opts.rateLimitPerMinute ?? 600);
  }

  async request<T = unknown>(pathOrUrl: string, options: RequestOptions = {}): Promise<T> {
    const isAbsolute = /^https?:\/\//i.test(pathOrUrl);
    const url = isAbsolute
      ? pathOrUrl
      : `${this.opts.baseUrl.replace(/\/+$/, "")}/${pathOrUrl.replace(/^\/+/, "")}`;
    const method = options.method ?? "GET";

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      "User-Agent": this.opts.userAgent,
      Accept: "application/json",
      ...options.headers,
    };

    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    const maxAttempts = 3;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.limiter.take();
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
      try {
        const resp = await fetch(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        });
        clearTimeout(t);

        if (resp.status === 401 || resp.status === 403) {
          // Auth hataları retry edilmez
          const text = await safeText(resp);
          throw new MarketplaceError(
            `Marketplace auth failed (${resp.status}): ${text.slice(0, 200)}`,
            { statusCode: resp.status, retryable: false },
          );
        }

        if (resp.status === 429 || resp.status >= 500) {
          const text = await safeText(resp);
          throw new MarketplaceError(
            `Marketplace upstream ${resp.status}: ${text.slice(0, 200)}`,
            { statusCode: resp.status, retryable: true },
          );
        }

        if (!resp.ok) {
          const text = await safeText(resp);
          throw new MarketplaceError(
            `Marketplace request failed (${resp.status}): ${text.slice(0, 200)}`,
            { statusCode: resp.status, retryable: false },
          );
        }

        if (resp.status === 204) return undefined as T;

        const ct = resp.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          return (await resp.json()) as T;
        }
        return (await resp.text()) as unknown as T;
      } catch (err) {
        clearTimeout(t);
        lastErr = err;
        const retryable =
          err instanceof MarketplaceError
            ? err.retryable
            : err instanceof Error && err.name === "AbortError"
              ? true
              : true; // network errors -> retry

        if (!retryable || attempt === maxAttempts) break;
        const backoff = 400 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }

    if (lastErr instanceof MarketplaceError) throw lastErr;
    throw new MarketplaceError(
      `Marketplace request failed after retries: ${(lastErr as Error)?.message ?? String(lastErr)}`,
      { retryable: false },
    );
  }
}

async function safeText(resp: Response): Promise<string> {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}
