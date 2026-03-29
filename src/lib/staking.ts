import { ethers } from "ethers";
import { EXPLORER_ADDRESS_URL, EXPLORER_TX_URL, getProvider } from "./inri";

export const INRI_STAKING_ADDRESS = "0xbE7eB939065Fa28d9d81Ab7842e0b615F02e26c9";
export const INRI_NETWORK_KEY = "inri";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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
};

export type StakingTxResult = {
  hash: string;
  gasUsed: string;
  gasPriceGwei: string;
  feeNative: string;
  status: "confirmed" | "failed";
};

export function getStakingProvider() {
  return getProvider(INRI_NETWORK_KEY);
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

export async function loadStakingOverview(walletAddress?: string): Promise<StakingOverview> {
  const provider = getStakingProvider();
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
  };
}

function makeSigner(privateKey: string) {
  return new ethers.Wallet(privateKey, getStakingProvider());
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

export async function stakeInriTx(privateKey: string, planId: number, amountInri: string) {
  const signer = makeSigner(privateKey);
  const contract = getStakingContract(signer);
  const amount = ethers.parseEther(amountInri);
  return waitForTx(contract.stake(planId, { value: amount }));
}

export async function claimAllInriTx(privateKey: string) {
  const signer = makeSigner(privateKey);
  const contract = getStakingContract(signer);
  return waitForTx(contract.claimAll());
}

export async function restakeRewardsTx(privateKey: string, planId: number) {
  const signer = makeSigner(privateKey);
  const contract = getStakingContract(signer);
  return waitForTx(contract.restakeToPlan(planId));
}

export async function unstakeInriTx(privateKey: string, planId: number) {
  const signer = makeSigner(privateKey);
  const contract = getStakingContract(signer);
  return waitForTx(contract.unstake(planId));
}
