import React, { useMemo, useState } from "react";
import {
  claimBridgeOperation,
  estimateBridgeQuote,
  getBridgeOperations,
  getBridgeRoute,
  submitBridgeOperation,
  type BridgeDirection,
  type BridgeOperation,
} from "../lib/bridge";

const BASE = import.meta.env.BASE_URL || "/";
const BRIDGE_READY_FOR_INTEGRATION = true;

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
}: {
  theme?: "dark" | "light";
  lang?: string;
  address: string;
}) {
  const isLight = theme === "light";
  const t = getText(lang);
  const [direction, setDirection] = useState<BridgeDirection>("polygon_to_inri");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState(address);
  const [step, setStep] = useState<"editing" | "reviewing" | "submitting">("editing");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [opsTick, setOpsTick] = useState(0);

  const fromToken = direction === "polygon_to_inri" ? TOKENS.usdt : TOKENS.iusd;
  const toToken = direction === "polygon_to_inri" ? TOKENS.iusd : TOKENS.usdt;
  const route = getBridgeRoute(direction);
  const quote = useMemo(() => estimateBridgeQuote(direction, amount), [direction, amount]);
  const operations = useMemo(() => getBridgeOperations(address), [address, opsTick]);

  const latestPendingClaim = operations.find(
    (item) => item.direction === "inri_to_polygon" && item.status === "ready_to_claim"
  );

  const balanceLabel = direction === "polygon_to_inri" ? "2,500.000000 USDT" : "0.000000 iUSD";
  const canReview = Number(amount || "0") > 0 && destination.trim().startsWith("0x") && destination.trim().length >= 10;

  async function handlePrimaryAction() {
    if (step === "editing") {
      if (!canReview) {
        setFlash(t.fillFields);
        return;
      }
      setStep("reviewing");
      return;
    }

    if (step === "reviewing") {
      setBusy(true);
      setStep("submitting");
      try {
        await submitBridgeOperation({
          direction,
          amount,
          destination: destination.trim(),
          walletAddress: address,
        });
        setFlash(direction === "polygon_to_inri" ? t.depositCreated : t.withdrawCreated);
        setAmount("");
        setStep("editing");
        setOpsTick((n) => n + 1);
      } catch (e: any) {
        setFlash(e?.message || t.bridgeFailed);
        setStep("reviewing");
      } finally {
        setBusy(false);
      }
      return;
    }
  }

  async function handleClaim(operationId: string) {
    setBusy(true);
    try {
      const updated = await claimBridgeOperation(operationId);
      if (updated) {
        setFlash(t.claimCompleted);
        setOpsTick((n) => n + 1);
      }
    } catch (e: any) {
      setFlash(e?.message || t.bridgeFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={wrap(isLight)}>
      <div style={headRow}>
        <div>
          <h2 style={title(isLight)}>{t.bridge}</h2>
          <div style={subhead(isLight)}>{t.bridgeSubtitle}</div>
        </div>
        <div style={chip(isLight)}>
          {fromToken.symbol} → {toToken.symbol}
        </div>
      </div>

      <div style={banner(isLight, BRIDGE_READY_FOR_INTEGRATION)}>
        {BRIDGE_READY_FOR_INTEGRATION ? t.bridgeReady : t.bridgePending}
      </div>

      {!!flash ? <div style={notice(isLight)}>{flash}</div> : null}

      <div style={hero(isLight)}>
        <div style={heroSide}>
          <img src={fromToken.logo} alt={fromToken.symbol} style={heroTokenLogo} />
          <div>
            <div style={heroTokenTitle(isLight)}>{fromToken.symbol}</div>
            <div style={heroTokenSub(isLight)}>{fromToken.subtitle}</div>
          </div>
        </div>

        <div style={heroArrow}>⇄</div>

        <div style={{ ...heroSide, justifyContent: "flex-end" }}>
          <div style={{ textAlign: "right" }}>
            <div style={heroTokenTitle(isLight)}>{toToken.symbol}</div>
            <div style={heroTokenSub(isLight)}>{toToken.subtitle}</div>
          </div>
          <img src={toToken.logo} alt={toToken.symbol} style={heroTokenLogo} />
        </div>
      </div>

      <div style={{ ...panel(isLight), marginTop: 12 }}>
        <div style={label(isLight)}>{t.direction}</div>
        <div style={doubleGrid}>
          <button onClick={() => setDirection("polygon_to_inri")} style={modeButton(isLight, direction === "polygon_to_inri")}>
            {t.depositFlow}
          </button>
          <button onClick={() => setDirection("inri_to_polygon")} style={modeButton(isLight, direction === "inri_to_polygon")}>
            {t.withdrawFlow}
          </button>
        </div>
      </div>

      <div style={{ ...panel(isLight), marginTop: 12 }}>
        <div style={label(isLight)}>{t.route}</div>

        <div style={routeCard(isLight)}>
          <BridgeAssetCard asset={fromToken} isLight={isLight} align="left" />
          <div style={{ fontSize: 30, color: "#3f7cff", fontWeight: 900 }}>→</div>
          <BridgeAssetCard asset={toToken} isLight={isLight} align="right" />
        </div>

        <div style={amountHeaderRow}>
          <div style={label(isLight)}>{t.amount}</div>
          <div style={balancePill(isLight)}>{t.balance}: {balanceLabel}</div>
        </div>
        <div style={amountRow}>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/,/g, "."))}
            placeholder="0.00"
            style={inputStyle(isLight)}
          />
          <button style={maxButton(isLight)} onClick={() => setAmount(direction === "polygon_to_inri" ? "100.000000" : "25.000000")}>
            Max
          </button>
        </div>

        <div style={{ ...label(isLight), marginTop: 12 }}>{t.destination}</div>
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder={address}
          style={{ ...inputStyle(isLight), fontSize: 15, fontWeight: 700, marginTop: 0 }}
        />
      </div>

      <div style={{ ...panel(isLight), marginTop: 12 }}>
        <div style={label(isLight)}>{t.summary}</div>
        <div style={estimatedStyle(isLight)}>
          {quote.amountOut} {toToken.symbol}
        </div>

        <div style={miniRow(isLight)}>
          <span>{t.route}</span>
          <strong>{route.fromNetworkName} → {route.toNetworkName}</strong>
        </div>
        <div style={miniRow(isLight)}>
          <span>{t.assetFlow}</span>
          <strong>{route.fromSymbol} → {route.toSymbol}</strong>
        </div>
        <div style={miniRow(isLight)}>
          <span>{t.fee}</span>
          <strong>{quote.feeAmount} {route.fromSymbol} ({quote.feePercent.toFixed(2)}%)</strong>
        </div>
        <div style={miniRow(isLight)}>
          <span>{t.eta}</span>
          <strong>{quote.etaLabel}</strong>
        </div>
        <div style={miniRow(isLight)}>
          <span>{t.execution}</span>
          <strong>{quote.statusText}</strong>
        </div>
        <div style={miniRow(isLight)}>
          <span>{t.sourceMethod}</span>
          <strong>{route.sourceMethod}</strong>
        </div>
        <div style={miniRow(isLight)}>
          <span>{t.claimMethod}</span>
          <strong>{route.claimMethod || "-"}</strong>
        </div>
        <div style={miniRow(isLight)}>
          <span>{t.sourceContract}</span>
          <strong>{route.sourceContractAddress || t.contractPlaceholder}</strong>
        </div>
        <div style={miniRow(isLight)}>
          <span>{t.claimContract}</span>
          <strong>{route.claimContractAddress || t.contractPlaceholder}</strong>
        </div>
      </div>

      {step === "reviewing" ? (
        <div style={{ ...panel(isLight), marginTop: 12, borderColor: "#3f7cff" }}>
          <div style={{ ...label(isLight), color: "#3f7cff", fontWeight: 800 }}>{t.reviewTitle}</div>
          <div style={reviewTitle(isLight)}>{route.fromNetworkName} → {route.toNetworkName}</div>
          <div style={reviewSub(isLight)}>{t.reviewSubtitle}</div>
          <div style={reviewGrid}>
            <ReviewCard isLight={isLight} label={t.youSend} value={`${quote.amountIn} ${route.fromSymbol}`} />
            <ReviewCard isLight={isLight} label={t.youReceive} value={`${quote.amountOut} ${route.toSymbol}`} />
            <ReviewCard isLight={isLight} label={t.destination} value={destination} mono />
            <ReviewCard isLight={isLight} label={t.mode} value={t.mockReadyMode} />
          </div>
        </div>
      ) : null}

      {latestPendingClaim ? (
        <div style={{ ...panel(isLight), marginTop: 12 }}>
          <div style={{ ...label(isLight), color: "#3f7cff", fontWeight: 800 }}>{t.readyToClaim}</div>
          <div style={reviewTitle(isLight)}>{latestPendingClaim.amountOut} {latestPendingClaim.toSymbol}</div>
          <div style={reviewSub(isLight)}>{t.claimHint}</div>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <MiniInfo isLight={isLight} label={t.claimSource} value={latestPendingClaim.sourceTxHash || "-"} />
            <MiniInfo isLight={isLight} label={t.destination} value={latestPendingClaim.destination} />
          </div>
          <button style={{ ...mainButtonStyle(), marginTop: 14, opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={() => handleClaim(latestPendingClaim.id)}>
            {busy ? t.claiming : t.claimNow}
          </button>
        </div>
      ) : null}

      <div style={{ ...panel(isLight), marginTop: 12 }}>
        <div style={label(isLight)}>{t.operationStatus}</div>
        <div style={timelineWrap}>
          <TimelineDot active={step !== "editing"} done={step === "submitting" || operations.length > 0} label={t.stepReview} isLight={isLight} />
          <TimelineDot active={step === "submitting" || operations.length > 0} done={operations.some((item) => item.status === "confirmed" || item.status === "ready_to_claim" || item.status === "claimed")} label={t.stepSubmit} isLight={isLight} />
          <TimelineDot active={!!latestPendingClaim} done={operations.some((item) => item.status === "claimed")} label={t.stepClaim} isLight={isLight} />
        </div>
      </div>

      <div style={{ ...panel(isLight), marginTop: 12 }}>
        <div style={label(isLight)}>{t.recentBridgeOps}</div>
        {operations.length === 0 ? (
          <div style={emptyOps(isLight)}>{t.noBridgeOps}</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {operations.slice(0, 4).map((item) => (
              <OperationCard key={item.id} item={item} isLight={isLight} />
            ))}
          </div>
        )}
      </div>

      <div style={foot(isLight)}>{t.previewFee}</div>

      <button
        style={{ ...mainButtonStyle(), opacity: busy ? 0.7 : 1 }}
        disabled={busy}
        onClick={handlePrimaryAction}
      >
        {busy
          ? t.processing
          : step === "editing"
          ? t.reviewBridge
          : step === "reviewing"
          ? direction === "polygon_to_inri"
            ? t.submitDeposit
            : t.submitWithdraw
          : t.processing}
      </button>
    </div>
  );
}

function BridgeAssetCard({
  asset,
  isLight,
  align,
}: {
  asset: any;
  isLight: boolean;
  align: "left" | "right";
}) {
  return (
    <div style={{ textAlign: align, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: align === "left" ? "flex-start" : "flex-end", gap: 10 }}>
        {align === "right" ? null : <img src={asset.logo} alt={asset.symbol} style={tokenLogo} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ color: isLight ? "#10131a" : "#fff", fontWeight: 900 }}>{asset.symbol}</div>
          <div style={routeSub(isLight)}>{asset.subtitle}</div>
        </div>
        {align === "right" ? <img src={asset.logo} alt={asset.symbol} style={tokenLogo} /> : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: align === "left" ? "flex-start" : "flex-end", gap: 8, marginTop: 10 }}>
        <img src={asset.networkLogo} alt={asset.network} style={{ width: 18, height: 18, borderRadius: 9 }} />
        <div style={routeLabel(isLight)}>{asset.network}</div>
      </div>
    </div>
  );
}

