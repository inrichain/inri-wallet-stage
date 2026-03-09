import React, { useEffect, useMemo, useState } from "react";
import { DEFAULT_TOKENS, loadAllBalances } from "../lib/inri";

const SWAP_CONFIGURED = false;

export default function SwapScreen({ theme = "dark", lang = "en", address }: { theme?: "dark" | "light"; lang?: string; address: string; }) {
  const isLight = theme === "light";
  const t = getText(lang);
  const tokenOptions = DEFAULT_TOKENS.filter((x) => ["INRI", "iUSD", "WINRI", "DNR"].includes(x.symbol));
  const [fromToken, setFromToken] = useState("INRI");
  const [toToken, setToToken] = useState("iUSD");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [balances, setBalances] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    async function load() {
      const next = await loadAllBalances(address, tokenOptions);
      if (!active) return;
      setBalances(next);
    }
    load();
    const timer = setInterval(load, 8000);
    return () => { active = false; clearInterval(timer); };
  }, [address]);

  function reverseTokens() { setFromToken(toToken); setToToken(fromToken); }
  const estimated = useMemo(() => { const n = Number(amount || "0"); if (!Number.isFinite(n) || n <= 0) return "0.000000"; return (n * 0.997).toFixed(6); }, [amount]);
  const minimumReceived = useMemo(() => { const e = Number(estimated); const s = Number(slippage || "0"); if (!Number.isFinite(e) || !Number.isFinite(s)) return "0.000000"; return (e * (1 - s / 100)).toFixed(6); }, [estimated, slippage]);
  const from = tokenOptions.find((t) => t.symbol === fromToken) || tokenOptions[0];
  const to = tokenOptions.find((t) => t.symbol === toToken) || tokenOptions[1];

  return (
    <div style={wrap(isLight)}>
      <h2 style={title(isLight)}>{t.swap}</h2>
      <div style={banner(isLight)}>{SWAP_CONFIGURED ? t.routerReady : t.routerPending}</div>
      <div style={panel(isLight)}>
        <div style={label(isLight)}>{t.from}</div>
        <div style={row}><div style={tokenBox}><img src={from.logo} alt={from.symbol} style={logoStyle} /><div><strong style={{ color: isLight ? "#10131a" : "#fff" }}>{from.symbol}</strong><div style={hint(isLight)}>{t.balance}: {balances[from.symbol] || "0.000000"}</div></div></div>
          <select value={fromToken} onChange={(e) => { const next = e.target.value; if (next === toToken) setToToken(fromToken); setFromToken(next); }} style={selectStyle(isLight)}>{tokenOptions.map((item) => <option key={item.symbol} value={item.symbol}>{item.symbol}</option>)}</select>
        </div>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={inputStyle(isLight)} />
      </div>
      <div style={{ display: "grid", placeItems: "center", margin: "12px 0" }}><button onClick={reverseTokens} style={swapButtonStyle(isLight)} title={t.reverse}>⇅</button></div>
      <div style={panel(isLight)}>
        <div style={label(isLight)}>{t.to}</div>
        <div style={row}><div style={tokenBox}><img src={to.logo} alt={to.symbol} style={logoStyle} /><div><strong style={{ color: isLight ? "#10131a" : "#fff" }}>{to.symbol}</strong><div style={hint(isLight)}>{t.balance}: {balances[to.symbol] || "0.000000"}</div></div></div>
          <select value={toToken} onChange={(e) => { const next = e.target.value; if (next === fromToken) setFromToken(toToken); setToToken(next); }} style={selectStyle(isLight)}>{tokenOptions.map((item) => <option key={item.symbol} value={item.symbol}>{item.symbol}</option>)}</select>
        </div>
        <div style={estimatedStyle(isLight)}>{estimated}</div>
      </div>
      <div style={{ ...panel(isLight), marginTop: 12 }}>
        <div style={label(isLight)}>{t.execution}</div>
        <div style={miniGrid}><div>{t.slippage}</div><input value={slippage} onChange={(e) => setSlippage(e.target.value)} style={smallInput(isLight)} /></div>
        <div style={miniRow(isLight)}><span>{t.minimumReceived}</span><strong>{minimumReceived} {to.symbol}</strong></div>
        <div style={miniRow(isLight)}><span>{t.priceImpact}</span><strong>0.30%</strong></div>
        <div style={miniRow(isLight)}><span>{t.route}</span><strong>{from.symbol} → {to.symbol}</strong></div>
      </div>
      <div style={foot(isLight)}>{t.previewFee}</div>
      <button style={{ ...mainButtonStyle(), opacity: SWAP_CONFIGURED ? 1 : 0.7 }} disabled={!SWAP_CONFIGURED}>{SWAP_CONFIGURED ? t.swapNow : t.waitingConfig}</button>
    </div>
  );
}
function getText(lang: string) { const map: Record<string, any> = {
 en: { swap:"Swap", from:"From", to:"To", balance:"Balance", reverse:"Reverse tokens", previewFee:"Professional swap screen is ready. Router, factory and liquidity contracts can be plugged in later.", execution:"Execution", slippage:"Slippage %", minimumReceived:"Minimum received", priceImpact:"Price impact", route:"Route", waitingConfig:"Router not configured yet", swapNow:"Swap now", routerPending:"Swap UI ready. Add router contract later.", routerReady:"Router configured and ready." },
 pt: { swap:"Swap", from:"De", to:"Para", balance:"Saldo", reverse:"Inverter tokens", previewFee:"A tela profissional do swap já está pronta. O roteador, factory e contratos de liquidez podem ser conectados depois.", execution:"Execução", slippage:"Slippage %", minimumReceived:"Mínimo recebido", priceImpact:"Impacto no preço", route:"Rota", waitingConfig:"Roteador ainda não configurado", swapNow:"Trocar agora", routerPending:"Interface do swap pronta. Adicione o contrato do roteador depois.", routerReady:"Roteador configurado e pronto." },
 es: { swap:"Swap", from:"De", to:"A", balance:"Saldo", reverse:"Invertir tokens", previewFee:"La pantalla profesional de swap ya está lista. El router, factory y contratos de liquidez se pueden conectar después.", execution:"Ejecución", slippage:"Slippage %", minimumReceived:"Mínimo recibido", priceImpact:"Impacto de precio", route:"Ruta", waitingConfig:"Router aún no configurado", swapNow:"Hacer swap", routerPending:"Interfaz de swap lista. Agrega el contrato del router después.", routerReady:"Router configurado y listo." } }; return map[lang] || map.en; }
