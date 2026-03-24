import { getStoredNetwork } from "./network";

export type PoolMode = "pplns" | "solo";
export type PoolBlockStatus = "pending" | "confirmed" | "orphaned";
export type PoolTrendPoint = { ts: number; poolHashrate: number; networkHashrate: number };
export type PoolBlock = {
  id: string;
  height: number;
  miner: string;
  reward: number;
  status: PoolBlockStatus;
  mode: PoolMode;
  confirmations: number;
  effort: number;
  createdAt: number;
  txHash?: string;
};
export type PoolPayment = {
  id: string;
  address: string;
  amount: number;
  txHash: string;
  createdAt: number;
  mode: PoolMode;
  isFeeWallet?: boolean;
};
export type PoolMinerRow = { address: string; hashrate: number; workers: number; paid: number; pending: number };
export type PoolWorkerRow = { name: string; miner: string; hashrate: number; online: boolean; lastSeenAt: number };
export type PoolOverview = {
  poolStatus: "online" | "degraded" | "offline";
  nodeStatus: "synced" | "syncing" | "offline";
  feePercent: number;
  feeWallet: string;
  minPayout: number;
  currentHeight: number;
  poolHashrate: number;
  networkHashrate: number;
  difficulty: number;
  activeMiners: number;
  activeWorkers: number;
  pplnsPort: number;
  soloPort: number;
  tlsPort?: number;
  stratumHost: string;
  trend: PoolTrendPoint[];
};
export type PoolMinerStats = {
  address: string;
  currentHashrate: number;
  avg10m: number;
  avg1h: number;
  avg24h: number;
  pending: number;
  totalPaid: number;
  lastPaymentAt?: number;
  validShares: number;
  invalidShares: number;
  blocksFound: number;
  workers: PoolWorkerRow[];
  payments: PoolPayment[];
  blocks: PoolBlock[];
};
export type PoolSnapshot = {
  overview: PoolOverview;
  blocks: PoolBlock[];
  payments: PoolPayment[];
  topMiners: PoolMinerRow[];
  topWorkers: PoolWorkerRow[];
  miner: PoolMinerStats | null;
};

const DEFAULT_FEE_WALLET = (import.meta as any).env?.VITE_POOL_FEE_WALLET || "0x119B51608D139342baB20bFF0654F275FFbbaAD0";
const DEFAULT_API_BASE = ((import.meta as any).env?.VITE_POOL_API_BASE || "").replace(/\/$/, "");
const DEFAULT_EXPLORER_BASE = (import.meta as any).env?.VITE_POOL_EXPLORER_BASE || "https://explorer.inri.life";
const DEFAULT_STRATUM_HOST = (import.meta as any).env?.VITE_POOL_STRATUM_HOST || "pool.inri.life";
const DEFAULT_PPLNS_PORT = Number((import.meta as any).env?.VITE_POOL_PPLNS_PORT || 3032);
const DEFAULT_SOLO_PORT = Number((import.meta as any).env?.VITE_POOL_SOLO_PORT || 3033);
const DEFAULT_TLS_PORT = Number((import.meta as any).env?.VITE_POOL_TLS_PORT || 3034);
const DEFAULT_FEE_PERCENT = Number((import.meta as any).env?.VITE_POOL_FEE_PERCENT || 2);
const DEFAULT_MIN_PAYOUT = Number((import.meta as any).env?.VITE_POOL_MIN_PAYOUT || 10);

function shortHash(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash;
}

function makeTrend(seed: number): PoolTrendPoint[] {
  const now = Date.now();
  return Array.from({ length: 18 }).map((_, idx) => {
    const wave = Math.sin((idx + seed % 5) / 2.4) * 0.06;
    const bump = ((seed % 17) / 100) * (idx / 18);
    const poolHashrate = 3.15e14 * (1 + wave + bump) + idx * 2.4e12;
    const networkHashrate = 8.6e15 * (1 + Math.cos(idx / 4.2) * 0.025);
    return { ts: now - (17 - idx) * 300000, poolHashrate, networkHashrate };
  });
}

