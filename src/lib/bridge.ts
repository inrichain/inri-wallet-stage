const BRIDGE_ACTIVITY_KEY = "wallet_activity_demo";
const BRIDGE_OPERATIONS_KEY = "wallet_bridge_operations_v1";

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
  sourceContractAddress?: string;
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

export type BridgeExecutionResult = {
  operation: BridgeOperation;
  activityHash: string;
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
    bridgeFeePercent: 0.2,
    estimatedMinutes: 3,
    sourceMethod: "deposit",
    claimMethod: "mint",
  },
  inri_to_polygon: {
    direction: "inri_to_polygon",
    fromNetworkKey: "inri",
    toNetworkKey: "polygon",
    fromNetworkName: "INRI",
    toNetworkName: "Polygon",
    fromSymbol: "iUSD",
    toSymbol: "USDT",
    bridgeFeePercent: 0.2,
    estimatedMinutes: 8,
    sourceMethod: "withdraw",
    claimMethod: "release",
  },
};

export function getBridgeRoute(direction: BridgeDirection) {
  return ROUTES[direction];
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

export function estimateBridgeQuote(direction: BridgeDirection, amountText: string): BridgeQuote {
  const route = getBridgeRoute(direction);
  const amount = Number(amountText || "0");
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const feeAmount = safeAmount * (route.bridgeFeePercent / 100);
  const amountOut = Math.max(0, safeAmount - feeAmount);

  return {
    amountIn: safeAmount > 0 ? safeAmount.toFixed(6) : "0.000000",
    amountOut: amountOut > 0 ? amountOut.toFixed(6) : "0.000000",
    feeAmount: feeAmount > 0 ? feeAmount.toFixed(6) : "0.000000",
    feePercent: route.bridgeFeePercent,
    etaLabel: formatEta(route.estimatedMinutes),
    statusText: route.direction === "polygon_to_inri" ? "Deposit → Mint" : "Burn → Release",
    route,
  };
}

export async function submitBridgeOperation(input: {
  direction: BridgeDirection;
  amount: string;
  destination: string;
  walletAddress: string;
}): Promise<BridgeExecutionResult> {
  const quote = estimateBridgeQuote(input.direction, input.amount);
  const route = quote.route;
  const now = new Date().toISOString();
  const hash = fakeHash();

  const operation: BridgeOperation = {
    id: "bridge_" + Date.now() + "_" + Math.random().toString(16).slice(2, 8),
    direction: input.direction,
    fromNetworkKey: route.fromNetworkKey,
    toNetworkKey: route.toNetworkKey,
    fromNetworkName: route.fromNetworkName,
    toNetworkName: route.toNetworkName,
    fromSymbol: route.fromSymbol,
    toSymbol: route.toSymbol,
    amountIn: quote.amountIn,
    amountOut: quote.amountOut,
    feePercent: quote.feePercent,
    destination: input.destination,
    walletAddress: input.walletAddress,
    createdAt: now,
    updatedAt: now,
    status: route.direction === "inri_to_polygon" ? "ready_to_claim" : "confirmed",
    stageLabel:
      route.direction === "inri_to_polygon"
        ? "Ready to claim on destination"
        : "Bridge confirmed on destination",
    etaLabel: quote.etaLabel,
    sourceTxHash: hash,
    contractAddress: route.sourceContractAddress,
    claimContractAddress: route.claimContractAddress,
    mode: "mock",
  };

  saveBridgeOperation(operation);
  saveBridgeActivity(operation, hash, route.direction === "inri_to_polygon" ? "pending" : "confirmed");

  return { operation, activityHash: hash };
}

export async function claimBridgeOperation(operationId: string): Promise<BridgeOperation | null> {
  const list = getBridgeOperations();
  const current = list.find((item) => item.id === operationId);
  if (!current) return null;

  const claimHash = fakeHash();
  const next: BridgeOperation = {
    ...current,
    status: "claimed",
    stageLabel: "Claim completed",
    updatedAt: new Date().toISOString(),
    claimTxHash: claimHash,
  };

  saveBridgeOperation(next);
  saveBridgeActivity(next, claimHash, "confirmed", true);
  return next;
}

function saveBridgeOperation(operation: BridgeOperation) {
  const current = getBridgeOperations();
  const next = [operation, ...current.filter((item) => item.id !== operation.id)].slice(0, 50);
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
      gasUsed: status === "confirmed" ? "21000" : "pending",
      gasPriceGwei: status === "confirmed" ? "1.2" : "pending",
      feeNative: status === "confirmed" ? "0.000021" : "pending",
      priority: "normal",
      method: isClaim ? "claim" : operation.direction === "polygon_to_inri" ? "deposit" : "withdraw",
      dappName: "INRI Bridge",
      bridgeDirection: `${operation.fromNetworkName} → ${operation.toNetworkName}`,
      bridgeStatusLabel: operation.stageLabel,
      mode: operation.mode,
    };
    localStorage.setItem(BRIDGE_ACTIVITY_KEY, JSON.stringify([activity, ...current].slice(0, 200)));
  } catch {}
}

function fakeHash() {
  const alphabet = "0123456789abcdef";
  let out = "0x";
  for (let i = 0; i < 64; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function formatEta(minutes: number) {
  if (minutes <= 1) return "~1 minute";
  return `~${minutes} minutes`;
}
