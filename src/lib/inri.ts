import { ethers } from "ethers";
import {
  NETWORKS,
  DEFAULT_NETWORK_ID,
  getActiveNetwork,
  getNetworkById,
  getPrimaryRpcUrl,
  getFallbackRpcUrl,
} from "./networks";

const BASE = "/inri-wallet-stage/";

export type TokenItem = {
  symbol: string;
  name: string;
  subtitle?: string;
  address?: string;
  decimals: number;
  logo?: string;
  isNative?: boolean;
  networkId?: string;
  isDefault?: boolean;
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
    subtitle: "INRI native asset",
    decimals: 18,
    isNative: true,
    isDefault: true,
    logo: `${BASE}token-inri.png`,
    networkId: "inri",
  },
  {
    symbol: "WINRI",
    name: "Wrapped INRI",
    subtitle: "Wrapped INRI",
    decimals: 18,
    isDefault: true,
    logo: `${BASE}token-winri.png`,
    networkId: "inri",
  },
  {
    symbol: "iUSD",
    name: "iUSD",
    subtitle: "INRI stable asset",
    address: "0x116b2fF23e062A52E2c0ea12dF7e2638b62Fa0FC",
    decimals: 18,
    isDefault: true,
    logo: `${BASE}token-iusd.png`,
    networkId: "inri",
  },
  {
    symbol: "DNR",
    name: "DNR",
    subtitle: "DNR token",
    decimals: 18,
    isDefault: true,
    logo: `${BASE}token-dnr.png`,
    networkId: "inri",
  },
  {
    symbol: "ETH",
    name: "Ether",
    subtitle: "Ethereum native asset",
    decimals: 18,
    isNative: true,
    isDefault: true,
    logo: `${BASE}token-eth.png`,
    networkId: "ethereum",
  },
  {
    symbol: "POL",
    name: "Polygon",
    subtitle: "Polygon native asset",
    decimals: 18,
    isNative: true,
    isDefault: true,
    logo: `${BASE}token-pol.png`,
    networkId: "polygon",
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    subtitle: "Stablecoin",
    decimals: 6,
    isDefault: true,
    logo: `${BASE}token-usdt.png`,
    networkId: "polygon",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    subtitle: "Stablecoin",
    decimals: 6,
    isDefault: true,
    logo: `${BASE}token-usdc.png`,
    networkId: "polygon",
  },
  {
    symbol: "BNB",
    name: "BNB",
    subtitle: "BNB native asset",
    decimals: 18,
    isNative: true,
    isDefault: true,
    logo: `${BASE}token-bnb.png`,
    networkId: "bsc",
  },
  {
    symbol: "ETH",
    name: "Ether",
    subtitle: "Arbitrum native asset",
    decimals: 18,
    isNative: true,
    isDefault: true,
    logo: `${BASE}token-eth.png`,
    networkId: "arbitrum",
  },
  {
    symbol: "ETH",
    name: "Ether",
    subtitle: "Base native asset",
    decimals: 18,
    isNative: true,
    isDefault: true,
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

function makeProvider(url: string, networkId?: string) {
  const network = getNetworkById(networkId || getActiveNetwork().id);
  return new ethers.JsonRpcProvider(url, {
    name: network.name,
    chainId: network.chainId,
  });
}

export async function withRpcFallback<T>(
  networkOrId: any,
  callback: (provider: ethers.JsonRpcProvider, rpcUrl: string) => Promise<T>
): Promise<T> {
  const network =
    typeof networkOrId === "string" ? getNetworkById(networkOrId) : networkOrId;

  const urls = network?.rpcUrls?.length
    ? network.rpcUrls
    : [getPrimaryRpcUrl(network?.id), getFallbackRpcUrl(network?.id)];

  let lastError: unknown;

  for (const rpcUrl of urls) {
    try {
      const provider = makeProvider(rpcUrl, network.id);
      await provider.getBlockNumber();
      return await callback(provider, rpcUrl);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("No healthy RPC available");
}

export async function getHealthyProvider(networkId?: string) {
  const network = getNetworkById(networkId || DEFAULT_NETWORK_ID);
  return withRpcFallback(network, async (provider) => provider);
}

export function getKnownTokens(networkId?: string): TokenItem[] {
  const activeId = networkId || getActiveNetwork().id;
  const network = getNetworkById(activeId);

  const nativeToken: TokenItem = {
    symbol: network.nativeCurrency.symbol,
    name: network.nativeCurrency.name,
    subtitle: `${network.name} native asset`,
    decimals: network.nativeCurrency.decimals,
    isNative: true,
    isDefault: true,
    logo: network.icon,
    networkId: network.id,
  };

  const filtered = KNOWN_TOKENS.filter((token) => token.networkId === activeId);
  const hasNative = filtered.some((t) => t.isNative);

  return hasNative ? filtered : [nativeToken, ...filtered];
}

export function getDefaultTokens(networkId?: string): TokenItem[] {
  return getKnownTokens(networkId);
}

export function formatTokenAmount(value: string | number, decimals = 6) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  if (n === 0) return "0";
  if (n < 0.000001) return n.toFixed(8);
  if (n < 1) return n.toFixed(6);
  if (n < 1000) return n.toFixed(Math.min(decimals, 6));
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function getReceiveUri(networkId: string, address: string) {
  if (!address) return "";
  const network = getNetworkById(networkId || getActiveNetwork().id);
  return `ethereum:${address}@${network.chainId}`;
}

export async function getNativeBalance(
  networkId: string,
  address: string
): Promise<string> {
  if (!address) return "0.000000";

  try {
    const network = getNetworkById(networkId || DEFAULT_NETWORK_ID);
    return await withRpcFallback(network, async (provider) => {
      const bal = await provider.getBalance(address);
      return formatFixed(ethers.formatEther(bal));
    });
  } catch {
    return "0.000000";
  }
}

export async function readTokenBalance(
  networkId: string,
  address: string,
  token: TokenItem
): Promise<string> {
  if (!address) return "0.000000";

  try {
    const network = getNetworkById(networkId || DEFAULT_NETWORK_ID);

    return await withRpcFallback(network, async (provider) => {
      if (token.isNative || !token.address) {
        const bal = await provider.getBalance(address);
        return formatFixed(
          ethers.formatUnits(bal, token.decimals || network.nativeCurrency.decimals)
        );
      }

      const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
      const [rawBalance, decimals] = await Promise.all([
        contract.balanceOf(address),
        contract.decimals().catch(() => token.decimals || 18),
      ]);

      return formatFixed(ethers.formatUnits(rawBalance, Number(decimals)));
    });
  } catch {
    return "0.000000";
  }
}

export async function loadAllBalances(
  networkId: string,
  address: string,
  tokens?: TokenItem[]
): Promise<Record<string, string>> {
  const known = tokens && tokens.length ? tokens : getKnownTokens(networkId);
  const out: Record<string, string> = {};

  for (const token of known) {
    try {
      const key = `${token.symbol}${token.address ? `:${token.address}` : ""}`;
      const value = await readTokenBalance(networkId, address, token);
      out[token.symbol] = value;
      out[key] = value;
    } catch {
      out[token.symbol] = "0.000000";
    }
  }

  return out;
}

export async function detectWalletTokens(
  networkId: string,
  address: string
): Promise<TokenItem[]> {
  const known = getKnownTokens(networkId);
  const balances = await loadAllBalances(networkId, address, known);

  return known.filter((token) => {
    const raw = balances[token.symbol] || "0";
    return Number(raw) > 0;
  });
}

export async function autoDetectKnownTokens(
  networkId: string,
  address: string
): Promise<TokenItem[]> {
  return detectWalletTokens(networkId, address);
}

export function getAvailableNetworks() {
  return NETWORKS;
}

function formatFixed(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.000000";
  return n.toFixed(6);
}
