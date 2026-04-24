import { ethers } from "ethers";
import { getAllNetworks, getStoredNetwork, type NetworkItem } from "./network";
import { resolveTokenAsset } from "./assets";

const BASE = import.meta.env.BASE_URL || "/";

export const RPC_URL = "https://rpc-chain.inri.life";
export const RPC_FALLBACK_URL = "https://rpc.inri.life";
export const CHAIN_ID = 3777;

export const EXPLORER_BASE_URL = "https://explorer.inri.life";
export const EXPLORER_ADDRESS_URL = "https://explorer.inri.life/address/";
export const EXPLORER_TX_URL = "https://explorer.inri.life/tx/";
export const EXPLORER_API_URL = "https://explorer.inri.life/api";

export type TokenItem = {
  symbol: string;
  subtitle: string;
  logo: string;
  isDefault: boolean;
  isNative?: boolean;
  address?: string;
  decimals?: number;
  networkKey?: string;
};

export type TokenMetadata = {
  name: string;
  symbol: string;
  decimals: number;
  logo: string;
};

const providerCache = new Map<string, ethers.JsonRpcProvider>();

const INRI_RPC_CANDIDATES = [
  RPC_URL,
  `${RPC_URL}/`,
  "https://rpc-chain.inri.life/rpc",
  "https://rpc-chain.inri.life/rpc/",
  RPC_FALLBACK_URL,
  `${RPC_FALLBACK_URL}/`,
];

function uniqueRpcUrls(urls: Array<string | undefined | null>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of urls) {
    const value = String(raw || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }

  return result;
}

function expandRpcUrlVariants(rawUrl?: string) {
  const clean = String(rawUrl || "").trim();
  if (!clean) return [] as string[];

  const withoutTrailingSlash = clean.replace(/\/+$/, "");
  const variants = [clean, withoutTrailingSlash, `${withoutTrailingSlash}/`];

  // Many INRI nginx setups expose geth behind /rpc as well. These hidden
  // variants make the wallet recover without changing the visible endpoint.
  if (!/\/rpc\/?$/i.test(withoutTrailingSlash)) {
    variants.push(`${withoutTrailingSlash}/rpc`, `${withoutTrailingSlash}/rpc/`);
  }

  return uniqueRpcUrls(variants);
}

export function normalizeNetworkKeyForTokens(networkKey?: string) {
  const raw = String(networkKey || "").trim();
  const lower = raw.toLowerCase();

  if (!raw) {
    try {
      const stored = getStoredNetwork();
      return Number(stored.chainId) === CHAIN_ID ? "inri" : stored.key;
    } catch {
      return "inri";
    }
  }

  if (lower === "inri" || lower === "3777" || lower === "chain-3777" || lower === "chain3777") return "inri";

  try {
    const known = getAllNetworks({ includeHidden: true }).find((item) => item.key === raw || String(item.chainId) === lower);
    if (Number(known?.chainId) === CHAIN_ID) return "inri";
  } catch {}

  return raw;
}

function isInriNetworkKey(networkKey?: string) {
  return normalizeNetworkKeyForTokens(networkKey) === "inri";
}

export function restoreDefaultInriTokensVisibility() {
  const key = "wallet_hidden_default_tokens_v1";

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    const protectedDefaultKeys = new Set(
      DEFAULT_TOKENS
        .filter((token) => normalizeNetworkKeyForTokens(token.networkKey) === "inri")
        .map((token) => `inri:${String(token.address || token.symbol || "").toLowerCase()}`)
    );

    const next = parsed.filter((item) => !protectedDefaultKeys.has(String(item)));
    if (next.length !== parsed.length) {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event("wallet-tokens-updated"));
    }
  } catch {}
}

export function getNetworkConfig(networkKey?: string): NetworkItem {
  const active = networkKey
    ? getAllNetworks().find((item) => item.key === networkKey)
    : getStoredNetwork();

  return active || getAllNetworks()[0] || getStoredNetwork();
}

export function getProvider(networkKey?: string) {
  const network = getNetworkConfig(networkKey);
  const cacheKey = `${network.key}:${network.rpcUrl}`;

  if (!providerCache.has(cacheKey)) {
    providerCache.set(
      cacheKey,
      new ethers.JsonRpcProvider(network.rpcUrl, {
        name: network.name,
        chainId: network.chainId,
      })
    );
  }

  return providerCache.get(cacheKey)!;
}