function wrap(isLight:boolean):React.CSSProperties{return{border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,borderRadius:20,background:isLight?"#ffffff":"#121621",padding:16}}
function title(isLight:boolean):React.CSSProperties{return{marginTop:0,color:isLight?"#10131a":"#ffffff"}}
function panel(isLight:boolean):React.CSSProperties{return{border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,borderRadius:20,background:isLight?"#fbfcff":"#0f1522",padding:14}}
function banner(isLight:boolean):React.CSSProperties{return{marginBottom:12,padding:"12px 14px",borderRadius:14,background:isLight?"#eef4ff":"#16213b",color:"#3f7cff",fontWeight:700}}
function label(isLight:boolean):React.CSSProperties{return{marginBottom:10,fontSize:13,color:isLight?"#5b6578":"#97a0b3"}}
function hint(isLight:boolean):React.CSSProperties{return{fontSize:12,color:isLight?"#5b6578":"#97a0b3"}}
const row:React.CSSProperties={display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"};
const tokenBox:React.CSSProperties={display:"flex",alignItems:"center",gap:10};
const logoStyle:React.CSSProperties={width:34,height:34,borderRadius:17,objectFit:"cover"};
function selectStyle(isLight:boolean):React.CSSProperties{return{padding:"10px 12px",borderRadius:12,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#ffffff":"#12192a",color:isLight?"#10131a":"#ffffff",outline:"none"}}
function inputStyle(isLight:boolean):React.CSSProperties{return{width:"100%",marginTop:12,padding:12,borderRadius:12,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#f6f8fc":"#0d111b",color:isLight?"#10131a":"#ffffff",outline:"none",boxSizing:"border-box"}}
function smallInput(isLight:boolean):React.CSSProperties{return{width:90,padding:"8px 10px",borderRadius:10,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#fff":"#12192a",color:isLight?"#10131a":"#fff",outline:"none"}}
function estimatedStyle(isLight:boolean):React.CSSProperties{return{fontWeight:900,fontSize:18,color:isLight?"#10131a":"#fff",marginTop:10}}
function miniGrid():React.CSSProperties{return{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:10}}
function miniRow(isLight:boolean):React.CSSProperties{return{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderTop:`1px solid ${isLight?"#edf1f7":"#1d2431"}`,color:isLight?"#334155":"#cfd6e4"}}
function foot(isLight:boolean):React.CSSProperties{return{marginTop:12,color:isLight?"#5b6578":"#97a0b3",fontSize:13}}
function mainButtonStyle():React.CSSProperties{return{width:"100%",marginTop:14,padding:"14px 16px",borderRadius:14,border:"none",background:"#3f7cff",color:"#fff",cursor:"pointer",fontWeight:800,fontSize:16}}
function swapButtonStyle(isLight:boolean):React.CSSProperties{return{width:48,height:48,borderRadius:24,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#fff":"#12192a",color:isLight?"#10131a":"#fff",cursor:"pointer",fontSize:22}}
