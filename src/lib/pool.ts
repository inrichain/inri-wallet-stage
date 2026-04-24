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
  modes: Array<{ mode: PoolMode; hashrate: number; miners: number; workers: number; paymentsCount?: number }>;
  stratum: {
    host: string;
    pplnsPort: number;
    soloPort: number;
    tlsPort?: number;
    password: string;
  };
  rawNetworkPeers: number;
  mainRpcPeers: number;
  totalLivePulse: number;
  widgetUpdatedAt: number;
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

declare global {
  interface Window {
    INRI_POOL_PULSE?: any;
  }
}

const DEFAULT_BASE = (import.meta as any).env?.VITE_POOL_API_BASE || "/api/pool";
const DEFAULT_FEE_WALLET = (import.meta as any).env?.VITE_POOL_FEE_WALLET || "0x119B51608D139342baB20bFF0654F275FFbbaAD0";
const DEFAULT_EXPLORER = (import.meta as any).env?.VITE_POOL_EXPLORER_BASE || "https://explorer.inri.life";
const DEFAULT_STRATUM_HOST = (import.meta as any).env?.VITE_POOL_STRATUM_HOST || "pool.inri.life";
const DEFAULT_PPLNS_PORT = Number((import.meta as any).env?.VITE_POOL_PPLNS_PORT || 3333);
const DEFAULT_SOLO_PORT = Number((import.meta as any).env?.VITE_POOL_SOLO_PORT || 3334);
const DEFAULT_TLS_PORT = Number((import.meta as any).env?.VITE_POOL_TLS_PORT || 3335);
const DEFAULT_POOL_FEE = Number((import.meta as any).env?.VITE_POOL_FEE_PERCENT || 2);
const DEFAULT_MIN_PAYOUT = Number((import.meta as any).env?.VITE_POOL_MIN_PAYOUT || 5);
const DEFAULT_RPC_URL = (import.meta as any).env?.VITE_POOL_RPC_URL || "https://rpc-chain.inri.life";
const DEFAULT_WIDGET_URL = (import.meta as any).env?.VITE_POOL_WIDGET_URL || "https://pool.inri.life/widget/pool-pulse.js";
const FIXED_RPC_CHAIN_PEERS = Number((import.meta as any).env?.VITE_POOL_FIXED_RPC_CHAIN_PEERS || 13);
const FIXED_BOOT1_PEERS = Number((import.meta as any).env?.VITE_POOL_FIXED_BOOT1_PEERS || 25);
const FIXED_BOOT2_PEERS = Number((import.meta as any).env?.VITE_POOL_FIXED_BOOT2_PEERS || 15);

const chartHistory: Array<{ ts: number; hashrate: number }> = [];

