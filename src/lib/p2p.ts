import { ethers } from "ethers";
import { EXPLORER_TX_URL, getProvider } from "./inri";

export const P2P_MARKET_ADDRESS = "0x2C556882c11B6DddD9CEFB1a9307515055bb7cdA";
export const P2P_IUSD_ADDRESS = "0x116b2fF23e062A52E2c0ea12dF7e2638b62Fa0FC";
const ACTIVITY_KEY = "wallet_activity_demo";

export type P2PSide = "sell" | "buy";
export type P2POrder = {
  id: number;
  side: P2PSide;
  maker: string;
  priceRaw: bigint;
  priceDisplay: string;
  remainingInri: bigint;
  remainingInriDisplay: string;
  remainingIusd: bigint;
  remainingIusdDisplay: string;
  deadline: number;
  active: boolean;
  expired: boolean;
};

export const P2P_ABI = [
  "function nextOrderId() view returns (uint256)",
  "function FEE_BPS() view returns (uint256)",
  "function treasury() view returns (address)",
  "function orders(uint256) view returns (uint8 side, address maker, uint256 priceIusdPer1e18Inri, uint256 remainingInri, uint256 remainingIusd, uint64 deadline, bool active)",
  "function quoteIusdGross(uint256 inriAmount, uint256 priceIusdPer1e18Inri) view returns (uint256)",
  "function feeOf(uint256 iusdGross) view returns (uint256)",
  "function createSellOrder(uint256 priceIusdPer1e18Inri, uint64 deadline) payable returns (uint256)",
  "function createBuyOrder(uint256 inriWanted, uint256 priceIusdPer1e18Inri, uint64 deadline) returns (uint256)",
  "function fillSellOrder(uint256 orderId, uint256 inriToBuy, uint256 maxIusdGross)",
  "function fillBuyOrder(uint256 orderId, uint256 inriToSell, uint256 minIusdNet) payable",
  "function updatePrice(uint256 orderId, uint256 newPriceIusdPer1e18Inri)",
  "function updateDeadline(uint256 orderId, uint64 newDeadline)",
  "function addInriToSellOrder(uint256 orderId) payable",
  "function removeInriFromSellOrder(uint256 orderId, uint256 inriToRemove)",
  "function addIusdToBuyOrder(uint256 orderId, uint256 iusdToAdd)",
  "function reduceBuyOrder(uint256 orderId, uint256 inriToReduce)",
  "function cancelOrder(uint256 orderId)",
];

export const P2P_IUSD_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

export function getP2PReadProvider() {
  return getProvider("inri");
}

export function getP2PContract(signerOrProvider: ethers.ContractRunner = getP2PReadProvider()) {
  return new ethers.Contract(P2P_MARKET_ADDRESS, P2P_ABI, signerOrProvider);
}

export function getIusdContract(signerOrProvider: ethers.ContractRunner = getP2PReadProvider()) {
  return new ethers.Contract(P2P_IUSD_ADDRESS, P2P_IUSD_ABI, signerOrProvider);
}

export function getP2PSigner(privateKey: string) {
  return new ethers.Wallet(privateKey, getP2PReadProvider());
}

export function parseInriAmount(value: string) {
  return ethers.parseEther(String(value || "0").trim() || "0");
}

export function parseIusdAmount(value: string) {
  return ethers.parseUnits(String(value || "0").trim() || "0", 6);
}

export function parsePrice(value: string) {
  return ethers.parseUnits(String(value || "0").trim() || "0", 6);
}

export function formatInri(value: bigint | number | string, digits = 4) {
  try {
    return Number(ethers.formatEther(BigInt(value))).toLocaleString(undefined, { maximumFractionDigits: digits });
  } catch {
    return "0";
  }
}

export function formatIusd(value: bigint | number | string, digits = 4) {
  try {
    return Number(ethers.formatUnits(BigInt(value), 6)).toLocaleString(undefined, { maximumFractionDigits: digits });
  } catch {
    return "0";
  }
}

export function formatPriceDisplay(priceRaw: bigint) {
  try {
    return Number(ethers.formatUnits(priceRaw, 6)).toLocaleString(undefined, { maximumFractionDigits: 6 });
  } catch {
    return "0";
  }
}

export function shortenAddress(value?: string, size = 4) {
  if (!value) return "—";
  return `${value.slice(0, 2 + size)}...${value.slice(-size)}`;
}

export async function getP2PStats() {
  const contract = getP2PContract();
  const [nextOrderId, feeBps, treasury] = await Promise.all([
    contract.nextOrderId(),
    contract.FEE_BPS(),
    contract.treasury(),
  ]);
  return {
    nextOrderId: Number(nextOrderId),
    feeBps: Number(feeBps),
    treasury: String(treasury),
  };
}

