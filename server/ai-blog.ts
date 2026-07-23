import OpenAI from 'openai';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { storage } from './storage';

const GAME_NAMES: Record<string, string> = {
  pokemon: 'Pokémon TCG',
  riftbound: 'Riftbound',
};

const CATEGORY_NAMES: Record<string, string> = {
  guide: 'TCG Rehberi',
  analysis: 'Kart Analizi',
  news: 'Haberler',
  announcements: 'Duyurular',
};

const BASE_RULES = `YAZIM KURALLARI (KESİNLİKLE UYGULA):
- Birinci çoğul şahıs kullan ("biz", "bizim", "bize", "bizden")
- Em dash (—) KULLANMA, asla
- Noktalı virgül (;) KULLANMA, asla
- Paragraflar 3-4 cümleyi geçmesin
- Başlıklar merak uyandırıcı ve somut olsun
- Teknik kavramları sıradan bir TCG oyuncusunun anlayacağı dilde anlat
- "Bu makalede...", "Bu yazıda..." gibi giriş klişelerinden kaçın
- Doğrudan konuya gir, okuyucuyu sürükle
- Gereksiz kalıp ifadelerden kaçın
- Doğal, akıcı Türkçe kullan`;

const TONE_BLOCKS: Record<string, string> = {
  resmi: 'TON: Resmi, otoriter ve bilgilendirici bir ses kullan. Profesyonel dil, nesnel yaklaşım. Spekülatif ifadeler yerine kanıta dayalı cümleler kur.',
  samimi: 'TON: Samimi, sıcak ve okuyucu dostu bir ses kullan. Sanki deneyimli bir TCG oyuncusu başka bir oyuncuya anlatıyor gibi yaz.',
  enerjik: 'TON: Enerjik, heyecan verici ve motive edici bir ses kullan. Güçlü fiiller ve somut örnekler kullan; okuyucuyu harekete geçir.',
};

const SYSTEM_PROMPT = `Sen Go|Cards TCG mağazasının deneyimli bir blog yazarısın.
Türkiye'deki TCG topluluğuna bilgilendirici ve okumaktan keyif alınan içerikler üretiyorsun.

${BASE_RULES}`;

function buildSystemPrompt(tone?: string): string {
  const toneBlock = tone && TONE_BLOCKS[tone] ? TONE_BLOCKS[tone] : TONE_BLOCKS.samimi;
  return `Sen Go|Cards TCG mağazasının deneyimli bir blog yazarısın.
Türkiye'deki TCG topluluğuna bilgilendirici ve okumaktan keyif alınan içerikler üretiyorsun.

${toneBlock}

${BASE_RULES}`;
}

async function getClient(): Promise<OpenAI> {
  const key = await storage.getSiteSetting('openai_api_key');
  if (!key) throw Object.assign(new Error('OpenAI API anahtarı ayarlanmamış. Ayarlar → API Anahtarları bölümünden ekleyin.'), { code: 'NO_KEY' });
  return new OpenAI({ apiKey: key });
}

// ── GET /api/admin/blog/ai/status ─────────────────────────────────────────────
export async function aiStatusHandler(_req: Request, res: Response) {
  const key = await storage.getSiteSetting('openai_api_key');
  return res.json({ hasKey: !!key });
}