export const provider = getProvider("inri");
export const fallbackProvider = new ethers.JsonRpcProvider(RPC_FALLBACK_URL, {
  name: "INRI",
  chainId: CHAIN_ID,
});

export const DEFAULT_TOKENS: TokenItem[] = [
  {
    symbol: "INRI",
    subtitle: "native coin • pays gas",
    logo: `${BASE}token-inri.png`,
    isDefault: true,
    isNative: true,
    decimals: 18,
    networkKey: "inri",
  },
  {
    symbol: "iUSD",
    subtitle: "stable token",
    logo: `${BASE}token-iusd.png`,
    isDefault: true,
    address: "0x116b2fF23e062A52E2c0ea12dF7e2638b62Fa0FC",
    decimals: 6,
    networkKey: "inri",
  },
  {
    symbol: "WINRI",
    subtitle: "wrapped native token",
    logo: `${BASE}token-winri.png`,
    isDefault: true,
    address: "0x8731F1709745173470821eAeEd9BC600EEC9A3D1",
    decimals: 18,
    networkKey: "inri",
  },
  {
    symbol: "DNR",
    subtitle: "token",
    logo: `${BASE}token-dnr.png`,
    isDefault: true,
    address: "0xDa9541bB01d9EC1991328516C71B0E539a97d27f",
    decimals: 18,
    networkKey: "inri",
  },
  {
    symbol: "POL",
    subtitle: "native coin • pays gas",
    logo: `${BASE}network-polygon.png`,
    isDefault: true,
    isNative: true,
    decimals: 18,
    networkKey: "polygon",
  },
  {
    symbol: "ETH",
    subtitle: "native coin • pays gas",
    logo: `${BASE}network-ethereum.png`,
    isDefault: true,
    isNative: true,
    decimals: 18,
    networkKey: "ethereum",
  },
  {
    symbol: "BNB",
    subtitle: "native coin • pays gas",
    logo: `${BASE}network-bnb.png`,
    isDefault: true,
    isNative: true,
    decimals: 18,
    networkKey: "bsc",
  },
  {
    symbol: "AETH",
    subtitle: "native coin • pays gas",
    logo: `${BASE}network-arbitrum.png`,
    isDefault: true,
    isNative: true,
    decimals: 18,
    networkKey: "arbitrum",
  },
  {
    symbol: "OETH",
    subtitle: "native coin • pays gas",
    logo: `${BASE}network-optimism.png`,
    isDefault: true,
    isNative: true,
    decimals: 18,
    networkKey: "optimism",
  },
];

export function getDefaultTokensForNetwork(networkKey?: string) {
  const key = normalizeNetworkKeyForTokens(networkKey);
  return DEFAULT_TOKENS.filter((token) => normalizeNetworkKeyForTokens(token.networkKey) === key);
}

export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

const ERC20_STRING_FALLBACK_ABI = [
  "function name() view returns (bytes32)",
  "function symbol() view returns (bytes32)",
];

const ERC20_INTERFACE = new ethers.Interface(ERC20_ABI);
const ERC20_BYTES32_INTERFACE = new ethers.Interface(ERC20_STRING_FALLBACK_ABI);

function getRpcUrls(networkKey?: string) {
  const network = getNetworkConfig(networkKey);

  if (Number(network.chainId) === CHAIN_ID || isInriNetworkKey(network.key)) {
    return uniqueRpcUrls([
      ...expandRpcUrlVariants(network.rpcUrl),
      ...INRI_RPC_CANDIDATES,
    ]);
  }

  if (network.key === "ethereum") {
    return uniqueRpcUrls([
      ...expandRpcUrlVariants(network.rpcUrl),
      "https://ethereum-rpc.publicnode.com",
      "https://rpc.ankr.com/eth",
      "https://cloudflare-eth.com",
    ]);
  }

  return uniqueRpcUrls(expandRpcUrlVariants(network.rpcUrl));
}

export type RpcTestResult = {
  ok: boolean;
  chainId: number;
  url: string;
  expectedChainId: number;
};

