/** No upstream HTML is ever inserted into the DOM. Components render this data as React nodes. */
export type RiftSymbolName = "energy" | "might" | "exhaust" | "fury" | "calm" | "mind" | "body" | "chaos" | "order" | "rainbow";
export type RiftRuleToken =
  | { kind: "text"; text: string }
  | { kind: "symbol"; name: RiftSymbolName; value?: number; raw: string }
  | { kind: "keyword"; label: string; raw: string }
  | { kind: "activation"; doubled: boolean; raw: string }
  | { kind: "unknown"; label: string; raw: string };
export interface RiftRuleBlock {
  kind: "paragraph" | "list";
  lines: RiftRuleToken[][];
}
export const RIFT_KEYWORDS = [
  "Accelerate", "Action", "Add", "Ambush", "Assault", "Backline", "Buff", "Burn",
  "Deathknell", "Deflect", "Deploy", "Disarm", "Empower", "Empowered", "Equip",
  "Flow", "Ganking", "Hidden", "Hunt", "Legion", "Level", "Mighty", "Predict",
  "Quick-Draw", "Reaction", "Repeat", "Shield", "Show Off", "Stun", "Tank",
  "Temporary", "Unique", "Vision", "Weaponmaster",
] as const;
export const RIFT_SYMBOLS: Record<RiftSymbolName, { label: string; asset?: string }> = {
  energy: { label: "Enerji" },
  might: { label: "Might", asset: "/icons/riftbound/might.svg" },
  exhaust: { label: "Exhaust", asset: "/icons/riftbound/exhaust.svg" },
  fury: { label: "Fury", asset: "/icons/riftbound/fury.svg" },
  calm: { label: "Calm", asset: "/icons/riftbound/calm.svg" },
  mind: { label: "Mind", asset: "/icons/riftbound/mind.svg" },
  body: { label: "Body", asset: "/icons/riftbound/body.svg" },
  chaos: { label: "Chaos", asset: "/icons/riftbound/chaos.svg" },
  order: { label: "Order", asset: "/icons/riftbound/order.svg" },
  rainbow: { label: "Herhangi bir rün", asset: "/icons/riftbound/wild.svg" },
};
export function tokenizeRiftRules(text: string): RiftRuleToken[] {
  const result: RiftRuleToken[] = [];
  const pattern = /:rb_[a-z0-9_]+:|\[[^\]\r\n]{1,100}\]/gi;
  let start = 0;
  for (const match of Array.from(text.matchAll(pattern))) {
    const index = match.index!;
    if (index > start) result.push({ kind: "text", text: text.slice(start, index) });
    const raw = match[0];
    const energy = /^:rb_energy_(\d+):$/i.exec(raw);
    const rune = /^:rb_rune_(fury|calm|mind|body|chaos|order|rainbow):$/i.exec(raw);
    const symbol = /^:rb_(might|exhaust):$/i.exec(raw);
    const keyword = raw.slice(1, -1);
    const keywordName = keyword.replace(/\s+\d+$/, "");
    const known = RIFT_KEYWORDS.find(k => k.toLowerCase() === keywordName.toLowerCase());
    if (energy && Number.isSafeInteger(Number(energy[1]))) {
      result.push({ kind: "symbol", name: "energy", value: Number(energy[1]), raw });
    } else if (rune || symbol) {
      result.push({ kind: "symbol", name: (rune?.[1] || symbol![1]).toLowerCase() as RiftSymbolName, raw });
    } else if (raw === "[>]" || raw === "[>>]") {
      result.push({ kind: "activation", doubled: raw === "[>>]", raw });
    } else if (known && raw.startsWith("[")) {
      result.push({ kind: "keyword", label: known + keyword.slice(keywordName.length), raw });
    } else if (/^:rb_/i.test(raw)) {
      // Keep unknown future identifiers available without exposing machine formatting.
      result.push({ kind: "unknown", label: raw.slice(4, -1).replaceAll("_", " "), raw });
    } else {
      result.push({ kind: "text", text: raw });
    }
    start = index + raw.length;
  }
  if (start < text.length) result.push({ kind: "text", text: text.slice(start) });
  return result;
}

function decodeEntities(text: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  // One pass only: double-encoded content must not turn into markup.
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (all, entity: string) => {
    if (entity[0] !== "#") return named[entity.toLowerCase()] ?? all;
    const value = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return value > 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff) ? String.fromCodePoint(value) : all;
  });
}
export function parseRiftRules(text: string | null | undefined, rich?: string | null): RiftRuleBlock[] {
  let value = text ?? "";
  if (rich?.trim()) {
    value = decodeEntities(rich
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(script|style|iframe|object|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
      .replace(/<li\b[^>]*>/gi, "\n• ")
      .replace(/<\/(?:li|p|div|ul|ol)\s*>|<br\s*\/?>/gi, "\n")
      .replace(/<(?:p|div|ul|ol)\b[^>]*>/gi, "\n")
      .replace(/<[^>]*>/g, ""));
  }
  if (/^\s*\[NO TEXT\]\s*$/i.test(value) || !value.trim()) return [];
  const blocks: RiftRuleBlock[] = [];
  for (const line of value.replace(/\r\n?/g, "\n").split("\n")) {
    if (!line.trim()) continue;
    const bullet = /^\s*(?:•|[-*]\s)\s*/.exec(line);
    const kind = bullet ? "list" : "paragraph";
    const tokens = tokenizeRiftRules(bullet ? line.slice(bullet[0].length) : line.trim());
    const previous = blocks.at(-1);
    if (previous?.kind === kind) previous.lines.push(tokens);
    else blocks.push({ kind, lines: [tokens] });
  }
  return blocks;
}
