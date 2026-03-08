export type NativeCurrency = {
  name: string;
  symbol: string;
  decimals: number;
};

export type KnownToken = {
  symbol: string;
  name: string;
  address?: string;
  decimals: number;
  logo: string;
  isNative?: boolean;
  subtitle?: string;
};

export type NetworkConfig = {
  id: string;
  name: string;
  chainId: number;
  rpcUrls: string[];
  blockExplorerUrl: string;
  nativeCurrency: NativeCurrency;
  icon: string;
  enabled: boolean;
  bridgeGroup?: string;
  knownTokens: KnownToken[];
};

const BASE = "/inri-wallet-stage/";

export const NETWORKS: NetworkConfig[] = [
  {
    id: "inri",
    name: "INRI Chain",
    chainId: 3777,
    rpcUrls: ["https://rpc.inri.life", "https://rpc-chain.inri.life"],
    blockExplorerUrl: "https://explorer.inri.life",
    nativeCurrency: { name: "INRI", symbol: "INRI", decimals: 18 },
    icon: BASE + "token-inri.png",
    enabled: true,
    bridgeGroup: "inri-polygon",
    knownTokens: [
      {
        symbol: "INRI",
        name: "INRI",
        decimals: 18,
        logo: BASE + "token-inri.png",
        isNative: true,
        subtitle: "Native coin",
      },
      {
        symbol: "iUSD",
        name: "iUSD",
        address: "0x116b2fF23e062A52E2c0ea12dF7e2638b62Fa0FC",
        decimals: 18,
        logo: BASE + "token-iusd.png",
        subtitle: "Stable token",
      },
      {
        symbol: "wINRI",
        name: "Wrapped INRI",
        address: "0x8731F1709745173470821eAeEd9BC600EEC9A3D1",
        decimals: 18,
        logo: BASE + "token-winri.png",
        subtitle: "Wrapped INRI",
      },
      {
        symbol: "DNR",
        name: "Dinar",
        address: "0xDa9541bB01d9EC1991328516C71B0E539a97d27f",
        decimals: 18,
        logo: BASE + "token-dnr.png",
        subtitle: "Dinar token",
      },
    ],
  },
  {
    id: "polygon",
    name: "Polygon",
    chainId: 137,
    rpcUrls: ["https://polygon-rpc.com", "https://rpc.ankr.com/polygon"],
    blockExplorerUrl: "https://polygonscan.com",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    icon: BASE + "token-iusd.png",
    enabled: true,
    bridgeGroup: "inri-polygon",
    knownTokens: [
      {
        symbol: "POL",
        name: "POL",
        decimals: 18,
        logo: BASE + "token-iusd.png",
        isNative: true,
        subtitle: "Native coin",
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        decimals: 6,
        logo: BASE + "token-iusd.png",
        subtitle: "Stablecoin",
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
        decimals: 6,
        logo: BASE + "token-iusd.png",
        subtitle: "Stablecoin",
      },
    ],
  },
  {
    id: "ethereum",
    name: "Ethereum",
    chainId: 1,
    rpcUrls: ["https://ethereum.publicnode.com", "https://rpc.ankr.com/eth"],
    blockExplorerUrl: "https://etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    icon: BASE + "token-inri.png",
    enabled: true,
    knownTokens: [
      {
        symbol: "ETH",
        name: "Ether",
        decimals: 18,
        logo: BASE + "token-inri.png",
        isNative: true,
        subtitle: "Native coin",
      },
    ],
  },
  {
    id: "bnb",
    name: "BNB Smart Chain",
    chainId: 56,
    rpcUrls: ["https://bsc-dataseed.binance.org", "https://rpc.ankr.com/bsc"],
    blockExplorerUrl: "https://bscscan.com",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    icon: BASE + "token-dnr.png",
    enabled: true,
    knownTokens: [
      {
        symbol: "BNB",
        name: "BNB",
        decimals: 18,
        logo: BASE + "token-dnr.png",
        isNative: true,
        subtitle: "Native coin",
      },
    ],
  },
  {
    id: "arbitrum",
    name: "Arbitrum One",
    chainId: 42161,
    rpcUrls: ["https://arb1.arbitrum.io/rpc", "https://rpc.ankr.com/arbitrum"],
    blockExplorerUrl: "https://arbiscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    icon: BASE + "token-inri.png",
    enabled: true,
    knownTokens: [
      {
        symbol: "ETH",
        name: "Ether",
        decimals: 18,
        logo: BASE + "token-inri.png",
        isNative: true,
        subtitle: "Native coin",
      },
    ],
  },
  {
    id: "base",
    name: "Base",
    chainId: 8453,
    rpcUrls: ["https://mainnet.base.org", "https://base-rpc.publicnode.com"],
    blockExplorerUrl: "https://basescan.org",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    icon: BASE + "token-inri.png",
    enabled: true,
    knownTokens: [
      {
        symbol: "ETH",
        name: "Ether",
        decimals: 18,
        logo: BASE + "token-inri.png",
        isNative: true,
        subtitle: "Native coin",
      },
    ],
  },
];

export const DEFAULT_NETWORK_ID = "inri";
export const ACTIVE_NETWORK_KEY = "wallet_active_network";

export function getNetworkById(id?: string | null) {
  return NETWORKS.find((network) => network.id === id) || NETWORKS.find((network) => network.id === DEFAULT_NETWORK_ID)!;
}

export function getEnabledNetworks() {
  return NETWORKS.filter((network) => network.enabled);
}

export function getBridgeTargets(currentId: string) {
  const current = getNetworkById(currentId);
  if (!current.bridgeGroup) return [];
  return NETWORKS.filter((network) => network.bridgeGroup === current.bridgeGroup && network.id !== current.id);
}

export function normalizeRpcUrl(input: string) {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
