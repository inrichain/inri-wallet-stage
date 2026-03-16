import React, { useEffect, useMemo, useState } from "react";
import { DEFAULT_TOKENS, loadAllBalances } from "../lib/inri";
import { getStoredNetwork, type NetworkItem } from "../lib/network";

const SWAP_CONFIGURED = false;

export default function SwapScreen({ theme = "dark", lang = "en", address }: { theme?: "dark" | "light"; lang?: string; address: string; }) {
  const isLight = theme === "light";
  const t = getText(lang);
  const tokenOptions = DEFAULT_TOKENS.filter((x) => ["INRI", "iUSD", "WINRI", "DNR"].includes(x.symbol));
  const [network, setNetwork] = useState<NetworkItem>(getStoredNetwork());
  const [fromToken, setFromToken] = useState("INRI");
  const [toToken, setToToken] = useState("iUSD");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [balances, setBalances] = useState<Record<string, string>>({});

  useEffect(() => {
    const sync = () => setNetwork(getStoredNetwork());
    window.addEventListener("storage", sync);
    window.addEventListener("wallet-network-updated", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("wallet-network-updated", sync as EventListener);
    };
  }, []);

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

  return (
    <div style={wrap(isLight)}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={title(isLight)}>{t.swap}</h2>
        <div style={chip(isLight)}>
          <img src={network.logo} alt={network.name} style={chipLogo} />
          <span>{network.name}</span>
        </div>
      </div>
      <div style={banner(isLight)}>{SWAP_CONFIGURED ? t.routerReady : t.routerPending}</div>

      <div style={panel(isLight)}>
        <div style={sectionHeader(isLight)}><span>{t.from}</span><span>{t.balance}: {balances[from.symbol] || "0.000000"}</span></div>
        <div style={tokenPreview(isLight)}>
          <div style={tokenBox}>
            <img src={from.logo || "/token-placeholder.svg"} alt={from.symbol} style={logoStyle} />
            <div>
              <strong style={{ color: isLight ? "#10131a" : "#fff" }}>{from.symbol}</strong>
              <div style={hint(isLight)}>{from.subtitle}</div>
            </div>
          </div>
          <select value={fromToken} onChange={(e) => { const next = e.target.value; if (next === toToken) setToToken(fromToken); setFromToken(next); }} style={tokenSelectStyle(isLight)}>
            {tokenOptions.map((item) => <option key={item.symbol} value={item.symbol}>{item.symbol}</option>)}
          </select>
        </div>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={amountInput(isLight)} />
      </div>

      <div style={{ display: "grid", placeItems: "center", margin: "12px 0" }}><button onClick={reverseTokens} style={swapButtonStyle(isLight)} title={t.reverse}>⇅</button></div>

      <div style={panel(isLight)}>
        <div style={sectionHeader(isLight)}><span>{t.to}</span><span>{t.estimatedOutput}</span></div>
        <div style={tokenPreview(isLight)}>
          <div style={tokenBox}>
            <img src={to.logo || "/token-placeholder.svg"} alt={to.symbol} style={logoStyle} />
            <div>
              <strong style={{ color: isLight ? "#10131a" : "#fff" }}>{to.symbol}</strong>
              <div style={hint(isLight)}>{to.subtitle}</div>
            </div>
          </div>
          <select value={toToken} onChange={(e) => { const next = e.target.value; if (next === fromToken) setFromToken(toToken); setToToken(next); }} style={tokenSelectStyle(isLight)}>
            {tokenOptions.map((item) => <option key={item.symbol} value={item.symbol}>{item.symbol}</option>)}
          </select>
        </div>
        <div style={estimatedStyle(isLight)}>{estimated} {to.symbol}</div>
      </div>

      <div style={{ ...panel(isLight), marginTop: 12 }}>
        <div style={label(isLight)}>{t.execution}</div>
        <div style={networkInfo(isLight)}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={network.logo} alt={network.name} style={{ width: 28, height: 28, borderRadius: 10 }} />
            <div>
              <div style={{ color: isLight ? "#10131a" : "#fff", fontWeight: 800 }}>{network.name}</div>
              <div style={hint(isLight)}>Chain ID {network.chainId}</div>
            </div>
          </div>
          <div style={hint(isLight)}>{t.networkLocked}</div>
        </div>
        <div style={miniGridStyle}><div style={{ color: isLight ? "#334155" : "#cfd6e4" }}>{t.slippage}</div><input value={slippage} onChange={(e) => setSlippage(e.target.value)} style={smallInput(isLight)} /></div>
        <div style={miniRow(isLight)}><span>{t.minimumReceived}</span><strong>{minimumReceived} {to.symbol}</strong></div>
        <div style={miniRow(isLight)}><span>{t.priceImpact}</span><strong>0.30%</strong></div>
        <div style={miniRow(isLight)}><span>{t.route}</span><strong>{from.symbol} → {to.symbol}</strong></div>
        <div style={miniRow(isLight)}><span>{t.networkRoute}</span><strong>{network.name}</strong></div>
      </div>
      <div style={foot(isLight)}>{t.previewFee}</div>
      <button style={{ ...mainButtonStyle(), opacity: SWAP_CONFIGURED ? 1 : 0.7 }} disabled={!SWAP_CONFIGURED}>{SWAP_CONFIGURED ? t.swapNow : t.waitingConfig}</button>
    </div>
  );
}

