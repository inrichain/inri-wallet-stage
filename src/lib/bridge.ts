import { ethers } from "ethers";
import { getProvider, EXPLORER_TX_URL } from "./inri";

const BRIDGE_ACTIVITY_KEY = "wallet_activity_demo";
const BRIDGE_OPERATIONS_KEY = "wallet_bridge_operations_v2";
const BRIDGE_BURN_NONCE_KEY = "wallet_bridge_burn_nonce_v1";

export const POLYGON_LOCKBOX_ADDRESS = "0x7E2e6d4881e1470D541599397b4876b449296071";
export const INRI_EXECUTOR_ADDRESS = "0x07DE046e96c33a8E575234282e1CccAC56d3d880";
export const IUSD_TOKEN_ADDRESS = "0x116b2fF23e062A52E2c0ea12dF7e2638b62Fa0FC";
export const POLYGON_USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";

export type BridgeDirection = "polygon_to_inri" | "inri_to_polygon";
export type BridgeFlowStatus =
  | "idle"
  | "reviewing"
  | "awaiting_wallet"
  | "pending"
  | "ready_to_claim"
  | "claimed"
  | "confirmed"
  | "failed";

export type BridgeOperation = {
  id: string;
  direction: BridgeDirection;
  fromNetworkKey: string;
  toNetworkKey: string;
  fromNetworkName: string;
  toNetworkName: string;
  fromSymbol: string;
  toSymbol: string;
  amountIn: string;
  amountOut: string;
  feePercent: number;
  destination: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
  status: BridgeFlowStatus;
  stageLabel: string;
  etaLabel: string;
  sourceTxHash?: string;
  claimTxHash?: string;
  contractAddress?: string;
  claimContractAddress?: string;
  mode: "mock" | "live";
};

export type BridgeRouteDefinition = {
  direction: BridgeDirection;
  fromNetworkKey: string;
  toNetworkKey: string;
  fromNetworkName: string;
  toNetworkName: string;
  fromSymbol: string;
  toSymbol: string;
  bridgeFeePercent: number;
  estimatedMinutes: number;
  sourceContractAddress: string;
  claimContractAddress?: string;
  sourceMethod: string;
  claimMethod?: string;
};

export type BridgeQuote = {
  amountIn: string;
  amountOut: string;
  feePercent: number;
  feeAmount: string;
  etaLabel: string;
  statusText: string;
  route: BridgeRouteDefinition;
};

export type BridgeBalances = {
  polygonUsdtBalance: bigint;
  polygonUsdtAllowance: bigint;
  inriIusdBalance: bigint;
  inriIusdAllowance: bigint;
  polygonDepositFeeBps: number;
  polygonReleaseFeeBps: number;
  inriFeeBps: number;
};

const ROUTES: Record<BridgeDirection, BridgeRouteDefinition> = {
  polygon_to_inri: {
    direction: "polygon_to_inri",
    fromNetworkKey: "polygon",
    toNetworkKey: "inri",
    fromNetworkName: "Polygon",
    toNetworkName: "INRI",
    fromSymbol: "USDT",
    toSymbol: "iUSD",
    bridgeFeePercent: 0,
    estimatedMinutes: 3,
    sourceContractAddress: POLYGON_LOCKBOX_ADDRESS,
    claimContractAddress: INRI_EXECUTOR_ADDRESS,
    sourceMethod: "deposit",
    claimMethod: "mintFromPolygonDeposit",
  },
  inri_to_polygon: {
    direction: "inri_to_polygon",
    fromNetworkKey: "inri",
    toNetworkKey: "polygon",
    fromNetworkName: "INRI",
    toNetworkName: "Polygon",
    fromSymbol: "iUSD",
    toSymbol: "USDT",
    bridgeFeePercent: 0,
    estimatedMinutes: 8,
    sourceContractAddress: INRI_EXECUTOR_ADDRESS,
    claimContractAddress: POLYGON_LOCKBOX_ADDRESS,
    sourceMethod: "burnForPolygonRelease",
    claimMethod: "release",
  },
};

export const ERC20_6_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

export const LOCKBOX_ABI = [
  "function deposit(uint256 amount)",
  "function depositFeeBps() view returns (uint16)",
  "function releaseFeeBps() view returns (uint16)",
  "function feeRecipient() view returns (address)",
  "function remainingDepositToday() view returns (uint256)",
  "function remainingReleaseToday() view returns (uint256)",
  "event Deposited(address indexed user, uint256 amount, bytes32 depositId)",
  "event Released(address indexed user, uint256 amount, uint256 nonce)",
];

