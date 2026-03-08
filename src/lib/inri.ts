import { ethers } from "ethers";
import {
  ACTIVE_NETWORK_KEY,
  DEFAULT_NETWORK_ID,
  NetworkConfig,
  getNetworkById,
  normalizeRpcUrl,
} from "./networks";

const BASE = "/inri-wallet-stage/";

export const CHAIN_ID = 3777;
export const CUSTOM_TOKENS_KEY = "wallet_custom_tokens";

export type TokenItem = {
  symbol: string;
  subtitle: string;
  logo: string;
  isDefault: boolean;
  isNative?: boolean;
  address?: string;
  decimals?: number;
  name?: string;
  networkId?: string;
};

export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

export function getActiveNetworkId() {
  return localStorage.getItem(ACTIVE_NETWORK_KEY) || DEFAULT_NETWORK_ID;
}

export function setActiveNetworkId(networkId: string) {
  localStorage.setItem(ACTIVE_NETWORK_KEY, networkId);
}

export function getNetworkProvider(network: NetworkConfig, rpcUrl?: string) {
  const target = normalizeRpcUrl(rpcUrl || network.rpcUrls[0] || "");
  return new ethers.JsonRpcProvider(target, {
    name: network.name,
    chainId: network.chainId,
  });
}

export async function withRpcFallback<T>(
  network: NetworkConfig,
  fn: (active: ethers.JsonRpcProvider, rpcUrl: string) => Promise<T>
) {
  let lastError: unknown;

  for (const rpcUrl of network.rpcUrls) {
    const safeUrl = normalizeRpcUrl(rpcUrl);
    try {
      const provider = getNetworkProvider(network, safeUrl);
      return await fn(provider, safeUrl);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("RPC unavailable");
}

export function getDefaultTokens(networkId?: string): TokenItem[] {
  const network = getNetworkById(networkId || getActiveNetworkId());

  return network.knownTokens.map((token) => ({
    symbol: token.symbol,
    subtitle: token.subtitle || token.name,
    logo: token.logo,
    isDefault: true,
    isNative: token.isNative,
    address: token.address,
    decimals: token.decimals,
    name: token.name,
    networkId: network.id,
  }));
}

export async function getNativeBalance(address: string, networkId?: string) {
  if (!address) return "0.000000";
  const network = getNetworkById(networkId || getActiveNetworkId());

  try {
    const raw = await withRpcFallback(network, async (provider) => provider.getBalance(address));
    return Number(ethers.formatUnits(raw, network.nativeCurrency.decimals)).toFixed(6);
  } catch {
    return "0.000000";
  }
}

export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  decimals = 18,
  networkId?: string
) {
  if (!tokenAddress || !walletAddress) return "0.000000";
  const network = getNetworkById(networkId || getActiveNetworkId());

  try {
    const raw = await withRpcFallback(network, async (provider) => {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      return contract.balanceOf(walletAddress);
    });
    return Number(ethers.formatUnits(raw, decimals)).toFixed(6);
  } catch {
    return "0.000000";
  }
}

export async function readTokenMetadata(tokenAddress: string, networkId?: string): Promise<TokenItem> {
  const cleanAddress = ethers.getAddress(tokenAddress.trim());
  const network = getNetworkById(networkId || getActiveNetworkId());

  return await withRpcFallback(network, async (provider) => {
    const contract = new ethers.Contract(cleanAddress, ERC20_ABI, provider);
    const [name, symbol, decimals] = await Promise.all([
      contract.name().catch(() => "Token"),
      contract.symbol().catch(() => "TKN"),
      contract.decimals().catch(() => 18),
    ]);

    return {
      symbol: String(symbol || "TKN").toUpperCase(),
      name: String(name || symbol || "Token"),
      subtitle: `token • ${cleanAddress.slice(0, 6)}...${cleanAddress.slice(-4)}`,
      logo: BASE + "token-inri.png",
      isDefault: false,
      address: cleanAddress,
      decimals: Number(decimals) || 18,
      networkId: network.id,
    };
  });
}

export async function discoverKnownTokens(
  address: string,
  extraCandidates: TokenItem[] = [],
  networkId?: string
) {
  if (!address) return [] as TokenItem[];

  const network = getNetworkById(networkId || getActiveNetworkId());
  const merged = dedupeTokens([...getDefaultTokens(network.id), ...extraCandidates]).filter(
    (item) => item.networkId === network.id && !item.isNative && item.address
  );

  const hits = await Promise.all(
    merged.map(async (token) => {
      try {
        const balance = await getTokenBalance(token.address || "", address, token.decimals || 18, network.id);
        const numeric = Number(balance);
        if (Number.isFinite(numeric) && numeric > 0) {
          return token;
        }
        return null;
      } catch {
        return null;
      }
    })
  );

  return hits.filter(Boolean) as TokenItem[];
}

export function dedupeTokens(tokens: TokenItem[]) {
  const map = new Map<string, TokenItem>();

  for (const token of tokens) {
    const key = `${token.networkId || getActiveNetworkId()}:${token.address ? token.address.toLowerCase() : token.symbol.toUpperCase()}`;
    if (!map.has(key)) map.set(key, token);
  }

  return Array.from(map.values());
}

export function getStoredCustomTokens(): TokenItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TOKENS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function storeCustomTokens(tokens: TokenItem[]) {
  localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(tokens));
}

export async function loadAllBalances(address: string, tokens: TokenItem[], networkId?: string) {
  const balances: Record<string, string> = {};
  const network = getNetworkById(networkId || getActiveNetworkId());

  const scopedTokens = tokens.filter((token) => (token.networkId || network.id) === network.id);

  if (!address) {
    for (const token of scopedTokens) {
      balances[token.symbol] = "0.000000";
    }
    return balances;
  }

  balances[network.nativeCurrency.symbol] = await getNativeBalance(address, network.id);

  await Promise.all(
    scopedTokens.map(async (token) => {
      if (token.isNative) return;
      if (!token.address) {
        balances[token.symbol] = "0.000000";
        return;
      }
      balances[token.symbol] = await getTokenBalance(
        token.address,
        address,
        token.decimals || 18,
        network.id
      );
    })
  );

  return balances;
}

export function formatTokenAmount(raw: string) {
  const num = Number(raw || 0);
  if (!Number.isFinite(num)) return "0";
  if (num === 0) return "0";
  if (num < 0.0001) return num.toFixed(8);
  if (num < 1) return num.toFixed(4);
  if (num < 1000) return num.toFixed(3);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function shortAddress(value: string) {
  if (!value) return "";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function normalizeSeed(seed: string) {
  return seed
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .join(" ");
}

export function isValidSeedPhrase(seed: string) {
  try {
    ethers.Mnemonic.fromPhrase(normalizeSeed(seed));
    return true;
  } catch {
    return false;
  }
}

export function getMnemonicFromWallet(wallet: any) {
  const phrase = wallet?.mnemonic?.phrase || wallet?.mnemonic?.mnemonic || "";
  return typeof phrase === "string" ? phrase : "";
}
