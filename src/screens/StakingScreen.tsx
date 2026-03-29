import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import ActionButton from "../components/ActionButton";
import LogoImage from "../components/LogoImage";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import StatusPill from "../components/StatusPill";
import { getStoredNetwork } from "../lib/network";
import {
  claimAllInriTx,
  explainStakingError,
  formatDuration,
  formatInri,
  formatMultiplierFromBps,
  formatPercentFromBps,
  formatTimestamp,
  getPlanFillPercent,
  INRI_STAKING_ADDRESS,
  loadStakingOverview,
  MAX_PER_PLAN_INRI,
  MIN_FIRST_STAKE_INRI,
  restakeRewardsTx,
  shortHash,
  stakeInriTx,
  stakingAddressUrl,
  stakingTxUrl,
  summarizeStaking,
  timeUntilLabel,
  unstakeInriTx,
  waitForStakingSync,
  type StakingOverview,
} from "../lib/staking";

const BASE = import.meta.env.BASE_URL || "/";
const ACTIVITY_KEY = "wallet_activity_demo";

type PendingAction = null | { type: "stake" | "claim" | "restake" | "unstake"; planId?: number };

export default function StakingScreen({
  theme = "dark",
  lang = "en",
  address,
  privateKey,
}: {
  theme?: "dark" | "light";
  lang?: string;
  address: string;
  privateKey: string;
}) {
  const isLight = theme === "light";
  const t = getText(lang);
  const [networkKey, setNetworkKey] = useState(getStoredNetwork().key);
  const [overview, setOverview] = useState<StakingOverview | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState(0);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [lastTxHash, setLastTxHash] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [planTouched, setPlanTouched] = useState(false);

  useEffect(() => {
    const sync = () => setNetworkKey(getStoredNetwork().key);
    window.addEventListener("wallet-network-updated", sync as EventListener);
    return () => window.removeEventListener("wallet-network-updated", sync as EventListener);
  }, []);

  useEffect(() => {
    setPlanTouched(false);
    setSelectedPlanId(0);
    setAmount("");
  }, [address]);

  const hasWallet = !!address && ethers.isAddress(address);
  const wrongNetwork = networkKey !== "inri";
  const canWrite = hasWallet && !!privateKey && !wrongNetwork;

  const refreshOverview = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const next = await loadStakingOverview(address);
      setOverview(next);
      return next;
    } catch (error: any) {
      setMessage(explainStakingError(error, lang) || t.loadFailed);
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [address, lang, t.loadFailed]);

  useEffect(() => {
    let active = true;

    const load = async (silent = false) => {
      const next = await refreshOverview(silent);
      if (!active || !next) return;
    };

    load(false);
    const intervalId = window.setInterval(() => {
      load(true);
    }, 8000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [refreshOverview]);

  useEffect(() => {
    if (planTouched || !overview?.positions?.length) return;
    const activePositions = overview.positions.filter((position) => position.principal > 0n);
    if (!activePositions.length) return;

    const main = [...activePositions].sort((a, b) => {
      if (a.principal === b.principal) return a.id - b.id;
      return b.principal > a.principal ? 1 : -1;
    })[0];

    if (main && main.id !== selectedPlanId) {
      setSelectedPlanId(main.id);
    }
  }, [overview, planTouched, selectedPlanId]);

  const selectedPlan = useMemo(() => overview?.plans.find((plan) => plan.id === selectedPlanId) || overview?.plans[0] || null, [overview, selectedPlanId]);
  const selectedPosition = useMemo(() => overview?.positions.find((position) => position.id === selectedPlanId) || null, [overview, selectedPlanId]);
  const summary = useMemo(() => summarizeStaking(overview), [overview]);
  const walletBalanceInri = Number(overview ? ethers.formatEther(overview.walletBalance) : 0);
  const selectedPrincipalInri = Number(selectedPosition ? ethers.formatEther(selectedPosition.principal) : 0);
  const planRemainingInri = Math.max(0, MAX_PER_PLAN_INRI - selectedPrincipalInri);
  const minimumForSelectedPlan = selectedPosition && selectedPosition.principal > 0n ? 0 : MIN_FIRST_STAKE_INRI;
  const maxStakeNowInri = Math.max(0, Math.min(planRemainingInri, Math.max(0, walletBalanceInri - 0.02)));
  const numericAmount = Number(amount || "0");
  const validAmount = Number.isFinite(numericAmount) && numericAmount > 0;
  const canClaim = !!overview?.pendingRewards && overview.pendingRewards > 0n && !!overview?.canClaim && canWrite;
  const nextClaimLabel = overview ? (overview.canClaim ? t.readyNow : formatTimestamp(overview.nextClaimAt)) : "-";
  const nextClaimCountdown = overview ? (overview.canClaim ? t.readyNow : timeUntilLabel(overview.nextClaimAt, false)) : "-";

  const validationMessage = !validAmount
    ? ""
    : numericAmount > walletBalanceInri
      ? t.balanceTooLow
      : numericAmount > planRemainingInri
        ? t.planMaxReached(planRemainingInri.toLocaleString(undefined, { maximumFractionDigits: 4 }))
        : numericAmount < minimumForSelectedPlan
          ? t.minimumFirstStake(MIN_FIRST_STAKE_INRI)
          : "";

  const canStake = !!overview?.started
    && !overview?.newStakesPaused
    && !overview?.emergencyExitEnabled
    && validAmount
    && !validationMessage
    && canWrite;

  function showInfo(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3800);
  }

  function saveActivity(entry: any) {
    const current = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify([entry, ...current]));
  }

  async function copyContract() {
    try {
      await navigator.clipboard.writeText(INRI_STAKING_ADDRESS);
      showInfo(t.contractCopied);
    } catch {
      showInfo(t.copyFailed);
    }
  }

  function setMaxAmount() {
    if (!overview) return;
    if (maxStakeNowInri <= 0) {
      setAmount("");
      return;
    }
    setAmount(maxStakeNowInri.toFixed(4).replace(/\.?0+$/, ""));
  }

  function ensureWriteAllowed() {
    if (!hasWallet || !privateKey) {
      showInfo(t.unlockRequired);
      return false;
    }
    if (wrongNetwork) {
      showInfo(t.switchToInri);
      return false;
    }
    return true;
  }

  async function syncAfterTx(previous: StakingOverview | null) {
    const synced = await waitForStakingSync(address, previous);
    if (synced) {
      setOverview(synced);
    } else {
      await refreshOverview(true);
    }
  }

  async function runStake() {
    if (!ensureWriteAllowed() || !selectedPlan || !canStake) return;
    const previous = overview;
    try {
      setBusy(true);
      setPendingAction({ type: "stake", planId: selectedPlan.id });
      setMessage(t.stakingNow);
      const result = await stakeInriTx(privateKey, selectedPlan.id, amount);
      setLastTxHash(result.hash);
      saveActivity({
        hash: result.hash,
        method: "stake",
        symbol: "INRI",
        amount,
        to: INRI_STAKING_ADDRESS,
        from: address,
        createdAt: new Date().toISOString(),
        status: result.status,
        networkKey: "inri",
        networkName: "INRI",
        chainId: 3777,
        gasUsed: result.gasUsed,
        gasPriceGwei: result.gasPriceGwei,
        feeNative: result.feeNative,
        priority: "normal",
      });
      setAmount("");
      setMessage(`${t.txSent} ${shortHash(result.hash)} • ${t.syncing}`);
      await syncAfterTx(previous);
    } catch (error: any) {
      setMessage(explainStakingError(error, lang));
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function runClaim() {
    if (!ensureWriteAllowed()) return;
    const previous = overview;
    try {
      setBusy(true);
      setPendingAction({ type: "claim" });
      setMessage(t.claimingNow);
      const result = await claimAllInriTx(privateKey);
      setLastTxHash(result.hash);
      saveActivity({
        hash: result.hash,
        method: "claim",
        symbol: "INRI",
        amount: overview ? formatInri(overview.pendingRewards, 6) : "0",
        to: address,
        from: INRI_STAKING_ADDRESS,
        createdAt: new Date().toISOString(),
        status: result.status,
        networkKey: "inri",
        networkName: "INRI",
        chainId: 3777,
        gasUsed: result.gasUsed,
        gasPriceGwei: result.gasPriceGwei,
        feeNative: result.feeNative,
        priority: "normal",
      });
      setMessage(`${t.txSent} ${shortHash(result.hash)} • ${t.syncing}`);
      await syncAfterTx(previous);
    } catch (error: any) {
      setMessage(explainStakingError(error, lang));
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function runRestake(planId: number) {
    if (!ensureWriteAllowed()) return;
    const previous = overview;
    try {
      setBusy(true);
      setPendingAction({ type: "restake", planId });
      setMessage(t.restakingNow);
      const result = await restakeRewardsTx(privateKey, planId);
      setLastTxHash(result.hash);
      saveActivity({
        hash: result.hash,
        method: "restake",
        symbol: "INRI",
        amount: overview ? formatInri(overview.pendingRewards, 6) : "0",
        to: INRI_STAKING_ADDRESS,
        from: address,
        createdAt: new Date().toISOString(),
        status: result.status,
        networkKey: "inri",
        networkName: "INRI",
        chainId: 3777,
        gasUsed: result.gasUsed,
        gasPriceGwei: result.gasPriceGwei,
        feeNative: result.feeNative,
        priority: "normal",
      });
      setMessage(`${t.txSent} ${shortHash(result.hash)} • ${t.syncing}`);
      await syncAfterTx(previous);
    } catch (error: any) {
      setMessage(explainStakingError(error, lang));
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function runUnstake(planId: number) {
    if (!ensureWriteAllowed()) return;
    const previous = overview;
    try {
      setBusy(true);
      setPendingAction({ type: "unstake", planId });
      setMessage(t.unstakingNow);
      const result = await unstakeInriTx(privateKey, planId);
      const position = overview?.positions.find((item) => item.id === planId);
      setLastTxHash(result.hash);
      saveActivity({
        hash: result.hash,
        method: "unstake",
        symbol: "INRI",
        amount: position ? formatInri(position.principal, 6) : "0",
        to: address,
        from: INRI_STAKING_ADDRESS,
        createdAt: new Date().toISOString(),
        status: result.status,
        networkKey: "inri",
        networkName: "INRI",
        chainId: 3777,
        gasUsed: result.gasUsed,
        gasPriceGwei: result.gasPriceGwei,
        feeNative: result.feeNative,
        priority: "normal",
      });
      setMessage(`${t.txSent} ${shortHash(result.hash)} • ${t.syncing}`);
      await syncAfterTx(previous);
    } catch (error: any) {
      setMessage(explainStakingError(error, lang));
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  const mainPlanLabel = summary.mainPlanId === null ? t.none : t.planName(summary.mainPlanId + 1);

  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      {message ? (
        <ScreenCard theme={theme}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ color: isLight ? "#0f172a" : "#e2e8f0", fontWeight: 800, wordBreak: "break-word" }}>{message}</div>
            {lastTxHash ? (
              <a href={stakingTxUrl(lastTxHash)} target="_blank" rel="noreferrer" className="wallet-link-chip">
                {t.openExplorer} {shortHash(lastTxHash)}
              </a>
            ) : null}
          </div>
        </ScreenCard>
      ) : null}

      <ScreenCard theme={theme}>
        <SectionTitle
          theme={theme}
          title={t.title}
          subtitle={t.subtitle}
          actions={
            <div className="wallet-action-row">
              {loading ? <StatusPill theme={theme} tone="warning">{t.loading}</StatusPill> : null}
              {overview?.started ? <StatusPill theme={theme} tone="success">{t.live}</StatusPill> : <StatusPill theme={theme} tone="warning">{t.notStarted}</StatusPill>}
              {overview?.newStakesPaused ? <StatusPill theme={theme} tone="warning">{t.paused}</StatusPill> : null}
              {overview?.emergencyExitEnabled ? <StatusPill theme={theme} tone="danger">{t.emergency}</StatusPill> : null}
              {overview ? <StatusPill theme={theme} tone="primary">{t.era(Number(overview.currentEra || 0n))}</StatusPill> : null}
            </div>
          }
        />

        <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <LogoImage src={`${BASE}token-inri.png`} alt="INRI" kind="token" label="INRI" size={44} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: isLight ? "#64748b" : "#94a3b8" }}>{t.contractLabel}</div>
                <div style={{ fontSize: 28, lineHeight: 1.05, fontWeight: 900, color: isLight ? "#0f172a" : "#ffffff" }}>INRI</div>
              </div>
            </div>
            <div style={{ marginLeft: "auto", minWidth: 0, display: "grid", gap: 8 }}>
              <div className="wallet-mini-stat" style={{ background: isLight ? "#f8fafc" : "#0f172a", color: isLight ? "#475569" : "#cbd5e1" }}>
                <span style={{ fontWeight: 800 }}>{shortHash(INRI_STAKING_ADDRESS)}</span>
              </div>
              <div className="wallet-action-row" style={{ justifyContent: "flex-end" }}>
                <ActionButton theme={theme} compact onClick={copyContract}>{t.copy}</ActionButton>
                <ActionButton theme={theme} compact onClick={() => refreshOverview(false)}>{t.refresh}</ActionButton>
                <a href={stakingAddressUrl()} target="_blank" rel="noreferrer" className="wallet-link-chip" style={{ minHeight: 38, padding: "9px 12px" }}>
                  {t.openContract}
                </a>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <StatCard theme={theme} label={t.walletBalance} value={`${overview ? formatInri(overview.walletBalance) : "0"} INRI`} />
            <StatCard theme={theme} label={t.totalStaked} value={`${formatInri(summary.totalStaked)} INRI`} />
            <StatCard theme={theme} label={t.activePlansLabel} value={String(summary.activePlans)} />
            <StatCard theme={theme} label={t.mainPlanLabel} value={mainPlanLabel} />
            <StatCard theme={theme} label={t.pendingRewards} value={`${overview ? formatInri(overview.pendingRewards) : "0"} INRI`} />
            <StatCard theme={theme} label={t.planPendingLabel} value={`${formatInri(summary.totalPlanPending, 6)} INRI`} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <StatCard theme={theme} label={t.contractBalance} value={`${overview ? formatInri(overview.currentContractBalance) : "0"} INRI`} />
            <StatCard theme={theme} label={t.emissionDay} value={`${overview ? formatInri(overview.emissionPerDayCurrentEra) : "0"} INRI`} />
            <StatCard theme={theme} label={t.baseRewardsRemaining} value={`${overview ? formatInri(overview.baseRewardsRemaining) : "0"} INRI`} />
            <StatCard theme={theme} label={t.nextClaim} value={nextClaimLabel} />
            <StatCard theme={theme} label={t.readSource} value={overview ? `${overview.readSource}` : "-"} />
            <StatCard theme={theme} label={t.readBlock} value={overview ? `#${overview.readBlockNumber.toLocaleString()}` : "-"} />
          </div>
        </div>
      </ScreenCard>

      {wrongNetwork ? (
        <ScreenCard theme={theme}>
          <div style={{ display: "grid", gap: 8 }}>
            <StatusPill theme={theme} tone="warning">{t.switchWarningTitle}</StatusPill>
            <div className="wallet-ui-subtle">{t.switchWarningBody}</div>
          </div>
        </ScreenCard>
      ) : null}

      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title={t.dailyClaimTitle} subtitle={t.dailyClaimSubtitle} />
        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <InfoRow theme={theme} label={t.pendingRewards} value={`${overview ? formatInri(overview.pendingRewards, 6) : "0"} INRI`} />
            <InfoRow theme={theme} label={t.nextClaim} value={nextClaimLabel} />
            <InfoRow theme={theme} label={t.claimCooldownLabel} value={nextClaimCountdown} />
            <InfoRow theme={theme} label={t.claimStatusLabel} value={overview ? (overview.canClaim ? t.claimReadyNow : t.claimWaiting) : "-"} />
          </div>

          <div className="wallet-action-row" style={{ gap: 10, flexWrap: "wrap" }}>
            <ActionButton theme={theme} compact tone="primary" onClick={runClaim} disabled={!canClaim || busy}>
              {busy && pendingAction?.type === "claim" ? t.processing : t.claimDaily}
            </ActionButton>
            <StatusPill theme={theme} tone={overview?.canClaim ? "success" : "warning"}>
              {overview?.canClaim ? t.claimReadyNow : t.claimWaiting}
            </StatusPill>
          </div>

          <div className="wallet-ui-subtle">{t.dailyWithdrawNote}</div>
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title={t.depositTitle} subtitle={t.depositSubtitle} />
        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <InfoRow theme={theme} label={t.minimumLabel} value={minimumForSelectedPlan > 0 ? `${minimumForSelectedPlan} INRI` : t.noMinimumNow} />
            <InfoRow theme={theme} label={t.maximumLabel} value={`${MAX_PER_PLAN_INRI.toLocaleString()} INRI`} />
            <InfoRow theme={theme} label={t.remainingLabel} value={`${planRemainingInri.toLocaleString(undefined, { maximumFractionDigits: 4 })} INRI`} />
            <InfoRow theme={theme} label={t.walletAvailableLabel} value={`${walletBalanceInri.toLocaleString(undefined, { maximumFractionDigits: 4 })} INRI`} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
            <input
              className={`wallet-ui-input ${isLight ? "light" : ""}`}
              placeholder={t.amountPlaceholder}
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/,/g, "."))}
              inputMode="decimal"
            />
            <div className="wallet-mini-stat" style={{ background: isLight ? "#f8fafc" : "#0f172a", color: isLight ? "#334155" : "#cbd5e1", justifyContent: "center" }}>
              INRI
            </div>
          </div>

          <div className="wallet-action-row" style={{ gap: 10, flexWrap: "wrap" }}>
            <ActionButton theme={theme} compact onClick={setMaxAmount} disabled={!overview || maxStakeNowInri <= 0}>{t.max}</ActionButton>
            <ActionButton theme={theme} compact tone="primary" onClick={runStake} disabled={!canStake || busy}>
              {busy && pendingAction?.type === "stake" ? t.processing : t.stakeNow}
            </ActionButton>
            <ActionButton theme={theme} compact onClick={runClaim} disabled={!canClaim || busy}>
              {busy && pendingAction?.type === "claim" ? t.processing : t.claimDaily}
            </ActionButton>
          </div>

          <div style={{ border: `1px solid ${validationMessage ? "#ef4444" : isLight ? "#e2e8f0" : "#1f2937"}`, borderRadius: 18, padding: 14, background: isLight ? "#f8fafc" : "#0b1120", display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900, color: isLight ? "#0f172a" : "#ffffff", fontSize: 18 }}>{selectedPlan ? t.selectedPlan(selectedPlan.id + 1) : t.none}</div>
                <div className="wallet-ui-subtle">
                  {selectedPlan ? t.planLine(formatDuration(selectedPlan.duration), formatMultiplierFromBps(selectedPlan.multiplierBps), formatPercentFromBps(selectedPlan.penaltyBps)) : "-"}
                </div>
              </div>
              <StatusPill theme={theme} tone="primary">{t.mainPlanSmall(mainPlanLabel)}</StatusPill>
            </div>

            <div className="wallet-action-row" style={{ gap: 8, flexWrap: "wrap" }}>
              <StatusPill theme={theme} tone="warning">{t.minimumChip(minimumForSelectedPlan > 0 ? `${minimumForSelectedPlan} INRI` : t.noMinimumShort)}</StatusPill>
              <StatusPill theme={theme} tone="primary">{t.maximumChip(`${MAX_PER_PLAN_INRI.toLocaleString()} INRI`)}</StatusPill>
              <StatusPill theme={theme} tone="success">{t.remainingChip(`${planRemainingInri.toLocaleString(undefined, { maximumFractionDigits: 4 })} INRI`)}</StatusPill>
            </div>

            <div className="wallet-ui-subtle">{t.gasHint}</div>
            {validationMessage ? <div style={{ color: "#fca5a5", fontWeight: 800 }}>{validationMessage}</div> : null}
          </div>
        </div>
      </ScreenCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
        {(overview?.plans || []).map((plan) => {
          const position = overview?.positions.find((item) => item.id === plan.id) || null;
          const isSelected = selectedPlanId === plan.id;
          const hasPrincipal = !!position && position.principal > 0n;
          const fillPercent = getPlanFillPercent(position);
          const restakeBusy = busy && pendingAction?.type === "restake" && pendingAction?.planId === plan.id;
          const unstakeBusy = busy && pendingAction?.type === "unstake" && pendingAction?.planId === plan.id;

          return (
            <ScreenCard
              key={plan.id}
              theme={theme}
              style={{
                border: `1px solid ${isSelected ? "#3f7cff" : isLight ? "#dbe2f0" : "#252b39"}`,
                boxShadow: isSelected ? "0 14px 32px rgba(63,124,255,.16)" : undefined,
              }}
            >
              <div style={{ display: "grid", gap: 12 }}>
                <div className="wallet-section-head">
                  <div>
                    <div style={{ fontWeight: 900, color: isLight ? "#0f172a" : "#ffffff", fontSize: 21 }}>{t.planName(plan.id + 1)}</div>
                    <div className="wallet-ui-subtle">{t.planDuration(formatDuration(plan.duration))}</div>
                  </div>
                  {hasPrincipal ? <StatusPill theme={theme} tone="success">{t.active}</StatusPill> : <StatusPill theme={theme} tone="warning">{t.empty}</StatusPill>}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <InfoRow theme={theme} label={t.multiplier} value={formatMultiplierFromBps(plan.multiplierBps)} />
                  <InfoRow theme={theme} label={t.earlyExitPenalty} value={overview?.emergencyExitEnabled ? t.penaltyDisabled : formatPercentFromBps(plan.penaltyBps)} />
                  <InfoRow theme={theme} label={t.yourPrincipal} value={`${position ? formatInri(position.principal) : "0"} INRI`} />
                  <InfoRow theme={theme} label={t.planPending} value={`${position ? formatInri(position.pendingRewards, 6) : "0"} INRI`} />
                  <InfoRow theme={theme} label={t.unlockAt} value={position?.unlockAt ? formatTimestamp(position.unlockAt) : "-"} />
                  <InfoRow theme={theme} label={t.timeLeft} value={position?.unlockAt ? timeUntilLabel(position.unlockAt, !!overview?.emergencyExitEnabled) : "-"} />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, color: isLight ? "#64748b" : "#94a3b8" }}>
                    <span>{t.stakedNow}</span>
                    <span>{fillPercent.toFixed(fillPercent >= 10 ? 0 : 1)}%</span>
                  </div>
                  <div style={{ height: 9, borderRadius: 999, background: isLight ? "#e2e8f0" : "#172033", overflow: "hidden" }}>
                    <div style={{ width: `${fillPercent}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#33c3ff 0%,#5a7cff 100%)" }} />
                  </div>
                </div>

                <div className="wallet-action-row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <ActionButton theme={theme} onClick={() => { setPlanTouched(true); setSelectedPlanId(plan.id); }} disabled={isSelected}>{isSelected ? t.selected : t.useForStake}</ActionButton>
                  <ActionButton theme={theme} onClick={() => runRestake(plan.id)} disabled={!canWrite || !overview?.pendingRewards || overview.pendingRewards <= 0n || busy}>
                    {restakeBusy ? t.processing : t.restakeHere}
                  </ActionButton>
                  <ActionButton theme={theme} tone={hasPrincipal ? "danger" : "secondary"} onClick={() => runUnstake(plan.id)} disabled={!canWrite || !hasPrincipal || busy}>
                    {unstakeBusy ? t.processing : t.unstake}
                  </ActionButton>
                </div>
              </div>
            </ScreenCard>
          );
        })}
      </div>

      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title={t.programInfoTitle} subtitle={t.programInfoSubtitle} />
        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
          <InfoRow theme={theme} label={t.programStartedAt} value={overview ? formatTimestamp(overview.startTime) : "-"} />
          <InfoRow theme={theme} label={t.programEndsAt} value={overview ? formatTimestamp(overview.programEnd) : "-"} />
          <InfoRow theme={theme} label={t.contractAddressFull} value={INRI_STAKING_ADDRESS} mono />
        </div>
      </ScreenCard>
    </div>
  );
}

function StatCard({ theme, label, value }: { theme: "dark" | "light"; label: string; value: string }) {
  const isLight = theme === "light";
  return (
    <div style={{ border: `1px solid ${isLight ? "#e2e8f0" : "#1f2937"}`, borderRadius: 18, padding: 14, background: isLight ? "#f8fafc" : "#0b1120", display: "grid", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".02em", textTransform: "uppercase", color: isLight ? "#64748b" : "#94a3b8" }}>{label}</div>
      <div style={{ color: isLight ? "#0f172a" : "#ffffff", fontWeight: 900, fontSize: 22, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}

function InfoRow({ theme, label, value, mono = false }: { theme: "dark" | "light"; label: string; value: string; mono?: boolean }) {
  const isLight = theme === "light";
  return (
    <div style={{ border: `1px solid ${isLight ? "#e2e8f0" : "#1f2937"}`, borderRadius: 14, padding: "12px 14px", background: isLight ? "#f8fafc" : "#0b1120" }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".02em", textTransform: "uppercase", color: isLight ? "#64748b" : "#94a3b8", marginBottom: 6 }}>{label}</div>
      <div style={{ color: isLight ? "#0f172a" : "#e2e8f0", wordBreak: mono ? "break-all" : "break-word", fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit", fontSize: 14 }}>{value || "-"}</div>
    </div>
  );
}

function getText(lang: string) {
  const pt = lang.toLowerCase().startsWith("pt");
  if (pt) {
    return {
      title: "Staking INRI",
      subtitle: "Leitura mais forte do stake já feito, troca de plano sem travar e saque diário mais claro.",
      live: "AO VIVO",
      loading: "CARREGANDO",
      notStarted: "NÃO INICIADO",
      paused: "PAUSADO",
      emergency: "EMERGÊNCIA",
      era: (value: number) => `ERA ${value || 0}`,
      contractLabel: "Contrato de staking",
      copy: "Copiar",
      refresh: "Atualizar",
      openContract: "Contrato",
      openExplorer: "Explorer",
      walletBalance: "Saldo da wallet",
      totalStaked: "Seu total em staking",
      activePlansLabel: "Planos ativos",
      mainPlanLabel: "Plano principal",
      pendingRewards: "Rewards prontos",
      planPendingLabel: "Pendentes nos planos",
      contractBalance: "Saldo do contrato",
      emissionDay: "Emissão por dia",
      baseRewardsRemaining: "Rewards restantes",
      nextClaim: "Próximo saque",
      dailyClaimTitle: "Saque diário de rewards",
      dailyClaimSubtitle: "O contrato libera o saque geral uma vez por dia quando houver rewards.",
      claimCooldownLabel: "Cooldown atual",
      claimStatusLabel: "Status do saque",
      claimReadyNow: "Saque liberado agora",
      claimWaiting: "Aguardando cooldown",
      dailyWithdrawNote: "Esse botão saca todos os rewards disponíveis do staking de uma vez, respeitando o cooldown de 1 dia do contrato.",
      readSource: "Leitura RPC",
      readBlock: "Bloco lido",
      readyNow: "Liberado agora",
      switchWarningTitle: "Troque para a rede INRI",
      switchWarningBody: "A escrita do staking só funciona com a rede INRI selecionada.",
      depositTitle: "Entrar ou aumentar stake",
      depositSubtitle: "O contrato exige mínimo inicial e máximo por plano.",
      minimumLabel: "Mínimo agora",
      maximumLabel: "Máximo por plano",
      remainingLabel: "Espaço restante no plano",
      walletAvailableLabel: "Disponível na wallet",
      amountPlaceholder: "Digite o valor em INRI",
      max: "Max",
      stakeNow: "Stake now",
      claimAll: "Claim all",
      claimDaily: "Sacar rewards diários",
      processing: "Processando...",
      selectedPlan: (plan: number) => `Plano ${plan}`,
      planLine: (duration: string, mult: string, penalty: string) => `${duration} • ${mult} • multa ${penalty}`,
      minimumChip: (value: string) => `Mínimo ${value}`,
      maximumChip: (value: string) => `Máximo ${value}`,
      remainingChip: (value: string) => `Restante ${value}`,
      noMinimumNow: "Sem mínimo adicional",
      noMinimumShort: "sem mínimo",
      gasHint: "O botão Max já deixa uma pequena sobra para gas.",
      selected: "Selecionado",
      active: "Ativo",
      empty: "Vazio",
      planName: (plan: number) => `Plano ${plan}`,
      planDuration: (value: string) => `Duração ${value}`,
      multiplier: "Multiplicador",
      earlyExitPenalty: "Multa saída antecipada",
      penaltyDisabled: "Sem multa agora",
      yourPrincipal: "Seu stake",
      planPending: "Pendente neste plano",
      unlockAt: "Unlock em",
      timeLeft: "Tempo restante",
      stakedNow: "Ocupação do plano",
      useForStake: "Usar neste plano",
      restakeHere: "Restake aqui",
      unstake: "Unstake",
      programInfoTitle: "Informações do programa",
      programInfoSubtitle: "Dados lidos direto do contrato.",
      programStartedAt: "Início",
      programEndsAt: "Fim",
      contractAddressFull: "Endereço do contrato",
      unlockRequired: "Desbloqueie a wallet para assinar.",
      switchToInri: "Troque para a rede INRI.",
      contractCopied: "Contrato copiado.",
      copyFailed: "Falha ao copiar.",
      stakingNow: "Enviando stake...",
      claimingNow: "Enviando claim...",
      restakingNow: "Enviando restake...",
      unstakingNow: "Enviando unstake...",
      syncing: "sincronizando staking...",
      txSent: "Tx enviada:",
      loadFailed: "Falha ao carregar staking.",
      balanceTooLow: "Saldo insuficiente para esse valor.",
      planMaxReached: (value: string) => `Esse plano só aceita mais ${value} INRI.`,
      minimumFirstStake: (value: number) => `Primeiro stake nesse plano: mínimo de ${value} INRI.`,
      mainPlanSmall: (value: string) => `Principal: ${value}`,
      none: "Nenhum",
    };
  }

  return {
    title: "INRI Staking",
    subtitle: "Stronger reading for existing stake, plan switching without locking, and clearer daily withdrawal.",
    live: "LIVE",
    loading: "LOADING",
    notStarted: "NOT STARTED",
    paused: "PAUSED",
    emergency: "EMERGENCY",
    era: (value: number) => `ERA ${value || 0}`,
    contractLabel: "Staking contract",
    copy: "Copy",
    refresh: "Refresh",
    openContract: "Contract",
    openExplorer: "Explorer",
    walletBalance: "Wallet balance",
    totalStaked: "Your total staked",
    activePlansLabel: "Active plans",
    mainPlanLabel: "Main plan",
    pendingRewards: "Rewards ready",
    planPendingLabel: "Pending in plans",
    contractBalance: "Contract balance",
    emissionDay: "Emission per day",
    baseRewardsRemaining: "Rewards remaining",
    nextClaim: "Next withdrawal",
    dailyClaimTitle: "Daily rewards withdrawal",
    dailyClaimSubtitle: "The contract releases the global claim once per day when rewards are available.",
    claimCooldownLabel: "Current cooldown",
    claimStatusLabel: "Withdrawal status",
    claimReadyNow: "Withdrawal ready now",
    claimWaiting: "Waiting for cooldown",
    dailyWithdrawNote: "This button withdraws all rewards currently available from staking at once, respecting the contract's 1-day cooldown.",
    readSource: "Read source",
    readBlock: "Read block",
    readyNow: "Ready now",
    switchWarningTitle: "Switch to INRI network",
    switchWarningBody: "Staking writes only work when INRI is the selected network.",
    depositTitle: "Enter or increase stake",
    depositSubtitle: "The contract uses a first minimum and a max per plan.",
    minimumLabel: "Minimum now",
    maximumLabel: "Maximum per plan",
    remainingLabel: "Remaining room on plan",
    walletAvailableLabel: "Available in wallet",
    amountPlaceholder: "Enter amount in INRI",
    max: "Max",
    stakeNow: "Stake now",
    claimAll: "Claim all",
    claimDaily: "Daily claim",
    processing: "Processing...",
    selectedPlan: (plan: number) => `Plan ${plan}`,
    planLine: (duration: string, mult: string, penalty: string) => `${duration} • ${mult} • penalty ${penalty}`,
    minimumChip: (value: string) => `Min ${value}`,
    maximumChip: (value: string) => `Max ${value}`,
    remainingChip: (value: string) => `Left ${value}`,
    noMinimumNow: "No extra minimum",
    noMinimumShort: "no min",
    gasHint: "Max already keeps a small gas buffer.",
    selected: "Selected",
    active: "Active",
    empty: "Empty",
    planName: (plan: number) => `Plan ${plan}`,
    planDuration: (value: string) => `Duration ${value}`,
    multiplier: "Multiplier",
    earlyExitPenalty: "Early exit penalty",
    penaltyDisabled: "No penalty now",
    yourPrincipal: "Your stake",
    planPending: "Pending on this plan",
    unlockAt: "Unlock at",
    timeLeft: "Time left",
    stakedNow: "Plan fill",
    useForStake: "Use this plan",
    restakeHere: "Restake here",
    unstake: "Unstake",
    programInfoTitle: "Program info",
    programInfoSubtitle: "Read directly from the contract.",
    programStartedAt: "Started at",
    programEndsAt: "Ends at",
    contractAddressFull: "Contract address",
    unlockRequired: "Unlock the wallet to sign.",
    switchToInri: "Switch to the INRI network.",
    contractCopied: "Contract copied.",
    copyFailed: "Copy failed.",
    stakingNow: "Sending stake...",
    claimingNow: "Sending claim...",
    restakingNow: "Sending restake...",
    unstakingNow: "Sending unstake...",
    syncing: "syncing staking...",
    txSent: "Tx sent:",
    loadFailed: "Failed to load staking.",
    balanceTooLow: "Insufficient wallet balance for this amount.",
    planMaxReached: (value: string) => `This plan only has ${value} INRI left.`,
    minimumFirstStake: (value: number) => `First stake on this plan requires at least ${value} INRI.`,
    mainPlanSmall: (value: string) => `Main: ${value}`,
    none: "None",
  };
}
