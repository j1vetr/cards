import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  validateBody,
  cartUpdateSchema,
  orderStatusUpdateSchema,
  profileUpdateSchema,
  addressCreateSchema,
  couponWriteSchema,
  menuItemWriteSchema,
} from '../server/validation';

function createApp() {
  const app = express();
  app.use(express.json());

  app.patch('/cart', validateBody(cartUpdateSchema), (_req, res) => {
    res.json({ ok: true });
  });

  app.patch('/order-status', validateBody(orderStatusUpdateSchema), (_req, res) => {
    res.json({ ok: true });
  });

  app.patch('/profile', validateBody(profileUpdateSchema), (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/address', validateBody(addressCreateSchema), (_req, res) => {
    res.status(201).json({ ok: true });
  });

  app.post('/coupon', validateBody(couponWriteSchema), (_req, res) => {
    res.status(201).json({ ok: true });
  });

  app.post('/menu-item', validateBody(menuItemWriteSchema), (_req, res) => {
    res.status(201).json({ ok: true });
  });

  return app;
}

const app = createApp();

describe('Zod input validation — 400 on bad input', () => {
  describe('PATCH /cart — cartUpdateSchema', () => {
    it('rejects missing quantity', async () => {
      const res = await request(app).patch('/cart').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it('rejects quantity = 0', async () => {
      const res = await request(app).patch('/cart').send({ quantity: 0 });
      expect(res.status).toBe(400);
    });

    it('rejects fractional quantity', async () => {
      const res = await request(app).patch('/cart').send({ quantity: 1.5 });
      expect(res.status).toBe(400);
    });

    it('accepts valid quantity', async () => {
      const res = await request(app).patch('/cart').send({ quantity: 3 });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('PATCH /order-status — orderStatusUpdateSchema', () => {
    it('rejects invalid status string', async () => {
      const res = await request(app).patch('/order-status').send({ status: 'INVALID' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it('rejects missing status', async () => {
      const res = await request(app).patch('/order-status').send({});
      expect(res.status).toBe(400);
    });

    it('accepts valid status', async () => {
      const res = await request(app).patch('/order-status').send({ status: 'shipped' });
      expect(res.status).toBe(200);
    });

    it('accepts status with optional trackingNumber', async () => {
      const res = await request(app)
        .patch('/order-status')
        .send({ status: 'processing', trackingNumber: 'TRK-123' });
      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /profile — profileUpdateSchema', () => {
    it('rejects empty body (no fields provided)', async () => {
      const res = await request(app).patch('/profile').send({});
      expect(res.status).toBe(400);
    });

    it('rejects phone number that is too short', async () => {
      const res = await request(app).patch('/profile').send({ phone: '123' });
      expect(res.status).toBe(400);
    });

    it('accepts partial update with valid field', async () => {
      const res = await request(app).patch('/profile').send({ firstName: 'Ahmet' });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /address — addressCreateSchema', () => {
    const valid = {
      firstName: 'Ahmet',
      lastName: 'Yılmaz',
      phone: '05551234567',
      address: 'Atatürk Cad. No:1 Daire:2',
      city: 'Istanbul',
      district: 'Kadıköy',
    };

    it('rejects missing required fields', async () => {
      const res = await request(app).post('/address').send({ firstName: 'Ahmet' });
      expect(res.status).toBe(400);
    });

    it('rejects address that is too short', async () => {
      const res = await request(app).post('/address').send({ ...valid, address: 'ab' });
      expect(res.status).toBe(400);
    });

    it('accepts a fully valid address', async () => {
      const res = await request(app).post('/address').send(valid);
      expect(res.status).toBe(201);
    });
  });

  describe('POST /coupon — couponWriteSchema', () => {
    it('rejects missing code', async () => {
      const res = await request(app).post('/coupon').send({ discountType: 'percentage', discountValue: 10 });
      expect(res.status).toBe(400);
    });

    it('rejects code that is too short', async () => {
      const res = await request(app).post('/coupon').send({ code: 'A', discountType: 'percentage', discountValue: 10 });
      expect(res.status).toBe(400);
    });

    it('rejects invalid discountType', async () => {
      const res = await request(app).post('/coupon').send({ code: 'SUMMER20', discountType: 'invalid', discountValue: 10 });
      expect(res.status).toBe(400);
    });

    it('accepts valid coupon data', async () => {
      const res = await request(app)
        .post('/coupon')
        .send({ code: 'SUMMER20', discountType: 'percentage', discountValue: 20 });
      expect(res.status).toBe(201);
    });
  });

  describe('POST /menu-item — menuItemWriteSchema', () => {
    it('rejects missing title', async () => {
      const res = await request(app).post('/menu-item').send({ type: 'link', url: '/abc' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid type', async () => {
      const res = await request(app).post('/menu-item').send({ title: 'Home', type: 'invalid' });
      expect(res.status).toBe(400);
    });

    it('accepts valid group item', async () => {
      const res = await request(app).post('/menu-item').send({ title: 'Kadın', type: 'group' });
      expect(res.status).toBe(201);
    });
  });
});
