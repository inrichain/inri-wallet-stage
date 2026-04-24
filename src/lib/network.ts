import { resolveNetworkAsset } from "./assets";

const BASE = import.meta.env.BASE_URL || "/";

export type NetworkItem = {
  key: string;
  name: string;
  chainId: number;
  symbol: string;
  rpcUrl: string;
  explorerAddressUrl: string;
  explorerTxUrl: string;
  logo: string;
  isCustom?: boolean;
};

export type NetworkPreset = {
  key: string;
  name: string;
  chainId: number;
  symbol: string;
  rpcUrl: string;
  explorerBaseUrl: string;
  logo?: string;
  color?: string;
};

export const NETWORKS_KEY = "wallet_active_network";
const CUSTOM_NETWORKS_KEY = "wallet_custom_networks_v1";
const HIDDEN_NETWORKS_KEY = "wallet_hidden_networks_v1";
const HIDDEN_TOKENS_KEY = "wallet_hidden_default_tokens_v1";
const INRI_WALLET_STATE_REPAIR_KEY = "inri_wallet_rpc_chain_repair_v5";

export function buildNetworkBadge(name: string, symbol = "ETH", color = "#3f7cff") {
  return resolveNetworkAsset({ name, symbol, color });
}

export function resolveNetworkLogo(input: {
  key?: string;
  name?: string;
  symbol?: string;
  color?: string;
  logo?: string;
}) {
  return resolveNetworkAsset(input);
}

export function getNetworkLogoFallback(input: {
  name?: string;
  symbol?: string;
  color?: string;
}) {
  return resolveNetworkAsset(input);
}

export const NETWORK_PRESETS: NetworkPreset[] = [
  { key: "inri", name: "INRI", chainId: 3777, symbol: "INRI", rpcUrl: "https://rpc-chain.inri.life", explorerBaseUrl: "https://explorer.inri.life", logo: `${BASE}network-inri.png`, color: "#2f85ff" },
  { key: "ethereum", name: "Ethereum", chainId: 1, symbol: "ETH", rpcUrl: "https://ethereum-rpc.publicnode.com", explorerBaseUrl: "https://etherscan.io", logo: `${BASE}network-ethereum.png`, color: "#627eea" },
  { key: "polygon", name: "Polygon", chainId: 137, symbol: "POL", rpcUrl: "https://polygon.drpc.org", explorerBaseUrl: "https://polygonscan.com", logo: `${BASE}network-polygon.png`, color: "#8247e5" },
  { key: "bsc", name: "BNB Chain", chainId: 56, symbol: "BNB", rpcUrl: "https://bsc-dataseed.binance.org", explorerBaseUrl: "https://bscscan.com", logo: `${BASE}network-bnb.png`, color: "#f0b90b" },
  { key: "arbitrum", name: "Arbitrum", chainId: 42161, symbol: "ETH", rpcUrl: "https://arb1.arbitrum.io/rpc", explorerBaseUrl: "https://arbiscan.io", logo: `${BASE}network-arbitrum.png`, color: "#28a0f0" },
  { key: "optimism", name: "Optimism", chainId: 10, symbol: "ETH", rpcUrl: "https://mainnet.optimism.io", explorerBaseUrl: "https://optimistic.etherscan.io", logo: `${BASE}network-optimism.png`, color: "#ff0420" },
  { key: "base", name: "Base", chainId: 8453, symbol: "ETH", rpcUrl: "https://mainnet.base.org", explorerBaseUrl: "https://basescan.org", color: "#0052ff" },
  { key: "avalanche", name: "Avalanche", chainId: 43114, symbol: "AVAX", rpcUrl: "https://api.avax.network/ext/bc/C/rpc", explorerBaseUrl: "https://snowtrace.io", color: "#e84142" },
  { key: "fantom", name: "Fantom", chainId: 250, symbol: "FTM", rpcUrl: "https://rpcapi.fantom.network", explorerBaseUrl: "https://ftmscan.com", color: "#1969ff" },
  { key: "gnosis", name: "Gnosis", chainId: 100, symbol: "xDAI", rpcUrl: "https://rpc.gnosischain.com", explorerBaseUrl: "https://gnosisscan.io", color: "#00a6a6" },
  { key: "linea", name: "Linea", chainId: 59144, symbol: "ETH", rpcUrl: "https://rpc.linea.build", explorerBaseUrl: "https://lineascan.build", color: "#61dfff" },
  { key: "mantle", name: "Mantle", chainId: 5000, symbol: "MNT", rpcUrl: "https://rpc.mantle.xyz", explorerBaseUrl: "https://mantlescan.xyz", color: "#0f4cff" },
  { key: "zksync", name: "zkSync Era", chainId: 324, symbol: "ETH", rpcUrl: "https://mainnet.era.zksync.io", explorerBaseUrl: "https://explorer.zksync.io", color: "#8c8dfc" },
  { key: "scroll", name: "Scroll", chainId: 534352, symbol: "ETH", rpcUrl: "https://rpc.scroll.io", explorerBaseUrl: "https://scrollscan.com", color: "#f0d89f" },
  { key: "zora", name: "Zora", chainId: 7777777, symbol: "ETH", rpcUrl: "https://rpc.zora.energy", explorerBaseUrl: "https://explorer.zora.energy", color: "#111111" },
  { key: "blast", name: "Blast", chainId: 81457, symbol: "ETH", rpcUrl: "https://rpc.blast.io", explorerBaseUrl: "https://blastscan.io", color: "#fcfc03" },
  { key: "mode", name: "Mode", chainId: 34443, symbol: "ETH", rpcUrl: "https://mainnet.mode.network", explorerBaseUrl: "https://explorer.mode.network", color: "#d8ff00" },
  { key: "celo", name: "Celo", chainId: 42220, symbol: "CELO", rpcUrl: "https://forno.celo.org", explorerBaseUrl: "https://celoscan.io", color: "#35d07f" },
  { key: "sei", name: "Sei EVM", chainId: 1329, symbol: "SEI", rpcUrl: "https://evm-rpc.sei-apis.com", explorerBaseUrl: "https://seistream.app", color: "#ff6b4a" },
  { key: "berachain", name: "Berachain", chainId: 80094, symbol: "BERA", rpcUrl: "https://rpc.berachain.com", explorerBaseUrl: "https://berascan.com", color: "#82f19d" },
];