function fallbackBlocks(seed: number): PoolBlock[] {
  const baseHeight = 1286400 + (seed % 120);
  return Array.from({ length: 10 }).map((_, idx) => {
    const mode: PoolMode = idx % 4 === 0 ? "solo" : "pplns";
    const status: PoolBlockStatus = idx === 0 ? "pending" : idx % 7 === 0 ? "orphaned" : "confirmed";
    return {
      id: `blk-${baseHeight - idx}`,
      height: baseHeight - idx,
      miner: idx % 3 === 0 ? DEFAULT_FEE_WALLET : `0x${(seed + idx).toString(16).padStart(40, "0").slice(-40)}`,
      reward: 2,
      status,
      mode,
      confirmations: status === "pending" ? 2 + idx : 40 + idx * 8,
      effort: 88 + (idx * 9) % 36,
      createdAt: Date.now() - idx * 1000 * 60 * 22,
      txHash: `0x${(seed + idx * 77).toString(16).padStart(64, "0").slice(-64)}`,
    };
  });
}

function fallbackPayments(seed: number, minerAddress: string): PoolPayment[] {
  return Array.from({ length: 14 }).map((_, idx) => {
    const mine = idx % 5 === 0;
    const fee = idx % 6 === 0;
    return {
      id: `pay-${idx}`,
      address: fee ? DEFAULT_FEE_WALLET : mine ? minerAddress : `0x${(seed * 3 + idx).toString(16).padStart(40, "0").slice(-40)}`,
      amount: Number((0.9 + (idx % 4) * 0.34).toFixed(4)),
      txHash: `0x${(seed + idx * 123).toString(16).padStart(64, "0").slice(-64)}`,
      createdAt: Date.now() - idx * 1000 * 60 * 55,
      mode: idx % 4 === 0 ? "solo" : "pplns",
      isFeeWallet: fee,
    };
  });
}

function fallbackTopMiners(seed: number): PoolMinerRow[] {
  return Array.from({ length: 8 }).map((_, idx) => ({
    address: idx === 0 ? DEFAULT_FEE_WALLET : `0x${(seed * 5 + idx).toString(16).padStart(40, "0").slice(-40)}`,
    hashrate: 9.3e13 - idx * 7.2e12,
    workers: 12 - idx,
    paid: Number((93 - idx * 7.2).toFixed(2)),
    pending: Number((4.6 - idx * 0.25).toFixed(3)),
  }));
}

function fallbackTopWorkers(seed: number): PoolWorkerRow[] {
  return Array.from({ length: 8 }).map((_, idx) => ({
    name: `rig-${idx + 1}`,
    miner: `0x${(seed * 7 + idx).toString(16).padStart(40, "0").slice(-40)}`,
    hashrate: 1.8e13 - idx * 1.35e12,
    online: idx !== 6,
    lastSeenAt: Date.now() - idx * 1000 * 60 * 3,
  }));
}

function fallbackMiner(seed: number, address: string): PoolMinerStats {
  const payments = fallbackPayments(seed, address).filter((item) => item.address.toLowerCase() === address.toLowerCase()).slice(0, 5);
  const blocks = fallbackBlocks(seed).filter((item) => item.miner.toLowerCase() === address.toLowerCase()).slice(0, 4);
  const workers = [
    { name: `${address.slice(2, 6)}-alpha`, miner: address, hashrate: 1.45e13, online: true, lastSeenAt: Date.now() - 1000 * 55 },
    { name: `${address.slice(2, 6)}-beta`, miner: address, hashrate: 1.16e13, online: true, lastSeenAt: Date.now() - 1000 * 120 },
    { name: `${address.slice(2, 6)}-gamma`, miner: address, hashrate: 8.7e12, online: seed % 3 !== 0, lastSeenAt: Date.now() - 1000 * 350 },
  ];
  return {
    address,
    currentHashrate: workers.reduce((sum, item) => sum + item.hashrate, 0),
    avg10m: 3.42e13,
    avg1h: 3.18e13,
    avg24h: 2.95e13,
    pending: 6.8421,
    totalPaid: 194.2264,
    lastPaymentAt: payments[0]?.createdAt,
    validShares: 184422,
    invalidShares: 943,
    blocksFound: blocks.length || 2,
    workers,
    payments,
    blocks,
  };
}

