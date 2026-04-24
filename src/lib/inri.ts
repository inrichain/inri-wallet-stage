import { ethers } from "ethers";
import { getAllNetworks, getStoredNetwork, type NetworkItem } from "./network";
import { resolveTokenAsset } from "./assets";

const BASE = import.meta.env.BASE_URL || "/";

export const RPC_URL = "https://rpc.inri.life";
export const RPC_FALLBACK_URL = "https://rpc-chain.inri.life";
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
  const key = networkKey || getStoredNetwork().key;
  return DEFAULT_TOKENS.filter((token) => token.networkKey === key);
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

function getRpcUrls(networkKey?: string) {
  const network = getNetworkConfig(networkKey);

  if (network.key === "inri") {
    return [network.rpcUrl, RPC_FALLBACK_URL].filter(Boolean);
  }

  if (network.key === "ethereum") {
    return [
      network.rpcUrl,
      "https://ethereum-rpc.publicnode.com",
      "https://rpc.ankr.com/eth",
      "https://cloudflare-eth.com",
    ].filter(Boolean);
  }

  return [network.rpcUrl].filter(Boolean);
}

async function rpcCall(url: string, method: string, params: any[]) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });

  const data = await res.json();

  if (data?.error) {
    throw new Error(data.error.message || "RPC error");
  }

  return data.result;
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
    const raw = await getProvider(networkKey).getBalance(address);
    return Number(ethers.formatEther(raw)).toFixed(6);
  } catch {
    try {
      return await getNativeBalanceRaw(address, networkKey);
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

export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  decimals = 18,
  networkKey?: string
) {
  if (!tokenAddress || !walletAddress) return "0.000000";

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

export async function resolveTokenMetadata(
  tokenAddress: string,
  networkKey?: string
): Promise<TokenMetadata> {
  const cleanAddress = tokenAddress.trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
    throw new Error("Invalid token address");
  }

  const urls = getRpcUrls(networkKey);
  let lastError: unknown;

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
  const activeKey = networkKey || getStoredNetwork().key;

  if (!address) {
    for (const token of tokens) balances[token.symbol] = "0.000000";
    return balances;
  }

  await Promise.all(
    tokens.map(async (token) => {
      try {
        if (token.networkKey && token.networkKey !== activeKey) {
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
