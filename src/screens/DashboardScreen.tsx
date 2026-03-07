import React from "react";

export default function DashboardScreen({ setTab }: { setTab: (tab: any) => void }) {
  const card = {
    border: "1px solid #252b39",
    borderRadius: 20,
    background: "#121621",
    padding: 16
  } as React.CSSProperties;

  return (
    <div style={{display:"grid", gap:16}}>
      <section style={card}>
        <div style={{color:"#97a0b3"}}>Total balance</div>
        <div style={{fontSize:34, fontWeight:900, marginTop:8}}>0.000000 INRI</div>
      </section>

      <section style={{display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12}}>
        {[
          ["send", "Send"],
          ["receive", "Receive"],
          ["swap", "Swap"],
          ["bridge", "Bridge"]
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              ...card,
              cursor:"pointer",
              textAlign:"left",
              color:"#fff"
            }}
          >
            <div style={{fontWeight:800, fontSize:18}}>{label}</div>
            <div style={{color:"#97a0b3", marginTop:6}}>Open {label} screen</div>
          </button>
        ))}
      </section>
    </div>
  );
}