function fallbackSnapshot(address?: string): PoolSnapshot {
  const minerAddress = address || DEFAULT_FEE_WALLET;
  const seed = shortHash(minerAddress + new Date().toISOString().slice(0, 13));
  const overview: PoolOverview = {
    poolStatus: "online",
    nodeStatus: "synced",
    feePercent: DEFAULT_FEE_PERCENT,
    feeWallet: DEFAULT_FEE_WALLET,
    minPayout: DEFAULT_MIN_PAYOUT,
    currentHeight: 1286400 + (seed % 100),
    poolHashrate: 3.58e14,
    networkHashrate: 8.97e15,
    difficulty: 4.28e15,
    activeMiners: 184,
    activeWorkers: 642,
    pplnsPort: DEFAULT_PPLNS_PORT,
    soloPort: DEFAULT_SOLO_PORT,
    tlsPort: DEFAULT_TLS_PORT,
    stratumHost: DEFAULT_STRATUM_HOST,
    trend: makeTrend(seed),
  };
  return {
    overview,
    blocks: fallbackBlocks(seed),
    payments: fallbackPayments(seed, minerAddress),
    topMiners: fallbackTopMiners(seed),
    topWorkers: fallbackTopWorkers(seed),
    miner: address ? fallbackMiner(seed, address) : null,
  };
}

async function safeJson(url: string) {
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function fetchPoolSnapshot(address?: string): Promise<PoolSnapshot> {
  if (!DEFAULT_API_BASE) return fallbackSnapshot(address);
  try {
    const [overview, blocks, payments, topMiners, topWorkers, miner] = await Promise.all([
      safeJson(`${DEFAULT_API_BASE}/api/pool/overview`),
      safeJson(`${DEFAULT_API_BASE}/api/pool/blocks`),
      safeJson(`${DEFAULT_API_BASE}/api/pool/payments`),
      safeJson(`${DEFAULT_API_BASE}/api/pool/top-miners`),
      safeJson(`${DEFAULT_API_BASE}/api/pool/top-workers`),
      address ? safeJson(`${DEFAULT_API_BASE}/api/pool/miner/${address}`) : Promise.resolve(null),
    ]);
    return { overview, blocks, payments, topMiners, topWorkers, miner } as PoolSnapshot;
  } catch {
    return fallbackSnapshot(address);
  }
}

export function formatHashrate(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 H/s";
  const units = ["H/s", "KH/s", "MH/s", "GH/s", "TH/s", "PH/s", "EH/s"];
  let unit = 0;
  let current = value;
  while (current >= 1000 && unit < units.length - 1) {
    current /= 1000;
    unit += 1;
  }
  return `${current >= 100 ? current.toFixed(0) : current >= 10 ? current.toFixed(1) : current.toFixed(2)} ${units[unit]}`;
}

export function formatINRI(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })} INRI`;
}

export function timeAgo(ts?: number) {
  if (!ts) return "—";
  const diff = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function shortAddress(address?: string) {
  if (!address) return "—";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function poolTxUrl(hash?: string) {
  if (!hash) return "";
  return `${DEFAULT_EXPLORER_BASE.replace(/\/$/, "")}/tx/${hash}`;
}

export function poolAddressUrl(address?: string) {
  if (!address) return "";
  return `${DEFAULT_EXPLORER_BASE.replace(/\/$/, "")}/address/${address}`;
}

export function payoutProgress(minPending: number, pending: number) {
  if (!minPending || minPending <= 0) return 1;
  return Math.max(0, Math.min(1, pending / minPending));
}

export function getPoolMeta() {
  const network = getStoredNetwork();
  return {
    feeWallet: DEFAULT_FEE_WALLET,
    feePercent: DEFAULT_FEE_PERCENT,
    apiBase: DEFAULT_API_BASE,
    explorerBase: DEFAULT_EXPLORER_BASE,
    host: DEFAULT_STRATUM_HOST,
    pplnsPort: DEFAULT_PPLNS_PORT,
    soloPort: DEFAULT_SOLO_PORT,
    tlsPort: DEFAULT_TLS_PORT,
    minPayout: DEFAULT_MIN_PAYOUT,
    network,
  };
}
