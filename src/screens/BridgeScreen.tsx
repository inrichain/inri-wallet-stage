import React, { useState } from "react";

type Props = {
  theme: "dark" | "light";
  lang: string;
  address: string;
};

type Network = {
  id: string;
  label: string;
};

const NETWORKS: Network[] = [
  { id: "polygon", label: "Polygon" },
  { id: "inri", label: "INRI" },
];

export default function BridgeScreen({ theme, lang, address }: Props) {
  const t = getText(lang);

  const [fromNet, setFromNet] = useState("polygon");
  const [toNet, setToNet] = useState("inri");
  const [asset, setAsset] = useState("USDT / iUSD");
  const [amount, setAmount] = useState("");
  const [feePreview, setFeePreview] = useState("0");

  function handleAmount(value: string) {
    setAmount(value);
    const num = Number(value || "0");
    if (!Number.isFinite(num) || num <= 0) {
      setFeePreview("0");
      return;
    }
    setFeePreview((num * 0.002).toFixed(num < 10 ? 4 : 2));
  }

  function flip() {
    setFromNet(toNet);
    setToNet(fromNet);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={panel(theme)}>
        <div style={titleStyle(theme)}>{t.bridgePreview}</div>
        <div style={subtitleStyle(theme)}>{t.bridgeSubtitle}</div>
      </section>

      <section style={panel(theme)}>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <div style={labelStyle(theme)}>{t.fromNetwork}</div>
            <select value={fromNet} onChange={(e) => setFromNet(e.target.value)} style={inputStyle(theme)}>
              {NETWORKS.map((net) => (
                <option key={net.id} value={net.id}>
                  {net.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <button onClick={flip} style={flipButton(theme)}>⇅</button>
          </div>

          <div>
            <div style={labelStyle(theme)}>{t.toNetwork}</div>
            <select value={toNet} onChange={(e) => setToNet(e.target.value)} style={inputStyle(theme)}>
              {NETWORKS.map((net) => (
                <option key={net.id} value={net.id}>
                  {net.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={labelStyle(theme)}>{t.asset}</div>
            <input value={asset} readOnly style={inputStyle(theme)} />
          </div>

          <div>
            <div style={labelStyle(theme)}>{t.amount}</div>
            <input
              value={amount}
              onChange={(e) => handleAmount(e.target.value)}
              placeholder="0.00"
              style={inputStyle(theme)}
              inputMode="decimal"
            />
          </div>
        </div>
      </section>

      <section style={panel(theme)}>
        <div style={titleStyle(theme)}>{t.bridgeSummary}</div>

        <SummaryRow theme={theme} label={t.route} value={`${labelOf(fromNet)} → ${labelOf(toNet)}`} />
        <SummaryRow theme={theme} label={t.userAddress} value={address || "-"} mono />
        <SummaryRow theme={theme} label={t.asset} value={asset} />
        <SummaryRow theme={theme} label={t.protocolFee} value={`${feePreview} (${t.feeRate})`} />
        <SummaryRow theme={theme} label={t.status} value={t.previewOnly} />

        <button style={mainButtonStyle()}>{t.bridgeComingSoon}</button>
      </section>
    </div>
  );
}

function labelOf(id: string) {
  return NETWORKS.find((n) => n.id === id)?.label || id;
}

function SummaryRow({
  theme,
  label,
  value,
  mono,
}: {
  theme: "dark" | "light";
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "130px 1fr",
        gap: 10,
        padding: "8px 0",
        alignItems: "start",
      }}
    >
      <div style={{ color: theme === "light" ? "#64748b" : "#94a3b8", fontSize: 13, fontWeight: 800 }}>
        {label}
      </div>
      <div
        style={{
          color: theme === "light" ? "#0f172a" : "#ffffff",
          fontSize: 13,
          fontWeight: 900,
          wordBreak: "break-all",
          fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
        }}
      >
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

function labelStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 8,
    color: theme === "light" ? "#64748b" : "#94a3b8",
  };
}

function inputStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    width: "100%",
    padding: 14,
    borderRadius: 16,
    border: `1px solid ${theme === "light" ? "#dbe2f0" : "#253047"}`,
    background: theme === "light" ? "#ffffff" : "#0f1726",
    color: theme === "light" ? "#0f172a" : "#ffffff",
    outline: "none",
    boxSizing: "border-box",
    fontWeight: 800,
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

function getText(lang: string) {
  const map: Record<string, Record<string, string>> = {
    en: {
      bridgePreview: "Bridge",
      bridgeSubtitle: "Professional bridge preview for Polygon ↔ INRI flow",
      fromNetwork: "From network",
      toNetwork: "To network",
      asset: "Asset",
      amount: "Amount",
      bridgeSummary: "Bridge summary",
      route: "Route",
      userAddress: "Your address",
      protocolFee: "Protocol fee",
      feeRate: "0.20%",
      status: "Status",
      previewOnly: "Preview only",
      bridgeComingSoon: "Bridge execution coming soon",
    },
    pt: {
      bridgePreview: "Bridge",
      bridgeSubtitle: "Prévia profissional do bridge para fluxo Polygon ↔ INRI",
      fromNetwork: "Rede de origem",
      toNetwork: "Rede de destino",
      asset: "Ativo",
      amount: "Quantidade",
      bridgeSummary: "Resumo do bridge",
      route: "Rota",
      userAddress: "Seu endereço",
      protocolFee: "Taxa do protocolo",
      feeRate: "0,20%",
      status: "Status",
      previewOnly: "Apenas prévia",
      bridgeComingSoon: "Execução do bridge em breve",
    },
    es: {
      bridgePreview: "Bridge",
      bridgeSubtitle: "Vista previa profesional del bridge Polygon ↔ INRI",
      fromNetwork: "Red de origen",
      toNetwork: "Red de destino",
      asset: "Activo",
      amount: "Cantidad",
      bridgeSummary: "Resumen del bridge",
      route: "Ruta",
      userAddress: "Tu dirección",
      protocolFee: "Tarifa del protocolo",
      feeRate: "0.20%",
      status: "Estado",
      previewOnly: "Solo vista previa",
      bridgeComingSoon: "Ejecución del bridge próximamente",
    },
    fr: {
      bridgePreview: "Bridge",
      bridgeSubtitle: "Aperçu professionnel du bridge Polygon ↔ INRI",
      fromNetwork: "Réseau source",
      toNetwork: "Réseau destination",
      asset: "Actif",
      amount: "Montant",
      bridgeSummary: "Résumé du bridge",
      route: "Route",
      userAddress: "Votre adresse",
      protocolFee: "Frais du protocole",
      feeRate: "0,20%",
      status: "Statut",
      previewOnly: "Aperçu בלבד",
      bridgeComingSoon: "Exécution du bridge bientôt disponible",
    },
    de: {
      bridgePreview: "Bridge",
      bridgeSubtitle: "Professionelle Bridge-Vorschau für Polygon ↔ INRI",
      fromNetwork: "Quellnetzwerk",
      toNetwork: "Zielnetzwerk",
      asset: "Asset",
      amount: "Betrag",
      bridgeSummary: "Bridge-Zusammenfassung",
      route: "Route",
      userAddress: "Deine Adresse",
      protocolFee: "Protokollgebühr",
      feeRate: "0,20%",
      status: "Status",
      previewOnly: "Nur Vorschau",
      bridgeComingSoon: "Bridge-Ausführung kommt bald",
    },
    ja: {
      bridgePreview: "ブリッジ",
      bridgeSubtitle: "Polygon ↔ INRI 向けのプロ仕様ブリッジプレビュー",
      fromNetwork: "送信元ネットワーク",
      toNetwork: "送信先ネットワーク",
      asset: "資産",
      amount: "数量",
      bridgeSummary: "ブリッジ概要",
      route: "ルート",
      userAddress: "あなたのアドレス",
      protocolFee: "プロトコル手数料",
      feeRate: "0.20%",
      status: "状態",
      previewOnly: "プレビューのみ",
      bridgeComingSoon: "ブリッジ実行は近日対応",
    },
    zh: {
      bridgePreview: "桥接",
      bridgeSubtitle: "Polygon ↔ INRI 专业桥接预览",
      fromNetwork: "来源网络",
      toNetwork: "目标网络",
      asset: "资产",
      amount: "数量",
      bridgeSummary: "桥接摘要",
      route: "路径",
      userAddress: "你的地址",
      protocolFee: "协议费用",
      feeRate: "0.20%",
      status: "状态",
      previewOnly: "仅预览",
      bridgeComingSoon: "桥接执行即将上线",
    },
  };

  return map[lang] || map.en;
}
