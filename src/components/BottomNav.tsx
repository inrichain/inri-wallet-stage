import React from "react";

export default function BottomNav({
  tab,
  setTab,
}: {
  tab: string;
  setTab: (value: any) => void;
}) {
  const items = [
    { id: "dashboard", label: "Home" },
    { id: "tokens", label: "Tokens" },
    { id: "send", label: "Send" },
    { id: "receive", label: "Receive" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        padding: "10px 12px 14px",
        background: "rgba(7,10,18,.92)",
        backdropFilter: "blur(14px)",
        borderTop: "1px solid rgba(79,116,201,.18)",
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 8,
        }}
      >
        {items.map((item) => {
          const active = tab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                height: 48,
                borderRadius: 16,
                border: active
                  ? "1px solid rgba(77,126,242,1)"
                  : "1px solid rgba(79,116,201,.18)",
                background: active
                  ? "linear-gradient(180deg,#3478ff 0%, #245ef5 100%)"
                  : "linear-gradient(180deg, rgba(13,20,35,.96) 0%, rgba(8,14,26,.98) 100%)",
                color: active ? "#ffffff" : "#93a7cd",
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
                boxShadow: active ? "0 10px 24px rgba(52,120,255,.22)" : "none",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
