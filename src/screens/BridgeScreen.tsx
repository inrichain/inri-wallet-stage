import React, { useEffect, useMemo, useState } from "react";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import ActionButton from "../components/ActionButton";
import EmptyState from "../components/EmptyState";
import StatusPill from "../components/StatusPill";
import {
  approveIusdForBridgeTx,
  approvePolygonUsdtTx,
  bridgeTxUrl,
  depositPolygonToInriTx,
  burnInriToPolygonTx,
  estimateBridgeQuote,
  formatBridgeAmount,
  getBridgeOperations,
  getBridgeRoute,
  IUSD_TOKEN_ADDRESS,
  INRI_EXECUTOR_ADDRESS,
  loadBridgeBalances,
  parseBridgeAmount,
  POLYGON_LOCKBOX_ADDRESS,
  POLYGON_USDT_ADDRESS,
  type BridgeDirection,
} from "../lib/bridge";
import { getStoredNetwork } from "../lib/network";
import LogoImage from "../components/LogoImage";
import ConfirmModal from "../components/ConfirmModal";

const BASE = import.meta.env.BASE_URL || "/";

const TOKENS = {
  usdt: {
    symbol: "USDT",
    subtitle: "Polygon deposit asset",
    logo: BASE + "token-usdt.png",
    network: "Polygon",
    networkLogo: BASE + "network-polygon.png",
  },
  iusd: {
    symbol: "iUSD",
    subtitle: "INRI minted asset",
    logo: BASE + "token-iusd.png",
    network: "INRI",
    networkLogo: BASE + "network-inri.png",
  },
};

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
  const isLight = theme === "light";
  const t = getText(lang);
  const network = getStoredNetwork();
  const [direction, setDirection] = useState<BridgeDirection>("polygon_to_inri");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState(address);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [balances, setBalances] = useState({
    polygonUsdtBalance: 0n,
    polygonUsdtAllowance: 0n,
    inriIusdBalance: 0n,
    inriIusdAllowance: 0n,
    polygonDepositFeeBps: 0,
    polygonReleaseFeeBps: 0,
    inriFeeBps: 0,
  });
  const [opsVersion, setOpsVersion] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setDestination(address);
  }, [address]);

  useEffect(() => {
    let alive = true;
    loadBridgeBalances(address)
      .then((next) => {
        if (alive) setBalances(next);
      })
      .catch(() => {
        if (alive) setMessage(t.balanceLoadFailed);
      });
    return () => {
      alive = false;
    };
  }, [address, opsVersion, t.balanceLoadFailed]);

  const fromToken = direction === "polygon_to_inri" ? TOKENS.usdt : TOKENS.iusd;
  const toToken = direction === "polygon_to_inri" ? TOKENS.iusd : TOKENS.usdt;
  const feePercent = direction === "polygon_to_inri" ? balances.polygonDepositFeeBps / 100 : balances.inriFeeBps / 100;
  const quote = useMemo(() => estimateBridgeQuote(direction, amount, feePercent), [direction, amount, feePercent]);
  const amountRaw = useMemo(() => {
    try {
      return parseBridgeAmount(amount);
    } catch {
      return 0n;
    }
  }, [amount]);

  const hasEnoughBalance = direction === "polygon_to_inri"
    ? amountRaw > 0n && balances.polygonUsdtBalance >= amountRaw
    : amountRaw > 0n && balances.inriIusdBalance >= amountRaw;

  const needsApproval = direction === "polygon_to_inri"
    ? amountRaw > 0n && balances.polygonUsdtAllowance < amountRaw
    : amountRaw > 0n && balances.inriIusdAllowance < amountRaw;

  const requiredNetworkKey = direction === "polygon_to_inri" ? "polygon" : "inri";
  const wrongNetwork = network.key !== requiredNetworkKey;
  const operations = useMemo(() => getBridgeOperations(address).slice(0, 6), [address, opsVersion]);

  async function onApprove() {
    if (!privateKey || amountRaw <= 0n) return;
    try {
      setBusy(true);
      setMessage(t.approving);
      const result = direction === "polygon_to_inri"
        ? await approvePolygonUsdtTx(privateKey, amountRaw)
        : await approveIusdForBridgeTx(privateKey, amountRaw);
      setMessage(`${t.approveDone}: ${shortHash(result.hash)}`);
      setOpsVersion((v) => v + 1);
    } catch (err: any) {
      setMessage(err?.shortMessage || err?.message || t.txFailed);
    } finally {
      setBusy(false);
    }
  }

  async function onBridge() {
    if (!privateKey || amountRaw <= 0n || !destination) return;
    try {
      setBusy(true);
      setConfirmOpen(false);
      setMessage(direction === "polygon_to_inri" ? t.depositing : t.burning);
      const result = direction === "polygon_to_inri"
        ? await depositPolygonToInriTx({ privateKey, amount: amountRaw, destination, walletAddress: address })
        : await burnInriToPolygonTx({ privateKey, amount: amountRaw, destination, walletAddress: address });
      setMessage(`${t.txSent}: ${shortHash(result.hash)}`);
      setAmount("");
      setOpsVersion((v) => v + 1);
    } catch (err: any) {
      setMessage(err?.shortMessage || err?.message || t.txFailed);
    } finally {
      setBusy(false);
    }
  }

  const canProceed = !!address && !!privateKey && amountRaw > 0n && hasEnoughBalance && !wrongNetwork;

  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}>
        <SectionTitle title={t.bridge} subtitle={t.bridgeReady} theme={theme} />
        <div className="wallet-action-row" style={{ marginTop: 12 }}>
          <StatusPill theme={theme} tone={wrongNetwork ? "warning" : "success"}>
            {wrongNetwork ? `${t.switchTo} ${requiredNetworkKey.toUpperCase()}` : t.liveContracts}
          </StatusPill>
          <StatusPill theme={theme} tone="info">{fromToken.symbol} → {toToken.symbol}</StatusPill>
        </div>
      </ScreenCard>

      {message ? (
        <ScreenCard theme={theme}>
          <div style={{ color: isLight ? "#0f172a" : "#e2e8f0", fontWeight: 700, wordBreak: "break-word" }}>{message}</div>
        </ScreenCard>
      ) : null}

      {wrongNetwork ? (
        <ScreenCard theme={theme}>
          <div style={{ color: isLight ? "#b45309" : "#fbbf24", fontWeight: 800 }}>{t.networkWarning(requiredNetworkKey)}</div>
          <div className="wallet-ui-subtle" style={{ marginTop: 8 }}>{t.currentNetwork(network.name)}</div>
        </ScreenCard>
      ) : null}

      <ScreenCard theme={theme}>
        <div className="wallet-ui-grid-2 wallet-mobile-single-grid">
          <ActionModeButton theme={theme} active={direction === "polygon_to_inri"} onClick={() => setDirection("polygon_to_inri")} title={t.depositFlow} subtitle={`${TOKENS.usdt.symbol} → ${TOKENS.iusd.symbol}`} />
          <ActionModeButton theme={theme} active={direction === "inri_to_polygon"} onClick={() => setDirection("inri_to_polygon")} title={t.withdrawFlow} subtitle={`${TOKENS.iusd.symbol} → ${TOKENS.usdt.symbol}`} />
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <div className="wallet-section-head">
          <div>
            <div style={{ fontSize: 13, color: isLight ? "#64748b" : "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>{t.route}</div>
            <div style={{ fontWeight: 900, fontSize: 20, color: isLight ? "#0f172a" : "#fff" }}>{fromToken.network} → {toToken.network}</div>
          </div>
          <div className="wallet-mini-stat">
            <LogoImage src={fromToken.logo} alt={fromToken.symbol} kind="token" label={fromToken.symbol} size={20} />
            <span>{fromToken.symbol}</span>
            <span>→</span>
            <LogoImage src={toToken.logo} alt={toToken.symbol} kind="token" label={toToken.symbol} size={20} />
            <span>{toToken.symbol}</span>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <Input label={t.amount} value={amount} onChange={setAmount} placeholder="0.00" theme={theme} />
          <Input label={t.destination} value={destination} onChange={setDestination} placeholder={address} theme={theme} />
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <InfoRow theme={theme} label={t.youPay} value={`${quote.amountIn} ${fromToken.symbol}`} />
          <InfoRow theme={theme} label={t.youReceive} value={`${quote.amountOut} ${toToken.symbol}`} />
          <InfoRow theme={theme} label={t.fee} value={`${feePercent.toFixed(2)}%`} />
          <InfoRow theme={theme} label={t.eta} value={quote.etaLabel} />
          <InfoRow theme={theme} label={t.sourceContract} value={direction === "polygon_to_inri" ? POLYGON_LOCKBOX_ADDRESS : INRI_EXECUTOR_ADDRESS} mono />
          <InfoRow theme={theme} label={t.tokenAddress} value={direction === "polygon_to_inri" ? POLYGON_USDT_ADDRESS : IUSD_TOKEN_ADDRESS} mono />
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle title={t.balancesAndAllowances} subtitle={t.autoVerifyLater} theme={theme} compact />
        <div className="wallet-ui-grid-2 wallet-mobile-single-grid" style={{ marginTop: 12 }}>
          <StatBox theme={theme} title="Polygon USDT" value={formatBridgeAmount(balances.polygonUsdtBalance)} meta={`${t.allowance}: ${formatBridgeAmount(balances.polygonUsdtAllowance)}`} />
          <StatBox theme={theme} title="INRI iUSD" value={formatBridgeAmount(balances.inriIusdBalance)} meta={`${t.allowance}: ${formatBridgeAmount(balances.inriIusdAllowance)}`} />
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle title={t.actions} subtitle={needsApproval ? t.approvalRequired : t.readyToBridge} theme={theme} compact />
        <div className="wallet-action-row" style={{ marginTop: 12 }}>
          {needsApproval ? (
            <ActionButton theme={theme} onClick={onApprove} disabled={!canProceed || busy}>
              {busy ? t.processing : direction === "polygon_to_inri" ? t.approveUsdt : t.approveIusd}
            </ActionButton>
          ) : null}
          <ActionButton theme={theme} onClick={() => setConfirmOpen(true)} disabled={!canProceed || needsApproval || busy} tone="primary">
            {busy ? t.processing : direction === "polygon_to_inri" ? t.depositNow : t.burnNow}
          </ActionButton>
        </div>
        {!hasEnoughBalance && amountRaw > 0n ? <div className="wallet-ui-subtle" style={{ marginTop: 10, color: isLight ? "#b91c1c" : "#fca5a5" }}>{t.insufficientBalance}</div> : null}
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle title={t.recentBridgeOps} subtitle={t.pendingUntilAutomation} theme={theme} compact />
        {operations.length === 0 ? (
          <EmptyState theme={theme} title={t.noBridgeOps} description={t.autoVerifyLater} />
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {operations.map((item) => (
              <div key={item.id} style={{ border: `1px solid ${isLight ? "#e2e8f0" : "#1f2937"}`, borderRadius: 16, padding: 14, background: isLight ? "#f8fafc" : "#0b1120" }}>
                <div className="wallet-section-head">
                  <div>
                    <div style={{ fontWeight: 900, color: isLight ? "#0f172a" : "#fff" }}>{item.fromSymbol} → {item.toSymbol}</div>
                    <div className="wallet-ui-subtle" style={{ marginTop: 4 }}>{item.stageLabel}</div>
                  </div>
                  <StatusPill theme={theme} tone={item.status === "failed" ? "danger" : item.status === "confirmed" ? "success" : "warning"}>{item.status}</StatusPill>
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  <InfoRow theme={theme} label={t.amount} value={`${item.amountIn} ${item.fromSymbol}`} />
                  <InfoRow theme={theme} label={t.destination} value={item.destination} mono />
                </div>
                {item.sourceTxHash ? (
                  <div className="wallet-action-row" style={{ marginTop: 12 }}>
                    <a href={bridgeTxUrl(item.direction, item.sourceTxHash)} target="_blank" rel="noreferrer" className="wallet-link-chip">{t.openTx}</a>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </ScreenCard>

      <ConfirmModal
        open={confirmOpen}
        theme={theme}
        title={direction === "polygon_to_inri" ? t.confirmDeposit : t.confirmBurn}
        description={`${quote.amountIn} ${fromToken.symbol} → ${quote.amountOut} ${toToken.symbol}`}
        confirmLabel={direction === "polygon_to_inri" ? t.depositNow : t.burnNow}
        cancelLabel={t.cancel}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={onBridge}
      />
    </div>
  );
}

function ActionModeButton({ theme, active, onClick, title, subtitle }: { theme: "dark" | "light"; active?: boolean; onClick: () => void; title: string; subtitle: string; }) {
  const isLight = theme === "light";
  return (
    <button onClick={onClick} style={{ border: `1px solid ${active ? "#3b82f6" : isLight ? "#dbe2f0" : "#243041"}`, background: active ? (isLight ? "#eff6ff" : "#0f1d36") : (isLight ? "#fff" : "#101826"), borderRadius: 16, padding: 14, textAlign: "left", cursor: "pointer" }}>
      <div style={{ fontWeight: 900, color: isLight ? "#0f172a" : "#fff" }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 13, color: isLight ? "#64748b" : "#94a3b8" }}>{subtitle}</div>
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

function InfoRow({ theme, label, value, mono = false }: { theme: "dark" | "light"; label: string; value: string; mono?: boolean; }) {
  const isLight = theme === "light";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", border: `1px solid ${isLight ? "#e2e8f0" : "#1f2937"}`, borderRadius: 14, padding: "12px 14px", background: isLight ? "#f8fafc" : "#0b1120" }}>
      <div style={{ fontSize: 12, color: isLight ? "#64748b" : "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: isLight ? "#0f172a" : "#e2e8f0", fontWeight: 700, wordBreak: "break-all", textAlign: "right", fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit" }}>{value}</div>
    </div>
  );
}

function StatBox({ theme, title, value, meta }: { theme: "dark" | "light"; title: string; value: string; meta: string; }) {
  const isLight = theme === "light";
  return (
    <div style={{ border: `1px solid ${isLight ? "#e2e8f0" : "#1f2937"}`, borderRadius: 16, padding: 14, background: isLight ? "#f8fafc" : "#0b1120" }}>
      <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: isLight ? "#64748b" : "#94a3b8" }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: isLight ? "#0f172a" : "#fff" }}>{value}</div>
      <div className="wallet-ui-subtle" style={{ marginTop: 6 }}>{meta}</div>
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
      bridgeReady: "Live contracts connected. Automatic validator verification can come next.",
      liveContracts: "Live contracts",
      switchTo: "Switch to",
      route: "Route",
      amount: "Amount",
      destination: "Destination wallet",
      youPay: "You pay",
      youReceive: "You receive",
      fee: "Bridge fee",
      eta: "Estimated time",
      sourceContract: "Source contract",
      tokenAddress: "Token address",
      balancesAndAllowances: "Balances and allowances",
      autoVerifyLater: "Deposit and burn are live. Validator mint/release tracking can be added next.",
      allowance: "Allowance",
      actions: "Actions",
      approvalRequired: "Approval required before the bridge transaction.",
      readyToBridge: "You can send the bridge transaction now.",
      approveUsdt: "Approve USDT",
      approveIusd: "Approve iUSD",
      depositNow: "Deposit to bridge",
      burnNow: "Burn for release",
      recentBridgeOps: "Recent bridge operations",
      pendingUntilAutomation: "Operations stay pending here until automatic validator verification is added.",
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
      cancel: "Cancel",
      openTx: "Open tx",
      depositFlow: "Polygon USDT → INRI iUSD",
      withdrawFlow: "INRI iUSD → Polygon USDT",
      networkWarning: (key: string) => `Use the ${key.toUpperCase()} network for this direction.`,
      currentNetwork: (name: string) => `Current network: ${name}`,
      balanceLoadFailed: "Could not refresh bridge balances right now.",
    },
    pt: {
      bridge: "Bridge",
      bridgeReady: "Contratos reais conectados. A verificação automática dos validadores pode entrar depois.",
      liveContracts: "Contratos ao vivo",
      switchTo: "Trocar para",
      route: "Rota",
      amount: "Valor",
      destination: "Carteira de destino",
      youPay: "Você paga",
      youReceive: "Você recebe",
      fee: "Taxa do bridge",
      eta: "Tempo estimado",
      sourceContract: "Contrato de origem",
      tokenAddress: "Endereço do token",
      balancesAndAllowances: "Saldos e aprovações",
      autoVerifyLater: "Depósito e burn já estão ao vivo. O rastreio automático de mint/release pode entrar depois.",
      allowance: "Allowance",
      actions: "Ações",
      approvalRequired: "É preciso aprovar antes da transação do bridge.",
      readyToBridge: "Você já pode enviar a transação do bridge.",
      approveUsdt: "Aprovar USDT",
      approveIusd: "Aprovar iUSD",
      depositNow: "Depositar no bridge",
      burnNow: "Queimar para release",
      recentBridgeOps: "Operações recentes do bridge",
      pendingUntilAutomation: "As operações ficam pendentes aqui até a verificação automática dos validadores ser adicionada.",
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
      cancel: "Cancelar",
      openTx: "Abrir tx",
      depositFlow: "Polygon USDT → INRI iUSD",
      withdrawFlow: "INRI iUSD → Polygon USDT",
      networkWarning: (key: string) => `Use a rede ${key.toUpperCase()} para essa direção.`,
      currentNetwork: (name: string) => `Rede atual: ${name}`,
      balanceLoadFailed: "Não foi possível atualizar os saldos do bridge agora.",
    },
  };
  return map[lang] || map.en;
}
