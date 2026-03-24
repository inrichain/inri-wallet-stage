import React, { useEffect, useMemo, useState } from "react";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import StatusPill from "../components/StatusPill";
import ActionButton from "../components/ActionButton";
import EmptyState from "../components/EmptyState";
import LogoImage from "../components/LogoImage";
import {
  fetchPoolSnapshot,
  formatHashrate,
  formatINRI,
  getPoolMeta,
  payoutProgress,
  poolAddressUrl,
  poolTxUrl,
  shortAddress,
  timeAgo,
  type PoolBlock,
  type PoolPayment,
  type PoolSnapshot,
} from "../lib/pool";

type PoolTab = "overview" | "my" | "blocks" | "payments" | "leaders" | "setup" | "transparency";

function explorerLink(label: string, href: string, theme: "dark" | "light") {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="wallet-link-chip" style={{ textDecoration: "none", color: theme === "light" ? "#10131a" : "#fff" }}>
      {label}
    </a>
  );
}

function HashrateChart({ data, theme = "dark" }: { data: PoolSnapshot["overview"]["trend"]; theme?: "dark" | "light" }) {
  const isLight = theme === "light";
  const values = data.map((item) => item.poolHashrate);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, max * 0.7);
  const normalized = values.map((value, idx) => {
    const x = (idx / Math.max(1, values.length - 1)) * 100;
    const y = 100 - ((value - min) / Math.max(1, max - min)) * 100;
    return `${x},${y}`;
  }).join(" ");
  const area = `0,100 ${normalized} 100,100`;
  return (
    <div className="wallet-pool-chart-shell" style={{ background: isLight ? "linear-gradient(180deg,#f7fbff 0%,#eef4ff 100%)" : "linear-gradient(180deg,#11192a 0%,#0d1320 100%)" }}>
      <div className="wallet-pool-chart-head">
        <div>
          <div className="wallet-pool-kicker">Hashrate history</div>
          <div className="wallet-ui-subtle">Auto-refresh with recent pool trend</div>
        </div>
        <StatusPill theme={theme} tone="primary">Live</StatusPill>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="wallet-pool-chart-svg">
        <defs>
          <linearGradient id="poolArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(63,124,255,.35)" />
            <stop offset="100%" stopColor="rgba(63,124,255,0)" />
          </linearGradient>
        </defs>
        <polyline points={normalized} fill="none" stroke="#3f7cff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points={area} fill="url(#poolArea)" />
      </svg>
      <div className="wallet-pool-chart-footer">
        <div>
          <div className="wallet-pool-kicker">Now</div>
          <div className="wallet-pool-large">{formatHashrate(data[data.length - 1]?.poolHashrate || 0)}</div>
        </div>
        <div>
          <div className="wallet-pool-kicker">Network</div>
          <div className="wallet-pool-large">{formatHashrate(data[data.length - 1]?.networkHashrate || 0)}</div>
        </div>
      </div>
    </div>
  );
}

function MetricTile({ theme, label, value, tone = "default", sub }: { theme: "dark" | "light"; label: string; value: string; tone?: "default" | "primary" | "success" | "warning"; sub?: string }) {
  const isLight = theme === "light";
  const backgrounds: Record<string, string> = {
    default: isLight ? "#f8fbff" : "#0f1520",
    primary: isLight ? "#eef4ff" : "rgba(63,124,255,.12)",
    success: isLight ? "#effbf4" : "rgba(65,200,120,.12)",
    warning: isLight ? "#fff7e8" : "rgba(240,180,70,.12)",
  };
  return (
    <div className="wallet-pool-metric" style={{ background: backgrounds[tone], borderColor: isLight ? "#dbe2f0" : "#202635" }}>
      <div className="wallet-pool-kicker">{label}</div>
      <div className="wallet-pool-large">{value}</div>
      {sub ? <div className="wallet-ui-subtle">{sub}</div> : null}
    </div>
  );
}

function TabButton({ active, label, onClick, theme }: { active: boolean; label: string; onClick: () => void; theme: "dark" | "light" }) {
  return (
    <button className={`wallet-pool-tab ${active ? "active" : ""}`.trim()} onClick={onClick} type="button" style={active ? { background: "#3f7cff", color: "#fff", borderColor: "#3f7cff" } : {}}>
      {label}
    </button>
  );
}

