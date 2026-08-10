---
name: iyzico marketplace subMerchantKey
description: When the iyzico account is a marketplace (pazaryeri) member merchant, every basket item in a payment request must carry subMerchantKey — otherwise checkout fails in production only.
---

If the iyzico merchant account is registered as a **marketplace (pazaryeri) üye işyeri**, iyzico rejects any
checkout-form request whose basket contains even one line without `subMerchantKey`
("Marketplace üye işyeri için ürün ödemesinde bütün sepet kırılımlarında subMerchantKey gönderilmelidir").
This includes synthetic lines such as the shipping ("Kargo") row — not just product rows.

Normal (single-seller) accounts must NOT send the field at all; sending it there causes its own errors.
So marketplace mode is a per-account switch, stored as a site setting and left empty by default,
rather than a hardcoded constant.

**Why:** the same code path succeeds against a standard test/merchant account and fails only in production
if the live account happens to be marketplace-registered, which makes this look like a credentials problem
when it is actually a payload-shape problem.

**How to apply:** whenever a new line is appended to an iyzico basket (shipping, service fee, gift wrap,
discount surrogate, etc.), it must go through the same helper that attaches `subMerchantKey` /
`subMerchantPrice`. Never push a raw basket item directly.
