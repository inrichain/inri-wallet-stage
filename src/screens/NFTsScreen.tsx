import React, { useEffect, useMemo, useState } from "react";
import { shortAddress } from "../lib/inri";

const PLACEHOLDER = "/inri-wallet-stage/token-inri.png";

export default function NFTsScreen({
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nfts, setNfts] = useState<any[]>([]);

  useEffect(() => {
    let active = true;

    async function loadNfts() {
      try {
        setLoading(true);
        setError("");

        const url = `https://scan.inri.life/api?module=account&action=tokennfttx&address=${address}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!active) return;

        const raw = Array.isArray(data?.result) ? data.result : [];
        const latestByToken = new Map<string, any>();

        for (const item of raw.reverse()) {
          const tokenId = String(item?.tokenID || item?.tokenId || "0");
          const contract = String(item?.contractAddress || item?.tokenAddress || "").toLowerCase();
          const key = `${contract}_${tokenId}`;

          const to = String(item?.to || "").toLowerCase();
          const from = String(item?.from || "").toLowerCase();

          if (to === address.toLowerCase()) {
            latestByToken.set(key, item);
          }

          if (from === address.toLowerCase() && to !== address.toLowerCase()) {
            latestByToken.delete(key);
          }
        }

        setNfts(Array.from(latestByToken.values()));
      } catch {
        if (!active) return;
        setError(t.loadError);
        setNfts([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    if (address) loadNfts();

    return () => {
      active = false;
    };
  }, [address, t.loadError]);

  const collectionCount = useMemo(() => {
    return new Set(
      nfts.map((item) => String(item?.tokenName || item?.contractAddress || "Unknown"))
    ).size;
  }, [nfts]);

  return (
    <div className="inri-fade-up" style={{ display: "grid", gap: 16 }}>
      <section className="inri-card" style={{ padding: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: isLight ? "#0f172a" : "#ffffff" }}>{t.nfts}</h2>
            <div style={{ marginTop: 6, color: isLight ? "#64748b" : "#95a2bd", fontSize: 13 }}>
              {t.subtitle}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <SummaryChip theme={theme} label={t.items} value={String(nfts.length)} />
            <SummaryChip theme={theme} label={t.collections} value={String(collectionCount)} />
          </div>
        </div>
      </section>

      {loading ? (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="inri-card" style={{ padding: 14 }}>
              <div
                style={{
                  height: 180,
                  borderRadius: 20,
                  background: isLight ? "#edf3ff" : "rgba(255,255,255,.05)",
                }}
              />
              <div
                style={{
                  marginTop: 14,
                  height: 18,
                  borderRadius: 999,
                  background: isLight ? "#edf3ff" : "rgba(255,255,255,.06)",
                }}
              />
              <div
                style={{
                  marginTop: 10,
                  height: 12,
                  width: "70%",
                  borderRadius: 999,
                  background: isLight ? "#edf3ff" : "rgba(255,255,255,.06)",
                }}
              />
            </div>
          ))}
        </section>
      ) : error ? (
        <section className="inri-card" style={{ padding: 22, textAlign: "center" }}>
          <div style={{ fontSize: 42 }}>⚠</div>
          <div
            style={{
              marginTop: 10,
              fontWeight: 900,
              fontSize: 19,
              color: isLight ? "#0f172a" : "#ffffff",
            }}
          >
            {error}
          </div>
        </section>
      ) : nfts.length === 0 ? (
        <section className="inri-card" style={{ padding: 26, textAlign: "center" }}>
          <div style={{ fontSize: 42 }}>🖼</div>
          <div
            style={{
              marginTop: 10,
              fontWeight: 900,
              fontSize: 20,
              color: isLight ? "#0f172a" : "#ffffff",
            }}
          >
            {t.empty}
          </div>
          <div style={{ marginTop: 6, color: isLight ? "#64748b" : "#95a2bd", fontSize: 14 }}>
            {t.emptySub}
          </div>
        </section>
      ) : (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          {nfts.map((item, index) => {
            const tokenName = item?.tokenName || t.unknownCollection;
            const tokenSymbol = item?.tokenSymbol || "NFT";
            const tokenId = String(item?.tokenID || item?.tokenId || index + 1);
            const contract = item?.contractAddress || "";

            return (
              <article key={`${contract}_${tokenId}_${index}`} className="inri-card" style={{ padding: 14 }}>
                <div
                  style={{
                    borderRadius: 22,
                    overflow: "hidden",
                    aspectRatio: "1 / 1",
                    background: isLight
                      ? "linear-gradient(180deg,#eef4ff 0%,#f8fbff 100%)"
                      : "linear-gradient(180deg,rgba(79,124,255,.16) 0%, rgba(17,23,42,.76) 100%)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <img
                    src={item?.image || item?.image_url || PLACEHOLDER}
                    alt={`${tokenName} ${tokenId}`}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                    }}
                    style={{ width: "52%", maxWidth: 124, objectFit: "contain" }}
                  />
                </div>

                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      color: isLight ? "#0f172a" : "#ffffff",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.2,
                    }}
                  >
                    {tokenName}
                  </div>
                  <div style={{ marginTop: 4, color: isLight ? "#64748b" : "#95a2bd", fontSize: 13 }}>
                    {tokenSymbol} • #{tokenId}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                  <MetaBox theme={theme} label={t.contract} value={shortAddress(contract)} />
                  <MetaBox theme={theme} label={t.owner} value={shortAddress(address)} />
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function SummaryChip({
  theme,
  label,
  value,
}: {
  theme: "dark" | "light";
  label: string;
  value: string;
}) {
  const isLight = theme === "light";

  return (
    <div
      className="inri-chip"
      style={{
        color: isLight ? "#334155" : "#d9e2f2",
        fontWeight: 800,
        fontSize: 13,
      }}
    >
      <span style={{ color: isLight ? "#64748b" : "#95a2bd", fontWeight: 700 }}>{label}</span>
      {value}
    </div>
  );
}

function MetaBox({
  theme,
  label,
  value,
}: {
  theme: "dark" | "light";
  label: string;
  value: string;
}) {
  const isLight = theme === "light";

  return (
    <div
      style={{
        borderRadius: 16,
        padding: 12,
        background: isLight ? "#f8fbff" : "rgba(255,255,255,.03)",
        border: `1px solid ${isLight ? "rgba(155,170,200,.16)" : "rgba(134,153,192,.10)"}`,
      }}
    >
      <div style={{ color: isLight ? "#64748b" : "#95a2bd", fontSize: 12 }}>{label}</div>
      <div style={{ marginTop: 6, color: isLight ? "#0f172a" : "#ffffff", fontWeight: 800, fontSize: 13 }}>
        {value}
      </div>
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      nfts: "NFTs",
      subtitle: "Your collectibles with cleaner cards and collection stats.",
      items: "Items",
      collections: "Collections",
      empty: "No NFTs found",
      emptySub: "When your wallet receives NFTs, they will appear here.",
      contract: "Contract",
      owner: "Owner",
      unknownCollection: "Unknown collection",
      loadError: "Unable to load NFTs right now.",
    },
    pt: {
      nfts: "NFTs",
      subtitle: "Seus colecionáveis com cards melhores e estatísticas da coleção.",
      items: "Itens",
      collections: "Coleções",
      empty: "Nenhum NFT encontrado",
      emptySub: "Quando sua wallet receber NFTs, eles aparecerão aqui.",
      contract: "Contrato",
      owner: "Proprietário",
      unknownCollection: "Coleção desconhecida",
      loadError: "Não foi possível carregar os NFTs agora.",
    },
  };

  return map[lang] || map.en;
}
