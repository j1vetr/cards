import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, History } from "lucide-react";
import type { RiftDetails, RiftHistory } from "@shared/rifthunt";
import { RiftSymbol } from "@/components/riftbound/RiftSymbol";

type Range = "1m" | "3m" | "6m" | "1y" | "all";
type Source = "tcgplayer" | "cardmarket";
type Finish = "normal" | "foil";

function money(value: number | null | undefined, currency: string) {
  if (value === null || value === undefined) return "Veri yok";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}
function date(raw?: string | null) {
  if (!raw) return "Tarih yok";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}
async function readJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { credentials: "include" });
  if (response.status === 404) return null;
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Kart bilgisi yüklenemedi (${response.status})`);
  }
  return response.json() as Promise<T>;
}
function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-rose-300/20 bg-rose-400/10 p-3 text-xs text-rose-200"><span>{message}</span><button type="button" onClick={retry} className="font-semibold underline">Yeniden dene</button></div>;
}

export default function RifthuntDetails({ cardId }: { cardId: string | number }) {
  const [range, setRange] = useState<Range>("3m");
  const [source, setSource] = useState<Source>("tcgplayer");
  const [finish, setFinish] = useState<Finish>("normal");
  const id = encodeURIComponent(String(cardId));
  const detailQuery = useQuery<RiftDetails | null>({
    queryKey: ["/api/rifthunt/cards", id],
    queryFn: () => readJson(`/api/rifthunt/cards/${id}`),
    staleTime: 5 * 60_000,
  });
  const historyQuery = useQuery<RiftHistory | null>({
    queryKey: ["/api/rifthunt/cards", id, "history", range],
    queryFn: () => readJson(`/api/rifthunt/cards/${id}/history?range=${range}`),
    enabled: !!detailQuery.data,
    staleTime: 5 * 60_000,
  });
  if (detailQuery.isLoading) return <section aria-label="Riftbound piyasa bilgileri" className="mx-4 mt-8 space-y-3 rounded-2xl border border-white/10 bg-[#11131c] p-5 sm:mx-8"><div className="h-5 w-48 animate-pulse rounded bg-white/10" /><div className="h-24 animate-pulse rounded-xl bg-white/[0.06]" /></section>;
  if (detailQuery.isError) return <section className="mt-8"><ErrorState message={detailQuery.error instanceof Error ? detailQuery.error.message : "Riftbound bilgileri yüklenemedi."} retry={() => detailQuery.refetch()} /></section>;
  const details = detailQuery.data;
  if (!details) return null;
  const p = details.printing;
  const finishKeys = p.finishes.length ? p.finishes : ["normal" as const];
  const activeFinish = finishKeys.includes(finish) ? finish : finishKeys[0];
  const sourcePrefix = source === "tcgplayer" ? "tcgplayer" : "cardmarket";
  const sourceLabel = source === "tcgplayer" ? "TCGplayer" : "Cardmarket";
  const currency = source === "tcgplayer" ? "USD" : "EUR";
  const series = historyQuery.data?.series ?? {};
  const matching = Object.entries(series).filter(([key, item]) => key.toLowerCase().includes(sourcePrefix) || item.currency === currency);
  const selectedSeries = matching[0]?.[1];
  const values = selectedSeries?.[activeFinish] ?? [];
  const dates = historyQuery.data?.dates ?? [];
  const sourceUpdated = source === "tcgplayer" ? p.updatedAt : p.cardmarketUpdatedAt;
  const currentPrice = source === "tcgplayer" ? p.prices[activeFinish]?.market : p.cardmarket[activeFinish]?.trend;
  const sourceUrl = source === "tcgplayer" ? p.tcgplayerUrl : p.cardmarketUrl;

  return <section aria-label="Riftbound piyasa bilgileri" className="mx-4 mt-8 space-y-4 rounded-2xl border border-white/10 bg-[#11131c] p-4 sm:mx-8 sm:p-5">
    <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-300">Riftbound baskı verisi</p><h2 className="mt-1 text-lg font-semibold text-zinc-100">Piyasa ve kart bilgileri</h2><p className="mt-1 text-xs text-zinc-400">{p.setName} · {p.collector} · {p.rarity} · Baskı {p.printingId}</p></div>
      {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-medium text-indigo-200 hover:bg-white/[0.08]">Kaynak sayfası <ExternalLink className="h-3 w-3" /></a>}
    </div>
    <div className="grid gap-3 sm:grid-cols-[1.1fr_1fr]">
      <div className="rounded-xl border border-white/10 bg-[#191c27] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-semibold text-zinc-100">Baskı özellikleri</h3><div className="flex flex-wrap gap-1">{finishKeys.map((f) => <span key={f} className="rounded-full bg-white/[0.08] px-2 py-1 text-[10px] text-zinc-300">{f === "normal" ? "Normal" : "Foil"}</span>)}</div></div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs"><div><dt className="text-zinc-500">Kart tipi</dt><dd className="mt-0.5 font-medium text-zinc-200">{p.type}</dd></div><div><dt className="text-zinc-500">Enerji</dt><dd className="mt-1 flex items-center gap-1.5 font-medium text-zinc-200">{p.energy == null ? "Belirtilmemiş" : <><RiftSymbol name="energy" value={p.energy} /><span>{p.energy}</span></>}</dd></div><div><dt className="text-zinc-500">Güç</dt><dd className="mt-0.5 font-medium text-zinc-200">{p.power ?? "Belirtilmemiş"}</dd></div><div><dt className="text-zinc-500">Might</dt><dd className="mt-1 flex items-center gap-1.5 font-medium text-zinc-200">{p.might == null ? "Belirtilmemiş" : <><RiftSymbol name="might" /><span>{p.might}</span></>}</dd></div></dl>
        {p.domains.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{p.domains.map((d) => <span key={d} className="rounded border border-indigo-300/20 bg-indigo-300/[0.06] px-2 py-1 text-[10px] text-indigo-100">{d}</span>)}</div>}
        {p.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{p.tags.map((t) => <span key={t} className="rounded bg-white/[0.07] px-2 py-1 text-[10px] text-zinc-300">{t}</span>)}</div>}
      </div>
      <div className="rounded-xl border border-white/10 bg-[#191c27] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-semibold text-zinc-100">Piyasa göstergesi</h3><div className="flex gap-1 rounded-md bg-black/20 p-1"><button type="button" onClick={() => setSource("tcgplayer")} aria-pressed={source === "tcgplayer"} className={`rounded px-2 py-1 text-[10px] ${source === "tcgplayer" ? "bg-indigo-500/20 font-semibold text-indigo-100" : "text-zinc-400"}`}>TCGplayer</button><button type="button" onClick={() => setSource("cardmarket")} aria-pressed={source === "cardmarket"} className={`rounded px-2 py-1 text-[10px] ${source === "cardmarket" ? "bg-indigo-500/20 font-semibold text-indigo-100" : "text-zinc-400"}`}>Cardmarket</button></div></div>
        <div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-[10px] text-zinc-500">{activeFinish === "normal" ? "Normal" : "Foil"} market / trend</p><p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-indigo-200">{money(currentPrice, currency)}</p></div><span className="rounded bg-white/[0.07] px-2 py-1 text-[10px] text-zinc-300">{sourceLabel}</span></div>
        <p className="mt-2 text-[10px] text-zinc-500">Kaynak güncellendi: {date(sourceUpdated)}</p>
        {source === "tcgplayer" && p.prices[activeFinish] && <div className="mt-3 grid grid-cols-2 gap-1.5">{(["low", "mid", "high", "directLow"] as const).map((key) => <div key={key} className="rounded bg-black/15 px-2 py-1.5"><p className="text-[9px] uppercase text-zinc-500">{key === "directLow" ? "Direct low" : key === "mid" ? "Medyan" : key === "low" ? "Düşük" : "Yüksek"}</p><p className="text-[11px] font-semibold text-zinc-200">{money(p.prices[activeFinish]?.[key], "USD")}</p></div>)}</div>}
        {source === "cardmarket" && p.cardmarket[activeFinish] && <div className="mt-3 grid grid-cols-2 gap-1.5">{([["trend", "Trend"], ["low", "En düşük"]] as const).map(([key, label]) => <div key={key} className="rounded bg-black/15 px-2 py-1.5"><p className="text-[9px] uppercase text-zinc-500">{label}</p><p className="text-[11px] font-semibold text-zinc-200">{money(p.cardmarket[activeFinish]?.[key], "EUR")}</p></div>)}</div>}
      </div>
    </div>
    {p.flavour && <div className="rounded-xl border border-white/10 bg-[#191c27] p-4"><h3 className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300">Lezzet metni</h3><p className="mt-2 whitespace-pre-wrap text-xs italic leading-5 text-zinc-300">{p.flavour}</p></div>}
    {details.communityTags.length > 0 && <div className="rounded-xl border border-white/10 bg-[#191c27] p-4"><h3 className="text-xs font-semibold text-zinc-100">Topluluk etiketleri</h3><div className="mt-2 flex flex-wrap gap-2">{details.communityTags.map((tag) => <span key={`${tag.kind}-${tag.slug}`} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-zinc-300">{tag.name}<span className="ml-1 text-zinc-500">{tag.kind}</span></span>)}</div></div>}

    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#191c27]">
      <div className="flex flex-col gap-3 border-b border-white/10 p-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="flex items-center gap-2 text-xs font-semibold text-zinc-100"><History className="h-3.5 w-3.5 text-indigo-300" />Fiyat geçmişi</h3><p className="mt-1 text-[10px] text-zinc-500">Eksik kaynak verileri sıfır olarak gösterilmez.</p></div><div className="flex flex-wrap gap-1.5"><select aria-label="Geçmiş aralığı" value={range} onChange={(e) => setRange(e.target.value as Range)} className="h-8 rounded border border-white/15 bg-[#11131c] px-2 text-[10px] text-zinc-200"><option value="1m">1 ay</option><option value="3m">3 ay</option><option value="6m">6 ay</option><option value="1y">1 yıl</option><option value="all">Tümü</option></select><select aria-label="Geçmiş yüzeyi" value={finish} onChange={(e) => setFinish(e.target.value as Finish)} className="h-8 rounded border border-white/15 bg-[#11131c] px-2 text-[10px] text-zinc-200">{finishKeys.map((f) => <option key={f} value={f}>{f === "normal" ? "Normal" : "Foil"}</option>)}</select></div></div>
      <div className="flex flex-wrap gap-1 border-b border-white/10 px-3 py-2">{(["tcgplayer", "cardmarket"] as const).map((s) => <button key={s} type="button" onClick={() => setSource(s)} aria-pressed={source === s} className={`rounded-full px-2.5 py-1 text-[10px] ${source === s ? "bg-indigo-400/20 text-indigo-100" : "bg-white/[0.05] text-zinc-400"}`}>{s === "tcgplayer" ? "TCGplayer USD" : "Cardmarket EUR"}</button>)}</div>
      {historyQuery.isLoading ? <div className="space-y-2 p-4"><div className="h-4 w-32 animate-pulse rounded bg-neutral-100" /><div className="h-8 animate-pulse rounded bg-neutral-100" /></div> : historyQuery.isError ? <div className="p-3"><ErrorState message={historyQuery.error instanceof Error ? historyQuery.error.message : "Fiyat geçmişi alınamadı."} retry={() => historyQuery.refetch()} /></div> : !historyQuery.data || dates.length === 0 || !selectedSeries || values.length === 0 ? <div className="p-8 text-center"><p className="text-xs font-medium text-neutral-700">Bu aralıkta geçmiş fiyat verisi yok</p><p className="mt-1 text-[10px] text-neutral-500">Başka bir tarih aralığı veya kaynak seçin.</p></div> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">{sourceLabel} {finish === "normal" ? "normal" : "foil"} fiyat geçmişi</caption><thead className="bg-[#f6f7f3] text-[10px] uppercase tracking-wide text-neutral-500"><tr><th className="px-3 py-2">Tarih</th><th className="px-3 py-2">Fiyat ({selectedSeries.currency})</th><th className="px-3 py-2">Kaynak alanı</th></tr></thead><tbody className="divide-y divide-neutral-100">{dates.map((d, i) => <tr key={`${d}-${i}`}><td className="whitespace-nowrap px-3 py-2 text-neutral-600">{date(d)}</td><td className="px-3 py-2 font-medium tabular-nums text-neutral-900">{values[i] == null ? "Veri yok" : money(values[i], selectedSeries.currency)}</td><td className="px-3 py-2 text-neutral-500">{selectedSeries.field}</td></tr>)}</tbody></table></div>}
      {historyQuery.data && <p className="border-t border-[#eef0eb] px-3 py-2 text-[10px] text-neutral-500">Gösterilen dönem: {date(historyQuery.data.from)} ile {date(historyQuery.data.to)} · {historyQuery.data.bucket}</p>}
    </div>
    {details.rulings.length > 0 && <div className="rounded-xl border border-white/10 bg-[#191c27] p-4"><h3 className="text-xs font-semibold text-zinc-100">Sık sorulanlar ve kararlar</h3><div className="mt-3 space-y-3">{details.rulings.map((ruling, i) => <article key={i} className="border-l-2 border-indigo-300/50 pl-3"><h4 className="text-xs font-semibold text-zinc-200">{ruling.question}</h4><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-zinc-400">{ruling.answer}</p></article>)}</div><p className="mt-4 border-t border-white/10 pt-3 text-[10px] leading-4 text-zinc-500">Kaynak: <a href={details.rulingSource.url} target="_blank" rel="noreferrer" className="underline">{details.rulingSource.name} <ExternalLink className="inline h-2.5 w-2.5" /></a>. {details.rulingSource.license} lisansı, <a href={details.rulingSource.licenseUrl} target="_blank" rel="noreferrer" className="underline">CC BY-SA 4.0</a> atfı ile sunulmuştur.{details.rulingSource.commit && ` Sürüm: ${details.rulingSource.commit}.`}</p></div>}
    {details.warnings.map((warning, i) => <p key={i} className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{warning}</p>)}
  </section>;
}
