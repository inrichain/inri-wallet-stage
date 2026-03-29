import React, { useEffect, useMemo, useState } from "react";
import ActionButton from "../components/ActionButton";
import TransactionConfirmModal from "../components/TransactionConfirmModal";
import EmptyState from "../components/EmptyState";
import LogoImage from "../components/LogoImage";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import StatusPill from "../components/StatusPill";
import {
  approveIusdForBridgeTx,
  approvePolygonUsdtTx,
  bridgeTxUrl,
  burnInriToPolygonTx,
  depositPolygonToInriTx,
  estimateBridgeQuote,
  formatBridgeAmount,
  getBridgeOperations,
  IUSD_TOKEN_ADDRESS,
  INRI_EXECUTOR_ADDRESS,
  loadBridgeBalances,
  parseBridgeAmount,
  POLYGON_LOCKBOX_ADDRESS,
  POLYGON_USDT_ADDRESS,
  verifyBridgeOperations,
  type BridgeDirection,
} from "../lib/bridge";
import { getStoredNetwork } from "../lib/network";

const BASE = import.meta.env.BASE_URL || "/";
const TOKENS = {
  usdt: { symbol: "USDT", logo: `${BASE}token-usdt.png`, network: "Polygon" },
  iusd: { symbol: "iUSD", logo: `${BASE}token-iusd.png`, network: "INRI" },
};

type ConfirmIntent = null | "approve" | "bridge";

