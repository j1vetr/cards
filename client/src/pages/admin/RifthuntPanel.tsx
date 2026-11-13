import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, Check, ChevronLeft, ChevronRight, Download, ExternalLink, RefreshCw, Search, ShieldCheck, Sparkles } from "lucide-react";
import type { RiftAdminRow, RiftCatalog, RiftRun, RiftStatus } from "@shared/rifthunt";
import { Card, PrimaryButton, SecondaryButton } from "./_ui/AdminUI";

const STATUS_KEY = ["/api/admin/rifthunt/status"];
const CATALOG_KEY = ["/api/admin/rifthunt/catalog"];
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
  return <div role="alert" className="flex items-start justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800"><span>{message}</span>{retry && <button type="button" onClick={retry} className="font-semibold underline">Yeniden dene</button>}</div>;
}
function PriceTile({ title, value, currency, className = "" }: { title: string; value: number | string | null | undefined; currency: string; className?: string }) {
  return <div className={`rounded-md px-2.5 py-2 ${className}`}><p className="text-[10px] uppercase tracking-wide text-neutral-500">{title}</p><p className="mt-0.5 text-[12px] font-semibold tabular-nums text-neutral-800">{money(value, currency)}</p></div>;
}
function InventoryRow({ row, enabled, onSave }: { row: RiftAdminRow; enabled: boolean; onSave: (row: RiftAdminRow, stock: number) => void }) {
  const [value, setValue] = useState(String(row.stock));
  const [error, setError] = useState("");
  useEffect(() => setValue(String(row.stock)), [row.stock]);
  const validPrice = row.finish !== null && row.salePrice !== null && Number.isFinite(Number(row.salePrice)) && Number(row.salePrice) > 0;
  const valid = /^\d+$/.test(value) && Number(value) >= 0;
  const p = row.printing;
  return <tr className="align-top border-b border-neutral-100 last:border-0 hover:bg-[#f8f7f2]">
    <td className="px-3 py-3 min-w-[250px]">
      <div className="flex gap-3">
        {p.image ? <img src={p.image} alt="" loading="lazy" className="h-[76px] w-[54px] rounded border border-neutral-200 object-cover bg-neutral-100" /> : <div className="h-[76px] w-[54px] rounded border border-neutral-200 bg-neutral-100" />}
        <div className="min-w-0"><p className="font-semibold text-neutral-900">{p.name}</p><p className="mt-0.5 text-[11px] text-neutral-500">{p.setName} · {p.collector} · {p.rarity}</p><p className="text-[11px] text-neutral-500">{p.type}{p.domains.length ? ` · ${p.domains.join(", ")}` : ""}</p><div className="mt-1 flex flex-wrap gap-1">{[p.alternate && "Alternatif", p.signature && "İmza", p.overnumbered && "Numara üstü", ...p.tags].filter(Boolean).map((tag) => <span key={String(tag)} className="rounded bg-[#e9eee9] px-1.5 py-0.5 text-[10px] text-[#465a4d]">{tag}</span>)}</div><div className="mt-1 flex gap-2 text-[10px]">{p.tcgplayerUrl && <a href={p.tcgplayerUrl} target="_blank" rel="noreferrer" className="text-teal-800 underline">TCGplayer <ExternalLink className="inline h-2.5 w-2.5" /></a>}{p.cardmarketUrl && <a href={p.cardmarketUrl} target="_blank" rel="noreferrer" className="text-teal-800 underline">Cardmarket <ExternalLink className="inline h-2.5 w-2.5" /></a>}</div></div>
      </div>
    </td>
    <td className="px-3 py-3 min-w-[150px]">
      <div className="flex flex-wrap gap-1">{p.finishes.map((f) => <span key={f} className={`rounded-full border px-2 py-0.5 text-[10px] ${f === row.finish ? "border-[#1f625a] bg-[#e3f1eb] text-[#1f625a]" : "border-neutral-200 text-neutral-500"}`}>{f === "normal" ? "Normal" : "Foil"}</span>)}</div>
      <p className="mt-1 text-[10px] text-neutral-500">Baskı {p.printingId}</p>
      <p className="text-[10px] text-neutral-500">TCG fiyatı: {age(p.updatedAt)}</p>
      <p className="text-[10px] text-neutral-500">Cardmarket: {age(p.cardmarketUpdatedAt)}</p>
      <p className="mt-1 text-[10px] text-neutral-600">{row.reason || (validPrice ? "Piyasa fiyatı mevcut" : "Satış fiyatı yok")}</p>
    </td>
    <td className="px-3 py-3 min-w-[220px]">
      <div className="grid grid-cols-2 gap-1.5">
        <PriceTile title="Önceki satış" value={row.oldPrice} currency="TRY" className="bg-neutral-50" />
        <PriceTile title="Yeni satış" value={row.salePrice} currency="TRY" className={validPrice ? "bg-emerald-50" : "bg-amber-50"} />
        <PriceTile title="TCG market" value={row.finish ? p.prices[row.finish]?.market : null} currency="USD" className="bg-neutral-50" />
        <PriceTile title="CM trend" value={row.finish ? p.cardmarket[row.finish]?.trend : null} currency="EUR" className="bg-neutral-50" />
      </div>
    </td>
    <td className="px-3 py-3 min-w-[165px]">
      <label className="block text-[10px] font-medium uppercase tracking-wide text-neutral-500">Stok adedi</label>
      <div className="mt-1 flex gap-1.5"><input aria-label={`${p.name} stok adedi`} type="number" min="0" step="1" value={value} onChange={(e) => { setValue(e.target.value); setError(""); }} disabled={!enabled || !validPrice} className="h-8 w-20 rounded border border-neutral-300 px-2 text-sm tabular-nums disabled:bg-neutral-100" /><button type="button" disabled={!enabled || !validPrice || !valid || Number(value) === row.stock} onClick={() => { if (valid) onSave(row, Number(value)); }} className="h-8 rounded bg-[#174c45] px-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Kaydet</button></div>
      {error && <p className="text-[10px] text-rose-700">{error}</p>}
      {!validPrice && <p className="mt-1 max-w-[150px] text-[10px] text-amber-800">Fiyat geçerli değil, stok düzenlenemez.</p>}
    </td>
  </tr>;
}

