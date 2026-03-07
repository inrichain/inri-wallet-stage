import React from "react";

export default function SendScreen() {
  const field = {
    width:"100%",
    background:"#0d111b",
    border:"1px solid #252b39",
    borderRadius:14,
    padding:"12px 14px",
    color:"#fff"
  } as React.CSSProperties;

  return (
    <div style={{border:"1px solid #252b39", borderRadius:20, background:"#121621", padding:16}}>
      <h2 style={{marginTop:0}}>Send</h2>
      <div style={{display:"grid", gap:12}}>
        <input style={field} placeholder="Recipient address" />
        <input style={field} placeholder="Amount" />
        <button style={{height:48, borderRadius:14, border:"1px solid #4d7ef2", background:"#3f7cff", color:"#fff", fontWeight:800}}>
          Send
        </button>
      </div>
    </div>
  );
}