async function rpcCall(url: string, method: string, params: any[]) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        // text/plain keeps the request simple and avoids many nginx/geth CORS
        // preflight failures that happen with application/json in mobile PWAs.
        "Content-Type": "text/plain;charset=UTF-8",
        Accept: "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await res.text();
    let data: any = null;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text || `HTTP ${res.status}`);
    }

    if (!res.ok) {
      throw new Error(data?.error?.message || `HTTP ${res.status}`);
    }

    if (data?.error) {
      throw new Error(data.error.message || "RPC error");
    }

    return data.result;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function testRpcEndpoint(url: string, expectedChainId = CHAIN_ID): Promise<RpcTestResult> {
  const candidates = uniqueRpcUrls(expandRpcUrlVariants(url));
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      const hex = String(await rpcCall(candidate, "eth_chainId", []));
      const got = hex ? Number.parseInt(hex, 16) : NaN;
      if (!Number.isFinite(got)) throw new Error("Invalid RPC response");
      return { ok: got === Number(expectedChainId), chainId: got, url: candidate, expectedChainId: Number(expectedChainId) };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("RPC unavailable");
}

async function tryRpcUrls(networkKey: string | undefined, method: string, params: any[]) {
  const urls = getRpcUrls(networkKey);
  let lastError: unknown;

  for (const url of urls) {
    try {
      return await rpcCall(url, method, params);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("RPC unavailable");
}

async function getNativeBalanceRaw(address: string, networkKey?: string) {
  const result = await tryRpcUrls(networkKey, "eth_getBalance", [address, "latest"]);
  return Number(ethers.formatEther(result)).toFixed(6);
}

export async function getNativeBalance(address: string, networkKey?: string) {
  if (!address) return "0.000000";

  try {
    return await getNativeBalanceRaw(address, networkKey);
  } catch {
    try {
      const raw = await getProvider(networkKey).getBalance(address);
      return Number(ethers.formatEther(raw)).toFixed(6);
    } catch {
      return "0.000000";
    }
  }
}

async function getTokenBalanceWithProvider(
  activeProvider: ethers.JsonRpcProvider,
  tokenAddress: string,
  walletAddress: string,
  decimals = 18
) {
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, activeProvider);
  const raw = await contract.balanceOf(walletAddress);
  return Number(ethers.formatUnits(raw, decimals)).toFixed(6);
}

async function ethCallRaw(networkKey: string | undefined, to: string, data: string) {
  return await tryRpcUrls(networkKey, "eth_call", [{ to, data }, "latest"]);
}

async function getTokenBalanceRaw(
  tokenAddress: string,
  walletAddress: string,
  decimals = 18,
  networkKey?: string
) {
  const data = ERC20_INTERFACE.encodeFunctionData("balanceOf", [walletAddress]);
  const result = await ethCallRaw(networkKey, tokenAddress, data);
  if (!result || result === "0x") return "0.000000";
  return Number(ethers.formatUnits(result, decimals)).toFixed(6);
}

export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  decimals = 18,
  networkKey?: string
) {
  if (!tokenAddress || !walletAddress) return "0.000000";

  try {
    return await getTokenBalanceRaw(tokenAddress, walletAddress, decimals, networkKey);
  } catch {
    try {
      return await getTokenBalanceWithProvider(
        getProvider(networkKey),
        tokenAddress,
        walletAddress,
        decimals
      );
    } catch {
      return "0.000000";
    }
  }
}

function guessTokenLogo(symbol: string, networkKey?: string, name?: string) {
  return resolveTokenAsset({ symbol, networkKey, name });
}

function parseBytes32Text(value: string) {
  try {
    return ethers.decodeBytes32String(value).trim();
  } catch {
    return "";
  }
}

async function resolveTokenMetadataWithProvider(
  providerLike: ethers.JsonRpcProvider,
  tokenAddress: string
): Promise<TokenMetadata> {
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, providerLike);

  try {
    const [name, symbol, decimals] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
    ]);

    const finalSymbol = String(symbol || "TOKEN").trim().toUpperCase();

    return {
      name: String(name || symbol || "Token"),
      symbol: finalSymbol,
      decimals: Number(decimals),
      logo: guessTokenLogo(finalSymbol, undefined, String(name || symbol || "Token")),
    };
  } catch {
    const fallbackContract = new ethers.Contract(tokenAddress, ERC20_STRING_FALLBACK_ABI, providerLike);
    const decimals = await contract.decimals().catch(() => 18);
    const [rawName, rawSymbol] = await Promise.all([
      fallbackContract.name().catch(() => ""),
      fallbackContract.symbol().catch(() => ""),
    ]);

    const name = parseBytes32Text(String(rawName)) || "Token";
    const symbol = (parseBytes32Text(String(rawSymbol)) || "TOKEN").toUpperCase();

    return {
      name,
      symbol,
      decimals: Number(decimals),
      logo: guessTokenLogo(symbol, undefined, name),
    };
  }
}

