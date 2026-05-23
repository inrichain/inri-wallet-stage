import { ethers } from "ethers";
import { EXPLORER_TX_URL, getProvider } from "./inri";

const BRIDGE_ACTIVITY_KEY = "wallet_activity_demo";
const BRIDGE_OPERATIONS_KEY = "wallet_bridge_operations_v3";
const BRIDGE_BURN_NONCE_KEY = "wallet_bridge_burn_nonce_v1";
const DEFAULT_BRIDGE_FEE_BPS = 20; // 0.20% configured wallet-side fallback
export const BRIDGE_API_URL = "https://iusd-bridge.inri.life";

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
  depositId?: string;
  burnNonce?: number;
  burnId?: string;
  txType?: "approve" | "bridge" | "claim";
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
    bridgeFeePercent: DEFAULT_BRIDGE_FEE_BPS / 100,
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
    bridgeFeePercent: DEFAULT_BRIDGE_FEE_BPS / 100,
    estimatedMinutes: 8,
    sourceContractAddress: IUSD_TOKEN_ADDRESS,
    claimContractAddress: POLYGON_LOCKBOX_ADDRESS,
    sourceMethod: "burn",
    claimMethod: "release",
  },
};

export const ERC20_6_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

export const IUSD_BRIDGE_ABI = [
  ...ERC20_6_ABI,
  "function burn(uint256 amount)",
  "event Transfer(address indexed from,address indexed to,uint256 value)",
];

export const LOCKBOX_ABI = [
  "function deposit(uint256 amount)",
  "function release(address recipient,uint256 amount,uint256 nonce,uint256 deadline,bytes[] signatures)",
  "function depositFeeBps() view returns (uint16)",
  "function releaseFeeBps() view returns (uint16)",
  "function feeRecipient() view returns (address)",
  "function remainingDepositToday() view returns (uint256)",
  "function remainingReleaseToday() view returns (uint256)",
  "event Deposited(address indexed user, uint256 amount, bytes32 depositId)",
  "event Released(address indexed user, uint256 amount, uint256 nonce)",
];

export const EXECUTOR_ABI = [
  "function mintFromPolygonDeposit(address recipient,uint256 amount,bytes32 depositId,uint256 deadline,bytes[] signatures)",
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
  return new ethers.Contract(IUSD_TOKEN_ADDRESS, IUSD_BRIDGE_ABI, signerOrProvider);
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

export function estimateBridgeQuote(direction: BridgeDirection, amountText: string, feePercent = DEFAULT_BRIDGE_FEE_BPS / 100): BridgeQuote {
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
      polygonDepositFeeBps: DEFAULT_BRIDGE_FEE_BPS,
      polygonReleaseFeeBps: DEFAULT_BRIDGE_FEE_BPS,
      inriFeeBps: DEFAULT_BRIDGE_FEE_BPS,
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
    lockbox.depositFeeBps().catch(() => DEFAULT_BRIDGE_FEE_BPS),
    lockbox.releaseFeeBps().catch(() => DEFAULT_BRIDGE_FEE_BPS),
    Promise.resolve(DEFAULT_BRIDGE_FEE_BPS),
  ]);

  return {
    polygonUsdtBalance: BigInt(polygonUsdtBalance),
    polygonUsdtAllowance: BigInt(polygonUsdtAllowance),
    inriIusdBalance: BigInt(inriIusdBalance),
    inriIusdAllowance: BigInt(inriIusdAllowance),
    polygonDepositFeeBps: Number(depositFeeBps || DEFAULT_BRIDGE_FEE_BPS),
    polygonReleaseFeeBps: Number(releaseFeeBps || DEFAULT_BRIDGE_FEE_BPS),
    inriFeeBps: Number(inriFeeBps || DEFAULT_BRIDGE_FEE_BPS),
  };
}

export async function approvePolygonUsdtTx(privateKey: string, amount: bigint, walletAddress?: string) {
  const signer = getBridgeSigner(privateKey, "polygon");
  const token = getPolygonUsdtContract(signer);
  const tx = await token.approve(POLYGON_LOCKBOX_ADDRESS, amount);
  const receipt = await tx.wait();
  saveApprovalActivity({
    direction: "polygon_to_inri",
    hash: String(tx.hash),
    walletAddress: walletAddress || signer.address,
    tokenSymbol: "USDT",
    spender: POLYGON_LOCKBOX_ADDRESS,
    networkKey: "polygon",
    networkName: "Polygon",
    amount,
  });
  return { hash: String(tx.hash), receipt };
}