export default function BridgeScreen({
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
  const t = getText(lang);
  const isLight = theme === "light";
  const [network, setNetwork] = useState(getStoredNetwork());
  const [direction, setDirection] = useState<BridgeDirection>("polygon_to_inri");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState(address);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [lastTxHash, setLastTxHash] = useState("");
  const [lastTxDirection, setLastTxDirection] = useState<BridgeDirection>("polygon_to_inri");
  const [opsVersion, setOpsVersion] = useState(0);
  const [confirmIntent, setConfirmIntent] = useState<ConfirmIntent>(null);
  const [balances, setBalances] = useState({
    polygonUsdtBalance: 0n,
    polygonUsdtAllowance: 0n,
    inriIusdBalance: 0n,
    inriIusdAllowance: 0n,
    polygonDepositFeeBps: 20,
    polygonReleaseFeeBps: 20,
    inriFeeBps: 20,
  });

  useEffect(() => setDestination(address), [address]);

  useEffect(() => {
    const sync = () => setNetwork(getStoredNetwork());
    window.addEventListener("wallet-network-updated", sync as EventListener);
    return () => window.removeEventListener("wallet-network-updated", sync as EventListener);
  }, []);

  useEffect(() => {
    let alive = true;
    loadBridgeBalances(address)
      .then((next) => alive && setBalances(next))
      .catch(() => alive && setMessage(t.balanceLoadFailed));
    return () => {
      alive = false;
    };
  }, [address, opsVersion, t.balanceLoadFailed]);

  useEffect(() => {
    if (!address) return;
    const tick = async () => {
      try {
        const updates = await verifyBridgeOperations(address);
        if (updates.length) setOpsVersion((v) => v + 1);
      } catch {
        // ignore background poll errors
      }
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [address]);

  const fromToken = direction === "polygon_to_inri" ? TOKENS.usdt : TOKENS.iusd;
  const toToken = direction === "polygon_to_inri" ? TOKENS.iusd : TOKENS.usdt;
  const rawFeeBps = direction === "polygon_to_inri" ? balances.polygonDepositFeeBps : balances.inriFeeBps;
  const feePercent = ((rawFeeBps || 20) / 100);
  const amountRaw = useMemo(() => {
    try {
      return parseBridgeAmount(amount);
    } catch {
      return 0n;
    }
  }, [amount]);
  const quote = useMemo(() => estimateBridgeQuote(direction, amount, feePercent), [direction, amount, feePercent]);
  const requiredNetworkKey = direction === "polygon_to_inri" ? "polygon" : "inri";
  const wrongNetwork = network.key !== requiredNetworkKey;
  const hasEnoughBalance = direction === "polygon_to_inri" ? balances.polygonUsdtBalance >= amountRaw : balances.inriIusdBalance >= amountRaw;
  const needsApproval = direction === "polygon_to_inri" ? balances.polygonUsdtAllowance < amountRaw : balances.inriIusdAllowance < amountRaw;
  const canProceed = !!address && !!privateKey && amountRaw > 0n && hasEnoughBalance && !wrongNetwork;
  const operations = useMemo(() => getBridgeOperations(address).slice(0, 8), [address, opsVersion]);

  async function runVerifyNow() {
    try {
      setBusy(true);
      setMessage(t.checkingStatus);
      const updates = await verifyBridgeOperations(address);
      setOpsVersion((v) => v + 1);
      setMessage(updates.length ? `${updates.length} bridge update(s) found.` : t.noNewUpdates);
    } catch (err: any) {
      setMessage(err?.shortMessage || err?.message || t.statusCheckFailed);
    } finally {
      setBusy(false);
    }
  }

  async function runApprove() {
    if (!privateKey || amountRaw <= 0n) return;
    try {
      setBusy(true);
      setConfirmIntent(null);
      setMessage(t.approving);
      const result = direction === "polygon_to_inri"
        ? await approvePolygonUsdtTx(privateKey, amountRaw, address)
        : await approveIusdForBridgeTx(privateKey, amountRaw, address);
      setLastTxHash(result.hash);
      setLastTxDirection(direction);
      setMessage(`${t.approveDone}: ${shortHash(result.hash)}`);
      setOpsVersion((v) => v + 1);
    } catch (err: any) {
      setMessage(err?.shortMessage || err?.message || t.txFailed);
    } finally {
      setBusy(false);
    }
  }

  async function runBridge() {
    if (!privateKey || amountRaw <= 0n || !destination) return;
    try {
      setBusy(true);
      setConfirmIntent(null);
      setMessage(direction === "polygon_to_inri" ? t.depositing : t.burning);
      const result = direction === "polygon_to_inri"
        ? await depositPolygonToInriTx({ privateKey, amount: amountRaw, destination, walletAddress: address })
        : await burnInriToPolygonTx({ privateKey, amount: amountRaw, destination, walletAddress: address });
      setLastTxHash(result.hash);
      setLastTxDirection(direction);
      setMessage(`${t.txSent}: ${shortHash(result.hash)}`);
      setAmount("");
      setOpsVersion((v) => v + 1);
    } catch (err: any) {
      setMessage(err?.shortMessage || err?.message || t.txFailed);
    } finally {
      setBusy(false);
    }
  }

  const contractAddress = direction === "polygon_to_inri" ? POLYGON_LOCKBOX_ADDRESS : INRI_EXECUTOR_ADDRESS;
  const tokenAddress = direction === "polygon_to_inri" ? POLYGON_USDT_ADDRESS : IUSD_TOKEN_ADDRESS;
  const statusSubtitle = direction === "polygon_to_inri" ? t.depositSubtitle : t.withdrawSubtitle;

  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      {message ? (
        <ScreenCard theme={theme}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ color: isLight ? "#0f172a" : "#e2e8f0", fontWeight: 700, wordBreak: "break-word" }}>{message}</div>
            {lastTxHash ? (
              <a href={bridgeTxUrl(lastTxDirection, lastTxHash)} target="_blank" rel="noreferrer" className="wallet-link-chip">
                {t.openExplorer} {shortHash(lastTxHash)}
              </a>
            ) : null}
          </div>
        </ScreenCard>
      ) : null}

      <ScreenCard theme={theme}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <LogoImage src={fromToken.logo} alt={fromToken.symbol} kind="token" label={fromToken.symbol} size={44} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: isLight ? "#64748b" : "#94a3b8" }}>{fromToken.network} deposit asset</div>
                <div style={{ fontSize: 32, lineHeight: 1.05, fontWeight: 900, color: isLight ? "#0f172a" : "#fff" }}>{fromToken.symbol}</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: isLight ? "#2563eb" : "#60a5fa" }}>⇄</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, marginLeft: "auto" }}>
            <div style={{ minWidth: 0, textAlign: "right" }}>
              <div style={{ fontSize: 13, color: isLight ? "#64748b" : "#94a3b8" }}>{toToken.network} minted asset</div>
              <div style={{ fontSize: 32, lineHeight: 1.05, fontWeight: 900, color: isLight ? "#0f172a" : "#fff" }}>{toToken.symbol}</div>
            </div>
            <LogoImage src={toToken.logo} alt={toToken.symbol} kind="token" label={toToken.symbol} size={44} />
          </div>
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <div style={{ fontSize: 13, fontWeight: 800, color: isLight ? "#64748b" : "#94a3b8", marginBottom: 12 }}>{t.directionLabel}</div>
        <div className="wallet-ui-grid-2 wallet-mobile-single-grid">
          <ModeButton theme={theme} active={direction === "polygon_to_inri"} title={t.depositFlow} subtitle={`${TOKENS.usdt.symbol} → ${TOKENS.iusd.symbol}`} onClick={() => setDirection("polygon_to_inri")} />
          <ModeButton theme={theme} active={direction === "inri_to_polygon"} title={t.withdrawFlow} subtitle={`${TOKENS.iusd.symbol} → ${TOKENS.usdt.symbol}`} onClick={() => setDirection("inri_to_polygon")} />
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <div style={{ fontSize: 13, fontWeight: 800, color: isLight ? "#64748b" : "#94a3b8", marginBottom: 12 }}>{t.route}</div>
        <div style={{ border: `1px solid ${isLight ? "#e2e8f0" : "#1f2937"}`, borderRadius: 20, padding: 16, background: isLight ? "#f8fafc" : "#101826" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <LogoImage src={fromToken.logo} alt={fromToken.symbol} kind="token" label={fromToken.symbol} size={38} />
              <div>
                <div style={{ fontWeight: 900, color: isLight ? "#0f172a" : "#fff" }}>{fromToken.symbol}</div>
                <div className="wallet-ui-subtle">{fromToken.network} deposit asset</div>
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: isLight ? "#2563eb" : "#60a5fa" }}>→</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, marginLeft: "auto" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900, color: isLight ? "#0f172a" : "#fff" }}>{toToken.symbol}</div>
                <div className="wallet-ui-subtle">{toToken.network} minted asset</div>
              </div>
              <LogoImage src={toToken.logo} alt={toToken.symbol} kind="token" label={toToken.symbol} size={38} />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <Input label={t.amount} value={amount} onChange={setAmount} placeholder="0.00" theme={theme} />
          </div>
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <div style={{ fontSize: 13, fontWeight: 800, color: isLight ? "#64748b" : "#94a3b8", marginBottom: 12 }}>{t.transferSummary}</div>
        <div style={{ border: `1px solid ${isLight ? "#e2e8f0" : "#1f2937"}`, borderRadius: 18, padding: 16, background: isLight ? "#f8fafc" : "#0b1120" }}>
          <div style={{ fontSize: 34, lineHeight: 1.1, fontWeight: 900, color: isLight ? "#0f172a" : "#fff" }}>{quote.amountOut} {toToken.symbol}</div>
        </div>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          <InfoRow theme={theme} label={t.route} value={`${fromToken.network} → ${toToken.network}`} />
          <InfoRow theme={theme} label={t.assetFlow} value={`${fromToken.symbol} → ${toToken.symbol}`} />
          <InfoRow theme={theme} label={t.destination} value={destination} mono />
          <InfoRow theme={theme} label={t.fee} value={`${feePercent.toFixed(2)}%`} />
          <InfoRow theme={theme} label={t.status} value={needsApproval ? t.approvalRequired : t.liveContracts} />
        </div>
      </ScreenCard>

      {wrongNetwork ? (
        <ScreenCard theme={theme}>
          <div style={{ color: isLight ? "#b45309" : "#fbbf24", fontWeight: 800 }}>{t.networkWarning(requiredNetworkKey)}</div>
          <div className="wallet-ui-subtle" style={{ marginTop: 8 }}>{t.currentNetwork(network.name)}</div>
        </ScreenCard>
      ) : null}

      <ScreenCard theme={theme}>
        <div className="wallet-action-row">
          {needsApproval ? (
            <ActionButton theme={theme} onClick={() => setConfirmIntent("approve")} disabled={!canProceed || busy}>
              {busy ? t.processing : direction === "polygon_to_inri" ? t.approveUsdt : t.approveIusd}
            </ActionButton>
          ) : null}
          <ActionButton theme={theme} onClick={() => setConfirmIntent("bridge")} disabled={!canProceed || needsApproval || busy} tone="primary">
            {busy ? t.processing : direction === "polygon_to_inri" ? t.depositNow : t.burnNow}
          </ActionButton>
          <ActionButton theme={theme} onClick={runVerifyNow} disabled={busy}>
            {busy ? t.processing : t.checkStatusNow}
          </ActionButton>
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle title={t.contractsAndTokens} subtitle={t.realRouteSummary} theme={theme} compact />
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <InfoRow theme={theme} label={t.sourceContract} value={contractAddress} mono />
          <InfoRow theme={theme} label={t.tokenAddress} value={tokenAddress} mono />
          <InfoRow theme={theme} label={t.validatorTarget} value={direction === "polygon_to_inri" ? INRI_EXECUTOR_ADDRESS : POLYGON_LOCKBOX_ADDRESS} mono />
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle title={t.recentBridgeOps} subtitle={t.pendingUntilAutomation} theme={theme} compact />
        {operations.length === 0 ? (
          <EmptyState theme={theme} title={t.noBridgeOps} description={t.autoVerifyNow} />
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {operations.map((item) => (
              <div key={item.id} style={{ border: `1px solid ${isLight ? "#e2e8f0" : "#1f2937"}`, borderRadius: 16, padding: 14, background: isLight ? "#f8fafc" : "#0b1120" }}>
                <div className="wallet-section-head" style={{ alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900, color: isLight ? "#0f172a" : "#fff" }}>{item.fromSymbol} → {item.toSymbol}</div>
                    <div className="wallet-ui-subtle" style={{ marginTop: 4 }}>{item.stageLabel}</div>
                  </div>
                  <StatusPill theme={theme} tone={item.status === "failed" ? "danger" : item.status === "confirmed" ? "success" : "warning"}>{item.status}</StatusPill>
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  <InfoRow theme={theme} label={t.amount} value={`${item.amountIn} ${item.fromSymbol}`} />
                  <InfoRow theme={theme} label={t.youReceive} value={`${item.amountOut} ${item.toSymbol}`} />
                  <InfoRow theme={theme} label={t.destination} value={item.destination} mono />
                  <InfoRow theme={theme} label={t.fee} value={`${item.feePercent.toFixed(2)}%`} />
                </div>
                <div className="wallet-action-row" style={{ marginTop: 12 }}>
                  {item.sourceTxHash ? <a href={bridgeTxUrl(item.direction, item.sourceTxHash)} target="_blank" rel="noreferrer" className="wallet-link-chip">{t.openTx}</a> : null}
                  {item.claimTxHash ? <a href={bridgeTxUrl(item.direction === "polygon_to_inri" ? "inri_to_polygon" : "polygon_to_inri", item.claimTxHash)} target="_blank" rel="noreferrer" className="wallet-link-chip">{t.openSettlementTx}</a> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScreenCard>

      <TransactionConfirmModal
        open={confirmIntent !== null}
        theme={theme}
        title={confirmIntent === "approve" ? (direction === "polygon_to_inri" ? "Approve USDT for bridge" : "Approve iUSD for bridge") : direction === "polygon_to_inri" ? "Confirm bridge deposit" : "Confirm bridge burn"}
        subtitle={confirmIntent === "approve"
          ? "Review the approval target and amount before granting token spending permissions."
          : "Review the bridge route, destination and fee before sending funds to the bridge contract."}
        actionLabel={confirmIntent === "approve" ? "Approve" : "Bridge"}
        category="INRI Wallet"
        networkName={getStoredNetwork().name}
        networkLogo={getStoredNetwork().logo}
        riskLabel={confirmIntent === "approve" ? "Medium risk" : "Medium risk"}
        riskTone="medium"
        sections={confirmIntent === "approve" ? [
          {
            title: "Approval",
            items: [
              { label: "Token", value: fromToken.symbol },
              { label: "Amount", value: `${quote.amountIn} ${fromToken.symbol}` },
              { label: "Spender", value: contractAddress, mono: true },
              { label: "Network", value: direction === "polygon_to_inri" ? "Polygon" : "INRI" },
            ],
          },
        ] : [
          {
            title: "Bridge route",
            items: [
              { label: "From", value: `${quote.amountIn} ${fromToken.symbol}` },
              { label: "To", value: `${quote.amountOut} ${toToken.symbol}` },
              { label: "Destination", value: destination || address, mono: true },
              { label: "Bridge fee", value: `${feePercent.toFixed(2)}%` },
            ],
          },
          {
            title: "Contracts",
            items: [
              { label: "Bridge contract", value: contractAddress, mono: true },
              { label: "Token contract", value: tokenAddress, mono: true },
            ],
          },
        ]}
        warnings={confirmIntent === "approve"
          ? ["Only approve the bridge contract you trust.", "Approvals let the contract move the approved amount of your tokens."]
          : ["Bridge operations can take time to settle across networks.", "Always double-check the destination address before confirming."]}
        confirmLabel={confirmIntent === "approve" ? t.confirmApproveButton : direction === "polygon_to_inri" ? t.depositNow : t.burnNow}
        confirmBusy={busy}
        onCancel={() => !busy && setConfirmIntent(null)}
        onConfirm={confirmIntent === "approve" ? runApprove : runBridge}
      />
    </div>
  );
}

function ModeButton({ theme, active, title, subtitle, onClick }: { theme: "dark" | "light"; active?: boolean; title: string; subtitle: string; onClick: () => void; }) {
  const isLight = theme === "light";
  return (
    <button onClick={onClick} style={{ border: `1px solid ${active ? "#e5e7eb" : isLight ? "#dbe2f0" : "#243041"}`, background: active ? "#4d7cff" : (isLight ? "#fff" : "#101826"), borderRadius: 18, padding: 18, textAlign: "center", cursor: "pointer" }}>
      <div style={{ fontWeight: 900, color: active ? "#fff" : (isLight ? "#0f172a" : "#fff") }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 13, color: active ? "rgba(255,255,255,.88)" : (isLight ? "#64748b" : "#94a3b8") }}>{subtitle}</div>
    </button>
  );
}

function Input({ label, value, onChange, placeholder, theme }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; theme: "dark" | "light"; }) {
  const isLight = theme === "light";
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".02em", textTransform: "uppercase", color: isLight ? "#64748b" : "#94a3b8" }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ border: `1px solid ${isLight ? "#dbe2f0" : "#253246"}`, background: isLight ? "#fff" : "#0b1120", color: isLight ? "#0f172a" : "#e2e8f0", borderRadius: 14, padding: "14px 16px", width: "100%" }} />
    </label>
  );
}