export const EXECUTOR_ABI = [
  "function burnForPolygonRelease(address recipientOnPolygon, uint256 amount, uint256 nonce, uint256 deadline)",
  "function feeBps() view returns (uint16)",
  "function feeRecipient() view returns (address)",
  "function dailyMintLimit() view returns (uint256)",
  "function dailyBurnLimit() view returns (uint256)",
  "function burnedToday() view returns (uint256)",
  "function mintedToday() view returns (uint256)",
  "event BurnFinalized(address indexed burner, address indexed recipientOnPolygon, uint256 amount, uint256 nonce, uint256 polygonChainId, uint256 inriChainId)",
  "event MintFinalized(address indexed recipient, uint256 amount, bytes32 indexed depositId, uint256 indexed sourceChainId)",
];

export function getBridgeRoute(direction: BridgeDirection) {
  return ROUTES[direction];
}

export function getPolygonBridgeProvider() {
  return getProvider("polygon");
}

export function getInriBridgeProvider() {
  return getProvider("inri");
}

export function getPolygonUsdtContract(signerOrProvider: ethers.ContractRunner = getPolygonBridgeProvider()) {
  return new ethers.Contract(POLYGON_USDT_ADDRESS, ERC20_6_ABI, signerOrProvider);
}

export function getIusdBridgeContract(signerOrProvider: ethers.ContractRunner = getInriBridgeProvider()) {
  return new ethers.Contract(IUSD_TOKEN_ADDRESS, ERC20_6_ABI, signerOrProvider);
}

export function getLockboxContract(signerOrProvider: ethers.ContractRunner = getPolygonBridgeProvider()) {
  return new ethers.Contract(POLYGON_LOCKBOX_ADDRESS, LOCKBOX_ABI, signerOrProvider);
}

export function getExecutorContract(signerOrProvider: ethers.ContractRunner = getInriBridgeProvider()) {
  return new ethers.Contract(INRI_EXECUTOR_ADDRESS, EXECUTOR_ABI, signerOrProvider);
}

export function getBridgeSigner(privateKey: string, networkKey: "polygon" | "inri") {
  return new ethers.Wallet(privateKey, networkKey === "polygon" ? getPolygonBridgeProvider() : getInriBridgeProvider());
}

export function parseBridgeAmount(value: string) {
  return ethers.parseUnits(String(value || "0").trim() || "0", 6);
}

export function formatBridgeAmount(value: bigint | string | number, digits = 4) {
  try {
    return Number(ethers.formatUnits(BigInt(value), 6)).toLocaleString(undefined, { maximumFractionDigits: digits });
  } catch {
    return "0";
  }
}

export function estimateBridgeQuote(direction: BridgeDirection, amountText: string, feePercent = 0): BridgeQuote {
  const route = getBridgeRoute(direction);
  const amount = Number(amountText || "0");
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const feeAmount = safeAmount * (feePercent / 100);
  const amountOut = Math.max(0, safeAmount - feeAmount);

  return {
    amountIn: safeAmount > 0 ? safeAmount.toFixed(6) : "0.000000",
    amountOut: amountOut > 0 ? amountOut.toFixed(6) : "0.000000",
    feeAmount: feeAmount > 0 ? feeAmount.toFixed(6) : "0.000000",
    feePercent,
    etaLabel: formatEta(route.estimatedMinutes),
    statusText: route.direction === "polygon_to_inri" ? "Deposit → wait validator mint" : "Burn → wait validator release",
    route: { ...route, bridgeFeePercent: feePercent },
  };
}

