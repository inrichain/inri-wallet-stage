import { ethers } from "ethers";
import { EXPLORER_ADDRESS_URL, EXPLORER_TX_URL, fallbackProvider, getProvider } from "./inri";

export const INRI_STAKING_ADDRESS = "0xbE7eB939065Fa28d9d81Ab7842e0b615F02e26c9";
export const INRI_NETWORK_KEY = "inri";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const MIN_FIRST_STAKE_INRI = 100;
export const MAX_PER_PLAN_INRI = 10_000;

export const INRI_STAKING_ABI = [
  "function owner() view returns (address)",
  "function started() view returns (bool)",
  "function newStakesPaused() view returns (bool)",
  "function emergencyExitEnabled() view returns (bool)",
  "function startTime() view returns (uint256)",
  "function programEnd() view returns (uint256)",
  "function baseRewardsRemaining() view returns (uint256)",
  "function totalWeight() view returns (uint256)",
  "function pendingBonusRewards() view returns (uint256)",
  "function currentContractBalance() view returns (uint256)",
  "function currentEra() view returns (uint256)",
  "function emissionPerDayCurrentEra() view returns (uint256)",
  "function pendingRewardsOf(address user) view returns (uint256)",
  "function canClaim(address user) view returns (bool)",
  "function nextClaimAt(address user) view returns (uint256)",
  "function getPlanConfig(uint8 planId) view returns (uint256 duration, uint256 multiplierBps, uint256 penaltyBps)",
  "function positionOf(address user, uint8 planId) view returns (uint256 principal, uint256 weight, uint256 unlockAt, uint256 rewardDebt, uint256 pendingRewards, bool active)",
  "function stake(uint8 planId) payable",
  "function claimAll()",
  "function restakeToPlan(uint8 planId)",
  "function unstake(uint8 planId)",
] as const;

export type StakingPlanConfig = {
  id: number;
  duration: bigint;
  multiplierBps: bigint;
  penaltyBps: bigint;
};

export type StakingPosition = {
  id: number;
  principal: bigint;
  weight: bigint;
  unlockAt: bigint;
  rewardDebt: bigint;
  pendingRewards: bigint;
  active: boolean;
};

export type StakingOverview = {
  contractAddress: string;
  owner: string;
  started: boolean;
  newStakesPaused: boolean;
  emergencyExitEnabled: boolean;
  startTime: bigint;
  programEnd: bigint;
  baseRewardsRemaining: bigint;
  totalWeight: bigint;
  pendingBonusRewards: bigint;
  currentContractBalance: bigint;
  currentEra: bigint;
  emissionPerDayCurrentEra: bigint;
  walletBalance: bigint;
  pendingRewards: bigint;
  canClaim: boolean;
  nextClaimAt: bigint;
  plans: StakingPlanConfig[];
  positions: StakingPosition[];
  readBlockNumber: number;
  readSource: string;
};

export type StakingSummary = {
  totalStaked: bigint;
  totalPlanPending: bigint;
  activePlans: number;
  mainPlanId: number | null;
};

export type StakingTxResult = {
  hash: string;
  gasUsed: string;
  gasPriceGwei: string;
  feeNative: string;
  status: "confirmed" | "failed";
};

type ProviderSnapshot = {
  provider: ethers.JsonRpcProvider;
  label: string;
  blockNumber: number;
};

function getPrimaryProvider() {
  return getProvider(INRI_NETWORK_KEY);
}

function getReadProviderEntries(): Array<{ provider: ethers.JsonRpcProvider; label: string }> {
  return [
    { provider: getPrimaryProvider(), label: "rpc-chain.inri.life" },
    { provider: fallbackProvider, label: "rpc.inri.life" },
  ];
}

export function getStakingProvider() {
  return getPrimaryProvider();
}

export function getStakingContract(providerOrSigner: ethers.ContractRunner = getStakingProvider()) {
  return new ethers.Contract(INRI_STAKING_ADDRESS, INRI_STAKING_ABI, providerOrSigner);
}

export function stakingAddressUrl(address = INRI_STAKING_ADDRESS) {
  return `${EXPLORER_ADDRESS_URL}${address}`;
}

export function stakingTxUrl(hash: string) {
  return `${EXPLORER_TX_URL}${hash}`;
}