function ReviewCard({ isLight, label, value, mono = false }: { isLight: boolean; label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, borderRadius: 16, padding: 14, background: isLight ? "#fff" : "#12192a" }}>
      <div style={{ color: isLight ? "#64748b" : "#94a3b8", fontSize: 12 }}>{label}</div>
      <div style={{ color: isLight ? "#10131a" : "#fff", fontWeight: 800, marginTop: 6, wordBreak: "break-all", fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined }}>{value}</div>
    </div>
  );
}

function TimelineDot({ active, done, label, isLight }: { active: boolean; done: boolean; label: string; isLight: boolean }) {
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: 999, background: done ? "#3f7cff" : active ? "#7aa2ff" : isLight ? "#dbe2f0" : "#252b39", boxShadow: done ? "0 0 0 4px rgba(63,124,255,0.18)" : "none" }} />
      <div style={{ color: isLight ? "#475569" : "#cbd5e1", fontSize: 12, textAlign: "center" }}>{label}</div>
    </div>
  );
}

function MiniInfo({ isLight, label, value }: { isLight: boolean; label: string; value: string }) {
  return (
    <div style={{ border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, borderRadius: 14, padding: "12px 14px", background: isLight ? "#fff" : "#12192a" }}>
      <div style={{ fontSize: 12, color: isLight ? "#64748b" : "#94a3b8", marginBottom: 6 }}>{label}</div>
      <div style={{ color: isLight ? "#10131a" : "#fff", fontWeight: 700, wordBreak: "break-all" }}>{value}</div>
    </div>
  );
}

