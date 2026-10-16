import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  Tag,
  XCircle,
} from "lucide-react";
import type { SalePriceRow, SalePriceRun } from "@shared/salePricing";
import { Card, PrimaryButton } from "./_ui/AdminUI";

const LATEST_KEY = ["/api/admin/tcg/sale-prices/latest"];
const runKey = (id: string) => ["/api/admin/tcg/sale-prices", id];

async function readError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return body && typeof body.error === "string" ? body.error : fallback;
}

function money(value: string | number | null | undefined, currency: "TRY" | "USD") {
  if (value === null || value === undefined || value === "") return "-";
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return `${value} ${currency}`;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function dateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function PriceRow({ row }: { row: SalePriceRow }) {
  const skipped = !!row.reason || row.newPrice === null;
  return (
    <article className={`rounded-lg border p-3 ${skipped ? "border-amber-200 bg-amber-50/50" : "border-neutral-200 bg-white"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold text-neutral-900">{row.name}</p>
            {row.setName && <span className="text-[11px] text-neutral-500">{row.setName}</span>}
            <span className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
              {row.condition}{row.finish ? ` · ${row.finish}` : ""}
            </span>
            {skipped && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                Atlandı
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Listing {row.listingId} · Kart {row.cardId} · Son güncelleme {dateTime(row.listingUpdatedAt)}
          </p>
          {(row.sourceName || row.sourceSet || row.sourceUrl) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-neutral-500">
              <span>PriceCharting:</span>
              {row.sourceName && <span className="font-medium text-neutral-700">{row.sourceName}</span>}
              {row.sourceSet && <span>{row.sourceSet}</span>}
              {row.sourceUrl && (
                <a
                  href={row.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-700 underline underline-offset-2"
                >
                  Kaynağı aç <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
          {row.reason && <p className="mt-2 text-[11px] leading-4 text-amber-800">{row.reason}</p>}
        </div>
        <div className="grid min-w-[210px] grid-cols-2 gap-2 sm:text-right">
          <div className="rounded-md bg-neutral-50 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-neutral-500">Mevcut fiyat</p>
            <p className="mt-0.5 text-[12px] font-semibold tabular-nums text-neutral-800">{money(row.oldPrice, "TRY")}</p>
          </div>
          <div className={`rounded-md px-2.5 py-2 ${skipped ? "bg-neutral-50" : "bg-emerald-50"}`}>
            <p className="text-[10px] uppercase tracking-wide text-neutral-500">Önerilen fiyat</p>
            <p className={`mt-0.5 text-[12px] font-semibold tabular-nums ${skipped ? "text-neutral-400" : "text-emerald-800"}`}>
              {row.newPrice === null ? "-" : money(row.newPrice, "TRY")}
            </p>
            {row.marketUsd !== null && (
              <p className="text-[10px] tabular-nums text-neutral-500">{money(row.marketUsd, "USD")} kaynak fiyat</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function SalePricingPanel() {
  const queryClient = useQueryClient();
  const [multiplierText, setMultiplierText] = useState("1.9");
  const [runId, setRunId] = useState<string | null>(null);
  const [ignoreRecoveredRun, setIgnoreRecoveredRun] = useState(false);
  const [now, setNow] = useState(Date.now());
  const startedLocally = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const latestQuery = useQuery<SalePriceRun | null>({
    queryKey: LATEST_KEY,
    queryFn: async () => {
      const response = await fetch("/api/admin/tcg/sale-prices/latest", { credentials: "include" });
      if (!response.ok) throw new Error(await readError(response, "Son fiyatlama kaydı alınamadı."));
      return response.json() as Promise<SalePriceRun | null>;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!runId && !ignoreRecoveredRun && !startedLocally.current && latestQuery.data?.id) {
      setRunId(latestQuery.data.id);
      setMultiplierText(String(latestQuery.data.multiplier));
    }
  }, [latestQuery.data, runId, ignoreRecoveredRun]);

  const runQuery = useQuery<SalePriceRun>({
    queryKey: runId ? runKey(runId) : ["/api/admin/tcg/sale-prices", "none"],
    enabled: !!runId,
    queryFn: async () => {
      const response = await fetch(`/api/admin/tcg/sale-prices/${encodeURIComponent(runId!)}`, { credentials: "include" });
      if (!response.ok) throw new Error(await readError(response, "Fiyatlama önizlemesi alınamadı."));
      return response.json() as Promise<SalePriceRun>;
    },
    refetchInterval: (query) => query.state.data?.status === "running" ? 2000 : false,
    refetchOnWindowFocus: false,
  });

  const previewMutation = useMutation({
    mutationFn: async (multiplier: number) => {
      const response = await fetch("/api/admin/tcg/sale-prices/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ multiplier }),
      });
      if (!response.ok) throw new Error(await readError(response, "Önizleme başlatılamadı."));
      return response.json() as Promise<{ id: string }>;
    },
    onSuccess: ({ id }) => {
      startedLocally.current = true;
      setIgnoreRecoveredRun(false);
      setRunId(id);
      queryClient.invalidateQueries({ queryKey: LATEST_KEY });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/tcg/sale-prices/${encodeURIComponent(id)}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(await readError(response, "Fiyatlar uygulanamadı."));
      return response.json() as Promise<{ updated: number }>;
    },
    onSuccess: async (result, id) => {
      queryClient.setQueryData<SalePriceRun>(runKey(id), (old) =>
        old ? { ...old, status: "applied", updated: result.updated } : old,
      );
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey.map(String).join("/").toLowerCase();
          return ["inventory", "listing", "product", "card"].some((term) => key.includes(term));
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/tcg/stats"] }),
        queryClient.invalidateQueries({ queryKey: runKey(id) }),
        queryClient.invalidateQueries({ queryKey: LATEST_KEY }),
      ]);
    },
  });

  const run = runQuery.data ?? (!runId && !ignoreRecoveredRun ? latestQuery.data ?? undefined : undefined);
  const multiplier = Number(multiplierText);
  const validMultiplier = Number.isFinite(multiplier) && multiplier > 0 && multiplier <= 100;
  const multiplierMatches = !!run && validMultiplier && run.multiplier === multiplier;
  const expired = !!run && new Date(run.expiresAt).getTime() <= now;
  const eligible = run?.rows.filter((row) => row.newPrice !== null && !row.reason) ?? [];
  const skipped = run?.rows.filter((row) => row.reason || row.newPrice === null) ?? [];
  const busy = previewMutation.isPending || applyMutation.isPending || run?.status === "running";
  const canApply = !!run && run.status === "ready" && !expired && multiplierMatches && eligible.length > 0 && !busy && !applyMutation.isSuccess;

  function handleMultiplierChange(value: string) {
    setMultiplierText(value);
    setIgnoreRecoveredRun(true);
    if (run && Number(value) !== run.multiplier) {
      setRunId(null);
      if (runId) queryClient.removeQueries({ queryKey: runKey(runId), exact: true });
    }
  }

  function startPreview() {
    if (!validMultiplier || busy) return;
    applyMutation.reset();
    startedLocally.current = true;
    previewMutation.mutate(multiplier);
  }

  function confirmApply() {
    if (!run || !canApply) return;
    const approved = window.confirm(
      `${eligible.length} mevcut ve stokta bulunan ilan fiyatı güncellenecek. Stok adetleri değiştirilmeyecek. Bu işlem geri alınamaz. Devam edilsin mi?`,
    );
    if (approved) applyMutation.mutate(run.id);
  }

  const progress = run && run.total > 0 ? Math.min(100, Math.round((run.processed / run.total) * 100)) : 0;

  return (
    <Card className="overflow-hidden border-indigo-200">
      <div className="border-b border-indigo-100 bg-indigo-50/60 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-neutral-900">Satış fiyatlarını güncelle</h3>
              <p className="mt-1 max-w-2xl text-[12px] leading-5 text-neutral-600">
                Piyasa fiyatı USD × otomatik TCMB dolar satış kuru × çarpan = TL satış fiyatı. Varsayılan çarpan 1,9. Yalnızca aktif ve stoklu mevcut ilanlar güncellenir, stok miktarı korunur.
              </p>
            </div>
          </div>
          {run && (
            <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              run.status === "applied" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : run.status === "failed" ? "border-red-200 bg-red-50 text-red-700"
                : run.status === "running" ? "border-indigo-200 bg-white text-indigo-700"
                : "border-neutral-200 bg-white text-neutral-700"
            }`}>
              {run.status === "running" ? <Loader2 className="h-3 w-3 animate-spin" /> : run.status === "applied" ? <CheckCircle2 className="h-3 w-3" /> : null}
              {run.status === "running" ? "Önizleme hazırlanıyor" : run.status === "applied" ? "Uygulandı" : run.status === "failed" ? "Hatalı" : "Önizleme hazır"}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(180px,240px)_1fr] sm:items-end">
          <div>
            <label htmlFor="sale-price-multiplier" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-neutral-600">
              Çarpan
            </label>
            <div className="relative">
              <input
                id="sale-price-multiplier"
                data-testid="input-sale-price-multiplier"
                type="number"
                min="0.01"
                max="100"
                step="0.1"
                value={multiplierText}
                disabled={busy}
                onChange={(event) => handleMultiplierChange(event.target.value)}
                className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 pr-8 text-[13px] text-neutral-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-neutral-50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-neutral-400">×</span>
            </div>
            {!validMultiplier && <p className="mt-1 text-[11px] text-red-600">0 ile 100 arasında geçerli bir çarpan girin.</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <PrimaryButton onClick={startPreview} disabled={!validMultiplier || busy} className="bg-indigo-700 hover:bg-indigo-600">
              {previewMutation.isPending || run?.status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Güncel fiyatları çek ve önizle
            </PrimaryButton>
            {run && run.status === "ready" && (
              <PrimaryButton onClick={confirmApply} disabled={!canApply} className="bg-emerald-700 hover:bg-emerald-600">
                {applyMutation.isPending ? "Uygulanıyor..." : "Onayla ve TL fiyatlarını uygula"}
              </PrimaryButton>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[11px] leading-5 text-neutral-600">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
          <p>
            NM için derecelendirilmemiş kart fiyatı, PSA10 için kaynağın PSA10 fiyatı kullanılır. LP, MP, HP, DMG ve ayrı PSA fiyatı olmayan diğer kondisyonlar atlanır. Set, kart numarası veya normal/foil eşleşmesi belirsiz olan kartlar değiştirilmez. API erişimi için PriceCharting aboneliği ve Ayarlar bölümünde tanımlı API anahtarı gerekir.
          </p>
        </div>

        {latestQuery.isLoading && !runId && (
          <div className="space-y-2" aria-label="Son fiyatlama kaydı yükleniyor">
            <div className="h-4 w-40 animate-pulse rounded bg-neutral-100" />
            <div className="h-16 animate-pulse rounded-lg bg-neutral-100" />
          </div>
        )}
        {(latestQuery.isError || runQuery.isError || previewMutation.isError || applyMutation.isError) && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-700">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              {previewMutation.isError ? previewMutation.error.message
                : applyMutation.isError ? applyMutation.error.message
                : runQuery.isError ? runQuery.error.message
                : latestQuery.error instanceof Error ? latestQuery.error.message : "Fiyatlama kaydı alınamadı."}
              {latestQuery.isError && (
                <button type="button" onClick={() => latestQuery.refetch()} className="ml-2 font-semibold underline underline-offset-2">
                  Yeniden dene
                </button>
              )}
            </div>
          </div>
        )}

        {previewMutation.isSuccess && !run && (
          <p className="text-[12px] text-indigo-700">Önizleme hazırlanıyor. Bu alan otomatik olarak güncellenecek.</p>
        )}

        {run && (
          <section className="space-y-3" aria-label="Fiyatlama önizlemesi">
            <div className="grid gap-2 rounded-lg border border-neutral-200 bg-white p-3 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">Döviz kuru</p>
                <p className="mt-1 text-[13px] font-semibold tabular-nums text-neutral-900">1 USD = {run.rate.usdTry.toLocaleString("tr-TR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} TL</p>
                <p className="text-[11px] text-neutral-500">Yayın tarihi {run.rate.date}</p>
                <p className="text-[11px] text-neutral-500">TCMB döviz satış kuru. Tatillerde son yayımlanan kur kullanılır.</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">Formül</p>
                <p className="mt-1 text-[12px] font-semibold text-neutral-800">Market USD × ForexSelling × {run.multiplier}</p>
                {/^https?:\/\//i.test(run.rate.source) ? (
                  <a className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-indigo-700 underline underline-offset-2" href={run.rate.source} target="_blank" rel="noreferrer">
                    TCMB kaynağı <ExternalLink className="h-3 w-3" />
                  </a>
                ) : <p className="text-[11px] text-neutral-500">{run.rate.source}</p>}
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">Önizleme süresi</p>
                <p className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-neutral-800">
                  <Clock3 className="h-3 w-3 text-neutral-400" /> {dateTime(run.expiresAt)} tarihine kadar geçerli
                </p>
                <p className="text-[11px] text-neutral-500">Oluşturuldu {dateTime(run.createdAt)}</p>
              </div>
            </div>

            {run.status === "running" && (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                <div className="mb-2 flex items-center justify-between text-[11px] text-indigo-800">
                  <span>Fiyatlar inceleniyor</span>
                  <span className="tabular-nums">{run.processed.toLocaleString("tr-TR")} / {run.total.toLocaleString("tr-TR")}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
                  <div className="h-full rounded-full bg-indigo-600 transition-[width] duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            {run.status === "failed" && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{run.error || "Fiyatlama işlemi tamamlanamadı."}</span>
              </div>
            )}
            {run.status === "ready" && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-600">
                <span className="inline-flex items-center gap-1 text-emerald-700"><ArrowUp className="h-3 w-3" /> Uygun: {eligible.length}</span>
                <span className="inline-flex items-center gap-1 text-amber-700"><ArrowDown className="h-3 w-3" /> Atlanan: {skipped.length}</span>
                {expired && <span className="font-medium text-red-700">Önizlemenin süresi doldu. Yeni önizleme oluşturun.</span>}
                {!multiplierMatches && <span className="font-medium text-amber-700">Çarpan değişti. Uygulamadan önce yeni önizleme oluşturun.</span>}
              </div>
            )}
            {applyMutation.isSuccess && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[12px] text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {applyMutation.data.updated.toLocaleString("tr-TR")} ilan güncellendi. Stok adetleri değiştirilmedi.
              </div>
            )}
            {run.status === "ready" && eligible.length === 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-800">
                Uygulanabilir ilan bulunamadı. İlan fiyatları değiştirilmedi.
              </div>
            )}
            <div className="space-y-2">
              {run.rows.length === 0 ? (
                <div className="rounded-md border border-dashed border-neutral-200 px-4 py-7 text-center text-[12px] text-neutral-500">
                  {run.status === "running" ? "Sonuçlar hazırlandığında burada görünecek." : "Bu önizlemede ilan bulunamadı."}
                </div>
              ) : run.rows.map((row) => <PriceRow key={row.listingId} row={row} />)}
            </div>
            {run.status === "ready" && !expired && eligible.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] leading-4 text-neutral-500">
                  Onay sonrası yalnızca {eligible.length} uygun ilan güncellenir. Yeni ilan oluşturulmaz ve stok değişmez.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </Card>
  );
}