export async function loadBridgeBalances(address: string): Promise<BridgeBalances> {
  if (!address) {
    return {
      polygonUsdtBalance: 0n,
      polygonUsdtAllowance: 0n,
      inriIusdBalance: 0n,
      inriIusdAllowance: 0n,
      polygonDepositFeeBps: 0,
      polygonReleaseFeeBps: 0,
      inriFeeBps: 0,
    };
  }
  const [polygonUsdt, inriIusd, lockbox, executor] = [
    getPolygonUsdtContract(),
    getIusdBridgeContract(),
    getLockboxContract(),
    getExecutorContract(),
  ];
  const [polygonUsdtBalance, polygonUsdtAllowance, inriIusdBalance, inriIusdAllowance, depositFeeBps, releaseFeeBps, inriFeeBps] = await Promise.all([
    polygonUsdt.balanceOf(address).catch(() => 0n),
    polygonUsdt.allowance(address, POLYGON_LOCKBOX_ADDRESS).catch(() => 0n),
    inriIusd.balanceOf(address).catch(() => 0n),
    inriIusd.allowance(address, INRI_EXECUTOR_ADDRESS).catch(() => 0n),
    lockbox.depositFeeBps().catch(() => 0),
    lockbox.releaseFeeBps().catch(() => 0),
    executor.feeBps().catch(() => 0),
  ]);

  return {
    polygonUsdtBalance: BigInt(polygonUsdtBalance),
    polygonUsdtAllowance: BigInt(polygonUsdtAllowance),
    inriIusdBalance: BigInt(inriIusdBalance),
    inriIusdAllowance: BigInt(inriIusdAllowance),
    polygonDepositFeeBps: Number(depositFeeBps),
    polygonReleaseFeeBps: Number(releaseFeeBps),
    inriFeeBps: Number(inriFeeBps),
  };
}

export async function approvePolygonUsdtTx(privateKey: string, amount: bigint) {
  const signer = getBridgeSigner(privateKey, "polygon");
  const token = getPolygonUsdtContract(signer);
  const tx = await token.approve(POLYGON_LOCKBOX_ADDRESS, amount);
  const receipt = await tx.wait();
  return { hash: String(tx.hash), receipt };
}

export async function approveIusdForBridgeTx(privateKey: string, amount: bigint) {
  const signer = getBridgeSigner(privateKey, "inri");
  const token = getIusdBridgeContract(signer);
  const tx = await token.approve(INRI_EXECUTOR_ADDRESS, amount);
  const receipt = await tx.wait();
  return { hash: String(tx.hash), receipt };
}

export async function depositPolygonToInriTx(args: { privateKey: string; amount: bigint; destination: string; walletAddress: string; }) {
  const signer = getBridgeSigner(args.privateKey, "polygon");
  const contract = getLockboxContract(signer);
  const tx = await contract.deposit(args.amount);
  const receipt = await tx.wait();
  const depositId = readDepositIdFromReceipt(receipt) || "";

  const operation = createOperation({
    direction: "polygon_to_inri",
    amount: args.amount,
    destination: args.destination,
    walletAddress: args.walletAddress,
    sourceTxHash: String(tx.hash),
    stageLabel: depositId ? `Deposit confirmed • waiting validator mint` : "Deposit confirmed • waiting validator mint",
    status: "pending",
    extra: { contractAddress: POLYGON_LOCKBOX_ADDRESS },
  });

  saveBridgeOperation(operation);
  saveBridgeActivity(operation, String(tx.hash), "confirmed");
  return { hash: String(tx.hash), receipt, depositId, operation };
}

export async function burnInriToPolygonTx(args: { privateKey: string; amount: bigint; destination: string; walletAddress: string; deadlineSeconds?: number; }) {
  const signer = getBridgeSigner(args.privateKey, "inri");
  const contract = getExecutorContract(signer);
  const nonce = nextBurnNonce(args.walletAddress);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + (args.deadlineSeconds || 60 * 30));
  const tx = await contract.burnForPolygonRelease(args.destination, args.amount, nonce, deadline);
  const receipt = await tx.wait();

  const operation = createOperation({
    direction: "inri_to_polygon",
    amount: args.amount,
    destination: args.destination,
    walletAddress: args.walletAddress,
    sourceTxHash: String(tx.hash),
    stageLabel: `Burn confirmed • waiting validator release`,
    status: "pending",
    extra: { contractAddress: INRI_EXECUTOR_ADDRESS },
  });

  saveBridgeOperation(operation);
  saveBridgeActivity(operation, String(tx.hash), "confirmed");
  return { hash: String(tx.hash), receipt, nonce: Number(nonce), deadline: Number(deadline), operation };
}

