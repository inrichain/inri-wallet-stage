import React, { useMemo, useState } from "react";

const BRIDGE_CONFIGURED = false;

export default function BridgeScreen({ theme = "dark", lang = "en", address }: { theme?: "dark" | "light"; lang?: string; address: string; }) {
  const isLight = theme === "light";
  const t = getText(lang);
  const [direction, setDirection] = useState<"polygon_to_inri" | "inri_to_polygon">("polygon_to_inri");
  const [amount, setAmount] = useState("");

  const fromNetwork = direction === "polygon_to_inri" ? "Polygon" : "INRI";
  const toNetwork = direction === "polygon_to_inri" ? "INRI" : "Polygon";
  const fromToken = direction === "polygon_to_inri" ? "USDT" : "iUSD";
  const toToken = direction === "polygon_to_inri" ? "iUSD" : "USDT";
  const estimated = useMemo(() => {
    const n = Number(amount || "0");
    if (!Number.isFinite(n) || n <= 0) return "0.000000";
    return (n * 0.998).toFixed(6);
  }, [amount]);

  return (
    <div style={wrap(isLight)}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={title(isLight)}>{t.bridge}</h2>
        <div style={chip(isLight)}>{fromToken} → {toToken}</div>
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
          <div>
            <div style={routeLabel(isLight)}>{t.fromNetwork}</div>
            <strong style={{ color: isLight ? "#10131a" : "#fff" }}>{fromNetwork}</strong>
            <div style={routeSub(isLight)}>{fromToken}</div>
          </div>
          <div style={{ fontSize: 28, color: "#3f7cff", fontWeight: 900 }}>→</div>
          <div style={{ textAlign: "right" }}>
            <div style={routeLabel(isLight)}>{t.toNetwork}</div>
            <strong style={{ color: isLight ? "#10131a" : "#fff" }}>{toNetwork}</strong>
            <div style={routeSub(isLight)}>{toToken}</div>
          </div>
        </div>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={inputStyle(isLight)} />
      </div>

      <div style={{ ...panel(isLight), marginTop: 12 }}>
        <div style={label(isLight)}>{t.summary}</div>
        <div style={estimatedStyle(isLight)}>{estimated} {toToken}</div>
        <div style={miniRow(isLight)}><span>{t.route}</span><strong>{fromNetwork} → {toNetwork}</strong></div>
        <div style={miniRow(isLight)}><span>{t.assetFlow}</span><strong>{fromToken} → {toToken}</strong></div>
        <div style={miniRow(isLight)}><span>{t.destination}</span><strong>{address.slice(0, 6)}...{address.slice(-4)}</strong></div>
        <div style={miniRow(isLight)}><span>{t.fee}</span><strong>0.20%</strong></div>
        <div style={miniRow(isLight)}><span>{t.status}</span><strong>{BRIDGE_CONFIGURED ? t.live : t.awaitingContracts}</strong></div>
      </div>

      <div style={foot(isLight)}>{t.previewFee}</div>
      <button style={{ ...mainButtonStyle(), opacity: BRIDGE_CONFIGURED ? 1 : 0.7 }} disabled={!BRIDGE_CONFIGURED}>{BRIDGE_CONFIGURED ? t.bridgeNow : t.waitingConfig}</button>
    </div>
  );
}

