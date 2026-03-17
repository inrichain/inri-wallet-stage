import React, { useEffect, useState } from "react";

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
  const [nfts, setNfts] = useState<any[]>([]);

  useEffect(() => {
    let active = true;

    async function loadNfts() {
      try {
        setLoading(true);

        const explorerUrl = `https://explorer.inri.life/api?module=account&action=tokennfttx&address=${address}`;
        const res = await fetch(explorerUrl);
        const data = await res.json();

        if (!active) return;

        if (Array.isArray(data?.result)) {
          const unique = new Map<string, any>();

          for (const item of data.result) {
            const key = `${item.contractAddress}-${item.tokenID}`;
            unique.set(key, item);
          }

          setNfts(Array.from(unique.values()));
        } else {
          setNfts([]);
        }
      } catch {
        if (!active) return;
        setNfts([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    if (address) {
      loadNfts();
    } else {
      setLoading(false);
      setNfts([]);
    }

    return () => {
      active = false;
    };
  }, [address]);

  return (
    <div
      style={{
        border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
        borderRadius: 20,
        background: isLight ? "#ffffff" : "#121621",
        padding: 16,
      }}
    >
      <h2 style={{ marginTop: 0, color: isLight ? "#10131a" : "#ffffff" }}>
        {t.nfts}
      </h2>

      {loading ? (
        <div style={{ color: isLight ? "#5b6578" : "#97a0b3" }}>{t.loading}</div>
      ) : nfts.length === 0 ? (
        <div style={{ color: isLight ? "#5b6578" : "#97a0b3" }}>{t.empty}</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          {nfts.map((nft, index) => (
            <div
              key={`${nft.contractAddress}-${nft.tokenID}-${index}`}
              style={{
                border: `1px solid ${isLight ? "#e6edf7" : "#252b39"}`,
                borderRadius: 18,
                background: isLight ? "#f8fbff" : "#0f1522",
                padding: 14,
              }}
            >
              <div
                style={{
                  height: 120,
                  borderRadius: 14,
                  background: isLight ? "#edf3ff" : "#16213b",
                  display: "grid",
                  placeItems: "center",
                  color: "#3f7cff",
                  fontWeight: 900,
                  marginBottom: 12,
                  fontSize: 22,
                }}
              >
                NFT
              </div>

              <div
                style={{
                  fontWeight: 800,
                  color: isLight ? "#10131a" : "#ffffff",
                  fontSize: 16,
                }}
              >
                {nft.tokenName || "NFT"}
              </div>

              <div
                style={{
                  color: isLight ? "#5b6578" : "#97a0b3",
                  fontSize: 13,
                  marginTop: 6,
                }}
              >
                Token ID: {nft.tokenID}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      nfts: "NFTs",
      loading: "Loading NFTs...",
      empty: "No NFTs found.",
    },
    pt: {
      nfts: "NFTs",
      loading: "Carregando NFTs...",
      empty: "Nenhum NFT encontrado.",
    },
  };

  return map[lang] || map.en;
}