function presetToNetworkItem(preset: NetworkPreset): NetworkItem {
  const explorer = String(preset.explorerBaseUrl || "").replace(/\/$/, "");
  return {
    key: preset.key,
    name: preset.name,
    chainId: Number(preset.chainId),
    symbol: preset.symbol,
    rpcUrl: preset.rpcUrl,
    explorerAddressUrl: explorer ? `${explorer}/address/` : "",
    explorerTxUrl: explorer ? `${explorer}/tx/` : "",
    logo: resolveNetworkLogo(preset),
  };
}

export const DEFAULT_NETWORKS: NetworkItem[] = NETWORK_PRESETS.slice(0, 6).map(presetToNetworkItem);

export function isProtectedNetwork(keyOrChainId?: string | number) {
  return String(keyOrChainId) === "inri" || Number(keyOrChainId) === 3777;
}

export function getInriNetwork(): NetworkItem {
  return presetToNetworkItem(NETWORK_PRESETS[0]);
}

export function findPresetByChainId(chainId: number) {
  return NETWORK_PRESETS.find((item) => Number(item.chainId) === Number(chainId)) || null;
}

function findPresetByKey(key?: string) {
  return NETWORK_PRESETS.find((item) => item.key === key) || null;
}

export function makeNetworkFromChainId(chainId: number) {
  const preset = findPresetByChainId(chainId);
  return preset ? presetToNetworkItem(preset) : null;
}

function getHiddenNetworkKeys() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HIDDEN_NETWORKS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [] as string[];
  }
}

function saveHiddenNetworkKeys(items: string[]) {
  const unique = Array.from(new Set(items.map((item) => String(item)).filter((item) => item && !isProtectedNetwork(item))));
  localStorage.setItem(HIDDEN_NETWORKS_KEY, JSON.stringify(unique));
}

function networkStorageKey(item: { key?: string; chainId?: number }) {
  return item.key || String(item.chainId || "");
}

