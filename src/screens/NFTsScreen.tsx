import React, { useMemo } from "react";

type Props = {
  theme: "dark" | "light";
  lang: string;
  address: string;
};

type DemoNFT = {
  id: string;
  name: string;
  collection: string;
  image: string;
  chain: string;
};

const BASE = "/inri-wallet-stage/";

export default function NFTsScreen({ theme, lang, address }: Props) {
  const t = getText(lang);

  const items = useMemo<DemoNFT[]>(
    () => [
      {
        id: "1",
        name: "INRI Genesis #001",
        collection: "INRI Genesis",
        image: `${BASE}token-inri.png`,
        chain: "INRI",
      },
      {
        id: "2",
        name: "iUSD Pioneer #021",
        collection: "iUSD Pioneer",
        image: `${BASE}token-iusd.png`,
        chain: "INRI",
      },
      {
        id: "3",
        name: "Wrapped Power #007",
        collection: "wINRI Collection",
        image: `${BASE}token-winri.png`,
        chain: "INRI",
      },
      {
        id: "4",
        name: "Dinar Badge #004",
        collection: "DNR Badges",
        image: `${BASE}token-dnr.png`,
        chain: "INRI",
      },
    ],
    []
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={panel(theme)}>
        <div style={titleStyle(theme)}>{t.nftGallery}</div>
        <div style={subtitleStyle(theme)}>
          {address ? t.connectedGallery : t.connectWalletToView}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {items.map((item) => (
          <article
            key={item.id}
            style={{
              borderRadius: 24,
              overflow: "hidden",
              border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
              background: theme === "light" ? "rgba(255,255,255,.95)" : "rgba(18,22,33,.95)",
              boxShadow:
                theme === "light"
                  ? "0 12px 30px rgba(30,40,70,.06)"
                  : "0 12px 30px rgba(0,0,0,.22)",
            }}
          >
            <div
              style={{
                aspectRatio: "1 / 1",
                display: "grid",
                placeItems: "center",
                background:
                  theme === "light"
                    ? "linear-gradient(180deg,#f8fbff 0%, #eef4ff 100%)"
                    : "linear-gradient(180deg,#111a2c 0%, #0b1322 100%)",
              }}
            >
              <img
                src={item.image}
                alt={item.name}
                style={{
                  width: 110,
                  height: 110,
                  objectFit: "contain",
                  filter:
                    theme === "light"
                      ? "drop-shadow(0 14px 28px rgba(63,124,255,.16))"
                      : "drop-shadow(0 16px 30px rgba(63,124,255,.30))",
                }}
              />
            </div>

            <div style={{ padding: 16 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color: theme === "light" ? "#0f172a" : "#ffffff",
                }}
              >
                {item.name}
              </div>

              <div
                style={{
                  marginTop: 6,
                  color: theme === "light" ? "#64748b" : "#94a3b8",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {item.collection}
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <span style={badge(theme)}>{item.chain}</span>
                <span
                  style={{
                    color: theme === "light" ? "#64748b" : "#94a3b8",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  #{item.id}
                </span>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section style={panel(theme)}>
        <div style={titleStyle(theme)}>{t.nftNoteTitle}</div>
        <div style={subtitleStyle(theme)}>
          {t.nftNoteBody}
        </div>
      </section>
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
    lineHeight: 1.55,
  };
}

function badge(theme: "dark" | "light"): React.CSSProperties {
  return {
    padding: "7px 11px",
    borderRadius: 999,
    background: theme === "light" ? "#eef4ff" : "#12203e",
    color: "#3f7cff",
    fontWeight: 900,
    fontSize: 12,
    border: `1px solid ${theme === "light" ? "#cfe0ff" : "#23407d"}`,
  };
}

function getText(lang: string) {
  const map: Record<string, Record<string, string>> = {
    en: {
      nftGallery: "NFT Gallery",
      connectedGallery: "Premium NFT gallery view for your wallet",
      connectWalletToView: "Unlock your wallet to view your NFT gallery",
      nftNoteTitle: "NFT support",
      nftNoteBody:
        "This screen is ready for a future real NFT indexer. For now, it shows a polished gallery layout compatible with the wallet design.",
    },
    pt: {
      nftGallery: "Galeria NFT",
      connectedGallery: "Visual premium da galeria NFT da sua carteira",
      connectWalletToView: "Desbloqueie sua carteira para ver sua galeria NFT",
      nftNoteTitle: "Suporte a NFTs",
      nftNoteBody:
        "Esta tela está pronta para um indexador real de NFTs no futuro. Por enquanto, mostra uma galeria polida compatível com o design da wallet.",
    },
    es: {
      nftGallery: "Galería NFT",
      connectedGallery: "Vista premium de la galería NFT de tu wallet",
      connectWalletToView: "Desbloquea tu wallet para ver tu galería NFT",
      nftNoteTitle: "Soporte NFT",
      nftNoteBody:
        "Esta pantalla está lista para un indexador NFT real en el futuro. Por ahora muestra una galería pulida compatible con el diseño de la wallet.",
    },
    fr: {
      nftGallery: "Galerie NFT",
      connectedGallery: "Vue premium de la galerie NFT de votre wallet",
      connectWalletToView: "Déverrouillez votre wallet pour voir votre galerie NFT",
      nftNoteTitle: "Support NFT",
      nftNoteBody:
        "Cet écran est prêt pour un futur indexeur NFT réel. Pour l'instant, il affiche une galerie soignée compatible avec le design du wallet.",
    },
    de: {
      nftGallery: "NFT-Galerie",
      connectedGallery: "Premium-NFT-Galerieansicht für deine Wallet",
      connectWalletToView: "Entsperre deine Wallet, um deine NFT-Galerie zu sehen",
      nftNoteTitle: "NFT-Unterstützung",
      nftNoteBody:
        "Dieser Bildschirm ist bereit für einen zukünftigen echten NFT-Indexer. Aktuell zeigt er eine saubere Galerie im Wallet-Design.",
    },
    ja: {
      nftGallery: "NFTギャラリー",
      connectedGallery: "ウォレット向けのプレミアムNFTギャラリー表示",
      connectWalletToView: "ウォレットをアンロックしてNFTギャラリーを表示してください",
      nftNoteTitle: "NFTサポート",
      nftNoteBody:
        "この画面は将来の実NFTインデクサーに対応できる構成です。現時点ではウォレットデザインに合う洗練されたギャラリーを表示します。",
    },
    zh: {
      nftGallery: "NFT 画廊",
      connectedGallery: "你的钱包高级 NFT 画廊视图",
      connectWalletToView: "解锁钱包以查看你的 NFT 画廊",
      nftNoteTitle: "NFT 支持",
      nftNoteBody:
        "该页面已为未来真实 NFT 索引器做好准备。目前它展示的是与钱包设计匹配的精致画廊布局。",
    },
  };

  return map[lang] || map.en;
}
