---
name: Wholesale "explode at payment" invariant
description: Why a wholesale "seri" stays ONE cart row and is only exploded into per-variant order rows at payment time.
---

# Wholesale "seri" stays one cart row; explode only at payment

A wholesale series (`wholesale_series.sizeDistribution = [{size, quantity}]`) is sold
as ONE unit priced PER PIECE. The cart holds exactly ONE row per series
(`cart_items.itemType='wholesale'`, `seriesId` set). It is NOT pre-expanded into
per-size rows in the cart.

The single expansion point is `expandCartLinesToOrderItems()` in `server/routes.ts`,
called by BOTH `/api/payment/create` and `/api/payment/bank-transfer` right before
the order/pendingPayment is built. It turns one wholesale row into N per-variant
order lines (sizeQty × setCount each).

**Why:** This keeps the existing stock-deduct / stock-restore / idempotency / callback
/ cancel paths completely untouched — they only ever see normal per-variant order
items and never need to know wholesale exists. Pre-expanding in the cart would force
every one of those paths to special-case series grouping.

**How to apply:**
- Never persist exploded wholesale rows in `cart_items`. Keep one row; expand at payment.
- Any NEW order-creation path must call `expandCartLinesToOrderItems` (and re-verify the
  buyer is a live `customerType='wholesale'` account) or it will leak/mis-price wholesale.
  The legacy `POST /api/orders` path is gated to reject `itemType==='wholesale'` for this
  reason.
- A wholesale row whose `seriesId` is null (series deleted — `ON DELETE SET NULL`) must
  ERROR at expansion, never fall through to the retail branch (which would re-enable
  coupons + the bank-transfer 10% and price at basePrice×1).
- v1 rules: mixed retail+wholesale carts are forbidden; no coupons and no bank-transfer
  10% discount on any cart containing wholesale.
