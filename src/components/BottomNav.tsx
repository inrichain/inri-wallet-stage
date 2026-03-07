import React from "react";
import type { Tab } from "./WalletShell";

export default function BottomNav({
  tab,
  setTab
}: {
  tab: Tab;
  setTab: (tab: Tab) => void;
}) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Home" },
    { id: "send", label: "Send" },
    { id: "receive", label: "Receive" },
    { id: "tokens", label: "Tokens" },
    { id: "settings", label: "Settings" }
  ];

  return (
    <nav
      style={{
        position:"fixed",
        left:0,
        right:0,
        bottom:0,
        borderTop:"1px solid #252b39",
        background:"rgba(10,10,14,.96)",
        padding:"10px 12px 18px"
      }}
    >
      <div
        style={{
          maxWidth:900,
          margin:"0 auto",
          display:"grid",
          gridTemplateColumns:"repeat(5, 1fr)",
          gap:8
        }}
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{
              height:48,
              borderRadius:14,
              border:`1px solid ${tab === item.id ? "#355ea8" : "#252b39"}`,
              background: tab === item.id ? "#1b2741" : "#141927",
              color:"#fff",
              cursor:"pointer"
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
