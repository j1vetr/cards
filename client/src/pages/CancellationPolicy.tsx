import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronRight, RotateCcw, Clock, Package, CheckCircle, XCircle } from 'lucide-react';

const highlights = [
  { icon: RotateCcw, label: '14 Gün Cayma Hakkı', desc: 'Açılmamış ürünlerde geçerli' },
  { icon: Clock, label: '7 İş Günü', desc: 'Ücret iadesi süresi' },
  { icon: Package, label: 'Kolay İade', desc: 'Sealed & açılmamış ürünler' },
];

export default function CancellationPolicy() {
  return (
    <div className="min-h-screen" style={{ background: '#0b1120' }}>
      <SEO
        title="İptal ve İade Politikası - GoCards TCG"
        description="GoCards TCG ürün iade, değişim ve iptal koşulları."
      />
      <Header />

      <main className="pt-20 lg:pt-6 pb-16">
        <section
          className="px-4 sm:px-6 py-12 lg:py-16"
          style={{ background: 'rgba(255,255,255,0.025)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="max-w-4xl mx-auto">
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-xs text-white/35 mb-8"
            >
              <Link href="/" className="hover:text-white/70 transition-colors">Ana Sayfa</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/60">İptal ve İade Politikası</span>
            </motion.nav>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="text-xs tracking-[0.3em] uppercase text-indigo-400 mb-4 block font-semibold">
                İade & İptal
              </span>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
                İptal ve İade<br />
                <span className="text-white/35">Politikası</span>
              </h1>
              <p className="text-base text-white/55 max-w-2xl mb-10 leading-relaxed">
                Müşteri memnuniyeti önceliğimizdir. TCG ürünlerimize yönelik iade ve iptal
                süreçleri aşağıda açıklanmıştır.
              </p>

              <div className="grid sm:grid-cols-3 gap-4">
                {highlights.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="rounded-xl p-6 text-center transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(99,102,241,0.15)' }}>
                      <item.icon className="w-6 h-6 text-indigo-400" strokeWidth={1.75} />
                    </div>
                    <h3 className="font-semibold mb-1 text-white text-sm">{item.label}</h3>
                    <p className="text-xs text-white/50">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-12 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-4"
            >
              <div
                className="rounded-xl p-6"
                style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white">İade Edilebilir</h3>
                </div>
                <ul className="space-y-2 text-sm text-white/60">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    Açılmamış, orijinal ambalajında sealed ürünler (booster box, ETB, sealed paket)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    Shrink/wrapper'ı bozulmamış ürünler
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    Near Mint (NM) koşulunda, kullanılmamış tekli kartlar (teslimat hasarı durumunda)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    Fatura ile birlikte gönderilen ürünler
                  </li>
                </ul>
              </div>

              <div
                className="rounded-xl p-6"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)' }}>
                    <XCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <h3 className="font-semibold text-white">İade Edilemez</h3>
                </div>
                <ul className="space-y-2 text-sm text-white/60">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    Açılmış booster paket, booster box veya set ürünleri
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    Oynanmış, sleeve'den çıkarılmış tekli kartlar
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    Kart kondisyonuna ilişkin kişisel yorum farklılıkları (NM/LP arası subjektif değerlendirme)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    Fiyat değişimi gerekçesiyle yapılan iade talepleri
                  </li>
                </ul>
              </div>
            </motion.div>

            <div
              className="rounded-2xl p-6 sm:p-8 lg:p-10"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="prose max-w-none prose-headings:text-white prose-h2:text-base prose-h2:font-semibold prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-3 prose-h2:mb-4 prose-p:text-white/60 prose-li:text-white/60 prose-strong:text-white/90 prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline prose-ol:text-white/60 prose-ul:text-white/60">
                <h2>1) Genel İlkeler</h2>
                <ul>
                  <li>İade/iptal işlemleri 6502 sayılı Kanun ve Mesafeli Satış Sözleşmeleri Yönetmeliği'ne uygun şekilde yürütülür.</li>
                  <li>İşlem için sipariş numaranızı hazır bulundurunuz.</li>
                  <li>Tüm başvurular <a href="mailto:gocardshub@gmail.com">gocardshub@gmail.com</a> adresine yazılı olarak yapılmalıdır.</li>
                </ul>

                <h2>2) Sipariş İptali</h2>
                <ul>
                  <li><strong>Kargo çıkışından önce:</strong> Sipariş numaranızla birlikte <a href="mailto:gocardshub@gmail.com">gocardshub@gmail.com</a> adresine yazarak iptal talebinde bulunabilirsiniz. Mümkünse aynı gün işleme alınır.</li>
                  <li><strong>Kargo çıkışından sonra:</strong> İptal yapılamaz. Bu durumda <strong>iade</strong> süreci uygulanır.</li>
                </ul>

                <h2>3) Cayma Hakkı (14 Gün)</h2>
                <p>
                  <strong>Ürünü teslim aldığınız tarihten itibaren 14 gün içinde</strong> herhangi bir gerekçe göstermeksizin cayma hakkınızı kullanabilirsiniz.
                </p>
                <ul>
                  <li>Sealed ürünler açılmamış ve orijinal ambalajında olmalıdır.</li>
                  <li>Tekli kartlar oynanmamış, NM (Near Mint) koşulunda ve sleeve içinde teslim edildiği haliyle iade edilmelidir.</li>
                  <li>Fatura ve varsa promosyon ürünleri eksiksiz gönderilmelidir.</li>
                  <li>Cayma hakkı bildirimi <a href="mailto:gocardshub@gmail.com">gocardshub@gmail.com</a> adresine yazılı olarak yapılmalıdır.</li>
                </ul>

                <h2>4) İade Süreci</h2>
                <p>İade süreci şu şekilde işler:</p>
                <ol>
                  <li>İade talebinizi <a href="mailto:gocardshub@gmail.com">gocardshub@gmail.com</a> adresine iletin ve <strong>sipariş numaranızı</strong> belirtin.</li>
                  <li>Onay sonrası ürünü <strong>güvenli ambalajla</strong>, fatura ve aksesuarlarıyla birlikte paketleyin.</li>
                  <li>Belirtilen adrese kargo ile gönderin.</li>
                  <li>Ürün tarafımıza ulaştığında kontrol edilir.</li>
                  <li>Kontrol sonrası <strong>en geç 7 iş günü</strong> içinde ücret iadesi yapılır.</li>
                </ol>

                <h2>5) Ücret İadesi</h2>
                <ul>
                  <li>Ücret, ödeme yapılan yönteme (kredi kartı, banka kartı, havale) iade edilir.</li>
                  <li>İade, banka işlem sürelerine bağlı olarak hesabınıza 5–10 iş günü içinde yansıyabilir.</li>
                </ul>

                <h2>6) Hasarlı veya Hatalı Ürün</h2>
                <p>
                  Teslimat sırasında veya açılışta fark edilen hasar ya da yanlış ürün gönderimi durumunu <strong>24 saat</strong> içinde <a href="mailto:gocardshub@gmail.com">gocardshub@gmail.com</a> adresine bildirin. Fotoğraflı belge gönderilmesi süreci hızlandırır. Bu durumlarda kargo ücreti tarafımızca karşılanır.
                </p>

                <h2>7) Kargo Ücreti</h2>
                <ul>
                  <li><strong>Cayma hakkı kullanımında:</strong> Kargo ücreti alıcıya aittir.</li>
                  <li><strong>Hatalı/hasarlı ürün iadesi:</strong> Kargo ücreti tarafımızca karşılanır.</li>
                </ul>

                <h2>8) İletişim</h2>
                <p>İade ve iptal işlemleri için destek ekibimize ulaşabilirsiniz:</p>
                <ul>
                  <li><strong>E-posta:</strong> <a href="mailto:gocardshub@gmail.com">gocardshub@gmail.com</a></li>
                  <li><strong>Telefon / WhatsApp:</strong> <a href="tel:+905389216780">0538 921 67 80</a></li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
