export type PoolMode = "pplns" | "solo";
export type PoolBlockStatus = "pending" | "confirmed" | "orphaned";

export type PoolOverview = {
  poolOnline: boolean;
  nodeOnline: boolean;
  feePercent: number;
  feeWalletPercent: number;
  feeWalletAddress: string;
  poolHashrate: number;
  networkHashrate: number;
  networkDifficulty: number;
  currentHeight: number;
  activeMiners: number;
  activeWorkers: number;
  pendingBlocks: number;
  confirmedBlocks: number;
  orphanedBlocks: number;
  luckPercent: number;
  effortPercent: number;
  minimumPayout: number;
  chart: Array<{ ts: number; hashrate: number }>;
  modes: Array<{ mode: PoolMode; hashrate: number; miners: number; workers: number }>;
  stratum: {
    host: string;
    pplnsPort: number;
    soloPort: number;
    tlsPort?: number;
    password: string;
  };
};

export type PoolBlock = {
  id: string;
  height: number;
  miner: string;
  reward: number;
  status: PoolBlockStatus;
  mode: PoolMode;
  confirmations: number;
  luckPercent: number;
  effortPercent: number;
  createdAt: number;
  explorerUrl?: string;
};

export type PoolPayment = {
  id: string;
  address: string;
  amount: number;
  txHash: string;
  createdAt: number;
  mode: PoolMode;
  txUrl?: string;
  isFeeWallet?: boolean;
};

export type PoolWorker = {
  id: string;
  name: string;
  hashrate: number;
  avg10m: number;
  avg1h: number;
  avg24h: number;
  status: "online" | "offline";
  lastSeenAt: number;
  validShares: number;
  invalidShares: number;
};

export type PoolMinerStats = {
  address: string;
  currentHashrate: number;
  avg10m: number;
  avg1h: number;
  avg24h: number;
  pendingBalance: number;
  totalPaid: number;
  lastPaymentAmount: number;
  lastPaymentAt: number;
  validShares: number;
  invalidShares: number;
  blocksFound: number;
  payoutProgressPercent: number;
  workersOnline: number;
  workersOffline: number;
  workers: PoolWorker[];
  payments: PoolPayment[];
  blocks: PoolBlock[];
};

export type PoolTopMiner = {
  address: string;
  label: string;
  hashrate: number;
  avg24h: number;
  workers: number;
  mode: PoolMode | "mixed";
  blocksFound: number;
  efficiencyPercent: number;
};

export type PoolTopWorker = {
  name: string;
  miner: string;
  hashrate: number;
  avg24h: number;
  status: "online" | "offline";
};

export type PoolTransparency = {
  walletAddress: string;
  feePercent: number;
  payments: PoolPayment[];
  blocks: PoolBlock[];
};

export type PoolSnapshot = {
  overview: PoolOverview;
  blocks: PoolBlock[];
  payments: PoolPayment[];
  topMiners: PoolTopMiner[];
  topWorkers: PoolTopWorker[];
  miner?: PoolMinerStats | null;
  transparency: PoolTransparency;
  fetchedAt: number;
};

const DEFAULT_BASE = (import.meta as any).env?.VITE_POOL_API_BASE || "/api/pool";
const DEFAULT_FEE_WALLET = (import.meta as any).env?.VITE_POOL_FEE_WALLET || "0x119B51608D139342baB20bFF0654F275FFbbaAD0";
const DEFAULT_EXPLORER = (import.meta as any).env?.VITE_POOL_EXPLORER_BASE || "https://explorer.inri.life";
const DEFAULT_STRATUM_HOST = (import.meta as any).env?.VITE_POOL_STRATUM_HOST || "pool.inri.life";
const DEFAULT_PPLNS_PORT = Number((import.meta as any).env?.VITE_POOL_PPLNS_PORT || 9009);
const DEFAULT_SOLO_PORT = Number((import.meta as any).env?.VITE_POOL_SOLO_PORT || 9010);
const DEFAULT_TLS_PORT = Number((import.meta as any).env?.VITE_POOL_TLS_PORT || 9443);
const DEFAULT_POOL_FEE = Number((import.meta as any).env?.VITE_POOL_FEE_PERCENT || 2);
const DEFAULT_MIN_PAYOUT = Number((import.meta as any).env?.VITE_POOL_MIN_PAYOUT || 5);

