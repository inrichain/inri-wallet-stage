const POOL_API_BASE_KEY = "inri_pool_api_base";
const POOL_EXPLORER_BASE_KEY = "inri_pool_explorer_base";
const POOL_CACHE_KEY = "inri_pool_cached_dashboard";

export type PoolPortInfo = {
  difficulty?: number;
  name?: string;
  tls?: boolean;
  varDiff?: {
    minDiff?: number;
    maxDiff?: number;
    targetTime?: number;
    retargetTime?: number;
    variancePercent?: number;
  };
};

export type PoolRewardRecipient = {
  address?: string;
  percentage?: number;
};

export type PoolInfo = {
  id: string;
  coin?: { type?: string; name?: string; symbol?: string };
  ports?: Record<string, PoolPortInfo>;
  paymentProcessing?: {
    enabled?: boolean;
    minimumPayment?: number;
    payoutScheme?: string;
    payoutSchemeConfig?: { factor?: number };
  };
  poolFeePercent?: number;
  rewardRecipients?: PoolRewardRecipient[];
  beneficiaries?: PoolRewardRecipient[];
  address?: string;
  addressInfoLink?: string;
  explorerBlockLinks?: string[];
  explorerTxLink?: string;
  poolStats?: {
    connectedMiners?: number;
    connectedWorkers?: number;
    poolHashRate?: number;
    validSharesPerSecond?: number;
  };
  networkStats?: {
    networkType?: string;
    networkHashRate?: number;
    networkDifficulty?: number;
    lastNetworkBlockTime?: string;
    blockHeight?: number;
    connectedPeers?: number;
    rewardType?: string;
  };
};

export type PoolBlock = {
  blockHeight?: number;
  status?: string;
  effort?: number;
  confirmationProgress?: number;
  transactionConfirmationData?: string;
  reward?: number;
  infoLink?: string;
  created?: string;
  miner?: string;
  type?: string;
};

export type PoolPayment = {
  coin?: string;
  address?: string;
  addressInfoLink?: string;
  amount?: number;
  transactionConfirmationData?: string;
  transactionInfoLink?: string;
  created?: string;
};

export type PoolPerformancePoint = {
  poolHashRate?: number;
  connectedMiners?: number;
  created?: string;
};

export type WorkerPerformancePoint = {
  hashrate?: number;
  sharesPerSecond?: number;
};

export type MinerDetails = {
  pendingShares?: number;
  pendingBalance?: number;
  totalPaid?: number;
  lastPayment?: string | number | null;
  lastPaymentLink?: string | null;
  performance?: {
    created?: string;
    workers?: Record<string, WorkerPerformancePoint>;
  };
};

export type MinerPayment = PoolPayment;

export type MinerPerformanceSample = {
  created?: string;
  workers?: Record<string, WorkerPerformancePoint>;
};

export type PoolTopMiner = {
  miner?: string;
  address?: string;
  hashrate?: number;
  sharesPerSecond?: number;
  connectedWorkers?: number;
  pendingBalance?: number;
};

export type PoolSnapshot = {
  info: PoolInfo;
  blocks: PoolBlock[];
  payments: PoolPayment[];
  performance: PoolPerformancePoint[];
  topMiners: PoolTopMiner[];
  miner?: MinerDetails | null;
  minerPayments?: MinerPayment[];
  minerPerformance?: MinerPerformanceSample[];
};

export type PoolDashboardData = {
  apiBase: string;
  explorerBase: string;
  fetchedAt: number;
  pools: PoolSnapshot[];
};

function browserOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function sanitizePoolApiBase(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/$/, "");
}

export function getDefaultPoolApiBase() {
  const envBase = (import.meta as any).env?.VITE_POOL_API_BASE as string | undefined;
  if (envBase?.trim()) return sanitizePoolApiBase(envBase);
  const origin = browserOrigin();
  return origin ? `${origin.replace(/\/$/, "")}/api` : "";
}

export function getStoredPoolApiBase() {
  if (typeof window === "undefined") return getDefaultPoolApiBase();
  const saved = window.localStorage.getItem(POOL_API_BASE_KEY);
  return sanitizePoolApiBase(saved || getDefaultPoolApiBase());
}

export function saveStoredPoolApiBase(value: string) {
  if (typeof window === "undefined") return;
  const next = sanitizePoolApiBase(value);
  if (next) window.localStorage.setItem(POOL_API_BASE_KEY, next);
  else window.localStorage.removeItem(POOL_API_BASE_KEY);
}

