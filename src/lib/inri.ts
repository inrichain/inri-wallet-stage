import { ethers } from "ethers";

const BASE = import.meta.env.BASE_URL || "/";

export const RPC_URL = "https://rpc.inri.life";
export const RPC_FALLBACK_URL = "https://rpc-chain.inri.life";
export const CHAIN_ID = 3777;
export const EXPLORER_ADDRESS_URL = "https://scan.inri.life/address/";
export const EXPLORER_TX_URL = "https://scan.inri.life/tx/";

export const provider = new ethers.JsonRpcProvider(RPC_URL, {
  name: "INRI",
  chainId: CHAIN_ID,
});

export const fallbackProvider = new ethers.JsonRpcProvider(RPC_FALLBACK_URL, {
  name: "INRI",
  chainId: CHAIN_ID,
});

export type TokenItem = {
  symbol: string;
  subtitle: string;
  logo: string;
  isDefault: boolean;
  isNative?: boolean;
  address?: string;
  decimals?: number;
};

export const DEFAULT_TOKENS: TokenItem[] = [
  {
    symbol: "INRI",
    subtitle: "native coin • pays gas",
    logo: BASE + "token-inri.png",
    isDefault: true,
    isNative: true,
    decimals: 18,
  },
  {
    symbol: "iUSD",
    subtitle: "stable token",
    logo: BASE + "token-iusd.png",
    isDefault: true,
    address: "0x116b2fF23e062A52E2c0ea12dF7e2638b62Fa0FC",
    decimals: 6,
  },
  {
    symbol: "WINRI",
    subtitle: "token",
    logo: BASE + "token-winri.png",
    isDefault: true,
    address: "0x8731F1709745173470821eAeEd9BC600EEC9A3D1",
    decimals: 18,
  },
  {
    symbol: "DNR",
    subtitle: "token",
    logo: BASE + "token-dnr.png",
    isDefault: true,
    address: "0xDa9541bB01d9EC1991328516C71B0E539a97d27f",
    decimals: 18,
  },
];

export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

async function rpcCall(url: string, method: string, params: any[]) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || "RPC error");
  }

  return data.result;
}

async function getNativeBalanceRaw(address: string) {
  try {
    const result = await rpcCall(RPC_URL, "eth_getBalance", [address, "latest"]);
    return Number(ethers.formatEther(result)).toFixed(6);
  } catch {
    const result = await rpcCall(RPC_FALLBACK_URL, "eth_getBalance", [address, "latest"]);
    return Number(ethers.formatEther(result)).toFixed(6);
  }
}

export async function getNativeBalance(address: string) {
  if (!address) return "0.000000";

  try {
    const raw = await provider.getBalance(address);
    return Number(ethers.formatEther(raw)).toFixed(6);
  } catch {
    try {
      const raw = await fallbackProvider.getBalance(address);
      return Number(ethers.formatEther(raw)).toFixed(6);
    } catch {
      return await getNativeBalanceRaw(address);
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
  decimals = 18
) {
  if (!tokenAddress || !walletAddress) return "0.000000";

  try {
    return await getTokenBalanceWithProvider(provider, tokenAddress, walletAddress, decimals);
  } catch {
    try {
      return await getTokenBalanceWithProvider(
        fallbackProvider,
        tokenAddress,
        walletAddress,
        decimals
      );
    } catch {
      return "0.000000";
    }
  }
}

export async function loadAllBalances(address: string, tokens: TokenItem[]) {
  const balances: Record<string, string> = {};

  if (!address) {
    for (const token of tokens) {
      balances[token.symbol] = "0.000000";
    }
    return balances;
  }

  balances["INRI"] = await getNativeBalance(address);

  await Promise.all(
    tokens.map(async (token) => {
      if (token.symbol === "INRI") return;

      if (!token.address) {
        balances[token.symbol] = "0.000000";
        return;
      }

      balances[token.symbol] = await getTokenBalance(
        token.address,
        address,
        token.decimals || 18
      );
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