export async function approveIusdForBridgeTx(privateKey: string, amount: bigint, walletAddress?: string) {
  const signer = getBridgeSigner(privateKey, "inri");
  const token = getIusdBridgeContract(signer);
  const tx = await token.approve(POLYGON_LOCKBOX_ADDRESS, amount);
  const receipt = await tx.wait();
  saveApprovalActivity({
    direction: "inri_to_polygon",
    hash: String(tx.hash),
    walletAddress: walletAddress || signer.address,
    tokenSymbol: "iUSD",
    spender: POLYGON_LOCKBOX_ADDRESS,
    networkKey: "inri",
    networkName: "INRI",
    amount,
  });
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
    stageLabel: depositId ? "Deposit confirmed • waiting validator mint" : "Deposit confirmed • waiting validator mint",
    status: "pending",
    extra: { contractAddress: POLYGON_LOCKBOX_ADDRESS, depositId, txType: "bridge" },
  });

  saveBridgeOperation(operation);
  saveBridgeActivity(operation, String(tx.hash), "confirmed");
  return { hash: String(tx.hash), receipt, depositId, operation };
}

export async function burnInriToPolygonTx(args: { privateKey: string; amount: bigint; destination: string; walletAddress: string; deadlineSeconds?: number; }) {
  const signer = getBridgeSigner(args.privateKey, "inri");
  const token = getIusdBridgeContract(signer);
  const tx = await token.burn(args.amount);
  const receipt = await tx.wait();
  const burnId = readBurnIdFromReceipt(receipt, args.walletAddress, args.amount) || "";

  const operation = createOperation({
    direction: "inri_to_polygon",
    amount: args.amount,
    destination: args.destination,
    walletAddress: args.walletAddress,
    sourceTxHash: String(tx.hash),
    stageLabel: burnId ? "Burn confirmed • USDT claim will be ready soon" : "Burn confirmed • waiting validator release",
    status: "pending",
    extra: { contractAddress: IUSD_TOKEN_ADDRESS, burnId, txType: "bridge" },
  });

  saveBridgeOperation(operation);
  saveBridgeActivity(operation, String(tx.hash), "confirmed");
  return { hash: String(tx.hash), receipt, burnId, operation };
}


