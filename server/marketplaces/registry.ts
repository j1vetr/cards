import type {
  MarketplaceAdapter,
  MarketplaceAdapterFactory,
  MarketplaceConfig,
  MarketplaceCredentials,
  MarketplaceType,
} from "./types";

/**
 * Adapter kayıt deposu. Her pazaryeri (Trendyol, N11, ...) bir factory ile
 * kendini buraya tanıtır; sync motoru ve route'lar adapter'ı tipine göre
 * registry üzerinden alır.
 */

interface RegistryEntry {
  factory: MarketplaceAdapterFactory;
  /** UI'da gösterilecek başlık (ör. "Trendyol"). */
  displayName: string;
  /** Bu pazaryeri için gerekli credential alan adları (UI form generation için). */
  credentialFields: Array<{
    key: string;
    label: string;
    type: "text" | "password";
    required: boolean;
    helpText?: string;
  }>;
}

const registry = new Map<MarketplaceType, RegistryEntry>();

export function registerAdapter(type: MarketplaceType, entry: RegistryEntry): void {
  registry.set(type, entry);
}

export function getAdapterEntry(type: MarketplaceType): RegistryEntry {
  const entry = registry.get(type);
  if (!entry) {
    throw new Error(`No marketplace adapter registered for type "${type}"`);
  }
  return entry;
}

export function createAdapter(
  type: MarketplaceType,
  credentials: MarketplaceCredentials,
  config: MarketplaceConfig,
): MarketplaceAdapter {
  const entry = getAdapterEntry(type);
  return entry.factory(credentials, config);
}

export function listRegisteredAdapters(): Array<{
  type: MarketplaceType;
  displayName: string;
  credentialFields: RegistryEntry["credentialFields"];
}> {
  return Array.from(registry.entries()).map(([type, entry]) => ({
    type,
    displayName: entry.displayName,
    credentialFields: entry.credentialFields,
  }));
}
