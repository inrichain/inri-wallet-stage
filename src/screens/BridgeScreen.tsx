import React, { useMemo, useState } from "react";

const BRIDGE_CONFIGURED = false;

const TOKENS = {
  usdt: { symbol: "USDT", subtitle: "Polygon deposit asset", logo: "/token-placeholder.svg", network: "Polygon", networkLogo: "/network-polygon.svg" },
  iusd: { symbol: "iUSD", subtitle: "INRI minted asset", logo: "/token-iusd.png", network: "INRI", networkLogo: "/network-inri.svg" },
};

export default function BridgeScreen({ theme = "dark", lang = "en", address }: { theme?: "dark" | "light"; lang?: string; address: string; }) {
  const isLight = theme === "light";
  const t = getText(lang);
  const [direction, setDirection] = useState<"polygon_to_inri" | "inri_to_polygon">("polygon_to_inri");
  const [amount, setAmount] = useState("");

  const fromToken = direction === "polygon_to_inri" ? TOKENS.usdt : TOKENS.iusd;
  const toToken = direction === "polygon_to_inri" ? TOKENS.iusd : TOKENS.usdt;
  const estimated = useMemo(() => {
    const n = Number(amount || "0");
    if (!Number.isFinite(n) || n <= 0) return "0.000000";
    return (n * 0.998).toFixed(6);
  }, [amount]);

  return (
    <div style={wrap(isLight)}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={title(isLight)}>{t.bridge}</h2>
        <div style={chip(isLight)}>{fromToken.symbol} → {toToken.symbol}</div>
      </div>
      <div style={banner(isLight)}>{BRIDGE_CONFIGURED ? t.bridgeReady : t.bridgePending}</div>

      <div style={panel(isLight)}>
        <div style={label(isLight)}>{t.direction}</div>
        <div style={doubleGrid}>
          <button onClick={() => setDirection("polygon_to_inri")} style={modeButton(isLight, direction === "polygon_to_inri")}>{t.depositFlow}</button>
          <button onClick={() => setDirection("inri_to_polygon")} style={modeButton(isLight, direction === "inri_to_polygon")}>{t.withdrawFlow}</button>
        </div>
      </div>

      <div style={{ ...panel(isLight), marginTop: 12 }}>
        <div style={label(isLight)}>{t.route}</div>
        <div style={routeCard(isLight)}>
          <BridgeAssetCard asset={fromToken} isLight={isLight} align="left" />
          <div style={{ fontSize: 30, color: "#3f7cff", fontWeight: 900 }}>→</div>
          <BridgeAssetCard asset={toToken} isLight={isLight} align="right" />
        </div>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={inputStyle(isLight)} />
      </div>

      <div style={{ ...panel(isLight), marginTop: 12 }}>
        <div style={label(isLight)}>{t.summary}</div>
        <div style={estimatedStyle(isLight)}>{estimated} {toToken.symbol}</div>
        <div style={miniRow(isLight)}><span>{t.route}</span><strong>{fromToken.network} → {toToken.network}</strong></div>
        <div style={miniRow(isLight)}><span>{t.assetFlow}</span><strong>{fromToken.symbol} → {toToken.symbol}</strong></div>
        <div style={miniRow(isLight)}><span>{t.destination}</span><strong>{address.slice(0, 6)}...{address.slice(-4)}</strong></div>
        <div style={miniRow(isLight)}><span>{t.fee}</span><strong>0.20%</strong></div>
        <div style={miniRow(isLight)}><span>{t.status}</span><strong>{BRIDGE_CONFIGURED ? t.live : t.awaitingContracts}</strong></div>
      </div>

      <div style={{ ...panel(isLight), marginTop: 12 }}>
        <div style={label(isLight)}>{t.logoSlots}</div>
        <div style={slotsGrid}>
          <LogoSlot title="Polygon / USDT" subtitle={t.slotHint} isLight={isLight} />
          <LogoSlot title="INRI / iUSD" subtitle={t.slotReady} isLight={isLight} image="/token-iusd.png" />
        </div>
      </div>

      <div style={foot(isLight)}>{t.previewFee}</div>
      <button style={{ ...mainButtonStyle(), opacity: BRIDGE_CONFIGURED ? 1 : 0.7 }} disabled={!BRIDGE_CONFIGURED}>{BRIDGE_CONFIGURED ? t.bridgeNow : t.waitingConfig}</button>
    </div>
  );
}

