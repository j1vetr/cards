import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  Download,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  Database,
  Layers,
  Info,
  Zap,
  BarChart3,
  Tag,
  Swords,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { PageHeader, Card, PrimaryButton, SecondaryButton, EmptyState } from "./_ui/AdminUI";

interface CardGame {
  id: string;
  name: string;
  slug: string;
}

interface CardSet {
  id: string;
  name: string;
  apiId: string;
  apiSource: string;
  releaseDate?: string | null;
  totalCards?: number | null;
  series?: string | null;
}

interface SyncRun {
  id: string;
  game: string;
  mode: string;
  status: string;
  setApiId?: string | null;
  stats: {
    setsProcessed?: number;
    cardsProcessed?: number;
    cardsInserted?: number;
    cardsUpdated?: number;
    imagesDownloaded?: number;
    imagesSkipped?: number;
    pricesUpdated?: number;
    errors?: number;
  };
  errors: Array<{ context: string; message: string }>;
  startedAt: string;
  completedAt?: string | null;
}

interface TcgStats {
  totalCards: number;
  totalListings: number;
  totalPrices: number;
}

const GAME_LABELS: Record<string, string> = {
  pokemon_tcg: "Pokemon TCG",
  riftbound: "Riftbound",
  pricecharting: "PriceCharting",
};

const MODE_LABELS: Record<string, string> = {
  full: "Tam Sync (Set + Kart + Resim)",
  sets: "Set Import",
  cards: "Kart Import",
  prices: "Fiyat Güncelleme",
};

const CONDITIONS = ["NM", "LP", "MP", "HP", "DMG"];

function StatusBadge({ status }: { status: string }) {
  const base = "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium";
  if (status === "completed")
    return (
      <span className={`${base} bg-emerald-50 text-emerald-700 border border-emerald-200`}>
        <CheckCircle className="w-3 h-3" /> Tamamlandı
      </span>
    );
  if (status === "failed")
    return (
      <span className={`${base} bg-red-50 text-red-700 border border-red-200`}>
        <XCircle className="w-3 h-3" /> Hatalı
      </span>
    );
  return (
    <span className={`${base} bg-blue-50 text-blue-700 border border-blue-200`}>
      <Loader2 className="w-3 h-3 animate-spin" /> Çalışıyor
    </span>
  );
}

