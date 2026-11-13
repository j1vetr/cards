import { RIFT_SYMBOLS, type RiftRuleToken, type RiftSymbolName } from "@shared/riftRules";
import { Zap } from "lucide-react";

type SymbolProps = {
  name: RiftSymbolName;
  value?: number;
  compact?: boolean;
};

export function RiftSymbol({ name, value, compact = false }: SymbolProps) {
  const meta = RIFT_SYMBOLS[name];
  const accessibleName = name === "energy" ? `Enerji ${value ?? ""}`.trim() : meta.label;
  return (
    <span
      className={`inline-flex shrink-0 align-middle items-center justify-center rounded-full ${name === "energy" && value != null && value >= 10 ? "h-6 min-w-8 px-1" : compact ? "h-5 w-5" : "h-6 w-6"} ${
        name === "energy" ? "bg-amber-300 text-[#30260f] ring-1 ring-amber-100/60" : "bg-[#34434e] ring-1 ring-white/20"
      }`}
      data-rift-symbol={name}
      data-rift-value={value}
      role="img"
      aria-label={accessibleName}
      title={accessibleName}
    >
      {meta.asset ? (
        <img className="h-full w-full object-contain p-[3px]" src={meta.asset} alt="" aria-hidden="true" draggable={false} />
      ) : (
        <span className="inline-flex items-center gap-[1px] px-1 font-mono text-[9px] font-black leading-none" aria-hidden="true">
          <Zap className="h-2.5 w-2.5 fill-current" />
          {value !== undefined && <span>{value}</span>}
        </span>
      )}
    </span>
  );
}

export function RiftTokenView({ token }: { token: RiftRuleToken }) {
  if (token.kind === "text") return <>{token.text}</>;
  if (token.kind === "symbol") return <RiftSymbol name={token.name} value={token.value} compact />;
  if (token.kind === "keyword") {
    return <span className="mx-0.5 inline-flex rounded-md border border-amber-200/25 bg-amber-300/10 px-1.5 py-0.5 align-baseline text-[0.9em] font-semibold leading-none text-amber-100" title={token.raw}>{token.label}</span>;
  }
  if (token.kind === "activation") {
    const separatorName = token.doubled ? "İç etki ayıracı" : "Etki ayıracı";
    return <span className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded border border-white/20 bg-white/10 px-1 align-middle font-semibold text-indigo-100" data-rift-activation={token.doubled ? "nested" : "effect"} role="img" aria-label={separatorName} title={separatorName}>
      {token.doubled ? "»" : "›"}
    </span>;
  }
  return <span className="rounded-sm border-b border-dotted border-amber-200/60 text-amber-100" title={`Kaynak kodu: ${token.raw}`}>{token.label}</span>;
}

