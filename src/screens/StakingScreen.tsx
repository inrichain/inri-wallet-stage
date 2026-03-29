import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import ActionButton from "../components/ActionButton";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import StatusPill from "../components/StatusPill";
import { tr } from "../i18n/translations";
import {
  EXPLORER_ADDRESS_URL,
  EXPLORER_TX_URL,
  getProvider,
} from "../lib/inri";
import { getStoredNetwork } from "../lib/network";

const STAKING_ADDRESS = "0xbE7eB939065Fa28d9d81Ab7842e0b615F02e26c9";
const ZERO = "0x0000000000000000000000000000000000000000";
const ABI = [
  "function owner() view returns (address)",
  "function started() view returns (bool)",
  "function newStakesPaused() view returns (bool)",
  "function emergencyExitEnabled() view returns (bool)",
  "function startTime() view returns (uint256)",
  "function programEnd() view returns (uint256)",
  "function baseRewardsRemaining() view returns (uint256)",
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

type PlanConfig = {
  id: number;
  duration: bigint;
  multiplierBps: bigint;
  penaltyBps: bigint;
};

type PositionInfo = {
  id: number;
  principal: bigint;
  weight: bigint;
  unlockAt: bigint;
  rewardDebt: bigint;
  pendingRewards: bigint;
  active: boolean;
};

type Overview = {
  owner: string;
  started: boolean;
  newStakesPaused: boolean;
  emergencyExitEnabled: boolean;
  startTime: bigint;
  programEnd: bigint;
  baseRewardsRemaining: bigint;
  currentContractBalance: bigint;
  currentEra: bigint;
  emissionPerDayCurrentEra: bigint;
  pendingRewards: bigint;
  canClaim: boolean;
  nextClaimAt: bigint;
  walletBalance: bigint;
  plans: PlanConfig[];
  positions: PositionInfo[];
};

type PendingAction = null | { type: "stake" | "claim" | "restake" | "unstake"; planId?: number };

function getContract(runner?: ethers.ContractRunner) {
  return new ethers.Contract(STAKING_ADDRESS, ABI, runner || getProvider("inri"));
}

function formatAmount(value: bigint, digits = 4) {
  const n = Number(ethers.formatEther(value));
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatBpsPercent(bps: bigint) {
  const value = Number(bps) / 100;
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`;
}

function formatMultiplier(bps: bigint) {
  return `${(Number(bps) / 10000).toFixed(2)}x`;
}

function formatDuration(seconds: bigint) {
  const days = Math.round(Number(seconds) / 86400);
  return `${days} days`;
}

function formatDate(ts: bigint) {
  if (!ts) return "-";
  return new Date(Number(ts) * 1000).toLocaleString();
}

function timeLeftLabel(unlockAt: bigint, emergencyExitEnabled: boolean) {
  if (emergencyExitEnabled) return "Penalty disabled";
  if (!unlockAt) return "-";
  const diff = Number(unlockAt) * 1000 - Date.now();
  if (diff <= 0) return "Unlocked";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

async function readOverview(address?: string): Promise<Overview> {
  const provider = getProvider("inri");
  const contract = getContract(provider);
  const user = address && ethers.isAddress(address) ? address : ZERO;

  const header = await Promise.all([
    contract.owner(),
    contract.started(),
    contract.newStakesPaused(),
    contract.emergencyExitEnabled(),
    contract.startTime(),
    contract.programEnd(),
    contract.baseRewardsRemaining(),
    contract.currentContractBalance(),
    contract.currentEra(),
    contract.emissionPerDayCurrentEra(),
    contract.pendingRewardsOf(user),
    contract.canClaim(user),
    contract.nextClaimAt(user),
    address && ethers.isAddress(address) ? provider.getBalance(address) : Promise.resolve(0n),
  ]);

  const plans = await Promise.all([0, 1, 2].map(async (id) => {
    const result = await contract.getPlanConfig(id);
    return {
      id,
      duration: BigInt(result[0]),
      multiplierBps: BigInt(result[1]),
      penaltyBps: BigInt(result[2]),
    } as PlanConfig;
  }));

  const positions = await Promise.all([0, 1, 2].map(async (id) => {
    const result = await contract.positionOf(user, id);
    return {
      id,
      principal: BigInt(result[0]),
      weight: BigInt(result[1]),
      unlockAt: BigInt(result[2]),
      rewardDebt: BigInt(result[3]),
      pendingRewards: BigInt(result[4]),
      active: Boolean(result[5]),
    } as PositionInfo;
  }));

  return {
    owner: String(header[0]),
    started: Boolean(header[1]),
    newStakesPaused: Boolean(header[2]),
    emergencyExitEnabled: Boolean(header[3]),
    startTime: BigInt(header[4]),
    programEnd: BigInt(header[5]),
    baseRewardsRemaining: BigInt(header[6]),
    currentContractBalance: BigInt(header[7]),
    currentEra: BigInt(header[8]),
    emissionPerDayCurrentEra: BigInt(header[9]),
    pendingRewards: BigInt(header[10]),
    canClaim: Boolean(header[11]),
    nextClaimAt: BigInt(header[12]),
    walletBalance: BigInt(header[13]),
    plans,
    positions,
  };
}

async function sendTx(privateKey: string, method: "stake" | "claimAll" | "restakeToPlan" | "unstake", planId?: number, amount?: string) {
  const signer = new ethers.Wallet(privateKey, getProvider("inri"));
  const contract = getContract(signer);
  let tx;

  if (method === "stake") {
    tx = await contract.stake(planId || 0, { value: ethers.parseEther(amount || "0") });
  } else if (method === "claimAll") {
    tx = await contract.claimAll();
  } else if (method === "restakeToPlan") {
    tx = await contract.restakeToPlan(planId || 0);
  } else {
    tx = await contract.unstake(planId || 0);
  }

  const receipt = await tx.wait();
  return {
    hash: tx.hash as string,
    ok: receipt?.status === 1,
  };
}

export default function StakingScreen({
  theme = "dark",
  lang = "en",
  address = "",
  privateKey = "",
}: {
  theme?: "dark" | "light";
  lang?: string;
  address?: string;
  privateKey?: string;
}) {
  const isLight = theme === "light";
  const [networkKey, setNetworkKey] = useState(getStoredNetwork().key);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [lastHash, setLastHash] = useState("");

  useEffect(() => {
    const sync = () => setNetworkKey(getStoredNetwork().key);
    window.addEventListener("wallet-network-updated", sync as EventListener);
    return () => window.removeEventListener("wallet-network-updated", sync as EventListener);
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const next = await readOverview(address);
      setOverview(next);
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || "Failed to load staking contract");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = window.setInterval(load, 12000);
    return () => window.clearInterval(id);
  }, [address]);

  const wrongNetwork = networkKey !== "inri";
  const canWrite = !!privateKey && !!address && !wrongNetwork;
  const chosenPlan = useMemo(() => overview?.plans.find((item) => item.id === selectedPlan) || null, [overview, selectedPlan]);

  function showInfo(text: string) {
    setInfo(text);
    window.setTimeout(() => setInfo(""), 3200);
  }

  async function copyContract() {
    try {
      await navigator.clipboard.writeText(STAKING_ADDRESS);
      showInfo("Contract copied");
    } catch {
      showInfo("Copy failed");
    }
  }

  async function onStake() {
    if (!canWrite || !chosenPlan) return;
    const numeric = Number(amount || "0");
    if (!Number.isFinite(numeric) || numeric < 100) {
      showInfo("Minimum stake is 100 INRI");
      return;
    }
    try {
      setBusy(true);
      setPendingAction({ type: "stake", planId: chosenPlan.id });
      const tx = await sendTx(privateKey, "stake", chosenPlan.id, amount);
      setLastHash(tx.hash);
      setAmount("");
      showInfo(tx.ok ? "Stake confirmed" : "Stake failed");
      await load();
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || "Stake failed");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function onClaim() {
    if (!canWrite) return;
    try {
      setBusy(true);
      setPendingAction({ type: "claim" });
      const tx = await sendTx(privateKey, "claimAll");
      setLastHash(tx.hash);
      showInfo(tx.ok ? "Claim confirmed" : "Claim failed");
      await load();
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || "Claim failed");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function onRestake(planId: number) {
    if (!canWrite) return;
    try {
      setBusy(true);
      setPendingAction({ type: "restake", planId });
      const tx = await sendTx(privateKey, "restakeToPlan", planId);
      setLastHash(tx.hash);
      showInfo(tx.ok ? "Restake confirmed" : "Restake failed");
      await load();
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || "Restake failed");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function onUnstake(planId: number) {
    if (!canWrite) return;
    try {
      setBusy(true);
      setPendingAction({ type: "unstake", planId });
      const tx = await sendTx(privateKey, "unstake", planId);
      setLastHash(tx.hash);
      showInfo(tx.ok ? "Unstake confirmed" : "Unstake failed");
      await load();
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || "Unstake failed");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <ScreenCard theme={theme}>
        <SectionTitle
          theme={theme}
          title={tr(lang, "staking_title")}
          subtitle="Live INRI staking connected to the official contract."
          actions={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ActionButton theme={theme} tone="secondary" compact onClick={copyContract}>Copy contract</ActionButton>
              <a href={`${EXPLORER_ADDRESS_URL}${STAKING_ADDRESS}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <ActionButton theme={theme} tone="ghost" compact>Open explorer</ActionButton>
              </a>
              <ActionButton theme={theme} tone="secondary" compact onClick={() => load()}>Refresh</ActionButton>
            </div>
          }
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          <StatusPill theme={theme} tone={overview?.started ? "success" : "warning"}>{overview?.started ? "Program started" : "Not started"}</StatusPill>
          <StatusPill theme={theme} tone={wrongNetwork ? "danger" : "primary"}>{wrongNetwork ? "Switch to INRI" : "INRI network"}</StatusPill>
          <StatusPill theme={theme} tone={overview?.newStakesPaused ? "warning" : "neutral"}>{overview?.newStakesPaused ? "New stakes paused" : "New stakes open"}</StatusPill>
          <StatusPill theme={theme} tone={overview?.emergencyExitEnabled ? "danger" : "neutral"}>{overview?.emergencyExitEnabled ? "Emergency exit on" : "Normal mode"}</StatusPill>
        </div>

        {info ? <div style={{ marginTop: 12, color: isLight ? "#2753b0" : "#8fb2ff", fontWeight: 700 }}>{info}</div> : null}
        {error ? <div style={{ marginTop: 12, color: "#ff7b7b", fontWeight: 700 }}>{error}</div> : null}
      </ScreenCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <MetricCard theme={theme} label="Wallet balance" value={overview ? `${formatAmount(overview.walletBalance)} INRI` : loading ? "Loading..." : "-"} />
        <MetricCard theme={theme} label="Pending rewards" value={overview ? `${formatAmount(overview.pendingRewards)} INRI` : loading ? "Loading..." : "-"} />
        <MetricCard theme={theme} label="Contract balance" value={overview ? `${formatAmount(overview.currentContractBalance)} INRI` : loading ? "Loading..." : "-"} />
        <MetricCard theme={theme} label="Rewards remaining" value={overview ? `${formatAmount(overview.baseRewardsRemaining)} INRI` : loading ? "Loading..." : "-"} />
        <MetricCard theme={theme} label="Current era" value={overview ? String(overview.currentEra) : loading ? "Loading..." : "-"} />
        <MetricCard theme={theme} label="Emission / day" value={overview ? `${formatAmount(overview.emissionPerDayCurrentEra)} INRI` : loading ? "Loading..." : "-"} />
      </div>

      <ScreenCard theme={theme}>
        <SectionTitle
          theme={theme}
          title="Stake INRI"
          subtitle="Choose a plan, type the amount, and send the transaction directly from the wallet."
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 14 }}>
          {(overview?.plans || []).map((plan) => {
            const active = selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                style={{
                  textAlign: "left",
                  border: `1px solid ${active ? "#3f7cff" : isLight ? "#dbe2f0" : "#252b39"}`,
                  borderRadius: 18,
                  background: active ? (isLight ? "#eef4ff" : "rgba(63,124,255,.14)") : (isLight ? "#ffffff" : "#121621"),
                  padding: 16,
                  cursor: "pointer",
                  color: isLight ? "#10131a" : "#ffffff",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 18 }}>Plan {plan.id + 1}</div>
                <div style={{ marginTop: 8, color: isLight ? "#5b6578" : "#97a0b3" }}>{formatDuration(plan.duration)}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <StatusPill theme={theme} tone="primary">{formatMultiplier(plan.multiplierBps)}</StatusPill>
                  <StatusPill theme={theme} tone="warning">Penalty {formatBpsPercent(plan.penaltyBps)}</StatusPill>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, marginTop: 16 }}>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount in INRI"
            style={{
              minWidth: 0,
              width: "100%",
              borderRadius: 14,
              border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
              background: isLight ? "#ffffff" : "#0f1520",
              color: isLight ? "#10131a" : "#ffffff",
              padding: "0 14px",
              minHeight: 44,
              outline: "none",
            }}
          />
          <ActionButton theme={theme} tone="secondary" onClick={() => setAmount(overview ? Number(ethers.formatEther(overview.walletBalance)).toFixed(4) : "0")}>Max</ActionButton>
          <ActionButton theme={theme} tone="primary" disabled={busy || !canWrite || !overview?.started || overview?.newStakesPaused} onClick={onStake}>
            {pendingAction?.type === "stake" ? "Staking..." : "Stake now"}
          </ActionButton>
        </div>

        <div style={{ marginTop: 12, color: isLight ? "#5b6578" : "#97a0b3", lineHeight: 1.6 }}>
          Contract: <span style={{ fontWeight: 700 }}>{STAKING_ADDRESS}</span><br />
          User: <span style={{ fontWeight: 700 }}>{address || "Wallet locked"}</span><br />
          Next claim: <span style={{ fontWeight: 700 }}>{overview ? formatDate(overview.nextClaimAt) : "-"}</span>
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ActionButton theme={theme} tone="primary" disabled={busy || !canWrite || !overview?.canClaim || !overview?.pendingRewards} onClick={onClaim}>
            {pendingAction?.type === "claim" ? "Claiming..." : "Claim all rewards"}
          </ActionButton>
          {!canWrite ? (
            <StatusPill theme={theme} tone="warning">Unlock wallet on INRI to send transactions</StatusPill>
          ) : null}
        </div>
      </ScreenCard>

      <div style={{ display: "grid", gap: 12 }}>
        {(overview?.positions || []).map((position) => {
          const plan = overview?.plans.find((item) => item.id === position.id);
          return (
            <ScreenCard key={position.id} theme={theme}>
              <SectionTitle
                theme={theme}
                title={`Plan ${position.id + 1} position`}
                subtitle={plan ? `${formatDuration(plan.duration)} • ${formatMultiplier(plan.multiplierBps)} weight` : ""}
                actions={
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <StatusPill theme={theme} tone={position.active ? "success" : "neutral"}>{position.active ? "Active" : "Empty"}</StatusPill>
                    <StatusPill theme={theme} tone={position.unlockAt && Number(position.unlockAt) * 1000 > Date.now() && !overview.emergencyExitEnabled ? "warning" : "success"}>
                      {timeLeftLabel(position.unlockAt, overview.emergencyExitEnabled)}
                    </StatusPill>
                  </div>
                }
              />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 14 }}>
                <MiniStat theme={theme} label="Principal" value={`${formatAmount(position.principal)} INRI`} />
                <MiniStat theme={theme} label="Weight" value={formatAmount(position.weight)} />
                <MiniStat theme={theme} label="Pending" value={`${formatAmount(position.pendingRewards)} INRI`} />
                <MiniStat theme={theme} label="Unlock at" value={formatDate(position.unlockAt)} />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                <ActionButton theme={theme} tone="secondary" disabled={busy || !canWrite || !overview.pendingRewards} onClick={() => onRestake(position.id)}>
                  {pendingAction?.type === "restake" && pendingAction.planId === position.id ? "Restaking..." : "Restake rewards here"}
                </ActionButton>
                <ActionButton theme={theme} tone="danger" disabled={busy || !canWrite || !position.active} onClick={() => onUnstake(position.id)}>
                  {pendingAction?.type === "unstake" && pendingAction.planId === position.id ? "Unstaking..." : "Unstake plan"}
                </ActionButton>
              </div>
            </ScreenCard>
          );
        })}
      </div>

      {lastHash ? (
        <ScreenCard theme={theme}>
          <SectionTitle theme={theme} title="Last transaction" subtitle="Latest staking transaction sent from the wallet." />
          <div style={{ marginTop: 12, color: isLight ? "#10131a" : "#ffffff", fontWeight: 700, wordBreak: "break-all" }}>{lastHash}</div>
          <div style={{ marginTop: 12 }}>
            <a href={`${EXPLORER_TX_URL}${lastHash}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              <ActionButton theme={theme} tone="ghost">Open transaction on explorer</ActionButton>
            </a>
          </div>
        </ScreenCard>
      ) : null}
    </div>
  );
}

function MetricCard({ theme = "dark", label, value }: { theme?: "dark" | "light"; label: string; value: string }) {
  const isLight = theme === "light";
  return (
    <ScreenCard theme={theme}>
      <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13, marginBottom: 6 }}>{label}</div>
      <div style={{ color: isLight ? "#10131a" : "#ffffff", fontWeight: 900, fontSize: 20, lineHeight: 1.25 }}>{value}</div>
    </ScreenCard>
  );
}

function MiniStat({ theme = "dark", label, value }: { theme?: "dark" | "light"; label: string; value: string }) {
  const isLight = theme === "light";
  return (
    <div style={{ border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, borderRadius: 16, padding: 14, background: isLight ? "#f8fbff" : "#0f1520" }}>
      <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13, marginBottom: 6 }}>{label}</div>
      <div style={{ color: isLight ? "#10131a" : "#ffffff", fontWeight: 800, lineHeight: 1.35, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}