export function sanitizeExplorerBase(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/$/, "");
}

export function getDefaultExplorerBase() {
  const envBase = (import.meta as any).env?.VITE_EXPLORER_BASE as string | undefined;
  if (envBase?.trim()) return sanitizeExplorerBase(envBase);
  return "https://explorer.inri.life";
}

export function getStoredExplorerBase() {
  if (typeof window === "undefined") return getDefaultExplorerBase();
  const saved = window.localStorage.getItem(POOL_EXPLORER_BASE_KEY);
  return sanitizeExplorerBase(saved || getDefaultExplorerBase());
}

export function saveStoredExplorerBase(value: string) {
  if (typeof window === "undefined") return;
  const next = sanitizeExplorerBase(value);
  if (next) window.localStorage.setItem(POOL_EXPLORER_BASE_KEY, next);
  else window.localStorage.removeItem(POOL_EXPLORER_BASE_KEY);
}

async function fetchJson<T>(url: string, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    return await fetchJson<T>(url);
  } catch {
    return null;
  }
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeMinerDetails(input: any): MinerDetails | null {
  if (!input) return null;
  if (input.result && typeof input.result === "object") return input.result as MinerDetails;
  return input as MinerDetails;
}

function normalizeTopMiners(input: any): PoolTopMiner[] {
  if (!input) return [];
  if (Array.isArray(input)) return input as PoolTopMiner[];
  if (Array.isArray(input.miners)) return input.miners as PoolTopMiner[];
  if (Array.isArray(input.result)) return input.result as PoolTopMiner[];
  return [];
}

