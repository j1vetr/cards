import { parseTcmbUsd, TCMB_URL } from "./salePricingMath";

let cached: { value: ReturnType<typeof parseTcmbUsd>; until: number } | undefined;

export async function getTcmbUsdRate() {
  if (cached && cached.until > Date.now()) return cached.value;
  const response = await fetch(TCMB_URL, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("TCMB kuruna ulaşılamadı. Daha sonra tekrar deneyin.");
  const value = parseTcmbUsd(await response.text());
  cached = { value, until: Date.now() + 15 * 60 * 1000 };
  return value;
}
