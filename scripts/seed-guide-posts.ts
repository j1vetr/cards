// Rehber içerik mimarisi ve FAQ: öncelikli rehber yazılarını blog_posts
// tablosuna (category='guide') idempotent şekilde ekler/günceller. Tek
// kaynak burasıdır; asıl çağrı server/index.ts başlangıcında otomatik
// yapılır (bkz. seedGuidePosts import'u), böylece her deploy/restart'ta
// rehberler veritabanında garanti olarak var olur. Bu dosya ayrıca
// `tsx scripts/seed-guide-posts.ts` ile elle de çalıştırılabilir.
import { storage } from "../server/storage";

export interface GuidePost {
  slug: string;
  title: string;
  summary: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  content: string;
  faqItems?: { question: string; answer: string }[];
}

export const GUIDE_POSTS: GuidePost[] = [
  // ─────────────────────────── RIFTBOUND ───────────────────────────
  {
    slug: "riftbound-nedir",
    title: "Riftbound Nedir? League of Legends Kart Oyunu Rehberi",
    summary: "Riftbound, Riot Games'in League of Legends evrenine dayanan fiziksel kart oyunudur. Temel kavramları ve nereden başlayacağınızı bu rehberde bulabilirsiniz.",
    metaTitle: "Riftbound Nedir? LoL Kart Oyunu Rehberi",
    metaDescription: "Riftbound (League of Legends TCG) nedir, kimler tarafından yapıldı, temel kavramları nelerdir? Yeni başlayanlar için kısa ve öz rehber.",
    focusKeyword: "riftbound nedir",
    content: `
<p><strong>Riftbound</strong>, Riot Games tarafından geliştirilen ve <strong>League of Legends</strong> evrenindeki şampiyonları, birimleri ve büyüleri fiziksel kartlara taşıyan bir <strong>toplanabilir kart oyunudur (TCG)</strong>. 2-4 oyuncu tarafından oynanan oyunda her oyuncu bir <em>champion legend</em> (şampiyon efsanesi) seçerek kendi destesini bu kart etrafında kurar.</p>
<p>Riftbound'un ilk seti <strong>Origins</strong>, 2025 yılında piyasaya sürüldü ve oyunu altı "domain" (renk) etrafında şekillendiren geniş bir kart havuzu sundu. Serinin devamında <a href="/blog/riftbound-setleri">yeni setler</a> düzenli olarak yayımlanmaya devam ediyor.</p>
<h2>Riftbound'da neler bulunur?</h2>
<ul>
  <li><strong>Champion Legend</strong> kartları — desteyi kurduğunuz temel kart</li>
  <li><strong>Unit</strong> (birim), <strong>Spell</strong> (büyü) ve <strong>Gear</strong> (donanım) kartları</li>
  <li><strong>Battlefield</strong> (savaş alanı) kartları — oyunun kazanma koşulunu belirler</li>
  <li>Kaynak olarak kullanılan <strong>Rune</strong> kartları</li>
</ul>
<p>Oyunun nasıl oynandığını adım adım öğrenmek isterseniz <a href="/blog/riftbound-nasil-oynanir">Riftbound nasıl oynanır rehberimize</a> göz atabilirsiniz. Kart türleri ve nadirlik seviyeleri hakkında detaylı bilgi için <a href="/blog/riftbound-kartlari">Riftbound kartları rehberini</a> inceleyebilirsiniz.</p>
<p>Go|Cards olarak Riftbound'un <a href="/riftbound">booster paketlerini, kapalı kutularını ve tekli kartlarını</a> Türkiye'ye hızlı kargo ile ulaştırıyoruz.</p>
`,
    faqItems: [
      { question: "Riftbound'u kim yaptı?", answer: "Riftbound, League of Legends'ın geliştiricisi Riot Games tarafından tasarlanan resmi bir fiziksel kart oyunudur." },
      { question: "Riftbound kaç kişiyle oynanır?", answer: "Riftbound temel olarak 2 kişilik düellolar için tasarlanmıştır; resmi kurallar 4 kişilik takım oyunu formatını da desteklemektedir." },
      { question: "Riftbound'a nasıl başlarım?", answer: "En kolay başlangıç yolu, tek bir şampiyon etrafında hazır kurulu gelen bir champion deck (hazır deste) satın almaktır. Detaylar için champion deck rehberimize bakabilirsiniz." },
    ],
  },
  {
    slug: "riftbound-nasil-oynanir",
    title: "Riftbound Nasıl Oynanır? Temel Kurallar",
    summary: "Riftbound'da runes, battlefields ve champion legend gibi temel kavramları öğrenin, ilk oyununuza hazırlanın.",
    metaTitle: "Riftbound Nasıl Oynanır? Temel Kurallar Rehberi",
    metaDescription: "Riftbound TCG nasıl oynanır? Champion legend seçimi, rune sistemi, battlefield kontrolü ve kazanma koşulları adım adım anlatılıyor.",
    focusKeyword: "riftbound nasıl oynanır",
    content: `
<p><a href="/blog/riftbound-nedir">Riftbound'un ne olduğunu</a> öğrendiyseniz, sırada temel oynanışı anlamak var. Riftbound'un resmi kuralları (Core Rules) Riot Games tarafından yayımlanır ve düzenli olarak güncellenir; bu rehber oyunun temel akışını özetler.</p>
<h2>1. Destenizi ve şampiyonunuzu seçin</h2>
<p>Her oyuncu bir <strong>champion legend</strong> kartı etrafında deste kurar. Bu kart, oynayabileceğiniz <em>domain'leri</em> (renkleri) ve oyunun başında sahaya açık şekilde konan <em>chosen champion</em> biriminizi belirler.</p>
<h2>2. Runes ile kaynak yönetimi</h2>
<p>Kartlarınızın bir maliyeti vardır ve bu maliyetler ayrı bir deste olan <strong>rune</strong> kartlarıyla ödenir. Her tur iki yeni rune alırsınız; runeları yan çevirerek geçici olarak ya da rune destesine geri göndererek kalıcı şekilde harcayabilirsiniz.</p>
<h2>3. Battlefield'ları kontrol edin</h2>
<p>Oyundaki asıl hedef, <strong>battlefield</strong> (savaş alanı) kartlarını birimlerinizle ele geçirmektir. Bir savaş alanını kontrol ettiğinizde puan kazanırsınız; rakibiniz o alanı elinde tutuyorsa birimleriniz <em>might</em> (güç) değerleriyle çarpışır ve son ayakta kalan taraf alanı ele geçirir.</p>
<h2>4. Kazanma koşulu</h2>
<p>Tek oyunculu düellolarda <strong>8 puana</strong>, takım oyununda ise <strong>11 puana</strong> ilk ulaşan oyuncu/takım oyunu kazanır.</p>
<p>Kartların tür ve nadirlik yapısı için <a href="/blog/riftbound-kartlari">Riftbound kartları rehberine</a>, hazır kurulu destelerle başlamak için <a href="/blog/riftbound-champion-deck-nedir">champion deck rehberine</a> göz atabilirsiniz. Kendi destenizi genişletmek için Go|Cards'ın <a href="/riftbound">Riftbound tekli kart ve booster ürünlerini</a> inceleyebilirsiniz.</p>
`,
    faqItems: [
      { question: "Riftbound'da nasıl kazanılır?", answer: "Tek oyunculu maçlarda 8 puana, takım oyununda 11 puana ilk ulaşan taraf battlefield kontrolü sayesinde oyunu kazanır." },
      { question: "Rune nedir?", answer: "Rune, kartlarınızın maliyetini ödemek için kullandığınız kaynak kartlarıdır; ayrı bir rune destesinden her tur iki yeni rune alırsınız." },
    ],
  },
  {
    slug: "riftbound-kartlari",
    title: "Riftbound Kartları: Türler ve Nadirlik Seviyeleri",
    summary: "Champion Legend, Unit, Spell, Gear ve Battlefield kart türleri ile Common'dan Epic'e nadirlik seviyelerini keşfedin.",
    metaTitle: "Riftbound Kartları: Türler ve Nadirlikler",
    metaDescription: "Riftbound'daki kart türleri (Champion Legend, Unit, Spell, Gear, Battlefield) ve Common, Uncommon, Rare, Epic nadirlik seviyeleri hakkında rehber.",
    focusKeyword: "riftbound kartları",
    content: `
<p>Riftbound destesi birbirinden farklı görevler üstlenen birkaç kart türünden oluşur. Bu türleri tanımak, hem <a href="/blog/riftbound-nasil-oynanir">oyunu öğrenirken</a> hem de koleksiyon oluştururken işinize yarar.</p>
<h2>Kart türleri</h2>
<ul>
  <li><strong>Champion Legend</strong> — destenizin merkezinde yer alan, domain'lerinizi belirleyen kart</li>
  <li><strong>Unit</strong> (birim) — sahaya sürdüğünüz, battlefield'lar için savaşan kartlar</li>
  <li><strong>Spell</strong> (büyü) — tek seferlik veya kalıcı etkiler yaratan kartlar</li>
  <li><strong>Gear</strong> (donanım) — birimlerinizi güçlendiren ekipman kartları</li>
  <li><strong>Battlefield</strong> — kontrol edildiğinde puan kazandıran saha kartları</li>
  <li><strong>Rune</strong> — kart maliyetlerini ödemek için kullanılan kaynak kartları</li>
</ul>
<h2>Nadirlik seviyeleri</h2>
<p>Origins seti kartları dört nadirlik seviyesinde basılmıştır:</p>
<ul>
  <li><strong>Common</strong> — bronz çerçeve, dairesel gem simgesi</li>
  <li><strong>Uncommon</strong> — gümüş çerçeve, üçgen gem simgesi</li>
  <li><strong>Rare</strong> — tam sanatlı altın çerçeve, foil desen, kare gem simgesi</li>
  <li><strong>Epic</strong> — sade altın çerçeve, foil detaylar, beşgen gem simgesi</li>
</ul>
<p>Bunlara ek olarak popüler şampiyonların <strong>alt-art</strong> (alternatif sanat) ve koleksiyon numarasının üzerinde yer alan <strong>overnumbered</strong> varyantları da bulunur; bu kartlar booster paketlerde daha düşük oranlarla çıkar.</p>
<p>Bir paketin tam olarak hangi nadirlik dağılımını içerdiğini öğrenmek için <a href="/blog/riftbound-booster-pack-nedir">booster pack rehberimize</a> bakabilirsiniz. Go|Cards'ta koşuluna göre (NM/LP/MP/HP) fiyatlandırılmış <a href="/riftbound">Riftbound tekli kartlarını</a> inceleyebilirsiniz.</p>
`,
    faqItems: [
      { question: "Riftbound'da kaç nadirlik seviyesi var?", answer: "Origins setinde Common, Uncommon, Rare ve Epic olmak üzere dört temel nadirlik seviyesi bulunur; bunlara ek olarak alt-art ve overnumbered özel varyantlar vardır." },
      { question: "Champion Legend kartı ne işe yarar?", answer: "Champion Legend, desteyi etrafında kurduğunuz temel karttır; oynayabileceğiniz domain'leri (renkleri) ve oyunun başında sahada olan chosen champion biriminizi belirler." },
    ],
  },
  {
    slug: "riftbound-booster-pack-nedir",
    title: "Riftbound Booster Pack Nedir? İçeriği ve Kart Dağılımı",
    summary: "Riftbound Origins booster paketinin kaç kart içerdiğini ve nadirlik dağılımını öğrenin.",
    metaTitle: "Riftbound Booster Pack Nedir? Paket İçeriği",
    metaDescription: "Riftbound booster pack kaç kart içerir? Origins setine ait resmi paket içeriği ve nadirlik dağılımı bu rehberde.",
    focusKeyword: "riftbound booster pack nedir",
    content: `
<p>Bir <strong>Riftbound booster pack</strong>, rastgele kartlardan oluşan mühürlü bir kart paketidir. Origins setine ait resmi paket yapısı şu şekildedir:</p>
<ul>
  <li>7 Common (sıradan) slotu</li>
  <li>3 Uncommon (nadir olmayan) slotu</li>
  <li>2 Rare veya üzeri slotu</li>
  <li>1 garantili foil kart slotu</li>
  <li>1 Token/Rune slotu</li>
</ul>
<p>Böylece standart bir Origins booster pack toplam <strong>14 kart</strong> içerir. Her pakette en az bir foil kart garanti edilir; bu foil çoğunlukla Common veya Uncommon bir karttır, ancak Rare ya da Epic bir karta da denk gelebilir çünkü tüm Rare ve Epic kartlar zaten foildir.</p>
<p>Daha fazla paket açarak koleksiyonunuzu büyütmek isterseniz <a href="/blog/riftbound-booster-box-nedir">booster box rehberimize</a> göz atabilirsiniz. Kart türleri ve nadirlik seviyeleri hakkında ayrıntı için <a href="/blog/riftbound-kartlari">Riftbound kartları rehberi</a> yardımcı olacaktır.</p>
<p>Go|Cards'ta Riftbound booster paketlerini ve diğer <a href="/riftbound">Riftbound ürünlerini</a> inceleyebilirsiniz.</p>
`,
    faqItems: [
      { question: "Bir Riftbound booster pack kaç kart içerir?", answer: "Origins setinde standart bir booster pack 14 kart içerir: 7 common, 3 uncommon, 2 rare veya üzeri, 1 garantili foil ve 1 token/rune slotu." },
      { question: "Her pakette foil kart garanti mi?", answer: "Evet, resmi paket yapısına göre her Riftbound booster pack en az bir foil kart içerir." },
    ],
  },
  {
    slug: "riftbound-booster-box-nedir",
    title: "Riftbound Booster Box (Display) Nedir?",
    summary: "Riftbound booster box kaç paket içerir, Epic ve alt-art şampiyon çekme oranları nedir?",
    metaTitle: "Riftbound Booster Box Nedir? Kutu İçeriği",
    metaDescription: "Riftbound booster box (display) kaç booster pack içerir? Origins setine ait paket sayısı ve pull rate bilgileri.",
    focusKeyword: "riftbound booster box nedir",
    content: `
<p>Bir <strong>Riftbound booster box</strong> (diğer adıyla <em>display</em>), tek tek satılan booster paketlerin toplu halde satıldığı mühürlü kutudur. Origins seti için standart bir booster box <strong>24 booster pack</strong> içerir.</p>
<h2>Ortalama kutu içeriği</h2>
<p>Yayımlanan resmi oranlara göre 24 paketlik bir Origins booster box'ta ortalama olarak:</p>
<ul>
  <li>~6 Epic kart (paket başına yaklaşık %25 ihtimal)</li>
  <li>~2 alt-art şampiyon kartı</li>
  <li>Yaklaşık her 3 kutuda bir <em>overnumbered</em> (koleksiyon numarası üzeri) şampiyon kartı</li>
</ul>
<p>çıkması beklenir. Tek tek paket açmak yerine kutu almak, daha yüksek toplam nadir kart ve foil garantisi sunar; bu yüzden hem oyuncular hem koleksiyoncular arasında popülerdir.</p>
<p>Tek bir paketin içeriğini merak ediyorsanız <a href="/blog/riftbound-booster-pack-nedir">booster pack rehberimize</a>, hazır kurulu bir desteyle başlamak isterseniz <a href="/blog/riftbound-champion-deck-nedir">champion deck rehberimize</a> göz atabilirsiniz.</p>
<p>Go|Cards'ta stokta bulunan <a href="/riftbound">Riftbound booster box ve booster paketlerini</a> inceleyebilirsiniz.</p>
`,
    faqItems: [
      { question: "Bir Riftbound booster box kaç paket içerir?", answer: "Origins setinde standart bir booster box (display) 24 booster pack içerir." },
      { question: "Booster box'ta kaç Epic kart çıkar?", answer: "Resmi oranlara göre Epic kart çıkma ihtimali paket başına yaklaşık %25'tir; bu da 24 paketlik bir kutuda ortalama 6 Epic kart anlamına gelir." },
    ],
  },
  {
    slug: "riftbound-champion-deck-nedir",
    title: "Riftbound Champion Deck Nedir? Hazır Kurulu Destelere Giriş",
    summary: "Riftbound champion deck ile tek bir şampiyon etrafında hazır kurulu bir desteyle nasıl oyuna başlayabileceğinizi öğrenin.",
    metaTitle: "Riftbound Champion Deck Nedir?",
    metaDescription: "Riftbound champion deck (hazır kurulu deste) nedir, ne içerir ve yeni başlayanlar için neden iyi bir seçenektir?",
    focusKeyword: "riftbound champion deck nedir",
    content: `
<p>Riftbound'a hızlıca başlamanın en pratik yolu bir <strong>champion deck</strong> (hazır kurulu şampiyon destesi) satın almaktır. Bu ürün, tek bir <a href="/blog/riftbound-kartlari">Champion Legend</a> kartı etrafında önceden kurulmuş, kutudan çıkar çıkmaz oynanabilir tam bir destedir.</p>
<h2>Champion deck ne içerir?</h2>
<p>Origins setinde çıkan champion decklerin (örneğin Jinx, Lee Sin ve Viktor) her biri <strong>56 karttan</strong> oluşan tam bir deste sunar. Deste, o şampiyonun oyun tarzına uygun unit, spell ve gear kartlarıyla birlikte gelir ve içinde birkaç Rare kart da bulunur; böylece deste hem oynanabilir hem de geliştirmeye açık bir başlangıç noktası sağlar.</p>
<h2>Neden champion deck ile başlamalı?</h2>
<ul>
  <li>Deste kurma bilgisi gerektirmeden hemen oynamaya başlarsınız</li>
  <li>Seçtiğiniz şampiyonun oyun tarzını öğrenerek kendi stratejinizi keşfedersiniz</li>
  <li>Booster paketlerden gelecek kartlarla desteyi zamanla güçlendirebilirsiniz</li>
</ul>
<p>Deste kurma mantığını ve oyunun temel akışını öğrenmek için <a href="/blog/riftbound-nasil-oynanir">Riftbound nasıl oynanır rehberimize</a> bakabilirsiniz. Desteyi güçlendirmek için tekli kart ve booster paket seçeneklerini <a href="/riftbound">Riftbound sayfamızda</a> bulabilirsiniz.</p>
`,
    faqItems: [
      { question: "Champion deck kaç kart içerir?", answer: "Origins setindeki champion decklerin her biri, tek bir şampiyon etrafında kurulmuş 56 karttan oluşan tam bir destedir." },
      { question: "Champion deck yeni başlayanlar için uygun mu?", answer: "Evet, champion deck kutudan çıkar çıkmaz oynanabilir olduğu için deste kurma bilgisi gerektirmez ve Riftbound'a başlamanın en kolay yoludur." },
    ],
  },
  {
    slug: "riftbound-setleri",
    title: "Riftbound Setleri: Origins'ten Vendetta'ya",
    summary: "Riftbound'un çıkış sırasına göre setlerini ve her setin öne çıkan özelliklerini keşfedin.",
    metaTitle: "Riftbound Setleri: Tüm Kart Setleri Listesi",
    metaDescription: "Riftbound TCG'nin çıkardığı setler: Origins, Origins Proving Grounds, Spiritforged, Unleashed ve Vendetta hakkında bilgi.",
    focusKeyword: "riftbound setleri",
    content: `
<p>Riftbound, ilk setinden bu yana düzenli olarak yeni kart setleriyle genişliyor. Go|Cards kataloğunda yer alan başlıca Riftbound setleri şunlardır:</p>
<h2>Origins</h2>
<p>Riftbound'un ilk büyük seti olan <strong>Origins</strong>, altı domain'e yayılan geniş bir kart havuzu ve oyunun temel mekaniklerini tanıtır. Setin tamamını <a href="/set/riftbound-ogn">Origins set sayfamızda</a> inceleyebilirsiniz.</p>
<h2>Origins: Proving Grounds</h2>
<p><strong>Origins: Proving Grounds</strong>, Origins setini destekleyen ek bir yapı taşı seti olarak yeni oyunculara ve turnuva hazırlığına yönelik kartlar sunar.</p>
<h2>Spiritforged</h2>
<p><strong>Spiritforged</strong>, Riftbound'un ikinci büyük genişleme seti olarak yeni şampiyonlar ve mekanikler ekler.</p>
<h2>Unleashed ve Vendetta</h2>
<p><strong>Unleashed</strong> ve <strong>Vendetta</strong> setleri, Riftbound'un çekirdek kurallarına (Core Rules) yapılan güncellemelerle birlikte gelen daha yeni genişlemelerdir ve oyuna yeni domain kombinasyonları ile şampiyonlar katar.</p>
<p>Hangi setten başlayacağınızdan emin değilseniz <a href="/blog/riftbound-nedir">Riftbound nedir rehberimizle</a> başlayabilir, ardından <a href="/riftbound">tüm Riftbound setlerini ve kartlarını</a> Go|Cards'ta inceleyebilirsiniz.</p>
`,
    faqItems: [
      { question: "Riftbound'un ilk seti hangisidir?", answer: "Riftbound'un ilk büyük seti Origins'tir; oyunun temel mekaniklerini ve altı domain'e yayılan geniş bir kart havuzunu tanıtır." },
      { question: "Riftbound'da kaç set var?", answer: "Go|Cards kataloğunda Origins, Origins: Proving Grounds, Spiritforged, Unleashed ve Vendetta setleri yer almaktadır; Riftbound düzenli olarak yeni setlerle genişlemeye devam etmektedir." },
    ],
  },
  // ─────────────────────────── POKEMON ───────────────────────────
  {
    slug: "pokemon-tcg-nedir",
    title: "Pokémon TCG Nedir? Başlangıç Rehberi",
    summary: "Pokémon Trading Card Game'in temel kavramlarını ve nasıl kazanılacağını öğrenin.",
    metaTitle: "Pokémon TCG Nedir? Başlangıç Rehberi",
    metaDescription: "Pokémon TCG (Trading Card Game) nedir, nasıl oynanır ve kazanma koşulları nelerdir? Yeni başlayanlar için özet rehber.",
    focusKeyword: "pokemon tcg nedir",
    content: `
<p><strong>Pokémon TCG (Trading Card Game)</strong>, Pokémon evrenindeki canlıları ve eğitmenleri temsil eden kartlarla oynanan, dünya genelinde en yaygın toplanabilir kart oyunlarından biridir. Oyuncular kendi destelerini kurar, <strong>Enerji kartlarıyla</strong> Pokémon'larını güçlendirir ve rakiplerine karşı mücadele eder.</p>
<h2>Nasıl kazanılır?</h2>
<p>Bir Pokémon TCG maçını kazanmanın birkaç yolu vardır:</p>
<ul>
  <li>Rakibin Pokémon'larını yenerek tüm <strong>ödül kartlarınızı (prize card)</strong> toplamak</li>
  <li>Rakibin oyun alanında sahaya çıkaracak Pokémon'u kalmaması</li>
  <li>Rakibin destesinde kart kalmaması</li>
</ul>
<h2>Kart türleri</h2>
<p>Bir deste üç temel kart türünden oluşur: <strong>Pokémon kartları</strong>, <strong>Trainer (Eğitmen) kartları</strong> ve <strong>Energy (Enerji) kartları</strong>. Bu türler ve nadirlik seviyeleri hakkında detaylı bilgi için <a href="/blog/pokemon-kartlari">Pokémon kartları rehberimize</a> göz atabilirsiniz.</p>
<p>Koleksiyonunuzu büyütmek isterseniz <a href="/blog/pokemon-booster-pack-nedir">booster pack</a> ve <a href="/blog/pokemon-booster-box-nedir">booster box</a> rehberlerimize bakabilir, Go|Cards'ta <a href="/pokemon">Pokémon TCG ürünlerini</a> inceleyebilirsiniz.</p>
`,
    faqItems: [
      { question: "Pokémon TCG'de nasıl kazanılır?", answer: "Rakibinizin tüm ödül kartlarını almasını sağlayarak, sahaya çıkaracak Pokémon'u kalmamasını sağlayarak ya da destesindeki kartları tükettirerek kazanabilirsiniz." },
      { question: "Pokémon TCG'de kaç tür kart vardır?", answer: "Bir deste üç temel kart türünden oluşur: Pokémon kartları, Trainer (Eğitmen) kartları ve Energy (Enerji) kartları." },
    ],
  },
  {
    slug: "pokemon-kartlari",
    title: "Pokémon Kartları: Türler ve Nadirlik Seviyeleri",
    summary: "Pokémon, Trainer ve Energy kart türlerini, ayrıca nadirlik seviyelerini bu rehberde öğrenin.",
    metaTitle: "Pokémon Kartları: Türler ve Nadirlikler",
    metaDescription: "Pokémon TCG'de kart türleri (Pokémon, Trainer, Energy) ve nadirlik seviyeleri (Common'dan Secret Rare'e) nelerdir?",
    focusKeyword: "pokemon kartları",
    content: `
<p><a href="/blog/pokemon-tcg-nedir">Pokémon TCG'nin temel yapısını</a> öğrendiyseniz, kart türlerini ve nadirlik seviyelerini tanımanın zamanı geldi.</p>
<h2>Kart türleri</h2>
<ul>
  <li><strong>Pokémon Kartları</strong> — sahaya çıkardığınız ve rakibinizle savaştığınız canlılar</li>
  <li><strong>Trainer Kartları</strong> — desteğinizi güçlendiren eşya, destekçi (Supporter) ve stadyum kartları</li>
  <li><strong>Energy Kartları</strong> — Pokémon'larınızın saldırılarını kullanabilmesi için gereken enerji kaynağı</li>
</ul>
<h2>Nadirlik seviyeleri</h2>
<p>Setten sete değişmekle birlikte yaygın nadirlik seviyeleri şunlardır: <strong>Common</strong>, <strong>Uncommon</strong>, <strong>Rare</strong>, <strong>Holo Rare</strong>, <strong>Ultra Rare</strong> ve <strong>Secret Rare</strong>. Ultra rare ve secret rare kartlar genellikle full art veya özel baskı tasarımlarıyla öne çıkar ve koleksiyoncular arasında en çok aranan kartlardır.</p>
<p>Hangi kartı satın alacağınıza karar verirken koşul (condition) bilgisinin de önemli olduğunu unutmayın; bu konuda <a href="/blog/pokemon-kart-nasil-secilir">kart nasıl seçilir rehberimiz</a> yardımcı olacaktır. Go|Cards'ta NM/LP/MP koşullu <a href="/pokemon">Pokémon tekli kartlarını</a> inceleyebilirsiniz.</p>
`,
    faqItems: [
      { question: "Pokémon kartlarında kaç nadirlik seviyesi var?", answer: "Setten sete değişmekle birlikte Common, Uncommon, Rare, Holo Rare, Ultra Rare ve Secret Rare gibi nadirlik seviyeleri yaygın olarak kullanılır." },
      { question: "En değerli Pokémon kartları hangileridir?", answer: "Genellikle ultra rare ve secret rare nadirlik seviyesindeki, popüler Pokémon'ların full art veya özel baskı versiyonları koleksiyoncular arasında en çok aranan kartlardır." },
    ],
  },
  {
    slug: "pokemon-booster-pack-nedir",
    title: "Pokémon Booster Pack Nedir? Kaç Kart Çıkar?",
    summary: "Pokémon TCG booster paketinin genel içeriğini ve kart sayısını öğrenin.",
    metaTitle: "Pokémon Booster Pack Nedir? İçeriği",
    metaDescription: "Bir Pokémon booster pack kaç kart içerir? Modern setlerdeki paket içeriği hakkında bilgi.",
    focusKeyword: "pokemon booster pack nedir",
    content: `
<p>Bir <strong>Pokémon booster pack</strong>, tek bir sete ait rastgele kartlardan oluşan mühürlü kart paketidir. Modern Pokémon TCG setlerinde standart bir booster pack genellikle <strong>10-11 kart</strong> içerir; kesin kart sayısı ve nadirlik dağılımı sete göre değişebilir ve her ürünün ambalajında belirtilir.</p>
<p>Bir booster pack açtığınızda genellikle birkaç Common ve Uncommon kartın yanında en az bir Rare veya üzeri nadirlikte kart bulursunuz. Daha yüksek nadirlikte kart çekme şansını artırmak isteyenler için paketleri toplu şekilde içeren <a href="/blog/pokemon-booster-box-nedir">booster box</a> seçeneği daha uygun olabilir.</p>
<p>Kart türleri ve nadirlik seviyeleri hakkında daha fazla bilgi için <a href="/blog/pokemon-kartlari">Pokémon kartları rehberimize</a> göz atabilirsiniz. Go|Cards'ta güncel setlere ait <a href="/pokemon">Pokémon booster paketlerini</a> inceleyebilirsiniz.</p>
`,
    faqItems: [
      { question: "Bir Pokémon booster pack kaç kart içerir?", answer: "Modern setlerde standart bir Pokémon booster pack genellikle 10-11 kart içerir; kesin sayı sete göre değişir ve ürün sayfasında belirtilir." },
    ],
  },
  {
    slug: "pokemon-booster-box-nedir",
    title: "Pokémon Booster Box Nedir? Kaç Paket İçerir?",
    summary: "Pokémon booster box'ın kaç booster pack içerdiğini ve neden tercih edildiğini öğrenin.",
    metaTitle: "Pokémon Booster Box Nedir? Kutu İçeriği",
    metaDescription: "Bir Pokémon booster box kaç paket içerir? Booster box ile tekli paket arasındaki farklar.",
    focusKeyword: "pokemon booster box nedir",
    content: `
<p>Bir <strong>Pokémon booster box</strong>, aynı sete ait booster paketlerin toplu halde satıldığı mühürlü kutudur. Modern Pokémon TCG setlerinde standart bir booster box genellikle <strong>36 booster pack</strong> içerir.</p>
<h2>Booster box neden tercih edilir?</h2>
<ul>
  <li>Tek tek paket almaya kıyasla paket başına genellikle daha uygun maliyet sunar</li>
  <li>Daha fazla paket açıldığı için nadir kart çekme şansı artar</li>
  <li>Setin tamamına yakın bir koleksiyon oluşturmak isteyenler için pratik bir yoldur</li>
</ul>
<p>Sadece birkaç paket denemek isteyenler için <a href="/blog/pokemon-booster-pack-nedir">tekli booster pack</a>, hem paket hem oyun aksesuarı isteyenler için ise <a href="/blog/pokemon-etb-nedir">Elite Trainer Box (ETB)</a> daha uygun bir seçenek olabilir.</p>
<p>Go|Cards'ta stokta bulunan <a href="/pokemon">Pokémon booster box ve booster paketlerini</a> inceleyebilirsiniz.</p>
`,
    faqItems: [
      { question: "Bir Pokémon booster box kaç paket içerir?", answer: "Modern Pokémon TCG setlerinde standart bir booster box genellikle 36 booster pack içerir." },
      { question: "Booster box mu booster pack mi almalıyım?", answer: "Sadece birkaç kart denemek istiyorsanız tekli booster pack yeterlidir; daha fazla nadir kart ve paket başına daha uygun maliyet istiyorsanız booster box daha avantajlıdır." },
    ],
  },
  {
    slug: "pokemon-etb-nedir",
    title: "Pokémon Elite Trainer Box (ETB) Nedir?",
    summary: "Elite Trainer Box'ın içeriğini ve booster box'tan farkını öğrenin.",
    metaTitle: "Pokémon Elite Trainer Box (ETB) Nedir?",
    metaDescription: "Pokémon Elite Trainer Box (ETB) ne içerir, kaç booster pack barındırır ve kimler için uygundur?",
    focusKeyword: "pokemon etb nedir",
    content: `
<p><strong>Elite Trainer Box (ETB)</strong>, belirli bir Pokémon TCG setine ait booster paketleri, oyun aksesuarlarıyla birlikte tek bir kutuda sunan bir üründür. Sadece kart paketi almak yerine, hem oynamaya hem koleksiyona hazır komple bir set arayanlar için tasarlanmıştır.</p>
<h2>Bir ETB'de genellikle neler bulunur?</h2>
<ul>
  <li>Tek bir sete ait <strong>booster paketler</strong> (genellikle 8-10 adet)</li>
  <li>O ürüne özel bir <strong>promo kart</strong></li>
  <li>Sete özel tasarlanmış <strong>kart sleeve'leri</strong></li>
  <li><strong>Energy kartları</strong></li>
  <li>Hasar sayacı zarları ve yazı-tura zarı gibi <strong>oyun aksesuarları</strong></li>
  <li>Setin oyuncu rehberi</li>
  <li>Kartları ve aksesuarları düzenli tutan bir <strong>saklama kutusu</strong></li>
</ul>
<p>ETB, paket sayısını maksimize etmek yerine erişilebilirlik ve kullanılabilirliği ön planda tutar; bu yüzden yeni başlayanlar ve hediye arayanlar için popüler bir seçenektir. Daha fazla paket açmak isteyenler için <a href="/blog/pokemon-booster-box-nedir">booster box rehberimize</a> göz atabilirsiniz.</p>
<p>Go|Cards'ta güncel setlere ait <a href="/pokemon">Elite Trainer Box ve diğer Pokémon ürünlerini</a> inceleyebilirsiniz.</p>
`,
    faqItems: [
      { question: "Elite Trainer Box kaç booster pack içerir?", answer: "İçerik seteten sete değişmekle birlikte modern Elite Trainer Box'lar genellikle 8-10 booster pack içerir." },
      { question: "ETB mi booster box mı almalıyım?", answer: "Sadece kart paketi ve maksimum paket sayısı istiyorsanız booster box, oyun aksesuarlarıyla birlikte komple bir set istiyorsanız Elite Trainer Box daha uygun olur." },
    ],
  },
  {
    slug: "pokemon-kart-nasil-secilir",
    title: "Pokémon Kartı Nasıl Seçilir? Satın Almadan Önce Bilinmesi Gerekenler",
    summary: "Pokémon tekli kart satın alırken koşul (condition), nadirlik ve fiyat kriterlerine nasıl bakmalısınız?",
    metaTitle: "Pokémon Kartı Nasıl Seçilir? Satın Alma Rehberi",
    metaDescription: "Pokémon tekli kart satın alırken NM/LP/MP koşul dereceleri, nadirlik ve bütçenize göre nasıl seçim yapacağınızı öğrenin.",
    focusKeyword: "pokemon kart nasıl seçilir",
    content: `
<p>Bir Pokémon tekli kart satın alırken doğru seçimi yapmak için birkaç kritere dikkat etmek gerekir. Bu rehberde Go|Cards'ta kart satın alırken göz önünde bulundurmanız gereken temel noktaları özetliyoruz.</p>
<h2>1. Koşul (condition) derecesine bakın</h2>
<p>Go|Cards'ta her tekli kart, gerçek koşuluna göre ayrı ayrı listelenir:</p>
<ul>
  <li><strong>NM (Near Mint)</strong> — yeni kart standardına en yakın koşul</li>
  <li><strong>LP (Lightly Played)</strong> — hafif kullanım izli</li>
  <li><strong>MP (Moderately Played)</strong> — orta düzeyde kullanım izli</li>
  <li><strong>HP (Heavily Played)</strong> — belirgin kullanım izli</li>
</ul>
<p>Oynamak için kart alıyorsanız LP/MP koşulu bütçe dostu bir seçenek olabilir; koleksiyon amacıyla alıyorsanız NM koşulu tercih edilmelidir.</p>
<h2>2. Nadirlik ve oynanabilirlik dengesini gözetin</h2>
<p>Bir kartın nadir olması onu oyunda güçlü yapmaz. Deste kurarken <a href="/blog/pokemon-kartlari">kart türleri ve nadirlik seviyelerini</a> anlamak, hem koleksiyon hem oyun için doğru tercih yapmanıza yardımcı olur.</p>
<h2>3. Setine ve kart numarasına dikkat edin</h2>
<p>Aynı Pokémon'un farklı setlerde farklı baskıları olabilir. Her kart sayfasında set adı ve kart numarası net şekilde belirtilir; tam olarak hangi baskıyı aradığınızdan emin olun.</p>
<p>İhtiyacınız olan kartları koşuluna göre filtreleyerek <a href="/pokemon">Pokémon tekli kart kataloğumuzda</a> arayabilirsiniz.</p>
`,
    faqItems: [
      { question: "NM ve LP koşul arasındaki fark nedir?", answer: "NM (Near Mint) kart yeni standardına en yakın koşuldadır; LP (Lightly Played) ise hafif kullanım izleri taşıyan, genellikle daha uygun fiyatlı bir koşuldur." },
      { question: "Oynamak için mi koleksiyon için mi farklı kart seçmeli miyim?", answer: "Oynamak amacıyla alıyorsanız LP/MP koşullu kartlar bütçe dostu bir seçenektir; koleksiyon amacıyla alıyorsanız NM koşulunu tercih etmeniz önerilir." },
    ],
  },
];