function duration(run: SyncRun): string {
  const start = new Date(run.startedAt).getTime();
  const end = run.completedAt ? new Date(run.completedAt).getTime() : Date.now();
  const secs = Math.round((end - start) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export default function CardApiSyncTab() {
  const qc = useQueryClient();

  const [selectedGame, setSelectedGame] = useState<"pokemon_tcg" | "riftbound">("pokemon_tcg");
  const [selectedSetId, setSelectedSetId] = useState<string>("");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [backfillSetId, setBackfillSetId] = useState<string>("");

  // Auto-list state
  const [autoListMultiplier, setAutoListMultiplier] = useState<string>("1.9");
  const [autoListCondition, setAutoListCondition] = useState<string>("NM");
  const [autoListStock, setAutoListStock] = useState<string>("1");
  const [autoListGame, setAutoListGame] = useState<string>("");
  const [autoListResult, setAutoListResult] = useState<{
    created: number;
    updated: number;
    noPrice: number;
    message: string;
  } | null>(null);

  // Danger zone — delete all TCG data
  const [deleteTarget, setDeleteTarget] = useState<"" | "pokemon" | "riftbound" | "all">("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteResult, setDeleteResult] = useState<{ deletedCards: number; deletedSets: number; deletedListings: number } | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (game: string) => {
      const url = game === "all" ? "/api/admin/tcg/data" : `/api/admin/tcg/data?game=${game}`;
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Silme başarısız");
      return res.json();
    },
    onSuccess: (data) => {
      setDeleteResult(data);
      setDeleteConfirmText("");
      setDeleteTarget("");
      qc.invalidateQueries({ queryKey: ["/api/admin/tcg/stats"] });
    },
  });

  const { data: games = [] } = useQuery<CardGame[]>({
    queryKey: ["/api/admin/tcg/games"],
    refetchInterval: false,
  });

  const gameId = games.find((g) => g.slug === (selectedGame === "pokemon_tcg" ? "pokemon" : "riftbound"))?.id;
  const pokemonGameId = games.find((g) => g.slug === "pokemon")?.id;

  const { data: sets = [] } = useQuery<CardSet[]>({
    queryKey: ["/api/admin/tcg/sets", gameId],
    queryFn: async () => {
      if (!gameId) return [];
      const res = await fetch(`/api/admin/tcg/sets?gameId=${gameId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Sets alınamadı");
      return res.json();
    },
    enabled: !!gameId,
    refetchInterval: false,
  });

  const { data: pokemonSets = [] } = useQuery<CardSet[]>({
    queryKey: ["/api/admin/tcg/sets", pokemonGameId],
    queryFn: async () => {
      if (!pokemonGameId) return [];
      const res = await fetch(`/api/admin/tcg/sets?gameId=${pokemonGameId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Pokemon setleri alınamadı");
      return res.json();
    },
    enabled: !!pokemonGameId,
    refetchInterval: false,
  });

  const { data: syncRuns = [], isLoading: runsLoading } = useQuery<SyncRun[]>({
    queryKey: ["/api/admin/tcg/sync-runs"],
    refetchInterval: activeRunId ? 3000 : 15000,
  });

  const { data: tcgStats, refetch: refetchStats } = useQuery<TcgStats>({
    queryKey: ["/api/admin/tcg/stats"],
    refetchInterval: 30000,
  });

  const { data: activeRun } = useQuery<SyncRun>({
    queryKey: ["/api/admin/tcg/sync-runs", activeRunId],
    queryFn: async (): Promise<SyncRun> => {
      if (!activeRunId) throw new Error("no run");
      const res = await fetch(`/api/admin/tcg/sync-runs/${activeRunId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Run bilgisi alınamadı");
      return res.json() as Promise<SyncRun>;
    },
    enabled: !!activeRunId,
    refetchInterval: activeRunId ? 2000 : false,
  });

  useEffect(() => {
    if (activeRun && activeRun.status !== "running") {
      setActiveRunId(null);
      qc.invalidateQueries({ queryKey: ["/api/admin/tcg/sync-runs"] });
      refetchStats();
    }
  }, [activeRun?.status]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {
        game: selectedGame,
        mode: "full",
      };
      if (selectedSetId) {
        body.setApiId = selectedSetId;
      }
      const res = await fetch("/api/admin/tcg/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Bilinmeyen hata" }));
        throw new Error(err.error ?? "Sync başlatılamadı");
      }
      return res.json() as Promise<{ runId: string; message: string }>;
    },
    onSuccess: (data) => {
      setActiveRunId(data.runId);
      qc.invalidateQueries({ queryKey: ["/api/admin/tcg/sync-runs"] });
    },
  });

  const priceSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/tcg/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ game: selectedGame, mode: "prices" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Bilinmeyen hata" }));
        throw new Error(err.error ?? "Fiyat sync başlatılamadı");
      }
      return res.json() as Promise<{ runId: string; message: string }>;
    },
    onSuccess: (data) => {
      setActiveRunId(data.runId);
      qc.invalidateQueries({ queryKey: ["/api/admin/tcg/sync-runs"] });
    },
  });

  const backfillMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {
        game: "pokemon_tcg",
        mode: "cards",
      };
      if (backfillSetId) body.setApiId = backfillSetId;
      const res = await fetch("/api/admin/tcg/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Bilinmeyen hata" }));
        throw new Error(err.error ?? "Backfill başlatılamadı");
      }
      return res.json() as Promise<{ runId: string; message: string }>;
    },
    onSuccess: (data) => {
      setActiveRunId(data.runId);
      qc.invalidateQueries({ queryKey: ["/api/admin/tcg/sync-runs"] });
    },
  });

  const autoListMutation = useMutation({
    mutationFn: async () => {
      const multiplier = parseFloat(autoListMultiplier);
      const stock = parseInt(autoListStock, 10);
      if (isNaN(multiplier) || multiplier <= 0) throw new Error("Geçerli bir çarpan girin (örn. 1.9)");
      if (isNaN(stock) || stock < 0) throw new Error("Geçerli bir stok miktarı girin");

      const res = await fetch("/api/admin/tcg/auto-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          multiplier,
          condition: autoListCondition,
          stock,
          gameSlug: autoListGame || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Bilinmeyen hata" }));
        throw new Error(err.error ?? "Listeleme başarısız");
      }
      return res.json() as Promise<{ created: number; updated: number; noPrice: number; message: string }>;
    },
    onSuccess: (data) => {
      setAutoListResult(data);
      refetchStats();
      qc.invalidateQueries({ queryKey: ["/api/admin/tcg/stats"] });
    },
  });

  const isRunning = !!activeRunId && activeRun?.status === "running";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kart API Senkronizasyonu"
        description="Pokemon TCG ve Riftbound verilerini API'den çek; PriceCharting ile fiyatları güncelle ve otomatik listele."
      />

      {/* Stats overview */}
      {tcgStats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-neutral-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Database className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-[11px] text-neutral-500 font-medium uppercase tracking-wide">Toplam Kart</p>
              <p className="text-xl font-bold text-neutral-900">{tcgStats.totalCards.toLocaleString("tr-TR")}</p>
            </div>
          </div>
          <div className="bg-white border border-neutral-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] text-neutral-500 font-medium uppercase tracking-wide">PriceCharting Fiyat</p>
              <p className="text-xl font-bold text-neutral-900">{tcgStats.totalPrices.toLocaleString("tr-TR")}</p>
            </div>
          </div>
          <div className="bg-white border border-neutral-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <Tag className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-[11px] text-neutral-500 font-medium uppercase tracking-wide">Aktif Listing</p>
              <p className="text-xl font-bold text-neutral-900">{tcgStats.totalListings.toLocaleString("tr-TR")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sync Configuration */}
      <Card className="p-5">
        <h3 className="text-[13px] font-semibold text-neutral-800 mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          API Senkronizasyonu
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Game selector */}
          <div>
            <label className="text-[11px] font-medium text-neutral-600 uppercase tracking-wide mb-1.5 block">
              Oyun
            </label>
            <select
              data-testid="select-tcg-game"
              value={selectedGame}
              onChange={(e) => {
                setSelectedGame(e.target.value as any);
                setSelectedSetId("");
              }}
              className="w-full text-[13px] border border-neutral-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              disabled={isRunning}
            >
              <option value="pokemon_tcg">Pokemon TCG</option>
              <option value="riftbound">Riftbound</option>
            </select>
          </div>

          {/* Optional set filter */}
          <div>
            <label className="text-[11px] font-medium text-neutral-600 uppercase tracking-wide mb-1.5 block">
              Set Filtresi <span className="font-normal text-neutral-400">(opsiyonel — boş = tüm setler)</span>
            </label>
            <select
              data-testid="select-tcg-set"
              value={selectedSetId}
              onChange={(e) => setSelectedSetId(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
              disabled={isRunning}
            >
              <option value="">— Tüm setler —</option>
              {sets.map((s) => (
                <option key={s.id} value={s.apiId}>
                  {s.name} {s.totalCards ? `(${s.totalCards})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Info callout */}
        <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-md p-3 flex gap-2 text-[12px] text-indigo-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
          <span>
            Seçili oyunun tüm setleri ve kartları API'den çekilir, kart resimleri sunucuya indirilip WebP'ye dönüştürülür.
            {selectedSetId ? " Sadece seçili set işlenir." : " Tüm setler işlenir — büyük koleksiyonlarda uzun sürebilir."}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          {syncMutation.isError && (
            <p className="text-[12px] text-red-600 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" />
              {syncMutation.error instanceof Error ? syncMutation.error.message : "Hata oluştu"}
            </p>
          )}
          {syncMutation.isSuccess && !isRunning && (
            <p className="text-[12px] text-emerald-600 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Sync tamamlandı.
            </p>
          )}
          {!syncMutation.isError && !syncMutation.isSuccess && <span />}

          <PrimaryButton
            data-testid="button-start-sync"
            onClick={() => syncMutation.mutate()}
            disabled={isRunning || syncMutation.isPending}
            className="flex items-center gap-2"
          >
            {isRunning || syncMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isRunning ? "Sync çalışıyor…" : "Senkronize Et"}
          </PrimaryButton>
        </div>
      </Card>

      {/* Active run progress */}
      {activeRun && activeRun.status === "running" && (
        <Card className="p-4 border-blue-200 bg-blue-50/40">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="text-[13px] font-medium text-blue-800">
              {GAME_LABELS[activeRun.game] ?? activeRun.game} — {MODE_LABELS[activeRun.mode] ?? activeRun.mode} çalışıyor…
            </span>
          </div>
          <div className="text-[12px] text-blue-700 space-y-0.5">
            {activeRun.stats.setsProcessed !== undefined && (
              <p>Setler: {activeRun.stats.setsProcessed}</p>
            )}
            {activeRun.stats.cardsProcessed !== undefined && (
              <p>
                Kartlar: {activeRun.stats.cardsInserted ?? 0} eklendi,{" "}
                {activeRun.stats.cardsUpdated ?? 0} güncellendi
              </p>
            )}
            {(activeRun.stats.imagesDownloaded !== undefined || activeRun.stats.imagesSkipped !== undefined) && (
              <p>
                Resimler: {activeRun.stats.imagesDownloaded ?? 0} indirildi,{" "}
                {activeRun.stats.imagesSkipped ?? 0} atlandı
              </p>
            )}
            {activeRun.stats.pricesUpdated !== undefined && (
              <p>Fiyatlar: {activeRun.stats.pricesUpdated}</p>
            )}
          </div>
        </Card>
      )}

      {/* PriceCharting Fiyat Güncelleme */}
      <Card className="p-5">
        <h3 className="text-[13px] font-semibold text-neutral-800 mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          PriceCharting Fiyat Güncelleme
        </h3>

        <div className="bg-emerald-50 border border-emerald-100 rounded-md p-3 flex gap-2 text-[12px] text-emerald-800 mb-4">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
          <span>
            Tüm aktif kartlar için PriceCharting'den market/low/high fiyatlar çekilir.
            API key gereklidir (Ayarlar → <code className="bg-emerald-100 rounded px-1 py-0.5">pricecharting_api_key</code>).
            8.000+ kart için 40+ dakika sürebilir.
          </span>
        </div>

        <div className="flex items-center justify-between">
          {priceSyncMutation.isError && (
            <p className="text-[12px] text-red-600 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" />
              {priceSyncMutation.error instanceof Error ? priceSyncMutation.error.message : "Hata oluştu"}
            </p>
          )}
          {priceSyncMutation.isSuccess && !isRunning && (
            <p className="text-[12px] text-emerald-600 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Fiyat sync başlatıldı.
            </p>
          )}
          {!priceSyncMutation.isError && !priceSyncMutation.isSuccess && <span />}

          <PrimaryButton
            data-testid="button-start-price-sync"
            onClick={() => priceSyncMutation.mutate()}
            disabled={isRunning || priceSyncMutation.isPending}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500"
          >
            {priceSyncMutation.isPending || (isRunning && activeRun?.mode === "prices") ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <DollarSign className="w-4 h-4" />
            )}
            {priceSyncMutation.isPending ? "Başlatılıyor…" : "Fiyatları Güncelle"}
          </PrimaryButton>
        </div>
      </Card>

      {/* Backfill Attacks & Abilities */}
      <Card className="p-5">
        <h3 className="text-[13px] font-semibold text-neutral-800 mb-1 flex items-center gap-2">
          <Swords className="w-4 h-4 text-rose-500" />
          Saldırı &amp; Yetenek Doldur (Pokémon)
        </h3>
        <p className="text-[12px] text-neutral-500 mb-4">
          Daha önce senkronize edilmiş Pokémon kartlarında saldırı ve yetenek bilgileri boş kalabilir.
          Bu işlem, seçili set (veya tüm setler) için Pokémon kartlarını API'den yeniden çekerek
          saldırı/yetenek alanlarını günceller.
        </p>

        <div className="mb-4">
          <label className="text-[11px] font-medium text-neutral-600 uppercase tracking-wide mb-1.5 block">
            Set Filtresi <span className="font-normal text-neutral-400">(opsiyonel — boş bırakılırsa tüm setler)</span>
          </label>
          <select
            data-testid="select-backfill-set"
            value={backfillSetId}
            onChange={(e) => setBackfillSetId(e.target.value)}
            className="w-full sm:w-64 text-[13px] border border-neutral-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 disabled:opacity-50"
            disabled={isRunning || backfillMutation.isPending}
          >
            <option value="">— Tüm Pokémon setleri —</option>
            {pokemonSets.map((s) => (
              <option key={s.id} value={s.apiId}>
                {s.name} {s.totalCards ? `(${s.totalCards})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-rose-50 border border-rose-100 rounded-md p-3 flex gap-2 text-[12px] text-rose-800 mb-4">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span>
            Mevcut kartlar güncellenir, yeni kart oluşturulmaz.
            {backfillSetId
              ? " Sadece seçili set için çalışır."
              : ` Tüm Pokémon setleri için çalışır (${pokemonSets.length} set). Uzun sürebilir.`}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            {backfillMutation.isError && (
              <p className="text-[12px] text-red-600 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                {backfillMutation.error instanceof Error ? backfillMutation.error.message : "Hata oluştu"}
              </p>
            )}
            {backfillMutation.isSuccess && !isRunning && (
              <p className="text-[12px] text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Backfill tamamlandı.
              </p>
            )}
          </div>
          <PrimaryButton
            data-testid="button-backfill-attacks"
            onClick={() => {
              setSelectedGame("pokemon_tcg");
              backfillMutation.mutate();
            }}
            disabled={isRunning || backfillMutation.isPending}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500"
          >
            {backfillMutation.isPending || (isRunning && activeRun?.game === "pokemon_tcg" && activeRun?.mode === "cards") ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Swords className="w-4 h-4" />
            )}
            {backfillMutation.isPending ? "Başlatılıyor…" : "Saldırıları Doldur"}
          </PrimaryButton>
        </div>
      </Card>

      {/* Auto-listing from PriceCharting */}
      <Card className="p-5">
        <h3 className="text-[13px] font-semibold text-neutral-800 mb-1 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          PriceCharting × Çarpan ile Otomatik Listeleme
        </h3>
        <p className="text-[12px] text-neutral-500 mb-4">
          Fiyat verisi çekilmiş kartlar için otomatik olarak listing oluşturur.
          Önce "Fiyat Güncelleme" sync'ini çalıştırın.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {/* Multiplier */}
          <div>
            <label className="text-[11px] font-medium text-neutral-600 uppercase tracking-wide mb-1.5 block">
              Çarpan (× USD)
            </label>
            <input
              data-testid="input-auto-list-multiplier"
              type="number"
              step="0.1"
              min="0.1"
              max="100"
              value={autoListMultiplier}
              onChange={(e) => setAutoListMultiplier(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="1.9"
            />
          </div>

          {/* Condition */}
          <div>
            <label className="text-[11px] font-medium text-neutral-600 uppercase tracking-wide mb-1.5 block">
              Kondisyon
            </label>
            <select
              data-testid="select-auto-list-condition"
              value={autoListCondition}
              onChange={(e) => setAutoListCondition(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Stock */}
          <div>
            <label className="text-[11px] font-medium text-neutral-600 uppercase tracking-wide mb-1.5 block">
              Stok Adedi
            </label>
            <input
              data-testid="input-auto-list-stock"
              type="number"
              min="0"
              max="9999"
              value={autoListStock}
              onChange={(e) => setAutoListStock(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="1"
            />
          </div>

          {/* Game filter */}
          <div>
            <label className="text-[11px] font-medium text-neutral-600 uppercase tracking-wide mb-1.5 block">
              Oyun Filtresi
            </label>
            <select
              data-testid="select-auto-list-game"
              value={autoListGame}
              onChange={(e) => setAutoListGame(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="">Tüm oyunlar</option>
              <option value="pokemon">Pokemon TCG</option>
              <option value="riftbound">Riftbound</option>
            </select>
          </div>
        </div>

        {/* Info */}
        <div className="mb-4 bg-amber-50 border border-amber-100 rounded-md p-3 flex gap-2 text-[12px] text-amber-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <span>
            Mevcut listing varsa fiyat ve stok güncellenir. Yoksa yeni oluşturulur.
            Fiyat = PriceCharting USD market fiyat × {autoListMultiplier || "1.9"}.
            Şu an <strong>{tcgStats?.totalPrices ?? 0}</strong> kartın fiyat verisi var.
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            {autoListMutation.isError && (
              <p className="text-[12px] text-red-600 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                {autoListMutation.error instanceof Error ? autoListMutation.error.message : "Hata oluştu"}
              </p>
            )}
            {autoListResult && !autoListMutation.isPending && (
              <div className="text-[12px] text-emerald-700 flex flex-col gap-0.5">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {autoListResult.message}
                </span>
                <span className="text-neutral-500 ml-4">
                  Fiyatsız kart: {autoListResult.noPrice.toLocaleString("tr-TR")}
                </span>
              </div>
            )}
          </div>

          <PrimaryButton
            data-testid="button-auto-list"
            onClick={() => {
              setAutoListResult(null);
              autoListMutation.mutate();
            }}
            disabled={autoListMutation.isPending || (tcgStats?.totalPrices ?? 0) === 0}
            className="flex items-center gap-2"
          >
            {autoListMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {autoListMutation.isPending ? "Listeleniyor…" : "Otomatik Listele"}
          </PrimaryButton>
        </div>

        {(tcgStats?.totalPrices ?? 0) === 0 && (
          <p className="mt-2 text-[11px] text-neutral-400 text-right">
            Önce "Fiyat Güncelleme" sync modunu çalıştırın ve PriceCharting API key'ini ayarlayın.
          </p>
        )}
      </Card>

      {/* Sync History */}
      <Card>
        <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-neutral-800 flex items-center gap-2">
            <Database className="w-4 h-4 text-neutral-400" />
            Sync Geçmişi
          </h3>
          <SecondaryButton
            data-testid="button-refresh-runs"
            onClick={() => qc.invalidateQueries({ queryKey: ["/api/admin/tcg/sync-runs"] })}
            className="text-[12px] py-1 px-2.5 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Yenile
          </SecondaryButton>
        </div>

        {runsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
          </div>
        ) : syncRuns.length === 0 ? (
          <EmptyState
            icon={Database}
            title="Henüz sync çalıştırılmadı"
            description="Yukarıdan bir sync başlatın."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/60">
                  <th className="text-left px-4 py-2 font-medium text-neutral-500">Oyun</th>
                  <th className="text-left px-4 py-2 font-medium text-neutral-500">Mod</th>
                  <th className="text-left px-4 py-2 font-medium text-neutral-500">Durum</th>
                  <th className="text-left px-4 py-2 font-medium text-neutral-500">İstatistik</th>
                  <th className="text-left px-4 py-2 font-medium text-neutral-500">Süre</th>
                  <th className="text-left px-4 py-2 font-medium text-neutral-500">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {syncRuns.map((run) => (
                  <tr key={run.id} data-testid={`row-sync-run-${run.id}`} className="hover:bg-neutral-50/60">
                    <td className="px-4 py-2.5 font-medium text-neutral-800">
                      {GAME_LABELS[run.game] ?? run.game}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {MODE_LABELS[run.mode] ?? run.mode}
                      {run.setApiId && (
                        <span className="ml-1 text-neutral-400">({run.setApiId})</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      <div className="flex flex-col gap-0.5">
                        {run.stats.setsProcessed !== undefined && (
                          <span>{run.stats.setsProcessed} set</span>
                        )}
                        {run.stats.cardsProcessed !== undefined && (
                          <span>
                            {run.stats.cardsInserted ?? 0}+{run.stats.cardsUpdated ?? 0} kart
                          </span>
                        )}
                        {(run.stats.imagesDownloaded !== undefined) && (
                          <span className="text-indigo-600">
                            {run.stats.imagesDownloaded ?? 0} resim
                          </span>
                        )}
                        {run.stats.pricesUpdated !== undefined && (
                          <span>{run.stats.pricesUpdated} fiyat</span>
                        )}
                        {(run.stats.errors ?? 0) > 0 && (
                          <span className="text-red-500">{run.stats.errors} hata</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-500">{duration(run)}</td>
                    <td className="px-4 py-2.5 text-neutral-500">
                      {new Date(run.startedAt).toLocaleString("tr-TR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Hint for API keys */}
      <div className="text-[11px] text-neutral-400 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          API anahtarları Ayarlar sekmesinden yönetilir:{" "}
          <code className="bg-neutral-100 rounded px-1 py-0.5">pokemon_tcg_api_key</code> ve{" "}
          <code className="bg-neutral-100 rounded px-1 py-0.5">pricecharting_api_key</code>
        </span>
      </div>

      {/* ── Danger Zone ───────────────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h3 className="font-semibold text-red-600 text-sm">Tehlike Bölgesi — Veri Silme</h3>
        </div>
        <p className="text-xs text-neutral-500 mb-4">
          Seçili oyuna ait tüm kartlar, setler, listinglar ve fiyatlar <strong>kalıcı olarak silinir</strong>. Geri alınamaz.
        </p>

        {deleteResult && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
            ✓ Silindi — {deleteResult.deletedCards} kart, {deleteResult.deletedSets} set, {deleteResult.deletedListings} listing kaldırıldı.
          </div>
        )}

        {deleteMutation.isError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            Hata: {(deleteMutation.error as Error)?.message}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: "riftbound", label: "Riftbound Verisini Sil" },
            { key: "pokemon",   label: "Pokemon TCG Verisini Sil" },
            { key: "all",       label: "Tüm TCG Verisini Sil" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setDeleteTarget(key as any); setDeleteConfirmText(""); setDeleteResult(null); }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium ${
                deleteTarget === key
                  ? key === "all" ? "bg-red-600 text-white border-red-600" : "bg-red-50 text-red-700 border-red-300"
                  : "bg-white text-neutral-600 border-neutral-200 hover:border-red-300 hover:text-red-600"
              }`}
            >
              <Trash2 className="w-3 h-3 inline mr-1" />
              {label}
            </button>
          ))}
        </div>

        {deleteTarget && (
          <div className="border border-red-200 rounded-lg p-4 bg-red-50/50">
            <p className="text-xs text-red-600 mb-2 font-medium">
              Onaylamak için aşağıya <strong>SİL</strong> yazın:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="SİL"
                className="flex-1 text-sm px-3 py-1.5 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
              />
              <button
                disabled={deleteConfirmText !== "SİL" || deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget)}
                className="text-sm px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1.5"
              >
                {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Sil
              </button>
              <button
                onClick={() => { setDeleteTarget(""); setDeleteConfirmText(""); }}
                className="text-sm px-3 py-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600"
              >
                İptal
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