function OperationCard({ item, isLight }: { item: BridgeOperation; isLight: boolean }) {
  return (
    <div style={{ border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, borderRadius: 16, padding: 14, background: isLight ? "#fff" : "#12192a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ color: isLight ? "#10131a" : "#fff", fontWeight: 900 }}>
          {item.fromSymbol} → {item.toSymbol}
        </div>
        <div style={statusPill(isLight, item.status)}>{formatStatus(item.status)}</div>
      </div>
      <div style={{ display: "grid", gap: 6, marginTop: 10, color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13 }}>
        <div>{item.amountIn} {item.fromSymbol} • {item.amountOut} {item.toSymbol}</div>
        <div>{item.fromNetworkName} → {item.toNetworkName}</div>
        <div>{item.stageLabel}</div>
      </div>
    </div>
  );
}

function formatStatus(status: BridgeOperation["status"]) {
  if (status === "ready_to_claim") return "Ready to claim";
  if (status === "claimed") return "Claimed";
  if (status === "confirmed") return "Confirmed";
  if (status === "failed") return "Failed";
  if (status === "pending") return "Pending";
  return "Draft";
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      bridge: "Bridge",
      bridgeSubtitle: "Ready for real contract integration with a separate execution adapter.",
      direction: "Direction",
      depositFlow: "Polygon USDT → INRI iUSD",
      withdrawFlow: "INRI iUSD → Polygon USDT",
      amount: "Amount",
      balance: "Balance",
      summary: "Transfer summary",
      route: "Route",
      assetFlow: "Asset flow",
      destination: "Destination wallet",
      fee: "Bridge fee",
      eta: "Estimated time",
      execution: "Execution flow",
      sourceMethod: "Source method",
      claimMethod: "Destination method",
      sourceContract: "Source contract",
      claimContract: "Destination contract",
      contractPlaceholder: "Add final contract later",
      reviewTitle: "Review bridge request",
      reviewSubtitle: "This flow is already separated into UI + adapter, so later you only replace the mock execution with your contract calls.",
      youSend: "You send",
      youReceive: "You receive",
      mode: "Mode",
      mockReadyMode: "Mock adapter ready for real integration",
      reviewBridge: "Review bridge",
      submitDeposit: "Submit deposit",
      submitWithdraw: "Submit withdraw",
      processing: "Processing...",
      depositCreated: "Deposit flow created and logged.",
      withdrawCreated: "Withdraw flow created and waiting for claim.",
      claimCompleted: "Claim completed.",
      bridgeFailed: "Bridge action failed.",
      fillFields: "Enter a valid amount and destination wallet.",
      readyToClaim: "Ready to claim",
      claimHint: "This is the destination-side action. Later you can connect it to the real release/claim contract.",
      claimSource: "Source bridge tx",
      claimNow: "Claim on destination",
      claiming: "Claiming...",
      operationStatus: "Operation status",
      stepReview: "Review",
      stepSubmit: "Submit",
      stepClaim: "Claim",
      recentBridgeOps: "Recent bridge operations",
      noBridgeOps: "No bridge operations yet.",
      bridgePending: "Bridge screen and state machine are ready. Final contracts can be plugged in later without rebuilding the UI.",
      bridgeReady: "Bridge is now prepared for real integration: route definitions, summary, review step, status timeline, recent operations, and claim flow are all separated from the execution layer.",
      previewFee: "Next step later: replace the mock adapter methods with your final bridge contracts or relayer/API calls.",
    },
    pt: {
      bridge: "Bridge",
      bridgeSubtitle: "Pronto para integração real dos contratos com adapter separado.",
      direction: "Direção",
      depositFlow: "Polygon USDT → INRI iUSD",
      withdrawFlow: "INRI iUSD → Polygon USDT",
      amount: "Valor",
      balance: "Saldo",
      summary: "Resumo da transferência",
      route: "Rota",
      assetFlow: "Fluxo do ativo",
      destination: "Carteira de destino",
      fee: "Taxa do bridge",
      eta: "Tempo estimado",
      execution: "Fluxo de execução",
      sourceMethod: "Método de origem",
      claimMethod: "Método de destino",
      sourceContract: "Contrato de origem",
      claimContract: "Contrato de destino",
      contractPlaceholder: "Adicionar contrato final depois",
      reviewTitle: "Revisar pedido do bridge",
      reviewSubtitle: "Este fluxo já está separado em UI + adapter, então depois você só troca a execução mock pelas chamadas reais dos contratos.",
      youSend: "Você envia",
      youReceive: "Você recebe",
      mode: "Modo",
      mockReadyMode: "Adapter mock pronto para integração real",
      reviewBridge: "Revisar bridge",
      submitDeposit: "Enviar depósito",
      submitWithdraw: "Enviar withdraw",
      processing: "Processando...",
      depositCreated: "Fluxo de depósito criado e salvo no histórico.",
      withdrawCreated: "Fluxo de withdraw criado e aguardando claim.",
      claimCompleted: "Claim concluído.",
      bridgeFailed: "Ação do bridge falhou.",
      fillFields: "Informe um valor válido e uma carteira de destino.",
      readyToClaim: "Pronto para claim",
      claimHint: "Esta é a ação do lado de destino. Depois você pode ligar isso ao contrato real de release/claim.",
      claimSource: "Tx origem do bridge",
      claimNow: "Fazer claim no destino",
      claiming: "Fazendo claim...",
      operationStatus: "Status da operação",
      stepReview: "Revisão",
      stepSubmit: "Envio",
      stepClaim: "Claim",
      recentBridgeOps: "Operações recentes do bridge",
      noBridgeOps: "Nenhuma operação de bridge ainda.",
      bridgePending: "A tela e a máquina de estados do bridge estão prontas. Os contratos finais podem ser plugados depois sem refazer a UI.",
      bridgeReady: "O bridge agora está preparado para integração real: definições de rota, resumo, etapa de revisão, timeline de status, operações recentes e fluxo de claim separados da camada de execução.",
      previewFee: "Próximo passo no futuro: trocar os métodos mock do adapter pelos contratos finais ou chamadas do relayer/API.",
    },
  };
  return map[lang] || map.en;
}