function getText(lang: string) { const map: Record<string, any> = {
 en: { swap:"Swap", from:"From", to:"To", balance:"Balance", reverse:"Reverse", estimatedOutput:"Estimated output", previewFee:"Professional swap interface is ready. You can connect the router contracts later without changing the design.", execution:"Execution", slippage:"Slippage %", minimumReceived:"Minimum received", priceImpact:"Price impact", route:"Token route", networkRoute:"Active network", waitingConfig:"Router not configured yet", swapNow:"Swap now", routerPending:"Swap UI is ready with polished token cards and active network display.", routerReady:"Router configured and ready.", networkLocked:"Change network only in Settings" },
 pt: { swap:"Swap", from:"De", to:"Para", balance:"Saldo", reverse:"Inverter", estimatedOutput:"Saída estimada", previewFee:"A interface profissional do swap já está pronta. Você pode conectar os contratos do router depois sem mudar o design.", execution:"Execução", slippage:"Slippage %", minimumReceived:"Mínimo recebido", priceImpact:"Impacto no preço", route:"Rota do token", networkRoute:"Rede ativa", waitingConfig:"Roteador ainda não configurado", swapNow:"Trocar agora", routerPending:"A UI do swap está pronta com cards refinados e exibição da rede ativa.", routerReady:"Roteador configurado e pronto.", networkLocked:"Troque a rede apenas em Configurações" },
 es: { swap:"Swap", from:"De", to:"A", balance:"Saldo", reverse:"Invertir", estimatedOutput:"Salida estimada", previewFee:"La interfaz profesional del swap ya está lista. Puedes conectar los contratos del router después sin cambiar el diseño.", execution:"Ejecución", slippage:"Slippage %", minimumReceived:"Mínimo recibido", priceImpact:"Impacto de precio", route:"Ruta del token", networkRoute:"Red activa", waitingConfig:"Router aún no configurado", swapNow:"Hacer swap", routerPending:"La UI del swap ya está lista con tarjetas pulidas y red activa visible.", routerReady:"Router configurado y listo.", networkLocked:"Cambia la red solo en Ajustes" } }; return map[lang] || map.en; }
