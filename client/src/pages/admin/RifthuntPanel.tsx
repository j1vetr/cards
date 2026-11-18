import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, ExternalLink, RefreshCw, Search, ShieldCheck, Sparkles } from "lucide-react";
import type { RiftAdminRow, RiftCatalog, RiftRun, RiftStatus } from "@shared/rifthunt";
import { Card, PrimaryButton, SecondaryButton } from "./_ui/AdminUI";

const STATUS_KEY = ["/api/admin/rifthunt/status"];
const CATALOG_KEY = ["/api/admin/rifthunt/catalog"];
const titleCaseTr = (value: string) => value.split(/(\s+)/).map((word) => {
  if (!word.trim() || /^(TCG|CM|TL|USD)$/i.test(word)) return word.toLocaleUpperCase("tr-TR");
  if (/^rifthunt$/i.test(word)) return "RiftHunt";
  if (/^tcgplayer$/i.test(word)) return "TCGplayer";
  if (/^cardmarket$/i.test(word)) return "Cardmarket";
  return word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1).toLocaleLowerCase("tr-TR");
}).join("");
const money = (n: number | string | null | undefined, currency: string) => {
  if (n === null || n === undefined || n === "") return "Veri yok";
  const value = Number(n);
  return Number.isFinite(value) ? new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value) : "Veri yok";
};
const age = (raw?: string | null) => {
  if (!raw) return "Güncelleme tarihi yok";
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw : new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(d);
};
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `İstek tamamlanamadı (${response.status})`);
  }
  return response.json() as Promise<T>;
}
function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="flex items-start justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800"><span>{message}</span>{retry && <button type="button" onClick={retry} className="font-semibold underline">Yeniden Dene</button>}</div>;
}
function PriceTile({ title, value, currency, className = "" }: { title: string; value: number | string | null | undefined; currency: string; className?: string }) {
  return <div className={`rounded-md px-2.5 py-2 ${className}`}><p className="text-[10px] tracking-wide text-neutral-500">{title}</p><p className="mt-0.5 text-[12px] font-semibold tabular-nums text-neutral-800">{money(value, currency)}</p></div>;
}
function InventoryRow({ row, enabled, onSave }: { row: RiftAdminRow; enabled: boolean; onSave: (row: RiftAdminRow, stock: number) => void }) {
  const [value, setValue] = useState(String(row.stock));
  const [error, setError] = useState("");
  useEffect(() => setValue(String(row.stock)), [row.stock]);
  const validPrice = row.finish !== null && row.salePrice !== null && Number.isFinite(Number(row.salePrice)) && Number(row.salePrice) > 0;
  const valid = /^\d+$/.test(value) && Number(value) >= 0;
  const p = row.printing;
  return <tr data-testid="rift-inventory-row" data-printing-id={p.printingId} data-finish={row.finish ?? ""} className="align-top border-b border-neutral-100 last:border-0 hover:bg-[#f8f7f2]">
    <td className="px-3 py-3 min-w-[250px]">
      <div className="flex gap-3">
        {p.image ? <img src={p.image} alt="" loading="lazy" className="h-[76px] w-[54px] rounded border border-neutral-200 object-cover bg-neutral-100" /> : <div className="h-[76px] w-[54px] rounded border border-neutral-200 bg-neutral-100" />}
        <div className="min-w-0"><p className="font-semibold text-neutral-900">{p.name}</p><p className="mt-0.5 text-[11px] text-neutral-500">{p.setName} · {p.collector} · {p.rarity}</p><p className="text-[11px] text-neutral-500">{p.type}{p.domains.length ? ` · ${p.domains.join(", ")}` : ""}</p><div className="mt-1 flex flex-wrap gap-1">{[p.alternate && "Alternatif", p.signature && "İmza", p.overnumbered && "Numara Üstü", ...p.tags].filter(Boolean).map((tag) => <span key={String(tag)} className="rounded bg-[#e9eee9] px-1.5 py-0.5 text-[10px] text-[#465a4d]">{tag}</span>)}</div><div className="mt-1 flex gap-2 text-[10px]">{p.tcgplayerUrl && <a href={p.tcgplayerUrl} target="_blank" rel="noreferrer" className="text-teal-800 underline">TCGplayer <ExternalLink className="inline h-2.5 w-2.5" /></a>}{p.cardmarketUrl && <a href={p.cardmarketUrl} target="_blank" rel="noreferrer" className="text-teal-800 underline">Cardmarket <ExternalLink className="inline h-2.5 w-2.5" /></a>}</div></div>
      </div>
    </td>
    <td className="px-3 py-3 min-w-[150px]">
      <div className="flex flex-wrap gap-1">{p.finishes.map((f) => <span key={f} className={`rounded-full border px-2 py-0.5 text-[10px] ${f === row.finish ? "border-[#1f625a] bg-[#e3f1eb] text-[#1f625a]" : "border-neutral-200 text-neutral-500"}`}>{f === "normal" ? "Normal" : "Foil"}</span>)}</div>
      <p className="mt-1 text-[10px] text-neutral-500">Baskı {p.printingId}</p>
      <p className="text-[10px] text-neutral-500">TCG fiyatı: {age(p.updatedAt)}</p>
      <p className="text-[10px] text-neutral-500">Cardmarket: {age(p.cardmarketUpdatedAt)}</p>
       <p className="mt-1 text-[10px] text-neutral-600">{row.reason || (validPrice ? "Piyasa Fiyatı Mevcut" : "Satış Fiyatı Yok")}</p>
       <p className={`mt-1 text-[10px] font-medium ${row.cardId ? "text-emerald-700" : "text-amber-800"}`} data-testid="rift-row-import-status">{row.cardId ? "Site Kataloğuna Aktarılmış" : "Yalnızca Kaynakta Var, Henüz Siteye Aktarılmadı"}</p>
    </td>
    <td className="px-3 py-3 min-w-[220px]">
      <div className="grid grid-cols-2 gap-1.5">
         <PriceTile title="Sitedeki Fiyat" value={row.oldPrice} currency="TRY" className="bg-neutral-50" />
         <PriceTile title="Hesaplanan TL" value={row.salePrice} currency="TRY" className={validPrice ? "bg-emerald-50" : "bg-amber-50"} />
         <PriceTile title="TCG Market" value={row.finish ? p.prices[row.finish]?.market : null} currency="USD" className="bg-neutral-50" />
         <PriceTile title="CM Trend" value={row.finish ? p.cardmarket[row.finish]?.trend : null} currency="EUR" className="bg-neutral-50" />
      </div>
    </td>
    <td className="px-3 py-3 min-w-[165px]">
       <label className="block text-[10px] font-medium tracking-wide text-neutral-500">Stok Adedi</label>
       <div className="mt-1 flex gap-1.5"><input aria-label={`${p.name} Stok Adedi`} type="number" min="0" step="1" value={value} onChange={(e) => { setValue(e.target.value); setError(""); }} disabled={!enabled || !validPrice} className="h-8 w-20 rounded border border-neutral-300 px-2 text-sm tabular-nums disabled:bg-neutral-100" /><button type="button" disabled={!enabled || !validPrice || !valid || Number(value) === row.stock} onClick={() => { if (valid) onSave(row, Number(value)); }} className="h-8 rounded bg-[#174c45] px-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Kaydet</button></div>
      {error && <p className="text-[10px] text-rose-700">{error}</p>}
      {!validPrice && <p className="mt-1 max-w-[150px] text-[10px] text-amber-800">Fiyat geçerli değil, stok düzenlenemez.</p>}
      {!enabled && validPrice && !row.cardId && <p className="mt-1 max-w-[150px] text-[10px] text-neutral-500">Stok girmek için önce kartı siteye aktarın.</p>}
    </td>
  </tr>;
}

