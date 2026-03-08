import React, { useMemo } from "react";

const BASE = "/inri-wallet-stage/";
const DEFAULT_AVATAR = BASE + "avatar.png";

export default function Header({
  walletName,
  theme = "dark",
}: {
  walletName: string;
  theme?: "dark" | "light";
}) {
  const isLight = theme === "light";
  const avatar = localStorage.getItem("wallet_avatar") || DEFAULT_AVATAR;

  const subtitle = useMemo(() => {
    return isLight ? "INRI Wallet • Secure mode" : "INRI Wallet • Mainnet ready";
  }, [isLight]);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        padding: "14px 0 10px",
        backdropFilter: "blur(20px)",
        background: isLight
          ? "linear-gradient(180deg, rgba(237,243,255,.88) 0%, rgba(237,243,255,.68) 100%)"
          : "linear-gradient(180deg, rgba(5,7,13,.84) 0%, rgba(5,7,13,.58) 100%)",
        borderBottom: `1px solid ${isLight ? "rgba(155,170,200,.22)" : "rgba(122,137,170,.12)"}`,
      }}
    >
      <div className="inri-app-shell">
        <div
          className="inri-glass"
          style={{
            borderRadius: 28,
            padding: "14px 16px",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                display: "grid",
                placeItems: "center",
                background: isLight
                  ? "linear-gradient(180deg,#ffffff 0%, #edf3ff 100%)"
                  : "linear-gradient(180deg,rgba(79,124,255,.18) 0%, rgba(122,92,255,.18) 100%)",
                border: `1px solid ${isLight ? "rgba(79,124,255,.16)" : "rgba(117,139,255,.16)"}`,
                boxShadow: isLight
                  ? "0 10px 26px rgba(79,124,255,.12)"
                  : "0 14px 30px rgba(79,124,255,.16)",
                flexShrink: 0,
              }}
            >
              <img
                src={BASE + "token-inri.png"}
                alt="INRI"
                style={{ width: 34, height: 34, objectFit: "contain" }}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: isLight ? "#0f172a" : "#ffffff",
                  lineHeight: 1.1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {walletName}
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  color: isLight ? "#64748b" : "#95a2bd",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {subtitle}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              justifySelf: "end",
            }}
          >
            <div
              className="inri-chip"
              style={{
                color: "#16c784",
                fontWeight: 800,
                fontSize: 13,
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: "#16c784",
                  boxShadow: "0 0 0 6px rgba(22,199,132,.12)",
                }}
              />
              Chain 3777
            </div>

            <div
              style={{
                width: 46,
                height: 46,
                padding: 2,
                borderRadius: 16,
                background: isLight
                  ? "linear-gradient(180deg,#dbeafe 0%,#ffffff 100%)"
                  : "linear-gradient(180deg,rgba(79,124,255,.55) 0%, rgba(122,92,255,.25) 100%)",
                boxShadow: isLight
                  ? "0 10px 24px rgba(79,124,255,.12)"
                  : "0 10px 22px rgba(79,124,255,.18)",
                flexShrink: 0,
              }}
            >
              <img
                src={avatar}
                alt="Avatar"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 14,
                  objectFit: "cover",
                  display: "block",
                  background: isLight ? "#f8fafc" : "#0b1020",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
