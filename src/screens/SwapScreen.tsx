import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

type Props = {
  theme: "dark" | "light";
  lang: string;
  address: string;
};

type Asset = {
  symbol: string;
  name: string;
  type: "native" | "erc20";
  address?: string;
  decimals: number;
};

const TOKENS: Asset[] = [
  { symbol: "INRI", name: "INRI", type: "native", decimals: 18 },
  {
    symbol: "iUSD",
    name: "iUSD",
    type: "erc20",
    decimals: 18,
    address: "0x116b2fF23e062A52E2c0ea12dF7e2638b62Fa0FC",
  },
  {
    symbol: "wINRI",
    name: "Wrapped INRI",
    type: "erc20",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000001",
  },
];

const INRI_RPC = "https://rpc.inri.life";
const INRI_RPC_FALLBACK = "https://rpc-chain.inri.life";
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

export default function SwapScreen({ theme, lang, address }: Props) {
  const t = getText(lang);

  const [fromIndex, setFromIndex] = useState(0);
  const [toIndex, setToIndex] = useState(1);
  const [amountIn, setAmountIn] = useState("");
  const [balanceIn, setBalanceIn] = useState("0");
  const [previewOut, setPreviewOut] = useState("0");
  const [priceImpact, setPriceImpact] = useState("0.20%");
  const [fee, setFee] = useState("0.30%");
  const [route, setRoute] = useState("Direct");
  const [rpcLabel, setRpcLabel] = useState("Main RPC");

  const fromToken = TOKENS[fromIndex];
  const toToken = TOKENS[toIndex];

  const provider = useMemo(() => {
    try {
      return new ethers.JsonRpcProvider(INRI_RPC, { name: "INRI", chainId: 3777 });
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadBalance() {
      if (!address) {
        if (mounted) setBalanceIn("0");
        return;
      }

      try {
        const active =
          provider ||
          new ethers.JsonRpcProvider(INRI_RPC, { name: "INRI", chainId: 3777 });
        const result = await readBalance(active, address, fromToken);
        if (!mounted) return;
        setBalanceIn(result);
        setRpcLabel("Main RPC");
      } catch {
        try {
          const fallback = new ethers.JsonRpcProvider(INRI_RPC_FALLBACK, {
            name: "INRI",
            chainId: 3777,
          });
          const result = await readBalance(fallback, address, fromToken);
          if (!mounted) return;
          setBalanceIn(result);
          setRpcLabel("Fallback RPC");
        } catch {
          if (!mounted) return;
          setBalanceIn("0");
          setRpcLabel("RPC unavailable");
        }
      }
    }

    loadBalance();
    return () => {
      mounted = false;
    };
  }, [address, fromToken, provider]);

  useEffect(() => {
    const inNum = Number(amountIn || "0");
    if (!Number.isFinite(inNum) || inNum <= 0) {
      setPreviewOut("0");
      return;
    }

    const rate = estimateRate(fromToken.symbol, toToken.symbol);
    const gross = inNum * rate;
    const net = gross * 0.997;
    setPreviewOut(formatAmount(String(net)));

    if (
      (fromToken.symbol === "INRI" && toToken.symbol === "iUSD") ||
      (fromToken.symbol === "iUSD" && toToken.symbol === "INRI")
    ) {
      setRoute("INRI ↔ iUSD");
      setFee("0.30%");
      setPriceImpact(inNum > 1000 ? "1.20%" : inNum > 250 ? "0.55%" : "0.20%");
    } else {
      setRoute("Preview route");
      setFee("0.30%");
      setPriceImpact(inNum > 1000 ? "1.40%" : inNum > 250 ? "0.65%" : "0.25%");
    }
  }, [amountIn, fromToken, toToken]);

  function flipTokens() {
    setFromIndex(toIndex);
    setToIndex(fromIndex);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={panel(theme)}>
        <div style={headerRow}>
          <div>
            <div style={titleStyle(theme)}>{t.swapPreview}</div>
            <div style={subtitleStyle(theme)}>{t.professionalUxPreview}</div>
          </div>
          <div style={badge(theme)}>{rpcLabel}</div>
        </div>
      </section>

      <section style={panel(theme)}>
        <TokenBox
          theme={theme}
          label={t.from}
          token={fromToken}
          amount={amountIn}
          onAmountChange={setAmountIn}
          tokenIndex={fromIndex}
          onTokenIndexChange={setFromIndex}
          balance={balanceIn}
          tokens={TOKENS}
        />

        <div style={{ display: "flex", justifyContent: "center", margin: "10px 0" }}>
          <button onClick={flipTokens} style={flipButton(theme)}>
            ⇅
          </button>
        </div>

        <TokenBox
          theme={theme}
          label={t.to}
          token={toToken}
          amount={previewOut}
          onAmountChange={() => {}}
          tokenIndex={toIndex}
          onTokenIndexChange={setToIndex}
          balance="-"
          tokens={TOKENS}
          readOnly
        />
      </section>

      <section style={panel(theme)}>
        <div style={titleStyle(theme)}>{t.tradePreview}</div>
        <SummaryRow theme={theme} label={t.route} value={route} />
        <SummaryRow theme={theme} label={t.networkFee} value={fee} />
        <SummaryRow theme={theme} label={t.priceImpact} value={priceImpact} />
        <SummaryRow theme={theme} label={t.minReceived} value={`${previewOut} ${toToken.symbol}`} />

        <button style={mainButtonStyle()}>{t.swapComingSoon}</button>
      </section>
    </div>
  );
}

function TokenBox({
  theme,
  label,
  token,
  amount,
  onAmountChange,
  tokenIndex,
  onTokenIndexChange,
  balance,
  tokens,
  readOnly,
}: {
  theme: "dark" | "light";
  label: string;
  token: Asset;
  amount: string;
  onAmountChange: (value: string) => void;
  tokenIndex: number;
  onTokenIndexChange: (value: number) => void;
  balance: string;
  tokens: Asset[];
  readOnly?: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: 20,
        padding: 16,
        border: `1px solid ${theme === "light" ? "#dbe2f0" : "#253047"}`,
        background: theme === "light" ? "#f8fafc" : "#101827",
      }}
    >
      <div style={topRow}>
        <div style={{ color: theme === "light" ? "#64748b" : "#94a3b8", fontSize: 12, fontWeight: 800 }}>
          {label}
        </div>
        <div style={{ color: theme === "light" ? "#64748b" : "#94a3b8", fontSize: 12, fontWeight: 800 }}>
          Balance: {balance}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 150px",
          gap: 12,
          marginTop: 12,
        }}
      >
        <input
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0.00"
          readOnly={readOnly}
          style={inputStyle(theme, !!readOnly)}
          inputMode="decimal"
        />

        <select
          value={tokenIndex}
          onChange={(e) => onTokenIndexChange(Number(e.target.value))}
          style={selectStyle(theme)}
        >
          {tokens.map((item, index) => (
            <option key={`${item.symbol}-${index}`} value={index}>
              {item.symbol}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

async function readBalance(
  provider: ethers.JsonRpcProvider,
  address: string,
  token: Asset
) {
  if (token.type === "native") {
    const raw = await provider.getBalance(address);
    return formatAmount(ethers.formatEther(raw));
  }

  if (!token.address || token.address === "0x0000000000000000000000000000000000000001") {
    return "0";
  }

  const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
  const [bal, dec] = await Promise.all([
    contract.balanceOf(address),
    contract.decimals().catch(() => token.decimals),
  ]);
  return formatAmount(ethers.formatUnits(bal, Number(dec)));
}

function estimateRate(from: string, to: string) {
  if (from === to) return 1;
  if (from === "INRI" && to === "iUSD") return 1;
  if (from === "iUSD" && to === "INRI") return 1;
  if (from === "INRI" && to === "wINRI") return 1;
  if (from === "wINRI" && to === "INRI") return 1;
  if (from === "iUSD" && to === "wINRI") return 1;
  if (from === "wINRI" && to === "iUSD") return 1;
  return 1;
}

const topRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
};

function SummaryRow({
  theme,
  label,
  value,
}: {
  theme: "dark" | "light";
  label: string;
  value: string;
}) {
  return (
    <div style={{ ...topRow, padding: "8px 0" }}>
      <div style={{ color: theme === "light" ? "#64748b" : "#94a3b8", fontSize: 13, fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ color: theme === "light" ? "#0f172a" : "#ffffff", fontSize: 13, fontWeight: 900 }}>
        {value}
      </div>
    </div>
  );
}

function panel(theme: "dark" | "light"): React.CSSProperties {
  return {
    borderRadius: 24,
    padding: 18,
    border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
    background: theme === "light" ? "rgba(255,255,255,.94)" : "rgba(18,22,33,.94)",
    boxShadow:
      theme === "light"
        ? "0 12px 30px rgba(30,40,70,.06)"
        : "0 12px 30px rgba(0,0,0,.22)",
  };
}

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

function titleStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    fontSize: 16,
    fontWeight: 900,
    color: theme === "light" ? "#0f172a" : "#ffffff",
  };
}

function subtitleStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    fontSize: 13,
    marginTop: 6,
    color: theme === "light" ? "#64748b" : "#94a3b8",
    fontWeight: 700,
  };
}

function badge(theme: "dark" | "light"): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 999,
    background: theme === "light" ? "#eef4ff" : "#12203e",
    color: "#3f7cff",
    fontWeight: 900,
    fontSize: 12,
    border: `1px solid ${theme === "light" ? "#cfe0ff" : "#23407d"}`,
  };
}

function inputStyle(theme: "dark" | "light", readOnly: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: 14,
    borderRadius: 16,
    border: `1px solid ${theme === "light" ? "#dbe2f0" : "#253047"}`,
    background: readOnly
      ? theme === "light"
        ? "#eef2f7"
        : "#0e1422"
      : theme === "light"
      ? "#ffffff"
      : "#0f1726",
    color: theme === "light" ? "#0f172a" : "#ffffff",
    outline: "none",
    boxSizing: "border-box",
    fontWeight: 900,
    fontSize: 18,
  };
}

function selectStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    width: "100%",
    padding: 14,
    borderRadius: 16,
    border: `1px solid ${theme === "light" ? "#dbe2f0" : "#253047"}`,
    background: theme === "light" ? "#ffffff" : "#0f1726",
    color: theme === "light" ? "#0f172a" : "#ffffff",
    outline: "none",
    boxSizing: "border-box",
    fontWeight: 900,
  };
}