function wrap(isLight:boolean):React.CSSProperties{return{border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,borderRadius:20,background:isLight?"#ffffff":"#121621",padding:16}}
function title(isLight:boolean):React.CSSProperties{return{margin:"0",color:isLight?"#10131a":"#ffffff"}}
function panel(isLight:boolean):React.CSSProperties{return{border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,borderRadius:20,background:isLight?"#fbfcff":"#0f1522",padding:14}}
function banner(isLight:boolean):React.CSSProperties{return{marginBottom:12,padding:"12px 14px",borderRadius:14,background:isLight?"#eef4ff":"#16213b",color:"#3f7cff",fontWeight:700}}
function chip(isLight:boolean):React.CSSProperties{return{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:999,background:isLight?"#eef4ff":"#16213b",color:"#3f7cff",fontWeight:800,fontSize:13}}
const chipLogo:React.CSSProperties={width:18,height:18,borderRadius:9,objectFit:"cover"};
function label(isLight:boolean):React.CSSProperties{return{marginBottom:10,fontSize:13,color:isLight?"#5b6578":"#97a0b3"}}
function hint(isLight:boolean):React.CSSProperties{return{fontSize:12,color:isLight?"#5b6578":"#97a0b3"}}
function sectionHeader(isLight:boolean):React.CSSProperties{return{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:10,fontSize:13,color:isLight?"#5b6578":"#97a0b3"}}
const tokenBox:React.CSSProperties={display:"flex",alignItems:"center",gap:10,minWidth:0};
function tokenPreview(isLight:boolean):React.CSSProperties{return{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginTop:12,padding:"12px 14px",borderRadius:14,background:isLight?"#fff":"#12192a",border:`1px solid ${isLight?"#e8edf6":"#1f2633"}`,flexWrap:"wrap"}}
const logoStyle:React.CSSProperties={width:38,height:38,borderRadius:19,objectFit:"cover",flexShrink:0};
function tokenSelectStyle(isLight:boolean):React.CSSProperties{return{minWidth:130,padding:"11px 12px",borderRadius:12,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#fff":"#0f1522",color:isLight?"#10131a":"#fff",outline:"none"}}
function amountInput(isLight:boolean):React.CSSProperties{return{width:"100%",marginTop:12,padding:"14px 16px",borderRadius:14,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#fff":"#0b1120",color:isLight?"#10131a":"#fff",fontSize:18,fontWeight:800,boxSizing:"border-box",outline:"none"}}
function estimatedStyle(isLight:boolean):React.CSSProperties{return{marginTop:12,padding:"14px 16px",borderRadius:14,background:isLight?"#fff":"#0b1120",border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,color:isLight?"#10131a":"#fff",fontSize:22,fontWeight:900,textAlign:"right"}}
function networkInfo(isLight:boolean):React.CSSProperties{return{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",padding:"12px 14px",borderRadius:14,background:isLight?"#fff":"#12192a",border:`1px solid ${isLight?"#e8edf6":"#1f2633"}`,marginBottom:12}}
const miniGridStyle:React.CSSProperties={display:"grid",gridTemplateColumns:"1fr 110px",gap:12,alignItems:"center",marginBottom:12};
function smallInput(isLight:boolean):React.CSSProperties{return{padding:"10px 12px",borderRadius:12,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#fff":"#12192a",color:isLight?"#10131a":"#fff",outline:"none",boxSizing:"border-box",width:"100%"}}
function miniRow(isLight:boolean):React.CSSProperties{return{display:"flex",justifyContent:"space-between",gap:12,marginTop:10,color:isLight?"#5b6578":"#97a0b3",fontSize:13,flexWrap:"wrap"}}
function foot(isLight:boolean):React.CSSProperties{return{marginTop:12,marginBottom:12,fontSize:13,lineHeight:1.6,color:isLight?"#5b6578":"#97a0b3"}}
function mainButtonStyle():React.CSSProperties{return{width:"100%",padding:"14px 18px",borderRadius:14,border:"none",background:"#3f7cff",color:"#fff",fontWeight:900,fontSize:15,cursor:"pointer"}}
function swapButtonStyle(isLight:boolean):React.CSSProperties{return{width:44,height:44,borderRadius:22,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#ffffff":"#12192a",color:"#3f7cff",fontWeight:900,fontSize:20,cursor:"pointer"}}