export function normalizeOrder(id: number, raw: any): P2POrder {
  const sideNum = Number(raw?.side ?? raw?.[0] ?? 0);
  const priceRaw = BigInt(raw?.priceIusdPer1e18Inri ?? raw?.[2] ?? 0);
  const remainingInri = BigInt(raw?.remainingInri ?? raw?.[3] ?? 0);
  const remainingIusd = BigInt(raw?.remainingIusd ?? raw?.[4] ?? 0);
  const deadline = Number(raw?.deadline ?? raw?.[5] ?? 0);
  const active = Boolean(raw?.active ?? raw?.[6] ?? false);
  return {
    id,
    side: sideNum === 0 ? "sell" : "buy",
    maker: String(raw?.maker ?? raw?.[1] ?? "0x0000000000000000000000000000000000000000"),
    priceRaw,
    priceDisplay: formatPriceDisplay(priceRaw),
    remainingInri,
    remainingInriDisplay: formatInri(remainingInri),
    remainingIusd,
    remainingIusdDisplay: formatIusd(remainingIusd),
    deadline,
    active,
    expired: deadline !== 0 && Date.now() / 1000 > deadline,
  };
}

export async function loadRecentP2POrders(options?: { limit?: number; activeOnly?: boolean; maker?: string }) {
  const contract = getP2PContract();
  const nextOrderId = Number(await contract.nextOrderId());
  const limit = Math.max(1, Math.min(80, options?.limit || 24));
  const maker = options?.maker?.toLowerCase() || "";
  const ids: number[] = [];
  for (let id = nextOrderId - 1; id >= 1 && ids.length < limit; id -= 1) ids.push(id);
  const raws = await Promise.all(ids.map((id) => contract.orders(id).catch(() => null)));
  return raws
    .map((raw, index) => (raw ? normalizeOrder(ids[index], raw) : null))
    .filter(Boolean)
    .filter((item: any) => (options?.activeOnly ? item.active : true))
    .filter((item: any) => (maker ? String(item.maker).toLowerCase() === maker : true)) as P2POrder[];
}

export async function getIusdBalance(address: string) {
  if (!address) return 0n;
  return BigInt(await getIusdContract().balanceOf(address));
}

export async function getIusdAllowance(address: string) {
  if (!address) return 0n;
  return BigInt(await getIusdContract().allowance(address, P2P_MARKET_ADDRESS));
}

export async function approveIusd(privateKey: string, amount: bigint) {
  const signer = getP2PSigner(privateKey);
  const contract = getIusdContract(signer);
  const tx = await contract.approve(P2P_MARKET_ADDRESS, amount);
  const receipt = await tx.wait();
  return { hash: tx.hash as string, receipt };
}

export async function createSellOrderTx(args: { privateKey: string; priceRaw: bigint; deadline: number; inriAmount: bigint; }) {
  const signer = getP2PSigner(args.privateKey);
  const contract = getP2PContract(signer);
  const tx = await contract.createSellOrder(args.priceRaw, args.deadline, { value: args.inriAmount });
  const receipt = await tx.wait();
  return { hash: tx.hash as string, receipt };
}

export async function createBuyOrderTx(args: { privateKey: string; priceRaw: bigint; deadline: number; inriWanted: bigint; }) {
  const signer = getP2PSigner(args.privateKey);
  const contract = getP2PContract(signer);
  const tx = await contract.createBuyOrder(args.inriWanted, args.priceRaw, args.deadline);
  const receipt = await tx.wait();
  return { hash: tx.hash as string, receipt };
}

export async function fillSellOrderTx(args: { privateKey: string; orderId: number; inriToBuy: bigint; maxIusdGross: bigint; }) {
  const signer = getP2PSigner(args.privateKey);
  const contract = getP2PContract(signer);
  const tx = await contract.fillSellOrder(args.orderId, args.inriToBuy, args.maxIusdGross);
  const receipt = await tx.wait();
  return { hash: tx.hash as string, receipt };
}

export async function fillBuyOrderTx(args: { privateKey: string; orderId: number; inriToSell: bigint; minIusdNet: bigint; }) {
  const signer = getP2PSigner(args.privateKey);
  const contract = getP2PContract(signer);
  const tx = await contract.fillBuyOrder(args.orderId, args.inriToSell, args.minIusdNet, { value: args.inriToSell });
  const receipt = await tx.wait();
  return { hash: tx.hash as string, receipt };
}

export async function cancelP2POrderTx(args: { privateKey: string; orderId: number }) {
  const signer = getP2PSigner(args.privateKey);
  const contract = getP2PContract(signer);
  const tx = await contract.cancelOrder(args.orderId);
  const receipt = await tx.wait();
  return { hash: tx.hash as string, receipt };
}

export function appendP2PActivity(item: {
  hash: string;
  from: string;
  to?: string;
  amount: string;
  symbol: string;
  networkName?: string;
  status?: string;
  kind: string;
}) {
  try {
    const current = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
    const next = [
      {
        hash: item.hash,
        from: item.from,
        to: item.to || P2P_MARKET_ADDRESS,
        amount: item.amount,
        symbol: item.symbol,
        networkName: item.networkName || "INRI",
        status: item.status || "confirmed",
        priority: "normal",
        gasUsed: "-",
        gasPriceGwei: "-",
        feeNative: "-",
        createdAt: new Date().toISOString(),
        kind: item.kind,
        explorerUrl: `${EXPLORER_TX_URL}${item.hash}`,
      },
      ...current,
    ].slice(0, 100);
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
  } catch {}
}
