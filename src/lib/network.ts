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
};

export const NETWORKS_KEY = "wallet_active_network";

function makeFallbackLogo(label: string, bg = "#16213b", fg = "#ffffff") {
  const initial = (label || "?").trim().slice(0, 1).toUpperCase() || "?";
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="32" fill="${bg}"/>
      <text x="32" y="39" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" font-weight="700" fill="${fg}">${initial}</text>
    </svg>
  `)}`;
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
  {
    key: "base",
    name: "Base",
    chainId: 8453,
    symbol: "ETH",
    rpcUrl: "https://mainnet.base.org",
    explorerAddressUrl: "https://basescan.org/address/",
    explorerTxUrl: "https://basescan.org/tx/",
    logo: makeFallbackLogo("B", "#0052ff"),
  },
  {
    key: "linea",
    name: "Linea",
    chainId: 59144,
    symbol: "ETH",
    rpcUrl: "https://rpc.linea.build",
    explorerAddressUrl: "https://lineascan.build/address/",
    explorerTxUrl: "https://lineascan.build/tx/",
    logo: makeFallbackLogo("L", "#1a1a1a"),
  },
  {
    key: "scroll",
    name: "Scroll",
    chainId: 534352,
    symbol: "ETH",
    rpcUrl: "https://rpc.scroll.io",
    explorerAddressUrl: "https://scrollscan.com/address/",
    explorerTxUrl: "https://scrollscan.com/tx/",
    logo: makeFallbackLogo("S", "#ffeeda", "#6b4a0b"),
  },
  {
    key: "celo",
    name: "Celo",
    chainId: 42220,
    symbol: "CELO",
    rpcUrl: "https://forno.celo.org",
    explorerAddressUrl: "https://celoscan.io/address/",
    explorerTxUrl: "https://celoscan.io/tx/",
    logo: makeFallbackLogo("C", "#35d07f", "#04210f"),
  },
  {
    key: "mode",
    name: "Mode",
    chainId: 34443,
    symbol: "ETH",
    rpcUrl: "https://mainnet.mode.network",
    explorerAddressUrl: "https://explorer.mode.network/address/",
    explorerTxUrl: "https://explorer.mode.network/tx/",
    logo: makeFallbackLogo("M", "#121212"),
  },
];

export function getNetworkByChainId(chainId: number | string) {
  return DEFAULT_NETWORKS.find((item) => item.chainId === Number(chainId)) || null;
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

function normalizeStoredNetwork(value: any): NetworkItem {
  const known = DEFAULT_NETWORKS.find((item) => item.key === value?.key || item.chainId === Number(value?.chainId));
  if (!known) {
    return {
      ...(value as NetworkItem),
      logo: value?.logo || makeFallbackLogo(value?.name || value?.symbol || String(value?.chainId || "?")),
    };
  }

  return {
    ...known,
    ...value,
    logo: value?.logo || known.logo,
  };
}

export function saveStoredNetwork(network: NetworkItem) {
  localStorage.setItem(NETWORKS_KEY, JSON.stringify(normalizeStoredNetwork(network)));
}
