import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { CardCard } from '@/components/CardCard';
import { useCardSets, useCards } from '@/hooks/useTcg';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Package, Layers, HelpCircle, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const ACCENT = '#818cf8';
const ACCENT_DIM = 'rgba(129,140,248,0.12)';
const HERO_BG = 'linear-gradient(135deg, #07090f 0%, #0d0f1f 45%, #070a14 100%)';
const HERO_GLOWS = 'radial-gradient(ellipse at 20% 50%, rgba(129,140,248,0.16) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.10) 0%, transparent 55%)';

interface BoxProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: string;
  images: string[];
  isActive: boolean;
}

function useBoxProducts(gameSlug: string) {
  return useQuery<BoxProduct[]>({
    queryKey: ['boxes', gameSlug],
    queryFn: () => fetch(`/api/products/boxes?game=${encodeURIComponent(gameSlug)}`).then(r => r.json()),
    staleTime: 60_000,
  });
}

const FAQ_ITEMS = [
  {
    q: 'Riftbound TCG nedir?',
    a: 'Riftbound TCG, Riot Games tarafından League of Legends (LoL TCG) evrenine dayalı olarak geliştirilen stratejik kart oyunudur. Oyuncular şampiyonlardan oluşan desteler kurarak rakiplerine karşı mücadele eder.',
  },
  {
    q: 'Riftbound booster pack kaç kart içerir?',
    a: 'Riftbound booster pack içeriği sete göre değişmekle birlikte standart paketler genellikle 10–12 kart içerir. Kapalı Display Box ise 24–36 booster pack\'ten oluşur. Kesin içerik bilgisi her ürün sayfasında belirtilmektedir.',
  },
  {
    q: 'League of Legends kart oyunu (LoL TCG) nasıl oynanır?',
    a: 'League of Legends Riftbound TCG\'de her oyuncu bir şampiyon destesiyle oynar. Kartlar sıra tabanlı olarak oynanır; birimler, büyüler ve donanımlar aracılığıyla rakip şampiyonun can puanını sıfırlamak hedeflenir. Öğrenmesi kolay ama ustalaşması derin bir sistem sunar.',
  },
  {
    q: 'En değerli Riftbound kartları hangileridir?',
    a: 'En değerli Riftbound kartları genellikle ultra rare ve secret rare nadirlik seviyesindeki şampiyon kartlarıdır. Ahri, Jinx, Yasuo gibi popüler şampiyonların özel baskı versiyonları koleksiyoncular arasında en çok aranan Riftbound kartları arasındadır.',
  },
  {
    q: 'Riftbound tekli kart (single card) alabilir miyim?',
    a: 'Evet! Go|Cards olarak Riftbound tekli kart (single card) satışı yapıyoruz. Her kart NM, LP, MP veya HP koşuluyla ayrı ayrı listelenmektedir; böylece tournament destesi için ihtiyacınız olan belirli kartları satın alabilirsiniz.',
  },
];

