import { getDefaultTokensForNetwork, getNetworkConfig, type TokenItem } from './inri';

const SWAP_ACTIVITY_KEY = 'wallet_activity_demo';
const SWAP_OPERATIONS_KEY = 'wallet_swap_operations_v1';

export type SwapFlowStatus =
  | 'idle'
  | 'reviewing'
  | 'awaiting_wallet'
  | 'pending'
  | 'confirmed'
  | 'failed';

export type SwapOperation = {
  id: string;
  walletAddress: string;
  networkKey: string;
  networkName: string;
  fromSymbol: string;
  toSymbol: string;
  amountIn: string;
  amountOut: string;
  minimumReceived: string;
  slippage: string;
  priceImpact: string;
  routeLabel: string;
  routerName: string;
  routerAddress?: string;
  method: string;
  status: SwapFlowStatus;
  createdAt: string;
  updatedAt: string;
  txHash?: string;
  mode: 'mock' | 'live';
};

export type SwapRouteDefinition = {
  networkKey: string;
  networkName: string;
  fromSymbol: string;
  toSymbol: string;
  routerName: string;
  routerAddress?: string;
  quoteMethod: string;
  swapMethod: string;
  approveRequired: boolean;
  estimatedGasNative: string;
  estimatedGasUsd: string;
  estimatedSeconds: number;
  priceImpact: string;
  path: string[];
};

export type SwapQuote = {
  amountIn: string;
  amountOut: string;
  minimumReceived: string;
  slippage: string;
  priceImpact: string;
  routeLabel: string;
  estimatedGasNative: string;
  estimatedGasUsd: string;
  etaLabel: string;
  requiresApproval: boolean;
  route: SwapRouteDefinition;
};

export function getSwapTokensForNetwork(networkKey?: string): TokenItem[] {
  const tokens = getDefaultTokensForNetwork(networkKey);
  return tokens.filter((x) => ['INRI', 'iUSD', 'WINRI', 'DNR', 'USDT'].includes(x.symbol));
}

export function getDefaultSwapPair(networkKey?: string) {
  const tokens = getSwapTokensForNetwork(networkKey);
  const from = tokens.find((x) => x.symbol === 'INRI') || tokens[0] || null;
  const to = tokens.find((x) => x.symbol === 'iUSD') || tokens.find((x) => x.symbol !== from?.symbol) || tokens[0] || null;
  return { from, to };
}

export function getSwapRoute(networkKey: string, fromSymbol: string, toSymbol: string): SwapRouteDefinition {
  const network = getNetworkConfig(networkKey);
  const pairKey = `${fromSymbol}_${toSymbol}`;

  const routes: Record<string, Partial<SwapRouteDefinition>> = {
    INRI_iUSD: { path: ['INRI', 'WINRI', 'iUSD'], priceImpact: '0.30%', approveRequired: false },
    iUSD_INRI: { path: ['iUSD', 'WINRI', 'INRI'], priceImpact: '0.32%', approveRequired: true },
    INRI_DNR: { path: ['INRI', 'WINRI', 'DNR'], priceImpact: '0.42%', approveRequired: false },
    DNR_INRI: { path: ['DNR', 'WINRI', 'INRI'], priceImpact: '0.44%', approveRequired: true },
    WINRI_iUSD: { path: ['WINRI', 'iUSD'], priceImpact: '0.18%', approveRequired: true },
    iUSD_WINRI: { path: ['iUSD', 'WINRI'], priceImpact: '0.18%', approveRequired: true },
  };

  const specific = routes[pairKey] || {};
  const defaultPath = fromSymbol === toSymbol ? [fromSymbol] : [fromSymbol, toSymbol];

  return {
    networkKey: network.key,
    networkName: network.name,
    fromSymbol,
    toSymbol,
    routerName: network.key === 'inri' ? 'INRI Swap Router' : `${network.name} Router`,
    routerAddress: undefined,
    quoteMethod: 'getAmountsOut',
    swapMethod: fromSymbol === toSymbol ? 'swapExactTokensForTokens' : 'swapExactTokensForTokens',
    approveRequired: fromSymbol !== 'INRI' && fromSymbol !== 'ETH' && fromSymbol !== 'POL' && fromSymbol !== 'BNB' && fromSymbol !== 'AETH' && fromSymbol !== 'OETH',
    estimatedGasNative: network.key === 'inri' ? '0.000042' : '0.000210',
    estimatedGasUsd: '$0.01',
    estimatedSeconds: 12,
    priceImpact: '0.35%',
    path: defaultPath,
    ...specific,
  };
}

