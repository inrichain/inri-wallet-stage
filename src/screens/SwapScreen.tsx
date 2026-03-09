import React, { useEffect, useMemo, useState } from "react";
import { DEFAULT_TOKENS, loadAllBalances } from "../lib/inri";
import { DEFAULT_NETWORKS, getStoredNetwork } from "../lib/network";

const SWAP_CONFIGURED = false;

export default function SwapScreen({ theme = "dark", lang = "en", address }: { theme?: "dark" | "light"; lang?: string; address: string; }) {
  const isLight = theme === "light";
  const t = getText(lang);
  const tokenOptions = DEFAULT_TOKENS.filter((x) => ["INRI", "iUSD", "WINRI", "DNR"].includes(x.symbol));
  const [fromNetwork, setFromNetwork] = useState(getStoredNetwork().key);
  const [toNetwork, setToNetwork] = useState(getStoredNetwork().key);
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

  function reverseTokens() {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromNetwork(toNetwork);
    setToNetwork(fromNetwork);
  }

  const estimated = useMemo(() => {
    const n = Number(amount || "0");
    if (!Number.isFinite(n) || n <= 0) return "0.000000";
    return (n * 0.997).toFixed(6);
  }, [amount]);

  const minimumReceived = useMemo(() => {
    const e = Number(estimated);
    const s = Number(slippage || "0");
    if (!Number.isFinite(e) || !Number.isFinite(s)) return "0.000000";
    return (e * (1 - s / 100)).toFixed(6);
  }, [estimated, slippage]);

  const from = tokenOptions.find((t) => t.symbol === fromToken) || tokenOptions[0];
  const to = tokenOptions.find((t) => t.symbol === toToken) || tokenOptions[1];
  const fromNet = DEFAULT_NETWORKS.find((x) => x.key === fromNetwork) || DEFAULT_NETWORKS[0];
  const toNet = DEFAULT_NETWORKS.find((x) => x.key === toNetwork) || DEFAULT_NETWORKS[0];

  return (
    <div style={wrap(isLight)}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={title(isLight)}>{t.swap}</h2>
        <div style={chip(isLight)}>{fromNet.name} → {toNet.name}</div>
      </div>
      <div style={banner(isLight)}>{SWAP_CONFIGURED ? t.routerReady : t.routerPending}</div>

      <div style={panel(isLight)}>
        <div style={sectionHeader(isLight)}><span>{t.from}</span><span>{t.balance}: {balances[from.symbol] || "0.000000"}</span></div>
        <div style={doubleGrid}>
          <select value={fromNetwork} onChange={(e) => setFromNetwork(e.target.value)} style={selectStyle(isLight)}>
            {DEFAULT_NETWORKS.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}
          </select>
          <select value={fromToken} onChange={(e) => { const next = e.target.value; if (next === toToken && fromNetwork === toNetwork) setToToken(fromToken); setFromToken(next); }} style={selectStyle(isLight)}>
            {tokenOptions.map((item) => <option key={item.symbol} value={item.symbol}>{item.symbol}</option>)}
          </select>
        </div>
        <div style={tokenPreview(isLight)}>
          <div style={tokenBox}><img src={from.logo} alt={from.symbol} style={logoStyle} /><div><strong style={{ color: isLight ? "#10131a" : "#fff" }}>{from.symbol}</strong><div style={hint(isLight)}>{from.subtitle}</div></div></div>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={amountInput(isLight)} />
        </div>
      </div>

      <div style={{ display: "grid", placeItems: "center", margin: "12px 0" }}><button onClick={reverseTokens} style={swapButtonStyle(isLight)} title={t.reverse}>⇅</button></div>

      <div style={panel(isLight)}>
        <div style={sectionHeader(isLight)}><span>{t.to}</span><span>{t.estimatedOutput}</span></div>
        <div style={doubleGrid}>
          <select value={toNetwork} onChange={(e) => setToNetwork(e.target.value)} style={selectStyle(isLight)}>
            {DEFAULT_NETWORKS.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}
          </select>
          <select value={toToken} onChange={(e) => { const next = e.target.value; if (next === fromToken && fromNetwork === toNetwork) setFromToken(toToken); setToToken(next); }} style={selectStyle(isLight)}>
            {tokenOptions.map((item) => <option key={item.symbol} value={item.symbol}>{item.symbol}</option>)}
          </select>
        </div>
        <div style={tokenPreview(isLight)}>
          <div style={tokenBox}><img src={to.logo} alt={to.symbol} style={logoStyle} /><div><strong style={{ color: isLight ? "#10131a" : "#fff" }}>{to.symbol}</strong><div style={hint(isLight)}>{to.subtitle}</div></div></div>
          <div style={estimatedStyle(isLight)}>{estimated}</div>
        </div>
      </div>

      <div style={{ ...panel(isLight), marginTop: 12 }}>
        <div style={label(isLight)}>{t.execution}</div>
        <div style={miniGridStyle}><div style={{ color: isLight ? "#334155" : "#cfd6e4" }}>{t.slippage}</div><input value={slippage} onChange={(e) => setSlippage(e.target.value)} style={smallInput(isLight)} /></div>
        <div style={miniRow(isLight)}><span>{t.minimumReceived}</span><strong>{minimumReceived} {to.symbol}</strong></div>
        <div style={miniRow(isLight)}><span>{t.priceImpact}</span><strong>0.30%</strong></div>
        <div style={miniRow(isLight)}><span>{t.route}</span><strong>{from.symbol} → {to.symbol}</strong></div>
        <div style={miniRow(isLight)}><span>{t.networkRoute}</span><strong>{fromNet.name} → {toNet.name}</strong></div>
      </div>
      <div style={foot(isLight)}>{t.previewFee}</div>
      <button style={{ ...mainButtonStyle(), opacity: SWAP_CONFIGURED ? 1 : 0.7 }} disabled={!SWAP_CONFIGURED}>{SWAP_CONFIGURED ? t.swapNow : t.waitingConfig}</button>
    </div>
  );
}