export default function RifthuntPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [setCode, setSetCode] = useState("");
  const [finish, setFinish] = useState("");
  const [rarity, setRarity] = useState("");
  const [stockFilter, setStockFilter] = useState("empty");
  const [priced, setPriced] = useState("all");
  const [sort, setSort] = useState("price_desc");
  const [minPriceText, setMinPriceText] = useState("");
  const [maxPriceText, setMaxPriceText] = useState("");
  const [page, setPage] = useState(1);
  const [multiplierText, setMultiplierText] = useState("1.9");
  const [autoDaily, setAutoDaily] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [resetText, setResetText] = useState("");
  const [resetWarnings, setResetWarnings] = useState<string[]>([]);
  const [stockFeedback, setStockFeedback] = useState("");
  const [now, setNow] = useState(Date.now());
  const settingsInitialized = useRef(false);
  const multiplier = Number(multiplierText);
  const validMultiplier = Number.isFinite(multiplier) && multiplier > 0 && multiplier <= 100;
  const minPrice = minPriceText.trim() === "" ? null : Number(minPriceText);
  const maxPrice = maxPriceText.trim() === "" ? null : Number(maxPriceText);
  const validMinPrice = minPrice === null || (Number.isFinite(minPrice) && minPrice >= 0);
  const validMaxPrice = maxPrice === null || (Number.isFinite(maxPrice) && maxPrice >= 0);
  const validPriceRange = validMinPrice && validMaxPrice && (minPrice === null || maxPrice === null || minPrice <= maxPrice);
  const priceRangeError = !validMinPrice || !validMaxPrice
    ? "Fiyat sınırları sıfır veya daha büyük, geçerli TL değerleri olmalı."
    : !validPriceRange ? "En düşük fiyat, en yüksek fiyattan büyük olamaz." : "";
  const queryString = useMemo(() => {
    const params = new URLSearchParams({ search, set: setCode, finish, rarity, stock: stockFilter, priced, sort, page: String(page), limit: "30" });
    if (minPrice !== null && validMinPrice) params.set("minPrice", String(minPrice));
    if (maxPrice !== null && validMaxPrice) params.set("maxPrice", String(maxPrice));
    if (runId) params.set("previewId", runId);
    return params.toString();
  }, [search, setCode, finish, rarity, stockFilter, priced, sort, minPrice, maxPrice, minPriceText, maxPriceText, validMinPrice, validMaxPrice, page, runId]);
  const statusQuery = useQuery<RiftStatus>({ queryKey: STATUS_KEY, queryFn: () => request("/api/admin/rifthunt/status"), refetchInterval: 10000, refetchOnWindowFocus: false });
  useEffect(() => {
    if (statusQuery.data && !settingsInitialized.current) {
      settingsInitialized.current = true;
      const latest = statusQuery.data.latestRun?.status === "ready" ? statusQuery.data.latestRun : null;
      setMultiplierText(String(latest?.multiplier ?? statusQuery.data.config.multiplier));
      setAutoDaily(latest?.autoDaily ?? statusQuery.data.config.autoDaily);
    }
  }, [statusQuery.data?.config.multiplier, statusQuery.data?.config.autoDaily]);
  const catalogQuery = useQuery<RiftCatalog>({ queryKey: [...CATALOG_KEY, queryString], queryFn: () => request(`/api/admin/rifthunt/catalog?${queryString}`), enabled: validPriceRange, refetchOnWindowFocus: false });
  const currentStatus = catalogQuery.data ?? statusQuery.data;
  useEffect(() => { if (statusQuery.data?.latestRun && !runId) setRunId(statusQuery.data.latestRun.id); }, [statusQuery.data?.latestRun?.id]);
  const runQuery = useQuery<RiftRun>({ queryKey: ["/api/admin/rifthunt/runs", runId], queryFn: () => request(`/api/admin/rifthunt/runs/${encodeURIComponent(runId!)}`), enabled: !!runId, refetchInterval: (q) => q.state.data?.status === "running" ? 2000 : false, refetchOnWindowFocus: false });
  const run = runQuery.data ?? (currentStatus?.latestRun?.id === runId ? currentStatus.latestRun : null);
  useEffect(() => {
    if (run?.status !== "ready") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [run?.status]);
  useEffect(() => {
    if (run?.status === "ready" || run?.status === "applied") qc.invalidateQueries({ queryKey: CATALOG_KEY });
  }, [run?.id, run?.status, qc]);
  const runExpiry = run?.expiresAt ? new Date(run.expiresAt).getTime() <= now : false;
  const canApply = !!run && run.status === "ready" && !runExpiry && currentStatus?.latestRun?.id === run.id && run.multiplier === multiplier && run.autoDaily === autoDaily;
  const previewMutation = useMutation({
    mutationFn: () => request<{ id: string }>("/api/admin/rifthunt/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ multiplier, autoDaily }) }),
    onSuccess: ({ id }) => { setRunId(id); qc.invalidateQueries({ queryKey: STATUS_KEY }); },
  });
  const applyMutation = useMutation({
    mutationFn: (id: string) => request<{ success: true; updated: number; importedCards?: number; importedSets?: number }>(`/api/admin/rifthunt/runs/${encodeURIComponent(id)}/apply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
    onSuccess: async (result, id) => {
      qc.setQueryData<RiftRun>(["/api/admin/rifthunt/runs", id], (old) => old ? { ...old, status: "applied", appliedAt: new Date().toISOString(), importedCards: result.importedCards, importedSets: result.importedSets } : old);
      await Promise.all([qc.invalidateQueries({ queryKey: STATUS_KEY }), qc.invalidateQueries({ queryKey: CATALOG_KEY }), qc.invalidateQueries({ predicate: (q) => /card|listing|inventory/i.test(q.queryKey.map(String).join("/")) })]);
    },
  });
  const stockMutation = useMutation({
    mutationFn: ({ row, stock }: { row: RiftAdminRow; stock: number }) => request<{ success: true }>("/api/admin/rifthunt/stock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ printingId: row.printing.printingId, finish: row.finish, stock, expectedStock: row.stock, expectedUpdatedAt: row.updatedAt }) }),
    onSuccess: async (_result, { row, stock }) => {
      setStockFeedback(stockFilter === "empty" && stock > 0
        ? `${row.printing.name} İçin Stok ${stock} Olarak Kaydedildi. Kart, Stok Yok Filtresinden Kaldırıldı.`
        : `${row.printing.name} Stok Adedi ${stock} Olarak Kaydedildi.`);
      await Promise.all([qc.invalidateQueries({ queryKey: CATALOG_KEY }), qc.invalidateQueries({ queryKey: STATUS_KEY }), qc.invalidateQueries({ predicate: (q) => /card|listing|inventory/i.test(q.queryKey.map(String).join("/")) })]);
    },
  });
  const resetMutation = useMutation({
    mutationFn: () => request<{ success: true; warnings: string[] }>("/api/admin/rifthunt/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation: resetText }) }),
    onSuccess: async ({ warnings }) => { setResetWarnings(warnings); setResetText(""); setRunId(null); await Promise.all([qc.invalidateQueries({ queryKey: STATUS_KEY }), qc.invalidateQueries({ queryKey: CATALOG_KEY }), qc.invalidateQueries({ predicate: (q) => /card|listing|inventory/i.test(q.queryKey.map(String).join("/")) })]); },
  });
  const previewInProgress = previewMutation.isPending || run?.status === "running";
  const resetEligible = !!statusQuery.data && !statusQuery.data.config.enabled && !statusQuery.data.config.resetAt;
  const statusError = statusQuery.error instanceof Error ? statusQuery.error.message : "Durum bilgisi alınamadı.";
  const priceIssues = [previewMutation.error, applyMutation.error, stockMutation.error, resetMutation.error].filter(Boolean) as Error[];

  return <section className="space-y-4" aria-label="Riftbound fiyat ve stok yönetimi">
     <Card className="overflow-hidden border-[#cbd8ce]">
      <div className="bg-[#e9eee8] px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
           <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#d5e3d7] text-[#28584b]"><Sparkles className="h-5 w-5" /></div><div><h2 className="text-base font-semibold text-[#203a32]">Riftbound Fiyat Ve Stok</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-[#53665b]">Her baskının piyasa verisinden TRY satış fiyatı önerilir. Fiyatı personel belirlemez, yalnızca stok adedini günceller.</p></div></div>
           <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-medium ${currentStatus?.config.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{currentStatus?.config.enabled ? "Fiyatlama Etkin" : "Henüz Etkinleştirilmedi"}</span>
        </div>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        {statusQuery.isLoading ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[1,2,3,4].map((n) => <div key={n} className="h-16 animate-pulse rounded-md bg-[#f0f1ec]" />)}</div> : statusQuery.isError ? <ErrorBox message={statusError} retry={() => statusQuery.refetch()} /> : currentStatus && <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[
           ["Sitedeki Kart", currentStatus.counts.cards], ["Sitedeki Set", currentStatus.counts.sets], ["İlan", currentStatus.counts.listings], ["Toplam Stok", currentStatus.counts.stock],
         ].map(([label, value]) => <div key={String(label)} className="rounded-md border border-[#e5e7df] bg-[#fafaf7] px-3 py-2"><p className="text-[10px] font-medium tracking-wide text-neutral-500">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums text-[#274a3d]">{Number(value).toLocaleString("tr-TR")}</p></div>)}</div>}
        {currentStatus?.warnings.map((warning, i) => <div key={i} className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0" />{warning}</div>)}
        {currentStatus?.config.lastError && <ErrorBox message={currentStatus.config.lastError} />}
        <div className="grid gap-3 rounded-lg border border-[#e5e7df] p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-[11px] font-medium text-neutral-600">Satış Çarpanı
            <div className="mt-1 flex h-9 items-center rounded border border-neutral-300 bg-white px-2"><input type="number" min="0.01" max="100" step="0.1" value={multiplierText} onChange={(e) => setMultiplierText(e.target.value)} className="w-full text-sm outline-none" /><span className="text-xs text-neutral-500">×</span></div>
            {!validMultiplier && <span className="mt-1 block text-[10px] text-rose-700">0 ile 100 arasında değer girin.</span>}
          </label>
          <label className="flex min-h-9 items-center gap-2 text-xs text-neutral-700"><input type="checkbox" checked={autoDaily} onChange={(e) => setAutoDaily(e.target.checked)} className="accent-[#1e5d53]" />Uygulanan Ayarla Günlük Otomatik Fiyatla</label>
          <PrimaryButton onClick={() => { setRunId(null); previewMutation.reset(); applyMutation.reset(); previewMutation.mutate(); }} disabled={!validMultiplier || previewInProgress} className="bg-[#174c45] hover:bg-[#123d37]">{previewInProgress ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Fiyatları Önizle</PrimaryButton>
        </div>
        <p className="text-[11px] leading-5 text-neutral-500">1. Fiyatları önizle ile kaynak verisini getir. 2. Kartları ve setleri siteye aktar ile Kartlar ve Riftbound sayfalarına kaydet, fiyatları uygula. Yeni kartlar 0 stokla eklenir, mevcut stoklar korunur. Stok hesabı NM ve derecelendirilmemiş kart piyasa fiyatını kullanır, PSA fiyatı değildir.</p>
         {currentStatus?.snapshotAt && currentStatus.counts.cards === 0 && <div role="status" data-testid="rift-import-required" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-900"><p className="font-semibold">Kaynak Verisi Alındı Ama Site Kataloğunda Henüz Kart Yok.</p><p>API Sync tablosunda gördüğünüz kartlar şu anda yalnızca kaynak verisidir. Kartlar ve Riftbound sayfalarında görünmeleri için aşağıdaki aktarım düğmesiyle işlemi tamamlayın. Düğme kapalıysa veya görünmüyorsa önce Fiyatları Önizle ile yeni bir önizleme oluşturun. Tekrar silme veya sıfırlama gerekmez.</p></div>}
        {priceIssues.map((e, i) => <ErrorBox key={i} message={e.message} />)}
        {runQuery.isError && <ErrorBox message={runQuery.error instanceof Error ? runQuery.error.message : "Önizleme alınamadı."} retry={() => runQuery.refetch()} />}
         {previewInProgress && <div className="animate-pulse rounded-md border border-[#cbd8ce] bg-[#f5f7f3] p-3 text-xs text-[#365447]">Piyasa Verileri Ve TRY Fiyatları Hazırlanıyor…</div>}
        {run && <div className="rounded-lg border border-[#d5dfd5] bg-[#f7f8f4] p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
             <div><p className="text-sm font-semibold text-[#263e33]">{run.status === "applied" ? "Bu Önizleme Uygulandı" : run.status === "failed" ? "Önizleme Başarısız" : run.status === "running" ? "Önizleme Hazırlanıyor" : "Uygulama Önizlemesi Hazır"}</p><p className="mt-1 text-[11px] text-neutral-600">{run.priced.toLocaleString("tr-TR")} / {run.total.toLocaleString("tr-TR")} baskıda fiyat var · Çarpan {run.multiplier}× · {age(run.createdAt)}</p>{run.rate && <p className="text-[11px] text-neutral-600">Kur: 1 USD = {run.rate.usdTry.toLocaleString("tr-TR", { maximumFractionDigits: 4 })} TL · {run.rate.source} · {run.rate.date}</p>}{run.error && <p className="mt-1 text-xs text-rose-700">{run.error}</p>}</div>
             {run.status === "ready" && <PrimaryButton disabled={!canApply || applyMutation.isPending} onClick={() => { if (window.confirm(`${run.total} kaynak baskı site kataloğuna aktarılacak ve ${run.priced} baskının fiyatı uygulanacak. Yeni kartlar 0 stokla eklenecek, mevcut stoklar korunacak. Devam edilsin mi?`)) applyMutation.mutate(run.id); }} className="bg-[#174c45] hover:bg-[#123d37]" data-testid="button-rift-import">{applyMutation.isPending ? "Kartlar Ve Setler Aktarılıyor…" : "Kartları Ve Setleri Siteye Aktar"}</PrimaryButton>}
          </div>
          {run.status === "ready" && (!canApply) && <p className="mt-2 text-[11px] text-amber-800">Önizleme süresi dolmuş veya ayarlar değişmiş. Uygulamak için yeni önizleme oluşturun.</p>}
           {applyMutation.isSuccess && <p className="mt-2 flex items-center gap-1 text-xs text-emerald-800"><Check className="h-3.5 w-3.5" />{applyMutation.data.updated.toLocaleString("tr-TR")} Fiyat Uygulandı.</p>}
           {run.status === "applied" && run.importedCards !== undefined && run.importedSets !== undefined && <div role="status" data-testid="rift-import-complete" className="mt-2 text-xs leading-5 text-emerald-800"><p>{run.importedCards.toLocaleString("tr-TR")} kart ve {run.importedSets.toLocaleString("tr-TR")} set siteye aktarıldı. Kartlar bölümünde ve Riftbound kategorisinde listelenebilir.</p><div className="mt-1 flex gap-3"><a href="/toov-admin?tab=cards" className="font-semibold underline">Kartlar Bölümünü Aç</a><a href="/riftbound" target="_blank" rel="noreferrer" className="font-semibold underline">Riftbound Kategorisini Aç</a></div></div>}
        </div>}
        {resetWarnings.map((w, i) => <div key={i} className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">{w}</div>)}
      </div>
    </Card>

    <Card className="overflow-hidden">
       <div className="border-b border-neutral-200 px-4 py-3 sm:px-5"><div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-sm font-semibold text-neutral-900">Baskı Kataloğu</h3><p className="text-[11px] text-neutral-500">Stoksuz baskılar ve hesaplanan TL fiyatları. Fiyat girişi gerekmez.</p></div><span className="text-[11px] tabular-nums text-neutral-500">{catalogQuery.data?.summary.matchedRows.toLocaleString("tr-TR") ?? 0} baskı satırı eşleşti</span></div></div>
      <div className="grid gap-2 border-b border-neutral-100 bg-[#fafaf7] p-3 sm:grid-cols-2 lg:grid-cols-4">
         <label className="relative sm:col-span-2"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); setStockFeedback(""); }} placeholder="Kart Veya Baskı Ara" className="h-9 w-full rounded border border-neutral-300 bg-white pl-8 pr-3 text-xs" /></label>
         <label className="sr-only" htmlFor="rift-set-filter">Set Filtresi</label><select id="rift-set-filter" aria-label="Set Filtresi" value={setCode} onChange={(e) => { setSetCode(e.target.value); setPage(1); }} className="h-9 rounded border border-neutral-300 bg-white px-2 text-xs"><option value="">Tüm Setler</option>{catalogQuery.data?.sets.map((s) => <option key={s.code} value={s.code}>{titleCaseTr(s.name)}</option>)}</select>
         <select aria-label="Baskı Yüzeyi" value={finish} onChange={(e) => { setFinish(e.target.value); setPage(1); }} className="h-9 rounded border border-neutral-300 bg-white px-2 text-xs"><option value="">Tüm Yüzeyler</option><option value="normal">Normal</option><option value="foil">Foil</option></select>
         <select aria-label="Stok Filtresi" value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); setPage(1); setStockFeedback(""); }} className="h-9 rounded border border-neutral-300 bg-white px-2 text-xs"><option value="all">Tüm Stoklar</option><option value="stocked">Stokta</option><option value="empty">Stok Yok</option></select>
         <select aria-label="Fiyat Filtresi" value={priced} onChange={(e) => { setPriced(e.target.value); setPage(1); }} className="h-9 rounded border border-neutral-300 bg-white px-2 text-xs"><option value="all">Tüm Fiyatlar</option><option value="yes">Fiyatı Olan</option><option value="no">Fiyatı Olmayan</option></select>
         <select aria-label="Nadirlik Filtresi" value={rarity} onChange={(e) => { setRarity(e.target.value); setPage(1); }} className="h-9 rounded border border-neutral-300 bg-white px-2 text-xs"><option value="">Tüm Nadirlikler</option>{catalogQuery.data?.rarities.map((item) => <option key={item} value={item}>{titleCaseTr(item)}</option>)}</select>
         <select aria-label="Sıralama" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="h-9 rounded border border-neutral-300 bg-white px-2 text-xs"><option value="price_desc">Satış Fiyatı: Yüksekten Düşüğe</option><option value="price_asc">Satış Fiyatı: Düşükten Yükseğe</option><option value="market_desc">TCG Market: Yüksekten Düşüğe</option><option value="market_asc">TCG Market: Düşükten Yükseğe</option><option value="name_asc">Kart Adı: A'dan Z'ye</option><option value="stock_desc">Stok: Çoktan Aza</option></select>
         <label className="block"><span className="mb-1 block text-[10px] font-medium text-neutral-500">En Düşük Fiyat</span><input aria-label="En Düşük Fiyat" type="number" min="0" step="0.01" value={minPriceText} onChange={(e) => { setMinPriceText(e.target.value); setPage(1); }} placeholder="En Düşük Fiyat, TL" className="h-9 w-full rounded border border-neutral-300 bg-white px-2 text-xs" /></label>
         <label className="block"><span className="mb-1 block text-[10px] font-medium text-neutral-500">En Yüksek Fiyat</span><input aria-label="En Yüksek Fiyat" type="number" min="0" step="0.01" value={maxPriceText} onChange={(e) => { setMaxPriceText(e.target.value); setPage(1); }} placeholder="En Yüksek Fiyat, TL" className="h-9 w-full rounded border border-neutral-300 bg-white px-2 text-xs" /></label>
         <div className="flex items-end"><button type="button" onClick={() => { setSearch(""); setSetCode(""); setFinish(""); setRarity(""); setStockFilter("empty"); setPriced("all"); setSort("price_desc"); setMinPriceText(""); setMaxPriceText(""); setPage(1); setStockFeedback(""); }} className="h-9 rounded border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-50">Filtreleri Sıfırla</button></div>
      </div>
      {priceRangeError && <p role="alert" className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-800">{priceRangeError}</p>}
      {catalogQuery.data && validPriceRange && <div className="grid grid-cols-2 gap-2 border-b border-neutral-100 bg-white p-3 sm:grid-cols-4">
         <div className="rounded-md bg-[#f7f8f4] px-3 py-2"><p className="text-[10px] tracking-wide text-neutral-500">Eşleşen Baskılar</p><p className="mt-1 text-sm font-semibold tabular-nums text-[#274a3d]">{catalogQuery.data.summary.matchedPrintings.toLocaleString("tr-TR")}</p></div>
         <div className="rounded-md bg-[#f7f8f4] px-3 py-2"><p className="text-[10px] tracking-wide text-neutral-500">Finish Satırları</p><p className="mt-1 text-sm font-semibold tabular-nums text-[#274a3d]">{catalogQuery.data.summary.matchedRows.toLocaleString("tr-TR")} <span className="text-[10px] font-normal text-neutral-500">· Fiyatlı {catalogQuery.data.summary.pricedRows.toLocaleString("tr-TR")} · Fiyatsız {catalogQuery.data.summary.unpricedRows.toLocaleString("tr-TR")}</span></p></div>
         <div data-testid="summary-min-price" className="rounded-md bg-[#f7f8f4] px-3 py-2"><p className="text-[10px] tracking-wide text-neutral-500">En Düşük Hesaplanan TL</p><p className="mt-1 text-sm font-semibold tabular-nums text-[#274a3d]">{money(catalogQuery.data.summary.minPrice, "TRY")}</p></div>
         <div data-testid="summary-max-price" className="rounded-md bg-[#f7f8f4] px-3 py-2"><p className="text-[10px] tracking-wide text-neutral-500">En Yüksek Hesaplanan TL</p><p className="mt-1 text-sm font-semibold tabular-nums text-[#274a3d]">{money(catalogQuery.data.summary.maxPrice, "TRY")}</p></div>
        <p className="col-span-2 text-[10px] text-neutral-500 sm:col-span-4">Filtrelenmiş katalog toplamı: {catalogQuery.data.summary.stockedRows.toLocaleString("tr-TR")} stoklu baskı satırı, {catalogQuery.data.summary.emptyRows.toLocaleString("tr-TR")} stoksuz satır, toplam {catalogQuery.data.summary.totalStock.toLocaleString("tr-TR")} adet stok. Özetteki sayılar yalnızca bu sayfayı değil tüm eşleşmeleri kapsar.</p>
      </div>}
      {stockFeedback && <p role="status" className="border-b border-emerald-100 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">{stockFeedback}</p>}
       {!validPriceRange ? null : catalogQuery.isError ? <div className="p-4"><ErrorBox message={catalogQuery.error instanceof Error ? catalogQuery.error.message : "Katalog yüklenemedi."} retry={() => catalogQuery.refetch()} /></div> : catalogQuery.isLoading ? <div className="space-y-2 p-4">{[1,2,3].map((n) => <div key={n} className="h-24 animate-pulse rounded bg-neutral-100" />)}</div> : catalogQuery.data?.rows.length ? <div className="overflow-x-auto"><table className="w-full text-left text-[11px]"><thead className="bg-[#f5f5f0] text-[10px] tracking-wide text-neutral-500"><tr><th className="px-3 py-2">Kart / Baskı</th><th className="px-3 py-2">Yüzey / Veri</th><th className="px-3 py-2">Fiyat Karşılaştırması</th><th className="px-3 py-2">Stok</th></tr></thead><tbody>{catalogQuery.data.rows.map((row) => <InventoryRow key={`${row.printing.printingId}:${row.finish}`} row={row} enabled={!stockMutation.isPending && !!currentStatus?.config.enabled && run?.status === "applied" && !!row.finish && Number(row.salePrice) > 0} onSave={(r, stock) => { setStockFeedback(""); stockMutation.mutate({ row: r, stock }); }} />)}</tbody></table></div> : <div className="px-5 py-12 text-center"><div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#edf1eb] text-[#557365]"><Search className="h-4 w-4" /></div><p className="text-sm font-semibold text-neutral-800">Bu Filtrelerle Baskı Bulunamadı</p><p className="mt-1 text-xs text-neutral-500">Aramayı veya filtreleri değiştirin.</p></div>}
       <div className="flex items-center justify-between border-t border-neutral-100 px-3 py-2"><span className="text-[11px] text-neutral-500">Sayfa {catalogQuery.data?.page ?? page} / {catalogQuery.data?.pages ?? 1}</span><div className="flex gap-1"><SecondaryButton aria-label="Önceki Sayfa" className="h-8 px-2" disabled={page <= 1 || !validPriceRange} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></SecondaryButton><SecondaryButton aria-label="Sonraki Sayfa" className="h-8 px-2" disabled={page >= (catalogQuery.data?.pages ?? 1) || !validPriceRange} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></SecondaryButton></div></div>
       {stockMutation.isPending && <p className="px-4 pb-2 text-[11px] text-[#28584b]">Stok Güncelleniyor…</p>}
      {stockMutation.isError && <div className="px-4 pb-3"><ErrorBox message={stockMutation.error.message} /></div>}
    </Card>

    {resetEligible && <Card className="overflow-hidden border-rose-200">
       <div className="border-b border-rose-100 bg-rose-50 px-4 py-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-rose-900"><AlertTriangle className="h-4 w-4" />İlk Etkinleştirme Öncesi Riftbound Temiz Kurulumu</h3><p className="mt-1 text-xs leading-5 text-rose-800">Sıfırlama Riftbound kartlarını, ilanlarını ve stoklarını siler ve stokları 0’dan başlatır. Pokémon, müşteriler ve siparişler etkilenmez. Bu işlem yalnızca ilk etkinleştirmeden önce kullanılabilir.</p></div>
      <div className="space-y-3 p-4">
         <p className="text-xs font-semibold text-rose-900">Yedek oluşturulmaz. Eski Riftbound setleri, kartları, ilanları, stokları ve yalnızca onlara ait yerel görseller kalıcı olarak silinir.</p>
        <p className="text-xs leading-5 text-neutral-600">Temizleme sonrası Fiyatları önizle ile RiftHunt kataloğunu ve piyasa fiyatlarını alın. Önizlemeyi onayla ve uygula ile setler ve kartlar siteye 0 stokla kaydedilir. Stok girdiğiniz kartlar hesaplanan TL fiyatıyla satışa açılır.</p>
         <div><p className="text-xs font-semibold text-neutral-800">Silmek İçin RIFTBOUND SİL Yazın</p><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input value={resetText} onChange={(e) => setResetText(e.target.value)} placeholder="RIFTBOUND SİL" aria-label="Sıfırlama Onayı" className="h-9 rounded border border-rose-200 px-3 text-xs sm:max-w-xs" /><PrimaryButton disabled={resetText !== "RIFTBOUND SİL" || resetMutation.isPending} onClick={() => { if (window.confirm("Yedek alınmadan eski Riftbound setleri, kartları, ilanları, stokları ve yalnızca onlara ait yerel görseller kalıcı olarak silinecek. Pokémon, müşteriler ve siparişler korunacak. Devam edilsin mi?")) resetMutation.mutate(); }} className="bg-rose-700 hover:bg-rose-800">{resetMutation.isPending ? "Siliniyor…" : "Eski Riftbound Verilerini Sil"}</PrimaryButton></div></div>
        {resetMutation.isError && <ErrorBox message={resetMutation.error.message} />}
      </div>
    </Card>}
     {statusQuery.data?.config.resetAt && !statusQuery.data.config.enabled && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">Eski Riftbound verileri temizlendi. Şimdi Fiyatları Önizle ile RiftHunt setlerini, kartlarını ve piyasa fiyatlarını alın, ardından Önizlemeyi onayla ve uygula ile siteye kaydedin. Yeni kartlar 0 stokla başlar.</p>}
     {statusQuery.data?.config.enabled && <p className="flex items-center gap-2 px-1 text-[11px] text-neutral-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />Temiz kurulum sıfırlaması ilk etkinleştirmeden sonra kullanılamaz. Günlük yönetim için stok ve fiyat önizlemesini kullanın.</p>}
  </section>;
}
