import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import ActionButton from "../components/ActionButton";
import LogoImage from "../components/LogoImage";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import StatusPill from "../components/StatusPill";
import { getStoredNetwork } from "../lib/network";
import {
  claimAllInriTx,
  formatDuration,
  formatInri,
  formatMultiplierFromBps,
  formatPercentFromBps,
  formatTimestamp,
  INRI_STAKING_ADDRESS,
  loadStakingOverview,
  restakeRewardsTx,
  shortHash,
  stakeInriTx,
  stakingAddressUrl,
  stakingTxUrl,
  timeUntilLabel,
  unstakeInriTx,
  type StakingOverview,
} from "../lib/staking";

const BASE = import.meta.env.BASE_URL || "/";
const ACTIVITY_KEY = "wallet_activity_demo";
const MIN_FIRST_STAKE_INRI = 100;
const MAX_PER_PLAN_INRI = 10000;

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
  const [message, setMessage] = useState("");
  const [lastTxHash, setLastTxHash] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  useEffect(() => {
    const sync = () => setNetworkKey(getStoredNetwork().key);
    window.addEventListener("wallet-network-updated", sync as EventListener);
    return () => window.removeEventListener("wallet-network-updated", sync as EventListener);
  }, []);

  useEffect(() => {
    let alive = true;

    const load = async (silent = false) => {
      try {
        if (!silent) setMessage("");
        const next = await loadStakingOverview(address);
        if (!alive) return;
        setOverview(next);
      } catch (err: any) {
        if (!alive) return;
        setMessage(err?.shortMessage || err?.message || t.loadFailed);
      }
    };

    load();
    const id = window.setInterval(() => load(true), 8000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [address, refreshKey, t.loadFailed]);

  useEffect(() => {
    if (!overview?.positions?.length) return;
    const activePositions = overview.positions.filter((item) => item.principal > 0n);
    if (!activePositions.length) return;

    const currentSelected = overview.positions.find((item) => item.id === selectedPlanId);
    if (currentSelected && currentSelected.principal > 0n) return;

    const preferred = [...activePositions].sort((a, b) => (b.principal === a.principal ? 0 : b.principal > a.principal ? 1 : -1))[0];
    if (preferred) setSelectedPlanId(preferred.id);
  }, [overview, selectedPlanId]);

  const selectedPlan = useMemo(() => overview?.plans.find((item) => item.id === selectedPlanId) || overview?.plans[0] || null, [overview, selectedPlanId]);
  const selectedPosition = useMemo(() => overview?.positions.find((item) => item.id === selectedPlanId) || null, [overview, selectedPlanId]);
  const wrongNetwork = networkKey !== "inri";
  const hasWallet = !!address && ethers.isAddress(address);
  const canWrite = hasWallet && !!privateKey && !wrongNetwork;
  const numericAmount = Number(amount || "0");
  const validAmount = Number.isFinite(numericAmount) && numericAmount > 0;
  const walletBalanceInri = Number(overview ? ethers.formatEther(overview.walletBalance) : 0);
  const selectedPrincipalInri = Number(selectedPosition ? ethers.formatEther(selectedPosition.principal) : 0);
  const planRemainingInri = Math.max(0, MAX_PER_PLAN_INRI - selectedPrincipalInri);
  const minimumForSelectedPlan = selectedPosition && selectedPosition.principal > 0n ? 0 : MIN_FIRST_STAKE_INRI;
  const maxStakeNowInri = Math.max(0, Math.min(walletBalanceInri, planRemainingInri));
  const validationMessage = !validAmount
    ? ""
    : numericAmount > walletBalanceInri
      ? t.balanceTooLow
      : numericAmount > planRemainingInri
        ? t.planMaxReached(planRemainingInri.toLocaleString(undefined, { maximumFractionDigits: 4 }))
        : numericAmount < minimumForSelectedPlan
          ? t.minimumFirstStake(MIN_FIRST_STAKE_INRI)
          : "";
  const canStake = !!overview?.started && !overview?.newStakesPaused && !overview?.emergencyExitEnabled && validAmount && !validationMessage && numericAmount <= walletBalanceInri && numericAmount <= planRemainingInri && numericAmount >= minimumForSelectedPlan && canWrite;
  const canClaim = !!overview?.pendingRewards && overview.pendingRewards > 0n && !!overview?.canClaim && canWrite;
  const totalStaked = useMemo(() => (overview?.positions || []).reduce((sum, item) => sum + item.principal, 0n), [overview]);
  const activePlansCount = useMemo(() => (overview?.positions || []).filter((item) => item.principal > 0n).length, [overview]);
  const primaryPosition = useMemo(() => {
    const active = (overview?.positions || []).filter((item) => item.principal > 0n);
    if (!active.length) return null;
    return [...active].sort((a, b) => (b.principal === a.principal ? 0 : b.principal > a.principal ? 1 : -1))[0];
  }, [overview]);
  const primaryPlanLabel = primaryPosition ? t.planName(Number(primaryPosition.id) + 1) : t.noActivePlan;

  function triggerRefresh() {
    setRefreshKey((value) => value + 1);
  }

  function showInfo(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3600);
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
    setAmount(maxStakeNowInri.toFixed(4).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1"));
  }

  function ensureWriteAllowed() {
    if (!hasWallet) {
      showInfo(t.unlockRequired);
      return false;
    }
    if (!privateKey) {
      showInfo(t.unlockRequired);
      return false;
    }
    if (wrongNetwork) {
      showInfo(t.switchToInri);
      return false;
    }
    return true;
  }

  async function runStake() {
    if (!ensureWriteAllowed() || !selectedPlan || !validAmount) return;
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
      setMessage(`${t.txSent} ${shortHash(result.hash)}`);
      triggerRefresh();
    } catch (err: any) {
      setMessage(err?.shortMessage || err?.message || t.txFailed);
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function runClaim() {
    if (!ensureWriteAllowed()) return;
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
      setMessage(`${t.txSent} ${shortHash(result.hash)}`);
      triggerRefresh();
    } catch (err: any) {
      setMessage(err?.shortMessage || err?.message || t.txFailed);
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function runRestake(planId: number) {
    if (!ensureWriteAllowed()) return;
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
      setMessage(`${t.txSent} ${shortHash(result.hash)}`);
      triggerRefresh();
    } catch (err: any) {
      setMessage(err?.shortMessage || err?.message || t.txFailed);
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function runUnstake(planId: number) {
    if (!ensureWriteAllowed()) return;
    try {
      setBusy(true);
      setPendingAction({ type: "unstake", planId });
      setMessage(t.unstakingNow);
      const result = await unstakeInriTx(privateKey, planId);
      const planPosition = overview?.positions.find((item) => item.id === planId);
      setLastTxHash(result.hash);
      saveActivity({
        hash: result.hash,
        method: "unstake",
        symbol: "INRI",
        amount: planPosition ? formatInri(planPosition.principal, 6) : "0",
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
      setMessage(`${t.txSent} ${shortHash(result.hash)}`);
      triggerRefresh();
    } catch (err: any) {
      setMessage(err?.shortMessage || err?.message || t.txFailed);
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

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
                <a href={stakingAddressUrl()} target="_blank" rel="noreferrer" className="wallet-link-chip" style={{ minHeight: 38, padding: "9px 12px" }}>
                  {t.openContract}
                </a>
              </div>
            </div>
          </div>

          <div className="wallet-ui-grid-2 wallet-mobile-single-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <StatCard theme={theme} label={t.walletBalance} value={`${overview ? formatInri(overview.walletBalance) : "0"} INRI`} />
            <StatCard theme={theme} label={t.pendingRewards} value={`${overview ? formatInri(overview.pendingRewards) : "0"} INRI`} />
            <StatCard theme={theme} label={t.contractBalance} value={`${overview ? formatInri(overview.currentContractBalance) : "0"} INRI`} />
            <StatCard theme={theme} label={t.emissionDay} value={`${overview ? formatInri(overview.emissionPerDayCurrentEra) : "0"} INRI`} />
            <StatCard theme={theme} label={t.baseRewardsRemaining} value={`${overview ? formatInri(overview.baseRewardsRemaining) : "0"} INRI`} />
            <StatCard theme={theme} label={t.nextClaim} value={overview ? (overview.canClaim ? t.readyNow : formatTimestamp(overview.nextClaimAt)) : "-"} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <StatCard theme={theme} label={t.totalStakedLabel} value={`${formatInri(totalStaked)} INRI`} />
            <StatCard theme={theme} label={t.activePlansLabel} value={String(activePlansCount)} />
            <StatCard theme={theme} label={t.mainPlanLabel} value={primaryPlanLabel} />
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

      {!hasWallet ? (
        <ScreenCard theme={theme}>
          <SectionTitle theme={theme} title={t.readOnlyTitle} subtitle={t.readOnlySubtitle} />
        </ScreenCard>
      ) : null}

      <ScreenCard theme={theme}>
        <SectionTitle theme={theme} title={t.depositTitle} subtitle={t.depositSubtitle} />
        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div className="wallet-ui-subtle">{t.amountHelp}</div>
            <div className="wallet-action-row">
              <ActionButton theme={theme} compact onClick={setMaxAmount} disabled={!overview || maxStakeNowInri <= 0}>{t.max}</ActionButton>
              <ActionButton theme={theme} compact onClick={triggerRefresh}>{t.refresh}</ActionButton>
              <ActionButton theme={theme} compact tone="primary" onClick={runClaim} disabled={!canClaim || busy}>
                {busy && pendingAction?.type === "claim" ? t.processing : t.claimAll}
              </ActionButton>
            </div>
          </div>

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

          {selectedPlan ? (
            <div style={{ border: `1px solid ${validationMessage ? "#ef4444" : isLight ? "#e2e8f0" : "#1f2937"}`, borderRadius: 18, padding: 14, background: isLight ? "#f8fafc" : "#0b1120", display: "grid", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900, color: isLight ? "#0f172a" : "#ffffff", fontSize: 18 }}>{t.selectedPlan(Number(selectedPlan.id) + 1)}</div>
                  <div className="wallet-ui-subtle">{t.planLine(formatDuration(selectedPlan.duration), formatMultiplierFromBps(selectedPlan.multiplierBps), formatPercentFromBps(selectedPlan.penaltyBps))}</div>
                </div>
                <ActionButton theme={theme} tone="primary" onClick={runStake} disabled={!canStake || busy}>
                  {busy && pendingAction?.type === "stake" ? t.processing : t.stakeNow}
                </ActionButton>
              </div>

              <div className="wallet-action-row" style={{ gap: 8, flexWrap: "wrap" }}>
                <StatusPill theme={theme} tone="primary">{t.minimumChip(minimumForSelectedPlan > 0 ? `${minimumForSelectedPlan} INRI` : t.noMinimumShort)}</StatusPill>
                <StatusPill theme={theme} tone="warning">{t.maximumChip(`${MAX_PER_PLAN_INRI.toLocaleString()} INRI`)}</StatusPill>
                <StatusPill theme={theme} tone="success">{t.remainingChip(`${planRemainingInri.toLocaleString(undefined, { maximumFractionDigits: 4 })} INRI`)}</StatusPill>
                <StatusPill theme={theme} tone="neutral">{t.currentInPlanChip(`${selectedPosition ? formatInri(selectedPosition.principal) : "0"} INRI`)}</StatusPill>
              </div>

              <div className="wallet-ui-subtle">{t.gasHint}</div>

              {validationMessage ? (
                <div style={{ color: "#fca5a5", fontWeight: 800 }}>{validationMessage}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </ScreenCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        {(overview?.plans || []).map((plan) => {
          const position = overview?.positions.find((item) => item.id === plan.id);
          const isSelected = selectedPlanId === plan.id;
          const stakeBusy = busy && pendingAction?.type === "stake" && pendingAction?.planId === plan.id;
          const restakeBusy = busy && pendingAction?.type === "restake" && pendingAction?.planId === plan.id;
          const unstakeBusy = busy && pendingAction?.type === "unstake" && pendingAction?.planId === plan.id;
          const hasPrincipal = !!position && position.principal > 0n;
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
                    <div style={{ fontWeight: 900, color: isLight ? "#0f172a" : "#ffffff", fontSize: 21 }}>{t.planName(Number(plan.id) + 1)}</div>
                    <div className="wallet-ui-subtle">{t.planDuration(formatDuration(plan.duration))}</div>
                  </div>
                  {isSelected ? <StatusPill theme={theme} tone="primary">{t.selected}</StatusPill> : null}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <InfoRow theme={theme} label={t.multiplier} value={formatMultiplierFromBps(plan.multiplierBps)} />
                  <InfoRow theme={theme} label={t.earlyExitPenalty} value={overview?.emergencyExitEnabled ? t.penaltyDisabled : formatPercentFromBps(plan.penaltyBps)} />
                  <InfoRow theme={theme} label={t.yourPrincipal} value={`${position ? formatInri(position.principal) : "0"} INRI`} />
                  <InfoRow theme={theme} label={t.planPending} value={`${position ? formatInri(position.pendingRewards, 6) : "0"} INRI`} />
                  <InfoRow theme={theme} label={t.unlockAt} value={position?.unlockAt ? formatTimestamp(position.unlockAt) : "-"} />
                  <InfoRow theme={theme} label={t.timeLeft} value={position?.unlockAt ? timeUntilLabel(position.unlockAt, !!overview?.emergencyExitEnabled) : "-"} />
                </div>

                <div className="wallet-action-row">
                  <ActionButton theme={theme} onClick={() => setSelectedPlanId(plan.id)} disabled={isSelected}>{isSelected ? t.selected : t.useForStake}</ActionButton>
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
  const pt = String(lang || "").toLowerCase().startsWith("pt");
  if (pt) {
    return {
      title: "Staking INRI",
      subtitle: "Contrato oficial de staking conectado dentro da carteira.",
      live: "Ao vivo",
      notStarted: "Não iniciado",
      paused: "Novos stakes pausados",
      emergency: "Saída de emergência",
      era: (n: number) => `Era ${n || 0}`,
      contractLabel: "Contrato oficial",
      copy: "Copiar",
      openContract: "Abrir contrato",
      walletBalance: "Saldo da wallet",
      pendingRewards: "Recompensas pendentes",
      contractBalance: "Saldo do contrato",
      emissionDay: "Emissão por dia",
      baseRewardsRemaining: "Base restante",
      nextClaim: "Próximo claim",
    totalStakedLabel: "Seu total em staking",
    activePlansLabel: "Planos ativos",
    mainPlanLabel: "Plano principal",
      readyNow: "Liberado agora",
      switchWarningTitle: "Rede errada para staking",
      switchWarningBody: "Troque a rede ativa para INRI. A leitura do contrato continua, mas stake, claim, restake e unstake ficam bloqueados fora da INRI.",
      readOnlyTitle: "Modo leitura",
      readOnlySubtitle: "Desbloqueie uma wallet para stake, claim, restake e unstake direto daqui.",
      depositTitle: "Depositar no staking",
      depositSubtitle: "Escolha um plano, digite o valor em INRI e envie direto para o contrato.",
      amountHelp: "Veja abaixo o mínimo, o máximo e o espaço restante do plano selecionado.",
      minimumLabel: "Mínimo neste plano",
      maximumLabel: "Máximo por plano",
      remainingLabel: "Espaço restante no plano",
      walletAvailableLabel: "Disponível na wallet",
      noMinimumNow: "Sem mínimo adicional",
      noMinimumShort: "sem mínimo",
      minimumChip: (value: string) => `Mínimo ${value}` ,
      maximumChip: (value: string) => `Máximo ${value}` ,
      remainingChip: (value: string) => `Restante ${value}` ,
      gasHint: "Dica: deixe um pouco de INRI livre na wallet para a taxa da rede ao fazer stake.",
      minimumFirstStake: (value: number) => `Primeiro depósito neste plano deve ser no mínimo ${value} INRI.`,
      planMaxReached: (value: string) => `Esse plano só aceita mais ${value} INRI antes de atingir o máximo.`,
      balanceTooLow: "Saldo insuficiente na wallet para esse valor.",
      max: "Max",
      refresh: "Atualizar",
      claimAll: "Claim all",
      amountPlaceholder: "0.00",
      selectedPlan: (n: number) => `Plano ${n}`,
      planLine: (duration: string, multiplier: string, penalty: string) => `${duration} • boost ${multiplier} • multa ${penalty}`,
      stakeNow: "Stake agora",
      processing: "Processando...",
      multiplier: "Multiplicador",
      earlyExitPenalty: "Multa por saída antecipada",
      yourPrincipal: "Seu principal",
      planPending: "Pendente deste plano",
      unlockAt: "Unlock em",
      timeLeft: "Tempo restante",
      penaltyDisabled: "Multa desativada",
      planName: (n: number) => `Plano ${n}`,
      planDuration: (text: string) => `Duração ${text}`,
      selected: "Selecionado",
      useForStake: "Usar neste plano",
      restakeHere: "Restake aqui",
      unstake: "Unstake",
      programInfoTitle: "Informações do programa",
      programInfoSubtitle: "Dados on-chain lidos do contrato conectado na wallet.",
      programStartedAt: "Programa começou em",
      programEndsAt: "Programa termina em",
      contractAddressFull: "Endereço do contrato",
      contractCopied: "Endereço do contrato copiado.",
      copyFailed: "Não foi possível copiar.",
      unlockRequired: "Desbloqueie a wallet para continuar.",
      switchToInri: "Troque para a rede INRI antes de assinar.",
      stakingNow: "Enviando stake...",
      claimingNow: "Enviando claim...",
      restakingNow: "Enviando restake...",
      unstakingNow: "Enviando unstake...",
      txSent: "Transação enviada:",
      txFailed: "A transação falhou.",
      openExplorer: "Abrir no Explorer",
      loadFailed: "Não foi possível carregar o staking.",
    };
  }

  return {
    title: "INRI Staking",
    subtitle: "Official staking contract connected inside the wallet.",
    live: "Live",
    notStarted: "Not started",
    paused: "New stakes paused",
    emergency: "Emergency exit",
    era: (n: number) => `Era ${n || 0}`,
    contractLabel: "Official contract",
    copy: "Copy",
    openContract: "Open contract",
    walletBalance: "Wallet balance",
    pendingRewards: "Pending rewards",
    contractBalance: "Contract balance",
    emissionDay: "Emission per day",
    baseRewardsRemaining: "Base rewards left",
    nextClaim: "Next claim",
    totalStakedLabel: "Your total staked",
    activePlansLabel: "Active plans",
    mainPlanLabel: "Main plan",
    readyNow: "Ready now",
    switchWarningTitle: "Wrong network for staking",
    switchWarningBody: "Switch the active network to INRI. Contract reads still work, but stake, claim, restake and unstake are blocked outside INRI.",
    readOnlyTitle: "Read-only mode",
    readOnlySubtitle: "Unlock a wallet to stake, claim, restake and unstake directly from here.",
    depositTitle: "Deposit into staking",
    depositSubtitle: "Choose a plan, enter the INRI amount and send it directly to the contract.",
    amountHelp: "See the minimum, maximum and remaining room for the selected plan below.",
    minimumLabel: "Minimum on this plan",
    maximumLabel: "Maximum per plan",
    remainingLabel: "Remaining room on plan",
    walletAvailableLabel: "Available in wallet",
    noMinimumNow: "No extra minimum",
    noMinimumShort: "no minimum",
    minimumChip: (value: string) => `Minimum ${value}` ,
    maximumChip: (value: string) => `Maximum ${value}` ,
    remainingChip: (value: string) => `Remaining ${value}` ,
    gasHint: "Tip: keep a little INRI free in the wallet for network gas when staking.",
    minimumFirstStake: (value: number) => `First deposit on this plan must be at least ${value} INRI.`,
    planMaxReached: (value: string) => `This plan only has room for ${value} INRI before hitting the max.`,
    balanceTooLow: "Wallet balance is too low for this amount.",
    max: "Max",
    refresh: "Refresh",
    claimAll: "Claim all",
    amountPlaceholder: "0.00",
    selectedPlan: (n: number) => `Plan ${n}`,
    planLine: (duration: string, multiplier: string, penalty: string) => `${duration} • boost ${multiplier} • penalty ${penalty}`,
    stakeNow: "Stake now",
    processing: "Processing...",
    multiplier: "Multiplier",
    earlyExitPenalty: "Early exit penalty",
    yourPrincipal: "Your principal",
    planPending: "Pending for this plan",
    unlockAt: "Unlock at",
    timeLeft: "Time left",
    penaltyDisabled: "Penalty disabled",
    planName: (n: number) => `Plan ${n}`,
    planDuration: (text: string) => `Duration ${text}`,
    selected: "Selected",
    useForStake: "Use for stake",
    restakeHere: "Restake here",
    unstake: "Unstake",
    programInfoTitle: "Program information",
    programInfoSubtitle: "On-chain data loaded from the contract connected in the wallet.",
    programStartedAt: "Program started at",
    programEndsAt: "Program ends at",
    contractAddressFull: "Contract address",
    contractCopied: "Contract address copied.",
    copyFailed: "Could not copy.",
    unlockRequired: "Unlock the wallet to continue.",
    switchToInri: "Switch to the INRI network before signing.",
    stakingNow: "Sending stake...",
    claimingNow: "Sending claim...",
    restakingNow: "Sending restake...",
    unstakingNow: "Sending unstake...",
    txSent: "Transaction sent:",
    txFailed: "Transaction failed.",
    openExplorer: "Open in Explorer",
    loadFailed: "Could not load staking.",
  };
}