export default function RiftboundPage() {
  const { data: sets = [], isLoading: setsLoading } = useCardSets('riftbound');
  const { data: cardsData, isLoading: cardsLoading } = useCards({ game: 'riftbound', limit: 8, sort: 'newest' });
  const { data: boxes = [], isLoading: boxesLoading } = useBoxProducts('riftbound');

  const cards = cardsData?.cards ?? [];

  const breadcrumbs = [
    { name: 'Ana Sayfa', url: '/' },
    { name: 'Riftbound TCG', url: '/riftbound' },
  ];

  return (
    <>
      <SEO
        title="League of Legends Riftbound TCG Ürünleri ve Kartları"
        description="Türkiye'nin LoL TCG mağazası Go|Cards. Riftbound booster pack, kapalı kutu ve tekli kart satışı. NM/LP/MP koşullu single card stoğu. Hızlı kargo, güvenli alışveriş."
        url="/riftbound"
        type="website"
        breadcrumbs={breadcrumbs}
      />

      <div className="min-h-screen flex flex-col" style={{ background: '#09090f' }}>
        <Header />

        {/* ── Hero ── */}
        <section
          className="relative overflow-hidden pt-16 pb-12 sm:pt-20 sm:pb-16"
          style={{ background: HERO_BG }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: HERO_GLOWS }} />
          <div className="relative max-w-[1200px] mx-auto px-5 sm:px-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-[11px] text-white/35 mb-6" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white/60 transition-colors">Ana Sayfa</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/55">Riftbound TCG</span>
            </nav>

            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
              {/* Logo */}
              <div className="shrink-0">
                <img
                  src="/logo-riftbound.png"
                  alt="League of Legends Riftbound TCG"
                  className="h-20 sm:h-28 w-auto object-contain"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>

              <div>
                {/* H1 — primary SEO target */}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight">
                  League of Legends Riftbound TCG<br />
                  <span style={{ color: ACCENT }}>Ürünleri ve Kartları</span>
                </h1>
                <p className="mt-3 text-sm sm:text-base text-white/55 max-w-2xl leading-relaxed">
                  Riot Games'in resmi League of Legends kart oyunu Riftbound TCG'nin tüm booster paketleri,
                  kapalı kutuları ve tek kartlarını Go|Cards'ta bulabilirsiniz. Türkiye'ye hızlı ve güvenli kargo.
                </p>

                <div className="flex flex-wrap gap-3 mt-5">
                  <Link href="/oyun/riftbound">
                    <button
                      className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                      style={{ background: ACCENT }}
                      data-testid="button-riftbound-all-cards"
                    >
                      Tüm Kartları Gör
                    </button>
                  </Link>
                  {sets.length > 0 && (
                    <a href="#setler">
                      <button
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-white/70 border border-white/15 hover:border-white/30 hover:text-white transition-all"
                        data-testid="button-riftbound-sets"
                      >
                        Setleri Gör
                      </button>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4 sm:gap-6 mt-10">
              {[
                { label: 'Aktif Set', value: sets.length || '—' },
                { label: 'Stokta Kart', value: cardsData?.total ?? '—' },
                { label: 'Kapalı Kutu', value: boxes.length || '—' },
              ].map(stat => (
                <div key={stat.label} className="flex flex-col gap-0.5">
                  <span className="text-xl font-extrabold text-white">{stat.value}</span>
                  <span className="text-[11px] text-white/35 font-medium">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <main className="flex-1 max-w-[1200px] mx-auto w-full px-5 sm:px-10 py-10 sm:py-14 space-y-16">

          {/* ── Booster Kutular ── */}
          {(boxesLoading || boxes.length > 0) && (
            <section aria-labelledby="heading-boxes">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 id="heading-boxes" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <Package className="w-5 h-5" style={{ color: ACCENT }} />
                    Riftbound Booster Kutular & Paketler
                  </h2>
                  <p className="text-sm text-white/40 mt-0.5">
                    League of Legends Riftbound TCG kapalı kutu ve booster pack satışı
                  </p>
                </div>
                <Link href="/magaza" className="text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: ACCENT }}>
                  Tümü <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {boxesLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {boxes.map(box => (
                    <Link key={box.id} href={`/urun/${box.slug}`} data-testid={`card-box-${box.id}`}>
                      <motion.div
                        whileHover={{ y: -3 }}
                        transition={{ duration: 0.18 }}
                        className="group rounded-2xl overflow-hidden border border-white/[0.07] hover:border-white/20 transition-colors"
                        style={{ background: 'rgba(255,255,255,0.03)' }}
                      >
                        <div className="aspect-square overflow-hidden bg-white/[0.03]">
                          {box.images?.[0] ? (
                            <img
                              src={box.images[0]}
                              alt={box.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-10 h-10 text-white/15" />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-[12px] font-semibold text-white/85 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                            {box.name}
                          </p>
                          <p className="mt-1.5 text-[13px] font-bold" style={{ color: ACCENT }}>
                            {parseFloat(box.basePrice).toLocaleString('tr-TR', { minimumFractionDigits: 0 })} ₺
                          </p>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Card Sets ── */}
          {(setsLoading || sets.length > 0) && (
            <section id="setler" aria-labelledby="heading-sets">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 id="heading-sets" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5" style={{ color: ACCENT }} />
                    Riftbound Kart Setleri
                  </h2>
                  <p className="text-sm text-white/40 mt-0.5">
                    League of Legends Riftbound TCG expansion setleri ve koleksiyonlar
                  </p>
                </div>
              </div>

              {setsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {sets.map(set => (
                    <Link key={set.id} href={`/set/${set.slug}`} data-testid={`card-set-${set.id}`}>
                      <motion.div
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.15 }}
                        className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.07] hover:border-white/20 transition-colors cursor-pointer"
                        style={{ background: ACCENT_DIM }}
                      >
                        <div className="h-10 w-full flex items-center justify-center">
                          {set.logo_url ? (
                            <img
                              src={set.logo_url}
                              alt={set.name}
                              className="max-h-10 max-w-[110px] object-contain"
                              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <img src="/icon-riftbound.svg" alt="" className="w-8 h-8 object-contain opacity-50" />
                          )}
                        </div>
                        <span className="text-[11px] text-white/60 text-center leading-tight group-hover:text-white/90 transition-colors">
                          {set.name}
                        </span>
                        {set.listed_cards > 0 && (
                          <span className="text-[10px] font-medium" style={{ color: ACCENT }}>
                            {set.listed_cards} kart stokta
                          </span>
                        )}
                      </motion.div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Tek Kartlar ── */}
          <section aria-labelledby="heading-cards">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 id="heading-cards" className="text-lg sm:text-xl font-bold text-white">
                  Riftbound Tek Kart Satışı
                </h2>
                <p className="text-sm text-white/40 mt-0.5">
                  League of Legends Riftbound TCG single card — NM, LP, MP koşullarında
                </p>
              </div>
              <Link
                href="/oyun/riftbound"
                className="text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
                style={{ color: ACCENT }}
              >
                Tümü <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {cardsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                ))}
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <img src="/icon-riftbound.svg" alt="" className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm text-white/35">Riftbound kartları yakında eklenecek.</p>
                <Link href="/oyun/riftbound">
                  <button className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors" style={{ background: ACCENT }}>
                    Oyuna Git
                  </button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {cards.map(card => (
                  <CardCard key={card.id} card={card} />
                ))}
              </div>
            )}

            {cards.length > 0 && (
              <div className="mt-8 text-center">
                <Link href="/oyun/riftbound">
                  <button
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                    style={{ background: 'rgba(129,140,248,0.15)', border: `1px solid ${ACCENT}44` }}
                    data-testid="button-riftbound-more-cards"
                  >
                    Tüm Riftbound Kartlarını Gör
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            )}
          </section>

          {/* ── SEO İçerik Bloku ── */}
          <section aria-labelledby="heading-about" className="rounded-2xl p-6 sm:p-8 border border-white/[0.06]" style={{ background: 'rgba(129,140,248,0.04)' }}>
            <h2 id="heading-about" className="text-base font-bold text-white mb-3">
              League of Legends Riftbound TCG Hakkında
            </h2>
            <div className="prose-invert text-sm text-white/55 leading-relaxed space-y-3 max-w-3xl">
              <p>
                <strong className="text-white/80">Riftbound TCG</strong>, Riot Games tarafından geliştirilen ve
                dünya genelinde milyonlarca oyuncuya hitap eden League of Legends evreninin resmi kart oyunudur.
                Oyuncular, tanıdık şampiyonları ve yetenekleri kullanarak stratejik desteler kurar ve rakiplerine
                meydan okur.
              </p>
              <p>
                Go|Cards olarak Riftbound TCG'nin tüm setlerini ve ürünlerini Türkiye'ye getiriyoruz.
                <strong className="text-white/80"> Booster paket</strong>,{' '}
                <strong className="text-white/80">kapalı kutu (Display Box)</strong> ve{' '}
                <strong className="text-white/80">single kart</strong> seçenekleriyle koleksiyonunuzu
                büyütebilir ya da tournament destesi için ihtiyacınız olan kartları tek tek satın alabilirsiniz.
              </p>
              <p>
                Tüm single kartlarımız koşul bilgisiyle (NM / LP / MP / HP) listelenmiştir. 500₺ ve üzeri
                siparişlerde kargo ücretsizdir.
              </p>
            </div>
          </section>

          {/* ── SSS ── */}
          <section aria-labelledby="heading-faq">
            <h2 id="heading-faq" className="text-lg sm:text-xl font-bold text-white mb-6 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" style={{ color: ACCENT }} />
              Sık Sorulan Sorular — Riftbound TCG
            </h2>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-white/[0.07] overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <summary
                    className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-semibold text-white/80 hover:text-white transition-colors list-none"
                    data-testid={`faq-summary-${i}`}
                  >
                    {item.q}
                    <ChevronRight className="w-4 h-4 text-white/30 group-open:rotate-90 transition-transform shrink-0 ml-3" />
                  </summary>
                  <div className="px-5 pb-4 text-sm text-white/50 leading-relaxed border-t border-white/[0.06] pt-3">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </section>

        </main>

        <Footer />
      </div>
    </>
  );
}
