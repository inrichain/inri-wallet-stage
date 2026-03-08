import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

type Props = {
  theme: "dark" | "light";
  lang: string;
  address: string;
};

type ActivityItem = {
  hash: string;
  blockNumber: number;
  from: string;
  to: string | null;
  value: string;
  direction: "in" | "out" | "self" | "other";
  timestampLabel: string;
};

const INRI_RPC = "https://rpc.inri.life";
const INRI_RPC_FALLBACK = "https://rpc-chain.inri.life";

export default function ActivityScreen({ theme, lang, address }: Props) {
  const t = getText(lang);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rpcLabel, setRpcLabel] = useState("Main RPC");

  const provider = useMemo(() => {
    try {
      return new ethers.JsonRpcProvider(INRI_RPC, { name: "INRI", chainId: 3777 });
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadActivity() {
      if (!address) {
        if (mounted) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const active =
          provider ||
          new ethers.JsonRpcProvider(INRI_RPC, { name: "INRI", chainId: 3777 });

        const result = await scanLatestActivity(active, address);
        if (!mounted) return;
        setItems(result);
        setRpcLabel("Main RPC");
      } catch {
        try {
          const fallback = new ethers.JsonRpcProvider(INRI_RPC_FALLBACK, {
            name: "INRI",
            chainId: 3777,
          });
          const result = await scanLatestActivity(fallback, address);
          if (!mounted) return;
          setItems(result);
          setRpcLabel("Fallback RPC");
        } catch {
          if (!mounted) return;
          setItems([]);
          setRpcLabel("RPC unavailable");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadActivity();
    return () => {
      mounted = false;
    };
  }, [address, provider]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={panel(theme)}>
        <div style={headerRow}>
          <div>
            <div style={titleStyle(theme)}>{t.activity}</div>
            <div style={subtitleStyle(theme)}>{t.explorerLikeHistory}</div>
          </div>

          <div style={badge(theme)}>{rpcLabel}</div>
        </div>
      </section>

      <section style={panel(theme)}>
        {loading ? (
          <div style={emptyStyle(theme)}>{t.loadingActivity}</div>
        ) : items.length === 0 ? (
          <div style={emptyStyle(theme)}>{t.noRecentActivity}</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((item) => (
              <div
                key={item.hash}
                style={{
                  borderRadius: 20,
                  padding: 16,
                  border: `1px solid ${theme === "light" ? "#dbe2f0" : "#253047"}`,
                  background: theme === "light" ? "#ffffff" : "#101827",
                }}
              >
                <div style={headerRow}>
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: 14,
                      color:
                        item.direction === "in"
                          ? "#16a34a"
                          : item.direction === "out"
                          ? "#ef4444"
                          : theme === "light"
                          ? "#0f172a"
                          : "#ffffff",
                    }}
                  >
                    {labelByDirection(item.direction, t)}
                  </div>

                  <div style={smallMuted(theme)}>
                    #{item.blockNumber} · {item.timestampLabel}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    fontSize: 24,
                    fontWeight: 900,
                    color: theme === "light" ? "#0f172a" : "#ffffff",
                  }}
                >
                  {item.value} INRI
                </div>

                <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
                  <Row theme={theme} label={t.from} value={item.from} />
                  <Row theme={theme} label={t.to} value={item.to || "-"} />
                  <Row theme={theme} label={t.hash} value={item.hash} mono />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

async function scanLatestActivity(
  provider: ethers.JsonRpcProvider,
  address: string
): Promise<ActivityItem[]> {
  const currentBlock = await provider.getBlockNumber();
  const lookback = 18;
  const out: ActivityItem[] = [];

  for (let i = currentBlock; i > Math.max(0, currentBlock - lookback); i--) {
    const block = await provider.getBlock(i, true);
    if (!block?.transactions?.length) continue;

    for (const tx of block.transactions) {
      if (typeof tx === "string") continue;

      const from = (tx.from || "").toLowerCase();
      const to = (tx.to || "").toLowerCase();
      const me = address.toLowerCase();

      if (from === me || to === me) {
        let direction: ActivityItem["direction"] = "other";
        if (from === me && to === me) direction = "self";
        else if (to === me) direction = "in";
        else if (from === me) direction = "out";

        out.push({
          hash: tx.hash,
          blockNumber: Number(tx.blockNumber || i),
          from: tx.from || "-",
          to: tx.to || "-",
          value: formatAmount(ethers.formatEther(tx.value || 0n)),
          direction,
          timestampLabel: tstamp(block.timestamp),
        });
      }
    }

    if (out.length >= 12) break;
  }

  return out.slice(0, 12);
}

function tstamp(ts: number | bigint) {
  try {
    const date = new Date(Number(ts) * 1000);
    return date.toLocaleString();
  } catch {
    return "-";
  }
}

function labelByDirection(
  direction: ActivityItem["direction"],
  t: Record<string, string>
) {
  if (direction === "in") return t.received;
  if (direction === "out") return t.sent;
  if (direction === "self") return t.selfTransfer;
  return t.transaction;
}

function Row({
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
        gridTemplateColumns: "110px 1fr",
        gap: 10,
        alignItems: "start",
      }}
    >
      <div style={smallMuted(theme)}>{label}</div>
      <div
        style={{
          color: theme === "light" ? "#0f172a" : "#ffffff",
          fontSize: 13,
          fontWeight: 800,
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

function smallMuted(theme: "dark" | "light"): React.CSSProperties {
  return {
    color: theme === "light" ? "#64748b" : "#94a3b8",
    fontSize: 12,
    fontWeight: 700,
  };
}

function emptyStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 18,
    textAlign: "center",
    color: theme === "light" ? "#64748b" : "#94a3b8",
    background: theme === "light" ? "#f8fafc" : "#101827",
    border: `1px solid ${theme === "light" ? "#e2e8f0" : "#1f2937"}`,
    fontWeight: 700,
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
      activity: "Activity",
      explorerLikeHistory: "Recent on-chain activity in explorer style",
      loadingActivity: "Loading activity...",
      noRecentActivity: "No recent native transfers were found in the latest scanned blocks.",
      received: "Received",
      sent: "Sent",
      selfTransfer: "Self transfer",
      transaction: "Transaction",
      from: "From",
      to: "To",
      hash: "Hash",
    },
    pt: {
      activity: "Atividade",
      explorerLikeHistory: "Atividade recente on-chain em estilo explorer",
      loadingActivity: "Carregando atividade...",
      noRecentActivity: "Nenhuma transferência nativa recente foi encontrada nos últimos blocos analisados.",
      received: "Recebido",
      sent: "Enviado",
      selfTransfer: "Auto transferência",
      transaction: "Transação",
      from: "De",
      to: "Para",
      hash: "Hash",
    },
    es: {
      activity: "Actividad",
      explorerLikeHistory: "Actividad reciente on-chain con estilo explorer",
      loadingActivity: "Cargando actividad...",
      noRecentActivity: "No se encontraron transferencias nativas recientes en los últimos bloques analizados.",
      received: "Recibido",
      sent: "Enviado",
      selfTransfer: "Auto transferencia",
      transaction: "Transacción",
      from: "De",
      to: "Para",
      hash: "Hash",
    },
    fr: {
      activity: "Activité",
      explorerLikeHistory: "Activité on-chain récente en style explorer",
      loadingActivity: "Chargement de l'activité...",
      noRecentActivity: "Aucun transfert natif récent trouvé dans les derniers blocs analysés.",
      received: "Reçu",
      sent: "Envoyé",
      selfTransfer: "Auto transfert",
      transaction: "Transaction",
      from: "De",
      to: "À",
      hash: "Hash",
    },
    de: {
      activity: "Aktivität",
      explorerLikeHistory: "Letzte On-Chain-Aktivität im Explorer-Stil",
      loadingActivity: "Aktivität wird geladen...",
      noRecentActivity: "In den zuletzt gescannten Blöcken wurden keine nativen Transfers gefunden.",
      received: "Empfangen",
      sent: "Gesendet",
      selfTransfer: "Eigenübertrag",
      transaction: "Transaktion",
      from: "Von",
      to: "An",
      hash: "Hash",
    },
    ja: {
      activity: "履歴",
      explorerLikeHistory: "エクスプローラー風の最近のオンチェーン履歴",
      loadingActivity: "履歴を読み込み中...",
      noRecentActivity: "最近スキャンしたブロックでネイティブ送金は見つかりませんでした。",
      received: "受信",
      sent: "送信",
      selfTransfer: "自己送金",
      transaction: "トランザクション",
      from: "送信元",
      to: "送信先",
      hash: "ハッシュ",
    },
    zh: {
      activity: "活动",
      explorerLikeHistory: "以浏览器风格显示最近链上活动",
      loadingActivity: "正在加载活动...",
      noRecentActivity: "在最近扫描的区块中未找到原生活动转账。",
      received: "收到",
      sent: "发送",
      selfTransfer: "自转",
      transaction: "交易",
      from: "从",
      to: "到",
      hash: "哈希",
    },
  };

  return map[lang] || map.en;
}