export function shortHash(value: string) {
  if (!value) return "";
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

export function formatInri(value: bigint, digits = 4) {
  const raw = Number(ethers.formatEther(value));
  if (!Number.isFinite(raw)) return "0";
  return raw.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function formatPercentFromBps(bps: bigint | number) {
  const value = Number(bps) / 100;
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`;
}

export function formatMultiplierFromBps(bps: bigint | number) {
  return `${(Number(bps) / 10000).toFixed(2)}x`;
}

export function formatDuration(duration: bigint | number) {
  const days = Math.max(0, Math.round(Number(duration) / 86400));
  if (days >= 365 && days % 365 === 0) return `${days / 365}y`;
  return `${days}d`;
}

export function formatTimestamp(value: bigint | number) {
  const ts = Number(value);
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString();
}

export function timeUntilLabel(unlockAt: bigint | number, emergencyExitEnabled = false) {
  if (emergencyExitEnabled) return "Penalty disabled";
  const target = Number(unlockAt) * 1000;
  if (!target) return "-";
  const diff = target - Date.now();
  if (diff <= 0) return "Unlocked";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  return `${hours}h ${minutes}m`;
}

export function summarizeStaking(overview: StakingOverview | null): StakingSummary {
  if (!overview) {
    return { totalStaked: 0n, totalPlanPending: 0n, activePlans: 0, mainPlanId: null };
  }

  let totalStaked = 0n;
  let totalPlanPending = 0n;
  let activePlans = 0;
  let mainPlanId: number | null = null;
  let mainPlanPrincipal = 0n;

  for (const position of overview.positions) {
    totalStaked += position.principal;
    totalPlanPending += position.pendingRewards;
    if (position.principal > 0n) {
      activePlans += 1;
      if (position.principal > mainPlanPrincipal) {
        mainPlanPrincipal = position.principal;
        mainPlanId = position.id;
      }
    }
  }

  return { totalStaked, totalPlanPending, activePlans, mainPlanId };
}

export function getPlanFillPercent(position: StakingPosition | null | undefined) {
  if (!position || position.principal <= 0n) return 0;
  const pct = (Number(ethers.formatEther(position.principal)) / MAX_PER_PLAN_INRI) * 100;
  return Math.max(0, Math.min(100, pct));
}

function snapshotKey(overview: StakingOverview | null | undefined) {
  if (!overview) return "none";
  return JSON.stringify({
    pendingRewards: overview.pendingRewards.toString(),
    positions: overview.positions.map((position) => ({
      id: position.id,
      principal: position.principal.toString(),
      pendingRewards: position.pendingRewards.toString(),
      unlockAt: position.unlockAt.toString(),
      active: position.active,
    })),
  });
}

async function resolveProviderSnapshots(): Promise<ProviderSnapshot[]> {
  const results = await Promise.allSettled(
    getReadProviderEntries().map(async ({ provider, label }) => ({
      provider,
      label,
      blockNumber: await provider.getBlockNumber(),
    }))
  );

  return results
    .filter((item): item is PromiseFulfilledResult<ProviderSnapshot> => item.status === "fulfilled")
    .map((item) => item.value)
    .sort((a, b) => b.blockNumber - a.blockNumber);
}

async function loadOverviewWithProvider(provider: ethers.JsonRpcProvider, label: string, blockNumber: number, walletAddress?: string): Promise<StakingOverview> {
  const contract = getStakingContract(provider);
  const user = walletAddress && ethers.isAddress(walletAddress) ? walletAddress : ZERO_ADDRESS;

  const header = await Promise.all([
    contract.owner(),
    contract.started(),
    contract.newStakesPaused(),
    contract.emergencyExitEnabled(),
    contract.startTime(),
    contract.programEnd(),
    contract.baseRewardsRemaining(),
    contract.totalWeight(),
    contract.pendingBonusRewards(),
    contract.currentContractBalance(),
    contract.currentEra(),
    contract.emissionPerDayCurrentEra(),
    contract.pendingRewardsOf(user),
    contract.canClaim(user),
    contract.nextClaimAt(user),
    walletAddress && ethers.isAddress(walletAddress) ? provider.getBalance(walletAddress) : Promise.resolve(0n),
  ]);

  const plans = await Promise.all(
    [0, 1, 2].map(async (planId) => {
      const [duration, multiplierBps, penaltyBps] = await contract.getPlanConfig(planId);
      return {
        id: planId,
        duration: BigInt(duration),
        multiplierBps: BigInt(multiplierBps),
        penaltyBps: BigInt(penaltyBps),
      } satisfies StakingPlanConfig;
    })
  );

  const positions = await Promise.all(
    [0, 1, 2].map(async (planId) => {
      const [principal, weight, unlockAt, rewardDebt, pendingRewards, active] = await contract.positionOf(user, planId);
      return {
        id: planId,
        principal: BigInt(principal),
        weight: BigInt(weight),
        unlockAt: BigInt(unlockAt),
        rewardDebt: BigInt(rewardDebt),
        pendingRewards: BigInt(pendingRewards),
        active: Boolean(active),
      } satisfies StakingPosition;
    })
  );

  return {
    contractAddress: INRI_STAKING_ADDRESS,
    owner: String(header[0] || ZERO_ADDRESS),
    started: Boolean(header[1]),
    newStakesPaused: Boolean(header[2]),
    emergencyExitEnabled: Boolean(header[3]),
    startTime: BigInt(header[4]),
    programEnd: BigInt(header[5]),
    baseRewardsRemaining: BigInt(header[6]),
    totalWeight: BigInt(header[7]),
    pendingBonusRewards: BigInt(header[8]),
    currentContractBalance: BigInt(header[9]),
    currentEra: BigInt(header[10]),
    emissionPerDayCurrentEra: BigInt(header[11]),
    pendingRewards: BigInt(header[12]),
    canClaim: Boolean(header[13]),
    nextClaimAt: BigInt(header[14]),
    walletBalance: BigInt(header[15]),
    plans,
    positions,
    readBlockNumber: blockNumber,
    readSource: label,
  };
}

export async function loadStakingOverview(walletAddress?: string): Promise<StakingOverview> {
  const snapshots = await resolveProviderSnapshots();
  if (!snapshots.length) {
    throw new Error("INRI RPC unavailable");
  }

  const attempts = await Promise.allSettled(
    snapshots.map((snapshot) => loadOverviewWithProvider(snapshot.provider, snapshot.label, snapshot.blockNumber, walletAddress))
  );

  const successful = attempts
    .filter((item): item is PromiseFulfilledResult<StakingOverview> => item.status === "fulfilled")
    .map((item) => item.value);

  if (!successful.length) {
    const firstRejected = attempts.find((item) => item.status === "rejected") as PromiseRejectedResult | undefined;
    throw firstRejected?.reason || new Error("Failed to load staking overview");
  }

  successful.sort((a, b) => {
    const aSummary = summarizeStaking(a);
    const bSummary = summarizeStaking(b);
    const aUser = aSummary.totalStaked + a.pendingRewards + aSummary.totalPlanPending;
    const bUser = bSummary.totalStaked + b.pendingRewards + bSummary.totalPlanPending;
    if (aUser !== bUser) return bUser > aUser ? 1 : -1;
    if (a.readBlockNumber !== b.readBlockNumber) return b.readBlockNumber - a.readBlockNumber;
    return Number(b.currentContractBalance - a.currentContractBalance);
  });

  return successful[0];
}

export async function waitForStakingSync(walletAddress: string | undefined, previousOverview?: StakingOverview | null, attempts = 12, delayMs = 1500) {
  const prevBlock = previousOverview?.readBlockNumber || 0;
  const prevSnapshot = snapshotKey(previousOverview);
  let latest = previousOverview || null;

  for (let index = 0; index < attempts; index += 1) {
    if (index > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }

    try {
      const next = await loadStakingOverview(walletAddress);
      latest = next;
      const changedSnapshot = snapshotKey(next) !== prevSnapshot;
      const newerBlock = next.readBlockNumber > prevBlock;
      if (changedSnapshot || newerBlock) {
        return next;
      }
    } catch {
      // keep trying
    }
  }

  return latest;
}

function makeSigner(privateKey: string) {
  return new ethers.Wallet(privateKey, getPrimaryProvider());
}

async function getLegacyGasPrice(provider: ethers.JsonRpcProvider) {
  try {
    const raw = await provider.send("eth_gasPrice", []);
    const gasPrice = BigInt(raw || 0);
    if (gasPrice > 0n) return gasPrice;
  } catch {
    // fallback below
  }

  try {
    const feeData = await provider.getFeeData();
    if (feeData.gasPrice && feeData.gasPrice > 0n) return feeData.gasPrice;
  } catch {
    // fallback below
  }

  return ethers.parseUnits("1", "gwei");
}

function withGasBuffer(value: bigint, fallback: bigint) {
  const base = value > 0n ? value : fallback;
  return (base * 120n) / 100n + 10000n;
}

async function buildLegacyOverrides(
  signer: ethers.Wallet,
  tx: ethers.TransactionRequest,
  fallbackGasLimit: bigint
): Promise<ethers.TransactionRequest> {
  const provider = signer.provider as ethers.JsonRpcProvider;
  const gasPrice = await getLegacyGasPrice(provider);

  let gasLimit = fallbackGasLimit;
  try {
    gasLimit = await provider.estimateGas({
      ...tx,
      from: await signer.getAddress(),
      type: 0,
      gasPrice,
    });
  } catch {
    // Custom INRI nodes may reject estimation on some contract methods.
    // A safe fixed limit still works; unused gas is not spent.
  }

  return {
    type: 0,
    gasPrice,
    gasLimit: withGasBuffer(gasLimit, fallbackGasLimit),
  };
}

async function waitForTx(txPromise: Promise<any>): Promise<StakingTxResult> {
  const tx = await txPromise;
  const receipt = await tx.wait();
  const gasUsed = receipt?.gasUsed ? receipt.gasUsed.toString() : "0";
  const gasPriceWei =
    tx.gasPrice?.toString?.() ||
    tx.maxFeePerGas?.toString?.() ||
    receipt?.gasPrice?.toString?.() ||
    "0";
  const feeWei = BigInt(gasUsed || "0") * BigInt(gasPriceWei || "0");

  return {
    hash: tx.hash,
    gasUsed,
    gasPriceGwei: gasPriceWei !== "0" ? ethers.formatUnits(gasPriceWei, "gwei") : "0",
    feeNative: feeWei !== 0n ? ethers.formatEther(feeWei) : "0",
    status: receipt?.status === 1 ? "confirmed" : "failed",
  };
}

export function explainStakingError(error: any, lang: string = "en") {
  const pt = lang.toLowerCase().startsWith("pt");
  const raw = String(error?.shortMessage || error?.reason || error?.message || "");
  const upper = raw.toUpperCase();

  if (upper.includes("BELOW_MIN_STAKE")) {
    return pt ? `Primeiro stake do plano: mínimo de ${MIN_FIRST_STAKE_INRI} INRI.` : `First stake on this plan requires at least ${MIN_FIRST_STAKE_INRI} INRI.`;
  }
  if (upper.includes("MAX_PER_PLAN")) {
    return pt ? `Limite máximo por plano: ${MAX_PER_PLAN_INRI.toLocaleString()} INRI.` : `Maximum per plan is ${MAX_PER_PLAN_INRI.toLocaleString()} INRI.`;
  }
  if (upper.includes("NO_REWARDS")) {
    return pt ? "Você ainda não tem rewards para claim ou restake." : "You do not have rewards available yet.";
  }
  if (upper.includes("NO_POSITION")) {
    return pt ? "Você ainda não tem stake ativo nesse plano." : "You do not have an active position on this plan.";
  }
  if (upper.includes("CLAIM_COOLDOWN")) {
    return pt ? "Claim ainda em cooldown. Aguarde o próximo horário liberado." : "Claim is still on cooldown.";
  }
  if (upper.includes("NEW_STAKES_PAUSED")) {
    return pt ? "Novos stakes estão pausados no contrato." : "New stakes are currently paused.";
  }
  if (upper.includes("EMERGENCY_EXIT")) {
    return pt ? "Modo de emergência ativo. Apenas saída é permitida." : "Emergency mode is enabled. Only exit is allowed.";
  }
  if (upper.includes("INSUFFICIENT_FUNDS")) {
    return pt ? "Saldo insuficiente para stake + gas." : "Insufficient balance for stake plus gas.";
  }
  if (upper.includes("BAD_PLAN")) {
    return pt ? "Plano inválido." : "Invalid plan.";
  }
  return raw || (pt ? "Transação falhou." : "Transaction failed.");
}

export async function stakeInriTx(privateKey: string, planId: number, amountInri: string) {
  const signer = makeSigner(privateKey);
  const contract = getStakingContract(signer);
  const amount = ethers.parseEther(amountInri);
  const data = contract.interface.encodeFunctionData("stake", [planId]);
  const overrides = await buildLegacyOverrides(
    signer,
    { to: INRI_STAKING_ADDRESS, data, value: amount },
    450000n
  );
  return waitForTx(contract.stake(planId, { value: amount, ...overrides }));
}

export async function claimAllInriTx(privateKey: string) {
  const signer = makeSigner(privateKey);
  const contract = getStakingContract(signer);
  const data = contract.interface.encodeFunctionData("claimAll", []);
  const overrides = await buildLegacyOverrides(
    signer,
    { to: INRI_STAKING_ADDRESS, data, value: 0n },
    350000n
  );
  return waitForTx(contract.claimAll(overrides));
}

export async function restakeRewardsTx(privateKey: string, planId: number) {
  const signer = makeSigner(privateKey);
  const contract = getStakingContract(signer);
  const data = contract.interface.encodeFunctionData("restakeToPlan", [planId]);
  const overrides = await buildLegacyOverrides(
    signer,
    { to: INRI_STAKING_ADDRESS, data, value: 0n },
    450000n
  );
  return waitForTx(contract.restakeToPlan(planId, overrides));
}

export async function unstakeInriTx(privateKey: string, planId: number) {
  const signer = makeSigner(privateKey);
  const contract = getStakingContract(signer);
  const data = contract.interface.encodeFunctionData("unstake", [planId]);
  const overrides = await buildLegacyOverrides(
    signer,
    { to: INRI_STAKING_ADDRESS, data, value: 0n },
    450000n
  );
  return waitForTx(contract.unstake(planId, overrides));
}
