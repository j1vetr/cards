import { describe, it, expect, vi, beforeEach } from 'vitest';
import { insertRedirectSchema, updateRedirectSchema } from '../shared/schema';
import { LEGACY_URL_DECISIONS } from '../shared/legacyUrlDecisions';

// server/seo/appShell.ts pulls in `storage`, which opens a real DB pool at
// import time. Mock it so resolveRedirectDecision is testable in isolation.
const getRedirectByFromPath = vi.fn();
vi.mock('../server/storage', () => ({
  storage: { getRedirectByFromPath: (...args: any[]) => getRedirectByFromPath(...args) },
}));

describe('insertRedirectSchema — internal-path-only, 301 invariant', () => {
  it('accepts a valid 301 with an internal target', () => {
    const parsed = insertRedirectSchema.safeParse({
      fromPath: '/urun/eski-slug',
      toPath: '/set/riftbound-sfd',
      statusCode: 301,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a 301 with no target', () => {
    const parsed = insertRedirectSchema.safeParse({
      fromPath: '/urun/eski-slug',
      toPath: null,
      statusCode: 301,
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects an external redirect target (open-redirect protection)', () => {
    const parsed = insertRedirectSchema.safeParse({
      fromPath: '/urun/eski-slug',
      toPath: 'https://evil.example.com/phish',
      statusCode: 301,
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a protocol-relative redirect target', () => {
    const parsed = insertRedirectSchema.safeParse({
      fromPath: '/urun/eski-slug',
      toPath: '//evil.example.com',
      statusCode: 301,
    });
    expect(parsed.success).toBe(false);
  });

  it('normalizes a trailing slash on fromPath', () => {
    const parsed = insertRedirectSchema.safeParse({
      fromPath: '/kategori/jeans/',
      toPath: null,
      statusCode: 410,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.fromPath).toBe('/kategori/jeans');
  });

  it('accepts a 410 with no target', () => {
    const parsed = insertRedirectSchema.safeParse({
      fromPath: '/kategori/jeans',
      toPath: null,
      statusCode: 410,
    });
    expect(parsed.success).toBe(true);
  });

  it('updateRedirectSchema allows a partial patch without the 301 invariant (route layer re-checks it against the merged row)', () => {
    const parsed = updateRedirectSchema.safeParse({ note: 'güncellendi' });
    expect(parsed.success).toBe(true);
  });
});

describe('LEGACY_URL_DECISIONS — audited decision list integrity', () => {
  it('has no redirect chains (no fromPath is also used as a toPath)', () => {
    const fromPaths = new Set(LEGACY_URL_DECISIONS.map((d) => d.fromPath));
    for (const decision of LEGACY_URL_DECISIONS) {
      if (decision.toPath) {
        expect(fromPaths.has(decision.toPath)).toBe(false);
      }
    }
  });

  it('every 301 decision has a real internal target; every 410 has none', () => {
    for (const decision of LEGACY_URL_DECISIONS) {
      if (decision.statusCode === 301) {
        expect(decision.toPath).toBeTruthy();
        expect(decision.toPath!.startsWith('/')).toBe(true);
      }
      if (decision.statusCode === 410) {
        expect(decision.toPath).toBeNull();
      }
    }
  });

  it('has no duplicate fromPath entries', () => {
    const fromPaths = LEGACY_URL_DECISIONS.map((d) => d.fromPath);
    expect(new Set(fromPaths).size).toBe(fromPaths.length);
  });
});

describe('resolveRedirectDecision — 301/404/410 precedence and query-string safety', () => {
  beforeEach(() => {
    getRedirectByFromPath.mockReset();
  });

  it('resolves the static /magaza alias to a 301 without touching the DB', async () => {
    const { resolveRedirectDecision } = await import('../server/seo/appShell');
    const decision = await resolveRedirectDecision('/magaza');
    expect(decision).toEqual({ status: 301, to: '/kartlar' });
    expect(getRedirectByFromPath).not.toHaveBeenCalled();
  });

  it('returns a 301 decision for a DB row with a target', async () => {
    getRedirectByFromPath.mockResolvedValue({ statusCode: 301, toPath: '/set/riftbound-sfd' });
    const { resolveRedirectDecision } = await import('../server/seo/appShell');
    const decision = await resolveRedirectDecision('/urun/eski-slug');
    expect(decision).toEqual({ status: 301, to: '/set/riftbound-sfd' });
  });

  it('returns a 410 decision for a gone row, even if the path would otherwise still resolve', async () => {
    getRedirectByFromPath.mockResolvedValue({ statusCode: 410, toPath: null });
    const { resolveRedirectDecision } = await import('../server/seo/appShell');
    const decision = await resolveRedirectDecision('/kategori/jeans');
    expect(decision).toEqual({ status: 410 });
  });

  it('returns a 404 decision for a row explicitly marked 404, overriding a known route', async () => {
    getRedirectByFromPath.mockResolvedValue({ statusCode: 404, toPath: null });
    const { resolveRedirectDecision } = await import('../server/seo/appShell');
    const decision = await resolveRedirectDecision('/kategori/playmat');
    expect(decision).toEqual({ status: 404 });
  });

  it('returns null when there is no row for the path', async () => {
    getRedirectByFromPath.mockResolvedValue(undefined);
    const { resolveRedirectDecision } = await import('../server/seo/appShell');
    const decision = await resolveRedirectDecision('/kategori/playmat');
    expect(decision).toBeNull();
  });

  it('normalizes a trailing slash before the DB lookup', async () => {
    getRedirectByFromPath.mockResolvedValue({ statusCode: 410, toPath: null });
    const { resolveRedirectDecision } = await import('../server/seo/appShell');
    await resolveRedirectDecision('/kategori/jeans/');
    expect(getRedirectByFromPath).toHaveBeenCalledWith('/kategori/jeans');
  });
});