function StatusTone({ status, theme = "dark" }: { status: string; theme?: "dark" | "light" }) {
  const normalized = status.toLowerCase();
  const tone = normalized === "confirmed" || normalized === "online" || normalized === "synced" ? "success" : normalized === "pending" || normalized === "syncing" ? "warning" : "danger";
  return <StatusPill theme={theme} tone={tone as any}>{status}</StatusPill>;
}

function TableShell({ children }: { children: React.ReactNode }) {
  return <div className="wallet-pool-table-wrap">{children}</div>;
}

export default function PoolScreen({ theme = "dark", address = "", setTab }: { theme?: "dark" | "light"; lang?: string; address?: string; setTab?: (tab: any) => void; }) {
  const isLight = theme === "light";
  const [tab, setLocalTab] = useState<PoolTab>("overview");
  const [snapshot, setSnapshot] = useState<PoolSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockMode, setBlockMode] = useState<"all" | "pplns" | "solo">("all");
  const [paymentMode, setPaymentMode] = useState<"all" | "pplns" | "solo" | "mine">("all");
  const meta = useMemo(() => getPoolMeta(), []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const next = await fetchPoolSnapshot(address || undefined);
        if (!active) return;
        setSnapshot(next);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    const id = window.setInterval(load, 12000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [address]);

  const filteredBlocks = useMemo(() => {
    const rows = snapshot?.blocks || [];
    return rows.filter((row) => (blockMode === "all" ? true : row.mode === blockMode));
  }, [snapshot, blockMode]);

  const filteredPayments = useMemo(() => {
    const rows = snapshot?.payments || [];
    return rows.filter((row) => {
      if (paymentMode === "mine") return !!address && row.address.toLowerCase() === address.toLowerCase();
      if (paymentMode === "all") return true;
      return row.mode === paymentMode;
    });
  }, [snapshot, paymentMode, address]);

  const myMiner = snapshot?.miner;
  const myProgress = payoutProgress(snapshot?.overview.minPayout || 0, myMiner?.pending || 0);
  const feePayments = (snapshot?.payments || []).filter((item) => item.isFeeWallet || item.address.toLowerCase() === meta.feeWallet.toLowerCase()).slice(0, 5);

  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme} className="wallet-pool-hero" style={{ overflow: "hidden" }}>
        <div className="wallet-pool-hero-grid">
          <div>
            <div className="wallet-pool-kicker">INRI Pool</div>
            <div className="wallet-section-title" style={{ fontSize: 28, color: isLight ? "#10131a" : "#fff" }}>Real-time mining command center</div>
            <div className="wallet-ui-subtle" style={{ maxWidth: 680 }}>
              A denser, cleaner control panel with stronger KPI hierarchy, hashrate history, worker visibility and full fee transparency.
            </div>
            <div className="wallet-action-row" style={{ marginTop: 10 }}>
              <StatusPill theme={theme} tone="primary">PPLNS</StatusPill>
              <StatusPill theme={theme}>SOLO</StatusPill>
              <StatusPill theme={theme} tone="warning">Fee {meta.feePercent.toFixed(2)}%</StatusPill>
              <StatusPill theme={theme} tone="success">Fee wallet visible</StatusPill>
            </div>
          </div>
          <div className="wallet-pool-livebox" style={{ background: isLight ? "linear-gradient(180deg,#f6f9ff 0%,#eef4ff 100%)" : "linear-gradient(180deg,#121b2f 0%,#0f1522 100%)" }}>
            <div className="wallet-pool-livehead">
              <div>
                <div className="wallet-pool-kicker">Live status</div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>Pool + node</div>
              </div>
              <StatusTone status={snapshot?.overview.poolStatus || "online"} theme={theme} />
            </div>
            <div className="wallet-pool-livegrid">
              <MetricTile theme={theme} label="Pool hashrate" value={formatHashrate(snapshot?.overview.poolHashrate || 0)} tone="primary" />
              <MetricTile theme={theme} label="Active miners" value={String(snapshot?.overview.activeMiners || 0)} />
              <MetricTile theme={theme} label="Workers" value={String(snapshot?.overview.activeWorkers || 0)} />
              <MetricTile theme={theme} label="Height" value={String(snapshot?.overview.currentHeight || 0)} />
            </div>
          </div>
        </div>
      </ScreenCard>

      <div className="wallet-pool-tabbar">
        <TabButton active={tab === "overview"} label="Overview" onClick={() => setLocalTab("overview")} theme={theme} />
        <TabButton active={tab === "my"} label="My Mining" onClick={() => setLocalTab("my")} theme={theme} />
        <TabButton active={tab === "blocks"} label="Blocks" onClick={() => setLocalTab("blocks")} theme={theme} />
        <TabButton active={tab === "payments"} label="Payments" onClick={() => setLocalTab("payments")} theme={theme} />
        <TabButton active={tab === "leaders"} label="Top Miners" onClick={() => setLocalTab("leaders")} theme={theme} />
        <TabButton active={tab === "setup"} label="Setup" onClick={() => setLocalTab("setup")} theme={theme} />
        <TabButton active={tab === "transparency"} label="Transparency" onClick={() => setLocalTab("transparency")} theme={theme} />
      </div>

      {loading || !snapshot ? <div className="wallet-skeleton-list"><div className="wallet-skeleton-card" /><div className="wallet-skeleton-card" /></div> : null}

      {!loading && snapshot && tab === "overview" ? (
        <>
          <div className="wallet-pool-kpi-grid">
            <MetricTile theme={theme} label="Pool status" value={snapshot.overview.poolStatus.toUpperCase()} tone="success" sub="Realtime" />
            <MetricTile theme={theme} label="Node status" value={snapshot.overview.nodeStatus.toUpperCase()} tone="primary" sub="Chain health" />
            <MetricTile theme={theme} label="Network hashrate" value={formatHashrate(snapshot.overview.networkHashrate)} />
            <MetricTile theme={theme} label="Difficulty" value={snapshot.overview.difficulty.toExponential(2)} />
            <MetricTile theme={theme} label="Blocks" value={String(snapshot.blocks.length)} sub="Recent" />
            <MetricTile theme={theme} label="Payments" value={String(snapshot.payments.length)} sub="Recent" />
          </div>

          <div className="wallet-pool-main-grid">
            <ScreenCard theme={theme}>
              <HashrateChart data={snapshot.overview.trend} theme={theme} />
            </ScreenCard>
            <ScreenCard theme={theme}>
              <SectionTitle title="Quick overview" subtitle="The metrics miners care about first" theme={theme} />
              <div className="wallet-pool-compact-list">
                <div className="wallet-pool-compact-item"><span>Pending blocks</span><strong>{snapshot.blocks.filter((b) => b.status === "pending").length}</strong></div>
                <div className="wallet-pool-compact-item"><span>Confirmed blocks</span><strong>{snapshot.blocks.filter((b) => b.status === "confirmed").length}</strong></div>
                <div className="wallet-pool-compact-item"><span>Orphaned</span><strong>{snapshot.blocks.filter((b) => b.status === "orphaned").length}</strong></div>
                <div className="wallet-pool-compact-item"><span>Luck / effort</span><strong>{Math.round(snapshot.blocks.reduce((sum, item) => sum + item.effort, 0) / Math.max(1, snapshot.blocks.length))}%</strong></div>
                <div className="wallet-pool-compact-item"><span>Fee wallet</span><strong>{shortAddress(meta.feeWallet)}</strong></div>
                <div className="wallet-pool-compact-item"><span>Min payout</span><strong>{formatINRI(snapshot.overview.minPayout)}</strong></div>
              </div>
            </ScreenCard>
          </div>

          <div className="wallet-pool-main-grid">
            <ScreenCard theme={theme}>
              <SectionTitle title="Recent blocks" subtitle="Dense like the best pool dashboards, but cleaner inside the wallet" theme={theme} actions={<ActionButton theme={theme} compact onClick={() => setLocalTab("blocks")}>Open blocks</ActionButton>} />
              <div className="wallet-pool-stack-list">
                {snapshot.blocks.slice(0, 5).map((block) => (
                  <div key={block.id} className="wallet-pool-stream-row">
                    <div>
                      <div style={{ fontWeight: 900 }}>#{block.height}</div>
                      <div className="wallet-ui-subtle">{shortAddress(block.miner)} • {timeAgo(block.createdAt)}</div>
                    </div>
                    <div className="wallet-action-row">
                      <StatusPill theme={theme} tone={block.mode === "solo" ? "warning" : "primary"}>{block.mode.toUpperCase()}</StatusPill>
                      <StatusTone status={block.status} theme={theme} />
                    </div>
                  </div>
                ))}
              </div>
            </ScreenCard>
            <ScreenCard theme={theme}>
              <SectionTitle title="Recent payments" subtitle="Latest miner and fee wallet settlements" theme={theme} actions={<ActionButton theme={theme} compact onClick={() => setLocalTab("payments")}>Open payments</ActionButton>} />
              <div className="wallet-pool-stack-list">
                {snapshot.payments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="wallet-pool-stream-row">
                    <div>
                      <div style={{ fontWeight: 900 }}>{formatINRI(payment.amount)}</div>
                      <div className="wallet-ui-subtle">{shortAddress(payment.address)} • {timeAgo(payment.createdAt)}</div>
                    </div>
                    <div className="wallet-action-row">
                      {payment.isFeeWallet ? <StatusPill theme={theme} tone="warning">Fee wallet</StatusPill> : null}
                      <StatusPill theme={theme}>{payment.mode.toUpperCase()}</StatusPill>
                    </div>
                  </div>
                ))}
              </div>
            </ScreenCard>
          </div>
        </>
      ) : null}

      {!loading && snapshot && tab === "my" ? (
        <>
          {!address ? <EmptyState theme={theme} title="Unlock your wallet to load My Mining" description="The pool panel uses the unlocked INRI Wallet address automatically to show your personal hashrate, workers and payments." /> : null}
          {address && myMiner ? (
            <>
              <div className="wallet-pool-kpi-grid">
                <MetricTile theme={theme} label="Current" value={formatHashrate(myMiner.currentHashrate)} tone="primary" />
                <MetricTile theme={theme} label="10m avg" value={formatHashrate(myMiner.avg10m)} />
                <MetricTile theme={theme} label="1h avg" value={formatHashrate(myMiner.avg1h)} />
                <MetricTile theme={theme} label="24h avg" value={formatHashrate(myMiner.avg24h)} />
                <MetricTile theme={theme} label="Pending" value={formatINRI(myMiner.pending)} tone="warning" />
                <MetricTile theme={theme} label="Total paid" value={formatINRI(myMiner.totalPaid)} tone="success" />
              </div>
              <ScreenCard theme={theme}>
                <SectionTitle title="My mining" subtitle={`Bound automatically to ${shortAddress(address)}`} theme={theme} actions={<div className="wallet-action-row">{explorerLink("Address", poolAddressUrl(address), theme)}</div>} />
                <div className="wallet-pool-main-grid">
                  <div>
                    <div className="wallet-pool-payout-track"><div className="wallet-pool-payout-fill" style={{ width: `${Math.round(myProgress * 100)}%` }} /></div>
                    <div className="wallet-ui-subtle" style={{ marginTop: 8 }}>Progress to next payout • {Math.round(myProgress * 100)}%</div>
                    <div className="wallet-pool-compact-list" style={{ marginTop: 12 }}>
                      <div className="wallet-pool-compact-item"><span>Valid shares</span><strong>{myMiner.validShares.toLocaleString()}</strong></div>
                      <div className="wallet-pool-compact-item"><span>Invalid shares</span><strong>{myMiner.invalidShares.toLocaleString()}</strong></div>
                      <div className="wallet-pool-compact-item"><span>Blocks found</span><strong>{myMiner.blocksFound}</strong></div>
                      <div className="wallet-pool-compact-item"><span>Last payout</span><strong>{myMiner.lastPaymentAt ? timeAgo(myMiner.lastPaymentAt) : "—"}</strong></div>
                    </div>
                  </div>
                  <div>
                    <div className="wallet-pool-workers-grid">
                      {myMiner.workers.map((worker) => (
                        <div key={worker.name} className="wallet-pool-worker-card">
                          <div className="wallet-action-row" style={{ justifyContent: "space-between" }}>
                            <strong>{worker.name}</strong>
                            <StatusPill theme={theme} tone={worker.online ? "success" : "danger"}>{worker.online ? "Online" : "Offline"}</StatusPill>
                          </div>
                          <div className="wallet-pool-large" style={{ fontSize: 18 }}>{formatHashrate(worker.hashrate)}</div>
                          <div className="wallet-ui-subtle">Last seen {timeAgo(worker.lastSeenAt)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScreenCard>
              <div className="wallet-pool-main-grid">
                <ScreenCard theme={theme}>
                  <SectionTitle title="My payments" subtitle="Recent settlements for this wallet" theme={theme} />
                  <div className="wallet-pool-stack-list">
                    {myMiner.payments.length ? myMiner.payments.map((payment) => (
                      <div key={payment.id} className="wallet-pool-stream-row">
                        <div>
                          <div style={{ fontWeight: 900 }}>{formatINRI(payment.amount)}</div>
                          <div className="wallet-ui-subtle">{timeAgo(payment.createdAt)} • {payment.mode.toUpperCase()}</div>
                        </div>
                        {explorerLink("Tx", poolTxUrl(payment.txHash), theme)}
                      </div>
                    )) : <EmptyState theme={theme} title="No payouts yet" description="As soon as this address receives pool payments they will show up here." />}
                  </div>
                </ScreenCard>
                <ScreenCard theme={theme}>
                  <SectionTitle title="Blocks by my address" subtitle="Block finds attributed to your miner" theme={theme} />
                  <div className="wallet-pool-stack-list">
                    {myMiner.blocks.length ? myMiner.blocks.map((block) => (
                      <div key={block.id} className="wallet-pool-stream-row">
                        <div>
                          <div style={{ fontWeight: 900 }}>#{block.height}</div>
                          <div className="wallet-ui-subtle">{block.mode.toUpperCase()} • {timeAgo(block.createdAt)}</div>
                        </div>
                        <StatusTone status={block.status} theme={theme} />
                      </div>
                    )) : <EmptyState theme={theme} title="No blocks found yet" description="Your personal finds will appear here when this address or its workers hit blocks." />}
                  </div>
                </ScreenCard>
              </div>
            </>
          ) : null}
        </>
      ) : null}

      {!loading && snapshot && tab === "blocks" ? (
        <ScreenCard theme={theme}>
          <SectionTitle title="Blocks" subtitle="Clean table with block state, type, effort and explorer links" theme={theme} actions={<div className="wallet-action-row"><ActionButton theme={theme} compact tone={blockMode === "all" ? "primary" : "secondary"} onClick={() => setBlockMode("all")}>All</ActionButton><ActionButton theme={theme} compact tone={blockMode === "pplns" ? "primary" : "secondary"} onClick={() => setBlockMode("pplns")}>PPLNS</ActionButton><ActionButton theme={theme} compact tone={blockMode === "solo" ? "primary" : "secondary"} onClick={() => setBlockMode("solo")}>SOLO</ActionButton></div>} />
          <TableShell>
            <table className="wallet-pool-table">
              <thead><tr><th>Height</th><th>Miner</th><th>Reward</th><th>Status</th><th>Type</th><th>Conf.</th><th>Luck</th><th>When</th><th></th></tr></thead>
              <tbody>
                {filteredBlocks.map((block) => (
                  <tr key={block.id}>
                    <td>#{block.height}</td>
                    <td>{shortAddress(block.miner)}</td>
                    <td>{formatINRI(block.reward)}</td>
                    <td><StatusTone status={block.status} theme={theme} /></td>
                    <td><StatusPill theme={theme} tone={block.mode === "solo" ? "warning" : "primary"}>{block.mode.toUpperCase()}</StatusPill></td>
                    <td>{block.confirmations}</td>
                    <td>{block.effort}%</td>
                    <td>{timeAgo(block.createdAt)}</td>
                    <td>{block.txHash ? explorerLink("Explorer", poolTxUrl(block.txHash), theme) : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </ScreenCard>
      ) : null}

      {!loading && snapshot && tab === "payments" ? (
        <>
          <ScreenCard theme={theme}>
            <SectionTitle title="Payments" subtitle="Recent settlements with filters for pool mode and your wallet" theme={theme} actions={<div className="wallet-action-row"><ActionButton theme={theme} compact tone={paymentMode === "all" ? "primary" : "secondary"} onClick={() => setPaymentMode("all")}>All</ActionButton><ActionButton theme={theme} compact tone={paymentMode === "pplns" ? "primary" : "secondary"} onClick={() => setPaymentMode("pplns")}>PPLNS</ActionButton><ActionButton theme={theme} compact tone={paymentMode === "solo" ? "primary" : "secondary"} onClick={() => setPaymentMode("solo")}>SOLO</ActionButton>{address ? <ActionButton theme={theme} compact tone={paymentMode === "mine" ? "primary" : "secondary"} onClick={() => setPaymentMode("mine")}>My address</ActionButton> : null}</div>} />
            <TableShell>
              <table className="wallet-pool-table">
                <thead><tr><th>Address</th><th>Amount</th><th>Tx hash</th><th>Date</th><th>Mode</th><th></th></tr></thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className={payment.isFeeWallet ? "wallet-pool-highlight-row" : ""}>
                      <td>{shortAddress(payment.address)}</td>
                      <td>{formatINRI(payment.amount)}</td>
                      <td>{shortAddress(payment.txHash)}</td>
                      <td>{timeAgo(payment.createdAt)}</td>
                      <td><div className="wallet-action-row">{payment.isFeeWallet ? <StatusPill theme={theme} tone="warning">Fee wallet</StatusPill> : null}<StatusPill theme={theme}>{payment.mode.toUpperCase()}</StatusPill></div></td>
                      <td>{explorerLink("Tx", poolTxUrl(payment.txHash), theme)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </ScreenCard>
          <ScreenCard theme={theme}>
            <SectionTitle title="Fee wallet transparency" subtitle={`2% fee wallet tracked openly • ${shortAddress(meta.feeWallet)}`} theme={theme} actions={<div className="wallet-action-row">{explorerLink("Wallet", poolAddressUrl(meta.feeWallet), theme)}</div>} />
            <div className="wallet-pool-stack-list">
              {feePayments.map((payment) => (
                <div key={payment.id} className="wallet-pool-stream-row">
                  <div>
                    <div style={{ fontWeight: 900 }}>{formatINRI(payment.amount)}</div>
                    <div className="wallet-ui-subtle">{timeAgo(payment.createdAt)} • {shortAddress(payment.txHash)}</div>
                  </div>
                  <div className="wallet-action-row">
                    <StatusPill theme={theme} tone="warning">2% fee</StatusPill>
                    {explorerLink("Tx", poolTxUrl(payment.txHash), theme)}
                  </div>
                </div>
              ))}
            </div>
          </ScreenCard>
        </>
      ) : null}

      {!loading && snapshot && tab === "leaders" ? (
        <div className="wallet-pool-main-grid">
          <ScreenCard theme={theme}>
            <SectionTitle title="Top miners" subtitle="The strongest addresses by hashrate and payout throughput" theme={theme} />
            <div className="wallet-pool-rank-list">
              {snapshot.topMiners.map((miner, idx) => (
                <div key={miner.address} className="wallet-pool-rank-card">
                  <div className="wallet-action-row" style={{ justifyContent: "space-between" }}>
                    <div className="wallet-pool-rank-badge">#{idx + 1}</div>
                    {miner.address.toLowerCase() === meta.feeWallet.toLowerCase() ? <StatusPill theme={theme} tone="warning">Fee wallet</StatusPill> : null}
                  </div>
                  <div style={{ fontWeight: 900 }}>{shortAddress(miner.address)}</div>
                  <div className="wallet-pool-large" style={{ fontSize: 18 }}>{formatHashrate(miner.hashrate)}</div>
                  <div className="wallet-ui-subtle">{miner.workers} workers • Paid {formatINRI(miner.paid)}</div>
                </div>
              ))}
            </div>
          </ScreenCard>
          <ScreenCard theme={theme}>
            <SectionTitle title="Top workers" subtitle="Fast scan of worker performance and presence" theme={theme} />
            <div className="wallet-pool-stack-list">
              {snapshot.topWorkers.map((worker, idx) => (
                <div key={worker.name + idx} className="wallet-pool-stream-row">
                  <div>
                    <div style={{ fontWeight: 900 }}>{worker.name}</div>
                    <div className="wallet-ui-subtle">{shortAddress(worker.miner)}</div>
                  </div>
                  <div className="wallet-action-row">
                    <div style={{ fontWeight: 900 }}>{formatHashrate(worker.hashrate)}</div>
                    <StatusPill theme={theme} tone={worker.online ? "success" : "danger"}>{worker.online ? "Online" : "Offline"}</StatusPill>
                  </div>
                </div>
              ))}
            </div>
          </ScreenCard>
        </div>
      ) : null}

      {!loading && snapshot && tab === "setup" ? (
        <ScreenCard theme={theme}>
          <SectionTitle title="Mine from inside the wallet" subtitle="Copy-ready setup for PPLNS and SOLO without leaving INRI Wallet" theme={theme} />
          <div className="wallet-pool-main-grid">
            <div className="wallet-pool-setup-block">
              <div className="wallet-pool-kicker">PPLNS</div>
              <div className="wallet-pool-large" style={{ fontSize: 20 }}>{meta.host}:{meta.pplnsPort}</div>
              <div className="wallet-ui-subtle">Worker: <strong>{address || "YOUR_WALLET_ADDRESS"}</strong>.rig01</div>
              <div className="wallet-ui-subtle">Password: x</div>
              <textarea readOnly value={`stratum+tcp://${meta.host}:${meta.pplnsPort}\nuser=${address || "YOUR_WALLET_ADDRESS"}.rig01\npass=x`} className={`wallet-ui-input ${isLight ? "light" : ""}`} style={{ minHeight: 110 }} />
              <div className="wallet-action-row"><ActionButton theme={theme} compact onClick={() => navigator.clipboard.writeText(`stratum+tcp://${meta.host}:${meta.pplnsPort}`)}>Copy host</ActionButton><ActionButton theme={theme} compact tone="ghost" onClick={() => navigator.clipboard.writeText(address || "YOUR_WALLET_ADDRESS")}>Copy wallet</ActionButton></div>
            </div>
            <div className="wallet-pool-setup-block">
              <div className="wallet-pool-kicker">SOLO</div>
              <div className="wallet-pool-large" style={{ fontSize: 20 }}>{meta.host}:{meta.soloPort}</div>
              <div className="wallet-ui-subtle">Worker: <strong>{address || "YOUR_WALLET_ADDRESS"}</strong>.solo01</div>
              <div className="wallet-ui-subtle">Password: x</div>
              <textarea readOnly value={`stratum+tcp://${meta.host}:${meta.soloPort}\nuser=${address || "YOUR_WALLET_ADDRESS"}.solo01\npass=x`} className={`wallet-ui-input ${isLight ? "light" : ""}`} style={{ minHeight: 110 }} />
              <div className="wallet-action-row"><ActionButton theme={theme} compact onClick={() => navigator.clipboard.writeText(`stratum+tcp://${meta.host}:${meta.soloPort}`)}>Copy host</ActionButton><ActionButton theme={theme} compact tone="ghost" onClick={() => navigator.clipboard.writeText(address || "YOUR_WALLET_ADDRESS")}>Copy wallet</ActionButton></div>
            </div>
          </div>
        </ScreenCard>
      ) : null}

      {!loading && snapshot && tab === "transparency" ? (
        <div className="wallet-pool-main-grid">
          <ScreenCard theme={theme}>
            <SectionTitle title="Pool economics" subtitle="Transparent fee and payout policy" theme={theme} />
            <div className="wallet-pool-compact-list">
              <div className="wallet-pool-compact-item"><span>Fee</span><strong>{snapshot.overview.feePercent.toFixed(2)}%</strong></div>
              <div className="wallet-pool-compact-item"><span>Fee wallet</span><strong>{shortAddress(snapshot.overview.feeWallet)}</strong></div>
              <div className="wallet-pool-compact-item"><span>Min payout</span><strong>{formatINRI(snapshot.overview.minPayout)}</strong></div>
              <div className="wallet-pool-compact-item"><span>PPLNS</span><strong>Enabled</strong></div>
              <div className="wallet-pool-compact-item"><span>SOLO</span><strong>Enabled</strong></div>
            </div>
          </ScreenCard>
          <ScreenCard theme={theme}>
            <SectionTitle title="Fee wallet activity" subtitle="A dedicated transparency panel instead of hidden operator flow" theme={theme} actions={<div className="wallet-action-row">{explorerLink("Open address", poolAddressUrl(snapshot.overview.feeWallet), theme)}</div>} />
            <div className="wallet-pool-stack-list">
              {feePayments.map((payment) => (
                <div key={payment.id} className="wallet-pool-stream-row">
                  <div>
                    <div style={{ fontWeight: 900 }}>{formatINRI(payment.amount)}</div>
                    <div className="wallet-ui-subtle">{timeAgo(payment.createdAt)} • {shortAddress(payment.txHash)}</div>
                  </div>
                  {explorerLink("Tx", poolTxUrl(payment.txHash), theme)}
                </div>
              ))}
            </div>
          </ScreenCard>
        </div>
      ) : null}
    </div>
  );
}