function flipButton(theme: "dark" | "light"): React.CSSProperties {
  return {
    width: 46,
    height: 46,
    borderRadius: 999,
    border: `1px solid ${theme === "light" ? "#dbe2f0" : "#253047"}`,
    background: theme === "light" ? "#ffffff" : "#101827",
    color: theme === "light" ? "#0f172a" : "#ffffff",
    cursor: "pointer",
    fontSize: 18,
    fontWeight: 900,
  };
}

function mainButtonStyle(): React.CSSProperties {
  return {
    width: "100%",
    marginTop: 12,
    padding: "15px 16px",
    borderRadius: 16,
    border: "none",
    background: "#3f7cff",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 15,
  };
}

function formatAmount(value: string) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  if (num === 0) return "0";
  if (num < 0.0001) return num.toFixed(8);
  if (num < 1) return num.toFixed(4);
  if (num < 1000) return num.toFixed(3);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function getText(lang: string) {
  const map: Record<string, Record<string, string>> = {
    en: {
      swapPreview: "Swap",
      professionalUxPreview: "Professional swap preview and routing UX",
      from: "From",
      to: "To",
      tradePreview: "Trade preview",
      route: "Route",
      networkFee: "Swap fee",
      priceImpact: "Price impact",
      minReceived: "Minimum received",
      swapComingSoon: "Swap execution coming soon",
    },
    pt: {
      swapPreview: "Swap",
      professionalUxPreview: "Prévia profissional de swap e roteamento",
      from: "De",
      to: "Para",
      tradePreview: "Prévia da troca",
      route: "Rota",
      networkFee: "Taxa do swap",
      priceImpact: "Impacto no preço",
      minReceived: "Mínimo recebido",
      swapComingSoon: "Execução do swap em breve",
    },
    es: {
      swapPreview: "Swap",
      professionalUxPreview: "Vista previa profesional de swap y ruta",
      from: "De",
      to: "A",
      tradePreview: "Vista previa",
      route: "Ruta",
      networkFee: "Tarifa del swap",
      priceImpact: "Impacto del precio",
      minReceived: "Mínimo recibido",
      swapComingSoon: "Ejecución del swap próximamente",
    },
    fr: {
      swapPreview: "Swap",
      professionalUxPreview: "Aperçu professionnel du swap et du routage",
      from: "De",
      to: "Vers",
      tradePreview: "Aperçu de l'échange",
      route: "Route",
      networkFee: "Frais du swap",
      priceImpact: "Impact prix",
      minReceived: "Minimum reçu",
      swapComingSoon: "Exécution du swap bientôt disponible",
    },
    de: {
      swapPreview: "Swap",
      professionalUxPreview: "Professionelle Swap-Vorschau und Routing-UX",
      from: "Von",
      to: "Zu",
      tradePreview: "Tauschvorschau",
      route: "Route",
      networkFee: "Swap-Gebühr",
      priceImpact: "Preiseffekt",
      minReceived: "Mindestens erhalten",
      swapComingSoon: "Swap-Ausführung kommt bald",
    },
    ja: {
      swapPreview: "スワップ",
      professionalUxPreview: "プロ仕様のスワッププレビューとルーティングUX",
      from: "元",
      to: "先",
      tradePreview: "取引プレビュー",
      route: "ルート",
      networkFee: "スワップ手数料",
      priceImpact: "価格影響",
      minReceived: "最小受取額",
      swapComingSoon: "スワップ実行は近日対応",
    },
    zh: {
      swapPreview: "兑换",
      professionalUxPreview: "专业级兑换预览与路由体验",
      from: "从",
      to: "到",
      tradePreview: "交易预览",
      route: "路径",
      networkFee: "兑换手续费",
      priceImpact: "价格影响",
      minReceived: "最少收到",
      swapComingSoon: "兑换执行即将上线",
    },
  };

  return map[lang] || map.en;
}
