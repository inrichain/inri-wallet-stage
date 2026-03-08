import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

type Tab =
  | "dashboard"
  | "send"
  | "receive"
  | "tokens"
  | "nfts"
  | "activity"
  | "swap"
  | "bridge"
  | "settings";

type Props = {
  setTab: (tab: Tab) => void;
  theme: "dark" | "light";
  lang: string;
  address: string;
};

const INRI_RPC = "https://rpc.inri.life";
const INRI_RPC_FALLBACK = "https://rpc-chain.inri.life";

export default function DashboardScreen({
  setTab,
  theme,
  lang,
  address,
}: Props) {
  const t = getText(lang);

  const [balance, setBalance] = useState("0");
  const [networkName, setNetworkName] = useState("INRI Mainnet");
  const [chainId, setChainId] = useState("3777");
  const [blockNumber, setBlockNumber] = useState<string>("--");
  const [loading, setLoading] = useState(true);
  const [rpcUsed, setRpcUsed] = useState(INRI_RPC);

  const provider = useMemo(() => {
    try {
      return new ethers.JsonRpcProvider(INRI_RPC, {
        name: "INRI",
        chainId: 3777,
      });
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!address) {
        if (mounted) {
          setBalance("0");
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const mainProvider =
          provider ||
          new ethers.JsonRpcProvider(INRI_RPC, {
            name: "INRI",
            chainId: 3777,
          });

        const [rawBalance, network, latestBlock] = await Promise.all([
          mainProvider.getBalance(address),
          mainProvider.getNetwork(),
          mainProvider.getBlockNumber(),
        ]);

        if (!mounted) return;

        setBalance(formatAmount(ethers.formatEther(rawBalance)));
        setNetworkName(network.name === "unknown" ? "INRI Mainnet" : String(network.name));
        setChainId(String(network.chainId));
        setBlockNumber(String(latestBlock));
        setRpcUsed(INRI_RPC);
      } catch {
        try {
          const fallbackProvider = new ethers.JsonRpcProvider(INRI_RPC_FALLBACK, {
            name: "INRI",
            chainId: 3777,
          });

          const [rawBalance, network, latestBlock] = await Promise.all([
            fallbackProvider.getBalance(address),
            fallbackProvider.getNetwork(),
            fallbackProvider.getBlockNumber(),
          ]);

          if (!mounted) return;

          setBalance(formatAmount(ethers.formatEther(rawBalance)));
          setNetworkName(network.name === "unknown" ? "INRI Mainnet" : String(network.name));
          setChainId(String(network.chainId));
          setBlockNumber(String(latestBlock));
          setRpcUsed(INRI_RPC_FALLBACK);
        } catch {
          if (!mounted) return;
          setBalance("0");
          setNetworkName("INRI Mainnet");
          setChainId("3777");
          setBlockNumber("--");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    const timer = window.setInterval(load, 15000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [address, provider]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={heroCard(theme)}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: theme === "light" ? "#5d6b85" : "#9eabc4",
                marginBottom: 8,
              }}
            >
              {t.totalBalance}
            </div>

            <div
              style={{
                fontSize: 40,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: "-0.04em",
                marginBottom: 10,
              }}
            >
              {loading ? "..." : balance} INRI
            </div>

            <div
              style={{
                fontSize: 13,
                color: theme === "light" ? "#5d6b85" : "#9eabc4",
                wordBreak: "break-all",
              }}
            >
              {address || t.noAddress}
            </div>
          </div>

          <img
            src="/inri-wallet-stage/token-inri.png"
            alt="INRI"
            style={{
              width: 82,
              height: 82,
              objectFit: "contain",
              filter:
                theme === "light"
                  ? "drop-shadow(0 14px 30px rgba(63,124,255,.18))"
                  : "drop-shadow(0 16px 34px rgba(63,124,255,.34))",
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0,1fr))",
            gap: 10,
            marginTop: 16,
          }}
        >
          <button onClick={() => setTab("send")} style={primaryAction()}>
            {t.send}
          </button>
          <button onClick={() => setTab("receive")} style={secondaryAction(theme)}>
            {t.receive}
          </button>
          <button onClick={() => setTab("tokens")} style={secondaryAction(theme)}>
            {t.tokens}
          </button>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <InfoCard
          theme={theme}
          title={t.network}
          value={networkName}
          sub={`Chain ID: ${chainId}`}
        />
        <InfoCard
          theme={theme}
          title={t.latestBlock}
          value={blockNumber}
          sub={t.liveStatus}
        />
        <InfoCard
          theme={theme}
          title={t.rpcStatus}
          value={rpcUsed.includes("rpc-chain") ? "Fallback RPC" : "Main RPC"}
          sub={rpcUsed}
        />
      </section>

      <section style={panel(theme)}>
        <div style={sectionTitle(theme)}>{t.quickAccess}</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
          }}
        >
          <QuickButton
            label={t.activity}
            onClick={() => setTab("activity")}
            theme={theme}
          />
          <QuickButton
            label={t.nfts}
            onClick={() => setTab("nfts")}
            theme={theme}
          />
          <QuickButton
            label={t.swap}
            onClick={() => setTab("swap")}
            theme={theme}
          />
          <QuickButton
            label={t.bridge}
            onClick={() => setTab("bridge")}
            theme={theme}
          />
          <QuickButton
            label={t.settings}
            onClick={() => setTab("settings")}
            theme={theme}
          />
        </div>
      </section>

      <section style={panel(theme)}>
        <div style={sectionTitle(theme)}>{t.walletOverview}</div>

        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          <RowItem
            theme={theme}
            label={t.nativeAsset}
            value="INRI"
          />
          <RowItem
            theme={theme}
            label={t.address}
            value={address ? shortAddress(address) : t.notAvailable}
          />
          <RowItem
            theme={theme}
            label={t.mode}
            value={t.selfCustody}
          />
        </div>
      </section>
    </div>
  );
}

