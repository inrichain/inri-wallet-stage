export type NetworkConfig = {
  key: string;
  id: string;
  name: string;
  chainId: number;
  rpcUrls: string[];
  explorerUrl: string;
  symbol: string;
  nativeSymbol: string;
  logo: string;
  icon: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isTestnet?: boolean;
  bridgeTargets?: string[];
};

const BASE = "/inri-wallet-stage/";

export const DEFAULT_NETWORK_ID = "inri";
export const ACTIVE_NETWORK_KEY = "wallet_active_network";

export const NETWORKS: NetworkConfig[] = [
  {
    key: "inri",
    id: "inri",
    name: "INRI CHAIN",
    chainId: 3777,
    rpcUrls: ["https://rpc.inri.life", "https://rpc-chain.inri.life"],
    explorerUrl: "https://explorer.inri.life",
    symbol: "INRI",
    nativeSymbol: "INRI",
    logo: `${BASE}net-inri.png`,
    icon: `${BASE}net-inri.png`,
    nativeCurrency: {
      name: "INRI",
      symbol: "INRI",
      decimals: 18,
    },
    bridgeTargets: ["polygon", "ethereum", "bsc", "arbitrum", "base"],
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
    nativeSymbol: "ETH",
    logo: `${BASE}net-ethereum.png`,
    icon: `${BASE}net-ethereum.png`,
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    bridgeTargets: ["inri", "polygon", "arbitrum", "base"],
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
    nativeSymbol: "POL",
    logo: `${BASE}net-polygon.png`,
    icon: `${BASE}net-polygon.png`,
    nativeCurrency: {
      name: "POL",
      symbol: "POL",
      decimals: 18,
    },
    bridgeTargets: ["inri", "ethereum", "bsc", "arbitrum", "base"],
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
    nativeSymbol: "BNB",
    logo: `${BASE}net-bsc.png`,
    icon: `${BASE}net-bsc.png`,
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    bridgeTargets: ["inri", "polygon", "ethereum"],
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
    nativeSymbol: "ETH",
    logo: `${BASE}net-arbitrum.png`,
    icon: `${BASE}net-arbitrum.png`,
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    bridgeTargets: ["inri", "ethereum", "polygon", "base"],
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
    nativeSymbol: "ETH",
    logo: `${BASE}net-base.png`,
    icon: `${BASE}net-base.png`,
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    bridgeTargets: ["inri", "ethereum", "polygon", "arbitrum"],
  },
];

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

  return getNetworkById(saved || DEFAULT_NETWORK_ID);
}

export function setActiveNetwork(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_NETWORK_KEY, id);
}

export function getRpcUrls(networkId?: string): string[] {
  return getNetworkById(networkId).rpcUrls;
}

export function getPrimaryRpcUrl(networkId?: string): string {
  return getRpcUrls(networkId)[0];
}

export function getFallbackRpcUrl(networkId?: string): string {
  return getRpcUrls(networkId)[1] || getRpcUrls(networkId)[0];
}

export function getBridgeTargets(networkId?: string): NetworkConfig[] {
  const source = getNetworkById(networkId);
  const targetIds = source.bridgeTargets || [];
  return NETWORKS.filter((n) => targetIds.includes(n.id));
}
