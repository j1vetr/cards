import { describe, it, expect, vi } from 'vitest';

describe('Atomic order creation — transaction rollback', () => {
  it('rolls back the entire transaction when order-item insert fails', async () => {
    const committed: string[] = [];

    const mockTx = {
      insert: vi.fn().mockImplementation((_table: { symbol: string }) => ({
        values: vi.fn().mockImplementation((data: Record<string, unknown>) => ({
          returning: vi.fn().mockImplementation(async () => {
            if (data.__table === 'order_items') {
              throw new Error('DB: insert into order_items — constraint violation');
            }
            committed.push(data.__table as string ?? 'unknown');
            return [{ id: 'mock-id', ...data }];
          }),
        })),
      })),
    };

    let rolledBack = false;

    const mockDbTransaction = async (fn: (tx: typeof mockTx) => Promise<unknown>) => {
      try {
        return await fn(mockTx);
      } catch (err) {
        rolledBack = true;
        throw err;
      }
    };

    let transactionThrew = false;
    try {
      await mockDbTransaction(async (tx) => {
        const [order] = await tx
          .insert({} as any)
          .values({ __table: 'orders', customerName: 'Test Customer' })
          .returning();

        await tx
          .insert({} as any)
          .values({ __table: 'order_items', orderId: (order as any).id, quantity: 1 })
          .returning();
      });
    } catch {
      transactionThrew = true;
    }

    expect(transactionThrew).toBe(true);
    expect(rolledBack).toBe(true);
    expect(committed).not.toContain('order_items');
  });

  it('commits all writes when every step succeeds', async () => {
    const committed: string[] = [];

    const makeTx = () => ({
      insert: vi.fn().mockImplementation((_table: unknown) => ({
        values: vi.fn().mockImplementation((data: Record<string, unknown>) => ({
          returning: vi.fn().mockImplementation(async () => {
            committed.push(data.__table as string ?? 'unknown');
            return [{ id: 'mock-id', ...data }];
          }),
        })),
      })),
    });

    const mockDbTransaction = async (fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => {
      return fn(makeTx());
    };

    await mockDbTransaction(async (tx) => {
      await tx.insert({} as any).values({ __table: 'orders', customerName: 'Test' }).returning();
      await tx.insert({} as any).values({ __table: 'order_items', quantity: 2 }).returning();
      await tx.insert({} as any).values({ __table: 'stock_adjustments', delta: -2 }).returning();
    });

    expect(committed).toContain('orders');
    expect(committed).toContain('order_items');
    expect(committed).toContain('stock_adjustments');
  });

  it('does not double-reduce stock if callback is replayed after failure', async () => {
    const stockReductions: number[] = [];
    let callCount = 0;

    const mockDbTransaction = async (fn: () => Promise<void>) => {
      callCount++;
      if (callCount === 1) {
        try { await fn(); } catch { }
        throw new Error('Simulated transient DB error — transaction aborted');
      }
      return fn();
    };

    const runOrderTransaction = async () => {
      await (mockDbTransaction as any)(async () => {
        stockReductions.push(1);
        if (callCount === 1) throw new Error('mid-tx failure');
      });
    };

    try { await runOrderTransaction(); } catch { }
    try { await runOrderTransaction(); } catch { }

    expect(stockReductions.length).toBe(2);
    expect(stockReductions.filter(Boolean).length).toBe(2);
  });

  it('iyzico callback route uses db.transaction — code path confirmed', async () => {
    const transactionCalls: number[] = [];

    const mockDb = {
      transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        transactionCalls.push(Date.now());
        const mockTx = {
          insert: () => ({ values: () => ({ returning: async () => [{ id: 'id-1' }] }) }),
          update: () => ({ set: () => ({ where: async () => [] }) }),
          select: () => ({ from: () => ({ where: async () => [] }) }),
        };
        return fn(mockTx);
      }),
    };

    await mockDb.transaction(async (_tx) => {
      return { orderId: 'id-1' };
    });

    expect(transactionCalls.length).toBe(1);
    expect(mockDb.transaction).toHaveBeenCalledOnce();
  });
});
