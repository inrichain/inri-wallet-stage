import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { DEFAULT_NETWORK_ID, getNetworkById } from "../lib/networks";
import { getDefaultTokens, withRpcFallback, formatTokenAmount } from "../lib/inri";

export default function SwapScreen({ theme, lang, address, activeNetworkId = DEFAULT_NETWORK_ID }: { theme: "dark" | "light"; lang: string; address: string; activeNetworkId?: string; }) {
  const isLight = theme === "light";
  const t = getText(lang);
  const network = getNetworkById(activeNetworkId);
  const tokens = useMemo(() => getDefaultTokens(network.id), [network.id]);
  const [fromIndex, setFromIndex] = useState(0);
  const [toIndex, setToIndex] = useState(Math.min(1, tokens.length - 1));
  const [amountIn, setAmountIn] = useState("");
  const [balanceIn, setBalanceIn] = useState("0");
  const [previewOut, setPreviewOut] = useState("0");
  const [rpcLabel, setRpcLabel] = useState("RPC ready");
  const fromToken = tokens[fromIndex] || tokens[0];
  const toToken = tokens[toIndex] || tokens[0];

  useEffect(() => { setToIndex((prev) => (prev === fromIndex ? (fromIndex + 1) % Math.max(tokens.length, 1) : prev)); }, [fromIndex, tokens.length]);

  useEffect(() => {
    let mounted = true;
    async function loadBalance() {
      if (!address || !fromToken) return;
      try {
        const value = await withRpcFallback(network, async (provider, rpcUrl) => {
          if (fromToken.isNative) {
            const bal = await provider.getBalance(address);
            setRpcLabel(rpcUrl.includes("rpc-chain") ? "Fallback RPC" : "Main RPC");
            return ethers.formatUnits(bal, fromToken.decimals || network.nativeCurrency.decimals);
          }
          if (!fromToken.address) return "0";
          const contract = new ethers.Contract(fromToken.address, ["function balanceOf(address) view returns (uint256)"], provider);
          const bal = await contract.balanceOf(address);
          setRpcLabel(rpcUrl.includes("rpc-chain") ? "Fallback RPC" : "Main RPC");
          return ethers.formatUnits(bal, fromToken.decimals || 18);
        });
        if (mounted) setBalanceIn(formatTokenAmount(value));
      } catch {
        if (mounted) setBalanceIn("0");
      }
    }
    loadBalance();
    return () => { mounted = false; };
  }, [address, fromToken, network]);

  useEffect(() => {
    const num = Number(amountIn || 0);
    if (!Number.isFinite(num) || num <= 0) return setPreviewOut("0");
    const out = num * 0.997;
    setPreviewOut(formatTokenAmount(String(out)));
  }, [amountIn, fromToken, toToken]);

  function flip() { setFromIndex(toIndex); setToIndex(fromIndex); }

  return <div style={{ display: "grid", gap: 16 }}>
    <section style={panel(isLight)}><div style={title(isLight)}>{t.swap}</div><div style={sub(isLight)}>{network.name} • {rpcLabel}</div></section>
    <section style={panel(isLight)}>
      <TokenCard isLight={isLight} label={t.from} token={fromToken} amount={amountIn} setAmount={setAmountIn} tokenIndex={fromIndex} setTokenIndex={setFromIndex} tokens={tokens} balance={balanceIn} />
      <div style={{ display: "flex", justifyContent: "center", margin: "10px 0" }}><button onClick={flip} style={flipBtn(isLight)}>⇅</button></div>
      <TokenCard isLight={isLight} label={t.to} token={toToken} amount={previewOut} setAmount={() => {}} tokenIndex={toIndex} setTokenIndex={setToIndex} tokens={tokens} balance="-" readOnly />
    </section>
    <section style={panel(isLight)}>
      <Row isLight={isLight} label={t.route} value={`${fromToken?.symbol || "-"} → ${toToken?.symbol || "-"}`} />
      <Row isLight={isLight} label={t.networkFee} value="0.30%" />
      <Row isLight={isLight} label={t.priceImpact} value={Number(amountIn || 0) > 1000 ? "1.20%" : "0.20%"} />
      <button style={primary}>{t.comingSoon}</button>
    </section>
  </div>;
}
function TokenCard({ isLight, label, token, amount, setAmount, tokenIndex, setTokenIndex, tokens, balance, readOnly }: any) { return <div style={{ border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, borderRadius: 20, padding: 16, background: isLight ? "#f8fbff" : "#0c1422" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div style={{ color: isLight ? "#64748f" : "#90a3c7", fontWeight: 800, fontSize: 12 }}>{label}</div><div style={{ color: isLight ? "#64748f" : "#90a3c7", fontWeight: 800, fontSize: 12 }}>Balance: {balance}</div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 170px", gap: 12, marginTop: 12 }}><input value={amount} onChange={(e) => setAmount(e.target.value)} readOnly={readOnly} placeholder="0.00" style={{ width: "100%", padding: 14, borderRadius: 16, border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, background: isLight ? "#fff" : "#101827", color: isLight ? "#09111f" : "#fff", fontWeight: 900, fontSize: 18, boxSizing: "border-box" }} /><select value={tokenIndex} onChange={(e) => setTokenIndex(Number(e.target.value))} style={{ width: "100%", padding: 12, borderRadius: 16, border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, background: isLight ? "#fff" : "#101827", color: isLight ? "#09111f" : "#fff" }}>{tokens.map((item: any, idx: number) => <option key={idx} value={idx}>{item.symbol}</option>)}</select></div><div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}><img src={token?.logo} alt={token?.symbol} style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 12, background: isLight ? "#fff" : "#101827", padding: 5 }} /><div><div style={{ color: isLight ? "#0f172a" : "#fff", fontWeight: 900 }}>{token?.symbol}</div><div style={{ color: isLight ? "#64748f" : "#90a3c7", fontSize: 12 }}>{token?.name}</div></div></div></div>; }
function Row({ isLight, label, value }: any) { return <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0" }}><div style={{ color: isLight ? "#64748f" : "#90a3c7", fontWeight: 700, fontSize: 13 }}>{label}</div><div style={{ color: isLight ? "#09111f" : "#fff", fontWeight: 900, fontSize: 13 }}>{value}</div></div>; }
function getText(lang: string) { const map: Record<string, any> = { en: { swap: "Swap", from: "From", to: "To", route: "Route", networkFee: "Swap fee", priceImpact: "Price impact", comingSoon: "Swap execution coming soon" }, pt: { swap: "Swap", from: "De", to: "Para", route: "Rota", networkFee: "Taxa do swap", priceImpact: "Impacto no preço", comingSoon: "Execução do swap em breve" } }; return map[lang] || map.en; }
function panel(isLight: boolean): React.CSSProperties { return { border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, borderRadius: 24, background: isLight ? "#fff" : "#101827", padding: 18 }; }
function title(isLight: boolean): React.CSSProperties { return { color: isLight ? "#09111f" : "#fff", fontWeight: 900, fontSize: 18 }; }
function sub(isLight: boolean): React.CSSProperties { return { color: isLight ? "#64748f" : "#90a3c7", fontSize: 13, marginTop: 6 }; }
function flipBtn(isLight: boolean): React.CSSProperties { return { width: 46, height: 46, borderRadius: 999, border: `1px solid ${isLight ? "#dbe3f2" : "#22314f"}`, background: isLight ? "#fff" : "#101827", color: isLight ? "#09111f" : "#fff", cursor: "pointer", fontWeight: 900, fontSize: 18 }; }
const primary: React.CSSProperties = { width: "100%", marginTop: 12, padding: "14px 16px", borderRadius: 16, border: "none", background: "linear-gradient(180deg,#26a6ff 0%, #4f7cff 100%)", color: "#fff", cursor: "pointer", fontWeight: 900 };
