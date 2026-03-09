import { ethers } from "ethers";
import {
  NETWORKS,
  getActiveNetwork,
  getNetworkById,
  getPrimaryRpcUrl,
  getFallbackRpcUrl,
} from "./networks";

const BASE = "/inri-wallet-stage/";

export type TokenItem = {
  symbol: string;
  name: string;
  address?: string;
  decimals: number;
  logo?: string;
  isNative?: boolean;
  networkId?: string;
};

export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
];

export const KNOWN_TOKENS: TokenItem[] = [
  {
    symbol: "INRI",
    name: "INRI",
    decimals: 18,
    isNative: true,
    logo: `${BASE}token-inri.png`,
    networkId: "inri",
  },
  {
    symbol: "iUSD",
    name: "iUSD",
    address: "0x116b2fF23e062A52E2c0ea12dF7e2638b62Fa0FC",
    decimals: 18,
    logo: `${BASE}token-iusd.png`,
    networkId: "inri",
  },
  {
    symbol: "DNR",
    name: "DNR",
    decimals: 18,
    logo: `${BASE}token-dnr.png`,
    networkId: "inri",
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    logo: `${BASE}token-usdt.png`,
    networkId: "polygon",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logo: `${BASE}token-usdc.png`,
    networkId: "polygon",
  },
  {
    symbol: "ETH",
    name: "Ether",
    decimals: 18,
    isNative: true,
    logo: `${BASE}token-eth.png`,
    networkId: "ethereum",
  },
  {
    symbol: "MATIC",
    name: "Polygon",
    decimals: 18,
    isNative: true,
    logo: `${BASE}token-matic.png`,
    networkId: "polygon",
  },
  {
    symbol: "BNB",
    name: "BNB",
    decimals: 18,
    isNative: true,
    logo: `${BASE}token-bnb.png`,
    networkId: "bsc",
  },
  {
    symbol: "ETH",
    name: "Ether",
    decimals: 18,
    isNative: true,
    logo: `${BASE}token-eth.png`,
    networkId: "arbitrum",
  },
  {
    symbol: "ETH",
    name: "Ether",
    decimals: 18,
    isNative: true,
    logo: `${BASE}token-eth.png`,
    networkId: "base",
  },
];

export function normalizeSeed(seed: string) {
  return seed.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isValidSeedPhrase(seed: string) {
  try {
    ethers.Wallet.fromPhrase(normalizeSeed(seed));
    return true;
  } catch {
    return false;
  }
}

export function shortAddress(address: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getMnemonicFromWallet(wallet: ethers.HDNodeWallet | ethers.Wallet) {
  const anyWallet = wallet as any;
  return anyWallet?.mnemonic?.phrase || "";
}

export function getKnownTokens(networkId?: string): TokenItem[] {
  const active = networkId || getActiveNetwork().id;
  const network = getNetworkById(active);

  const nativeToken: TokenItem = {
    symbol: network.symbol,
    name: network.name,
    decimals: 18,
    isNative: true,
    logo: network.logo,
    networkId: network.id,
  };

  const filtered = KNOWN_TOKENS.filter((token) => token.networkId === active);
  const hasNativeAlready = filtered.some((t) => t.isNative);

  if (hasNativeAlready) return filtered;
  return [nativeToken, ...filtered];
}

export function getReceiveUri(address: string, networkId?: string) {
  if (!address) return "";
  const network = getNetworkById(networkId || getActiveNetwork().id);
  return `ethereum:${address}@${network.chainId}`;
}

function makeProvider(url: string, networkId?: string) {
  const network = getNetworkById(networkId || getActiveNetwork().id);
  return new ethers.JsonRpcProvider(url, {
    name: network.name,
    chainId: network.chainId,
  });
}

export async function getHealthyProvider(networkId?: string) {
  const primary = getPrimaryRpcUrl(networkId);
  const fallback = getFallbackRpcUrl(networkId);

  try {
    const p = makeProvider(primary, networkId);
    await p.getBlockNumber();
    return p;
  } catch {
    const p = makeProvider(fallback, networkId);
    await p.getBlockNumber();
    return p;
  }
}

export async function getNativeBalance(address: string, networkId?: string) {
  if (!address) return "0.000000";

  try {
    const provider = await getHealthyProvider(networkId);
    const bal = await provider.getBalance(address);
    return formatBalance(ethers.formatEther(bal));
  } catch {
    return "0.000000";
  }
}

export async function readTokenBalance(
  address: string,
  token: TokenItem,
  networkId?: string
) {
  if (!address) return "0.000000";

  try {
    const provider = await getHealthyProvider(networkId);

    if (token.isNative || !token.address) {
      const bal = await provider.getBalance(address);
      return formatBalance(ethers.formatEther(bal));
    }

    const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
    const [rawBalance, decimals] = await Promise.all([
      contract.balanceOf(address),
      contract.decimals().catch(() => token.decimals || 18),
    ]);

    return formatBalance(ethers.formatUnits(rawBalance, Number(decimals)));
  } catch {
    return "0.000000";
  }
}

export async function loadAllBalances(
  address: string,
  tokens?: TokenItem[],
  networkId?: string
) {
  const known = tokens && tokens.length ? tokens : getKnownTokens(networkId);
  const out: Record<string, string> = {};

  for (const token of known) {
    try {
      out[token.symbol] = await readTokenBalance(address, token, networkId);
    } catch {
      out[token.symbol] = "0.000000";
    }
  }

  return out;
}

export async function detectWalletTokens(
  address: string,
  networkId?: string
): Promise<TokenItem[]> {
  const known = getKnownTokens(networkId);
  const balances = await loadAllBalances(address, known, networkId);

  return known.filter((token) => {
    const raw = balances[token.symbol] || "0";
    return Number(raw) > 0;
  });
}

export function getNetworkLogo(networkId?: string) {
  return getNetworkById(networkId || getActiveNetwork().id).logo;
}

export function getNetworkSymbol(networkId?: string) {
  return getNetworkById(networkId || getActiveNetwork().id).symbol;
}

export function getExplorerUrl(networkId?: string) {
  return getNetworkById(networkId || getActiveNetwork().id).explorerUrl;
}

export function getAvailableNetworks() {
  return NETWORKS;
}

function formatBalance(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.000000";
  return n.toFixed(6);
}
