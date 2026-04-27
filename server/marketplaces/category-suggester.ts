/**
 * Pazaryeri ↔ site kategori adı benzerliğine dayalı, bağımsız öneri motoru.
 *
 * Hiçbir DB veya ağ çağrısı yapmaz — sadece string benzerlik. Bu sayede:
 *   1) test edilmesi kolay (deterministik, saf fonksiyon)
 *   2) route içinde N pazaryeri kategorisi × M site kategorisi = N*M
 *      karşılaştırma O(N*M) — küçük katalog için (yüzler/birkaç bin) yeterli;
 *      ileride embedding'e geçilirse imza aynı kalır.
 *
 * Skor:
 *   max( token-set Jaccard , normalize-substring containment ).
 * Türkçe karakterler ASCII'ye fold edilir, küçültülür, alfanümerik dışı
 * karakterler boşluğa indirgenir. Tek harfli token'lar atılır (gürültü).
 */

const TR_MAP: Record<string, string> = {
  ş: "s",
  Ş: "s",
  ğ: "g",
  Ğ: "g",
  ü: "u",
  Ü: "u",
  ö: "o",
  Ö: "o",
  ç: "c",
  Ç: "c",
  ı: "i",
  İ: "i",
};

export function normalizeName(s: string): string {
  if (!s) return "";
  let out = "";
  for (const ch of s) out += TR_MAP[ch] ?? ch;
  return out
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string): string[] {
  const n = normalizeName(s);
  if (!n) return [];
  return n.split(" ").filter((t) => t.length > 1);
}

/** Token-set Jaccard. Hem dizilim farkına hem fazla kelimelere dayanıklı. */
function tokenSetRatio(a: string, b: string): number {
  const ta = Array.from(new Set(tokenize(a)));
  const tb = new Set(tokenize(b));
  if (ta.length === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.length + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Token-containment: kısa tarafın token'larının ne kadarının uzun tarafta
 * geçtiği. "mermer" ⊆ "dogal tas mermer" gibi alt-küme ilişkilerini
 * Jaccard'dan daha güçlü yakalar (1/1 vs 1/3).
 */
function tokenContainmentRatio(a: string, b: string): number {
  const ta = Array.from(new Set(tokenize(a)));
  const tb = Array.from(new Set(tokenize(b)));
  if (ta.length === 0 || tb.length === 0) return 0;
  const [shorter, longer] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const longerSet = new Set(longer);
  let inter = 0;
  for (const t of shorter) if (longerSet.has(t)) inter++;
  return inter / shorter.length;
}

/** "Mermer" ⊂ "Doğal Taş Mermer" gibi içeren-içerilen ilişkisini yakalar. */
function containmentRatio(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  // Token sınırı olmadan substring değil; tam token eşleşmesi gerekli.
  const ta = ` ${na} `;
  const tb = ` ${nb} `;
  if (tb.includes(ta)) return na.length / Math.max(nb.length, 1);
  if (ta.includes(tb)) return nb.length / Math.max(na.length, 1);
  return 0;
}

export function similarityScore(mpName: string, siteName: string): number {
  return Math.max(
    tokenSetRatio(mpName, siteName),
    containmentRatio(mpName, siteName),
    tokenContainmentRatio(mpName, siteName),
  );
}

export type SuggestionInput = { id: string; name: string };

export type Suggestion = {
  marketplaceCategoryId: string;
  siteCategoryId: string;
  score: number;
};

/**
 * Her giriş kategorisi için en iyi site kategorisi adayını döner.
 *
 * Davranış (akıllı öneri sözleşmesi):
 * - Site kategori listesi boş değilse, her giriş kategorisi için TAM olarak
 *   bir öneri çıkar (full coverage). Skor 0 da olsa atılmaz — istemci
 *   skoru görüp güveni rozet rengi/şeffaflığı ile yansıtabilir veya kendi
 *   eşiği üzerinden filtreleyebilir.
 * - Eşit skorda deterministik tie-break: önce TR locale ad sıralaması,
 *   sonra id — aynı girdi için her zaman aynı öneri üretilir.
 * - `threshold` opsiyonel filtre; default 0 (filtre yok). Çağıran tarafta
 *   düşük güveni gizlemek için explicit olarak verilebilir.
 */
export function suggestCategoryMappings(
  marketplaceCats: SuggestionInput[],
  siteCats: SuggestionInput[],
  options: { threshold?: number } = {},
): Suggestion[] {
  const threshold = options.threshold ?? 0;
  const out: Suggestion[] = [];
  if (siteCats.length === 0) return out;
  for (const mc of marketplaceCats) {
    let best: SuggestionInput = siteCats[0];
    let bestScore = similarityScore(mc.name, best.name);
    for (let i = 1; i < siteCats.length; i++) {
      const sc = siteCats[i];
      const s = similarityScore(mc.name, sc.name);
      if (s > bestScore) {
        bestScore = s;
        best = sc;
      } else if (s === bestScore && sc.id !== best.id) {
        // Deterministik tie-break: önce ad (TR locale), sonra id.
        const cmpName = sc.name.localeCompare(best.name, "tr");
        if (cmpName < 0 || (cmpName === 0 && sc.id < best.id)) {
          best = sc;
        }
      }
    }
    if (bestScore >= threshold) {
      out.push({
        marketplaceCategoryId: mc.id,
        siteCategoryId: best.id,
        score: Number(bestScore.toFixed(3)),
      });
    }
  }
  return out;
}
