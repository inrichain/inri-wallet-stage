import React, { useEffect, useMemo, useState } from "react";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import StatusPill from "../components/StatusPill";
import ActionButton from "../components/ActionButton";
import EmptyState from "../components/EmptyState";
import {
  buildMinerCommand,
  fetchPoolSnapshot,
  formatCoin,
  formatDifficulty,
  formatHashrate,
  formatPercent,
  formatRelativeTime,
  getBlockExplorerUrl,
  getTxExplorerUrl,
  type PoolBlock,
  type PoolMode,
  type PoolPayment,
  type PoolSnapshot,
} from "../lib/pool";

type PoolTab = "overview" | "mining" | "blocks" | "payments" | "top" | "setup";

const tabs: Array<{ id: PoolTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "mining", label: "My Mining" },
  { id: "blocks", label: "Blocks" },
  { id: "payments", label: "Payments" },
  { id: "top", label: "Top Miners" },
  { id: "setup", label: "Setup" },
];

function Sparkline({ values, theme = "dark" }: { values: number[]; theme?: "dark" | "light" }) {
  const isLight = theme === "light";
  const safe = values.length ? values : [0, 0, 0, 0];
  const max = Math.max(...safe);
  const min = Math.min(...safe);
  const range = max - min || 1;
  const points = safe
    .map((value, index) => {
      const x = (index / Math.max(safe.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="wallet-pool-sparkline" aria-hidden="true">
      <defs>
        <linearGradient id={`pool-line-${theme}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5da1ff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#5da1ff" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={isLight ? "#2f6fff" : "#6ea0ff"} strokeWidth="3.2" points={points} />
      <polygon fill={`url(#pool-line-${theme})`} points={`0,100 ${points} 100,100`} />
    </svg>
  );
}

function copyText(value: string) {
  navigator.clipboard?.writeText(value).catch(() => {});
}

function StatCard({ theme, title, value, hint, tone = "neutral" }: { theme?: "dark" | "light"; title: string; value: string; hint?: string; tone?: "neutral" | "primary" | "success" | "warning"; }) {
  const isLight = theme === "light";
  return (
    <div className="wallet-pool-stat-card" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
      <div className="wallet-pool-stat-top">
        <div className="wallet-ui-subtle" style={{ fontSize: 12 }}>{title}</div>
        <StatusPill theme={theme} tone={tone}>{tone === "success" ? "Live" : tone === "warning" ? "Watch" : tone === "primary" ? "Core" : "Info"}</StatusPill>
      </div>
      <div className="wallet-pool-stat-value" style={{ color: isLight ? "#10131a" : "#ffffff" }}>{value}</div>
      {hint ? <div className="wallet-ui-subtle">{hint}</div> : null}
    </div>
  );
}

function RowBadge({ theme, value }: { theme?: "dark" | "light"; value: string }) {
  const lower = value.toLowerCase();
  const tone = lower.includes("online") || lower.includes("confirmed") ? "success" : lower.includes("pending") ? "warning" : lower.includes("orphan") || lower.includes("offline") ? "danger" : "neutral";
  return <StatusPill theme={theme} tone={tone as any}>{value}</StatusPill>;
}

export default function PoolScreen({ theme = "dark", address = "", setTab }: { theme?: "dark" | "light"; lang?: string; address?: string; setTab?: (tab: any) => void; }) {
  const [tab, setLocalTab] = useState<PoolTab>("overview");
  const [modeFilter, setModeFilter] = useState<"all" | PoolMode>("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | PoolMode | "mine">("all");
  const [snapshot, setSnapshot] = useState<PoolSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workerName, setWorkerName] = useState("rig-01");
  const isLight = theme === "light";

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const next = await fetchPoolSnapshot(address);
        if (!active) return;
        setSnapshot(next);
        setError("");
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "Failed to load pool data");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    const timer = window.setInterval(load, 8000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [address]);

  const overview = snapshot?.overview;
  const myMiner = snapshot?.miner || null;

  const filteredBlocks = useMemo(() => {
    const list = snapshot?.blocks || [];
    if (modeFilter === "all") return list;
    return list.filter((item) => item.mode === modeFilter);
  }, [snapshot, modeFilter]);

  const filteredPayments = useMemo(() => {
    const list = snapshot?.payments || [];
    if (paymentFilter === "mine") return address ? list.filter((item) => item.address.toLowerCase() === address.toLowerCase()) : [];
    if (paymentFilter === "all") return list;
    return list.filter((item) => item.mode === paymentFilter);
  }, [snapshot, paymentFilter, address]);

  const recentFeePayments = snapshot?.transparency.payments || [];
  const topChart = overview?.chart.map((item) => item.hashrate) || [];

  if (loading && !snapshot) {
    return (
      <div className="wallet-screen-stack wallet-screen-mobile-tight">
        <ScreenCard theme={theme}>
          <SectionTitle title="Pool INRI" subtitle="Loading live pool telemetry and miner data…" theme={theme} />
          <div className="wallet-skeleton-list">
            <div className="wallet-skeleton-card" />
            <div className="wallet-skeleton-card" />
            <div className="wallet-skeleton-card" />
          </div>
        </ScreenCard>
      </div>
    );
  }

  if (!snapshot || !overview) {
    return (
      <div className="wallet-screen-stack wallet-screen-mobile-tight">
        <ScreenCard theme={theme}>
          <EmptyState theme={theme} title="Pool data unavailable" description={error || "Connect your pool API to bring overview, blocks, payments and miner stats online."} />
        </ScreenCard>
      </div>
    );
  }

  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme} className="wallet-pool-hero">
        <SectionTitle
          title="Pool INRI"
          subtitle="Real-time premium mining panel inside the wallet, with public pool stats and automatic My Mining for the unlocked address."
          theme={theme}
          actions={
            <>
              <StatusPill theme={theme} tone={overview.poolOnline ? "success" : "danger"}>{overview.poolOnline ? "Pool online" : "Pool offline"}</StatusPill>
              <StatusPill theme={theme} tone={overview.nodeOnline ? "success" : "warning"}>{overview.nodeOnline ? "Node synced" : "Node watch"}</StatusPill>
              <StatusPill theme={theme} tone="primary">Fee {formatPercent(overview.feePercent)}</StatusPill>
            </>
          }
        />

        <div className="wallet-pool-hero-grid">
          <div className="wallet-pool-route-card" style={{ background: isLight ? "linear-gradient(180deg,#f7faff 0%, #edf4ff 100%)" : "linear-gradient(180deg,#121c30 0%, #0d1522 100%)" }}>
            <div className="wallet-pool-route-top">
              <div>
                <div className="wallet-ui-subtle">Pool hashrate</div>
                <div className="wallet-pool-route-value">{formatHashrate(overview.poolHashrate)}</div>
              </div>
              <div className="wallet-pool-arrow">⟷</div>
              <div style={{ textAlign: "right" }}>
                <div className="wallet-ui-subtle">Network hashrate</div>
                <div className="wallet-pool-route-value">{formatHashrate(overview.networkHashrate)}</div>
              </div>
            </div>
            <div className="wallet-pool-substats">
              <div><span>Height</span><strong>{overview.currentHeight.toLocaleString()}</strong></div>
              <div><span>Difficulty</span><strong>{formatDifficulty(overview.networkDifficulty)}</strong></div>
              <div><span>Luck / Effort</span><strong>{formatPercent(overview.luckPercent)} / {formatPercent(overview.effortPercent)}</strong></div>
              <div><span>Fee wallet</span><strong>{overview.feeWalletAddress.slice(0, 8)}…{overview.feeWalletAddress.slice(-4)}</strong></div>
            </div>
            <Sparkline values={topChart} theme={theme} />
          </div>

          <div className="wallet-pool-mode-stack">
            {overview.modes.map((mode) => (
              <div key={mode.mode} className="wallet-pool-mode-card" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
                <div className="wallet-pool-mode-head">
                  <div>
                    <div className="wallet-ui-subtle">{mode.mode.toUpperCase()}</div>
                    <div className="wallet-pool-mode-value">{formatHashrate(mode.hashrate)}</div>
                  </div>
                  <StatusPill theme={theme} tone={mode.mode === "solo" ? "warning" : "primary"}>{mode.mode.toUpperCase()}</StatusPill>
                </div>
                <div className="wallet-pool-mini-grid">
                  <div><span>Miners</span><strong>{mode.miners}</strong></div>
                  <div><span>Workers</span><strong>{mode.workers}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="wallet-home-actions-grid wallet-home-actions-grid-single">
          <ActionButton onClick={() => setLocalTab("overview")} theme={theme} tone={tab === "overview" ? "primary" : "secondary"} compact>Overview</ActionButton>
          <ActionButton onClick={() => setLocalTab("mining")} theme={theme} tone={tab === "mining" ? "primary" : "secondary"} compact>My Mining</ActionButton>
          <ActionButton onClick={() => setLocalTab("blocks")} theme={theme} tone={tab === "blocks" ? "primary" : "secondary"} compact>Blocks</ActionButton>
          <ActionButton onClick={() => setLocalTab("payments")} theme={theme} tone={tab === "payments" ? "primary" : "secondary"} compact>Payments</ActionButton>
          <ActionButton onClick={() => setLocalTab("top")} theme={theme} tone={tab === "top" ? "primary" : "secondary"} compact>Top Miners</ActionButton>
          <ActionButton onClick={() => setLocalTab("setup")} theme={theme} tone={tab === "setup" ? "primary" : "secondary"} compact>Setup</ActionButton>
        </div>
      </ScreenCard>

      {tab === "overview" ? (
        <>
          <div className="wallet-pool-grid-4">
            <StatCard theme={theme} title="Active miners" value={String(overview.activeMiners)} hint="Unique mining addresses online" tone="primary" />
            <StatCard theme={theme} title="Active workers" value={String(overview.activeWorkers)} hint="Workers reporting shares" tone="success" />
            <StatCard theme={theme} title="Blocks" value={`${overview.confirmedBlocks} confirmed`} hint={`${overview.pendingBlocks} pending · ${overview.orphanedBlocks} orphaned`} tone="warning" />
            <StatCard theme={theme} title="Fee transparency" value={`${formatPercent(overview.feeWalletPercent)} wallet`} hint="Treasury wallet visible in-app" tone="neutral" />
          </div>

          <div className="wallet-pool-grid-2">
            <ScreenCard theme={theme}>
              <SectionTitle title="Recent blocks" subtitle="Fresh block flow from PPLNS and SOLO in one place." theme={theme} actions={<ActionButton onClick={() => setLocalTab("blocks")} theme={theme} compact>Open blocks</ActionButton>} />
              <div className="wallet-pool-table-wrap">
                <table className="wallet-pool-table">
                  <thead>
                    <tr><th>Height</th><th>Miner</th><th>Status</th><th>Type</th><th>Reward</th><th>When</th></tr>
                  </thead>
                  <tbody>
                    {snapshot.blocks.slice(0, 6).map((block) => (
                      <tr key={block.id}>
                        <td><a href={getBlockExplorerUrl(block)} target="_blank" rel="noreferrer">#{block.height}</a></td>
                        <td>{block.miner.slice(0, 6)}…{block.miner.slice(-4)}</td>
                        <td><RowBadge theme={theme} value={block.status} /></td>
                        <td>{block.mode.toUpperCase()}</td>
                        <td>{formatCoin(block.reward)}</td>
                        <td>{formatRelativeTime(block.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScreenCard>

            <ScreenCard theme={theme}>
              <SectionTitle title="Fee wallet transparency" subtitle="2% fee wallet fully visible with recent income and linked address." theme={theme} actions={<ActionButton onClick={() => copyText(snapshot.transparency.walletAddress)} theme={theme} compact>Copy wallet</ActionButton>} />
              <div className="wallet-pool-transparency-box" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
                <div className="wallet-ui-subtle">Fee wallet</div>
                <div className="wallet-pool-wallet-address">{snapshot.transparency.walletAddress}</div>
                <div className="wallet-action-row">
                  <StatusPill theme={theme} tone="primary">Pool fee {formatPercent(overview.feePercent)}</StatusPill>
                  <StatusPill theme={theme} tone="warning">Fee wallet {formatPercent(snapshot.transparency.feePercent)}</StatusPill>
                </div>
              </div>
              <div className="wallet-pool-compact-list">
                {recentFeePayments.slice(0, 4).map((payment) => (
                  <a key={payment.id} href={getTxExplorerUrl(payment)} target="_blank" rel="noreferrer" className="wallet-pool-compact-row" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{formatCoin(payment.amount)}</div>
                      <div className="wallet-ui-subtle">{formatRelativeTime(payment.createdAt)}</div>
                    </div>
                    <div className="wallet-ui-subtle">{payment.txHash.slice(0, 8)}…{payment.txHash.slice(-4)}</div>
                  </a>
                ))}
              </div>
            </ScreenCard>
          </div>
        </>
      ) : null}

      {tab === "mining" ? (
        <>
          {!address ? (
            <ScreenCard theme={theme}>
              <EmptyState theme={theme} title="Unlock wallet to see My Mining" description="The personal mining view automatically uses the unlocked wallet address for workers, pending balance, payouts and found blocks." />
            </ScreenCard>
          ) : myMiner ? (
            <>
              <div className="wallet-pool-grid-4">
                <StatCard theme={theme} title="Current hashrate" value={formatHashrate(myMiner.currentHashrate)} hint={`10m ${formatHashrate(myMiner.avg10m)}`} tone="primary" />
                <StatCard theme={theme} title="Pending balance" value={formatCoin(myMiner.pendingBalance)} hint={`Payout at ${formatCoin(overview.minimumPayout)}`} tone="warning" />
                <StatCard theme={theme} title="Total paid" value={formatCoin(myMiner.totalPaid)} hint={`Last ${formatCoin(myMiner.lastPaymentAmount)}`} tone="success" />
                <StatCard theme={theme} title="Shares" value={`${myMiner.validShares.toLocaleString()} valid`} hint={`${myMiner.invalidShares.toLocaleString()} invalid`} tone="neutral" />
              </div>

              <ScreenCard theme={theme}>
                <SectionTitle title="My Mining" subtitle="Automatic stats for the unlocked wallet address, including workers, payout progress and address-specific history." theme={theme} actions={<StatusPill theme={theme} tone="primary">{address.slice(0, 6)}…{address.slice(-4)}</StatusPill>} />
                <div className="wallet-pool-grid-2">
                  <div className="wallet-pool-progress-card" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
                    <div className="wallet-ui-subtle">Next payout progress</div>
                    <div className="wallet-pool-progress-number">{Math.round(myMiner.payoutProgressPercent)}%</div>
                    <div className="wallet-pool-progress-track"><div style={{ width: `${Math.max(6, myMiner.payoutProgressPercent)}%` }} /></div>
                    <div className="wallet-pool-mini-grid">
                      <div><span>Workers</span><strong>{myMiner.workersOnline} online / {myMiner.workersOffline} offline</strong></div>
                      <div><span>Blocks found</span><strong>{myMiner.blocksFound}</strong></div>
                      <div><span>Avg 1h</span><strong>{formatHashrate(myMiner.avg1h)}</strong></div>
                      <div><span>Avg 24h</span><strong>{formatHashrate(myMiner.avg24h)}</strong></div>
                    </div>
                  </div>
                  <div className="wallet-pool-compact-list">
                    {myMiner.workers.map((worker) => (
                      <div key={worker.id} className="wallet-pool-compact-row" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
                        <div>
                          <div style={{ fontWeight: 800 }}>{worker.name}</div>
                          <div className="wallet-ui-subtle">{formatHashrate(worker.hashrate)} · valid {worker.validShares.toLocaleString()}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <RowBadge theme={theme} value={worker.status} />
                          <div className="wallet-ui-subtle" style={{ marginTop: 6 }}>{formatRelativeTime(worker.lastSeenAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScreenCard>

              <div className="wallet-pool-grid-2">
                <ScreenCard theme={theme}>
                  <SectionTitle title="My Payments" subtitle="Recent payouts for the unlocked address." theme={theme} />
                  <div className="wallet-pool-table-wrap">
                    <table className="wallet-pool-table">
                      <thead><tr><th>Amount</th><th>Tx</th><th>Date</th><th>Mode</th></tr></thead>
                      <tbody>
                        {myMiner.payments.map((payment) => (
                          <tr key={payment.id}>
                            <td>{formatCoin(payment.amount)}</td>
                            <td><a href={getTxExplorerUrl(payment)} target="_blank" rel="noreferrer">{payment.txHash.slice(0, 10)}…</a></td>
                            <td>{formatRelativeTime(payment.createdAt)}</td>
                            <td>{payment.mode.toUpperCase()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ScreenCard>

                <ScreenCard theme={theme}>
                  <SectionTitle title="Blocks found by my address" subtitle="Your personal found-block feed from the current unlocked wallet." theme={theme} />
                  <div className="wallet-pool-compact-list">
                    {myMiner.blocks.length ? myMiner.blocks.map((block) => (
                      <a key={block.id} className="wallet-pool-compact-row" href={getBlockExplorerUrl(block)} target="_blank" rel="noreferrer" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
                        <div>
                          <div style={{ fontWeight: 800 }}>#{block.height}</div>
                          <div className="wallet-ui-subtle">{formatCoin(block.reward)} · {block.mode.toUpperCase()}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <RowBadge theme={theme} value={block.status} />
                          <div className="wallet-ui-subtle" style={{ marginTop: 6 }}>{formatRelativeTime(block.createdAt)}</div>
                        </div>
                      </a>
                    )) : <EmptyState theme={theme} title="No blocks yet" description="As soon as this address finds blocks, they will appear here automatically." />}
                  </div>
                </ScreenCard>
              </div>
            </>
          ) : null}
        </>
      ) : null}

      {tab === "blocks" ? (
        <ScreenCard theme={theme}>
          <SectionTitle title="Blocks" subtitle="Premium real-time block table with PPLNS and SOLO filtering, explorer links and luck/effort visibility." theme={theme} actions={
            <>
              <ActionButton onClick={() => setModeFilter("all")} theme={theme} tone={modeFilter === "all" ? "primary" : "secondary"} compact>All</ActionButton>
              <ActionButton onClick={() => setModeFilter("pplns")} theme={theme} tone={modeFilter === "pplns" ? "primary" : "secondary"} compact>PPLNS</ActionButton>
              <ActionButton onClick={() => setModeFilter("solo")} theme={theme} tone={modeFilter === "solo" ? "primary" : "secondary"} compact>SOLO</ActionButton>
            </>
          } />
          <div className="wallet-pool-table-wrap">
            <table className="wallet-pool-table">
              <thead>
                <tr><th>Height</th><th>Miner</th><th>Reward</th><th>Status</th><th>Type</th><th>Confs</th><th>Luck</th><th>Effort</th><th>Created</th></tr>
              </thead>
              <tbody>
                {filteredBlocks.map((block) => (
                  <tr key={block.id}>
                    <td><a href={getBlockExplorerUrl(block)} target="_blank" rel="noreferrer">#{block.height}</a></td>
                    <td>{block.miner.slice(0, 6)}…{block.miner.slice(-4)}</td>
                    <td>{formatCoin(block.reward)}</td>
                    <td><RowBadge theme={theme} value={block.status} /></td>
                    <td>{block.mode.toUpperCase()}</td>
                    <td>{block.confirmations}</td>
                    <td>{formatPercent(block.luckPercent)}</td>
                    <td>{formatPercent(block.effortPercent)}</td>
                    <td>{formatRelativeTime(block.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScreenCard>
      ) : null}

      {tab === "payments" ? (
        <div className="wallet-pool-grid-2">
          <ScreenCard theme={theme}>
            <SectionTitle title="Payments" subtitle="Pool payouts in real time, with filters for PPLNS, SOLO and the unlocked wallet." theme={theme} actions={
              <>
                <ActionButton onClick={() => setPaymentFilter("all")} theme={theme} tone={paymentFilter === "all" ? "primary" : "secondary"} compact>All</ActionButton>
                <ActionButton onClick={() => setPaymentFilter("pplns")} theme={theme} tone={paymentFilter === "pplns" ? "primary" : "secondary"} compact>PPLNS</ActionButton>
                <ActionButton onClick={() => setPaymentFilter("solo")} theme={theme} tone={paymentFilter === "solo" ? "primary" : "secondary"} compact>SOLO</ActionButton>
                <ActionButton onClick={() => setPaymentFilter("mine")} theme={theme} tone={paymentFilter === "mine" ? "primary" : "secondary"} compact disabled={!address}>My address</ActionButton>
              </>
            } />
            <div className="wallet-pool-table-wrap">
              <table className="wallet-pool-table">
                <thead><tr><th>Address</th><th>Amount</th><th>Tx</th><th>Date</th><th>Mode</th></tr></thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className={Date.now() - payment.createdAt < 3600000 ? "wallet-pool-row-fresh" : ""}>
                      <td>{payment.address.slice(0, 6)}…{payment.address.slice(-4)}</td>
                      <td>{formatCoin(payment.amount)}</td>
                      <td><a href={getTxExplorerUrl(payment)} target="_blank" rel="noreferrer">{payment.txHash.slice(0, 10)}…</a></td>
                      <td>{formatRelativeTime(payment.createdAt)}</td>
                      <td>{payment.mode.toUpperCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScreenCard>

          <ScreenCard theme={theme}>
            <SectionTitle title="Fee wallet payments" subtitle="Dedicated transparency section for the 2% fee wallet and recent treasury inflows." theme={theme} />
            <div className="wallet-pool-compact-list">
              {recentFeePayments.length ? recentFeePayments.map((payment) => (
                <a key={payment.id} href={getTxExplorerUrl(payment)} target="_blank" rel="noreferrer" className="wallet-pool-compact-row" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{formatCoin(payment.amount)}</div>
                    <div className="wallet-ui-subtle">{payment.address.slice(0, 6)}…{payment.address.slice(-4)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <StatusPill theme={theme} tone="warning">Fee wallet</StatusPill>
                    <div className="wallet-ui-subtle" style={{ marginTop: 6 }}>{formatRelativeTime(payment.createdAt)}</div>
                  </div>
                </a>
              )) : <EmptyState theme={theme} title="No fee payments yet" description="The fee wallet feed will appear here automatically once the API returns recent fee distributions." />}
            </div>
          </ScreenCard>
        </div>
      ) : null}

      {tab === "top" ? (
        <div className="wallet-pool-grid-2">
          <ScreenCard theme={theme}>
            <SectionTitle title="Top miners" subtitle="Premium ranking with performance, workers and mode mix." theme={theme} />
            <div className="wallet-pool-rank-list">
              {snapshot.topMiners.map((miner, index) => (
                <div key={miner.address} className="wallet-pool-rank-card" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
                  <div className="wallet-pool-rank-position">#{index + 1}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="wallet-pool-rank-title">{miner.label}</div>
                    <div className="wallet-ui-subtle">{miner.address.slice(0, 6)}…{miner.address.slice(-4)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="wallet-pool-rank-metric">{formatHashrate(miner.hashrate)}</div>
                    <div className="wallet-ui-subtle">{miner.workers} workers · {miner.blocksFound} blocks</div>
                  </div>
                  <div className="wallet-action-row">
                    <StatusPill theme={theme} tone="primary">{miner.mode.toUpperCase()}</StatusPill>
                    <StatusPill theme={theme} tone={miner.efficiencyPercent >= 92 ? "success" : "warning"}>{miner.efficiencyPercent}% perf</StatusPill>
                  </div>
                </div>
              ))}
            </div>
          </ScreenCard>

          <ScreenCard theme={theme}>
            <SectionTitle title="Top workers" subtitle="High-performing workers, online status and clean ranking without dashboard clutter." theme={theme} />
            <div className="wallet-pool-compact-list">
              {snapshot.topWorkers.map((worker, index) => (
                <div key={`${worker.name}-${index}`} className="wallet-pool-compact-row" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{worker.name}</div>
                    <div className="wallet-ui-subtle">{worker.miner.slice(0, 6)}…{worker.miner.slice(-4)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800 }}>{formatHashrate(worker.hashrate)}</div>
                    <div className="wallet-ui-subtle">24h {formatHashrate(worker.avg24h)}</div>
                  </div>
                  <RowBadge theme={theme} value={worker.status} />
                </div>
              ))}
            </div>
          </ScreenCard>
        </div>
      ) : null}

      {tab === "setup" ? (
        <div className="wallet-pool-grid-2">
          <ScreenCard theme={theme}>
            <SectionTitle title="Mine from inside the wallet" subtitle="Copy-ready setup for PPLNS and SOLO with pool host, ports, worker name and password." theme={theme} />
            <div className="wallet-pool-setup-stack">
              <div className="wallet-pool-setup-box" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
                <div className="wallet-ui-subtle">Stratum host</div>
                <div className="wallet-pool-wallet-address">{overview.stratum.host}</div>
                <div className="wallet-action-row">
                  <ActionButton onClick={() => copyText(overview.stratum.host)} theme={theme} compact>Copy host</ActionButton>
                  <ActionButton onClick={() => copyText(String(overview.stratum.pplnsPort))} theme={theme} tone="ghost" compact>Copy PPLNS port</ActionButton>
                  <ActionButton onClick={() => copyText(String(overview.stratum.soloPort))} theme={theme} tone="ghost" compact>Copy SOLO port</ActionButton>
                </div>
              </div>

              <div className="wallet-form-grid">
                <label className="wallet-ui-subtle" style={{ display: "grid", gap: 6 }}>
                  Worker name
                  <input value={workerName} onChange={(event) => setWorkerName(event.target.value)} style={inputStyle(theme)} placeholder="rig-01" />
                </label>
              </div>

              <div className="wallet-pool-command-box" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
                <div className="wallet-ui-subtle">PPLNS command</div>
                <code>{buildMinerCommand("pplns", address || "YOUR_WALLET_ADDRESS", workerName)}</code>
                <ActionButton onClick={() => copyText(buildMinerCommand("pplns", address || "YOUR_WALLET_ADDRESS", workerName))} theme={theme} compact>Copy PPLNS</ActionButton>
              </div>

              <div className="wallet-pool-command-box" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
                <div className="wallet-ui-subtle">SOLO command</div>
                <code>{buildMinerCommand("solo", address || "YOUR_WALLET_ADDRESS", workerName)}</code>
                <ActionButton onClick={() => copyText(buildMinerCommand("solo", address || "YOUR_WALLET_ADDRESS", workerName))} theme={theme} compact>Copy SOLO</ActionButton>
              </div>
            </div>
          </ScreenCard>

          <ScreenCard theme={theme}>
            <SectionTitle title="Quick instructions" subtitle="Prepared for both public mode and personal mode, keeping the premium wallet feel without sending miners outside the app." theme={theme} />
            <div className="wallet-pool-compact-list">
              {[
                { title: "PPLNS", text: "Use the PPLNS port for steady pooled rewards and let the wallet address receive payouts automatically." },
                { title: "SOLO", text: "Use the SOLO port if you want direct block hits to your wallet address and dedicated solo statistics." },
                { title: "Worker password", text: `Password is usually ${overview.stratum.password}. Leave it as x unless your pool backend expects a custom value.` },
                { title: "My Mining", text: "Once the wallet is unlocked, the current address automatically powers My Mining, My Workers and My Payments." },
              ].map((item) => (
                <div key={item.title} className="wallet-pool-compact-row" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{item.title}</div>
                    <div className="wallet-ui-subtle">{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="wallet-action-row">
              <ActionButton onClick={() => setTab?.("dashboard")} theme={theme} tone="ghost" compact>Back to Home</ActionButton>
            </div>
          </ScreenCard>
        </div>
      ) : null}

      {error ? (
        <ScreenCard theme={theme}>
          <div className="wallet-ui-subtle">Pool API note: {error}</div>
        </ScreenCard>
      ) : null}
    </div>
  );
}

function inputStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    minHeight: 44,
    borderRadius: 14,
    border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
    background: theme === "light" ? "#ffffff" : "#0f1520",
    color: theme === "light" ? "#10131a" : "#ffffff",
    padding: "10px 12px",
    outline: "none",
  };
}