function shortAddress(address: string) {
  if (!address) return "Unknown";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function toNumber(value: any, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function ensureArray<T>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

async function readJson(path: string) {
  const response = await fetch(`${DEFAULT_BASE}${path}`, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Pool API ${path} failed: ${response.status}`);
  }
  return response.json();
}

function normalizeOverview(data: any): PoolOverview {
  const modes = ensureArray<any>(data?.modes).map((item) => ({
    mode: (String(item?.mode || "pplns").toLowerCase() === "solo" ? "solo" : "pplns") as PoolMode,
    hashrate: toNumber(item?.hashrate),
    miners: toNumber(item?.miners),
    workers: toNumber(item?.workers),
  }));

  const chart = ensureArray<any>(data?.chart || data?.hashrateChart).map((item, index) => ({
    ts: toNumber(item?.ts || item?.timestamp, Date.now() - (19 - index) * 300000),
    hashrate: toNumber(item?.hashrate || item?.value),
  }));

  return {
    poolOnline: typeof data?.poolOnline === "boolean" ? data.poolOnline : String(data?.status || "online").toLowerCase() !== "offline",
    nodeOnline: data?.nodeOnline ?? true,
    feePercent: toNumber(data?.feePercent, DEFAULT_POOL_FEE),
    feeWalletPercent: toNumber(data?.feeWalletPercent, 2),
    feeWalletAddress: String(data?.feeWalletAddress || DEFAULT_FEE_WALLET),
    poolHashrate: toNumber(data?.poolHashrate),
    networkHashrate: toNumber(data?.networkHashrate),
    networkDifficulty: toNumber(data?.networkDifficulty),
    currentHeight: toNumber(data?.currentHeight),
    activeMiners: toNumber(data?.activeMiners),
    activeWorkers: toNumber(data?.activeWorkers),
    pendingBlocks: toNumber(data?.pendingBlocks),
    confirmedBlocks: toNumber(data?.confirmedBlocks),
    orphanedBlocks: toNumber(data?.orphanedBlocks),
    luckPercent: toNumber(data?.luckPercent),
    effortPercent: toNumber(data?.effortPercent),
    minimumPayout: toNumber(data?.minimumPayout, DEFAULT_MIN_PAYOUT),
    chart: chart.length ? chart : buildMockOverview().chart,
    modes: modes.length ? modes : buildMockOverview().modes,
    stratum: {
      host: String(data?.stratum?.host || DEFAULT_STRATUM_HOST),
      pplnsPort: toNumber(data?.stratum?.pplnsPort, DEFAULT_PPLNS_PORT),
      soloPort: toNumber(data?.stratum?.soloPort, DEFAULT_SOLO_PORT),
      tlsPort: toNumber(data?.stratum?.tlsPort, DEFAULT_TLS_PORT),
      password: String(data?.stratum?.password || "x"),
    },
  };
}

function normalizeBlock(data: any, index = 0): PoolBlock {
  const miner = String(data?.miner || data?.address || DEFAULT_FEE_WALLET);
  return {
    id: String(data?.id || data?.height || `${Date.now()}-${index}`),
    height: toNumber(data?.height, 1870000 - index),
    miner,
    reward: toNumber(data?.reward, 2),
    status: ["pending", "confirmed", "orphaned"].includes(String(data?.status || "").toLowerCase()) ? String(data?.status).toLowerCase() as PoolBlockStatus : "confirmed",
    mode: String(data?.mode || data?.type || "pplns").toLowerCase() === "solo" ? "solo" : "pplns",
    confirmations: toNumber(data?.confirmations, 24),
    luckPercent: toNumber(data?.luckPercent, 102),
    effortPercent: toNumber(data?.effortPercent, 97),
    createdAt: toNumber(data?.createdAt || data?.timestamp, Date.now() - index * 1800000),
    explorerUrl: String(data?.explorerUrl || `${DEFAULT_EXPLORER}/block/${toNumber(data?.height, 1870000 - index)}`),
  };
}

function normalizePayment(data: any, index = 0): PoolPayment {
  const address = String(data?.address || DEFAULT_FEE_WALLET);
  const txHash = String(data?.txHash || data?.hash || `0xmockpayment${index.toString(16).padStart(56, "0")}`);
  return {
    id: String(data?.id || txHash || `${Date.now()}-${index}`),
    address,
    amount: toNumber(data?.amount, 1.5),
    txHash,
    createdAt: toNumber(data?.createdAt || data?.timestamp, Date.now() - index * 2400000),
    mode: String(data?.mode || data?.type || "pplns").toLowerCase() === "solo" ? "solo" : "pplns",
    txUrl: String(data?.txUrl || `${DEFAULT_EXPLORER}/tx/${txHash}`),
    isFeeWallet: Boolean(data?.isFeeWallet),
  };
}

function normalizeWorker(data: any, index = 0): PoolWorker {
  return {
    id: String(data?.id || data?.name || `worker-${index}`),
    name: String(data?.name || `rig-${index + 1}`),
    hashrate: toNumber(data?.hashrate, 42000000),
    avg10m: toNumber(data?.avg10m, 41500000),
    avg1h: toNumber(data?.avg1h, 40100000),
    avg24h: toNumber(data?.avg24h, 38600000),
    status: String(data?.status || "online").toLowerCase() === "offline" ? "offline" : "online",
    lastSeenAt: toNumber(data?.lastSeenAt || data?.lastSeen, Date.now() - index * 180000),
    validShares: toNumber(data?.validShares, 1820),
    invalidShares: toNumber(data?.invalidShares, 4),
  };
}

function normalizeMiner(data: any, address: string): PoolMinerStats {
  const workers = ensureArray<any>(data?.workers).map(normalizeWorker);
  const payments = ensureArray<any>(data?.payments).map(normalizePayment);
  const blocks = ensureArray<any>(data?.blocks).map(normalizeBlock);
  return {
    address,
    currentHashrate: toNumber(data?.currentHashrate, workers.reduce((sum, worker) => sum + worker.hashrate, 0)),
    avg10m: toNumber(data?.avg10m, workers.reduce((sum, worker) => sum + worker.avg10m, 0)),
    avg1h: toNumber(data?.avg1h, workers.reduce((sum, worker) => sum + worker.avg1h, 0)),
    avg24h: toNumber(data?.avg24h, workers.reduce((sum, worker) => sum + worker.avg24h, 0)),
    pendingBalance: toNumber(data?.pendingBalance, 1.62),
    totalPaid: toNumber(data?.totalPaid, 48.2),
    lastPaymentAmount: toNumber(data?.lastPaymentAmount, payments[0]?.amount || 3.2),
    lastPaymentAt: toNumber(data?.lastPaymentAt, payments[0]?.createdAt || Date.now() - 3600000),
    validShares: toNumber(data?.validShares, workers.reduce((sum, worker) => sum + worker.validShares, 0)),
    invalidShares: toNumber(data?.invalidShares, workers.reduce((sum, worker) => sum + worker.invalidShares, 0)),
    blocksFound: toNumber(data?.blocksFound, blocks.length),
    payoutProgressPercent: toNumber(data?.payoutProgressPercent, Math.min(100, (toNumber(data?.pendingBalance, 1.62) / DEFAULT_MIN_PAYOUT) * 100)),
    workersOnline: toNumber(data?.workersOnline, workers.filter((worker) => worker.status === "online").length),
    workersOffline: toNumber(data?.workersOffline, workers.filter((worker) => worker.status === "offline").length),
    workers,
    payments,
    blocks,
  };
}

function normalizeTopMiner(data: any, index = 0): PoolTopMiner {
  const address = String(data?.address || `0x${String(index + 1).padStart(40, "0")}`);
  return {
    address,
    label: String(data?.label || shortAddress(address)),
    hashrate: toNumber(data?.hashrate, 120000000 + index * 8000000),
    avg24h: toNumber(data?.avg24h, 115000000 + index * 7500000),
    workers: toNumber(data?.workers, 2 + (index % 4)),
    mode: data?.mode === "solo" ? "solo" : data?.mode === "pplns" ? "pplns" : "mixed",
    blocksFound: toNumber(data?.blocksFound, 1 + (index % 3)),
    efficiencyPercent: toNumber(data?.efficiencyPercent, 94 - index * 2),
  };
}

function normalizeTopWorker(data: any, index = 0): PoolTopWorker {
  return {
    name: String(data?.name || `rig-${index + 1}`),
    miner: String(data?.miner || `0x${String(index + 1).padStart(40, "0")}`),
    hashrate: toNumber(data?.hashrate, 74000000 - index * 4000000),
    avg24h: toNumber(data?.avg24h, 70500000 - index * 4200000),
    status: String(data?.status || "online").toLowerCase() === "offline" ? "offline" : "online",
  };
}

function buildMockOverview(): PoolOverview {
  const now = Date.now();
  const chart = Array.from({ length: 20 }).map((_, index) => ({
    ts: now - (19 - index) * 300000,
    hashrate: 820000000 + Math.sin(index / 2) * 120000000 + index * 7000000,
  }));

  return {
    poolOnline: true,
    nodeOnline: true,
    feePercent: DEFAULT_POOL_FEE,
    feeWalletPercent: 2,
    feeWalletAddress: DEFAULT_FEE_WALLET,
    poolHashrate: 986000000,
    networkHashrate: 13700000000,
    networkDifficulty: 6.48e12,
    currentHeight: 1872458,
    activeMiners: 138,
    activeWorkers: 412,
    pendingBlocks: 2,
    confirmedBlocks: 1234,
    orphanedBlocks: 7,
    luckPercent: 104,
    effortPercent: 96,
    minimumPayout: DEFAULT_MIN_PAYOUT,
    chart,
    modes: [
      { mode: "pplns", hashrate: 812000000, miners: 121, workers: 379 },
      { mode: "solo", hashrate: 174000000, miners: 17, workers: 33 },
    ],
    stratum: {
      host: DEFAULT_STRATUM_HOST,
      pplnsPort: DEFAULT_PPLNS_PORT,
      soloPort: DEFAULT_SOLO_PORT,
      tlsPort: DEFAULT_TLS_PORT,
      password: "x",
    },
  };
}

function buildMockBlocks(): PoolBlock[] {
  return Array.from({ length: 12 }).map((_, index) =>
    normalizeBlock(
      {
        height: 1872458 - index,
        miner: index % 5 === 0 ? DEFAULT_FEE_WALLET : `0x${(index + 1).toString(16).padStart(40, "a")}`,
        reward: 2 + (index % 3) * 0.14,
        status: index % 7 === 0 ? "pending" : index % 11 === 0 ? "orphaned" : "confirmed",
        mode: index % 4 === 0 ? "solo" : "pplns",
        confirmations: 42 - index * 2,
        luckPercent: 91 + index * 2,
        effortPercent: 88 + index,
        createdAt: Date.now() - index * 2700000,
      },
      index
    )
  );
}

function buildMockPayments(address?: string): PoolPayment[] {
  const seed = address || DEFAULT_FEE_WALLET;
  return Array.from({ length: 12 }).map((_, index) =>
    normalizePayment(
      {
        address: index < 4 && address ? address : index % 5 === 0 ? DEFAULT_FEE_WALLET : `0x${(index + 10).toString(16).padStart(40, "b")}`,
        amount: 0.82 + index * 0.37,
        txHash: `0x${String(index + 333).padStart(64, "c")}`,
        createdAt: Date.now() - index * 3800000,
        mode: index % 4 === 0 ? "solo" : "pplns",
        isFeeWallet: index % 5 === 0,
      },
      index
    )
  );
}

function buildMockTopMiners(): PoolTopMiner[] {
  return Array.from({ length: 8 }).map((_, index) => normalizeTopMiner({}, index));
}

function buildMockTopWorkers(): PoolTopWorker[] {
  return Array.from({ length: 8 }).map((_, index) => normalizeTopWorker({}, index));
}

function buildMockMiner(address: string): PoolMinerStats {
  const workers = [
    normalizeWorker({ name: "rig-main", hashrate: 58300000, avg10m: 57200000, avg1h: 56100000, avg24h: 54800000, validShares: 2841, invalidShares: 9 }, 0),
    normalizeWorker({ name: "rig-backup", hashrate: 29100000, avg10m: 28400000, avg1h: 27600000, avg24h: 26100000, validShares: 1282, invalidShares: 3 }, 1),
    normalizeWorker({ name: "gpu-rig-3", hashrate: 0, avg10m: 11800000, avg1h: 14900000, avg24h: 19100000, status: "offline", validShares: 642, invalidShares: 6 }, 2),
  ];
  const payments = buildMockPayments(address).filter((item) => item.address.toLowerCase() === address.toLowerCase()).slice(0, 5);
  const blocks = buildMockBlocks().filter((block, index) => index % 6 === 0).slice(0, 3).map((block) => ({ ...block, miner: address }));
  return normalizeMiner({
    workers,
    payments,
    blocks,
    pendingBalance: 3.44,
    totalPaid: 86.12,
    lastPaymentAmount: payments[0]?.amount || 3.28,
    lastPaymentAt: payments[0]?.createdAt || Date.now() - 7200000,
    blocksFound: 4,
    payoutProgressPercent: 69,
  }, address);
}

export async function fetchPoolSnapshot(address?: string): Promise<PoolSnapshot> {
  try {
    const [overviewRaw, blocksRaw, paymentsRaw, topMinersRaw, topWorkersRaw, minerRaw, feePaymentsRaw] = await Promise.all([
      readJson("/overview"),
      readJson("/blocks"),
      readJson("/payments"),
      readJson("/top-miners"),
      readJson("/top-workers").catch(() => []),
      address ? readJson(`/miner/${address}`) : Promise.resolve(null),
      readJson("/fee-wallet/payments").catch(() => []),
    ]);

    const overview = normalizeOverview(overviewRaw);
    const blocks = ensureArray<any>(blocksRaw).map(normalizeBlock);
    const payments = ensureArray<any>(paymentsRaw).map(normalizePayment);
    const topMiners = ensureArray<any>(topMinersRaw).map(normalizeTopMiner);
    const topWorkers = ensureArray<any>(topWorkersRaw).map(normalizeTopWorker);
    const miner = address ? normalizeMiner(minerRaw || {}, address) : null;
    const feePayments = ensureArray<any>(feePaymentsRaw).map((item, index) => normalizePayment({ ...item, isFeeWallet: true }, index));

    return {
      overview,
      blocks,
      payments,
      topMiners,
      topWorkers,
      miner,
      transparency: {
        walletAddress: overview.feeWalletAddress,
        feePercent: overview.feeWalletPercent,
        payments: feePayments.length ? feePayments : payments.filter((item) => item.isFeeWallet || item.address.toLowerCase() === overview.feeWalletAddress.toLowerCase()).slice(0, 6),
        blocks: blocks.filter((block) => block.miner.toLowerCase() === overview.feeWalletAddress.toLowerCase()).slice(0, 4),
      },
      fetchedAt: Date.now(),
    };
  } catch {
    const overview = buildMockOverview();
    const blocks = buildMockBlocks();
    const payments = buildMockPayments(address);
    return {
      overview,
      blocks,
      payments,
      topMiners: buildMockTopMiners(),
      topWorkers: buildMockTopWorkers(),
      miner: address ? buildMockMiner(address) : null,
      transparency: {
        walletAddress: overview.feeWalletAddress,
        feePercent: overview.feeWalletPercent,
        payments: payments.filter((item) => item.isFeeWallet || item.address.toLowerCase() === overview.feeWalletAddress.toLowerCase()).slice(0, 6),
        blocks: blocks.filter((block) => block.miner.toLowerCase() === overview.feeWalletAddress.toLowerCase()).slice(0, 4),
      },
      fetchedAt: Date.now(),
    };
  }
}

export function formatHashrate(value: number) {
  if (value >= 1e15) return `${(value / 1e15).toFixed(2)} PH/s`;
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)} TH/s`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GH/s`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MH/s`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)} KH/s`;
  return `${value.toFixed(0)} H/s`;
}

export function formatCoin(value: number) {
  return `${value.toFixed(4)} INRI`;
}

export function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export function formatDifficulty(value: number) {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)} T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} M`;
  return value.toFixed(0);
}

export function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getBlockExplorerUrl(block: PoolBlock) {
  return block.explorerUrl || `${DEFAULT_EXPLORER}/block/${block.height}`;
}

export function getTxExplorerUrl(payment: PoolPayment) {
  return payment.txUrl || `${DEFAULT_EXPLORER}/tx/${payment.txHash}`;
}

export function buildMinerCommand(mode: PoolMode, address: string, workerName: string) {
  const port = mode === "solo" ? DEFAULT_SOLO_PORT : DEFAULT_PPLNS_PORT;
  const user = workerName ? `${address}.${workerName}` : address;
  return `stratum+tcp://${DEFAULT_STRATUM_HOST}:${port} -u ${user} -p x`;
}
