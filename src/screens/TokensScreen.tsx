import React, { useEffect, useMemo, useState } from "react";
import { TokenItem, autoDetectKnownTokens, getKnownTokens, loadAllBalances } from "../lib/inri";
import { getNetworkById } from "../lib/networks";

const CUSTOM_TOKENS_KEY = "wallet_custom_tokens_v2";

type ViewToken = TokenItem & { balance: string };

export default function TokensScreen({ theme="dark", lang="en", address, activeNetworkId="inri" }:{theme?:"dark"|"light";lang?:string;address:string;activeNetworkId?:string;}) {
  const isLight = theme === "light";
  const [customTokens, setCustomTokens] = useState<ViewToken[]>([]);
  const [symbol, setSymbol] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [decimals, setDecimals] = useState("18");
  const [logo, setLogo] = useState("");
  const [message, setMessage] = useState("");
  const [balances, setBalances] = useState<Record<string,string>>({});
  const t = getText(lang);
  const network = getNetworkById(activeNetworkId);
  const storageKey = `${CUSTOM_TOKENS_KEY}_${activeNetworkId}`;

  useEffect(() => { try { setCustomTokens(JSON.parse(localStorage.getItem(storageKey) || "[]")); } catch { setCustomTokens([]); } }, [storageKey]);
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(customTokens)); }, [storageKey, customTokens]);

  const knownTokens = useMemo(() => getKnownTokens(activeNetworkId), [activeNetworkId]);
  const tokens = useMemo(() => [...knownTokens.map((item)=>({ ...item, balance: "0.000000" })), ...customTokens], [knownTokens, customTokens]);

  useEffect(() => {
    let active = true;
    async function refresh() {
      const next = await loadAllBalances(activeNetworkId, address, tokens);
      if (active) setBalances(next);
    }
    refresh();
    const timer = setInterval(refresh, 12000);
    return () => { active = false; clearInterval(timer); };
  }, [address, tokens, activeNetworkId]);

  function showMessage(text:string){ setMessage(text); setTimeout(()=>setMessage(""),2500); }

  async function detectTokens(){
    const detected = await autoDetectKnownTokens(activeNetworkId, address);
    showMessage(`${t.detected}: ${detected.map((x)=>x.symbol).join(", ") || t.none}`);
  }

  function addToken(){ const cleanSymbol=symbol.trim().toUpperCase(); const cleanAddress=tokenAddress.trim(); const cleanLogo=logo.trim(); const cleanDecimals=Number(decimals); if(!cleanSymbol) return showMessage(t.symbolRequired); if(!cleanAddress) return showMessage(t.addressRequired); if(!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) return showMessage(t.invalidAddress); if(!Number.isFinite(cleanDecimals)||cleanDecimals<0||cleanDecimals>36) return showMessage(t.invalidDecimals); if(tokens.some((token)=>token.symbol.toUpperCase()===cleanSymbol || (token.address && token.address.toLowerCase()===cleanAddress.toLowerCase()))) return showMessage(t.tokenExists); const newToken:ViewToken={symbol:cleanSymbol,name:cleanSymbol,subtitle:`custom token • ${network.name}`,balance:"0.000000",logo:cleanLogo || "/inri-wallet-stage/token-inri.png",isDefault:false,address:cleanAddress,decimals:cleanDecimals,networkId:activeNetworkId}; setCustomTokens((prev)=>[...prev,newToken]); setSymbol(""); setTokenAddress(""); setDecimals("18"); setLogo(""); showMessage(t.tokenAdded); }

  return <div style={{border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,borderRadius:20,background:isLight?"#ffffff":"#121621",padding:16}}>
    <h2 style={{marginTop:0,color:isLight?"#10131a":"#ffffff"}}>{t.tokens}</h2>
    <div style={{color:isLight?"#5b6578":"#97a0b3",marginBottom:14}}>{network.name}</div>
    <div style={{display:"grid",gap:10,marginBottom:16}}>
      <input placeholder={t.tokenSymbol} value={symbol} onChange={(e)=>setSymbol(e.target.value)} style={inputStyle(isLight)} />
      <input placeholder={t.tokenAddress} value={tokenAddress} onChange={(e)=>setTokenAddress(e.target.value)} style={inputStyle(isLight)} />
      <div style={{display:"grid",gridTemplateColumns:"1fr 120px",gap:8}}>
        <input placeholder={t.logoOptional} value={logo} onChange={(e)=>setLogo(e.target.value)} style={inputStyle(isLight)} />
        <input placeholder="18" value={decimals} onChange={(e)=>setDecimals(e.target.value)} style={inputStyle(isLight)} />
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <button onClick={addToken} style={mainButtonStyle()}>{t.addToken}</button>
        <button onClick={detectTokens} style={secondaryButtonStyle(isLight)}>{t.detect}</button>
      </div>
      {message ? <div style={{color:"#3f7cff",fontWeight:700,fontSize:13,textAlign:"center"}}>{message}</div> : null}
    </div>
    <div style={{display:"grid",gap:12}}>
      {tokens.map((token)=><div key={token.symbol + (token.address || "")} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:12,alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${isLight?"#edf1f7":"#202635"}`}}><div style={{display:"flex",alignItems:"center",gap:12}}><img src={token.logo} alt={token.symbol} style={{width:42,height:42,borderRadius:21,objectFit:"cover",background:isLight?"#f4f7fc":"#0d111b"}} /><div><div style={{fontWeight:900,color:isLight?"#10131a":"#ffffff",fontSize:16}}>{token.symbol}</div><div style={{fontSize:12,color:isLight?"#5b6578":"#97a0b3"}}>{token.subtitle}</div></div></div><div style={{fontWeight:900,color:isLight?"#10131a":"#ffffff",fontSize:16}}>{balances[token.symbol] || token.balance}</div>{!token.isDefault?<button onClick={()=>setCustomTokens((prev)=>prev.filter((t)=>t.symbol!==token.symbol))} style={{padding:"8px 10px",borderRadius:10,border:"none",background:"#ef4444",color:"#fff",cursor:"pointer",fontWeight:700}}>{t.remove}</button>:<div style={{fontSize:12,color:isLight?"#5b6578":"#97a0b3"}}>{t.defaultToken}</div>}</div>)}
    </div>
  </div>;
}

function getText(lang:string){const map:any={en:{tokens:"Tokens",tokenSymbol:"Token symbol",tokenAddress:"Token address",logoOptional:"Logo URL (optional)",addToken:"Add token",detect:"Detect",detected:"Detected",none:"none",symbolRequired:"Token symbol required.",addressRequired:"Token address required.",invalidAddress:"Invalid token address.",invalidDecimals:"Invalid decimals.",tokenExists:"Token already exists.",tokenAdded:"Token added.",remove:"Remove",defaultToken:"default"},pt:{tokens:"Tokens",tokenSymbol:"Símbolo do token",tokenAddress:"Endereço do token",logoOptional:"URL da logo (opcional)",addToken:"Adicionar token",detect:"Detectar",detected:"Detectado",none:"nenhum",symbolRequired:"Símbolo obrigatório.",addressRequired:"Endereço obrigatório.",invalidAddress:"Endereço inválido.",invalidDecimals:"Decimais inválidos.",tokenExists:"Token já existe.",tokenAdded:"Token adicionado.",remove:"Remover",defaultToken:"padrão"}}; return map[lang]||map.en;}
function inputStyle(isLight:boolean):React.CSSProperties{return{width:"100%",padding:12,borderRadius:12,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#f6f8fc":"#0d111b",color:isLight?"#10131a":"#ffffff",outline:"none",boxSizing:"border-box"}}
function mainButtonStyle():React.CSSProperties{return{width:"100%",padding:"12px 14px",borderRadius:12,border:"none",background:"#3f7cff",color:"#fff",cursor:"pointer",fontWeight:800}}
function secondaryButtonStyle(isLight:boolean):React.CSSProperties{return{width:"100%",padding:"12px 14px",borderRadius:12,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#ffffff":"#1b2741",color:isLight?"#10131a":"#fff",cursor:"pointer",fontWeight:700}}