async function resolveTokenMetadataRaw(
  tokenAddress: string,
  networkKey?: string
): Promise<TokenMetadata> {
  const call = async (method: "name" | "symbol" | "decimals") => {
    const data = ERC20_INTERFACE.encodeFunctionData(method, []);
    return await ethCallRaw(networkKey, tokenAddress, data);
  };

  const decodeString = (method: "name" | "symbol", result: string) => {
    try {
      return String(ERC20_INTERFACE.decodeFunctionResult(method, result)?.[0] || "").trim();
    } catch {
      try {
        const decoded = ERC20_BYTES32_INTERFACE.decodeFunctionResult(method, result)?.[0];
        return parseBytes32Text(String(decoded || ""));
      } catch {
        return "";
      }
    }
  };

  const [rawName, rawSymbol, rawDecimals] = await Promise.all([
    call("name").catch(() => ""),
    call("symbol").catch(() => ""),
    call("decimals").catch(() => ""),
  ]);

  let decimals = 18;
  try {
    decimals = Number(ERC20_INTERFACE.decodeFunctionResult("decimals", rawDecimals)?.[0] ?? 18);
  } catch {}

  const symbol = (decodeString("symbol", rawSymbol) || "TOKEN").toUpperCase();
  const name = decodeString("name", rawName) || symbol || "Token";

  return {
    name,
    symbol,
    decimals,
    logo: guessTokenLogo(symbol, networkKey, name),
  };
}

export async function resolveTokenMetadata(
  tokenAddress: string,
  networkKey?: string
): Promise<TokenMetadata> {
  const cleanAddress = tokenAddress.trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
    throw new Error("Invalid token address");
  }

  let lastError: unknown;

  try {
    return await resolveTokenMetadataRaw(cleanAddress, networkKey);
  } catch (error) {
    lastError = error;
  }

  const urls = getRpcUrls(networkKey);

  for (const url of urls) {
    try {
      const providerLike = new ethers.JsonRpcProvider(url, undefined, { staticNetwork: true });
      return await resolveTokenMetadataWithProvider(providerLike, cleanAddress);
    } catch (error) {
      lastError = error;
    }
  }

  try {
    return await resolveTokenMetadataWithProvider(getProvider(networkKey), cleanAddress);
  } catch (error) {
    throw lastError || error || new Error("Token metadata unavailable");
  }
}

export async function loadAllBalances(
  address: string,
  tokens: TokenItem[],
  networkKey?: string
) {
  const balances: Record<string, string> = {};
  const activeKey = normalizeNetworkKeyForTokens(networkKey || getStoredNetwork().key);

  if (!address) {
    for (const token of tokens) balances[token.symbol] = "0.000000";
    return balances;
  }

  await Promise.all(
    tokens.map(async (token) => {
      try {
        if (token.networkKey && normalizeNetworkKeyForTokens(token.networkKey) !== activeKey) {
          balances[token.symbol] = "0.000000";
          return;
        }

        if (token.isNative) {
          balances[token.symbol] = await getNativeBalance(address, activeKey);
          return;
        }

        if (!token.address) {
          balances[token.symbol] = "0.000000";
          return;
        }

        balances[token.symbol] = await getTokenBalance(
          token.address,
          address,
          token.decimals || 18,
          activeKey
        );
      } catch {
        balances[token.symbol] = "0.000000";
      }
    })
  );

  return balances;
}

export function normalizeSeed(seed: string) {
  return seed.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isValidSeedPhrase(seed: string) {
  const parts = normalizeSeed(seed).split(" ").filter(Boolean);
  return [12, 15, 18, 21, 24].includes(parts.length);
}

export function shortAddress(address: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getMnemonicFromWallet(
  wallet: ethers.Wallet | ethers.HDNodeWallet
): string {
  if ("mnemonic" in wallet && wallet.mnemonic && typeof wallet.mnemonic.phrase === "string") {
    return wallet.mnemonic.phrase;
  }
  return "";
}
