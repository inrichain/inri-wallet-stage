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

export const DEFAULT_NETWORKS: NetworkItem[] = [
  {
    key: "inri",
    name: "INRI",
    chainId: 3777,
    symbol: "INRI",
    rpcUrl: "https://rpc.inri.life",
    explorerAddressUrl: "https://explorer.inri.life/address/",
    explorerTxUrl: "https://explorer.inri.life/tx/",
    logo: "/network-inri.svg",
  },
  {
    key: "polygon",
    name: "Polygon",
    chainId: 137,
    symbol: "POL",
    rpcUrl: "https://polygon-rpc.com",
    explorerAddressUrl: "https://polygonscan.com/address/",
    explorerTxUrl: "https://polygonscan.com/tx/",
    logo: "/network-polygon.svg",
  },
  {
    key: "ethereum",
    name: "Ethereum",
    chainId: 1,
    symbol: "ETH",
    rpcUrl: "https://cloudflare-eth.com",
    explorerAddressUrl: "https://etherscan.io/address/",
    explorerTxUrl: "https://etherscan.io/tx/",
    logo: "/network-ethereum.svg",
  },
  {
    key: "bsc",
    name: "BNB Chain",
    chainId: 56,
    symbol: "BNB",
    rpcUrl: "https://bsc-dataseed.binance.org",
    explorerAddressUrl: "https://bscscan.com/address/",
    explorerTxUrl: "https://bscscan.com/tx/",
    logo: "/network-bnb.svg",
  },
  {
    key: "arbitrum",
    name: "Arbitrum",
    chainId: 42161,
    symbol: "ETH",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerAddressUrl: "https://arbiscan.io/address/",
    explorerTxUrl: "https://arbiscan.io/tx/",
    logo: "/network-arbitrum.svg",
  },
  {
    key: "optimism",
    name: "Optimism",
    chainId: 10,
    symbol: "ETH",
    rpcUrl: "https://mainnet.optimism.io",
    explorerAddressUrl: "https://optimistic.etherscan.io/address/",
    explorerTxUrl: "https://optimistic.etherscan.io/tx/",
    logo: "/network-optimism.svg",
  },
];

export function getStoredNetwork(): NetworkItem {
  try {
    const raw = localStorage.getItem(NETWORKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as NetworkItem;
      if (parsed && parsed.name && parsed.chainId) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_NETWORKS[0];
}

export function saveStoredNetwork(network: NetworkItem) {
  localStorage.setItem(NETWORKS_KEY, JSON.stringify(network));
  window.dispatchEvent(new Event("wallet-network-updated"));
}
