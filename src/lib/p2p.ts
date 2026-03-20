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
  "event OrderCreated(uint256 indexed orderId, uint8 side, address indexed maker, uint256 priceIusdPer1e18Inri, uint256 inriAmount, uint256 iusdAmount, uint64 deadline)",
  "event OrderFilled(uint256 indexed orderId, address indexed maker, address indexed taker, uint256 inriFilled, uint256 iusdGross, uint256 feeIusd, uint256 iusdNetToMakerOrTaker)",
  "event OrderCancelled(uint256 indexed orderId, address indexed maker, uint256 refundInri, uint256 refundIusd)",
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

export async function loadRecentP2POrders(options?: { limit?: number; activeOnly?: boolean; maker?: string; page?: number }) {
  const contract = getP2PContract();
  const nextOrderId = Number(await contract.nextOrderId());
  const limit = Math.max(1, Math.min(80, options?.limit || 24));
  const maker = options?.maker?.toLowerCase() || "";
  const page = Math.max(1, Number(options?.page || 1));
  const startId = Math.max(1, nextOrderId - 1 - (page - 1) * limit);
  const ids: number[] = [];
  for (let id = startId; id >= 1 && ids.length < limit; id -= 1) ids.push(id);
  const raws = await Promise.all(ids.map((id) => contract.orders(id).catch(() => null)));
  const items = raws
    .map((raw, index) => (raw ? normalizeOrder(ids[index], raw) : null))
    .filter(Boolean)
    .filter((item: any) => (options?.activeOnly ? item.active : true))
    .filter((item: any) => (maker ? String(item.maker).toLowerCase() === maker : true)) as P2POrder[];
  return {
    items,
    hasMore: startId - limit >= 1,
    page,
    totalApprox: Math.max(0, nextOrderId - 1),
  };
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


export async function updateP2PPriceTx(args: { privateKey: string; orderId: number; newPriceRaw: bigint }) {
  const signer = getP2PSigner(args.privateKey);
  const contract = getP2PContract(signer);
  const tx = await contract.updatePrice(args.orderId, args.newPriceRaw);
  const receipt = await tx.wait();
  return { hash: tx.hash as string, receipt };
}

export async function updateP2PDeadlineTx(args: { privateKey: string; orderId: number; newDeadline: number }) {
  const signer = getP2PSigner(args.privateKey);
  const contract = getP2PContract(signer);
  const tx = await contract.updateDeadline(args.orderId, args.newDeadline);
  const receipt = await tx.wait();
  return { hash: tx.hash as string, receipt };
}

export async function addInriToSellOrderTx(args: { privateKey: string; orderId: number; inriAmount: bigint }) {
  const signer = getP2PSigner(args.privateKey);
  const contract = getP2PContract(signer);
  const tx = await contract.addInriToSellOrder(args.orderId, { value: args.inriAmount });
  const receipt = await tx.wait();
  return { hash: tx.hash as string, receipt };
}

export async function removeInriFromSellOrderTx(args: { privateKey: string; orderId: number; inriAmount: bigint }) {
  const signer = getP2PSigner(args.privateKey);
  const contract = getP2PContract(signer);
  const tx = await contract.removeInriFromSellOrder(args.orderId, args.inriAmount);
  const receipt = await tx.wait();
  return { hash: tx.hash as string, receipt };
}

export async function addIusdToBuyOrderTx(args: { privateKey: string; orderId: number; iusdAmount: bigint }) {
  const signer = getP2PSigner(args.privateKey);
  const contract = getP2PContract(signer);
  const tx = await contract.addIusdToBuyOrder(args.orderId, args.iusdAmount);
  const receipt = await tx.wait();
  return { hash: tx.hash as string, receipt };
}

export async function reduceBuyOrderTx(args: { privateKey: string; orderId: number; inriAmount: bigint }) {
  const signer = getP2PSigner(args.privateKey);
  const contract = getP2PContract(signer);
  const tx = await contract.reduceBuyOrder(args.orderId, args.inriAmount);
  const receipt = await tx.wait();
  return { hash: tx.hash as string, receipt };
}

export type P2PEventItem = {
  kind: string;
  orderId: number;
  txHash: string;
  blockNumber: number;
  maker?: string;
  taker?: string;
  inri?: string;
  iusd?: string;
  fee?: string;
};

export async function loadP2PEvents(limit = 20): Promise<P2PEventItem[]> {
  const contract = getP2PContract();
  const createdFilter = contract.filters.OrderCreated();
  const filledFilter = contract.filters.OrderFilled();
  const cancelledFilter = contract.filters.OrderCancelled();
  const [created, filled, cancelled] = await Promise.all([
    contract.queryFilter(createdFilter, -5000),
    contract.queryFilter(filledFilter, -5000),
    contract.queryFilter(cancelledFilter, -5000),
  ]);

  const items: P2PEventItem[] = [];
  for (const event of created) {
    const args: any = event.args || [];
    items.push({
      kind: 'created',
      orderId: Number(args.orderId ?? args[0] ?? 0),
      txHash: String(event.transactionHash || ''),
      blockNumber: Number(event.blockNumber || 0),
      maker: String(args.maker ?? args[2] ?? ''),
      inri: formatInri(BigInt(args.inriAmount ?? args[4] ?? 0)),
      iusd: formatIusd(BigInt(args.iusdAmount ?? args[5] ?? 0)),
    });
  }
  for (const event of filled) {
    const args: any = event.args || [];
    items.push({
      kind: 'filled',
      orderId: Number(args.orderId ?? args[0] ?? 0),
      txHash: String(event.transactionHash || ''),
      blockNumber: Number(event.blockNumber || 0),
      maker: String(args.maker ?? args[1] ?? ''),
      taker: String(args.taker ?? args[2] ?? ''),
      inri: formatInri(BigInt(args.inriFilled ?? args[3] ?? 0)),
      iusd: formatIusd(BigInt(args.iusdGross ?? args[4] ?? 0)),
      fee: formatIusd(BigInt(args.feeIusd ?? args[5] ?? 0)),
    });
  }
  for (const event of cancelled) {
    const args: any = event.args || [];
    items.push({
      kind: 'cancelled',
      orderId: Number(args.orderId ?? args[0] ?? 0),
      txHash: String(event.transactionHash || ''),
      blockNumber: Number(event.blockNumber || 0),
      maker: String(args.maker ?? args[1] ?? ''),
      inri: formatInri(BigInt(args.refundInri ?? args[2] ?? 0)),
      iusd: formatIusd(BigInt(args.refundIusd ?? args[3] ?? 0)),
    });
  }

  return items.sort((a,b)=>b.blockNumber-a.blockNumber).slice(0, Math.max(1, Math.min(limit, 50)));
}
