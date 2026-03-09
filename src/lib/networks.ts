export type NetworkConfig = {
  key: string;
  id: string;
  name: string;
  chainId: number;
  rpcUrls: string[];
  explorerUrl: string;
  symbol: string;
  logo: string;
  isTestnet?: boolean;
};

const BASE = "/inri-wallet-stage/";

export const NETWORKS: NetworkConfig[] = [
  {
    key: "inri",
    id: "inri",
    name: "INRI CHAIN",
    chainId: 3777,
    rpcUrls: [
      "https://rpc.inri.life",
      "https://rpc-chain.inri.life",
    ],
    explorerUrl: "https://explorer.inri.life",
    symbol: "INRI",
    logo: `${BASE}net-inri.png`,
  },
  {
    key: "ethereum",
    id: "ethereum",
    name: "Ethereum",
    chainId: 1,
    rpcUrls: [
      "https://ethereum-rpc.publicnode.com",
      "https://cloudflare-eth.com",
    ],
    explorerUrl: "https://etherscan.io",
    symbol: "ETH",
    logo: `${BASE}net-ethereum.png`,
  },
  {
    key: "polygon",
    id: "polygon",
    name: "Polygon",
    chainId: 137,
    rpcUrls: [
      "https://polygon-rpc.com",
      "https://polygon-bor-rpc.publicnode.com",
    ],
    explorerUrl: "https://polygonscan.com",
    symbol: "POL",
    logo: `${BASE}net-polygon.png`,
  },
  {
    key: "bsc",
    id: "bsc",
    name: "BNB Smart Chain",
    chainId: 56,
    rpcUrls: [
      "https://bsc-dataseed.binance.org",
      "https://bsc-rpc.publicnode.com",
    ],
    explorerUrl: "https://bscscan.com",
    symbol: "BNB",
    logo: `${BASE}net-bsc.png`,
  },
  {
    key: "arbitrum",
    id: "arbitrum",
    name: "Arbitrum One",
    chainId: 42161,
    rpcUrls: [
      "https://arb1.arbitrum.io/rpc",
      "https://arbitrum-one-rpc.publicnode.com",
    ],
    explorerUrl: "https://arbiscan.io",
    symbol: "ETH",
    logo: `${BASE}net-arbitrum.png`,
  },
  {
    key: "base",
    id: "base",
    name: "Base",
    chainId: 8453,
    rpcUrls: [
      "https://mainnet.base.org",
      "https://base-rpc.publicnode.com",
    ],
    explorerUrl: "https://basescan.org",
    symbol: "ETH",
    logo: `${BASE}net-base.png`,
  },
];

export const DEFAULT_NETWORK_KEY = "inri";
export const ACTIVE_NETWORK_KEY = "wallet_active_network";

export function getAllNetworks(): NetworkConfig[] {
  return NETWORKS;
}

export function getNetworkByKey(key?: string | null): NetworkConfig {
  if (!key) return NETWORKS[0];
  return NETWORKS.find((n) => n.key === key) || NETWORKS[0];
}

export function getNetworkById(id?: string | null): NetworkConfig {
  if (!id) return NETWORKS[0];
  return NETWORKS.find((n) => n.id === id) || NETWORKS[0];
}

export function getNetworkByChainId(chainId?: number | null): NetworkConfig {
  if (!chainId) return NETWORKS[0];
  return NETWORKS.find((n) => n.chainId === chainId) || NETWORKS[0];
}

export function getActiveNetwork(): NetworkConfig {
  const saved =
    typeof window !== "undefined"
      ? localStorage.getItem(ACTIVE_NETWORK_KEY)
      : null;

  return getNetworkByKey(saved || DEFAULT_NETWORK_KEY);
}

export function setActiveNetwork(key: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_NETWORK_KEY, key);
}

export function getRpcUrls(networkKey?: string): string[] {
  return getNetworkByKey(networkKey).rpcUrls;
}

export function getPrimaryRpcUrl(networkKey?: string): string {
  return getRpcUrls(networkKey)[0];
}

export function getFallbackRpcUrl(networkKey?: string): string {
  return getRpcUrls(networkKey)[1] || getRpcUrls(networkKey)[0];
}