export async function fetchMintClaim(depositId: string) {
  const res = await fetch(`${BRIDGE_API_URL}/api/claim/${String(depositId || "").toLowerCase()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok || !data?.claim) throw new Error(data?.error || "Mint claim is not ready yet");
  return data.claim;
}

export async function fetchReleaseClaim(burnId: string) {
  const res = await fetch(`${BRIDGE_API_URL}/api/release/${String(burnId || "").toLowerCase()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok || !data?.release) throw new Error(data?.error || "USDT release is not ready yet");
  return data.release;
}

export async function claimBridgeOperationTx(privateKey: string, operation: BridgeOperation) {
  if (operation.direction === "polygon_to_inri") {
    if (!operation.depositId) throw new Error("Missing deposit id");
    const claim = await fetchMintClaim(operation.depositId);
    const signer = getBridgeSigner(privateKey, "inri");
    const executor = getExecutorContract(signer);
    const tx = await executor.mintFromPolygonDeposit(claim.recipient, claim.amount, claim.depositId, claim.deadline, claim.signatures);
    const receipt = await tx.wait();
    updateBridgeOperation(operation.id, {
      status: "confirmed",
      stageLabel: "iUSD claimed on INRI",
      claimTxHash: String(tx.hash),
      txType: "claim",
    });
    saveBridgeActivity({ ...operation, status: "confirmed", stageLabel: "iUSD claimed on INRI", claimTxHash: String(tx.hash) }, String(tx.hash), "confirmed", true);
    return { hash: String(tx.hash), receipt };
  }

  if (!operation.burnId) throw new Error("Missing burn id");
  const release = await fetchReleaseClaim(operation.burnId);
  const signer = getBridgeSigner(privateKey, "polygon");
  const lockbox = getLockboxContract(signer);
  const tx = await lockbox.release(release.recipient, release.amount, release.nonce, release.deadline, release.signatures);
  const receipt = await tx.wait();
  updateBridgeOperation(operation.id, {
    status: "confirmed",
    stageLabel: "USDT claimed on Polygon",
    claimTxHash: String(tx.hash),
    txType: "claim",
  });
  saveBridgeActivity({ ...operation, status: "confirmed", stageLabel: "USDT claimed on Polygon", claimTxHash: String(tx.hash) }, String(tx.hash), "confirmed", true);
  return { hash: String(tx.hash), receipt };
}

export function getBridgeOperations(address?: string): BridgeOperation[] {
  try {
    const raw = JSON.parse(localStorage.getItem(BRIDGE_OPERATIONS_KEY) || "[]");
    const list = Array.isArray(raw) ? raw : [];
    const filtered = address
      ? list.filter((item: BridgeOperation) => item.walletAddress?.toLowerCase() === address.toLowerCase() || item.destination?.toLowerCase() === address.toLowerCase())
      : list;
    return filtered.sort((a: BridgeOperation, b: BridgeOperation) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  } catch {
    return [];
  }
}

export function updateBridgeOperation(id: string, patch: Partial<BridgeOperation>) {
  const current = getBridgeOperations();
  const next = current.map((item) => (item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item));
  localStorage.setItem(BRIDGE_OPERATIONS_KEY, JSON.stringify(next));
}

export async function verifyBridgeOperations(address?: string) {
  const operations = getBridgeOperations(address).filter((item) => item.status === "pending" || item.status === "ready_to_claim");
  if (!operations.length) return [] as BridgeOperation[];

  const updates: BridgeOperation[] = [];
  const executorProvider = getInriBridgeProvider();
  const lockboxProvider = getPolygonBridgeProvider();
  const lockboxIface = new ethers.Interface(LOCKBOX_ABI);
  const executorIface = new ethers.Interface(EXECUTOR_ABI);

  for (const item of operations) {
    try {
      if (item.direction === "polygon_to_inri" && item.depositId) {
        try {
          await fetchMintClaim(item.depositId);
          if (item.status !== "ready_to_claim") {
            updateBridgeOperation(item.id, { status: "ready_to_claim", stageLabel: "Claim ready • receive iUSD on INRI" });
            updates.push({ ...item, status: "ready_to_claim", stageLabel: "Claim ready • receive iUSD on INRI" });
            continue;
          }
        } catch {}
        const receipt = item.sourceTxHash ? await lockboxProvider.getTransactionReceipt(item.sourceTxHash).catch(() => null) : null;
        const fromBlock = receipt?.blockNumber ? Math.max(0, Number(receipt.blockNumber) - 5) : 0;
        const logs = await executorProvider.getLogs({
          address: INRI_EXECUTOR_ADDRESS,
          fromBlock,
          toBlock: "latest",
          topics: [ethers.id("MintFinalized(address,uint256,bytes32,uint256)"), null, item.depositId],
        }).catch(() => []);
        const hit = logs[logs.length - 1];
        if (hit) {
          updateBridgeOperation(item.id, {
            status: "confirmed",
            stageLabel: "Mint finalized on INRI",
            claimTxHash: hit.transactionHash,
            txType: "claim",
          });
          if (!item.claimTxHash) {
            saveBridgeActivity({ ...item, claimTxHash: hit.transactionHash, stageLabel: "Mint finalized on INRI" }, hit.transactionHash, "confirmed", true);
          }
          updates.push({ ...item, status: "confirmed", stageLabel: "Mint finalized on INRI", claimTxHash: hit.transactionHash });
          continue;
        }
      }

      if (item.direction === "inri_to_polygon" && item.burnId) {
        try {
          await fetchReleaseClaim(item.burnId);
          if (item.status !== "ready_to_claim") {
            updateBridgeOperation(item.id, { status: "ready_to_claim", stageLabel: "Claim ready • receive USDT on Polygon" });
            updates.push({ ...item, status: "ready_to_claim", stageLabel: "Claim ready • receive USDT on Polygon" });
            continue;
          }
        } catch {}
        const receipt = item.sourceTxHash ? await executorProvider.getTransactionReceipt(item.sourceTxHash).catch(() => null) : null;
        const fromBlock = receipt?.blockNumber ? Math.max(0, Number(receipt.blockNumber) - 5) : 0;
        const logs = await lockboxProvider.getLogs({
          address: POLYGON_LOCKBOX_ADDRESS,
          fromBlock,
          toBlock: "latest",
          topics: [ethers.id("Released(address,uint256,uint256)"), ethers.zeroPadValue(item.destination, 32)],
        }).catch(() => []);
        let matchedHash = "";
        for (const log of logs as any[]) {
          try {
            const parsed = lockboxIface.parseLog(log);
            if (parsed?.name === "Released" && item.burnNonce != null && Number(parsed.args?.nonce) === Number(item.burnNonce)) {
              matchedHash = log.transactionHash;
              break;
            }
          } catch {}
        }
        if (matchedHash) {
          updateBridgeOperation(item.id, {
            status: "confirmed",
            stageLabel: "Release finalized on Polygon",
            claimTxHash: matchedHash,
            txType: "claim",
          });
          if (!item.claimTxHash) {
            saveBridgeActivity({ ...item, claimTxHash: matchedHash, stageLabel: "Release finalized on Polygon" }, matchedHash, "confirmed", true);
          }
          updates.push({ ...item, status: "confirmed", stageLabel: "Release finalized on Polygon", claimTxHash: matchedHash });
          continue;
        }
      }
    } catch {
      // keep operation pending
    }
  }

  return updates;
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
  const feePercent = route.bridgeFeePercent || DEFAULT_BRIDGE_FEE_BPS / 100;
  const amountText = ethers.formatUnits(input.amount, 6);
  const quote = estimateBridgeQuote(input.direction, amountText, feePercent);
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
    feePercent,
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

function saveApprovalActivity(args: {
  direction: BridgeDirection;
  hash: string;
  walletAddress: string;
  tokenSymbol: string;
  spender: string;
  networkKey: "polygon" | "inri";
  networkName: string;
  amount: bigint;
}) {
  try {
    const raw = JSON.parse(localStorage.getItem(BRIDGE_ACTIVITY_KEY) || "[]");
    const current = Array.isArray(raw) ? raw : [];
    const activity = {
      hash: args.hash,
      type: "approve",
      symbol: args.tokenSymbol,
      amount: ethers.formatUnits(args.amount, 6),
      to: args.spender,
      from: args.walletAddress,
      createdAt: new Date().toISOString(),
      status: "confirmed",
      networkKey: args.networkKey,
      networkName: args.networkName,
      chainId: args.networkKey,
      gasUsed: "-",
      gasPriceGwei: "-",
      feeNative: "-",
      priority: "normal",
      method: "approve",
      dappName: "INRI Bridge",
      bridgeDirection: args.direction === "polygon_to_inri" ? "Polygon → INRI" : "INRI → Polygon",
      bridgeStatusLabel: `Approve ${args.tokenSymbol} confirmed`,
      mode: "live",
    };
    localStorage.setItem(BRIDGE_ACTIVITY_KEY, JSON.stringify([activity, ...current].slice(0, 300)));
  } catch {}
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
      method: isClaim ? "claim" : operation.direction === "polygon_to_inri" ? "deposit" : "burn",
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
        if (parsed?.name === "Deposited") return String(parsed.args?.depositId || "");
      } catch {}
    }
  } catch {}
  return null;
}


function readBurnIdFromReceipt(receipt: any, owner: string, expectedAmount: bigint): string | null {
  try {
    const iface = new ethers.Interface(IUSD_BRIDGE_ABI);
    const zero = "0x0000000000000000000000000000000000000000";
    for (const log of receipt?.logs || []) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name !== "Transfer") continue;
        const from = String(parsed.args?.from || "").toLowerCase();
        const to = String(parsed.args?.to || "").toLowerCase();
        const value = BigInt(parsed.args?.value || 0);
        if (from === String(owner || "").toLowerCase() && to === zero && value === expectedAmount) {
          return ethers.keccak256(ethers.solidityPacked(["address", "uint256", "bytes32"], [owner, value, receipt.hash]));
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
