// Riftbound / Pokémon "owner" sayfalarının (server/seo/render.ts render edilen
// SSR gövdesi VE client/src/pages/RiftboundPage.tsx + PokemonPage.tsx) FAQ ve
// rehber link içeriği için TEK kaynak. SSR ile SPA aynı FAQPage JSON-LD'yi
// üretmelidir (parite kuralı) — bu yüzden bu metinler burada bir kez
// tanımlanır ve her iki taraf da buradan import eder. Metni yalnızca burada
// güncelleyin; server/seo/render.ts veya sayfa bileşenlerinde ayrı bir kopya
// tutmayın.

export interface OwnerFaqItem {
  q: string;
  a: string;
}

export interface OwnerGuideLink {
  slug: string;
  title: string;
}

export const RIFTBOUND_OWNER_FAQ: OwnerFaqItem[] = [
  {
    q: "Riftbound TCG nedir?",
    a: "Riftbound TCG, Riot Games tarafından League of Legends (LoL TCG) evrenine dayalı olarak geliştirilen stratejik kart oyunudur. Oyuncular şampiyonlardan oluşan desteler kurarak rakiplerine karşı mücadele eder.",
  },
  {
    q: "Riftbound booster pack kaç kart içerir?",
    a: "Origins setinde standart bir Riftbound booster pack 14 kart içerir: 7 common, 3 uncommon, 2 rare veya üzeri ve 1 garantili foil kart. Kapalı Display Box ise 24 booster pack'ten oluşur. Kesin içerik bilgisi her ürün sayfasında belirtilmektedir.",
  },
  {
    q: "League of Legends kart oyunu (LoL TCG) nasıl oynanır?",
    a: "League of Legends Riftbound TCG'de her oyuncu bir champion legend kartı etrafında deste kurar. Oyuncular runes ile kartlarının maliyetini öder, units ve spells ile battlefield'ları ele geçirir. Tek oyunculu maçlarda 8 puana, takım oyununda 11 puana ilk ulaşan taraf kazanır.",
  },
  {
    q: "En değerli Riftbound kartları hangileridir?",
    a: "En değerli Riftbound kartları genellikle Epic nadirlik seviyesindeki, alt-art veya overnumbered varyantlı şampiyon kartlarıdır. Popüler şampiyonların özel baskı versiyonları koleksiyoncular arasında en çok aranan Riftbound kartları arasındadır.",
  },
  {
    q: "Riftbound tekli kart (single card) alabilir miyim?",
    a: "Evet. GoCards olarak Riftbound tekli kart (single card) satışı yapıyoruz. Her kart NM, LP, MP veya HP koşuluyla ayrı ayrı listelenmektedir, böylece tournament destesi için ihtiyacınız olan belirli kartları satın alabilirsiniz.",
  },
];

export const POKEMON_OWNER_FAQ: OwnerFaqItem[] = [
  {
    q: "Pokémon TCG nedir?",
    a: "Pokémon TCG, Pokémon evrenindeki canlıları ve eğitmenleri temsil eden kartlarla oynanan koleksiyonluk kart oyunudur. Oyuncular destelerini kurar, Pokémon'larını enerji kartlarıyla güçlendirerek rakip oyuncuya karşı mücadele eder.",
  },
  {
    q: "Pokémon booster pack kaç kart içerir?",
    a: "Standart bir Pokémon TCG booster pack genellikle 10-11 kart içerir. Bir Booster Box ise sete göre 36 booster pack'ten oluşur. Kesin içerik bilgisi her ürün sayfasında belirtilmektedir.",
  },
  {
    q: "Pokémon TCG'ye yeni başlayanlar nereden başlamalı?",
    a: "Yeni başlayanlar için güncel bir setten birkaç booster pack açmak ya da Elite Trainer Box gibi hazır bir başlangıç ürünüyle temel mekanikleri öğrenmek iyi bir başlangıçtır. Ardından ihtiyacınız olan belirli kartları tekli kart olarak tamamlayabilirsiniz.",
  },
  {
    q: "En değerli Pokémon kartları hangileridir?",
    a: "En değerli Pokémon kartları genellikle ultra rare, secret rare ve full art nadirlik seviyesindeki kartlardır. Popüler Pokémon'ların özel baskı versiyonları koleksiyoncular arasında en çok aranan kartlar arasındadır.",
  },
  {
    q: "Pokémon tekli kart (single card) alabilir miyim?",
    a: "Evet. GoCards olarak Pokémon tekli kart (single card) satışı yapıyoruz. Her kart NM, LP, MP veya HP koşuluyla ayrı ayrı listelenmektedir, böylece destenizde eksik olan belirli kartları satın alabilirsiniz.",
  },
];

export const RIFTBOUND_GUIDE_LINKS: OwnerGuideLink[] = [
  { slug: "riftbound-nedir", title: "Riftbound Nedir?" },
  { slug: "riftbound-nasil-oynanir", title: "Riftbound Nasıl Oynanır?" },
  { slug: "riftbound-kartlari", title: "Riftbound Kartları: Türler ve Nadirlikler" },
  { slug: "riftbound-booster-pack-nedir", title: "Riftbound Booster Pack Nedir?" },
  { slug: "riftbound-booster-box-nedir", title: "Riftbound Booster Box Nedir?" },
  { slug: "riftbound-champion-deck-nedir", title: "Champion Deck Nedir?" },
  { slug: "riftbound-setleri", title: "Riftbound Setleri" },
];

export const POKEMON_GUIDE_LINKS: OwnerGuideLink[] = [
  { slug: "pokemon-tcg-nedir", title: "Pokémon TCG Nedir?" },
  { slug: "pokemon-kartlari", title: "Pokémon Kartları: Türler ve Nadirlikler" },
  { slug: "pokemon-booster-pack-nedir", title: "Pokémon Booster Pack Nedir?" },
  { slug: "pokemon-booster-box-nedir", title: "Pokémon Booster Box Nedir?" },
  { slug: "pokemon-etb-nedir", title: "Elite Trainer Box (ETB) Nedir?" },
  { slug: "pokemon-kart-nasil-secilir", title: "Pokémon Kartı Nasıl Seçilir?" },
];