function buildUrl(base: string, path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(`${sanitizePoolApiBase(base)}${path}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

function writeCache(payload: PoolDashboardData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(POOL_CACHE_KEY, JSON.stringify(payload));
  } catch {}
}

export function readCachedPoolDashboard(): PoolDashboardData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(POOL_CACHE_KEY);
    return raw ? (JSON.parse(raw) as PoolDashboardData) : null;
  } catch {
    return null;
  }
}

export async function loadPoolDashboardData(address?: string, customBase?: string, customExplorer?: string): Promise<PoolDashboardData> {
  const apiBase = sanitizePoolApiBase(customBase || getStoredPoolApiBase());
  const explorerBase = sanitizeExplorerBase(customExplorer || getStoredExplorerBase());
  if (!apiBase) throw new Error("Pool API base is not configured yet.");

  const poolsPayload = await fetchJson<{ pools?: PoolInfo[] }>(buildUrl(apiBase, "/pools"));
  const poolInfos = normalizeArray<PoolInfo>(poolsPayload?.pools);

  const pools = await Promise.all(
    poolInfos.map(async (info) => {
      const poolId = info.id;
      const [blocks, payments, performance, topMiners, miner, minerPayments, minerPerformance] = await Promise.all([
        safeFetch<PoolBlock[]>(buildUrl(apiBase, `/pools/${poolId}/blocks`, { page: 0, pageSize: 24 })),
        safeFetch<PoolPayment[]>(buildUrl(apiBase, `/pools/${poolId}/payments`, { page: 0, pageSize: 24 })),
        safeFetch<{ stats?: PoolPerformancePoint[] } | PoolPerformancePoint[]>(buildUrl(apiBase, `/pools/${poolId}/performance`)),
        safeFetch<any>(buildUrl(apiBase, `/pools/${poolId}/miners`, { page: 0, pageSize: 12 })),
        address ? safeFetch<any>(buildUrl(apiBase, `/pools/${poolId}/miners/${address}`)) : Promise.resolve(null),
        address ? safeFetch<MinerPayment[]>(buildUrl(apiBase, `/pools/${poolId}/miners/${address}/payments`, { page: 0, pageSize: 24 })) : Promise.resolve(null),
        address ? safeFetch<{ stats?: MinerPerformanceSample[] } | MinerPerformanceSample[]>(buildUrl(apiBase, `/pools/${poolId}/miners/${address}/performance`)) : Promise.resolve(null),
      ]);

      const snapshot: PoolSnapshot = {
        info,
        blocks: normalizeArray<PoolBlock>(blocks).map((item) => ({
          ...item,
          infoLink: item?.infoLink || buildBlockLink(explorerBase, item?.blockHeight),
        })),
        payments: normalizeArray<PoolPayment>(payments).map((item) => ({
          ...item,
          addressInfoLink: item?.addressInfoLink || buildAddressLink(explorerBase, item?.address),
          transactionInfoLink: item?.transactionInfoLink || buildTxLink(explorerBase, item?.transactionConfirmationData),
        })),
        performance: normalizeArray<PoolPerformancePoint>((performance as any)?.stats || performance),
        topMiners: normalizeTopMiners(topMiners),
        miner: normalizeMinerDetails(miner),
        minerPayments: normalizeArray<MinerPayment>(minerPayments).map((item) => ({
          ...item,
          addressInfoLink: item?.addressInfoLink || buildAddressLink(explorerBase, item?.address),
          transactionInfoLink: item?.transactionInfoLink || buildTxLink(explorerBase, item?.transactionConfirmationData),
        })),
        minerPerformance: normalizeArray<MinerPerformanceSample>((minerPerformance as any)?.stats || minerPerformance),
      };

      return snapshot;
    })
  );

  const payload: PoolDashboardData = {
    apiBase,
    explorerBase,
    fetchedAt: Date.now(),
    pools,
  };

  writeCache(payload);
  return payload;
}

export function formatHashrate(value?: number) {
  if (!value || value <= 0) return "0 H/s";
  const units = ["H/s", "KH/s", "MH/s", "GH/s", "TH/s", "PH/s"];
  let index = 0;
  let current = value;
  while (current >= 1000 && index < units.length - 1) {
    current /= 1000;
    index += 1;
  }
  const decimals = current >= 100 ? 0 : current >= 10 ? 1 : 2;
  return `${current.toFixed(decimals)} ${units[index]}`;
}

export function formatPoolAmount(value?: number, symbol = "INRI") {
  if (value === undefined || value === null || Number.isNaN(value)) return `0 ${symbol}`;
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${symbol}`;
}

export function formatPoolDate(value?: string | number | null) {
  if (!value) return "—";
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export function shortenHash(value?: string, chars = 8) {
  if (!value) return "—";
  if (value.length <= chars * 2 + 3) return value;
  return `${value.slice(0, chars)}…${value.slice(-chars)}`;
}

export function computeMinerHashrate(miner?: MinerDetails | null) {
  const workers = miner?.performance?.workers || {};
  return Object.values(workers).reduce((sum, worker) => sum + (worker?.hashrate || 0), 0);
}

export function computeWorkerCount(miner?: MinerDetails | null) {
  return Object.keys(miner?.performance?.workers || {}).length;
}

export function getPoolLabel(pool: PoolInfo) {
  const raw = pool.id || "Pool";
  if (raw.toLowerCase().includes("solo")) return `${raw} · SOLO`;
  if (raw.toLowerCase().includes("pplns")) return `${raw} · PPLNS`;
  return raw;
}

export function getPoolSymbol(pool: PoolInfo) {
  return pool.coin?.symbol || pool.coin?.type || "INRI";
}

export function getRewardRecipients(pool: PoolInfo) {
  return normalizeArray<PoolRewardRecipient>(pool.rewardRecipients || pool.beneficiaries || []);
}

export function getFeeRecipients(pool: PoolInfo) {
  return getRewardRecipients(pool).filter((recipient) => Number(recipient?.percentage || 0) > 0);
}

export function computeAverageEffort(blocks: PoolBlock[]) {
  const values = blocks.map((block) => Number(block.effort || 0)).filter((value) => value > 0);
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function computeBlockStatusBreakdown(blocks: PoolBlock[]) {
  return blocks.reduce(
    (acc, block) => {
      const key = String(block.status || "unknown").toLowerCase();
      if (key === "confirmed") acc.confirmed += 1;
      else if (key === "pending") acc.pending += 1;
      else if (key === "orphaned") acc.orphaned += 1;
      else acc.other += 1;
      return acc;
    },
    { confirmed: 0, pending: 0, orphaned: 0, other: 0 }
  );
}

export function buildAddressLink(explorerBase: string, address?: string) {
  if (!explorerBase || !address) return "";
  return `${sanitizeExplorerBase(explorerBase)}/address/${address}`;
}

export function buildTxLink(explorerBase: string, tx?: string) {
  if (!explorerBase || !tx) return "";
  return `${sanitizeExplorerBase(explorerBase)}/tx/${tx}`;
}

export function buildBlockLink(explorerBase: string, height?: number) {
  if (!explorerBase || height === undefined || height === null) return "";
  return `${sanitizeExplorerBase(explorerBase)}/block/${height}`;
}

export async function copyText(value: string) {
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