// ── POST /api/admin/blog/ai/topics ────────────────────────────────────────────
export async function aiTopicsHandler(req: Request, res: Response) {
  let openai: OpenAI;
  try {
    openai = await getClient();
  } catch (e: any) {
    return res.status(503).json({ error: e.message });
  }

  const { game = 'pokemon', category = 'guide', tone = 'samimi' } = req.body as {
    game: string; category: string; tone?: string;
  };

  // Fetch existing titles server-side to avoid topic overlap
  let existingTitles: string[] = [];
  try {
    const posts = await storage.getBlogPosts();
    existingTitles = posts.map(p => p.title);
  } catch { /* non-critical */ }

  const gameName = GAME_NAMES[game] || game;
  const catName = CATEGORY_NAMES[category] || category;
  const existingBlock = existingTitles.length
    ? `\n\nZaten yazılmış başlıklar (bunlarla örtüşme, tekrar etme):\n${existingTitles.map(t => `- ${t}`).join('\n')}`
    : '';

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt(tone) },
        {
          role: 'user',
          content: `${gameName} oyunu için "${catName}" kategorisinde 7 özgün blog yazısı konusu öner.
Her konu Türk TCG oyuncularının ilgisini çekecek, pratik değer taşıyan ve özgün bir başlık olsun.
Başlıklar merak uyandırıcı olsun (soru, rakam veya somut bir vaat içerebilir).${existingBlock}

Sadece başlıkları döndür, açıklama yapma.
JSON formatında: {"topics": ["başlık 1", "başlık 2", ...]}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 600,
      temperature: 0.85,
    });

    const parsed = JSON.parse(completion.choices[0].message.content || '{}');
    return res.json({ topics: Array.isArray(parsed.topics) ? parsed.topics : [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Konu önerileri alınamadı' });
  }
}

// ── POST /api/admin/blog/ai/outline ──────────────────────────────────────────
export async function aiOutlineHandler(req: Request, res: Response) {
  let openai: OpenAI;
  try {
    openai = await getClient();
  } catch (e: any) {
    return res.status(503).json({ error: e.message });
  }

  const { topic, game = 'pokemon', category = 'guide', tone = 'samimi' } = req.body as {
    topic: string; game: string; category: string; tone?: string;
  };

  if (!topic?.trim()) return res.status(400).json({ error: 'Konu zorunludur' });

  const gameName = GAME_NAMES[game] || game;
  const catName = CATEGORY_NAMES[category] || category;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt(tone) },
        {
          role: 'user',
          content: `"${topic}" konusunda ${gameName} için bir blog yazısı iskelet planı (outline) oluştur.
Kategori: ${catName}

Sadece H2 ve H3 başlıklardan oluşan bir içerik iskeleti döndür.
- 4-6 adet H2 ana bölüm
- Her H2 altında 0-2 adet H3 alt başlık (gerektiğinde)
- Başlıklar somut, merak uyandırıcı ve konuyla ilgili olsun
- Giriş ve Sonuç başlıklarını da ekle

JSON formatında döndür:
{"outline": [{"level": 2, "text": "Başlık"}, {"level": 3, "text": "Alt başlık"}, ...]}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800,
      temperature: 0.75,
    });

    const parsed = JSON.parse(completion.choices[0].message.content || '{}');
    const outline = Array.isArray(parsed.outline) ? parsed.outline : [];
    return res.json({ outline });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Taslak oluşturulamadı' });
  }
}

