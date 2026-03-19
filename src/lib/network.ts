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
export const CUSTOM_NETWORKS_KEY = "wallet_custom_networks_v1";

function badgeSvg(label: string, bg = "#0f172a", fg = "#ffffff") {
  const text = (label || "?").trim().slice(0, 3).toUpperCase();
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="32" fill="${bg}"/>
    <text x="32" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="${fg}">${text}</text>
  </svg>
  `)}`;
}

export function getNetworkLogoFile(key: string) {
  return `${BASE}network-${key}.png`;
}

function normalizeExplorerAddress(value?: string) {
  if (!value) return "";
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeExplorerTx(value?: string) {
  if (!value) return "";
  return value.endsWith("/") ? value : `${value}/`;
}

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
  {
    key: "base",
    name: "Base",
    chainId: 8453,
    symbol: "ETH",
    rpcUrl: "https://mainnet.base.org",
    explorerAddressUrl: "https://basescan.org/address/",
    explorerTxUrl: "https://basescan.org/tx/",
    logo: getNetworkLogoFile("base"),
  },
  {
    key: "linea",
    name: "Linea",
    chainId: 59144,
    symbol: "ETH",
    rpcUrl: "https://rpc.linea.build",
    explorerAddressUrl: "https://lineascan.build/address/",
    explorerTxUrl: "https://lineascan.build/tx/",
    logo: getNetworkLogoFile("linea"),
  },
  {
    key: "scroll",
    name: "Scroll",
    chainId: 534352,
    symbol: "ETH",
    rpcUrl: "https://rpc.scroll.io",
    explorerAddressUrl: "https://scrollscan.com/address/",
    explorerTxUrl: "https://scrollscan.com/tx/",
    logo: getNetworkLogoFile("scroll"),
  },
  {
    key: "celo",
    name: "Celo",
    chainId: 42220,
    symbol: "CELO",
    rpcUrl: "https://forno.celo.org",
    explorerAddressUrl: "https://celoscan.io/address/",
    explorerTxUrl: "https://celoscan.io/tx/",
    logo: getNetworkLogoFile("celo"),
  },
  {
    key: "mode",
    name: "Mode",
    chainId: 34443,
    symbol: "ETH",
    rpcUrl: "https://mainnet.mode.network",
    explorerAddressUrl: "https://explorer.mode.network/address/",
    explorerTxUrl: "https://explorer.mode.network/tx/",
    logo: getNetworkLogoFile("mode"),
  },
];

export function normalizeStoredNetwork(value: any): NetworkItem {
  const known = [...DEFAULT_NETWORKS, ...getCustomNetworks()].find(
    (item) => item.key === value?.key || item.chainId === Number(value?.chainId),
  );
  const base = known || value || {};
  const name = String(value?.name || known?.name || "Custom Network");
  return {
    key: String(value?.key || known?.key || `chain-${Number(value?.chainId || 0)}`),
    name,
    chainId: Number(value?.chainId || known?.chainId || 0),
    symbol: String(value?.symbol || known?.symbol || "ETH"),
    rpcUrl: String(value?.rpcUrl || known?.rpcUrl || ""),
    explorerAddressUrl: normalizeExplorerAddress(value?.explorerAddressUrl || known?.explorerAddressUrl || ""),
    explorerTxUrl: normalizeExplorerTx(value?.explorerTxUrl || known?.explorerTxUrl || ""),
    logo: String(value?.logo || known?.logo || badgeSvg(name)),
    isCustom: Boolean(value?.isCustom ?? known?.isCustom ?? false),
  };
}

export function getCustomNetworks(): NetworkItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_NETWORKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeStoredNetwork({ ...item, isCustom: true }));
  } catch {
    return [];
  }
}

export function saveCustomNetworks(items: NetworkItem[]) {
  localStorage.setItem(CUSTOM_NETWORKS_KEY, JSON.stringify(items.map((item) => ({ ...item, isCustom: true }))));
  window.dispatchEvent(new Event("wallet-networks-updated"));
}

export function addOrUpdateCustomNetwork(item: NetworkItem) {
  const normalized = normalizeStoredNetwork({ ...item, isCustom: true });
  const current = getCustomNetworks();
  const next = current.filter((x) => x.chainId !== normalized.chainId && x.key !== normalized.key);
  next.push(normalized);
  saveCustomNetworks(next);
}

export function removeCustomNetwork(target: string | number) {
  const current = getCustomNetworks();
  const next = current.filter((item) => item.key !== target && item.chainId !== Number(target));
  saveCustomNetworks(next);
  const active = getStoredNetwork();
  if (active.key === target || active.chainId === Number(target)) {
    saveStoredNetwork(DEFAULT_NETWORKS[0]);
  }
}

export function getAllNetworks(): NetworkItem[] {
  const merged = [...DEFAULT_NETWORKS];
  for (const item of getCustomNetworks()) {
    if (!merged.find((x) => x.chainId === item.chainId || x.key === item.key)) {
      merged.push(item);
    }
  }
  return merged;
}

export function getNetworkByChainId(chainId: number) {
  return getAllNetworks().find((item) => item.chainId === Number(chainId));
}

export function getStoredNetwork(): NetworkItem {
  try {
    const raw = localStorage.getItem(NETWORKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.chainId && parsed?.rpcUrl) return normalizeStoredNetwork(parsed);
    }
  } catch {}
  return DEFAULT_NETWORKS[0];
}

export function saveStoredNetwork(network: NetworkItem) {
  localStorage.setItem(NETWORKS_KEY, JSON.stringify(normalizeStoredNetwork(network)));
  window.dispatchEvent(new Event("wallet-network-updated"));
}

export async function validateRpcAgainstChainId(rpcUrl: string, chainId: number) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
  });
  if (!res.ok) throw new Error(`RPC returned ${res.status}`);
  const data = await res.json();
  const result = String(data?.result || "");
  const detected = result ? Number(BigInt(result)) : NaN;
  if (!Number.isFinite(detected)) throw new Error("Invalid eth_chainId response");
  return detected === Number(chainId);
}

export function createNetworkDraft(chainId: number) {
  const known = getNetworkByChainId(chainId);
  if (known) return { ...known };
  return {
    key: chainId ? `chain-${chainId}` : `custom-${Date.now()}`,
    name: chainId ? `Chain ${chainId}` : "Custom Network",
    chainId,
    symbol: "ETH",
    rpcUrl: "",
    explorerAddressUrl: "",
    explorerTxUrl: "",
    logo: chainId ? badgeSvg(String(chainId), "#111827", "#e5e7eb") : badgeSvg("NET", "#111827", "#e5e7eb"),
    isCustom: true,
  } as NetworkItem;
}

export function createEmptyCustomNetwork() {
  return createNetworkDraft(0);
}
