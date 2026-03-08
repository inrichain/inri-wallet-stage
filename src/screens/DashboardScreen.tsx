import React, { useEffect, useMemo, useState } from "react";
import { DEFAULT_TOKENS, getNativeBalance, loadAllBalances, shortAddress } from "../lib/inri";

export default function DashboardScreen({
  setTab,
  theme = "dark",
  lang = "en",
  address = "",
}: {
  setTab: (tab: any) => void;
  theme?: "dark" | "light";
  lang?: string;
  address?: string;
}) {
  const [balance, setBalance] = useState("0.000000");
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const isLight = theme === "light";
  const t = getText(lang);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [nativeBalance, allBalances] = await Promise.all([
          getNativeBalance(address || ""),
          loadAllBalances(address || "", DEFAULT_TOKENS.slice(0, 4)),
        ]);

        if (!active) return;
        setBalance(nativeBalance);
        setTokenBalances(allBalances);
      } catch {
        if (!active) return;
        setBalance("0.000000");
        setTokenBalances({});
      }
    }

    loadData();
    const timer = setInterval(loadData, 9000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [address]);

  const primaryActions = useMemo(
    () => [
      { id: "send", label: t.send, subtitle: t.sendSub, icon: "↑" },
      { id: "receive", label: t.receive, subtitle: t.receiveSub, icon: "↓" },
      { id: "swap", label: t.swap, subtitle: t.swapSub, icon: "⇄" },
      { id: "bridge", label: t.bridge, subtitle: t.bridgeSub, icon: "⇅" },
    ],
    [t]
  );

  const portfolio = DEFAULT_TOKENS.slice(0, 4);

  return (
    <div className="inri-fade-up" style={{ display: "grid", gap: 16 }}>
      <section
        className="inri-card"
        style={{
          padding: 20,
          overflow: "hidden",
          position: "relative",
          background: isLight
            ? "linear-gradient(180deg,#ffffff 0%, #f8fbff 100%)"
            : "linear-gradient(180deg,rgba(79,124,255,.22) 0%, rgba(17,23,42,.95) 38%, rgba(17,23,42,.98) 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -110,
            right: -90,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: isLight ? "rgba(79,124,255,.10)" : "rgba(79,124,255,.16)",
            filter: "blur(10px)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ color: isLight ? "#64748b" : "#95a2bd", fontSize: 14 }}>
                {t.totalBalance}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 38,
                  fontWeight: 900,
                  color: isLight ? "#0f172a" : "#ffffff",
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                  wordBreak: "break-word",
                }}
              >
                {balance} INRI
              </div>
            </div>

            <div
              className="inri-chip"
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: isLight ? "#3359d4" : "#b9c7ff",
              }}
            >
              {t.mainnetReady}
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <StatBox
              theme={theme}
              label={t.address}
              value={shortAddress(address)}
              caption={t.walletLive}
            />
            <StatBox
              theme={theme}
              label={t.network}
              value="INRI Chain"
              caption="Chain ID 3777"
            />
            <StatBox
              theme={theme}
              label={t.status}
              value={t.online}
              caption={t.secureStorage}
            />
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {primaryActions.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className="inri-card"
            style={{
              padding: 16,
              textAlign: "left",
              cursor: "pointer",
              border: "none",
              color: isLight ? "#0f172a" : "#ffffff",
              background: isLight ? "#ffffff" : "rgba(17,23,42,.88)",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                background: isLight ? "#eef4ff" : "rgba(79,124,255,.14)",
                color: "#4f7cff",
                fontWeight: 900,
                fontSize: 22,
              }}
            >
              {item.icon}
            </div>

            <div style={{ marginTop: 14, fontWeight: 900, fontSize: 18 }}>{item.label}</div>
            <div style={{ marginTop: 6, color: isLight ? "#64748b" : "#95a2bd", fontSize: 13 }}>
              {item.subtitle}
            </div>
          </button>
        ))}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.35fr .95fr",
          gap: 16,
        }}
      >
        <div className="inri-card" style={{ padding: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 20,
                  color: isLight ? "#0f172a" : "#ffffff",
                }}
              >
                {t.portfolio}
              </div>
              <div style={{ marginTop: 4, color: isLight ? "#64748b" : "#95a2bd", fontSize: 13 }}>
                {t.portfolioSub}
              </div>
            </div>

            <button
              onClick={() => setTab("tokens")}
              style={ghostButtonStyle(isLight)}
            >
              {t.viewAll}
            </button>
          </div>

          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {portfolio.map((token) => (
              <div
                key={token.symbol}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: 18,
                  background: isLight ? "#f8fbff" : "rgba(255,255,255,.03)",
                  border: `1px solid ${isLight ? "rgba(155,170,200,.18)" : "rgba(134,153,192,.10)"}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <img
                    src={token.logo}
                    alt={token.symbol}
                    style={{ width: 42, height: 42, borderRadius: 14, objectFit: "cover" }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: isLight ? "#0f172a" : "#ffffff" }}>
                      {token.symbol}
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        color: isLight ? "#64748b" : "#95a2bd",
                        fontSize: 12,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {token.subtitle}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900, color: isLight ? "#0f172a" : "#ffffff" }}>
                    {tokenBalances[token.symbol] || "0.000000"}
                  </div>
                  <div style={{ marginTop: 2, color: isLight ? "#64748b" : "#95a2bd", fontSize: 12 }}>
                    {token.symbol}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="inri-card" style={{ padding: 18 }}>
          <div
            style={{
              fontWeight: 900,
              fontSize: 20,
              color: isLight ? "#0f172a" : "#ffffff",
            }}
          >
            {t.quickTools}
          </div>

          <div style={{ marginTop: 6, color: isLight ? "#64748b" : "#95a2bd", fontSize: 13 }}>
            {t.quickToolsSub}
          </div>

          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <QuickLinkCard
              theme={theme}
              title={t.tokens}
              description={t.tokensSub}
              onClick={() => setTab("tokens")}
            />
            <QuickLinkCard
              theme={theme}
              title={t.nfts}
              description={t.nftsSub}
              onClick={() => setTab("nfts")}
            />
            <QuickLinkCard
              theme={theme}
              title={t.activity}
              description={t.activitySub}
              onClick={() => setTab("activity")}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function StatBox({
  theme,
  label,
  value,
  caption,
}: {
  theme: "dark" | "light";
  label: string;
  value: string;
  caption: string;
}) {
  const isLight = theme === "light";

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        background: isLight ? "rgba(255,255,255,.72)" : "rgba(255,255,255,.04)",
        border: `1px solid ${isLight ? "rgba(155,170,200,.18)" : "rgba(134,153,192,.12)"}`,
      }}
    >
      <div style={{ color: isLight ? "#64748b" : "#95a2bd", fontSize: 12 }}>{label}</div>
      <div
        style={{
          marginTop: 8,
          color: isLight ? "#0f172a" : "#ffffff",
          fontWeight: 900,
          fontSize: 16,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
      <div style={{ marginTop: 6, color: isLight ? "#64748b" : "#95a2bd", fontSize: 12 }}>
        {caption}
      </div>
    </div>
  );
}

function QuickLinkCard({
  theme,
  title,
  description,
  onClick,
}: {
  theme: "dark" | "light";
  title: string;
  description: string;
  onClick: () => void;
}) {
  const isLight = theme === "light";

  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${isLight ? "rgba(155,170,200,.18)" : "rgba(134,153,192,.12)"}`,
        background: isLight ? "#f8fbff" : "rgba(255,255,255,.03)",
        color: isLight ? "#0f172a" : "#ffffff",
        borderRadius: 18,
        padding: 16,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
      <div style={{ marginTop: 6, color: isLight ? "#64748b" : "#95a2bd", fontSize: 13 }}>
        {description}
      </div>
    </button>
  );
}

function ghostButtonStyle(isLight: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isLight ? "rgba(79,124,255,.15)" : "rgba(79,124,255,.24)"}`,
    background: isLight ? "#eef4ff" : "rgba(79,124,255,.12)",
    color: "#4f7cff",
    padding: "10px 14px",
    borderRadius: 14,
    fontWeight: 800,
    cursor: "pointer",
  };
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      totalBalance: "Total balance",
      mainnetReady: "Live on mainnet",
      address: "Address",
      walletLive: "Wallet connected to your vault",
      network: "Network",
      status: "Status",
      online: "Online",
      secureStorage: "Encrypted local vault enabled",
      send: "Send",
      sendSub: "Transfer INRI or ERC20 assets",
      receive: "Receive",
      receiveSub: "Show QR code and wallet address",
      swap: "Swap",
      swapSub: "Preview trading flow with pro UX",
      bridge: "Bridge",
      bridgeSub: "Move assets between supported networks",
      portfolio: "Portfolio",
      portfolioSub: "Tracked balances in your wallet",
      viewAll: "View all",
      quickTools: "Quick tools",
      quickToolsSub: "Open the most used wallet sections fast.",
      tokens: "Tokens",
      tokensSub: "Manage assets and custom token list.",
      nfts: "NFTs",
      nftsSub: "Browse collectibles with cleaner cards.",
      activity: "Activity",
      activitySub: "See wallet history in explorer style.",
    },
    pt: {
      totalBalance: "Saldo total",
      mainnetReady: "Mainnet ativa",
      address: "Endereço",
      walletLive: "Wallet conectada ao seu cofre",
      network: "Rede",
      status: "Status",
      online: "Online",
      secureStorage: "Cofre local criptografado ativo",
      send: "Enviar",
      sendSub: "Transferir INRI ou tokens ERC20",
      receive: "Receber",
      receiveSub: "Mostrar QR code e endereço",
      swap: "Swap",
      swapSub: "Prévia do fluxo com UX profissional",
      bridge: "Bridge",
      bridgeSub: "Mover ativos entre redes suportadas",
      portfolio: "Portfólio",
      portfolioSub: "Saldos acompanhados na sua wallet",
      viewAll: "Ver tudo",
      quickTools: "Ferramentas rápidas",
      quickToolsSub: "Abra as áreas mais usadas da wallet rapidamente.",
      tokens: "Tokens",
      tokensSub: "Gerencie ativos e lista de tokens customizados.",
      nfts: "NFTs",
      nftsSub: "Veja coleções com cards melhores.",
      activity: "Atividade",
      activitySub: "Veja o histórico no estilo explorer.",
    },
  };
  return map[lang] || map.en;
}
