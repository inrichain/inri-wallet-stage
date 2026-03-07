import React, { useEffect, useState } from "react";

const BASE = "/inri-wallet-stage/";
const AVATAR_KEY = "wallet_avatar";

export default function Header() {
  const [avatar, setAvatar] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(AVATAR_KEY);
    if (saved) setAvatar(saved);
  }, []);

  function handleAvatarChange(file: File | null) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setAvatar(result);
      localStorage.setItem(AVATAR_KEY, result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        backdropFilter: "blur(10px)",
        background: "rgba(11,11,15,.82)",
        borderBottom: "1px solid #252b39",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              background: "linear-gradient(180deg,#10203f,#0a1224)",
              border: "1px solid #2a3350",
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
            }}
          >
            <img
              src={BASE + "token-inri.png"}
              alt="INRI"
              style={{ width: 24, height: 24, objectFit: "contain" }}
            />
          </div>

          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>INRI Wallet</div>
            <div style={{ fontSize: 12, color: "#97a0b3" }}>Stage base project</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid rgba(20,199,132,.45)",
              background: "rgba(20,199,132,.10)",
              color: "#8cf0c3",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            Online • 3777
          </div>

          <label
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              overflow: "hidden",
              border: "1px solid #2a3350",
              background: "#121621",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {avatar ? (
              <img
                src={avatar}
                alt="avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ color: "#fff", fontWeight: 800 }}>U</span>
            )}

            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleAvatarChange(e.target.files?.[0] || null)}
            />
          </label>
        </div>
      </div>
    </header>
  );
}