function wrap(isLight: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    borderRadius: 20,
    background: isLight ? "#ffffff" : "#121621",
    padding: 16,
    overflow: "hidden",
  };
}
const headRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" };
function title(isLight: boolean): React.CSSProperties { return { margin: 0, color: isLight ? "#10131a" : "#ffffff" }; }
function subhead(isLight: boolean): React.CSSProperties { return { marginTop: 6, color: isLight ? "#5b6578" : "#97a0b3", lineHeight: 1.5 }; }
function panel(isLight: boolean): React.CSSProperties {
  return { border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, borderRadius: 20, background: isLight ? "#fbfcff" : "#0f1522", padding: 14, overflow: "hidden" };
}
function banner(isLight: boolean, ready: boolean): React.CSSProperties {
  return { marginTop: 12, marginBottom: 12, padding: "12px 14px", borderRadius: 14, background: ready ? (isLight ? "#eef4ff" : "#16213b") : isLight ? "#fff4e5" : "#3a2610", color: ready ? "#3f7cff" : "#f59e0b", fontWeight: 700, lineHeight: 1.5 };
}
function notice(isLight: boolean): React.CSSProperties {
  return { marginBottom: 12, padding: "10px 12px", borderRadius: 14, background: isLight ? "#ecfdf5" : "#11261d", color: "#10b981", fontWeight: 700 };
}
function chip(isLight: boolean): React.CSSProperties { return { padding: "8px 12px", borderRadius: 999, background: isLight ? "#eef4ff" : "#16213b", color: "#3f7cff", fontWeight: 800, fontSize: 13 }; }
function label(isLight: boolean): React.CSSProperties { return { marginBottom: 10, fontSize: 13, color: isLight ? "#5b6578" : "#97a0b3" }; }
const doubleGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 };
function routeCard(isLight: boolean): React.CSSProperties { return { display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16, padding: "16px", borderRadius: 18, border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: isLight ? "#fff" : "#12192a" }; }
function routeLabel(isLight: boolean): React.CSSProperties { return { fontSize: 12, color: isLight ? "#64748b" : "#94a3b8", fontWeight: 700 }; }
function routeSub(isLight: boolean): React.CSSProperties { return { fontSize: 12, color: isLight ? "#5b6578" : "#97a0b3", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }; }
const tokenLogo: React.CSSProperties = { width: 42, height: 42, borderRadius: 14, objectFit: "cover", flexShrink: 0 };
function inputStyle(isLight: boolean): React.CSSProperties { return { width: "100%", padding: "14px 16px", borderRadius: 14, border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: isLight ? "#fff" : "#0b1120", color: isLight ? "#10131a" : "#fff", fontSize: 18, fontWeight: 800, boxSizing: "border-box", outline: "none" }; }
function estimatedStyle(isLight: boolean): React.CSSProperties { return { marginBottom: 12, padding: "14px 16px", borderRadius: 14, background: isLight ? "#fff" : "#0b1120", border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, color: isLight ? "#10131a" : "#fff", fontSize: 22, fontWeight: 900 }; }
function miniRow(isLight: boolean): React.CSSProperties { return { display: "flex", justifyContent: "space-between", gap: 12, marginTop: 10, color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13, flexWrap: "wrap" }; }
function foot(isLight: boolean): React.CSSProperties { return { marginTop: 12, marginBottom: 12, fontSize: 13, lineHeight: 1.6, color: isLight ? "#5b6578" : "#97a0b3" }; }
function mainButtonStyle(): React.CSSProperties { return { width: "100%", padding: "14px 18px", borderRadius: 14, border: "none", background: "#3f7cff", color: "#fff", fontWeight: 900, fontSize: 15, cursor: "pointer" }; }
function modeButton(isLight: boolean, active: boolean): React.CSSProperties { return { padding: "13px 14px", borderRadius: 14, border: active ? "1px solid #4d7ef2" : `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: active ? "#3f7cff" : isLight ? "#ffffff" : "#12192a", color: active ? "#ffffff" : isLight ? "#10131a" : "#fff", fontWeight: 800, cursor: "pointer" }; }
function statusPill(isLight: boolean, status: string): React.CSSProperties { return { padding: "6px 10px", borderRadius: 999, background: status === "claimed" || status === "confirmed" ? (isLight ? "#ecfdf5" : "#11261d") : status === "ready_to_claim" ? (isLight ? "#eef4ff" : "#16213b") : isLight ? "#f1f5f9" : "#1f2937", color: status === "claimed" || status === "confirmed" ? "#10b981" : status === "ready_to_claim" ? "#3f7cff" : isLight ? "#475569" : "#cbd5e1", fontWeight: 800, fontSize: 12 };
}
const amountRow: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" };
const amountHeaderRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginTop: 14, flexWrap: "wrap" };
function balancePill(isLight: boolean): React.CSSProperties { return { padding: "7px 10px", borderRadius: 999, background: isLight ? "#f1f5f9" : "#111827", color: isLight ? "#475569" : "#cbd5e1", fontSize: 12, fontWeight: 700 }; }
function maxButton(isLight: boolean): React.CSSProperties { return { padding: "14px 16px", borderRadius: 14, border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: isLight ? "#fff" : "#12192a", color: isLight ? "#10131a" : "#fff", fontWeight: 800, cursor: "pointer" }; }
const reviewGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 12 };
function reviewTitle(isLight: boolean): React.CSSProperties { return { color: isLight ? "#10131a" : "#fff", fontWeight: 900, fontSize: 20 }; }
function reviewSub(isLight: boolean): React.CSSProperties { return { color: isLight ? "#5b6578" : "#97a0b3", marginTop: 6, lineHeight: 1.5 }; }
const timelineWrap: React.CSSProperties = { display: "flex", gap: 10, alignItems: "flex-start" };
function emptyOps(isLight: boolean): React.CSSProperties { return { padding: 14, borderRadius: 16, background: isLight ? "#fff" : "#12192a", color: isLight ? "#5b6578" : "#97a0b3", border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}` }; }
function hero(isLight: boolean): React.CSSProperties { return { marginTop: 12, padding: 16, borderRadius: 20, border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: isLight ? "linear-gradient(180deg,#f8fbff 0%, #ffffff 100%)" : "linear-gradient(180deg,#12192a 0%, #0f1522 100%)", display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "center" }; }
const heroSide: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, minWidth: 0 };
const heroTokenLogo: React.CSSProperties = { width: 54, height: 54, borderRadius: 18, objectFit: "cover", flexShrink: 0 };
function heroTokenTitle(isLight: boolean): React.CSSProperties { return { fontSize: 20, fontWeight: 900, color: isLight ? "#10131a" : "#ffffff" }; }
function heroTokenSub(isLight: boolean): React.CSSProperties { return { fontSize: 12, color: isLight ? "#5b6578" : "#97a0b3" }; }
const heroArrow: React.CSSProperties = { fontSize: 26, fontWeight: 900, color: "#3f7cff", textAlign: "center" };