function normalizeStoredNetwork(value: any): NetworkItem {
  // INRI is a protected built-in network. Older wallet versions could store it
  // as a custom network with a different key/rpcUrl, which makes staking think
  // the user is on the wrong network even when chainId is 3777.
  if (isProtectedNetwork(value?.key) || isProtectedNetwork(Number(value?.chainId))) {
    return getInriNetwork();
  }

  const known = getAllNetworks({ includeHidden: true }).find((item) => item.key === value?.key || item.chainId === Number(value?.chainId));
  if (!known) {
    return {
      ...(value as NetworkItem),
      logo: resolveNetworkLogo({
        key: value?.key,
        name: value?.name || `Chain ${Number(value?.chainId) || 0}`,
        symbol: value?.symbol || "ETH",
        logo: value?.logo,
      }),
    };
  }
  return {
    ...known,
    ...value,
    logo: resolveNetworkLogo({
      key: value?.key || known.key,
      name: value?.name || known.name,
      symbol: value?.symbol || known.symbol,
      logo: value?.logo || known.logo,
    }),
  };
}

export function getCustomNetworks(): NetworkItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_NETWORKS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.chainId && item?.rpcUrl)
      .map((item) => {
        const preset = findPresetByChainId(Number(item.chainId)) || findPresetByKey(item?.key);
        return {
          ...(preset ? presetToNetworkItem(preset) : null),
          ...item,
          chainId: Number(item.chainId),
          isCustom: true,
          logo: resolveNetworkLogo({
            key: item?.key || preset?.key,
            name: item?.name || preset?.name || `Chain ${Number(item.chainId)}`,
            symbol: item?.symbol || preset?.symbol || "ETH",
            color: preset?.color,
            logo: item?.logo || (preset ? presetToNetworkItem(preset).logo : ""),
          }),
        } as NetworkItem;
      });
  } catch {
    return [];
  }
}

export function saveCustomNetworks(items: NetworkItem[]) {
  localStorage.setItem(CUSTOM_NETWORKS_KEY, JSON.stringify(items.map((item) => ({ ...item, isCustom: true }))));
  window.dispatchEvent(new Event("wallet-network-updated"));
}

export function getAllNetworks(options?: { includeHidden?: boolean }): NetworkItem[] {
  const includeHidden = !!options?.includeHidden;
  const hidden = includeHidden ? [] : getHiddenNetworkKeys();
  const merged = NETWORK_PRESETS.map(presetToNetworkItem);
  for (const custom of getCustomNetworks()) {
    const index = merged.findIndex((item) => Number(item.chainId) === Number(custom.chainId) || item.key === custom.key);
    if (index >= 0) merged[index] = { ...merged[index], ...custom, isCustom: true };
    else merged.push(custom);
  }
  return merged
    .filter((item) => includeHidden || isProtectedNetwork(item.key) || !hidden.includes(networkStorageKey(item)))
    .sort((a, b) => {
      if (isProtectedNetwork(a.key)) return -1;
      if (isProtectedNetwork(b.key)) return 1;
      return a.name.localeCompare(b.name);
    });
}

export function upsertCustomNetwork(item: NetworkItem) {
  const all = getCustomNetworks();
  const next = normalizeStoredNetwork({ ...item, isCustom: true });
  const index = all.findIndex((network) => network.key === item.key || Number(network.chainId) === Number(item.chainId));
  if (index >= 0) all[index] = next;
  else all.push(next);
  saveCustomNetworks(all);
  const hidden = getHiddenNetworkKeys().filter((key) => key !== networkStorageKey(next) && Number(key) !== Number(next.chainId));
  saveHiddenNetworkKeys(hidden);
  return next;
}

export function removeCustomNetwork(keyOrChainId: string | number) {
  if (isProtectedNetwork(keyOrChainId)) return;
  const all = getCustomNetworks().filter((network) => network.key !== keyOrChainId && Number(network.chainId) !== Number(keyOrChainId));
  saveCustomNetworks(all);
}

export function hideNetwork(item: NetworkItem) {
  if (isProtectedNetwork(item.key) || isProtectedNetwork(item.chainId)) return;
  removeCustomNetwork(item.key || item.chainId);
  const hidden = getHiddenNetworkKeys();
  hidden.push(networkStorageKey(item));
  saveHiddenNetworkKeys(hidden);
  const active = getStoredNetwork();
  if (active.key === item.key || Number(active.chainId) === Number(item.chainId)) {
    saveStoredNetwork(getInriNetwork());
  }
  window.dispatchEvent(new Event("wallet-network-updated"));
}

