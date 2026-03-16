import { ethers } from "ethers";

const BASE = import.meta.env.BASE_URL || "/";

export const RPC_URL = "https://rpc.inri.life";
export const RPC_FALLBACK_URL = "https://rpc-chain.inri.life";
export const CHAIN_ID = 3777;

export const EXPLORER_BASE_URL = "https://explorer.inri.life";
export const EXPLORER_ADDRESS_URL = "https://explorer.inri.life/address/";
export const EXPLORER_TX_URL = "https://explorer.inri.life/tx/";
export const EXPLORER_API_URL = "https://explorer.inri.life/api";

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
  if (data?.result !== undefined) return data.result;
  throw new Error(data?.error?.message || "RPC error");
}

export async function getNativeBalance(address: string) {
  try {
    const balanceHex = await rpcCall(RPC_URL, "eth_getBalance", [address, "latest"]);
    return ethers.formatEther(balanceHex);
  } catch {
    const balanceHex = await rpcCall(RPC_FALLBACK_URL, "eth_getBalance", [address, "latest"]);
    return ethers.formatEther(balanceHex);
  }
}

export async function getTokenBalance(
  walletAddress: string,
  tokenAddress: string,
  decimals = 18
) {
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const raw = await contract.balanceOf(walletAddress);
  return ethers.formatUnits(raw, decimals);
}

export async function loadAllBalances(address: string, tokens: TokenItem[]) {
  const out: Record<string, string> = {};

  for (const token of tokens) {
    try {
      if (token.isNative) {
        const balance = await getNativeBalance(address);
        out[token.symbol] = formatBalance(balance, 6);
      } else if (token.address) {
        const balance = await getTokenBalance(address, token.address, token.decimals || 18);
        out[token.symbol] = formatBalance(balance, 6);
      }
    } catch {
      out[token.symbol] = "0.000000";
    }
  }

  return out;
}

export function formatBalance(value: string | number, decimals = 6) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0.000000";
  return n.toFixed(decimals);
}
