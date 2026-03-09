import React from "react";
import { getActiveNetwork } from "../lib/networks";

const BASE = "/inri-wallet-stage/";

export default function NFTsScreen({
  lang = "en",
}: {
  lang?: string;
}) {
  const network = getActiveNetwork();
  const t = getText(lang);

  const items = [
    {
      id: "001",
      name: "INRI Genesis",
      image: `${BASE}token-inri.png`,
      collection: "INRI Collection",
    },
    {
      id: "021",
      name: "iUSD Pioneer",
      image: `${BASE}token-iusd.png`,
      collection: "iUSD Collection",
    },
    {
      id: "004",
      name: "DNR Badge",
      image: `${BASE}token-dnr.png`,
      collection: "DNR Collection",
    },
  ];

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={panel()}>
        <div style={title()}>{t.title}</div>
        <div style={subtitle()}>{network.name}</div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {items.map((item) => (
          <div key={item.id} style={card()}>
            <div style={imageBox()}>
              <img
                src={item.image}
                alt={item.name}
                style={{
                  width: 110,
                  height: 110,
                  objectFit: "contain",
                  filter: "drop-shadow(0 14px 30px rgba(63,124,255,.28))",
                }}
              />
            </div>

            <div style={{ padding: 16 }}>
              <div style={cardTitle()}>{item.name}</div>
              <div style={cardSub()}>{item.collection}</div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={badge()}>{network.symbol}</span>
                <span style={smallMuted()}>#{item.id}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: { title: "NFT Gallery" },
    pt: { title: "Galeria NFT" },
    es: { title: "Galería NFT" },
    fr: { title: "Galerie NFT" },
    de: { title: "NFT-Galerie" },
    ja: { title: "NFTギャラリー" },
    zh: { title: "NFT 画廊" },
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
function card(): React.CSSProperties {
  return {
    borderRadius: 24,
    overflow: "hidden",
    background:
      "linear-gradient(180deg, rgba(13,20,35,.96) 0%, rgba(8,14,26,.98) 100%)",
    border: "1px solid rgba(79,116,201,.18)",
    boxShadow: "0 16px 36px rgba(0,0,0,.24)",
  };
}
function imageBox(): React.CSSProperties {
  return {
    aspectRatio: "1 / 1",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg,#13213c 0%, #0d1629 100%)",
  };
}
function cardTitle(): React.CSSProperties {
  return { color: "#fff", fontSize: 16, fontWeight: 900 };
}
function cardSub(): React.CSSProperties {
  return { color: "#8ea1c7", fontSize: 13, fontWeight: 700, marginTop: 6 };
}
function badge(): React.CSSProperties {
  return {
    padding: "7px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    color: "#4fa0ff",
    background: "rgba(27,55,104,.44)",
    border: "1px solid rgba(79,160,255,.24)",
  };
}
function smallMuted(): React.CSSProperties {
  return { color: "#8094bb", fontSize: 12, fontWeight: 800 };
}