function MetricCard({ theme, title, value, meta }: { theme: "dark" | "light"; title: string; value: string; meta?: string; }) {
  const isLight = theme === "light";
  return (
    <div style={{ border: `1px solid ${isLight ? "#e2e8f0" : "#1f2937"}`, borderRadius: 16, padding: 14, background: isLight ? "#f8fafc" : "#0b1120" }}>
      <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: isLight ? "#64748b" : "#94a3b8" }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: isLight ? "#0f172a" : "#fff" }}>{value}</div>
      {meta ? <div className="wallet-ui-subtle" style={{ marginTop: 6 }}>{meta}</div> : null}
    </div>
  );
}

function InfoRow({ theme, label, value, mono = false }: { theme: "dark" | "light"; label: string; value: string; mono?: boolean; }) {
  const isLight = theme === "light";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", border: `1px solid ${isLight ? "#e2e8f0" : "#1f2937"}`, borderRadius: 14, padding: "12px 14px", background: isLight ? "#f8fafc" : "#0b1120" }}>
      <div style={{ fontSize: 12, color: isLight ? "#64748b" : "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: isLight ? "#0f172a" : "#e2e8f0", fontWeight: 700, wordBreak: "break-all", textAlign: "right", fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit" }}>{value}</div>
    </div>
  );
}

function shortHash(hash?: string) {
  if (!hash) return "";
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      bridge: "Bridge",
      bridgeReady: "Contracts are connected. Approvals, bridge history and tx links are visible here.",
      liveContracts: "Live contracts",
      switchTo: "Switch to",
      route: "Route",
      directionLabel: "Direction",
      transferSummary: "Transfer summary",
      assetFlow: "Asset flow",
      status: "Status",
      processing: "Processing...",
      amount: "Amount",
      destination: "Destination wallet",
      youPay: "You pay",
      youReceive: "You receive",
      fee: "Bridge fee",
      eta: "Estimated time",
      sourceContract: "Source contract",
      tokenAddress: "Token address",
      validatorTarget: "Settlement contract",
      contractsAndTokens: "Contracts and tokens",
      realRouteSummary: "Real route summary with contract and token addresses.",
      balancesAndAllowances: "Balances and allowances",
      autoVerifyNow: "Background verification now checks whether mint/release was finalized.",
      allowance: "Allowance",
      actions: "Actions",
      approvalRequired: "Approval required before the bridge transaction.",
      readyToBridge: "You can send the bridge transaction now.",
      approveUsdt: "Approve USDT",
      approveIusd: "Approve iUSD",
      depositNow: "Deposit to bridge",
      burnNow: "Burn for release",
      recentBridgeOps: "Recent bridge operations",
      pendingUntilAutomation: "Pending items update automatically when the opposite side finalizes.",
      noBridgeOps: "No bridge operations yet",
      approving: "Submitting approval…",
      approveDone: "Approval confirmed",
      txSent: "Transaction confirmed",
      txFailed: "Bridge transaction failed",
      depositing: "Submitting Polygon deposit…",
      burning: "Submitting INRI burn…",
      insufficientBalance: "Insufficient balance for this bridge operation.",
      confirmDeposit: "Confirm Polygon → INRI deposit",
      confirmBurn: "Confirm INRI → Polygon burn",
      confirmApprove: "Confirm approval",
      confirmApproveButton: "Approve now",
      approveAmount: "Approve amount",
      cancel: "Cancel",
      openTx: "Open source tx",
      openExplorer: "Open in explorer",
      openSettlementTx: "Open settlement tx",
      depositFlow: "Polygon USDT → INRI iUSD",
      withdrawFlow: "INRI iUSD → Polygon USDT",
      depositSubtitle: "Approve USDT on Polygon, deposit to Lockbox, then wait for validator mint on INRI.",
      withdrawSubtitle: "Approve iUSD on INRI, burn in executor, then wait for release on Polygon.",
      networkWarning: (key: string) => `Use the ${key.toUpperCase()} network for this direction.`,
      currentNetwork: (name: string) => `Current network: ${name}`,
      balanceLoadFailed: "Could not refresh bridge balances right now.",
      checkStatusNow: "Check status now",
      checkingStatus: "Checking mint/release status...",
      noNewUpdates: "No new mint/release updates found yet.",
      statusCheckFailed: "Unable to check bridge status right now.",
    },
    pt: {
      bridge: "Bridge",
      bridgeReady: "Os contratos estão conectados. Aprovações, histórico e links de tx aparecem aqui.",
      liveContracts: "Contratos ao vivo",
      switchTo: "Trocar para",
      route: "Rota",
      directionLabel: "Direção",
      transferSummary: "Resumo da transferência",
      assetFlow: "Fluxo do ativo",
      status: "Status",
      processing: "Processando...",
      amount: "Valor",
      destination: "Carteira de destino",
      youPay: "Você paga",
      youReceive: "Você recebe",
      fee: "Taxa do bridge",
      eta: "Tempo estimado",
      sourceContract: "Contrato de origem",
      tokenAddress: "Endereço do token",
      validatorTarget: "Contrato de liquidação",
      contractsAndTokens: "Contratos e tokens",
      realRouteSummary: "Resumo real da rota com endereços dos contratos e tokens.",
      balancesAndAllowances: "Saldos e aprovações",
      autoVerifyNow: "A verificação em segundo plano agora checa se o mint/release foi finalizado.",
      allowance: "Allowance",
      actions: "Ações",
      approvalRequired: "É preciso aprovar antes da transação do bridge.",
      readyToBridge: "Você já pode enviar a transação do bridge.",
      approveUsdt: "Aprovar USDT",
      approveIusd: "Aprovar iUSD",
      depositNow: "Depositar no bridge",
      burnNow: "Queimar para release",
      recentBridgeOps: "Operações recentes do bridge",
      pendingUntilAutomation: "Itens pendentes atualizam automaticamente quando o outro lado finaliza.",
      noBridgeOps: "Ainda não há operações do bridge",
      approving: "Enviando aprovação…",
      approveDone: "Aprovação confirmada",
      txSent: "Transação confirmada",
      txFailed: "Falha na transação do bridge",
      depositing: "Enviando depósito na Polygon…",
      burning: "Enviando burn na INRI…",
      insufficientBalance: "Saldo insuficiente para esta operação do bridge.",
      confirmDeposit: "Confirmar depósito Polygon → INRI",
      confirmBurn: "Confirmar burn INRI → Polygon",
      confirmApprove: "Confirmar aprovação",
      confirmApproveButton: "Aprovar agora",
      approveAmount: "Valor da aprovação",
      cancel: "Cancelar",
      openTx: "Abrir tx de origem",
      openExplorer: "Abrir no explorer",
      openSettlementTx: "Abrir tx de liquidação",
      depositFlow: "Polygon USDT → INRI iUSD",
      withdrawFlow: "INRI iUSD → Polygon USDT",
      depositSubtitle: "Aprove USDT na Polygon, deposite no Lockbox e aguarde o mint dos validadores na INRI.",
      withdrawSubtitle: "Aprove iUSD na INRI, faça o burn no executor e aguarde o release na Polygon.",
      networkWarning: (key: string) => `Use a rede ${key.toUpperCase()} para essa direção.`,
      currentNetwork: (name: string) => `Rede atual: ${name}`,
      balanceLoadFailed: "Não foi possível atualizar os saldos do bridge agora.",
      checkStatusNow: "Checar status agora",
      checkingStatus: "Checando status do mint/release...",
      noNewUpdates: "Ainda não houve novas atualizações de mint/release.",
      statusCheckFailed: "Não foi possível checar o status do bridge agora.",
    },
    es: {
      bridge: "Bridge",
      bridgeReady: "Los contratos están conectados. Aprobaciones, historial y enlaces de tx aparecen aquí.",
      liveContracts: "Contratos en vivo",
      switchTo: "Cambiar a",
      route: "Ruta",
      directionLabel: "Dirección",
      transferSummary: "Resumen de la transferencia",
      assetFlow: "Flujo del activo",
      status: "Estado",
      processing: "Procesando...",
      amount: "Monto",
      destination: "Billetera destino",
      youPay: "Pagas",
      youReceive: "Recibes",
      fee: "Fee del bridge",
      eta: "Tiempo estimado",
      sourceContract: "Contrato de origen",
      tokenAddress: "Dirección del token",
      validatorTarget: "Contrato de liquidación",
      contractsAndTokens: "Contratos y tokens",
      realRouteSummary: "Resumen real de la ruta con direcciones de contratos y tokens.",
      balancesAndAllowances: "Saldos y aprobaciones",
      autoVerifyNow: "La verificación en segundo plano ahora revisa si el mint/release fue finalizado.",
      allowance: "Allowance",
      actions: "Acciones",
      approvalRequired: "Se requiere aprobación antes de la transacción del bridge.",
      readyToBridge: "Ya puedes enviar la transacción del bridge.",
      approveUsdt: "Aprobar USDT",
      approveIusd: "Aprobar iUSD",
      depositNow: "Depositar al bridge",
      burnNow: "Quemar para release",
      recentBridgeOps: "Operaciones recientes del bridge",
      pendingUntilAutomation: "Los elementos pendientes se actualizan automáticamente cuando el otro lado finaliza.",
      noBridgeOps: "Aún no hay operaciones del bridge",
      approving: "Enviando aprobación…",
      approveDone: "Aprobación confirmada",
      txSent: "Transacción confirmada",
      txFailed: "Falló la transacción del bridge",
      depositing: "Enviando depósito en Polygon…",
      burning: "Enviando burn en INRI…",
      insufficientBalance: "Saldo insuficiente para esta operación del bridge.",
      confirmDeposit: "Confirmar depósito Polygon → INRI",
      confirmBurn: "Confirmar burn INRI → Polygon",
      confirmApprove: "Confirmar aprobación",
      confirmApproveButton: "Aprobar ahora",
      approveAmount: "Monto a aprobar",
      cancel: "Cancelar",
      openTx: "Abrir tx origen",
      openExplorer: "Abrir en explorer",
      openSettlementTx: "Abrir tx liquidación",
      depositFlow: "Polygon USDT → INRI iUSD",
      withdrawFlow: "INRI iUSD → Polygon USDT",
      depositSubtitle: "Aprueba USDT en Polygon, deposita en Lockbox y espera el mint de validadores en INRI.",
      withdrawSubtitle: "Aprueba iUSD en INRI, quema en el executor y espera el release en Polygon.",
      networkWarning: (key: string) => `Usa la red ${key.toUpperCase()} para esta dirección.`,
      currentNetwork: (name: string) => `Red actual: ${name}`,
      balanceLoadFailed: "No se pudieron actualizar los saldos del bridge ahora.",
      checkStatusNow: "Revisar estado ahora",
      checkingStatus: "Revisando estado de mint/release...",
      noNewUpdates: "Aún no hay nuevas actualizaciones de mint/release.",
      statusCheckFailed: "No se pudo revisar el estado del bridge ahora.",
    },
  };
  return map[lang] || map.en;
}