export function restoreHiddenPresetNetwork(chainId: number) {
  const preset = findPresetByChainId(chainId);
  if (!preset) return null;
  const key = networkStorageKey(preset);
  const hidden = getHiddenNetworkKeys().filter((item) => item !== key && Number(item) !== Number(chainId));
  saveHiddenNetworkKeys(hidden);
  window.dispatchEvent(new Event("wallet-network-updated"));
  return presetToNetworkItem(preset);
}

export function getHiddenPresetNetworks(): NetworkItem[] {
  const hidden = getHiddenNetworkKeys();
  return NETWORK_PRESETS
    .filter((preset) => !isProtectedNetwork(preset.key) && hidden.includes(networkStorageKey(preset)))
    .map(presetToNetworkItem)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getNetworkByChainId(chainId: number) {
  return getAllNetworks().find((item) => Number(item.chainId) === Number(chainId)) || null;
}

export function getStoredNetwork(): NetworkItem {
  try {
    const raw = localStorage.getItem(NETWORKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.key && parsed?.chainId && parsed?.rpcUrl) {
        const normalized = normalizeStoredNetwork(parsed);
        if (isProtectedNetwork(parsed?.key) || isProtectedNetwork(Number(parsed?.chainId))) {
          localStorage.setItem(NETWORKS_KEY, JSON.stringify(normalized));
        }
        const hidden = getHiddenNetworkKeys();
        if (isProtectedNetwork(normalized.key) || isProtectedNetwork(Number(normalized.chainId)) || !hidden.includes(networkStorageKey(normalized))) return normalized;
      }
    }
  } catch {}
  return getInriNetwork();
}

export function saveStoredNetwork(network: NetworkItem) {
  const normalized = normalizeStoredNetwork(network);
  localStorage.setItem(NETWORKS_KEY, JSON.stringify(normalized));
}


export function repairInriWalletState(force = false) {
  try {
    const alreadyRepaired = localStorage.getItem(INRI_WALLET_STATE_REPAIR_KEY) === "done";
    if (alreadyRepaired && !force) return false;

    const inri = getInriNetwork();

    try {
      const custom = JSON.parse(localStorage.getItem(CUSTOM_NETWORKS_KEY) || "[]");
      if (Array.isArray(custom)) {
        const cleaned = custom.filter((item) => !isProtectedNetwork(item?.key) && !isProtectedNetwork(Number(item?.chainId)));
        localStorage.setItem(CUSTOM_NETWORKS_KEY, JSON.stringify(cleaned));
      }
    } catch {
      localStorage.removeItem(CUSTOM_NETWORKS_KEY);
    }

    try {
      const hidden = JSON.parse(localStorage.getItem(HIDDEN_NETWORKS_KEY) || "[]");
      if (Array.isArray(hidden)) {
        const cleaned = hidden.filter((item) => !isProtectedNetwork(item) && !isProtectedNetwork(Number(item)));
        localStorage.setItem(HIDDEN_NETWORKS_KEY, JSON.stringify(cleaned));
      }
    } catch {
      localStorage.removeItem(HIDDEN_NETWORKS_KEY);
    }

    try {
      const hiddenTokens = JSON.parse(localStorage.getItem(HIDDEN_TOKENS_KEY) || "[]");
      if (Array.isArray(hiddenTokens)) {
        const cleaned = hiddenTokens.filter((item) => !String(item).toLowerCase().startsWith("inri:"));
        localStorage.setItem(HIDDEN_TOKENS_KEY, JSON.stringify(cleaned));
      }
    } catch {
      localStorage.removeItem(HIDDEN_TOKENS_KEY);
    }

    let shouldUseInri = force;
    try {
      const current = JSON.parse(localStorage.getItem(NETWORKS_KEY) || "null");
      shouldUseInri = force || !current || isProtectedNetwork(current?.key) || isProtectedNetwork(Number(current?.chainId));
    } catch {
      shouldUseInri = true;
    }

    if (shouldUseInri) localStorage.setItem(NETWORKS_KEY, JSON.stringify(inri));
    localStorage.setItem(INRI_WALLET_STATE_REPAIR_KEY, "done");
    window.dispatchEvent(new Event("wallet-network-updated"));
    window.dispatchEvent(new Event("wallet-token-updated"));
    return true;
  } catch {
    return false;
  }
}