export function getBridgeOperations(address?: string): BridgeOperation[] {
  try {
    const raw = JSON.parse(localStorage.getItem(BRIDGE_OPERATIONS_KEY) || "[]");
    const list = Array.isArray(raw) ? raw : [];
    const filtered = address
      ? list.filter(
          (item: BridgeOperation) =>
            item.walletAddress?.toLowerCase() === address.toLowerCase() ||
            item.destination?.toLowerCase() === address.toLowerCase()
        )
      : list;
    return filtered.sort(
      (a: BridgeOperation, b: BridgeOperation) =>
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
  } catch {
    return [];
  }
}

function createOperation(input: {
  direction: BridgeDirection;
  amount: bigint;
  destination: string;
  walletAddress: string;
  sourceTxHash: string;
  stageLabel: string;
  status: BridgeFlowStatus;
  extra?: Partial<BridgeOperation>;
}) {
  const route = getBridgeRoute(input.direction);
  const amountText = ethers.formatUnits(input.amount, 6);
  const quote = estimateBridgeQuote(input.direction, amountText, 0);
  const now = new Date().toISOString();

  return {
    id: `bridge_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    direction: input.direction,
    fromNetworkKey: route.fromNetworkKey,
    toNetworkKey: route.toNetworkKey,
    fromNetworkName: route.fromNetworkName,
    toNetworkName: route.toNetworkName,
    fromSymbol: route.fromSymbol,
    toSymbol: route.toSymbol,
    amountIn: quote.amountIn,
    amountOut: quote.amountOut,
    feePercent: 0,
    destination: input.destination,
    walletAddress: input.walletAddress,
    createdAt: now,
    updatedAt: now,
    status: input.status,
    stageLabel: input.stageLabel,
    etaLabel: quote.etaLabel,
    sourceTxHash: input.sourceTxHash,
    contractAddress: route.sourceContractAddress,
    claimContractAddress: route.claimContractAddress,
    mode: "live" as const,
    ...input.extra,
  } as BridgeOperation;
}

function saveBridgeOperation(operation: BridgeOperation) {
  const current = getBridgeOperations();
  const next = [operation, ...current.filter((item) => item.id !== operation.id)].slice(0, 100);
  localStorage.setItem(BRIDGE_OPERATIONS_KEY, JSON.stringify(next));
}

function saveBridgeActivity(
  operation: BridgeOperation,
  hash: string,
  status: "pending" | "confirmed" | "failed",
  isClaim = false
) {
  try {
    const raw = JSON.parse(localStorage.getItem(BRIDGE_ACTIVITY_KEY) || "[]");
    const current = Array.isArray(raw) ? raw : [];
    const type = operation.direction === "polygon_to_inri" ? "bridge_deposit" : "bridge_withdraw";
    const activity = {
      hash,
      type,
      symbol: isClaim ? operation.toSymbol : operation.fromSymbol,
      amount: isClaim ? operation.amountOut : operation.amountIn,
      to: operation.destination,
      from: operation.walletAddress,
      createdAt: new Date().toISOString(),
      status,
      networkKey: isClaim ? operation.toNetworkKey : operation.fromNetworkKey,
      networkName: isClaim ? operation.toNetworkName : operation.fromNetworkName,
      chainId: isClaim ? operation.toNetworkKey : operation.fromNetworkKey,
      gasUsed: status === "confirmed" ? "-" : "pending",
      gasPriceGwei: status === "confirmed" ? "-" : "pending",
      feeNative: status === "confirmed" ? "-" : "pending",
      priority: "normal",
      method: isClaim ? "claim" : operation.direction === "polygon_to_inri" ? "deposit" : "burnForPolygonRelease",
      dappName: "INRI Bridge",
      bridgeDirection: `${operation.fromNetworkName} → ${operation.toNetworkName}`,
      bridgeStatusLabel: operation.stageLabel,
      mode: operation.mode,
    };
    localStorage.setItem(BRIDGE_ACTIVITY_KEY, JSON.stringify([activity, ...current].slice(0, 300)));
  } catch {}
}

function readDepositIdFromReceipt(receipt: any): string | null {
  try {
    const iface = new ethers.Interface(LOCKBOX_ABI);
    for (const log of receipt?.logs || []) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "Deposited") {
          return String(parsed.args?.depositId || "");
        }
      } catch {}
    }
  } catch {}
  return null;
}

function nextBurnNonce(address: string) {
  const key = `${BRIDGE_BURN_NONCE_KEY}:${String(address || "").toLowerCase()}`;
  const raw = localStorage.getItem(key);
  const current = raw ? BigInt(raw) : BigInt(Math.floor(Date.now() / 1000));
  const next = current + 1n;
  localStorage.setItem(key, next.toString());
  return next;
}

function formatEta(minutes: number) {
  if (minutes <= 1) return "~1 minute";
  return `~${minutes} minutes`;
}

export function bridgeTxUrl(direction: BridgeDirection, hash: string) {
  if (!hash) return "";
  return direction === "polygon_to_inri" ? `https://polygonscan.com/tx/${hash}` : `${EXPLORER_TX_URL}${hash}`;
}
