import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronRight, FileText, Shield, CheckCircle, Clock } from 'lucide-react';

const highlights = [
  { icon: FileText, label: 'Yasal Sözleşme' },
  { icon: Shield, label: '6502 Sayılı Kanun' },
  { icon: CheckCircle, label: 'Güvence' },
  { icon: Clock, label: '14 Gün Cayma' },
];

export default function DistanceSalesAgreement() {
  return (
    <div className="min-h-screen" style={{ background: '#0b1120' }}>
      <SEO
        title="Mesafeli Satış Sözleşmesi - GoCards TCG"
        description="GoCards TCG mesafeli satış sözleşmesi ve alışveriş koşulları."
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
              <span className="text-white/60">Mesafeli Satış Sözleşmesi</span>
            </motion.nav>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="text-xs tracking-[0.3em] uppercase text-indigo-400 mb-4 block font-semibold">
                Yasal Bilgiler
              </span>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
                Mesafeli Satış<br />
                <span className="text-white/35">Sözleşmesi</span>
              </h1>
              <p className="text-base text-white/55 max-w-2xl mb-10 leading-relaxed">
                6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği
                kapsamında hazırlanmış resmi sözleşme metnidir.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {highlights.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="rounded-xl p-4 text-center transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: 'rgba(99,102,241,0.15)' }}>
                      <item.icon className="w-5 h-5 text-indigo-400" strokeWidth={1.75} />
                    </div>
                    <p className="text-xs font-medium text-white/70">{item.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-12 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div
              className="rounded-2xl p-6 sm:p-8 lg:p-10"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="prose max-w-none prose-headings:text-white prose-h2:text-base prose-h2:font-semibold prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-3 prose-h2:mb-4 prose-p:text-white/60 prose-li:text-white/60 prose-strong:text-white/90 prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline prose-ol:text-white/60 prose-ul:text-white/60">
                <h2>1) Taraflar</h2>
                <p><strong>Satıcı:</strong> GoCards TCG (Go Cards TCG İç ve Dış Tic. Ltd. Şti.)</p>
                <p><strong>Vergi Dairesi:</strong> Beykoz V.D. — Vergi No: 396 175 96 05</p>
                <p><strong>Telefon:</strong> <a href="tel:+905389216780">0538 921 67 80</a></p>
                <p><strong>E-posta:</strong> <a href="mailto:gocardshub@gmail.com">gocardshub@gmail.com</a></p>
                <p><strong>Web Sitesi:</strong> <a href="https://gocards.toov.com.tr">gocards.toov.com.tr</a></p>
                <p><strong>Alıcı:</strong> gocards.toov.com.tr üzerinden sipariş veren müşteridir. Alıcının adı, soyadı, adresi ve iletişim bilgileri sipariş formunda yer alır.</p>

                <h2>2) Sözleşmenin Konusu</h2>
                <p>
                  Bu sözleşmenin konusu, alıcının <strong>gocards.toov.com.tr</strong> web sitesinden elektronik ortamda sipariş verdiği Pokémon TCG, Riftbound ve diğer TCG ürünlerinin (tekli kart, booster box, sealed ürün, aksesuar) satışı, teslimatı, ödemesi ve tarafların 6502 sayılı Kanun ile Mesafeli Satışlar Yönetmeliği hükümleri doğrultusunda hak ve yükümlülüklerinin belirlenmesidir.
                </p>

                <h2>3) Ürün/Hizmet Bilgileri</h2>
                <p>
                  Ürünlerin türü, miktarı, marka/model, kondisyon (NM/LP/MP vb.), satış fiyatı, ödeme şekli ve teslimat bilgileri, alıcı tarafından sistemde onaylanmadan önce görüntülenir. Bu bilgiler sipariş özet ekranında yer alır ve elektronik olarak onaylanır.
                </p>

                <h2>4) Teslimat Şartları</h2>
                <p>
                  Ürünler, alıcının belirttiği teslimat adresine gönderilir. Tüm teslimat detayları <Link href="/teslimat-kosullari">Teslimat Koşulları</Link> sayfasında açıklanmıştır. Teslimat süresi, stok durumu ve kargo firmasının operasyonel yoğunluğuna göre değişebilir.
                </p>

                <h2>5) Ödeme Yöntemi</h2>
                <p>
                  Alıcı, ürünün bedelini kredi kartı, banka kartı, havale/EFT veya sitede sunulan diğer ödeme yöntemleriyle ödeyebilir. Ödeme tamamlanmadan sipariş işleme alınmaz. Promosyon fiyatları ve indirim kodları belirtilen süre ve koşullar için geçerlidir.
                </p>

                <h2>6) Cayma Hakkı</h2>
                <p>
                  <strong>Alıcı, ürünü teslim aldığı tarihten itibaren 14 gün içinde</strong> herhangi bir gerekçe göstermeksizin cayma hakkını kullanabilir.
                </p>
                <p>
                  Sealed (açılmamış) ürünlerde cayma hakkı, ürün orijinal ambalajında ve açılmamış halde olduğu sürece geçerlidir. Açılmış booster paketler ve sealed ürünler cayma hakkı kapsamına girmez.
                </p>
                <p>
                  Cayma hakkını kullanmak isteyen alıcılar bu süre içinde <a href="mailto:gocardshub@gmail.com">gocardshub@gmail.com</a> adresine yazılı olarak bildirmelidir.
                </p>

                <h2>7) Cayma Hakkının Kullanılamayacağı Durumlar</h2>
                <ul>
                  <li>Açılmış booster paket, booster box veya sealed set ürünlerinde,</li>
                  <li>Oynanmış veya sleeve'den çıkarılmış tekli kartlarda,</li>
                  <li>Kart kondisyonuna ilişkin kişisel yorum farklılıklarında (NM/LP arası subjektif değerlendirme cayma gerekçesi sayılmaz),</li>
                  <li>Piyasa fiyat değişiminden kaynaklanan taleplerde.</li>
                </ul>

                <h2>8) İade Süreci</h2>
                <p>
                  Alıcı cayma hakkını kullandığında, ürün fatura ve aksesuarlarıyla birlikte eksiksiz olarak GoCards TCG'ye iade edilmesi gerekir. Ürün tarafımıza ulaştıktan sonra <strong>en geç 7 iş günü</strong> içinde, alıcının ödeme yaptığı yönteme ücret iadesi yapılır.
                </p>

                <h2>9) Garanti ve Ürün Sorumluluğu</h2>
                <p>
                  Satıcı, ürün sayfasında belirtilen kondisyon bilgilerinin doğruluğundan sorumludur. Teslimat sırasında oluşan hasar veya yanlış ürün gönderimi durumunda kargo ücreti dahil tüm masraflar satıcıya aittir. Piyasa fiyat dalgalanmaları ve koleksiyon değer değişimleri garanti kapsamı dışındadır.
                </p>

                <h2>10) Gizlilik ve Kişisel Verilerin Korunması</h2>
                <p>
                  Alıcının kişisel verileri, <Link href="/kvkk">KVKK Aydınlatma Metni</Link>'nde belirtilen ilkeler doğrultusunda işlenir. Satıcı, müşterilerin kişisel bilgilerini üçüncü kişilerle paylaşmaz; paylaşım yalnızca teslimat ve ödeme süreçlerinde zorunlu olduğu ölçüde gerçekleşebilir.
                </p>

                <h2>11) Mücbir Sebepler</h2>
                <p>
                  Doğal afet, savaş, salgın, grev, kargo firması kaynaklı gecikmeler gibi öngörülemeyen durumlarda taraflar, yükümlülüklerini yerine getirememelerinden dolayı sorumlu tutulamaz.
                </p>

                <h2>12) Uyuşmazlık Çözümü</h2>
                <p>
                  Bu sözleşmeden doğan uyuşmazlıklarda, Ticaret Bakanlığı'nın açıkladığı parasal limitler dahilinde alıcı veya satıcının yerleşim yerindeki <strong>Tüketici Hakem Heyetleri</strong> veya <strong>Tüketici Mahkemeleri</strong> yetkilidir.
                </p>

                <h2>13) Yürürlük</h2>
                <p>
                  Alıcı, <strong>gocards.toov.com.tr</strong> üzerinden sipariş vererek bu sözleşmenin tüm şartlarını elektronik olarak kabul etmiş sayılır. Bu sözleşme, siparişin tamamlanmasıyla yürürlüğe girer.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