// ── POST /api/admin/blog/ai/titles ───────────────────────────────────────────
export async function aiTitlesHandler(req: Request, res: Response) {
  let openai: OpenAI;
  try {
    openai = await getClient();
  } catch (e: any) {
    return res.status(503).json({ error: e.message });
  }

  const { topic, game = 'pokemon', tone = 'samimi' } = req.body as {
    topic: string; game: string; tone?: string;
  };

  if (!topic?.trim()) return res.status(400).json({ error: 'Konu zorunludur' });

  const gameName = GAME_NAMES[game] || game;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt(tone) },
        {
          role: 'user',
          content: `"${topic}" konusu için ${gameName} TCG blogu için 3 farklı başlık stili öner.
1. SORU — merak uyandırıcı soru formatı
2. LİSTE — "X şey", "En iyi N..." formatı
3. VAAT — okuyucuya somut bir fayda vadeden format

Başlıklar Türkçe olsun, klişe olmayan, özgün ve arama dostu olsun.

JSON formatında döndür:
{"titles": ["soru başlığı", "liste başlığı", "vaat başlığı"]}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
      temperature: 0.85,
    });

    const parsed = JSON.parse(completion.choices[0].message.content || '{}');
    const titles = Array.isArray(parsed.titles) ? parsed.titles.slice(0, 3) : [];
    return res.json({ titles });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Başlık önerileri alınamadı' });
  }
}

// ── POST /api/admin/blog/ai/social ───────────────────────────────────────────
export async function aiSocialHandler(req: Request, res: Response) {
  let openai: OpenAI;
  try {
    openai = await getClient();
  } catch (e: any) {
    return res.status(503).json({ error: e.message });
  }

  const { title, summary, slug } = req.body as {
    title: string; summary?: string; slug: string;
  };

  if (!title?.trim()) return res.status(400).json({ error: 'Başlık zorunludur' });

  const postUrl = `https://gocards.com.tr/blog/${slug}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Sen Go|Cards TCG mağazasının sosyal medya yöneticisisin. Türkiye'deki TCG topluluğuna hitap ediyorsun.
Türkçe yazıyorsun. Samimi, enerjik ve markayla uyumlu bir ses kullanıyorsun.
Go|Cards TCG markasının Instagram'ı: @gocards_tcg`,
        },
        {
          role: 'user',
          content: `Aşağıdaki blog yazısı için 3 farklı platformda paylaşım metni üret.

Başlık: "${title}"
Özet: "${summary || ''}"
Link: ${postUrl}

Kurallar:
- Instagram caption: Emoji kullan, hashtaglerle bitir (#PokemonTCG #GoCards #TCGTürkiye dahil), 2200 karakterin altında
- Twitter/X postu: En fazla 280 karakter, link dahil, 1-2 emoji
- WhatsApp yayın mesajı: Kısa ve samimi, link ile biter, emoji kullan

JSON formatında döndür:
{"instagram": "...", "twitter": "...", "whatsapp": "..."}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 900,
      temperature: 0.8,
    });

    const parsed = JSON.parse(completion.choices[0].message.content || '{}');
    // Enforce Twitter 280-char limit: if over, trim at last space before 277 and append "…"
    let twitter = (parsed.twitter || '') as string;
    if (twitter.length > 280) {
      const cutAt = twitter.lastIndexOf(' ', 277);
      twitter = (cutAt > 0 ? twitter.slice(0, cutAt) : twitter.slice(0, 277)) + '…';
    }
    return res.json({
      instagram: parsed.instagram || '',
      twitter,
      whatsapp: parsed.whatsapp || '',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Sosyal medya metinleri üretilemedi' });
  }
}

// ── POST /api/admin/blog/ai/generate ─────────────────────────────────────────
export async function aiGenerateHandler(req: Request, res: Response) {
  let openai: OpenAI;
  try {
    openai = await getClient();
  } catch (e: any) {
    return res.status(503).json({ error: e.message });
  }

  const { topic, game = 'pokemon', category = 'guide', focusKeyword = '', tone = 'samimi', outline } = req.body as {
    topic: string; game: string; category: string; focusKeyword?: string; tone?: string;
    outline?: Array<{ level: number; text: string }>;
  };

  if (!topic?.trim()) return res.status(400).json({ error: 'Konu zorunludur' });

  const gameName = GAME_NAMES[game] || game;
  const catName = CATEGORY_NAMES[category] || category;
  const kwBlock = focusKeyword?.trim()
    ? `\nBu makalenin odak anahtar kelimesi: "${focusKeyword.trim()}". İlk 100 kelimede, en az bir H2 başlığında ve metin boyunca doğal bir şekilde kullan.`
    : '';
  const outlineBlock = Array.isArray(outline) && outline.length > 0
    ? `\n\nAşağıdaki başlık iskeletini kullan (sırayı ve başlıkları koru, her bölümü detaylı yaz):\n${outline.map(o => `${'  '.repeat(o.level - 2)}<h${o.level}>${o.text}</h${o.level}>`).join('\n')}`
    : '';

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: buildSystemPrompt(tone) },
        {
          role: 'user',
          content: `"${topic}" konusunda ${gameName} için bir blog yazısı yaz.
Kategori: ${catName}${kwBlock}${outlineBlock}

Şu JSON formatında döndür:
{
  "title": "yazının nihai başlığı",
  "summary": "2-3 cümlelik özet — liste sayfasında gösterilecek",
  "content": "tam makale içeriği HTML olarak",
  "metaTitle": "Google için optimize edilmiş başlık (50-60 karakter)",
  "metaDescription": "Google arama snippeti (140-160 karakter, anahtar kelime dahil)"
}

İÇERİK TALİMATLARI:
- En az 900 kelime olsun
- HTML kullan: h2, h3, p, ul, li, strong — markdown değil
- Paragraflar kısa tut (3-4 cümle max)
- Em dash (—) ve noktalı virgül (;) KULLANMA
- Birinci çoğul şahıs ("biz", "bizim") kullan
- Giriş klişesiz olsun, okuyucuyu anında içine çek
- Gerçek oyun mekaniklerinden, kartlardan veya meta'dan örnekler ver
- Makale sonunda kısa bir "Sonuç" bölümü ekle`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4500,
      temperature: 0.72,
    });

    const parsed = JSON.parse(completion.choices[0].message.content || '{}');
    return res.json({
      title: parsed.title || topic,
      summary: parsed.summary || '',
      content: parsed.content || '',
      metaTitle: parsed.metaTitle || '',
      metaDescription: parsed.metaDescription || '',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Makale üretilemedi' });
  }
}

// ── POST /api/admin/blog/ai/faq ──────────────────────────────────────────────
export async function aiFaqHandler(req: Request, res: Response) {
  let openai: OpenAI;
  try {
    openai = await getClient();
  } catch (e: any) {
    return res.status(503).json({ error: e.message });
  }

  const { title = '', content = '', category = 'guide' } = req.body as {
    title: string; content: string; category: string;
  };

  if (!content?.trim()) {
    return res.status(400).json({ error: 'Makale içeriği zorunludur' });
  }

  const catName = CATEGORY_NAMES[category] || category;
  // Strip HTML tags for the prompt to save tokens
  const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Aşağıdaki TCG blog yazısını okuyan bir okuyucunun aklına gelebilecek 5-6 gerçekçi soru-cevap çifti üret.
Kategori: ${catName}
Başlık: "${title}"

İçerik özeti:
${plainText}

Kurallar:
- Sorular gerçek okuyucuların sorabileceği pratik sorular olsun
- Cevaplar 2-4 cümle, doğal Türkçe, birinci çoğul şahıs ("biz", "bizim")
- Em dash (—) ve noktalı virgül (;) KULLANMA
- Yapay zeka gibi değil, insan gibi yaz

JSON formatında döndür:
{"faqItems": [{"question": "Soru metni?", "answer": "Cevap metni."}]}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1200,
      temperature: 0.7,
    });

    const parsed = JSON.parse(completion.choices[0].message.content || '{}');
    const items = Array.isArray(parsed.faqItems) ? parsed.faqItems : [];
    return res.json({ faqItems: items });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'FAQ üretilemedi' });
  }
}

// ── POST /api/admin/blog/ai/cover ─────────────────────────────────────────────
export async function aiCoverHandler(req: Request, res: Response) {
  let openai: OpenAI;
  try {
    openai = await getClient();
  } catch (e: any) {
    return res.status(503).json({ error: e.message });
  }

  const { topic, game = 'pokemon' } = req.body as { topic: string; game: string };
  if (!topic?.trim()) return res.status(400).json({ error: 'Konu zorunludur' });

  const gameName = GAME_NAMES[game] || game;
  const prompt = `Professional blog cover image for a Turkish trading card game (TCG) store article. Topic: "${topic}". Game: ${gameName}. Style: clean, modern flat design with vibrant colors, card game aesthetic, no text overlays, digital art, 16:9 landscape format.`;

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1792x1024',
      response_format: 'b64_json',
    });

    const b64 = response.data[0]?.b64_json;
    if (!b64) return res.status(500).json({ error: 'Görsel verisi alınamadı' });

    const buffer = Buffer.from(b64, 'base64');
    const dir = path.join(process.cwd(), 'client', 'public', 'uploads', 'blog');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filename = `ai-cover-${crypto.randomUUID()}.png`;
    fs.writeFileSync(path.join(dir, filename), buffer);

    return res.json({ url: `/uploads/blog/${filename}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Kapak görseli üretilemedi' });
  }
}