function toNumber(value: any, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function ensureArray<T>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

function shortAddress(address: string) {
  if (!address) return "Unknown";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function sameAddress(a?: string, b?: string) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function parseDateLike(value: any, fallback = Date.now()) {
  if (typeof value === "number") return value > 1e12 ? value : value * 1000;
  if (typeof value === "string") {
    if (value.startsWith("0x")) {
      const parsed = parseInt(value, 16);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric > 1e12 ? numeric : numeric * 1000;
  }
  return fallback;
}

function modeFromValue(value: any): PoolMode {
  const raw = String(value || "pplns").toLowerCase();
  return raw.includes("solo") ? "solo" : "pplns";
}

function blockStatusFromValue(value: any): PoolBlockStatus {
  const raw = String(value || "confirmed").toLowerCase();
  if (raw.includes("orphan")) return "orphaned";
  if (raw.includes("pend")) return "pending";
  return "confirmed";
}

async function readJson(path: string) {
  const response = await fetch(`${DEFAULT_BASE}${path}`, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Pool API ${path} failed: ${response.status}`);
  }
  return response.json();
}

async function fetchRpc(method: string, params: any[] = []) {
  const response = await fetch(DEFAULT_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  if (!response.ok) throw new Error(`RPC ${method} failed: ${response.status}`);
  const data = await response.json();
  if (data?.error) throw new Error(data.error.message || `RPC ${method} error`);
  return data.result;
}

async function loadWidgetPayload() {
  if (typeof document === "undefined") {
    throw new Error("Pool widget is only available in the browser");
  }

  await new Promise<void>((resolve, reject) => {
    const old = document.getElementById("inri-pool-pulse-loader");
    if (old && old.parentNode) old.parentNode.removeChild(old);

    const script = document.createElement("script");
    script.id = "inri-pool-pulse-loader";
    script.async = true;
    script.src = `${DEFAULT_WIDGET_URL}${DEFAULT_WIDGET_URL.includes("?") ? "&" : "?"}t=${Date.now()}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Pool widget failed to load"));
    document.head.appendChild(script);
  });

  const payload = window.INRI_POOL_PULSE;
  if (!payload) throw new Error("Pool widget did not expose INRI_POOL_PULSE");
  return payload;
}

function rememberHashrate(hashrate: number) {
  chartHistory.push({ ts: Date.now(), hashrate: Math.max(0, toNumber(hashrate)) });
  while (chartHistory.length > 24) chartHistory.shift();
  return [...chartHistory];
}

function normalizeBlockFromWidget(data: any, index = 0): PoolBlock {
  const height = toNumber(data?.blockHeight ?? data?.height, 0);
  const txHash = String(data?.transactionConfirmationData || data?.txHash || data?.hash || "");
  const createdAt = parseDateLike(data?.created || data?.createdAt || data?.timestamp, Date.now() - index * 1800000);
  return {
    id: String(data?.id || `${height}-${txHash || index}`),
    height,
    miner: String(data?.miner || data?.address || DEFAULT_FEE_WALLET),
    reward: toNumber(data?.reward, 0),
    status: blockStatusFromValue(data?.status),
    mode: modeFromValue(data?.poolId || data?.mode || data?.type),
    confirmations: toNumber(data?.confirmations, 0),
    luckPercent: toNumber(data?.luckPercent, 100),
    effortPercent: toNumber(data?.effortPercent, 100),
    createdAt,
    explorerUrl: String(data?.infoLink || (height ? `${DEFAULT_EXPLORER}/block/${height}` : txHash ? `${DEFAULT_EXPLORER}/tx/${txHash}` : DEFAULT_EXPLORER)),
  };
}

function normalizePaymentFromWidget(data: any, index = 0): PoolPayment {
  const txHash = String(data?.transactionConfirmationData || data?.txHash || data?.hash || `0x${String(index).padStart(64, "0")}`);
  const address = String(data?.address || data?.miner || DEFAULT_FEE_WALLET);
  const mode = modeFromValue(data?.poolId || data?.mode || data?.type);
  return {
    id: String(data?.id || `${txHash}-${index}`),
    address,
    amount: toNumber(data?.amount, 0),
    txHash,
    createdAt: parseDateLike(data?.created || data?.createdAt || data?.timestamp, Date.now() - index * 2400000),
    mode,
    txUrl: `${DEFAULT_EXPLORER}/tx/${txHash}`,
    isFeeWallet: sameAddress(address, DEFAULT_FEE_WALLET),
  };
}

function normalizeWorkerFromApi(data: any, index = 0): PoolWorker {
  return {
    id: String(data?.id || data?.name || `worker-${index}`),
    name: String(data?.name || `rig-${index + 1}`),
    hashrate: toNumber(data?.hashrate, 0),
    avg10m: toNumber(data?.avg10m, data?.hashrate),
    avg1h: toNumber(data?.avg1h, data?.hashrate),
    avg24h: toNumber(data?.avg24h, data?.hashrate),
    status: String(data?.status || "online").toLowerCase() === "offline" ? "offline" : "online",
    lastSeenAt: parseDateLike(data?.lastSeenAt || data?.lastSeen, Date.now()),
    validShares: toNumber(data?.validShares, 0),
    invalidShares: toNumber(data?.invalidShares, 0),
  };
}

function normalizeMinerFromApi(data: any, address: string): PoolMinerStats {
  const workers = ensureArray<any>(data?.workers).map(normalizeWorkerFromApi);
  const payments = ensureArray<any>(data?.payments).map(normalizePaymentFromWidget);
  const blocks = ensureArray<any>(data?.blocks).map(normalizeBlockFromWidget);
  const pendingBalance = toNumber(data?.pendingBalance, 0);
  return {
    address,
    currentHashrate: toNumber(data?.currentHashrate, workers.reduce((sum, worker) => sum + worker.hashrate, 0)),
    avg10m: toNumber(data?.avg10m, workers.reduce((sum, worker) => sum + worker.avg10m, 0)),
    avg1h: toNumber(data?.avg1h, workers.reduce((sum, worker) => sum + worker.avg1h, 0)),
    avg24h: toNumber(data?.avg24h, workers.reduce((sum, worker) => sum + worker.avg24h, 0)),
    pendingBalance,
    totalPaid: toNumber(data?.totalPaid, payments.reduce((sum, item) => sum + item.amount, 0)),
    lastPaymentAmount: toNumber(data?.lastPaymentAmount, payments[0]?.amount || 0),
    lastPaymentAt: parseDateLike(data?.lastPaymentAt, payments[0]?.createdAt || 0),
    validShares: toNumber(data?.validShares, workers.reduce((sum, worker) => sum + worker.validShares, 0)),
    invalidShares: toNumber(data?.invalidShares, workers.reduce((sum, worker) => sum + worker.invalidShares, 0)),
    blocksFound: toNumber(data?.blocksFound, blocks.length),
    payoutProgressPercent: toNumber(data?.payoutProgressPercent, pendingBalance > 0 ? Math.min(100, (pendingBalance / DEFAULT_MIN_PAYOUT) * 100) : 0),
    workersOnline: toNumber(data?.workersOnline, workers.filter((worker) => worker.status === "online").length),
    workersOffline: toNumber(data?.workersOffline, workers.filter((worker) => worker.status === "offline").length),
    workers,
    payments,
    blocks,
  };
}

function deriveMinerFromWidget(address: string, payments: PoolPayment[], blocks: PoolBlock[], topMiners: PoolTopMiner[]): PoolMinerStats | null {
  if (!address) return null;
  const minePayments = payments.filter((item) => sameAddress(item.address, address));
  const mineBlocks = blocks.filter((item) => sameAddress(item.miner, address));
  const mineTop = topMiners.find((item) => sameAddress(item.address, address));
  const currentHashrate = toNumber(mineTop?.hashrate, 0);
  const totalPaid = minePayments.reduce((sum, item) => sum + item.amount, 0);

  return {
    address,
    currentHashrate,
    avg10m: currentHashrate,
    avg1h: currentHashrate,
    avg24h: toNumber(mineTop?.avg24h, currentHashrate),
    pendingBalance: 0,
    totalPaid,
    lastPaymentAmount: minePayments[0]?.amount || 0,
    lastPaymentAt: minePayments[0]?.createdAt || 0,
    validShares: 0,
    invalidShares: 0,
    blocksFound: mineBlocks.length,
    payoutProgressPercent: 0,
    workersOnline: currentHashrate > 0 ? 1 : 0,
    workersOffline: currentHashrate > 0 ? 0 : 1,
    workers: currentHashrate > 0
      ? [{
          id: `${address}-main`,
          name: "main-rig",
          hashrate: currentHashrate,
          avg10m: currentHashrate,
          avg1h: currentHashrate,
          avg24h: toNumber(mineTop?.avg24h, currentHashrate),
          status: "online",
          lastSeenAt: Date.now(),
          validShares: 0,
          invalidShares: 0,
        }]
      : [],
    payments: minePayments,
    blocks: mineBlocks,
  };
}

function buildFallbackOverview(poolOnline = false, nodeOnline = false): PoolOverview {
  const chart = rememberHashrate(0);
  return {
    poolOnline,
    nodeOnline,
    feePercent: DEFAULT_POOL_FEE,
    feeWalletPercent: DEFAULT_POOL_FEE,
    feeWalletAddress: DEFAULT_FEE_WALLET,
    poolHashrate: 0,
    networkHashrate: 0,
    networkDifficulty: 0,
    currentHeight: 0,
    activeMiners: 0,
    activeWorkers: 0,
    pendingBlocks: 0,
    confirmedBlocks: 0,
    orphanedBlocks: 0,
    luckPercent: 0,
    effortPercent: 0,
    minimumPayout: DEFAULT_MIN_PAYOUT,
    chart,
    modes: [
      { mode: "pplns", hashrate: 0, miners: 0, workers: 0, paymentsCount: 0 },
      { mode: "solo", hashrate: 0, miners: 0, workers: 0, paymentsCount: 0 },
    ],
    stratum: {
      host: DEFAULT_STRATUM_HOST,
      pplnsPort: DEFAULT_PPLNS_PORT,
      soloPort: DEFAULT_SOLO_PORT,
      tlsPort: DEFAULT_TLS_PORT,
      password: "x",
    },
    rawNetworkPeers: FIXED_RPC_CHAIN_PEERS + FIXED_BOOT1_PEERS + FIXED_BOOT2_PEERS,
    mainRpcPeers: 0,
    totalLivePulse: 0,
    widgetUpdatedAt: Date.now(),
  };
}

export async function fetchPoolSnapshot(address?: string): Promise<PoolSnapshot> {
  try {
    const [blockHex, peersHex, widget, minerApi] = await Promise.all([
      fetchRpc("eth_blockNumber").catch(() => "0x0"),
      fetchRpc("net_peerCount").catch(() => "0x0"),
      loadWidgetPayload(),
      address ? readJson(`/miner/${address}`).catch(() => null) : Promise.resolve(null),
    ]);

    const latestBlock = parseInt(String(blockHex || "0x0"), 16) || 0;
    const mainRpcPeers = parseInt(String(peersHex || "0x0"), 16) || 0;
    const rawNetworkPeers = FIXED_RPC_CHAIN_PEERS + FIXED_BOOT1_PEERS + FIXED_BOOT2_PEERS + mainRpcPeers;

    const totals = widget?.totals || {};
    const pplns = widget?.pplns || {};
    const solo = widget?.solo || {};
    const merged = widget?.merged || {};

    const poolHashrate = toNumber(totals?.poolHashrate, toNumber(pplns?.poolHashrate) + toNumber(solo?.poolHashrate));
    const chart = rememberHashrate(poolHashrate);

    const blocks = ensureArray<any>(merged?.blocks).map(normalizeBlockFromWidget).sort((a, b) => b.createdAt - a.createdAt);
    const payments = ensureArray<any>(merged?.payments).map(normalizePaymentFromWidget).sort((a, b) => b.createdAt - a.createdAt);
    const topMiners = ensureArray<any>(merged?.miners)
      .map((item: any, index: number) => {
        const minerAddress = String(item?.miner || item?.address || `0x${String(index + 1).padStart(40, "0")}`);
        return {
          address: minerAddress,
          label: shortAddress(minerAddress),
          hashrate: toNumber(item?.hashrate, 0),
          avg24h: toNumber(item?.avg24h, item?.hashrate),
          workers: toNumber(item?.workers, 1),
          mode: item?.mode ? (modeFromValue(item.mode) as PoolMode) : "mixed",
          blocksFound: toNumber(item?.blocksFound, blocks.filter((block) => sameAddress(block.miner, minerAddress)).length),
          efficiencyPercent: toNumber(item?.efficiencyPercent, 100),
        } as PoolTopMiner;
      })
      .sort((a, b) => b.hashrate - a.hashrate)
      .slice(0, 12);

    const topWorkers = ensureArray<any>(widget?.topWorkers)
      .map((item: any, index: number) => ({
        name: String(item?.name || item?.worker || `rig-${index + 1}`),
        miner: String(item?.miner || item?.address || DEFAULT_FEE_WALLET),
        hashrate: toNumber(item?.hashrate, 0),
        avg24h: toNumber(item?.avg24h, item?.hashrate),
        status: String(item?.status || "online").toLowerCase() === "offline" ? "offline" : "online",
      } as PoolTopWorker))
      .slice(0, 10);

    const pendingBlocks = blocks.filter((item) => item.status === "pending").length;
    const confirmedBlocks = blocks.filter((item) => item.status === "confirmed").length;
    const orphanedBlocks = blocks.filter((item) => item.status === "orphaned").length;

    const modes: PoolOverview["modes"] = [
      {
        mode: "pplns",
        hashrate: toNumber(pplns?.poolHashrate, 0),
        miners: toNumber(pplns?.connectedMiners, 0),
        workers: toNumber(pplns?.activeWorkers, toNumber(pplns?.workers, 0)),
        paymentsCount: toNumber(pplns?.paymentsCount, payments.filter((item) => item.mode === "pplns").length),
      },
      {
        mode: "solo",
        hashrate: toNumber(solo?.poolHashrate, 0),
        miners: toNumber(solo?.connectedMiners, 0),
        workers: toNumber(solo?.activeWorkers, toNumber(solo?.workers, 0)),
        paymentsCount: toNumber(solo?.paymentsCount, payments.filter((item) => item.mode === "solo").length),
      },
    ];

    const overview: PoolOverview = {
      poolOnline: true,
      nodeOnline: latestBlock > 0,
      feePercent: DEFAULT_POOL_FEE,
      feeWalletPercent: DEFAULT_POOL_FEE,
      feeWalletAddress: DEFAULT_FEE_WALLET,
      poolHashrate,
      networkHashrate: toNumber(totals?.networkHashrate, 0),
      networkDifficulty: toNumber(totals?.networkDifficulty, 0),
      currentHeight: latestBlock,
      activeMiners: toNumber(totals?.connectedMiners, modes.reduce((sum, item) => sum + item.miners, 0)),
      activeWorkers: modes.reduce((sum, item) => sum + item.workers, 0),
      pendingBlocks,
      confirmedBlocks,
      orphanedBlocks,
      luckPercent: toNumber(totals?.luckPercent, pendingBlocks ? 100 : 0),
      effortPercent: toNumber(totals?.effortPercent, confirmedBlocks ? 100 : 0),
      minimumPayout: DEFAULT_MIN_PAYOUT,
      chart,
      modes,
      stratum: {
        host: DEFAULT_STRATUM_HOST,
        pplnsPort: DEFAULT_PPLNS_PORT,
        soloPort: DEFAULT_SOLO_PORT,
        tlsPort: DEFAULT_TLS_PORT,
        password: "x",
      },
      rawNetworkPeers,
      mainRpcPeers,
      totalLivePulse: rawNetworkPeers + toNumber(totals?.connectedMiners, modes.reduce((sum, item) => sum + item.miners, 0)),
      widgetUpdatedAt: parseDateLike(widget?.generatedAt, Date.now()),
    };

    const miner = address
      ? minerApi
        ? normalizeMinerFromApi(minerApi, address)
        : deriveMinerFromWidget(address, payments, blocks, topMiners)
      : null;

    const transparencyPayments = payments.filter((item) => item.isFeeWallet || sameAddress(item.address, overview.feeWalletAddress)).slice(0, 8);
    const transparencyBlocks = blocks.filter((item) => sameAddress(item.miner, overview.feeWalletAddress)).slice(0, 6);

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
        payments: transparencyPayments,
        blocks: transparencyBlocks,
      },
      fetchedAt: Date.now(),
    };
  } catch {
    const overview = buildFallbackOverview(false, false);
    return {
      overview,
      blocks: [],
      payments: [],
      topMiners: [],
      topWorkers: [],
      miner: address ? deriveMinerFromWidget(address, [], [], []) : null,
      transparency: {
        walletAddress: overview.feeWalletAddress,
        feePercent: overview.feeWalletPercent,
        payments: [],
        blocks: [],
      },
      fetchedAt: Date.now(),
    };
  }
}

export function formatHashrate(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 H/s";
  if (value >= 1e15) return `${(value / 1e15).toFixed(2)} PH/s`;
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)} TH/s`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GH/s`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MH/s`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)} KH/s`;
  return `${value.toFixed(0)} H/s`;
}

export function formatCoin(value: number) {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 6 })} INRI`;
}

export function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export function formatDifficulty(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1e15) return `${(value / 1e15).toFixed(2)} P`;
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)} T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} M`;
  return value.toFixed(0);
}

export function formatRelativeTime(timestamp: number) {
  if (!timestamp) return "—";
  const diff = Math.max(0, Date.now() - timestamp);
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
  return `stratum+tcp://${DEFAULT_STRATUM_HOST}:${port} --user ${user} --pass x`;
}
