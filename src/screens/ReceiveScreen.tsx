import React from "react";

export default function ReceiveScreen() {
  return (
    <div style={{border:"1px solid #252b39", borderRadius:20, background:"#121621", padding:16}}>
      <h2 style={{marginTop:0}}>Receive</h2>
      <div
        style={{
          width:220,
          height:220,
          borderRadius:20,
          background:"#fff",
          margin:"0 auto",
          display:"grid",
          placeItems:"center",
          color:"#111",
          fontWeight:800
        }}
      >
        QR
      </div>
      <p style={{textAlign:"center", color:"#97a0b3"}}>Your wallet QR will appear here</p>
    </div>
  );
}
