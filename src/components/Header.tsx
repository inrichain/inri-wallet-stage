import React from "react";

export default function Header() {
  return (
    <header
      style={{
        position:"sticky",
        top:0,
        zIndex:10,
        backdropFilter:"blur(10px)",
        background:"rgba(11,11,15,.82)",
        borderBottom:"1px solid #252b39"
      }}
    >
      <div
        style={{
          maxWidth:900,
          margin:"0 auto",
          padding:"16px",
          display:"flex",
          alignItems:"center",
          justifyContent:"space-between"
        }}
      >
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <div
            style={{
              width:40,
              height:40,
              borderRadius:14,
              background:"linear-gradient(180deg,#10203f,#0a1224)",
              border:"1px solid #2a3350",
              display:"grid",
              placeItems:"center",
              fontWeight:800
            }}
          >
            I
          </div>
          <div>
            <div style={{fontWeight:800, fontSize:18}}>INRI Wallet</div>
            <div style={{fontSize:12, color:"#97a0b3"}}>Stage base project</div>
          </div>
        </div>

        <div
          style={{
            padding:"8px 12px",
            borderRadius:999,
            border:"1px solid rgba(20,199,132,.45)",
            background:"rgba(20,199,132,.10)",
            color:"#8cf0c3",
            fontWeight:800,
            fontSize:12
          }}
        >
          Online • 3777
        </div>
      </div>
    </header>
  );
}