function BridgeAssetCard({ asset, isLight, align }: { asset: any; isLight: boolean; align: "left" | "right" }) {
  return (
    <div style={{ textAlign: align, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: align === "left" ? "flex-start" : "flex-end", gap: 10 }}>
        {align === "right" ? null : <img src={asset.logo} alt={asset.symbol} style={tokenLogo} />}
        <div>
          <div style={{ color: isLight ? "#10131a" : "#fff", fontWeight: 900 }}>{asset.symbol}</div>
          <div style={routeSub(isLight)}>{asset.subtitle}</div>
        </div>
        {align === "right" ? <img src={asset.logo} alt={asset.symbol} style={tokenLogo} /> : null}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: align === "left" ? "flex-start" : "flex-end", gap: 8, marginTop: 10 }}>
        <img src={asset.networkLogo} alt={asset.network} style={{ width: 18, height: 18, borderRadius: 9 }} />
        <div style={routeLabel(isLight)}>{asset.network}</div>
      </div>
    </div>
  );
}

function LogoSlot({ title, subtitle, isLight, image }: { title: string; subtitle: string; isLight: boolean; image?: string }) {
  return (
    <div style={{ border: `1px dashed ${isLight ? "#cbd5e1" : "#334155"}`, borderRadius: 16, padding: 14, background: isLight ? "#fff" : "#12192a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src={image || "/token-placeholder.svg"} alt={title} style={{ width: 42, height: 42, borderRadius: 14, objectFit: "cover" }} />
        <div>
          <div style={{ color: isLight ? "#10131a" : "#fff", fontWeight: 800 }}>{title}</div>
          <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 12 }}>{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function getText(lang: string) { const map: Record<string, any> = {
 en: { bridge:"Bridge", direction:"Direction", depositFlow:"Polygon USDT → INRI iUSD", withdrawFlow:"INRI iUSD → Polygon USDT", summary:"Transfer summary", route:"Route", assetFlow:"Asset flow", destination:"Destination wallet", fee:"Bridge fee", status:"Status", live:"Live", awaitingContracts:"Awaiting contract integration", waitingConfig:"Bridge contracts not connected yet", bridgeNow:"Bridge now", bridgePending:"Professional bridge screen ready for Polygon USDT ↔ INRI iUSD.", bridgeReady:"Bridge configured and ready.", previewFee:"This bridge layout is ready for your real flow. You can replace placeholder PNGs later and connect the final contracts/API after that.", logoSlots:"Logo slots", slotHint:"Placeholder ready for your final PNG", slotReady:"Current iUSD PNG already connected" },
 pt: { bridge:"Bridge", direction:"Direção", depositFlow:"Polygon USDT → INRI iUSD", withdrawFlow:"INRI iUSD → Polygon USDT", summary:"Resumo da transferência", route:"Rota", assetFlow:"Fluxo do ativo", destination:"Carteira de destino", fee:"Taxa do bridge", status:"Status", live:"Ao vivo", awaitingContracts:"Aguardando integração dos contratos", waitingConfig:"Contratos do bridge ainda não conectados", bridgeNow:"Fazer bridge", bridgePending:"Tela profissional do bridge pronta para Polygon USDT ↔ INRI iUSD.", bridgeReady:"Bridge configurado e pronto.", previewFee:"Este layout do bridge está pronto para seu fluxo real. Você pode substituir os PNGs temporários depois e ligar os contratos/API finais em seguida.", logoSlots:"Espaços para logos", slotHint:"Placeholder pronto para seu PNG final", slotReady:"PNG atual do iUSD já conectado" },
 es: { bridge:"Bridge", direction:"Dirección", depositFlow:"Polygon USDT → INRI iUSD", withdrawFlow:"INRI iUSD → Polygon USDT", summary:"Resumen de transferencia", route:"Ruta", assetFlow:"Flujo del activo", destination:"Billetera destino", fee:"Tarifa del bridge", status:"Estado", live:"Activo", awaitingContracts:"Esperando integración de contratos", waitingConfig:"Los contratos del bridge aún no están conectados", bridgeNow:"Hacer bridge", bridgePending:"Pantalla profesional del bridge lista para Polygon USDT ↔ INRI iUSD.", bridgeReady:"Bridge configurado y listo.", previewFee:"Este diseño del bridge ya está listo para tu flujo real. Puedes reemplazar los PNG temporales después y conectar los contratos/API finales luego.", logoSlots:"Espacios para logos", slotHint:"Placeholder listo para tu PNG final", slotReady:"PNG actual de iUSD ya conectado" } }; return map[lang] || map.en; }
function wrap(isLight:boolean):React.CSSProperties{return{border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,borderRadius:20,background:isLight?"#ffffff":"#121621",padding:16}}
function title(isLight:boolean):React.CSSProperties{return{margin:"0",color:isLight?"#10131a":"#ffffff"}}
function panel(isLight:boolean):React.CSSProperties{return{border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,borderRadius:20,background:isLight?"#fbfcff":"#0f1522",padding:14}}
function banner(isLight:boolean):React.CSSProperties{return{marginBottom:12,padding:"12px 14px",borderRadius:14,background:isLight?"#eef4ff":"#16213b",color:"#3f7cff",fontWeight:700}}
function chip(isLight:boolean):React.CSSProperties{return{padding:"8px 12px",borderRadius:999,background:isLight?"#eef4ff":"#16213b",color:"#3f7cff",fontWeight:800,fontSize:13}}
function label(isLight:boolean):React.CSSProperties{return{marginBottom:10,fontSize:13,color:isLight?"#5b6578":"#97a0b3"}}
const doubleGrid:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12};
function routeCard(isLight:boolean):React.CSSProperties{return{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:16,padding:"16px",borderRadius:18,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#fff":"#12192a"}}
function routeLabel(isLight:boolean):React.CSSProperties{return{fontSize:12,color:isLight?"#64748b":"#94a3b8",fontWeight:700}}
function routeSub(isLight:boolean):React.CSSProperties{return{fontSize:12,color:isLight?"#5b6578":"#97a0b3"}}
const tokenLogo:React.CSSProperties={width:42,height:42,borderRadius:14,objectFit:"cover",flexShrink:0};
function inputStyle(isLight:boolean):React.CSSProperties{return{width:"100%",marginTop:14,padding:"14px 16px",borderRadius:14,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#fff":"#0b1120",color:isLight?"#10131a":"#fff",fontSize:18,fontWeight:800,boxSizing:"border-box",outline:"none"}}
function estimatedStyle(isLight:boolean):React.CSSProperties{return{marginBottom:12,padding:"14px 16px",borderRadius:14,background:isLight?"#fff":"#0b1120",border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,color:isLight?"#10131a":"#fff",fontSize:22,fontWeight:900}}
function miniRow(isLight:boolean):React.CSSProperties{return{display:"flex",justifyContent:"space-between",gap:12,marginTop:10,color:isLight?"#5b6578":"#97a0b3",fontSize:13,flexWrap:"wrap"}}
function foot(isLight:boolean):React.CSSProperties{return{marginTop:12,marginBottom:12,fontSize:13,lineHeight:1.6,color:isLight?"#5b6578":"#97a0b3"}}
function mainButtonStyle():React.CSSProperties{return{width:"100%",padding:"14px 18px",borderRadius:14,border:"none",background:"#3f7cff",color:"#fff",fontWeight:900,fontSize:15,cursor:"pointer"}}
function modeButton(isLight:boolean,active:boolean):React.CSSProperties{return{padding:"13px 14px",borderRadius:14,border:active?"1px solid #4d7ef2":`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:active?"#3f7cff":isLight?"#ffffff":"#12192a",color:active?"#ffffff":isLight?"#10131a":"#fff",fontWeight:800,cursor:"pointer"}}
const slotsGrid:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12};
