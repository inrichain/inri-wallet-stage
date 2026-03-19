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

function initialsFromName(name: string) {
  const parts = String(name || "NET")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return "N";
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

function networkBadge(name: string, symbol = "ETH", color = "#3f7cff") {
  const text = initialsFromName(name);
  const symbolSafe = String(symbol || "ETH").slice(0, 4).toUpperCase();
  const fill = String(color || "#3f7cff");
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${fill}" />
        <stop offset="100%" stop-color="#111827" />
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="32" fill="url(#g)"/>
    <circle cx="64" cy="44" r="24" fill="rgba(255,255,255,.12)"/>
    <text x="64" y="54" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#ffffff">${text}</text>
    <text x="64" y="94" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800" fill="#ffffff">${symbolSafe}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\n\s*/g, ""))}`;
}

export const NETWORK_PRESETS: NetworkPreset[] = [
  { key: "inri", name: "INRI", chainId: 3777, symbol: "INRI", rpcUrl: "https://rpc.inri.life", explorerBaseUrl: "https://explorer.inri.life", logo: `${BASE}network-inri.png`, color: "#2f85ff" },
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
    logo: preset.logo || networkBadge(preset.name, preset.symbol, preset.color),
  };
}

export const DEFAULT_NETWORKS: NetworkItem[] = NETWORK_PRESETS.slice(0, 6).map(presetToNetworkItem);

export function findPresetByChainId(chainId: number) {
  return NETWORK_PRESETS.find((item) => Number(item.chainId) === Number(chainId)) || null;
}

export function makeNetworkFromChainId(chainId: number) {
  const preset = findPresetByChainId(chainId);
  return preset ? presetToNetworkItem(preset) : null;
}

function normalizeStoredNetwork(value: any): NetworkItem {
  const known = getAllNetworks().find((item) => item.key === value?.key || item.chainId === Number(value?.chainId));
  if (!known) {
    return {
      ...(value as NetworkItem),
      logo: value?.logo || networkBadge(value?.name || `Chain ${Number(value?.chainId) || 0}`, value?.symbol || "ETH"),
    };
  }
  return {
    ...known,
    ...value,
    logo: value?.logo || known.logo,
  };
}

export function getCustomNetworks(): NetworkItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_NETWORKS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.chainId && item?.rpcUrl)
      .map((item) => {
        const preset = findPresetByChainId(Number(item.chainId));
        return {
          ...(preset ? presetToNetworkItem(preset) : null),
          ...item,
          chainId: Number(item.chainId),
          isCustom: true,
          logo: item.logo || (preset ? presetToNetworkItem(preset).logo : networkBadge(item.name || `Chain ${Number(item.chainId)}`, item.symbol || "ETH")),
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

export function getAllNetworks(): NetworkItem[] {
  const merged = NETWORK_PRESETS.map(presetToNetworkItem);
  for (const custom of getCustomNetworks()) {
    const index = merged.findIndex((item) => Number(item.chainId) === Number(custom.chainId));
    if (index >= 0) merged[index] = { ...merged[index], ...custom, isCustom: true };
    else merged.push(custom);
  }
  return merged;
}

export function upsertCustomNetwork(item: NetworkItem) {
  const all = getCustomNetworks();
  const next = normalizeStoredNetwork({ ...item, isCustom: true });
  const index = all.findIndex((network) => network.key === item.key || Number(network.chainId) === Number(item.chainId));
  if (index >= 0) all[index] = next;
  else all.push(next);
  saveCustomNetworks(all);
  return next;
}

export function removeCustomNetwork(keyOrChainId: string | number) {
  const all = getCustomNetworks().filter((network) => network.key !== keyOrChainId && Number(network.chainId) !== Number(keyOrChainId));
  saveCustomNetworks(all);
}

export function getNetworkByChainId(chainId: number) {
  return getAllNetworks().find((item) => Number(item.chainId) === Number(chainId)) || null;
}

export function getStoredNetwork(): NetworkItem {
  try {
    const raw = localStorage.getItem(NETWORKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.key && parsed?.chainId && parsed?.rpcUrl) return normalizeStoredNetwork(parsed);
    }
  } catch {}
  return DEFAULT_NETWORKS[0];
}

export function saveStoredNetwork(network: NetworkItem) {
  localStorage.setItem(NETWORKS_KEY, JSON.stringify(normalizeStoredNetwork(network)));
}
