import { ethers } from "ethers";

export type TokenItem = {
  symbol: string;
  name: string;
  address?: string;
  decimals: number;
  logo?: string;
  isNative?: boolean;
};

const BASE = "/inri-wallet-stage/";

export const RPC_URLS = [
  "https://rpc.inri.life",
  "https://rpc-chain.inri.life",
];

export const DEFAULT_TOKENS: TokenItem[] = [
  {
    symbol: "INRI",
    name: "INRI",
    decimals: 18,
    isNative: true,
    logo: `${BASE}token-inri.png`,
  },
  {
    symbol: "iUSD",
    name: "iUSD",
    address: "0x116b2fF23e062A52E2c0ea12dF7e2638b62Fa0FC",
    decimals: 18,
    logo: `${BASE}token-iusd.png`,
  },
  {
    symbol: "DNR",
    name: "DNR",
    decimals: 18,
    logo: `${BASE}token-dnr.png`,
  },
  {
    symbol: "USDT",
    name: "USDT",
    decimals: 6,
    logo: `${BASE}token-usdt.png`,
  },
  {
    symbol: "USDC",
    name: "USDC",
    decimals: 6,
    logo: `${BASE}token-usdc.png`,
  },
  {
    symbol: "WINRI",
    name: "Wrapped INRI",
    decimals: 18,
    logo: `${BASE}token-winri.png`,
  },
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

function makeProvider(url: string) {
  return new ethers.JsonRpcProvider(url, {
    name: "INRI",
    chainId: 3777,
  });
}

export const provider = makeProvider(RPC_URLS[0]);

async function getWorkingProvider() {
  for (const url of RPC_URLS) {
    try {
      const p = makeProvider(url);
      await p.getBlockNumber();
      return p;
    } catch {}
  }
  return makeProvider(RPC_URLS[0]);
}

function formatAmount(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.000000";
  return n.toFixed(6);
}

export async function getNativeBalance(address: string) {
  if (!address) return "0.000000";
  try {
    const p = await getWorkingProvider();
    const bal = await p.getBalance(address);
    return formatAmount(ethers.formatEther(bal));
  } catch {
    return "0.000000";
  }
}

export async function loadAllBalances(address: string, tokens: TokenItem[]) {
  const out: Record<string, string> = {};
  if (!address) {
    for (const token of tokens) out[token.symbol] = "0.000000";
    return out;
  }

  try {
    const p = await getWorkingProvider();

    for (const token of tokens) {
      try {
        if (token.isNative || !token.address) {
          const bal = await p.getBalance(address);
          out[token.symbol] = formatAmount(ethers.formatEther(bal));
        } else {
          const contract = new ethers.Contract(token.address, ERC20_ABI, p);
          const [rawBal, dec] = await Promise.all([
            contract.balanceOf(address),
            contract.decimals().catch(() => token.decimals),
          ]);
          out[token.symbol] = formatAmount(
            ethers.formatUnits(rawBal, Number(dec))
          );
        }
      } catch {
        out[token.symbol] = "0.000000";
      }
    }
  } catch {
    for (const token of tokens) out[token.symbol] = "0.000000";
  }

  return out;
}

export function normalizeSeed(seed: string) {
  return seed
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
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
