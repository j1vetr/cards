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

const SYSTEM_PROMPT = `Sen Go|Cards TCG mağazasının deneyimli bir blog yazarısın.
Türkiye'deki TCG topluluğuna samimi, bilgilendirici ve okumaktan keyif alınan içerikler üretiyorsun.

YAZIM KURALLARI (KESİNLİKLE UYGULA):
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

  const { game = 'pokemon', category = 'guide' } = req.body as {
    game: string; category: string;
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
        { role: 'system', content: SYSTEM_PROMPT },
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

// ── POST /api/admin/blog/ai/generate ─────────────────────────────────────────
export async function aiGenerateHandler(req: Request, res: Response) {
  let openai: OpenAI;
  try {
    openai = await getClient();
  } catch (e: any) {
    return res.status(503).json({ error: e.message });
  }

  const { topic, game = 'pokemon', category = 'guide', focusKeyword = '' } = req.body as {
    topic: string; game: string; category: string; focusKeyword?: string;
  };

  if (!topic?.trim()) return res.status(400).json({ error: 'Konu zorunludur' });

  const gameName = GAME_NAMES[game] || game;
  const catName = CATEGORY_NAMES[category] || category;
  const kwBlock = focusKeyword?.trim()
    ? `\nBu makalenin odak anahtar kelimesi: "${focusKeyword.trim()}". İlk 100 kelimede, en az bir H2 başlığında ve metin boyunca doğal bir şekilde kullan.`
    : '';

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `"${topic}" konusunda ${gameName} için bir blog yazısı yaz.
Kategori: ${catName}${kwBlock}

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
- 4-6 ana bölüm h2 ile işaretle, gerekirse h3 alt başlık
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
