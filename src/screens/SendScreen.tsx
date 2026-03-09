import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { ethers } from "ethers";
import { ERC20_ABI, TokenItem, getHealthyProvider, getKnownTokens, loadAllBalances } from "../lib/inri";
import { NETWORKS, getNetworkById } from "../lib/networks";

const ACTIVITY_KEY = "wallet_activity_demo";

type ViewToken = TokenItem & { balance: string };

export default function SendScreen({ theme="dark", lang="en", address, mnemonic, activeNetworkId="inri", setActiveNetworkId }:{theme?:"dark"|"light";lang?:string;address:string;mnemonic:string;activeNetworkId?:string;setActiveNetworkId:(value:string)=>void;}) {
  const isLight = theme === "light";
  const [selectedToken, setSelectedToken] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [tokens, setTokens] = useState<ViewToken[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const network = getNetworkById(activeNetworkId);
  const token = useMemo(() => tokens.find((t) => t.symbol === selectedToken) || tokens[0], [selectedToken, tokens]);
  const t = getText(lang);

  useEffect(() => {
    const base = getKnownTokens(activeNetworkId).map((item) => ({ ...item, balance: "0.000000" }));
    setTokens(base);
    setSelectedToken(base[0]?.symbol || "");
  }, [activeNetworkId]);

  useEffect(() => {
    let active = true;
    async function loadBalances() {
      const balances = await loadAllBalances(activeNetworkId, address, tokens);
      if (!active) return;
      setTokens((prev) => prev.map((item) => ({ ...item, balance: balances[item.symbol] || "0.000000" })));
    }
    if (tokens.length) loadBalances();
    const timer = setInterval(loadBalances, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [address, activeNetworkId, tokens.length]);

  function showMessage(text:string){ setMessage(text); setTimeout(()=>setMessage(""),2600); }
  function validateAddress(value:string){ return /^0x[a-fA-F0-9]{40}$/.test(value); }
  function saveActivity(entry:any){ const current=JSON.parse(localStorage.getItem(ACTIVITY_KEY)||"[]"); localStorage.setItem(ACTIVITY_KEY, JSON.stringify([entry,...current])); }

  async function handleSend(){ if(!mnemonic) return showMessage(t.noWallet); if(!validateAddress(toAddress.trim())) return showMessage(t.invalidAddress); const n=Number(amount||"0"); if(!Number.isFinite(n)||n<=0) return showMessage(t.invalidAmount); if(Number(amount)>Number(token?.balance||"0")) return showMessage(t.insufficientBalance); if(!token) return; setSending(true); try{ const provider = await getHealthyProvider(activeNetworkId); const wallet = ethers.Wallet.fromPhrase(mnemonic).connect(provider); let txHash=""; if(token.isNative){ const tx = await wallet.sendTransaction({ to: toAddress.trim(), value: ethers.parseEther(amount) }); txHash=tx.hash; await tx.wait(); } else if(token.address){ const contract = new ethers.Contract(token.address, ERC20_ABI, wallet); const tx = await contract.transfer(toAddress.trim(), ethers.parseUnits(amount, token.decimals || 18)); txHash=tx.hash; await tx.wait(); } saveActivity({ hash: txHash, networkId: activeNetworkId, type: token.isNative ? "native":"token", symbol: token.symbol, amount, to: toAddress.trim(), from: address, createdAt: new Date().toISOString(), status: "confirmed" }); showMessage(`${t.sent}: ${amount} ${token.symbol}`); setAmount(""); setToAddress(""); } catch(e:any){ showMessage(e?.shortMessage || e?.message || t.sendFailed); } finally { setSending(false); } }
  function stopCameraTracks(){ const video=videoRef.current; const stream=video?.srcObject as MediaStream|null; if(stream) stream.getTracks().forEach((track)=>track.stop()); if(video) video.srcObject=null; }
  async function openScanner(){ setShowScanner(true); try{ await new Promise((r)=>setTimeout(r,150)); if(!videoRef.current) return showMessage(t.cameraUnavailable); const reader = new BrowserMultiFormatReader(); readerRef.current = reader; await reader.decodeFromConstraints({ audio:false, video:{ facingMode:{ ideal:"environment" } } }, videoRef.current, (result)=>{ if(!result) return; const text=result.getText(); const match=text.match(/0x[a-fA-F0-9]{40}/); if(match?.[0]){ setToAddress(match[0]); closeScanner(); showMessage(t.qrCaptured); } }); }catch{ showMessage(t.cameraFail); } }
  function closeScanner(){ try{ (readerRef.current as any)?.reset?.(); }catch{} stopCameraTracks(); setShowScanner(false); }
  useEffect(()=>()=>{ try{ (readerRef.current as any)?.reset?.(); }catch{} stopCameraTracks(); },[]);

  return <div style={{border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,borderRadius:20,background:isLight?"#ffffff":"#121621",padding:16}}><h2 style={{marginTop:0,color:isLight?"#10131a":"#ffffff"}}>{t.send}</h2><div style={{display:"grid",gap:10,marginBottom:14}}><select value={activeNetworkId} onChange={(e)=>setActiveNetworkId(e.target.value)} style={inputStyle(isLight)}>{NETWORKS.map((item)=><option key={item.id} value={item.id}>{item.name} • {item.chainId}</option>)}</select><select value={selectedToken} onChange={(e)=>setSelectedToken(e.target.value)} style={inputStyle(isLight)}>{tokens.map((item)=><option key={item.symbol} value={item.symbol}>{item.symbol} • {item.balance}</option>)}</select><input placeholder={t.toAddress} value={toAddress} onChange={(e)=>setToAddress(e.target.value)} style={inputStyle(isLight)} /><div style={{display:"grid",gridTemplateColumns:"1fr 140px",gap:8}}><input placeholder="0.00" value={amount} onChange={(e)=>setAmount(e.target.value)} style={inputStyle(isLight)} /><button onClick={openScanner} style={secondaryButtonStyle(isLight)}>{t.scanQr}</button></div><div style={{color:isLight?"#5b6578":"#97a0b3",fontSize:13}}>{network.name} • {token?.symbol} • {t.balance}: {token?.balance || "0.000000"}</div><button onClick={handleSend} style={mainButtonStyle()} disabled={sending}>{sending?t.sending:t.sendNow}</button>{message?<div style={{color:"#3f7cff",fontWeight:700,fontSize:13,textAlign:"center"}}>{message}</div>:null}</div>{showScanner&&<div style={{border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,borderRadius:16,padding:12,background:isLight?"#f8fafc":"#0f1522"}}><video ref={videoRef} style={{width:"100%",borderRadius:12}} autoPlay muted playsInline /><button onClick={closeScanner} style={{...secondaryButtonStyle(isLight),marginTop:10}}>{t.closeScanner}</button></div>}</div>;
}
function getText(lang:string){const map:any={en:{send:"Send",toAddress:"Recipient address",scanQr:"Scan QR",closeScanner:"Close scanner",balance:"Balance",sent:"Sent",invalidAddress:"Invalid address.",invalidAmount:"Invalid amount.",insufficientBalance:"Insufficient balance.",noWallet:"Unlock your wallet first.",sendFailed:"Could not send transaction.",cameraUnavailable:"Camera unavailable.",cameraFail:"Could not open camera.",qrCaptured:"QR captured.",sending:"Sending...",sendNow:"Send now"},pt:{send:"Enviar",toAddress:"Endereço do destinatário",scanQr:"Ler QR",closeScanner:"Fechar leitor",balance:"Saldo",sent:"Enviado",invalidAddress:"Endereço inválido.",invalidAmount:"Valor inválido.",insufficientBalance:"Saldo insuficiente.",noWallet:"Desbloqueie sua carteira primeiro.",sendFailed:"Não foi possível enviar.",cameraUnavailable:"Câmera indisponível.",cameraFail:"Não foi possível abrir a câmera.",qrCaptured:"QR capturado.",sending:"Enviando...",sendNow:"Enviar agora"}}; return map[lang]||map.en;}
function inputStyle(isLight:boolean):React.CSSProperties{return{width:"100%",padding:12,borderRadius:12,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#f6f8fc":"#0d111b",color:isLight?"#10131a":"#ffffff",outline:"none",boxSizing:"border-box"}}
function mainButtonStyle():React.CSSProperties{return{width:"100%",padding:"14px 16px",borderRadius:14,border:"none",background:"#3f7cff",color:"#fff",cursor:"pointer",fontWeight:800,fontSize:16}}
function secondaryButtonStyle(isLight:boolean):React.CSSProperties{return{padding:"12px 14px",borderRadius:12,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#ffffff":"#1b2741",color:isLight?"#10131a":"#fff",cursor:"pointer",fontWeight:700}}
