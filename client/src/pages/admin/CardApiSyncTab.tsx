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
    pricesUpdated?: number;
    errors?: number;
  };
  errors: Array<{ context: string; message: string }>;
  startedAt: string;
  completedAt?: string | null;
}

const GAME_LABELS: Record<string, string> = {
  pokemon_tcg: "Pokemon TCG",
  riftbound: "Riftbound",
  pricecharting: "PriceCharting",
};

const MODE_LABELS: Record<string, string> = {
  sets: "Set Import",
  cards: "Kart Import",
  prices: "Fiyat Güncelleme",
};

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
  const [selectedMode, setSelectedMode] = useState<"sets" | "cards" | "prices">("sets");
  const [selectedSetId, setSelectedSetId] = useState<string>("");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const { data: games = [] } = useQuery<CardGame[]>({
    queryKey: ["/api/admin/tcg/games"],
    refetchInterval: false,
  });

  const gameId = games.find((g) => g.slug === (selectedGame === "pokemon_tcg" ? "pokemon" : "riftbound"))?.id;

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

  const { data: syncRuns = [], isLoading: runsLoading } = useQuery<SyncRun[]>({
    queryKey: ["/api/admin/tcg/sync-runs"],
    refetchInterval: activeRunId ? 3000 : 15000,
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
    }
  }, [activeRun?.status]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {
        game: selectedGame,
        mode: selectedMode,
      };
      if (selectedMode === "cards" && selectedSetId) {
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

  const isRunning = !!activeRunId && activeRun?.status === "running";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kart API Senkronizasyonu"
        description="Pokemon TCG ve Riftbound verilerini API'den çek; PriceCharting ile fiyatları güncelle."
      />

      {/* Sync Configuration */}
      <Card className="p-5">
        <h3 className="text-[13px] font-semibold text-neutral-800 mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          Senkronizasyon Ayarları
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

          {/* Mode selector */}
          <div>
            <label className="text-[11px] font-medium text-neutral-600 uppercase tracking-wide mb-1.5 block">
              Mod
            </label>
            <select
              data-testid="select-tcg-mode"
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value as any)}
              className="w-full text-[13px] border border-neutral-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              disabled={isRunning}
            >
              <option value="sets">Set Import (tüm setleri çek)</option>
              <option value="cards">Kart Import (kart verilerini çek)</option>
              <option value="prices">Fiyat Güncelleme (PriceCharting)</option>
            </select>
          </div>

          {/* Optional set filter (only for cards mode) */}
          <div>
            <label className="text-[11px] font-medium text-neutral-600 uppercase tracking-wide mb-1.5 block">
              Set Filtresi <span className="font-normal text-neutral-400">(opsiyonel)</span>
            </label>
            <select
              data-testid="select-tcg-set"
              value={selectedSetId}
              onChange={(e) => setSelectedSetId(e.target.value)}
              className="w-full text-[13px] border border-neutral-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
              disabled={selectedMode !== "cards" || isRunning}
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
            {selectedMode === "sets" &&
              "Seçili oyunun tüm setleri API'den çekilip veritabanına kaydedilir. Mevcut setler güncellenir."}
            {selectedMode === "cards" &&
              "Seçili set (veya tüm setler) için kartlar API'den çekilip upsert edilir. Önce set import yapılmış olmalı."}
            {selectedMode === "prices" &&
              "Tüm aktif kartlar için PriceCharting'den market/low/high fiyatlar çekilir. API key gereklidir (Ayarlar → pricecharting_api_key)."}
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
            ) : selectedMode === "sets" ? (
              <Download className="w-4 h-4" />
            ) : selectedMode === "prices" ? (
              <DollarSign className="w-4 h-4" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isRunning ? "Sync çalışıyor…" : "Sync Başlat"}
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
            {activeRun.stats.pricesUpdated !== undefined && (
              <p>Fiyatlar: {activeRun.stats.pricesUpdated}</p>
            )}
          </div>
        </Card>
      )}

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
    </div>
  );
}
