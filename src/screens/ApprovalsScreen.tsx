import React, { useMemo } from "react";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import StatusPill from "../components/StatusPill";

function readApprovals() { try { return (JSON.parse(localStorage.getItem("inri_wallet_activity_v1") || "[]") || []).filter((x:any)=> String(x.method||'').toLowerCase()==='approve'); } catch { return []; } }

export default function ApprovalsScreen({ theme = "dark" }: { theme?: "dark" | "light"; lang?: string }) {
  const items = useMemo(() => readApprovals(), []);
  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}><SectionTitle title="Approvals" subtitle="Review locally recorded token approvals. Revoke wiring can be connected later." theme={theme} /><div className="wallet-action-row"><StatusPill theme={theme} tone="primary">{items.length} tracked</StatusPill><StatusPill theme={theme}>Ready for revoke</StatusPill></div></ScreenCard>
      <ScreenCard theme={theme}>{items.length===0?<div className="wallet-empty-state"><div className="wallet-empty-state-title">No approvals yet</div><div className="wallet-empty-state-text">Approvals from bridge, swap and dapps will appear here when saved to activity.</div></div>:items.map((item:any,idx:number)=><div key={item.hash || idx} style={{padding:'14px 0', borderBottom: idx===items.length-1?'none':`1px solid ${theme==='light'?'#e8edf5':'#1b2230'}`}}><div style={{fontWeight:800}}>{item.tokenSymbol || item.symbol || 'Token'} approval</div><div className="wallet-ui-subtle" style={{marginTop:4}}>{item.spender || item.contract || 'Unknown spender'}</div><div className="wallet-ui-subtle" style={{marginTop:4}}>{item.networkName || item.networkKey || 'Network not tagged'}</div></div>)}</ScreenCard>
    </div>
  );
}