export default function RifthuntPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [setCode, setSetCode] = useState("");
  const [finish, setFinish] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [priced, setPriced] = useState("all");
  const [page, setPage] = useState(1);
  const [multiplierText, setMultiplierText] = useState("1.9");
  const [autoDaily, setAutoDaily] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [backup, setBackup] = useState<{ id: string; downloadUrl: string; downloaded: boolean; counts: Record<string, number>; createdAt: string } | null>(null);
  const [resetText, setResetText] = useState("");
  const [resetWarnings, setResetWarnings] = useState<string[]>([]);
  const [now, setNow] = useState(Date.now());
  const settingsInitialized = useRef(false);
  const multiplier = Number(multiplierText);
  const validMultiplier = Number.isFinite(multiplier) && multiplier > 0 && multiplier <= 100;
  const queryString = useMemo(() => {
    const params = new URLSearchParams({ search, set: setCode, finish, stock: stockFilter, priced, page: String(page), limit: "30" });
    if (runId) params.set("previewId", runId);
    return params.toString();
  }, [search, setCode, finish, stockFilter, priced, page, runId]);
  const statusQuery = useQuery<RiftStatus>({ queryKey: STATUS_KEY, queryFn: () => request("/api/admin/rifthunt/status"), refetchInterval: 10000, refetchOnWindowFocus: false });
  useEffect(() => {
    if (statusQuery.data && !settingsInitialized.current) {
      settingsInitialized.current = true;
      const latest = statusQuery.data.latestRun?.status === "ready" ? statusQuery.data.latestRun : null;
      setMultiplierText(String(latest?.multiplier ?? statusQuery.data.config.multiplier));
      setAutoDaily(latest?.autoDaily ?? statusQuery.data.config.autoDaily);
    }
  }, [statusQuery.data?.config.multiplier, statusQuery.data?.config.autoDaily]);
  const catalogQuery = useQuery<RiftCatalog>({ queryKey: [...CATALOG_KEY, queryString], queryFn: () => request(`/api/admin/rifthunt/catalog?${queryString}`), refetchOnWindowFocus: false });
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
    mutationFn: (id: string) => request<{ success: true; updated: number }>(`/api/admin/rifthunt/runs/${encodeURIComponent(id)}/apply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
    onSuccess: async (result, id) => {
      qc.setQueryData<RiftRun>(["/api/admin/rifthunt/runs", id], (old) => old ? { ...old, status: "applied", appliedAt: new Date().toISOString() } : old);
      await Promise.all([qc.invalidateQueries({ queryKey: STATUS_KEY }), qc.invalidateQueries({ queryKey: CATALOG_KEY }), qc.invalidateQueries({ predicate: (q) => /card|listing|inventory/i.test(q.queryKey.map(String).join("/")) })]);
    },
  });
  const stockMutation = useMutation({
    mutationFn: ({ row, stock }: { row: RiftAdminRow; stock: number }) => request<{ success: true }>("/api/admin/rifthunt/stock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ printingId: row.printing.printingId, finish: row.finish, stock, expectedStock: row.stock, expectedUpdatedAt: row.updatedAt }) }),
    onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: CATALOG_KEY }), qc.invalidateQueries({ queryKey: STATUS_KEY }), qc.invalidateQueries({ predicate: (q) => /card|listing|inventory/i.test(q.queryKey.map(String).join("/")) })]); },
  });
  const backupMutation = useMutation({
    mutationFn: () => request<{ id: string; downloadUrl: string; counts: Record<string, number>; createdAt: string }>("/api/admin/rifthunt/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
    onSuccess: (data) => { setBackup({ ...data, downloaded: false }); setResetText(""); },
  });
  const resetMutation = useMutation({
    mutationFn: () => request<{ success: true; warnings: string[] }>("/api/admin/rifthunt/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ backupId: backup?.id, confirmation: resetText }) }),
    onSuccess: async ({ warnings }) => { setResetWarnings(warnings); setBackup(null); setResetText(""); setRunId(null); await Promise.all([qc.invalidateQueries({ queryKey: STATUS_KEY }), qc.invalidateQueries({ queryKey: CATALOG_KEY }), qc.invalidateQueries({ predicate: (q) => /card|listing|inventory/i.test(q.queryKey.map(String).join("/")) })]); },
  });
  async function downloadBackup() {
    if (!backup) return;
    try {
      const url = new URL(backup.downloadUrl, window.location.origin);
      if (url.origin !== window.location.origin) throw new Error("Yedek indirme bağlantısı mağaza adresiyle eşleşmiyor.");
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) throw new Error("Yedek indirilemedi.");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = objectUrl; a.download = `rifthunt-backup-${backup.id}.tar.gz`; a.click(); URL.revokeObjectURL(objectUrl);
      setBackup({ ...backup, downloaded: true });
    } catch (error) { setDownloadError(error instanceof Error ? error.message : "Yedek indirilemedi."); }
  }
  const [downloadError, setDownloadError] = useState("");
  const previewInProgress = previewMutation.isPending || run?.status === "running";
  const resetEligible = !!statusQuery.data && !statusQuery.data.config.enabled && !statusQuery.data.config.lastAppliedAt;
  const statusError = statusQuery.error instanceof Error ? statusQuery.error.message : "Durum bilgisi alınamadı.";
  const priceIssues = [previewMutation.error, applyMutation.error, stockMutation.error, backupMutation.error, resetMutation.error].filter(Boolean) as Error[];

  return <section className="space-y-4" aria-label="Riftbound fiyat ve stok yönetimi">
    <Card className="overflow-hidden border-[#cbd8ce]">
      <div className="bg-[#e9eee8] px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#d5e3d7] text-[#28584b]"><Sparkles className="h-5 w-5" /></div><div><h2 className="text-base font-semibold text-[#203a32]">Riftbound fiyat ve stok</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-[#53665b]">Her baskının piyasa verisinden TRY satış fiyatı önerilir. Fiyatı personel belirlemez, yalnızca stok adedini günceller.</p></div></div>
          <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-medium ${currentStatus?.config.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{currentStatus?.config.enabled ? "Fiyatlama etkin" : "Henüz etkinleştirilmedi"}</span>
        </div>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        {statusQuery.isLoading ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[1,2,3,4].map((n) => <div key={n} className="h-16 animate-pulse rounded-md bg-[#f0f1ec]" />)}</div> : statusQuery.isError ? <ErrorBox message={statusError} retry={() => statusQuery.refetch()} /> : currentStatus && <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[
          ["Baskı", currentStatus.counts.cards], ["Set", currentStatus.counts.sets], ["İlan", currentStatus.counts.listings], ["Toplam stok", currentStatus.counts.stock],
        ].map(([label, value]) => <div key={String(label)} className="rounded-md border border-[#e5e7df] bg-[#fafaf7] px-3 py-2"><p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums text-[#274a3d]">{Number(value).toLocaleString("tr-TR")}</p></div>)}</div>}
        {currentStatus?.warnings.map((warning, i) => <div key={i} className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0" />{warning}</div>)}
        {currentStatus?.config.lastError && <ErrorBox message={currentStatus.config.lastError} />}
        <div className="grid gap-3 rounded-lg border border-[#e5e7df] p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-[11px] font-medium text-neutral-600">Satış çarpanı
            <div className="mt-1 flex h-9 items-center rounded border border-neutral-300 bg-white px-2"><input type="number" min="0.01" max="100" step="0.1" value={multiplierText} onChange={(e) => setMultiplierText(e.target.value)} className="w-full text-sm outline-none" /><span className="text-xs text-neutral-500">×</span></div>
            {!validMultiplier && <span className="mt-1 block text-[10px] text-rose-700">0 ile 100 arasında değer girin.</span>}
          </label>
          <label className="flex min-h-9 items-center gap-2 text-xs text-neutral-700"><input type="checkbox" checked={autoDaily} onChange={(e) => setAutoDaily(e.target.checked)} className="accent-[#1e5d53]" />Uygulanan ayarla günlük otomatik fiyatla</label>
          <PrimaryButton onClick={() => { setRunId(null); previewMutation.reset(); applyMutation.reset(); previewMutation.mutate(); }} disabled={!validMultiplier || previewInProgress} className="bg-[#174c45] hover:bg-[#123d37]">{previewInProgress ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Fiyatları önizle</PrimaryButton>
        </div>
        <p className="text-[11px] leading-5 text-neutral-500">Önizleme hazırlanması katalog verisini kaydeder, satış fiyatlarını ve stokları değiştirmez. Uygulama için ayrıca onay gerekir. Stok hesabı NM ve derecelendirilmemiş kart piyasa fiyatını kullanır, PSA fiyatı değildir.</p>
        {priceIssues.map((e, i) => <ErrorBox key={i} message={e.message} />)}
        {runQuery.isError && <ErrorBox message={runQuery.error instanceof Error ? runQuery.error.message : "Önizleme alınamadı."} retry={() => runQuery.refetch()} />}
        {previewInProgress && <div className="animate-pulse rounded-md border border-[#cbd8ce] bg-[#f5f7f3] p-3 text-xs text-[#365447]">Piyasa verileri ve TRY fiyatları hazırlanıyor…</div>}
        {run && <div className="rounded-lg border border-[#d5dfd5] bg-[#f7f8f4] p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-semibold text-[#263e33]">{run.status === "applied" ? "Bu önizleme uygulandı" : run.status === "failed" ? "Önizleme başarısız" : run.status === "running" ? "Önizleme hazırlanıyor" : "Uygulama önizlemesi hazır"}</p><p className="mt-1 text-[11px] text-neutral-600">{run.priced.toLocaleString("tr-TR")} / {run.total.toLocaleString("tr-TR")} baskıda fiyat var · Çarpan {run.multiplier}× · {age(run.createdAt)}</p>{run.rate && <p className="text-[11px] text-neutral-600">Kur: 1 USD = {run.rate.usdTry.toLocaleString("tr-TR", { maximumFractionDigits: 4 })} TL · {run.rate.source} · {run.rate.date}</p>}{run.error && <p className="mt-1 text-xs text-rose-700">{run.error}</p>}</div>
            {run.status === "ready" && <PrimaryButton disabled={!canApply || applyMutation.isPending} onClick={() => { if (window.confirm(`${run.priced} fiyat önerisi uygulanacak. Stok değişmeyecek. Devam edilsin mi?`)) applyMutation.mutate(run.id); }} className="bg-[#174c45] hover:bg-[#123d37]">{applyMutation.isPending ? "Uygulanıyor…" : "Önizlemeyi onayla ve uygula"}</PrimaryButton>}
          </div>
          {run.status === "ready" && (!canApply) && <p className="mt-2 text-[11px] text-amber-800">Önizleme süresi dolmuş veya ayarlar değişmiş. Uygulamak için yeni önizleme oluşturun.</p>}
          {applyMutation.isSuccess && <p className="mt-2 flex items-center gap-1 text-xs text-emerald-800"><Check className="h-3.5 w-3.5" />{applyMutation.data.updated.toLocaleString("tr-TR")} fiyat uygulandı.</p>}
        </div>}
        {resetWarnings.map((w, i) => <div key={i} className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">{w}</div>)}
      </div>
    </Card>

    <Card className="overflow-hidden">
      <div className="border-b border-neutral-200 px-4 py-3 sm:px-5"><div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-sm font-semibold text-neutral-900">Baskı kataloğu</h3><p className="text-[11px] text-neutral-500">Fiyatı olmayan baskılar listelenir ancak stok alanı kapalı kalır.</p></div><span className="text-[11px] tabular-nums text-neutral-500">{catalogQuery.data?.total.toLocaleString("tr-TR") ?? 0} sonuç</span></div></div>
      <div className="grid gap-2 border-b border-neutral-100 bg-[#fafaf7] p-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="relative sm:col-span-2"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Kart veya baskı ara" className="h-9 w-full rounded border border-neutral-300 bg-white pl-8 pr-3 text-xs" /></label>
        <select aria-label="Set filtresi" value={setCode} onChange={(e) => { setSetCode(e.target.value); setPage(1); }} className="h-9 rounded border border-neutral-300 bg-white px-2 text-xs"><option value="">Tüm setler</option>{catalogQuery.data?.sets.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
        <select aria-label="Baskı yüzeyi" value={finish} onChange={(e) => { setFinish(e.target.value); setPage(1); }} className="h-9 rounded border border-neutral-300 bg-white px-2 text-xs"><option value="">Tüm yüzeyler</option><option value="normal">Normal</option><option value="foil">Foil</option></select>
        <select aria-label="Stok filtresi" value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); setPage(1); }} className="h-9 rounded border border-neutral-300 bg-white px-2 text-xs"><option value="all">Tüm stoklar</option><option value="stocked">Stokta</option><option value="empty">Stok yok</option></select>
        <select aria-label="Fiyat filtresi" value={priced} onChange={(e) => { setPriced(e.target.value); setPage(1); }} className="h-9 rounded border border-neutral-300 bg-white px-2 text-xs"><option value="all">Tüm fiyatlar</option><option value="yes">Fiyatı olan</option><option value="no">Fiyatı olmayan</option></select>
      </div>
      {catalogQuery.isError ? <div className="p-4"><ErrorBox message={catalogQuery.error instanceof Error ? catalogQuery.error.message : "Katalog yüklenemedi."} retry={() => catalogQuery.refetch()} /></div> : catalogQuery.isLoading ? <div className="space-y-2 p-4">{[1,2,3].map((n) => <div key={n} className="h-24 animate-pulse rounded bg-neutral-100" />)}</div> : catalogQuery.data?.rows.length ? <div className="overflow-x-auto"><table className="w-full text-left text-[11px]"><thead className="bg-[#f5f5f0] text-[10px] uppercase tracking-wide text-neutral-500"><tr><th className="px-3 py-2">Kart / baskı</th><th className="px-3 py-2">Yüzey / veri</th><th className="px-3 py-2">Fiyat karşılaştırması</th><th className="px-3 py-2">Stok</th></tr></thead><tbody>{catalogQuery.data.rows.map((row) => <InventoryRow key={`${row.printing.printingId}:${row.finish}`} row={row} enabled={!!currentStatus?.config.enabled && run?.status === "applied" && !!row.finish && Number(row.salePrice) > 0} onSave={(r, stock) => stockMutation.mutate({ row: r, stock })} />)}</tbody></table></div> : <div className="px-5 py-12 text-center"><div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#edf1eb] text-[#557365]"><Search className="h-4 w-4" /></div><p className="text-sm font-semibold text-neutral-800">Bu filtrelerle baskı bulunamadı</p><p className="mt-1 text-xs text-neutral-500">Aramayı veya filtreleri değiştirin.</p></div>}
      <div className="flex items-center justify-between border-t border-neutral-100 px-3 py-2"><span className="text-[11px] text-neutral-500">Sayfa {catalogQuery.data?.page ?? page} / {catalogQuery.data?.pages ?? 1}</span><div className="flex gap-1"><SecondaryButton aria-label="Önceki sayfa" className="h-8 px-2" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></SecondaryButton><SecondaryButton aria-label="Sonraki sayfa" className="h-8 px-2" disabled={page >= (catalogQuery.data?.pages ?? 1)} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></SecondaryButton></div></div>
      {stockMutation.isPending && <p className="px-4 pb-2 text-[11px] text-[#28584b]">Stok güncelleniyor…</p>}
      {stockMutation.isError && <div className="px-4 pb-3"><ErrorBox message={stockMutation.error.message} /></div>}
    </Card>

    {resetEligible && <Card className="overflow-hidden border-rose-200">
      <div className="border-b border-rose-100 bg-rose-50 px-4 py-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-rose-900"><AlertTriangle className="h-4 w-4" />İlk etkinleştirme öncesi Riftbound temiz kurulumu</h3><p className="mt-1 text-xs leading-5 text-rose-800">Sıfırlama Riftbound kartlarını, ilanlarını ve stoklarını siler ve stokları 0’dan başlatır. Pokémon, müşteriler ve siparişler etkilenmez. Bu işlem yalnızca ilk etkinleştirmeden önce kullanılabilir.</p></div>
      <div className="space-y-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold text-neutral-800">1. Önce yedek oluşturun ve indirin</p><p className="text-[11px] text-neutral-500">Yedek verileri ve yönetilen görselleri içerir.</p></div><div className="flex flex-wrap gap-2"><SecondaryButton onClick={() => backupMutation.mutate()} disabled={backupMutation.isPending}>{backupMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}Yedek oluştur</SecondaryButton>{backup && <SecondaryButton onClick={downloadBackup}><Download className="h-3.5 w-3.5" />Yedeği indir</SecondaryButton>}</div></div>
        {backup && <div className="rounded-md border border-[#d5dfd5] bg-[#f7f8f4] p-3 text-xs"><p className="font-semibold text-neutral-800">Yedek hazır · {age(backup.createdAt)}</p><p className="mt-1 text-neutral-600">{Object.entries(backup.counts).map(([k,v]) => `${k}: ${v}`).join(" · ")}</p><p className="mt-1 font-medium text-amber-800">{backup.downloaded ? "İndirme başlatıldı. Yine de dosyanın cihazınıza kaydedildiğini doğrulayın." : "Sıfırlamadan önce yedeği indirmeniz gerekir."}</p></div>}
        {downloadError && <ErrorBox message={downloadError} />}
        <div className="border-t border-neutral-100 pt-3"><p className="text-xs font-semibold text-neutral-800">2. Yedek indirildikten sonra sıfırlamayı onaylayın</p><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input value={resetText} onChange={(e) => setResetText(e.target.value)} placeholder="RIFTBOUND SİL" aria-label="Sıfırlama onayı" className="h-9 rounded border border-rose-200 px-3 text-xs sm:max-w-xs" /><PrimaryButton disabled={!backup?.downloaded || resetText !== "RIFTBOUND SİL" || resetMutation.isPending} onClick={() => { if (window.confirm("Riftbound kartları, ilanları ve stokları silinecek. Pokémon, müşteriler ve siparişler korunacak. Devam edilsin mi?")) resetMutation.mutate(); }} className="bg-rose-700 hover:bg-rose-800">{resetMutation.isPending ? "Sıfırlanıyor…" : "Riftbound verisini sıfırla"}</PrimaryButton></div></div>
        {resetMutation.isError && <ErrorBox message={resetMutation.error.message} />}
      </div>
    </Card>}
    {statusQuery.data?.config.enabled && <p className="flex items-center gap-2 px-1 text-[11px] text-neutral-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />Temiz kurulum sıfırlaması ilk etkinleştirmeden sonra kullanılamaz. Günlük yönetim için stok ve fiyat önizlemesini kullanın.</p>}
  </section>;
}
