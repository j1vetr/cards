import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronRight, Shield, Lock, Eye, FileText } from 'lucide-react';

const highlights = [
  { icon: Shield, label: 'Veri Güvenliği' },
  { icon: Lock, label: 'SSL Koruması' },
  { icon: Eye, label: 'Şeffaflık' },
  { icon: FileText, label: 'Yasal Uyum' },
];

export default function KVKK() {
  return (
    <div className="min-h-screen" style={{ background: '#0b1120' }}>
      <SEO
        title="KVKK Aydınlatma Metni - GoCards TCG"
        description="GoCards TCG kişisel verilerin korunması kanunu aydınlatma metni."
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
              <span className="text-white/60">KVKK Aydınlatma Metni</span>
            </motion.nav>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="text-xs tracking-[0.3em] uppercase text-indigo-400 mb-4 block font-semibold">
                Kişisel Veri Koruma
              </span>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
                KVKK<br />
                <span className="text-white/35">Aydınlatma Metni</span>
              </h1>
              <p className="text-base text-white/55 max-w-2xl mb-10 leading-relaxed">
                6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında kişisel verilerinizin nasıl
                toplandığı, işlendiği ve korunduğu hakkında bilgilendirme.
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
                <h2>1) Veri Sorumlusu</h2>
                <p>
                  KVKK (Kişisel Verilerin Korunması Kanunu) kapsamında kişisel verilerinizi işleyen veri sorumlusu aşağıdaki şekildedir:
                </p>
                <p><strong>GoCards TCG</strong> (Go Cards TCG İç ve Dış Tic. Ltd. Şti.)</p>
                <p><strong>Web Sitesi:</strong> <a href="https://gocards.toov.com.tr">gocards.toov.com.tr</a></p>
                <p><strong>E-posta:</strong> <a href="mailto:gocardshub@gmail.com">gocardshub@gmail.com</a></p>
                <p><strong>Telefon:</strong> <a href="tel:+905389216780">0538 921 67 80</a></p>
                <p><strong>Vergi Dairesi:</strong> Beykoz V.D. — Vergi No: 396 175 96 05</p>

                <h2>2) Kişisel Verilerin Toplanma Yöntemi</h2>
                <p>
                  Kişisel verileriniz; <strong>gocards.toov.com.tr</strong> web sitesi, sosyal medya hesaplarımız, müşteri destek hattı ve e-posta aracılığıyla tamamen veya kısmen otomatik yollarla toplanmaktadır.
                </p>

                <h2>3) Kişisel Verilerin İşlenme Amaçları</h2>
                <p>Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
                <ul>
                  <li>Ürün ve hizmet satış süreçlerinin yönetimi,</li>
                  <li>Sipariş, teslimat, iade ve ödeme işlemlerinin gerçekleştirilmesi,</li>
                  <li>Müşteri memnuniyeti, destek ve şikayet yönetimi,</li>
                  <li>Kampanya, indirim, bilgilendirme ve pazarlama faaliyetlerinin yürütülmesi,</li>
                  <li>Yasal yükümlülüklerin yerine getirilmesi,</li>
                  <li>Sistem güvenliği, dolandırıcılık önleme ve kayıt saklama yükümlülükleri.</li>
                </ul>

                <h2>4) İşlenen Kişisel Veri Kategorileri</h2>
                <ul>
                  <li>Kimlik bilgileri (ad, soyad vb.)</li>
                  <li>İletişim bilgileri (telefon, e-posta, adres vb.)</li>
                  <li>Finansal veriler (ödeme bilgileri, fatura bilgileri)</li>
                  <li>Alışveriş geçmişi ve sipariş detayları</li>
                  <li>Web sitesi kullanım verileri, IP adresi ve çerez bilgileri</li>
                </ul>

                <h2>5) Kişisel Verilerin Aktarımı</h2>
                <p>Kişisel verileriniz yalnızca aşağıdaki durumlarda paylaşılmaktadır:</p>
                <ul>
                  <li>Kargo firmaları (teslimat süreçleri için),</li>
                  <li>Bankalar ve ödeme hizmeti sağlayıcıları (ödeme işlemleri için),</li>
                  <li>Resmi kurumlar, yasal yükümlülükler kapsamında,</li>
                  <li>Bilgi altyapısı ve barındırma hizmeti sağlayıcıları (sunucu, e-posta, güvenlik hizmetleri).</li>
                </ul>
                <p>Kişisel veriler ticari amaçlarla üçüncü kişilerle paylaşılmaz veya satılmaz.</p>

                <h2>6) Saklama Süresi</h2>
                <p>
                  Kişisel verileriniz, yasal yükümlülükler ve ilgili mevzuatın öngördüğü süre boyunca saklanır. Bu sürenin ardından veriler güvenli bir şekilde silinir, yok edilir veya anonimleştirilir.
                </p>

                <h2>7) Kişisel Verilerin Güvenliği</h2>
                <p>
                  GoCards TCG, kişisel verilerinizi korumak için gerekli tüm teknik ve idari tedbirleri almaktadır. Verileriniz SSL sertifikaları, güvenli sunucular ve erişim yetkilendirme sistemleriyle korunmaktadır.
                </p>

                <h2>8) İlgili Kişi Olarak Haklarınız</h2>
                <p>
                  6698 sayılı Kişisel Verilerin Korunması Kanunu'nun 11. maddesi uyarınca, ilgili kişi olarak aşağıdaki haklara sahipsiniz:
                </p>
                <ul>
                  <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
                  <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
                  <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
                  <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
                  <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme,</li>
                  <li>KVKK'ya aykırı işlenmiş verilerin silinmesini veya yok edilmesini isteme,</li>
                  <li>Otomatik sistemlerle yapılan analiz sonucu aleyhinize çıkan bir sonuca itiraz etme,</li>
                  <li>Hukuka aykırı işleme nedeniyle zarara uğramanız halinde tazminat talep etme.</li>
                </ul>

                <h2>9) Başvuru Yöntemi</h2>
                <p>
                  KVKK kapsamındaki haklarınızı kullanmak için, kimliğinizi doğrulayacak belgelerle birlikte aşağıdaki yöntemlerle başvuru yapabilirsiniz:
                </p>
                <ul>
                  <li><strong>E-posta:</strong> <a href="mailto:gocardshub@gmail.com">gocardshub@gmail.com</a></li>
                </ul>
                <p>
                  <strong>Başvuru sonucunuz en geç 30 gün</strong> içinde ücretsiz olarak tarafınıza bildirilir.
                </p>

                <h2>10) Çerez Kullanımı</h2>
                <p>
                  Web sitemiz, kullanıcı deneyimini iyileştirmek ve site performansını ölçmek için çerezler kullanmaktadır. Çerez tercihlerinizi tarayıcınız üzerinden istediğiniz zaman değiştirebilirsiniz.
                </p>

                <h2>11) Güncellemeler ve Değişiklikler</h2>
                <p>
                  Bu Aydınlatma Metni, mevzuat değişiklikleri ve platform politikalarına uygun olarak güncellenebilir. Güncel versiyon her zaman <strong>gocards.toov.com.tr</strong> adresinde yayınlanır.
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