export function estimateSwapQuote(input: {
  networkKey: string;
  fromSymbol: string;
  toSymbol: string;
  amountText: string;
  slippageText: string;
}): SwapQuote {
  const route = getSwapRoute(input.networkKey, input.fromSymbol, input.toSymbol);
  const amount = Number(input.amountText || '0');
  const slippage = Number(input.slippageText || '0.5');
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const safeSlippage = Number.isFinite(slippage) && slippage >= 0 ? slippage : 0.5;

  const rate = getPairRate(input.fromSymbol, input.toSymbol);
  const grossOut = safeAmount * rate;
  const lpFeeAdjusted = grossOut * 0.997;
  const minimumReceived = lpFeeAdjusted * (1 - safeSlippage / 100);

  return {
    amountIn: safeAmount > 0 ? safeAmount.toFixed(6) : '0.000000',
    amountOut: lpFeeAdjusted > 0 ? lpFeeAdjusted.toFixed(6) : '0.000000',
    minimumReceived: minimumReceived > 0 ? minimumReceived.toFixed(6) : '0.000000',
    slippage: safeSlippage.toFixed(2),
    priceImpact: route.priceImpact,
    routeLabel: route.path.join(' → '),
    estimatedGasNative: route.estimatedGasNative,
    estimatedGasUsd: route.estimatedGasUsd,
    etaLabel: route.estimatedSeconds <= 15 ? '~1 block' : `~${Math.ceil(route.estimatedSeconds / 15)} blocks`,
    requiresApproval: route.approveRequired,
    route,
  };
}

export function getSwapOperations(address?: string): SwapOperation[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SWAP_OPERATIONS_KEY) || '[]');
    const list = Array.isArray(raw) ? raw : [];
    const filtered = address
      ? list.filter((item: SwapOperation) => item.walletAddress?.toLowerCase() === address.toLowerCase())
      : list;
    return filtered.sort(
      (a: SwapOperation, b: SwapOperation) =>
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
    );
  } catch {
    return [];
  }
}

export async function submitSwapOperation(input: {
  walletAddress: string;
  networkKey: string;
  fromSymbol: string;
  toSymbol: string;
  amountText: string;
  slippageText: string;
}): Promise<{ operation: SwapOperation; txHash: string }> {
  const quote = estimateSwapQuote(input);
  const now = new Date().toISOString();
  const txHash = fakeHash();

  const operation: SwapOperation = {
    id: `swap_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    walletAddress: input.walletAddress,
    networkKey: quote.route.networkKey,
    networkName: quote.route.networkName,
    fromSymbol: quote.route.fromSymbol,
    toSymbol: quote.route.toSymbol,
    amountIn: quote.amountIn,
    amountOut: quote.amountOut,
    minimumReceived: quote.minimumReceived,
    slippage: quote.slippage,
    priceImpact: quote.priceImpact,
    routeLabel: quote.routeLabel,
    routerName: quote.route.routerName,
    routerAddress: quote.route.routerAddress,
    method: quote.route.swapMethod,
    status: 'confirmed',
    createdAt: now,
    updatedAt: now,
    txHash,
    mode: 'mock',
  };

  saveSwapOperation(operation);
  saveSwapActivity(operation);

  return { operation, txHash };
}

function saveSwapOperation(operation: SwapOperation) {
  const current = getSwapOperations();
  const next = [operation, ...current.filter((item) => item.id !== operation.id)].slice(0, 50);
  localStorage.setItem(SWAP_OPERATIONS_KEY, JSON.stringify(next));
}

function saveSwapActivity(operation: SwapOperation) {
  try {
    const raw = JSON.parse(localStorage.getItem(SWAP_ACTIVITY_KEY) || '[]');
    const current = Array.isArray(raw) ? raw : [];
    const activity = {
      hash: operation.txHash,
      type: 'swap',
      symbol: `${operation.fromSymbol} → ${operation.toSymbol}`,
      amount: operation.amountIn,
      to: operation.routerAddress || operation.routerName,
      from: operation.walletAddress,
      createdAt: operation.createdAt,
      status: operation.status,
      networkKey: operation.networkKey,
      networkName: operation.networkName,
      gasUsed: '52000',
      gasPriceGwei: operation.networkKey === 'inri' ? '1.2' : '2.0',
      feeNative: getSwapRoute(operation.networkKey, operation.fromSymbol, operation.toSymbol).estimatedGasNative,
      priority: 'normal',
      method: operation.method,
      dappName: operation.routerName,
      swapRoute: operation.routeLabel,
      amountOut: operation.amountOut,
      minimumReceived: operation.minimumReceived,
      mode: operation.mode,
    };
    localStorage.setItem(SWAP_ACTIVITY_KEY, JSON.stringify([activity, ...current].slice(0, 200)));
  } catch {}
}

function getPairRate(fromSymbol: string, toSymbol: string) {
  if (fromSymbol === toSymbol) return 1;
  const rates: Record<string, number> = {
    INRI_iUSD: 0.95,
    iUSD_INRI: 1.02,
    INRI_DNR: 1.4,
    DNR_INRI: 0.68,
    WINRI_INRI: 1,
    INRI_WINRI: 1,
    WINRI_iUSD: 0.95,
    iUSD_WINRI: 1.02,
    DNR_iUSD: 0.66,
    iUSD_DNR: 1.48,
  };
  return rates[`${fromSymbol}_${toSymbol}`] || 1;
}

function fakeHash() {
  const alphabet = '0123456789abcdef';
  let out = '0x';
  for (let i = 0; i < 64; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
