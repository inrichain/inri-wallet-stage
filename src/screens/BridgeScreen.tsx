import React, { useEffect, useMemo, useState } from "react";
import { DEFAULT_TOKENS, loadAllBalances } from "../lib/inri";

const BRIDGE_CONFIGURED = false;

export default function BridgeScreen({ theme = "dark", lang = "en", address }: { theme?: "dark" | "light"; lang?: string; address: string; }) {
  const isLight = theme === "light";
  const t = getText(lang);
  const tokenOptions = DEFAULT_TOKENS.filter((x) => x.symbol === "iUSD" || x.symbol === "INRI");
  const [fromNetwork, setFromNetwork] = useState("Polygon");
  const [toNetwork, setToNetwork] = useState("INRI CHAIN");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("iUSD");
  const [balances, setBalances] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    async function load() { const next = await loadAllBalances(address, tokenOptions); if (!active) return; setBalances(next); }
    load();
    const timer = setInterval(load, 8000);
    return () => { active = false; clearInterval(timer); };
  }, [address]);

  function reverseNetworks() { setFromNetwork(toNetwork); setToNetwork(fromNetwork); }
  const estimated = useMemo(() => { const n = Number(amount || "0"); if (!Number.isFinite(n) || n <= 0) return "0.000000"; return (n * 0.998).toFixed(6); }, [amount]);
  const currentToken = tokenOptions.find((x) => x.symbol === token) || tokenOptions[0];

  return (
    <div style={wrap(isLight)}>
      <h2 style={title(isLight)}>{t.bridge}</h2>
      <div style={banner(isLight)}>{BRIDGE_CONFIGURED ? t.bridgeReady : t.bridgePending}</div>
      <div style={panel(isLight)}>
        <div style={label(isLight)}>{t.fromNetwork}</div>
        <select value={fromNetwork} onChange={(e) => setFromNetwork(e.target.value)} style={selectStyle(isLight)}><option value="Polygon">Polygon</option><option value="INRI CHAIN">INRI CHAIN</option></select>
      </div>
      <div style={{ display: "grid", placeItems: "center", margin: "12px 0" }}><button onClick={reverseNetworks} style={swapButtonStyle(isLight)} title={t.reverse}>⇅</button></div>
      <div style={panel(isLight)}>
        <div style={label(isLight)}>{t.toNetwork}</div>
        <select value={toNetwork} onChange={(e) => setToNetwork(e.target.value)} style={selectStyle(isLight)}><option value="INRI CHAIN">INRI CHAIN</option><option value="Polygon">Polygon</option></select>
      </div>
      <div style={{ ...panel(isLight), marginTop: 12 }}>
        <div style={label(isLight)}>{t.token}</div>
        <div style={row}><div style={tokenBox}><img src={currentToken.logo} alt={currentToken.symbol} style={logoStyle} /><div><strong style={{ color: isLight ? "#10131a" : "#fff" }}>{currentToken.symbol}</strong><div style={hint(isLight)}>{t.balance}: {balances[currentToken.symbol] || "0.000000"}</div></div></div>
        <select value={token} onChange={(e) => setToken(e.target.value)} style={selectStyle(isLight)}>{tokenOptions.map((item) => <option key={item.symbol} value={item.symbol}>{item.symbol}</option>)}</select></div>
      </div>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={inputStyle(isLight)} />
      <div style={{ ...panel(isLight), marginTop: 12 }}>
        <div style={label(isLight)}>{t.summary}</div>
        <div style={estimatedStyle(isLight)}>{estimated} {token}</div>
        <div style={miniRow(isLight)}><span>{t.route}</span><strong>{fromNetwork} → {toNetwork}</strong></div>
        <div style={miniRow(isLight)}><span>{t.fee}</span><strong>0.20%</strong></div>
        <div style={miniRow(isLight)}><span>{t.status}</span><strong>{BRIDGE_CONFIGURED ? t.live : t.awaitingContracts}</strong></div>
      </div>
      <div style={foot(isLight)}>{t.previewFee}</div>
      <button style={{ ...mainButtonStyle(), opacity: BRIDGE_CONFIGURED ? 1 : 0.7 }} disabled={!BRIDGE_CONFIGURED}>{BRIDGE_CONFIGURED ? t.bridgeNow : t.waitingConfig}</button>
    </div>
  );
}
function getText(lang: string) { const map: Record<string, any> = {
 en: { bridge:"Bridge", fromNetwork:"From network", toNetwork:"To network", token:"Token", balance:"Balance", summary:"Transfer summary", reverse:"Reverse networks", previewFee:"Professional bridge screen is ready. Lockbox/executor or API integration can be connected later.", route:"Route", fee:"Bridge fee", status:"Status", live:"Live", awaitingContracts:"Awaiting contracts", waitingConfig:"Bridge not configured yet", bridgeNow:"Bridge now", bridgePending:"Bridge UI ready. Add contracts later.", bridgeReady:"Bridge configured and ready." },
 pt: { bridge:"Bridge", fromNetwork:"Da rede", toNetwork:"Para a rede", token:"Token", balance:"Saldo", summary:"Resumo da transferência", reverse:"Inverter redes", previewFee:"A tela profissional do bridge já está pronta. A integração com lockbox/executor ou API pode ser conectada depois.", route:"Rota", fee:"Taxa do bridge", status:"Status", live:"Ao vivo", awaitingContracts:"Aguardando contratos", waitingConfig:"Bridge ainda não configurado", bridgeNow:"Fazer bridge", bridgePending:"Interface do bridge pronta. Adicione os contratos depois.", bridgeReady:"Bridge configurado e pronto." },
 es: { bridge:"Bridge", fromNetwork:"Desde red", toNetwork:"Hacia red", token:"Token", balance:"Saldo", summary:"Resumen de transferencia", reverse:"Invertir redes", previewFee:"La pantalla profesional de bridge ya está lista. La integración lockbox/executor o API se puede conectar después.", route:"Ruta", fee:"Tarifa del bridge", status:"Estado", live:"Activo", awaitingContracts:"Esperando contratos", waitingConfig:"Bridge aún no configurado", bridgeNow:"Hacer bridge", bridgePending:"Interfaz de bridge lista. Agrega los contratos después.", bridgeReady:"Bridge configurado y listo." } }; return map[lang] || map.en; }
