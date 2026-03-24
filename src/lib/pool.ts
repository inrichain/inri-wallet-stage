const POOL_API_BASE_KEY = "inri_pool_api_base";

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
  address?: string;
  addressInfoLink?: string;
  explorerBlockLinks?: string[];
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

export type PoolSnapshot = {
  info: PoolInfo;
  blocks: PoolBlock[];
  payments: PoolPayment[];
  performance: PoolPerformancePoint[];
  miner?: MinerDetails | null;
  minerPayments?: MinerPayment[];
  minerPerformance?: MinerPerformanceSample[];
};

export type PoolDashboardData = {
  apiBase: string;
  fetchedAt: number;
  pools: PoolSnapshot[];
};

function browserOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function getDefaultPoolApiBase() {
  const envBase = (import.meta as any).env?.VITE_POOL_API_BASE as string | undefined;
  if (envBase?.trim()) return sanitizePoolApiBase(envBase);
  const origin = browserOrigin();
  return origin ? `${origin.replace(/\/$/, "")}/api` : "";
}

export function sanitizePoolApiBase(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/$/, "");
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

async function fetchJson<T>(url: string, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

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

function normalizeMinerDetails(input: any): MinerDetails | null {
  if (!input) return null;
  if (input.result && typeof input.result === "object") return input.result as MinerDetails;
  return input as MinerDetails;
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function buildUrl(base: string, path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(`${sanitizePoolApiBase(base)}${path}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

export async function loadPoolDashboardData(address?: string, customBase?: string): Promise<PoolDashboardData> {
  const apiBase = sanitizePoolApiBase(customBase || getStoredPoolApiBase());
  if (!apiBase) {
    throw new Error("Pool API base is not configured yet.");
  }

  const poolsPayload = await fetchJson<{ pools?: PoolInfo[] }>(buildUrl(apiBase, "/pools"));
  const poolInfos = normalizeArray<PoolInfo>(poolsPayload?.pools);

  const pools = await Promise.all(
    poolInfos.map(async (info) => {
      const poolId = info.id;
      const [blocks, payments, performance, miner, minerPayments, minerPerformance] = await Promise.all([
        safeFetch<PoolBlock[]>(buildUrl(apiBase, `/pools/${poolId}/blocks`, { page: 0, pageSize: 20 })),
        safeFetch<PoolPayment[]>(buildUrl(apiBase, `/pools/${poolId}/payments`, { page: 0, pageSize: 20 })),
        safeFetch<{ stats?: PoolPerformancePoint[] } | PoolPerformancePoint[]>(buildUrl(apiBase, `/pools/${poolId}/performance`)),
        address ? safeFetch<any>(buildUrl(apiBase, `/pools/${poolId}/miners/${address}`)) : Promise.resolve(null),
        address ? safeFetch<MinerPayment[]>(buildUrl(apiBase, `/pools/${poolId}/miners/${address}/payments`, { page: 0, pageSize: 20 })) : Promise.resolve(null),
        address ? safeFetch<{ stats?: MinerPerformanceSample[] } | MinerPerformanceSample[]>(buildUrl(apiBase, `/pools/${poolId}/miners/${address}/performance`)) : Promise.resolve(null),
      ]);

      return {
        info,
        blocks: normalizeArray<PoolBlock>(blocks),
        payments: normalizeArray<PoolPayment>(payments),
        performance: normalizeArray<PoolPerformancePoint>((performance as any)?.stats || performance),
        miner: normalizeMinerDetails(miner),
        minerPayments: normalizeArray<MinerPayment>(minerPayments),
        minerPerformance: normalizeArray<MinerPerformanceSample>((minerPerformance as any)?.stats || minerPerformance),
      } satisfies PoolSnapshot;
    })
  );

  return {
    apiBase,
    fetchedAt: Date.now(),
    pools,
  };
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
