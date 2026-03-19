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

export const NETWORKS_KEY = "wallet_active_network";
const CUSTOM_NETWORKS_KEY = "wallet_custom_networks_v1";

export const DEFAULT_NETWORKS: NetworkItem[] = [
  {
    key: "inri",
    name: "INRI",
    chainId: 3777,
    symbol: "INRI",
    rpcUrl: "https://rpc.inri.life",
    explorerAddressUrl: "https://explorer.inri.life/address/",
    explorerTxUrl: "https://explorer.inri.life/tx/",
    logo: `${BASE}network-inri.png`,
  },
  {
    key: "polygon",
    name: "Polygon",
    chainId: 137,
    symbol: "POL",
    rpcUrl: "https://polygon.drpc.org",
    explorerAddressUrl: "https://polygonscan.com/address/",
    explorerTxUrl: "https://polygonscan.com/tx/",
    logo: `${BASE}network-polygon.png`,
  },
  {
    key: "ethereum",
    name: "Ethereum",
    chainId: 1,
    symbol: "ETH",
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    explorerAddressUrl: "https://etherscan.io/address/",
    explorerTxUrl: "https://etherscan.io/tx/",
    logo: `${BASE}network-ethereum.png`,
  },
  {
    key: "bsc",
    name: "BNB Chain",
    chainId: 56,
    symbol: "BNB",
    rpcUrl: "https://bsc-dataseed.binance.org",
    explorerAddressUrl: "https://bscscan.com/address/",
    explorerTxUrl: "https://bscscan.com/tx/",
    logo: `${BASE}network-bnb.png`,
  },
  {
    key: "arbitrum",
    name: "Arbitrum",
    chainId: 42161,
    symbol: "ETH",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerAddressUrl: "https://arbiscan.io/address/",
    explorerTxUrl: "https://arbiscan.io/tx/",
    logo: `${BASE}network-arbitrum.png`,
  },
  {
    key: "optimism",
    name: "Optimism",
    chainId: 10,
    symbol: "ETH",
    rpcUrl: "https://mainnet.optimism.io",
    explorerAddressUrl: "https://optimistic.etherscan.io/address/",
    explorerTxUrl: "https://optimistic.etherscan.io/tx/",
    logo: `${BASE}network-optimism.png`,
  },
];

function normalizeStoredNetwork(value: any): NetworkItem {
  const known = getAllNetworks().find((item) => item.key === value?.key || item.chainId === Number(value?.chainId));
  if (!known) return value as NetworkItem;
  return {
    ...known,
    ...value,
    logo: known.logo || value.logo,
  };
}

export function getCustomNetworks(): NetworkItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_NETWORKS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.chainId && item?.rpcUrl)
      .map((item) => ({
        ...item,
        chainId: Number(item.chainId),
        isCustom: true,
        logo: item.logo || DEFAULT_NETWORKS.find((n) => n.chainId === Number(item.chainId))?.logo || `${BASE}network-inri.png`,
      }));
  } catch {
    return [];
  }
}

export function saveCustomNetworks(items: NetworkItem[]) {
  localStorage.setItem(CUSTOM_NETWORKS_KEY, JSON.stringify(items.map((item) => ({ ...item, isCustom: true }))));
  window.dispatchEvent(new Event("wallet-network-updated"));
}

export function getAllNetworks(): NetworkItem[] {
  const merged = [...DEFAULT_NETWORKS];
  for (const custom of getCustomNetworks()) {
    const index = merged.findIndex((item) => Number(item.chainId) === Number(custom.chainId));
    if (index >= 0) merged[index] = { ...merged[index], ...custom, isCustom: true };
    else merged.push(custom);
  }
  return merged;
}

export function upsertCustomNetwork(item: NetworkItem) {
  const all = getCustomNetworks();
  const next = { ...item, isCustom: true };
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
  localStorage.setItem(NETWORKS_KEY, JSON.stringify(network));
}