function getText(lang: string) { const map: Record<string, any> = {
 en: { swap:"Swap", from:"From", to:"To", balance:"Balance", reverse:"Reverse", estimatedOutput:"Estimated output", previewFee:"Professional multichain swap interface is ready. Router contracts can be connected later.", execution:"Execution", slippage:"Slippage %", minimumReceived:"Minimum received", priceImpact:"Price impact", route:"Token route", networkRoute:"Network route", waitingConfig:"Router not configured yet", swapNow:"Swap now", routerPending:"Swap screen ready with network and token selectors.", routerReady:"Router configured and ready." },
 pt: { swap:"Swap", from:"De", to:"Para", balance:"Saldo", reverse:"Inverter", estimatedOutput:"Saída estimada", previewFee:"A interface profissional multichain do swap já está pronta. Os contratos do roteador podem ser conectados depois.", execution:"Execução", slippage:"Slippage %", minimumReceived:"Mínimo recebido", priceImpact:"Impacto no preço", route:"Rota do token", networkRoute:"Rota da rede", waitingConfig:"Roteador ainda não configurado", swapNow:"Trocar agora", routerPending:"Tela de swap pronta com seletor de rede e token.", routerReady:"Roteador configurado e pronto." },
 es: { swap:"Swap", from:"De", to:"A", balance:"Saldo", reverse:"Invertir", estimatedOutput:"Salida estimada", previewFee:"La interfaz profesional multichain del swap ya está lista. Los contratos del router se pueden conectar después.", execution:"Ejecución", slippage:"Slippage %", minimumReceived:"Mínimo recibido", priceImpact:"Impacto de precio", route:"Ruta del token", networkRoute:"Ruta de red", waitingConfig:"Router aún no configurado", swapNow:"Hacer swap", routerPending:"Pantalla de swap lista con selector de red y token.", routerReady:"Router configurado y listo." } }; return map[lang] || map.en; }
function wrap(isLight:boolean):React.CSSProperties{return{border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,borderRadius:20,background:isLight?"#ffffff":"#121621",padding:16}}
function title(isLight:boolean):React.CSSProperties{return{margin:"0",color:isLight?"#10131a":"#ffffff"}}
function panel(isLight:boolean):React.CSSProperties{return{border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,borderRadius:20,background:isLight?"#fbfcff":"#0f1522",padding:14}}
function banner(isLight:boolean):React.CSSProperties{return{marginBottom:12,padding:"12px 14px",borderRadius:14,background:isLight?"#eef4ff":"#16213b",color:"#3f7cff",fontWeight:700}}
function chip(isLight:boolean):React.CSSProperties{return{padding:"8px 12px",borderRadius:999,background:isLight?"#eef4ff":"#16213b",color:"#3f7cff",fontWeight:800,fontSize:13}}
function label(isLight:boolean):React.CSSProperties{return{marginBottom:10,fontSize:13,color:isLight?"#5b6578":"#97a0b3"}}
function hint(isLight:boolean):React.CSSProperties{return{fontSize:12,color:isLight?"#5b6578":"#97a0b3"}}
function sectionHeader(isLight:boolean):React.CSSProperties{return{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:10,fontSize:13,color:isLight?"#5b6578":"#97a0b3"}}
const doubleGrid:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12};
const tokenBox:React.CSSProperties={display:"flex",alignItems:"center",gap:10};
function tokenPreview(isLight:boolean):React.CSSProperties{return{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginTop:12,padding:"12px 14px",borderRadius:14,background:isLight?"#fff":"#12192a",border:`1px solid ${isLight?"#e8edf6":"#1f2633"}`,flexWrap:"wrap"}}
const logoStyle:React.CSSProperties={width:34,height:34,borderRadius:17,objectFit:"cover"};
function selectStyle(isLight:boolean):React.CSSProperties{return{padding:"12px 14px",borderRadius:12,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#ffffff":"#12192a",color:isLight?"#10131a":"#ffffff",outline:"none",width:"100%"}}
function amountInput(isLight:boolean):React.CSSProperties{return{minWidth:160,flex:1,padding:12,borderRadius:12,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#f6f8fc":"#0d111b",color:isLight?"#10131a":"#ffffff",outline:"none",boxSizing:"border-box"}}
function smallInput(isLight:boolean):React.CSSProperties{return{width:90,padding:"8px 10px",borderRadius:10,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#fff":"#12192a",color:isLight?"#10131a":"#fff",outline:"none"}}
function estimatedStyle(isLight:boolean):React.CSSProperties{return{fontWeight:900,fontSize:18,color:isLight?"#10131a":"#fff"}}
const miniGridStyle:React.CSSProperties={display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:10};
function miniRow(isLight:boolean):React.CSSProperties{return{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 0",borderTop:`1px solid ${isLight?"#edf1f7":"#1d2431"}`,color:isLight?"#334155":"#cfd6e4"}}
function foot(isLight:boolean):React.CSSProperties{return{marginTop:12,color:isLight?"#5b6578":"#97a0b3",fontSize:13}}
function mainButtonStyle():React.CSSProperties{return{width:"100%",marginTop:14,padding:"14px 16px",borderRadius:14,border:"none",background:"#3f7cff",color:"#fff",cursor:"pointer",fontWeight:800,fontSize:16}}
function swapButtonStyle(isLight:boolean):React.CSSProperties{return{width:48,height:48,borderRadius:24,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#fff":"#12192a",color:isLight?"#10131a":"#fff",cursor:"pointer",fontSize:22}}
