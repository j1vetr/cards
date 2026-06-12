import { z } from "zod";
import { Request, Response, NextFunction } from "express";

export function firstZodMessage(err: z.ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "Geçersiz istek verisi";
  const field = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${field}${issue.message}`;
}

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: firstZodMessage(result.error) });
    }
    req.body = result.data;
    next();
  };
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export const adminLoginSchema = z.object({
  username: z.string().min(1, "Kullanıcı adı zorunludur").max(100),
  password: z.string().min(1, "Şifre zorunludur").max(200),
});

export const userLoginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(1, "Şifre zorunludur").max(200),
});

export const registerWriteSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı").max(200),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token zorunludur").max(200),
  newPassword: z.string().min(6, "Şifre en az 6 karakter olmalı").max(200),
});

export const profileUpdateSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().min(10, "Geçerli bir telefon girin").max(30).optional(),
  whatsappOptIn: z.boolean().optional(),
}).refine(d => Object.keys(d).length > 0, { message: "En az bir alan gerekli" });

export const addressCreateSchema = z.object({
  title: z.string().max(100).optional(),
  firstName: z.string().min(1, "Ad zorunludur").max(100),
  lastName: z.string().min(1, "Soyad zorunludur").max(100),
  phone: z.string().min(10, "Geçerli bir telefon girin").max(30),
  address: z.string().min(5, "Adres zorunludur").max(500),
  city: z.string().min(1, "İl zorunludur").max(100),
  district: z.string().min(1, "İlçe zorunludur").max(100),
  postalCode: z.string().max(20).optional(),
  isDefault: z.boolean().optional(),
});

export const addressUpdateSchema = addressCreateSchema.partial();

// ─── Admin: Categories ───────────────────────────────────────────────────────

export const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

// ─── Admin: Products ─────────────────────────────────────────────────────────

export const productUpdateSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  slug: z.string().min(1).max(300).optional(),
  description: z.string().max(10000).optional().nullable(),
  basePrice: z.union([z.string(), z.number()]).transform(String).optional(),
  categoryId: z.string().optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  discountBadge: z.string().max(50).optional().nullable(),
  images: z.array(z.string()).optional(),
  availableSizes: z.array(z.string()).optional(),
  availableColors: z.array(z.unknown()).optional(),
  attributes: z.record(z.unknown()).optional().nullable(),
}).passthrough();

export const bulkPriceSchema = z.object({
  action: z.enum(["set", "increase", "decrease", "percent_increase", "percent_decrease"]),
  value: z.union([z.string(), z.number()]).transform(v => Number(v)),
  categoryId: z.string().optional(),
  productIds: z.array(z.string()).optional(),
  autoBadge: z.boolean().optional(),
  badgeText: z.string().max(50).optional(),
});

export const bulkBadgeSchema = z.object({
  productIds: z.array(z.string()).min(1, "Ürün seçimi zorunludur"),
  badge: z.string().max(50).optional().nullable(),
});

export const variantUpdateSchema = z.object({
  size: z.string().max(50).optional().nullable(),
  color: z.string().max(100).optional().nullable(),
  colorHex: z.string().max(20).optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  price: z.union([z.string(), z.number()]).transform(String).optional(),
  stock: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// ─── Cart ────────────────────────────────────────────────────────────────────

export const cartUpdateSchema = z.object({
  quantity: z.number().int().min(1, "Miktar en az 1 olmalı").max(999),
});

// ─── Admin: Orders ───────────────────────────────────────────────────────────

const ORDER_STATUSES = [
  "pending", "confirmed", "processing", "shipped", "delivered",
  "completed", "cancelled", "refunded",
] as const;

export const orderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES, { errorMap: () => ({ message: "Geçersiz sipariş durumu" }) }),
  trackingNumber: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

export const orderTrackingSchema = z.object({
  trackingNumber: z.string().max(100).optional(),
  trackingUrl: z.string().url({ message: "Geçerli bir URL girin" }).optional().or(z.literal("")),
  shippingCarrier: z.string().max(100).optional(),
});

export const orderUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
  trackingNumber: z.string().max(100).optional().nullable(),
  trackingUrl: z.string().max(500).optional().nullable(),
  shippingCarrier: z.string().max(100).optional().nullable(),
}).passthrough();

export const orderNoteSchema = z.object({
  content: z.string().min(1, "Not içeriği zorunludur").max(2000),
  isInternal: z.boolean().optional(),
});

export const orderCancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

// ─── Admin: Coupons ──────────────────────────────────────────────────────────

export const couponWriteSchema = z.object({
  code: z.string().min(2, "Kupon kodu en az 2 karakter olmalı").max(50)
    .transform(s => s.toUpperCase()),
  description: z.string().max(500).optional().nullable(),
  discountType: z.enum(["percentage", "fixed"], { errorMap: () => ({ message: "İndirim türü: percentage veya fixed" }) }),
  discountValue: z.union([z.string(), z.number()]).transform(String),
  isActive: z.boolean().optional(),
  minOrderAmount: z.union([z.string(), z.number()]).transform(String).optional().nullable(),
  maxUsageCount: z.number().int().min(0).optional().nullable(),
  startsAt: z.union([z.string(), z.date()]).optional().nullable(),
  expiresAt: z.union([z.string(), z.date()]).optional().nullable(),
  isInfluencerCode: z.boolean().optional(),
  influencerName: z.string().max(200).optional().nullable(),
  influencerInstagram: z.string().max(100).optional().nullable(),
  commissionType: z.enum(["percentage", "per_use"]).optional().nullable(),
  commissionValue: z.union([z.string(), z.number()]).transform(String).optional().nullable(),
}).passthrough();

export const couponUpdateSchema = couponWriteSchema.partial();

// ─── Admin: Inventory ────────────────────────────────────────────────────────

export const inventoryBulkUpdateSchema = z.object({
  updates: z.array(z.object({
    variantId: z.string().min(1),
    stock: z.number().int().min(0, "Stok negatif olamaz"),
  })).min(1, "En az bir güncelleme gerekli"),
});

// ─── Admin: Campaigns ────────────────────────────────────────────────────────

export const campaignWriteSchema = z.object({
  name: z.string().min(1, "Kampanya adı zorunludur").max(200),
  campaignType: z.string().max(50).optional(),
  status: z.string().max(30).optional(),
  description: z.string().max(2000).optional().nullable(),
  startsAt: z.union([z.string(), z.date()]).optional().nullable(),
  endsAt: z.union([z.string(), z.date()]).optional().nullable(),
  subject: z.string().max(300).optional().nullable(),
  emailContent: z.string().max(100000).optional().nullable(),
}).passthrough();

export const campaignUpdateSchema = campaignWriteSchema.partial();

// ─── Admin: Settings ─────────────────────────────────────────────────────────

export const settingsWriteSchema = z.object({}).passthrough();

export const testEmailSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
});

// ─── Admin: Credentials ──────────────────────────────────────────────────────

export const updateCredentialsSchema = z.object({
  newUsername: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalı").max(100),
  newPassword: z.string().min(8, "Şifre en az 8 karakter olmalı").max(200),
});

// ─── Admin: Dealers ──────────────────────────────────────────────────────────

export const dealerWriteSchema = z.object({
  name: z.string().min(1, "Firma adı zorunludur").max(200),
  email: z.string().email("Geçerli bir e-posta girin"),
  phone: z.string().min(10, "Geçerli bir telefon girin").max(30),
  contactPerson: z.string().min(1, "Yetkili kişi adı zorunludur").max(200),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(["active", "inactive", "pending"]).optional(),
});

export const dealerUpdateSchema = dealerWriteSchema.partial();

// ─── Admin: Quotes ───────────────────────────────────────────────────────────

export const quoteWriteSchema = z.object({
  dealerId: z.string().min(1, "Bayi seçimi zorunludur"),
  validUntil: z.union([z.string(), z.date()]).optional().nullable(),
  paymentTerms: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  includesVat: z.boolean().optional(),
  items: z.array(z.object({
    productId: z.string().optional(),
    variantId: z.string().optional().nullable(),
    productName: z.string().min(1).max(300),
    productSku: z.string().max(100).optional().nullable(),
    productImage: z.string().max(500).optional().nullable(),
    variantDetails: z.string().max(500).optional().nullable(),
    quantity: z.number().int().min(1),
    unitPrice: z.union([z.string(), z.number()]).transform(String),
    discountPercent: z.union([z.string(), z.number()]).optional(),
  })).optional(),
});

export const quoteUpdateSchema = quoteWriteSchema.partial();

export const quoteStatusSchema = z.object({
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"], {
    errorMap: () => ({ message: "Geçersiz teklif durumu" }),
  }),
});

// ─── Admin: Size Charts ──────────────────────────────────────────────────────

export const sizeChartWriteSchema = z.object({
  categoryId: z.string().min(1, "Kategori seçimi zorunludur"),
  columns: z.array(z.string()).optional(),
  rows: z.array(z.array(z.string())).optional(),
});

export const sizeChartUpdateSchema = z.object({
  columns: z.array(z.string()).optional(),
  rows: z.array(z.array(z.string())).optional(),
});

// ─── Admin: Menu Items ───────────────────────────────────────────────────────

export const menuItemWriteSchema = z.object({
  title: z.string().min(1, "Başlık zorunludur").max(200),
  type: z.enum(["category", "link", "group"], {
    errorMap: () => ({ message: "Tür: category, link veya group olmalı" }),
  }),
  categoryId: z.string().optional().nullable(),
  url: z.string().max(500).optional().nullable(),
  parentId: z.string().optional().nullable(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  openInNewTab: z.boolean().optional(),
});

export const menuItemUpdateSchema = menuItemWriteSchema.partial();

export const menuReorderSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    displayOrder: z.number().int(),
    parentId: z.string().optional().nullable(),
  })).min(1, "Sıralama listesi boş olamaz"),
});

// ─── Admin: WooCommerce ──────────────────────────────────────────────────────

export const woocommerceSettingsSchema = z.object({
  siteUrl: z.string().url("Geçerli bir WooCommerce URL'si girin"),
  consumerKey: z.string().min(1, "Consumer key zorunludur"),
  consumerSecret: z.string().min(1, "Consumer secret zorunludur"),
  isActive: z.boolean().optional(),
});

export const woocommerceTestSchema = z.object({
  siteUrl: z.string().url("Geçerli bir URL girin"),
  consumerKey: z.string().min(1),
  consumerSecret: z.string().min(1),
});

// ─── Admin: iyzico ───────────────────────────────────────────────────────────

export const iyzicoCredentialsSchema = z.object({
  apiKey: z.string().min(1, "API anahtarı zorunludur"),
  secretKey: z.string().min(1, "Gizli anahtar zorunludur"),
  sandbox: z.boolean().optional(),
});

// ─── Admin: Init ─────────────────────────────────────────────────────────────

export const adminInitSchema = z.object({
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalı").max(100),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı").max(200),
});

// ─── Influencer Coupons ──────────────────────────────────────────────────────

export const influencerBulkSchema = z.object({
  influencers: z.array(z.object({
    code: z.string().min(2).max(50),
    name: z.string().max(200).optional(),
    instagram: z.string().max(100).optional(),
    customerDiscount: z.number().min(0).max(100).optional(),
    commissionPercent: z.number().min(0).max(100).optional(),
  })).min(1, "En az bir influencer gerekli"),
});

// ─── Payment ─────────────────────────────────────────────────────────────────

export const paymentCreateSchema = z.object({
  customerName: z.string().min(1, "Ad Soyad zorunludur").max(200),
  customerEmail: z.string().email("Geçerli bir e-posta girin"),
  customerPhone: z.string().min(10, "Telefon zorunludur").max(30),
  address: z.string().min(5, "Adres zorunludur").max(500),
  city: z.string().min(1, "İl zorunludur").max(100),
  district: z.string().min(1, "İlçe zorunludur").max(100),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  couponCode: z.string().max(50).optional().nullable(),
  createAccount: z.boolean().optional().nullable(),
  accountPassword: z.string().max(200).optional().nullable(),
}).passthrough();

// ─── Admin: WhatsApp test ─────────────────────────────────────────────────────

export const whatsappTestSchema = z.object({
  phone: z.string().min(10, "Geçerli bir telefon numarası girin"),
  message: z.string().max(1000).optional(),
});

// ─── Admin: confirm/reject bank transfer ─────────────────────────────────────

export const confirmBankTransferSchema = z.object({
  paymentReference: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
}).passthrough();

export const rejectBankTransferSchema = z.object({
  reason: z.string().max(500).optional(),
}).passthrough();
