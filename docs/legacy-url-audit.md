# Eski URL Denetimi ve 301/410 Karar Haritası

Bu belge, eski/indekslenmiş URL'ler için yapılan denetimi ve verilen kararları
kayıt altına alır. Kararların kendisi kodda değil `redirects` tablosunda
tutulur (bkz. `shared/schema.ts`, `server/seo/appShell.ts`); bu belge o
tablonun neden bu haliyle doldurulduğunu açıklayan denetim raporudur.

| Eski URL | Denetimde bulunan mevcut durum | Karar | Sonuç (final) URL |
|---|---|---|---|
| `/kategori/mermer` | Eski Ecarte Jeans giyim kategorisi, ürünsüz | 410 (kalıcı kaldırıldı, karşılığı yok) | — |
| `/kategori/pantolon` | Eski giyim kategorisi, ürünsüz | 410 | — |
| `/kategori/jeans` | Eski giyim kategorisi, ürünsüz | 410 | — |
| `/kategori/buyuk-beden-pantolon` | Eski giyim kategorisi, ürünsüz | 410 | — |
| `/kategori/ozel-seri` | Eski giyim kategorisi, ürünsüz | 410 | — |
| `/kategori/esofman` | Eski giyim kategorisi, ürünsüz | 410 | — |
| `/kategori/t-shirt` | Eski giyim kategorisi, ürünsüz | 410 | — |
| `/kategori/salvar-pantolon` | Eski giyim kategorisi, ürünsüz | 410 | — |
| `/kategori/sifir-kol-atlet` | Eski giyim kategorisi, ürünsüz | 410 | — |
| `/kategori/sort` | Eski giyim kategorisi, ürünsüz | 410 | — |
| `/kategori/tshirt` | Eski giyim kategorisi, ürünsüz | 410 | — |
| `/kategori/ceket` | Eski giyim kategorisi, ürünsüz | 410 | — |
| `/kategori/gomlek` | Eski giyim kategorisi, ürünsüz | 410 | — |
| `/kategori/kazak` | Eski giyim kategorisi, ürünsüz | 410 | — |
| `/kategori/kumas-pantolon` | Eski giyim kategorisi, ürünsüz | 410 | — |
| `/kategori/aksesuarlar` | Güncel TCG aksesuar kategorisi, canlı | Karar gerekmiyor — zaten doğru/canlı | `/kategori/aksesuarlar` (değişmedi) |
| `/kategori/binder` | Güncel TCG aksesuar kategorisi, canlı | Karar gerekmiyor — zaten doğru/canlı | `/kategori/binder` (değişmedi) |
| `/kategori/sleeve` | Güncel TCG aksesuar kategorisi, canlı | Karar gerekmiyor — zaten doğru/canlı | `/kategori/sleeve` (değişmedi) |
| `/kategori/playmat` | Güncel TCG aksesuar kategorisi, canlı — eski giyim serisiyle karışan bir isim değil, mağazanın kendi aksesuar kategorisi | Karar gerekmiyor — zaten doğru/canlı, 200 döndürüyor, redirect tablosuna bilinçli olarak eklenmedi (kendi kendine 301 anlamsız olurdu) | `/kategori/playmat` (değişmedi) |
| `/urun/riftbound-league-of-legends-tcg-set-2-spiritforged-booster-pack` | Eski ürün sayfası, ürün artık mevcut değil (`products` tablosu boş) | 301 — en yakın güncel karşılık: Spiritforged set sayfası | `/set/riftbound-sfd` |
| `/magaza` | Eski mağaza girişi, istemci tarafında zaten `/kartlar`'a yönlendiriliyordu | 301 (statik map, `server/seo/appShell.ts`) | `/kartlar` |
| `/league-of-legends-riftbound-tcg` | Eski oyun sayfası URL'i | 301 (doğrudan route, `server/routes.ts`) | `/riftbound` |

## İç link/görsel denetimi

Site içi crawl (ana sayfa, kategori, kart/set/oyun/blog sayfalarından örneklem
+ tüm bağlı `<a href>` ve `<img src>` referansları) sırasında kırık ürün
linki, kırık görsel veya boş `<a>` bulunmadı. Tespit edilen tek döküntü,
admin panelinin menü yönetimi tablosundaki (`menu_items`) yukarıdaki 15 eski
giyim kategorisine işaret eden 6 menü kaydıydı — bunlar canlı sitede
render edilmiyordu (menü özelliği henüz ön yüze bağlanmamış), ama admin
tarafında yanlış veri olarak durmasınlar diye kaldırıldı (bkz.
`server/index.ts` başlangıç temizliği).

## Kapsam dışı

- Host/domain normalizasyonu (`server/index.ts` içinde ayrıca çözülmüş).
- Yeni kategori mimarisi (aksesuar kategorileri için ayrı görev).
- SEO performans/mobil/erişilebilirlik denetimi (ayrı görev).