// Insert-only idempotent seed: yalnızca GUIDE_POSTS içindeki slug veritabanında
// hiç yoksa yeni bir yazı oluşturur. Var olan bir yazıyı asla günceller/
// üzerine yazmaz — admin panelden yapılan editoryal değişiklikler (başlık,
// içerik, taslağa alma, yayından kaldırma vb.) her restart/deploy'da
// korunmalıdır. Bu fonksiyon her başlangıçta çalışır; kalıcı bir sonucu
// olan tek etkisi, eksik olan rehber yazılarını bir kez oluşturmaktır.
export async function seedGuidePosts(): Promise<void> {
  const now = new Date();
  for (const p of GUIDE_POSTS) {
    const existing = await storage.getBlogPostBySlug(p.slug);
    if (existing) continue;
    await storage.createBlogPost({
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      content: p.content.trim(),
      category: "guide",
      status: "published",
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      focusKeyword: p.focusKeyword,
      faqItems: p.faqItems ?? null,
      publishedAt: now,
    } as any);
    console.log(`[seed-guides] created: ${p.slug}`);
  }
}

// Elle çalıştırma: `tsx scripts/seed-guide-posts.ts`
// import.meta.url kontrolü sayesinde server/index.ts tarafından import
// edildiğinde bu blok çalışmaz, yalnızca doğrudan CLI'dan çalıştırılınca devreye girer.
if (import.meta.url === `file://${process.argv[1]}`) {
  seedGuidePosts()
    .then(() => {
      console.log("[seed-guides] done.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
