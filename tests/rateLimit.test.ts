import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import rateLimit from 'express-rate-limit';

function createLimitedApp(max: number) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());

  const limiter = rateLimit({
    windowMs: 60_000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çok fazla istek' },
  });

  app.post('/api/auth/login', limiter, (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}

describe('IP-based rate limiting — 429 after limit exceeded', () => {
  it('allows requests below the limit', async () => {
    const app = createLimitedApp(5);
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '203.0.113.1');
      expect(res.status).toBe(200);
    }
  });

  it('returns 429 on the request that exceeds the limit', async () => {
    const app = createLimitedApp(3);
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '203.0.113.2');
    }
    const blocked = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '203.0.113.2');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBeTruthy();
  });

  it('includes rate-limit headers on success responses', async () => {
    const app = createLimitedApp(10);
    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '203.0.113.3');
    expect(res.status).toBe(200);
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
  });

  it('tracks each IP address independently', async () => {
    const app = createLimitedApp(2);
    const IP_A = '10.1.1.1';
    const IP_B = '10.1.1.2';

    // Exhaust IP_A limit
    await request(app).post('/api/auth/login').set('X-Forwarded-For', IP_A);
    await request(app).post('/api/auth/login').set('X-Forwarded-For', IP_A);
    const blockedA = await request(app).post('/api/auth/login').set('X-Forwarded-For', IP_A);
    expect(blockedA.status).toBe(429);

    // IP_B has its own window — should still be allowed
    const okB = await request(app).post('/api/auth/login').set('X-Forwarded-For', IP_B);
    expect(okB.status).toBe(200);
  });

  it('rateLimit.ts limiters skip when NODE_ENV=test (prevents false positives in CI)', async () => {
    const { authLimiter } = await import('../server/rateLimit');

    const app = express();
    app.set('trust proxy', 1);
    app.use(express.json());
    app.post('/login', authLimiter, (_req, res) => res.json({ ok: true }));

    for (let i = 0; i < 15; i++) {
      const res = await request(app).post('/login').set('X-Forwarded-For', '1.2.3.4');
      expect(res.status).toBe(200);
    }
  });
});