function InfoCard({
  theme,
  title,
  value,
  sub,
}: {
  theme: "dark" | "light";
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <div
      style={{
        borderRadius: 22,
        padding: 16,
        border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
        background: theme === "light" ? "rgba(255,255,255,.92)" : "rgba(18,22,33,.92)",
        boxShadow:
          theme === "light"
            ? "0 12px 28px rgba(30,40,70,.06)"
            : "0 12px 28px rgba(0,0,0,.22)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: theme === "light" ? "#64748b" : "#94a3b8",
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 900,
          color: theme === "light" ? "#0f172a" : "#ffffff",
          marginBottom: 8,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 12,
          color: theme === "light" ? "#64748b" : "#94a3b8",
          wordBreak: "break-word",
        }}
      >
        {sub}
      </div>
    </div>
  );
}

function QuickButton({
  label,
  onClick,
  theme,
}: {
  label: string;
  onClick: () => void;
  theme: "dark" | "light";
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "16px 14px",
        borderRadius: 18,
        border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
        background: theme === "light" ? "#ffffff" : "#131a29",
        color: theme === "light" ? "#0f172a" : "#ffffff",
        cursor: "pointer",
        fontWeight: 800,
        fontSize: 14,
      }}
    >
      {label}
    </button>
  );
}

function RowItem({
  theme,
  label,
  value,
}: {
  theme: "dark" | "light";
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "14px 0",
        borderBottom: `1px solid ${theme === "light" ? "#e7ecf5" : "#1d2638"}`,
      }}
    >
      <div
        style={{
          color: theme === "light" ? "#64748b" : "#94a3b8",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: theme === "light" ? "#0f172a" : "#ffffff",
          fontSize: 14,
          fontWeight: 800,
          textAlign: "right",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function heroCard(theme: "dark" | "light"): React.CSSProperties {
  return {
    borderRadius: 28,
    padding: 20,
    border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
    background:
      theme === "light"
        ? "linear-gradient(180deg, rgba(255,255,255,.96) 0%, rgba(245,248,253,.98) 100%)"
        : "linear-gradient(180deg, rgba(15,22,36,.96) 0%, rgba(10,14,24,.98) 100%)",
    boxShadow:
      theme === "light"
        ? "0 18px 40px rgba(30,40,70,.08)"
        : "0 18px 40px rgba(0,0,0,.28)",
  };
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

function sectionTitle(theme: "dark" | "light"): React.CSSProperties {
  return {
    fontSize: 14,
    fontWeight: 900,
    marginBottom: 14,
    color: theme === "light" ? "#0f172a" : "#ffffff",
  };
}

function primaryAction(): React.CSSProperties {
  return {
    padding: "14px 14px",
    borderRadius: 16,
    border: "none",
    background: "#3f7cff",
    color: "#ffffff",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 14,
  };
}

function secondaryAction(theme: "dark" | "light"): React.CSSProperties {
  return {
    padding: "14px 14px",
    borderRadius: 16,
    border: `1px solid ${theme === "light" ? "#dbe2f0" : "#2a3348"}`,
    background: theme === "light" ? "#ffffff" : "#141c2d",
    color: theme === "light" ? "#0f172a" : "#ffffff",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 14,
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

function shortAddress(address: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getText(lang: string) {
  const map: Record<string, Record<string, string>> = {
    en: {
      totalBalance: "Total balance",
      noAddress: "No address loaded",
      send: "Send",
      receive: "Receive",
      tokens: "Tokens",
      network: "Network",
      latestBlock: "Latest block",
      liveStatus: "Live network status",
      rpcStatus: "RPC status",
      quickAccess: "Quick access",
      activity: "Activity",
      nfts: "NFTs",
      swap: "Swap",
      bridge: "Bridge",
      settings: "Settings",
      walletOverview: "Wallet overview",
      nativeAsset: "Native asset",
      address: "Address",
      mode: "Mode",
      selfCustody: "Self-custody wallet",
      notAvailable: "Not available",
    },
    pt: {
      totalBalance: "Saldo total",
      noAddress: "Nenhum endereço carregado",
      send: "Enviar",
      receive: "Receber",
      tokens: "Tokens",
      network: "Rede",
      latestBlock: "Último bloco",
      liveStatus: "Status da rede em tempo real",
      rpcStatus: "Status do RPC",
      quickAccess: "Acesso rápido",
      activity: "Atividade",
      nfts: "NFTs",
      swap: "Swap",
      bridge: "Bridge",
      settings: "Configurações",
      walletOverview: "Visão da carteira",
      nativeAsset: "Ativo nativo",
      address: "Endereço",
      mode: "Modo",
      selfCustody: "Carteira autônoma",
      notAvailable: "Não disponível",
    },
  };

  return map[lang] || map.en;
}