function getText(lang: string) { const map: Record<string, any> = {
 en: { bridge:"Bridge", direction:"Direction", depositFlow:"Polygon USDT → INRI iUSD", withdrawFlow:"INRI iUSD → Polygon USDT", fromNetwork:"From network", toNetwork:"To network", summary:"Transfer summary", route:"Route", assetFlow:"Asset flow", destination:"Destination wallet", fee:"Bridge fee", status:"Status", live:"Live", awaitingContracts:"Awaiting contract integration", waitingConfig:"Bridge contracts not connected yet", bridgeNow:"Bridge now", bridgePending:"Bridge screen is ready for Polygon USDT ↔ INRI iUSD.", bridgeReady:"Bridge configured and ready.", previewFee:"This screen is already prepared for your real flow: USDT on Polygon and iUSD on INRI. We only need to connect the final contracts/API later." },
 pt: { bridge:"Bridge", direction:"Direção", depositFlow:"Polygon USDT → INRI iUSD", withdrawFlow:"INRI iUSD → Polygon USDT", fromNetwork:"Da rede", toNetwork:"Para a rede", summary:"Resumo da transferência", route:"Rota", assetFlow:"Fluxo do ativo", destination:"Carteira de destino", fee:"Taxa do bridge", status:"Status", live:"Ao vivo", awaitingContracts:"Aguardando integração dos contratos", waitingConfig:"Contratos do bridge ainda não conectados", bridgeNow:"Fazer bridge", bridgePending:"A tela do bridge já está pronta para Polygon USDT ↔ INRI iUSD.", bridgeReady:"Bridge configurado e pronto.", previewFee:"Esta tela já está preparada para seu fluxo real: USDT na Polygon e iUSD na INRI. Só falta ligar os contratos/API finais depois." },
 es: { bridge:"Bridge", direction:"Dirección", depositFlow:"Polygon USDT → INRI iUSD", withdrawFlow:"INRI iUSD → Polygon USDT", fromNetwork:"Desde red", toNetwork:"Hacia red", summary:"Resumen de transferencia", route:"Ruta", assetFlow:"Flujo del activo", destination:"Billetera destino", fee:"Tarifa del bridge", status:"Estado", live:"Activo", awaitingContracts:"Esperando integración de contratos", waitingConfig:"Los contratos del bridge aún no están conectados", bridgeNow:"Hacer bridge", bridgePending:"La pantalla del bridge ya está lista para Polygon USDT ↔ INRI iUSD.", bridgeReady:"Bridge configurado y listo.", previewFee:"Esta pantalla ya está preparada para tu flujo real: USDT en Polygon e iUSD en INRI. Solo falta conectar los contratos/API finales después." } }; return map[lang] || map.en; }
function wrap(isLight:boolean):React.CSSProperties{return{border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,borderRadius:20,background:isLight?"#ffffff":"#121621",padding:16}}
function title(isLight:boolean):React.CSSProperties{return{margin:"0",color:isLight?"#10131a":"#ffffff"}}
function panel(isLight:boolean):React.CSSProperties{return{border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,borderRadius:20,background:isLight?"#fbfcff":"#0f1522",padding:14}}
function banner(isLight:boolean):React.CSSProperties{return{marginBottom:12,padding:"12px 14px",borderRadius:14,background:isLight?"#eef4ff":"#16213b",color:"#3f7cff",fontWeight:700}}
function chip(isLight:boolean):React.CSSProperties{return{padding:"8px 12px",borderRadius:999,background:isLight?"#eef4ff":"#16213b",color:"#3f7cff",fontWeight:800,fontSize:13}}
function label(isLight:boolean):React.CSSProperties{return{marginBottom:10,fontSize:13,color:isLight?"#5b6578":"#97a0b3"}}
const doubleGrid:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12};
function modeButton(isLight:boolean,active:boolean):React.CSSProperties{return{padding:"14px 16px",borderRadius:14,border:`1px solid ${active?"#3f7cff":isLight?"#dbe2f0":"#252b39"}`,background:active?"rgba(63,124,255,.12)":isLight?"#fff":"#12192a",color:active?"#3f7cff":isLight?"#10131a":"#fff",fontWeight:800,cursor:"pointer",textAlign:"left"}}
function routeCard(isLight:boolean):React.CSSProperties{return{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:16,background:isLight?"#fff":"#12192a",border:`1px solid ${isLight?"#e8edf6":"#1f2633"}`,flexWrap:"wrap"}}
function routeLabel(isLight:boolean):React.CSSProperties{return{fontSize:12,color:isLight?"#5b6578":"#97a0b3",marginBottom:6}}
function routeSub(isLight:boolean):React.CSSProperties{return{fontSize:13,color:isLight?"#334155":"#cfd6e4",marginTop:6}}
function inputStyle(isLight:boolean):React.CSSProperties{return{width:"100%",marginTop:12,padding:12,borderRadius:12,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#f6f8fc":"#0d111b",color:isLight?"#10131a":"#ffffff",outline:"none",boxSizing:"border-box"}}
function estimatedStyle(isLight:boolean):React.CSSProperties{return{fontWeight:900,fontSize:18,color:isLight?"#10131a":"#fff"}}
function miniRow(isLight:boolean):React.CSSProperties{return{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderTop:`1px solid ${isLight?"#edf1f7":"#1d2431"}`,color:isLight?"#334155":"#cfd6e4"}}
function foot(isLight:boolean):React.CSSProperties{return{marginTop:12,color:isLight?"#5b6578":"#97a0b3",fontSize:13}}
function mainButtonStyle():React.CSSProperties{return{width:"100%",marginTop:14,padding:"14px 16px",borderRadius:14,border:"none",background:"#3f7cff",color:"#fff",cursor:"pointer",fontWeight:800,fontSize:16}}