function wrap(isLight:boolean):React.CSSProperties{return{border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,borderRadius:20,background:isLight?"#ffffff":"#121621",padding:16}}
function title(isLight:boolean):React.CSSProperties{return{marginTop:0,color:isLight?"#10131a":"#ffffff"}}
function panel(isLight:boolean):React.CSSProperties{return{border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,borderRadius:20,background:isLight?"#fbfcff":"#0f1522",padding:14}}
function banner(isLight:boolean):React.CSSProperties{return{marginBottom:12,padding:"12px 14px",borderRadius:14,background:isLight?"#eef4ff":"#16213b",color:"#3f7cff",fontWeight:700}}
function label(isLight:boolean):React.CSSProperties{return{marginBottom:10,fontSize:13,color:isLight?"#5b6578":"#97a0b3"}}
function hint(isLight:boolean):React.CSSProperties{return{fontSize:12,color:isLight?"#5b6578":"#97a0b3"}}
const row:React.CSSProperties={display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"};
const tokenBox:React.CSSProperties={display:"flex",alignItems:"center",gap:10};
const logoStyle:React.CSSProperties={width:34,height:34,borderRadius:17,objectFit:"cover"};
function selectStyle(isLight:boolean):React.CSSProperties{return{width:"100%",padding:"12px 14px",borderRadius:12,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#ffffff":"#12192a",color:isLight?"#10131a":"#ffffff",outline:"none"}}
function inputStyle(isLight:boolean):React.CSSProperties{return{width:"100%",marginTop:12,padding:12,borderRadius:12,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#f6f8fc":"#0d111b",color:isLight?"#10131a":"#ffffff",outline:"none",boxSizing:"border-box"}}
function estimatedStyle(isLight:boolean):React.CSSProperties{return{fontWeight:900,fontSize:18,color:isLight?"#10131a":"#fff"}}
function miniRow(isLight:boolean):React.CSSProperties{return{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderTop:`1px solid ${isLight?"#edf1f7":"#1d2431"}`,color:isLight?"#334155":"#cfd6e4"}}
function foot(isLight:boolean):React.CSSProperties{return{marginTop:12,color:isLight?"#5b6578":"#97a0b3",fontSize:13}}
function mainButtonStyle():React.CSSProperties{return{width:"100%",marginTop:14,padding:"14px 16px",borderRadius:14,border:"none",background:"#3f7cff",color:"#fff",cursor:"pointer",fontWeight:800,fontSize:16}}
function swapButtonStyle(isLight:boolean):React.CSSProperties{return{width:48,height:48,borderRadius:24,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#fff":"#12192a",color:isLight?"#10131a":"#fff",cursor:"pointer",fontSize:22}}
