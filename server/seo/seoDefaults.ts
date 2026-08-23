/**
 * Bu modül artık yalnızca shared/seoText.ts'i yeniden dışa aktarır, böylece
 * SSR (bu dosyanın tüketicileri) ve SPA (client/src/components/SEO.tsx)
 * BİREBİR aynı çözümleme mantığını (kırpma uzunlukları, boşsa varsayılana
 * düşme) kullanır. Yeni SEO çözümleme kuralı eklerken shared/seoText.ts'i
 * güncelleyin, burayı değil.
 */
export {
  resolveSeoTitle,
  resolveSeoDescription,
  resolveSeoH1,
  resolveSeoIntro,
  truncateSeoText,
} from "../../shared/seoText";
