import React, { useEffect, useState } from "react";
import { getKnownTokens, loadAllBalances } from "../lib/inri";
import { getActiveNetwork } from "../lib/networks";

export default function TokensScreen({
  address,
  lang = "en",
}: {
  address: string;
  lang?: string;
}) {
  const network = getActiveNetwork();
  const t = getText(lang);

  const [tokens, setTokens] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});

  useEffect(() => {
    const list = getKnownTokens(network.id);
    setTokens(list);

    loadAllBalances(network.id, address, list)
      .then(setBalances)
      .catch(() => setBalances({}));
  }, [address, network.id]);

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={panel()}>
        <div style={title()}>{t.title}</div>
        <div style={subtitle()}>{network.name}</div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {tokens.map((token) => (
          <div key={`${token.symbol}-${token.networkId}`} style={tokenCard()}>
            <img
              src={token.logo}
              alt={token.symbol}
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                objectFit: "contain",
                flexShrink: 0,
              }}
            />

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={tokenTitle()}>{token.symbol}</div>
              <div style={tokenSub()}>{token.name}</div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={balanceText()}>
                {balances[token.symbol] || "0.000000"}
              </div>
              <div style={tokenSub()}>{token.symbol}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: { title: "Tokens" },
    pt: { title: "Tokens" },
  };
  return map[lang] || map.en;
}

function panel(): React.CSSProperties {
  return {
    borderRadius: 24,
    padding: 18,
    background:
      "linear-gradient(180deg, rgba(13,20,35,.96) 0%, rgba(8,14,26,.98) 100%)",
    border: "1px solid rgba(79,116,201,.18)",
    boxShadow: "0 16px 36px rgba(0,0,0,.24)",
  };
}
function title(): React.CSSProperties {
  return { color: "#fff", fontSize: 22, fontWeight: 900 };
}
function subtitle(): React.CSSProperties {
  return { color: "#91a5cc", fontSize: 13, fontWeight: 700, marginTop: 6 };
}
function tokenCard(): React.CSSProperties {
  return {
    borderRadius: 20,
    padding: 16,
    background:
      "linear-gradient(180deg, rgba(13,20,35,.96) 0%, rgba(8,14,26,.98) 100%)",
    border: "1px solid rgba(79,116,201,.18)",
    boxShadow: "0 12px 28px rgba(0,0,0,.20)",
    display: "flex",
    alignItems: "center",
    gap: 14,
  };
}
function tokenTitle(): React.CSSProperties {
  return { color: "#fff", fontSize: 15, fontWeight: 900 };
}
function tokenSub(): React.CSSProperties {
  return { color: "#8ea1c7", fontSize: 12, fontWeight: 700, marginTop: 4 };
}
function balanceText(): React.CSSProperties {
  return { color: "#fff", fontSize: 15, fontWeight: 900 };
}
