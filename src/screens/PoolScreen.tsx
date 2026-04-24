import React, { useEffect, useMemo, useState } from "react";
import ActionButton from "../components/ActionButton";
import EmptyState from "../components/EmptyState";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import StatusPill from "../components/StatusPill";
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
  type PoolTopMiner,
} from "../lib/pool";

type PoolTab = "overview" | "mining" | "blocks" | "payments" | "setup";

type Theme = "dark" | "light";

const tabs: Array<{ id: PoolTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "mining", label: "My Mining" },
  { id: "blocks", label: "Blocks" },
  { id: "payments", label: "Payments" },
  { id: "setup", label: "Setup" },
];

function copyText(value: string) {
  navigator.clipboard?.writeText(value).catch(() => {});
}

function shortHex(value: string, left = 8, right = 6) {
  if (!value) return "—";
  if (value.length <= left + right + 2) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

function surfaceBackground(theme: Theme, level: 1 | 2 | 3 = 1) {
  const dark = ["#0d1320", "#111827", "#0f1520"];
  const light = ["#f7fbff", "#ffffff", "#eef4ff"];
  return theme === "light" ? light[level - 1] : dark[level - 1];
}

function surfaceBorder(theme: Theme) {
  return theme === "light" ? "#dbe6f6" : "#20283a";
}

function textPrimary(theme: Theme) {
  return theme === "light" ? "#10131a" : "#ffffff";
}

function textMuted(theme: Theme) {
  return theme === "light" ? "#556277" : "#9fb0cb";
}

function cardStyle(theme: Theme, level: 1 | 2 | 3 = 1): React.CSSProperties {
  return {
    background: surfaceBackground(theme, level),
    border: `1px solid ${surfaceBorder(theme)}`,
    borderRadius: 22,
    padding: 16,
  };
}

function Sparkline({ values, theme }: { values: number[]; theme: Theme }) {
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
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: 96, display: "block" }} aria-hidden="true">
      <defs>
        <linearGradient id={`pool-grad-${theme}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4f8cff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#4f8cff" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke="#4f8cff" strokeWidth="3" points={points} />
      <polygon fill={`url(#pool-grad-${theme})`} points={`0,100 ${points} 100,100`} />
    </svg>
  );
}

function PillRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>;
}

function StatTile({ theme, label, value, hint, tone = "neutral" }: { theme: Theme; label: string; value: string; hint?: string; tone?: "neutral" | "primary" | "success" | "warning"; }) {
  return (
    <div style={cardStyle(theme, 2)}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: textMuted(theme), fontWeight: 700 }}>{label}</div>
        <StatusPill theme={theme} tone={tone}>{tone === "success" ? "Live" : tone === "warning" ? "Watch" : tone === "primary" ? "Core" : "Info"}</StatusPill>
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color: textPrimary(theme), lineHeight: 1.2 }}>{value}</div>
      {hint ? <div style={{ marginTop: 8, fontSize: 13, color: textMuted(theme), lineHeight: 1.5 }}>{hint}</div> : null}
    </div>
  );
}

function SegmentTabs({ theme, current, onChange }: { theme: Theme; current: PoolTab; onChange: (tab: PoolTab) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10 }}>
      {tabs.map((item) => (
        <ActionButton
          key={item.id}
          onClick={() => onChange(item.id)}
          theme={theme}
          tone={current === item.id ? "primary" : "secondary"}
          compact
          style={{ width: "100%" }}
        >
          {item.label}
        </ActionButton>
      ))}
    </div>
  );
}

function ModeCard({ theme, title, hashrate, miners, workers, payments, tone }: { theme: Theme; title: string; hashrate: string; miners: number; workers: number; payments: number; tone: "primary" | "warning"; }) {
  return (
    <div style={cardStyle(theme, 2)}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: textMuted(theme), fontWeight: 700 }}>{title}</div>
          <div style={{ marginTop: 4, fontSize: 24, fontWeight: 900, color: textPrimary(theme) }}>{hashrate}</div>
        </div>
        <StatusPill theme={theme} tone={tone}>{title}</StatusPill>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
        <MiniMetric theme={theme} label="Miners" value={String(miners)} />
        <MiniMetric theme={theme} label="Workers" value={String(workers)} />
        <MiniMetric theme={theme} label="Payments" value={String(payments)} />
      </div>
    </div>
  );
}

function MiniMetric({ theme, label, value }: { theme: Theme; label: string; value: string }) {
  return (
    <div style={{ ...cardStyle(theme, 3), padding: 12, borderRadius: 16 }}>
      <div style={{ fontSize: 12, color: textMuted(theme), marginBottom: 6 }}>{label}</div>
      <div style={{ fontWeight: 900, color: textPrimary(theme) }}>{value}</div>
    </div>
  );
}

function InfoRow({ theme, label, value }: { theme: Theme; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: `1px solid ${surfaceBorder(theme)}` }}>
      <div style={{ color: textMuted(theme), fontSize: 13 }}>{label}</div>
      <div style={{ color: textPrimary(theme), fontWeight: 800, textAlign: "right" }}>{value}</div>
    </div>
  );
}

function DataList({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>;
}

function ListRow({ theme, left, right, href }: { theme: Theme; left: React.ReactNode; right?: React.ReactNode; href?: string }) {
  const content = (
    <div style={{ ...cardStyle(theme, 2), padding: 14, borderRadius: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
      <div style={{ minWidth: 0, flex: 1 }}>{left}</div>
      {right ? <div style={{ textAlign: "right", flexShrink: 0 }}>{right}</div> : null}
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
        {content}
      </a>
    );
  }

  return content;
}

function CopyCard({ theme, title, body }: { theme: Theme; title: string; body: string }) {
  return (
    <div style={cardStyle(theme, 2)}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 900, color: textPrimary(theme) }}>{title}</div>
        <ActionButton theme={theme} tone="secondary" compact onClick={() => copyText(body)}>Copy</ActionButton>
      </div>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, lineHeight: 1.6, color: textPrimary(theme), background: theme === "light" ? "#ffffff" : "#0b1018", border: `1px solid ${surfaceBorder(theme)}`, borderRadius: 16, padding: 14 }}>{body}</pre>
    </div>
  );
}

function RowBadge({ theme, value }: { theme: Theme; value: string }) {
  const lower = value.toLowerCase();
  const tone = lower.includes("online") || lower.includes("confirm") ? "success" : lower.includes("pend") ? "warning" : lower.includes("orphan") || lower.includes("offline") ? "danger" : "neutral";
  return <StatusPill theme={theme} tone={tone as any}>{value}</StatusPill>;
}

export default function PoolScreen({ theme = "dark", address = "" }: { theme?: Theme; lang?: string; address?: string; setTab?: (tab: any) => void }) {
  const [tab, setTab] = useState<PoolTab>("overview");
  const [snapshot, setSnapshot] = useState<PoolSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workerName, setWorkerName] = useState("RIG001");
  const [paymentFilter, setPaymentFilter] = useState<"all" | PoolMode | "mine">("all");
  const [blockFilter, setBlockFilter] = useState<"all" | PoolMode>("all");

  useEffect(() => {
    let active = true;

    const load = async (showSpinner = false) => {
      if (showSpinner) setRefreshing(true);
      const next = await fetchPoolSnapshot(address);
      if (!active) return;
      setSnapshot(next);
      setLoading(false);
      setRefreshing(false);
    };

    load(false);
    const timer = window.setInterval(() => load(false), 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [address]);

  const overview = snapshot?.overview;
  const pplnsMode = overview?.modes.find((item) => item.mode === "pplns") || { hashrate: 0, miners: 0, workers: 0, paymentsCount: 0 };
  const soloMode = overview?.modes.find((item) => item.mode === "solo") || { hashrate: 0, miners: 0, workers: 0, paymentsCount: 0 };
  const topChart = overview?.chart.map((item) => item.hashrate) || [];
  const topMiners = snapshot?.topMiners || [];
  const myMiner = snapshot?.miner || null;
  const myPayments = myMiner?.payments || [];
  const myBlocks = myMiner?.blocks || [];

  const filteredPayments = useMemo(() => {
    const list = snapshot?.payments || [];
    if (paymentFilter === "mine") return address ? list.filter((item) => item.address.toLowerCase() === address.toLowerCase()) : [];
    if (paymentFilter === "all") return list;
    return list.filter((item) => item.mode === paymentFilter);
  }, [snapshot, paymentFilter, address]);

  const filteredBlocks = useMemo(() => {
    const list = snapshot?.blocks || [];
    if (blockFilter === "all") return list;
    return list.filter((item) => item.mode === blockFilter);
  }, [snapshot, blockFilter]);

  const genericUser = address || "YOUR_INRI_WALLET";
  const pplnsCommand = `lolMiner.exe --algo ETHASH --pool ${buildMinerCommand("pplns", genericUser, workerName).replace(" --pass x", "")} `;
  const soloCommand = `lolMiner.exe --algo ETHASH --pool ${buildMinerCommand("solo", genericUser, workerName).replace(" --pass x", "")} `;
  const linuxCommand = `./lolMiner --algo ETHASH --pool ${buildMinerCommand("pplns", genericUser, workerName).replace(" --pass x", "")} `;

  if (loading && !snapshot) {
    return (
      <div className="wallet-screen-stack wallet-screen-mobile-tight">
        <ScreenCard theme={theme}>
          <SectionTitle title="INRI Pool" subtitle="Loading live pool stats and wallet mining data..." theme={theme} />
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
          <EmptyState theme={theme} title="Pool unavailable" description="The live pool widget or RPC is not responding right now." />
        </ScreenCard>
      </div>
    );
  }

  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight" style={{ gap: 16 }}>
      <ScreenCard theme={theme} style={{ overflow: "hidden" }}>
        <SectionTitle
          theme={theme}
          title="INRI Pool"
          subtitle="Premium live mining dashboard inside the wallet, using the pool widget and INRI RPC in real time."
          actions={
            <PillRow>
              <StatusPill theme={theme} tone={overview.poolOnline ? "success" : "danger"}>{overview.poolOnline ? "Pool live" : "Pool offline"}</StatusPill>
              <StatusPill theme={theme} tone={overview.nodeOnline ? "success" : "warning"}>{overview.nodeOnline ? "RPC live" : "RPC watch"}</StatusPill>
              <StatusPill theme={theme} tone="primary">Auto 15s</StatusPill>
            </PillRow>
          }
        />

        <div style={{ ...cardStyle(theme, 2), background: theme === "light" ? "linear-gradient(180deg,#f8fbff 0%,#eef4ff 100%)" : "linear-gradient(180deg,#101827 0%,#0b1220 100%)", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ minWidth: 240 }}>
              <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.05, color: textPrimary(theme) }}>Mine INRI with real live pool data.</div>
              <div style={{ marginTop: 10, color: textMuted(theme), maxWidth: 760, lineHeight: 1.65 }}>
                PPLNS and SOLO are now shown inside the wallet with live hashrate, miners, payments, blocks, top miners and automatic My Mining for the unlocked address.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
              <ActionButton theme={theme} tone="secondary" compact onClick={() => copyText("https://pool.inri.life")}>Copy pool URL</ActionButton>
              <ActionButton theme={theme} tone="secondary" compact onClick={() => window.open("https://pool.inri.life", "_blank")}>Open pool</ActionButton>
              <ActionButton theme={theme} tone="secondary" compact onClick={() => window.open("https://explorer.inri.life", "_blank")}>Open explorer</ActionButton>
              <ActionButton theme={theme} tone="primary" compact onClick={async () => {
                setRefreshing(true);
                const next = await fetchPoolSnapshot(address);
                setSnapshot(next);
                setRefreshing(false);
              }}>{refreshing ? "Refreshing..." : "Refresh now"}</ActionButton>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(280px,.8fr)", gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 12 }}>
                <MiniMetric theme={theme} label="Pool hashrate" value={formatHashrate(overview.poolHashrate)} />
                <MiniMetric theme={theme} label="Latest block" value={overview.currentHeight ? overview.currentHeight.toLocaleString() : "—"} />
                <MiniMetric theme={theme} label="Raw network peers" value={overview.rawNetworkPeers.toLocaleString()} />
                <MiniMetric theme={theme} label="Total live pulse" value={overview.totalLivePulse.toLocaleString()} />
              </div>
              <Sparkline values={topChart} theme={theme} />
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <ModeCard theme={theme} title="PPLNS" hashrate={formatHashrate(pplnsMode.hashrate)} miners={pplnsMode.miners} workers={pplnsMode.workers} payments={Number(pplnsMode.paymentsCount || 0)} tone="primary" />
              <ModeCard theme={theme} title="SOLO" hashrate={formatHashrate(soloMode.hashrate)} miners={soloMode.miners} workers={soloMode.workers} payments={Number(soloMode.paymentsCount || 0)} tone="warning" />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 16 }}>
          <StatTile theme={theme} label="Connected miners" value={overview.activeMiners.toLocaleString()} hint="PPLNS + SOLO combined" tone="success" />
          <StatTile theme={theme} label="Active workers" value={overview.activeWorkers.toLocaleString()} hint="Across both pool modes" tone="primary" />
          <StatTile theme={theme} label="Fee" value={formatPercent(overview.feePercent)} hint={`Fee wallet ${shortHex(overview.feeWalletAddress)}`} tone="primary" />
          <StatTile theme={theme} label="Difficulty" value={formatDifficulty(overview.networkDifficulty)} hint={`Main RPC peers ${overview.mainRpcPeers}`} tone="neutral" />
          <StatTile theme={theme} label="Blocks" value={`${overview.confirmedBlocks} confirmed`} hint={`${overview.pendingBlocks} pending · ${overview.orphanedBlocks} orphaned`} tone="warning" />
          <StatTile theme={theme} label="Updated" value={new Date(overview.widgetUpdatedAt || snapshot.fetchedAt).toLocaleTimeString()} hint={`Fetched ${formatRelativeTime(snapshot.fetchedAt)}`} tone="success" />
        </div>

        <SegmentTabs theme={theme} current={tab} onChange={setTab} />
      </ScreenCard>

      {tab === "overview" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16 }}>
            <ScreenCard theme={theme}>
              <SectionTitle title="Recent payments" subtitle="Live payouts from the pool widget." theme={theme} actions={<StatusPill theme={theme} tone="primary">{snapshot.payments.length} total</StatusPill>} />
              <DataList theme={theme}>
                {(snapshot.payments.slice(0, 6) || []).map((payment) => (
                  <ListRow
                    key={payment.id}
                    theme={theme}
                    href={getTxExplorerUrl(payment)}
                    left={
                      <>
                        <div style={{ fontWeight: 900, color: textPrimary(theme) }}>{shortHex(payment.address, 10, 6)}</div>
                        <div style={{ color: textMuted(theme), fontSize: 13, marginTop: 6 }}>{payment.mode.toUpperCase()} · {formatRelativeTime(payment.createdAt)}</div>
                      </>
                    }
                    right={
                      <>
                        <div style={{ fontWeight: 900, color: textPrimary(theme) }}>{formatCoin(payment.amount)}</div>
                        <div style={{ color: textMuted(theme), fontSize: 13, marginTop: 6 }}>{shortHex(payment.txHash, 8, 6)}</div>
                      </>
                    }
                  />
                ))}
              </DataList>
            </ScreenCard>

            <ScreenCard theme={theme}>
              <SectionTitle title="Recent blocks" subtitle="Live block feed from PPLNS and SOLO." theme={theme} actions={<StatusPill theme={theme} tone="warning">{snapshot.blocks.length} shown</StatusPill>} />
              <DataList theme={theme}>
                {(snapshot.blocks.slice(0, 6) || []).map((block) => (
                  <ListRow
                    key={block.id}
                    theme={theme}
                    href={getBlockExplorerUrl(block)}
                    left={
                      <>
                        <div style={{ fontWeight: 900, color: textPrimary(theme) }}>#{block.height.toLocaleString()}</div>
                        <div style={{ color: textMuted(theme), fontSize: 13, marginTop: 6 }}>{shortHex(block.miner, 10, 6)} · {formatRelativeTime(block.createdAt)}</div>
                      </>
                    }
                    right={
                      <>
                        <RowBadge theme={theme} value={block.status} />
                        <div style={{ color: textPrimary(theme), fontWeight: 900, marginTop: 8 }}>{formatCoin(block.reward)}</div>
                        <div style={{ color: textMuted(theme), fontSize: 13, marginTop: 4 }}>{block.mode.toUpperCase()}</div>
                      </>
                    }
                  />
                ))}
              </DataList>
            </ScreenCard>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(320px,.8fr)", gap: 16 }}>
            <ScreenCard theme={theme}>
              <SectionTitle title="Top miners" subtitle="Sorted by current hashrate from the live widget." theme={theme} />
              <DataList theme={theme}>
                {topMiners.slice(0, 8).map((miner, index) => (
                  <ListRow
                    key={`${miner.address}-${index}`}
                    theme={theme}
                    left={
                      <>
                        <div style={{ fontWeight: 900, color: textPrimary(theme) }}>#{index + 1} {miner.label}</div>
                        <div style={{ color: textMuted(theme), fontSize: 13, marginTop: 6 }}>{miner.workers} worker(s) · {miner.mode === "mixed" ? "MIXED" : miner.mode.toUpperCase()}</div>
                      </>
                    }
                    right={
                      <>
                        <div style={{ fontWeight: 900, color: textPrimary(theme) }}>{formatHashrate(miner.hashrate)}</div>
                        <div style={{ color: textMuted(theme), fontSize: 13, marginTop: 6 }}>24h {formatHashrate(miner.avg24h)}</div>
                      </>
                    }
                  />
                ))}
              </DataList>
            </ScreenCard>

            <ScreenCard theme={theme}>
              <SectionTitle title="Network pulse" subtitle="Pool + RPC health in one place." theme={theme} />
              <div>
                <InfoRow theme={theme} label="Raw network peers" value={overview.rawNetworkPeers.toLocaleString()} />
                <InfoRow theme={theme} label="Main RPC peers" value={overview.mainRpcPeers.toLocaleString()} />
                <InfoRow theme={theme} label="Connected miners" value={overview.activeMiners.toLocaleString()} />
                <InfoRow theme={theme} label="Pool hashrate" value={formatHashrate(overview.poolHashrate)} />
                <InfoRow theme={theme} label="Fee wallet" value={shortHex(overview.feeWalletAddress, 10, 6)} />
                <InfoRow theme={theme} label="Last widget update" value={new Date(overview.widgetUpdatedAt || snapshot.fetchedAt).toLocaleTimeString()} />
              </div>
              <div style={{ marginTop: 14 }}>
                <StatusPill theme={theme} tone={overview.poolOnline ? "success" : "danger"}>{overview.poolOnline ? "Widget online" : "Widget offline"}</StatusPill>
              </div>
            </ScreenCard>
          </div>
        </>
      ) : null}

      {tab === "mining" ? (
        address ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 16 }}>
              <StatTile theme={theme} label="My hashrate" value={formatHashrate(myMiner?.currentHashrate || 0)} hint={`24h ${formatHashrate(myMiner?.avg24h || 0)}`} tone="primary" />
              <StatTile theme={theme} label="Pending balance" value={formatCoin(myMiner?.pendingBalance || 0)} hint={`Payout target ${formatCoin(overview.minimumPayout)}`} tone="warning" />
              <StatTile theme={theme} label="Total paid" value={formatCoin(myMiner?.totalPaid || 0)} hint={myMiner?.lastPaymentAt ? `Last ${formatRelativeTime(myMiner.lastPaymentAt)}` : "No payouts yet"} tone="success" />
              <StatTile theme={theme} label="Blocks found" value={String(myMiner?.blocksFound || 0)} hint={`${myMiner?.workersOnline || 0} online worker(s)`} tone="neutral" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16 }}>
              <ScreenCard theme={theme}>
                <SectionTitle title="My wallet mining" subtitle="Automatic address-based view using the unlocked wallet." theme={theme} actions={<StatusPill theme={theme} tone="primary">{shortHex(address, 8, 6)}</StatusPill>} />
                {myMiner && myMiner.currentHashrate > 0 ? (
                  <div style={{ ...cardStyle(theme, 2), background: theme === "light" ? "linear-gradient(180deg,#f8fbff 0%,#eef4ff 100%)" : "linear-gradient(180deg,#101827 0%,#0b1220 100%)" }}>
                    <div style={{ fontSize: 32, fontWeight: 900, color: textPrimary(theme) }}>{formatHashrate(myMiner.currentHashrate)}</div>
                    <div style={{ marginTop: 8, color: textMuted(theme), lineHeight: 1.6 }}>
                      This address is visible in the pool feed. Payments and found blocks below are filtered automatically for the unlocked wallet.
                    </div>
                    <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
                      <MiniMetric theme={theme} label="Payments" value={String(myPayments.length)} />
                      <MiniMetric theme={theme} label="Blocks" value={String(myBlocks.length)} />
                    </div>
                  </div>
                ) : (
                  <EmptyState theme={theme} title="This address is not active in the live feed yet" description="Start mining with this wallet, wait for the next widget refresh, and My Mining will populate automatically." />
                )}
              </ScreenCard>

              <ScreenCard theme={theme}>
                <SectionTitle title="Worker naming guide" subtitle="Use one wallet and different worker names to track each rig." theme={theme} />
                <div style={cardStyle(theme, 2)}>
                  <div style={{ fontWeight: 900, color: textPrimary(theme), marginBottom: 10 }}>Recommended format</div>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, color: textPrimary(theme), background: theme === "light" ? "#ffffff" : "#0b1018", border: `1px solid ${surfaceBorder(theme)}`, borderRadius: 16, padding: 14 }}>{`${genericUser}.${workerName}`}</pre>
                  <div style={{ marginTop: 12, color: textMuted(theme), lineHeight: 1.6 }}>Example: one machine can be RIG001, another RIG002, and a backup rig can be OFFICEGPU.</div>
                </div>
              </ScreenCard>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16 }}>
              <ScreenCard theme={theme}>
                <SectionTitle title="My payments" subtitle="Recent payouts for the unlocked wallet." theme={theme} />
                {myPayments.length ? (
                  <DataList theme={theme}>
                    {myPayments.map((payment) => (
                      <ListRow
                        key={payment.id}
                        theme={theme}
                        href={getTxExplorerUrl(payment)}
                        left={<><div style={{ fontWeight: 900, color: textPrimary(theme) }}>{formatCoin(payment.amount)}</div><div style={{ color: textMuted(theme), fontSize: 13, marginTop: 6 }}>{payment.mode.toUpperCase()} · {formatRelativeTime(payment.createdAt)}</div></>}
                        right={<div style={{ color: textMuted(theme), fontSize: 13 }}>{shortHex(payment.txHash, 8, 6)}</div>}
                      />
                    ))}
                  </DataList>
                ) : <EmptyState theme={theme} title="No payments yet" description="As soon as this address receives pool payouts, they will appear here." />}
              </ScreenCard>

              <ScreenCard theme={theme}>
                <SectionTitle title="My blocks" subtitle="Blocks found by the unlocked address." theme={theme} />
                {myBlocks.length ? (
                  <DataList theme={theme}>
                    {myBlocks.map((block) => (
                      <ListRow
                        key={block.id}
                        theme={theme}
                        href={getBlockExplorerUrl(block)}
                        left={<><div style={{ fontWeight: 900, color: textPrimary(theme) }}>#{block.height.toLocaleString()}</div><div style={{ color: textMuted(theme), fontSize: 13, marginTop: 6 }}>{formatRelativeTime(block.createdAt)} · {block.mode.toUpperCase()}</div></>}
                        right={<><RowBadge theme={theme} value={block.status} /><div style={{ color: textPrimary(theme), fontWeight: 900, marginTop: 8 }}>{formatCoin(block.reward)}</div></>}
                      />
                    ))}
                  </DataList>
                ) : <EmptyState theme={theme} title="No blocks found yet" description="When this address finds a block through the pool, it will appear here automatically." />}
              </ScreenCard>
            </div>
          </>
        ) : (
          <ScreenCard theme={theme}>
            <EmptyState theme={theme} title="Unlock the wallet to enable My Mining" description="The pool screen already works publicly, but the personal mining panel needs the unlocked wallet address." />
          </ScreenCard>
        )
      ) : null}

      {tab === "blocks" ? (
        <ScreenCard theme={theme}>
          <SectionTitle
            title="Pool blocks"
            subtitle="Filter PPLNS and SOLO blocks in real time."
            theme={theme}
            actions={
              <PillRow>
                <ActionButton theme={theme} tone={blockFilter === "all" ? "primary" : "secondary"} compact onClick={() => setBlockFilter("all")}>All</ActionButton>
                <ActionButton theme={theme} tone={blockFilter === "pplns" ? "primary" : "secondary"} compact onClick={() => setBlockFilter("pplns")}>PPLNS</ActionButton>
                <ActionButton theme={theme} tone={blockFilter === "solo" ? "primary" : "secondary"} compact onClick={() => setBlockFilter("solo")}>SOLO</ActionButton>
              </PillRow>
            }
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredBlocks.length ? filteredBlocks.map((block: PoolBlock) => (
              <ListRow
                key={block.id}
                theme={theme}
                href={getBlockExplorerUrl(block)}
                left={
                  <>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 900, color: textPrimary(theme) }}>#{block.height.toLocaleString()}</div>
                      <RowBadge theme={theme} value={block.status} />
                      <StatusPill theme={theme} tone={block.mode === "solo" ? "warning" : "primary"}>{block.mode.toUpperCase()}</StatusPill>
                    </div>
                    <div style={{ color: textMuted(theme), fontSize: 13, marginTop: 8 }}>Miner {shortHex(block.miner, 10, 6)} · {formatRelativeTime(block.createdAt)}</div>
                  </>
                }
                right={
                  <>
                    <div style={{ fontWeight: 900, color: textPrimary(theme) }}>{formatCoin(block.reward)}</div>
                    <div style={{ color: textMuted(theme), fontSize: 13, marginTop: 6 }}>Luck {formatPercent(block.luckPercent)} · Effort {formatPercent(block.effortPercent)}</div>
                  </>
                }
              />
            )) : <EmptyState theme={theme} title="No blocks in this filter" description="Try another mode or wait for the next refresh." />}
          </div>
        </ScreenCard>
      ) : null}

      {tab === "payments" ? (
        <ScreenCard theme={theme}>
          <SectionTitle
            title="Pool payments"
            subtitle="Live payout feed from the pool widget, with filters for PPLNS, SOLO and your address."
            theme={theme}
            actions={
              <PillRow>
                <ActionButton theme={theme} tone={paymentFilter === "all" ? "primary" : "secondary"} compact onClick={() => setPaymentFilter("all")}>All</ActionButton>
                <ActionButton theme={theme} tone={paymentFilter === "pplns" ? "primary" : "secondary"} compact onClick={() => setPaymentFilter("pplns")}>PPLNS</ActionButton>
                <ActionButton theme={theme} tone={paymentFilter === "solo" ? "primary" : "secondary"} compact onClick={() => setPaymentFilter("solo")}>SOLO</ActionButton>
                <ActionButton theme={theme} tone={paymentFilter === "mine" ? "primary" : "secondary"} compact disabled={!address} onClick={() => setPaymentFilter("mine")}>My address</ActionButton>
              </PillRow>
            }
          />
          <DataList theme={theme}>
            {filteredPayments.length ? filteredPayments.map((payment: PoolPayment) => (
              <ListRow
                key={payment.id}
                theme={theme}
                href={getTxExplorerUrl(payment)}
                left={<><div style={{ fontWeight: 900, color: textPrimary(theme) }}>{shortHex(payment.address, 10, 6)}</div><div style={{ color: textMuted(theme), fontSize: 13, marginTop: 6 }}>{payment.mode.toUpperCase()} · {formatRelativeTime(payment.createdAt)}</div></>}
                right={<><div style={{ fontWeight: 900, color: textPrimary(theme) }}>{formatCoin(payment.amount)}</div><div style={{ color: textMuted(theme), fontSize: 13, marginTop: 6 }}>{shortHex(payment.txHash, 8, 6)}</div></>}
              />
            )) : <EmptyState theme={theme} title="No payments in this filter" description="Wait for new payouts or switch the filter." />}
          </DataList>
        </ScreenCard>
      ) : null}

      {tab === "setup" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16 }}>
            <ScreenCard theme={theme}>
              <SectionTitle title="Start mining" subtitle="Use your INRI wallet address and pick the mode that fits your rig size." theme={theme} />
              <div style={{ ...cardStyle(theme, 2), marginBottom: 12 }}>
                <InfoRow theme={theme} label="PPLNS port" value={String(overview.stratum.pplnsPort)} />
                <InfoRow theme={theme} label="SOLO port" value={String(overview.stratum.soloPort)} />
                <InfoRow theme={theme} label="TLS port" value={String(overview.stratum.tlsPort || 0)} />
                <InfoRow theme={theme} label="Host" value={overview.stratum.host} />
                <InfoRow theme={theme} label="Password" value={overview.stratum.password} />
              </div>
              <div style={{ ...cardStyle(theme, 2) }}>
                <div style={{ fontWeight: 900, color: textPrimary(theme), marginBottom: 10 }}>Worker name</div>
                <input
                  value={workerName}
                  onChange={(event) => setWorkerName(event.target.value.toUpperCase())}
                  placeholder="RIG001"
                  style={{ width: "100%", borderRadius: 16, border: `1px solid ${surfaceBorder(theme)}`, background: theme === "light" ? "#ffffff" : "#0b1018", color: textPrimary(theme), padding: "12px 14px", outline: "none" }}
                />
                <div style={{ marginTop: 10, color: textMuted(theme), fontSize: 13, lineHeight: 1.6 }}>Use the same wallet with different worker names for each rig so your mining fleet stays organized.</div>
              </div>
            </ScreenCard>

            <ScreenCard theme={theme}>
              <SectionTitle title="Mode guide" subtitle="Choose the mode that matches your hashrate and risk profile." theme={theme} />
              <div style={{ display: "grid", gap: 12 }}>
                <div style={cardStyle(theme, 2)}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 900, color: textPrimary(theme) }}>PPLNS</div>
                    <StatusPill theme={theme} tone="primary">Steady</StatusPill>
                  </div>
                  <div style={{ color: textMuted(theme), lineHeight: 1.6 }}>Best for most miners. More stable payouts over time and smoother day-to-day mining.</div>
                </div>
                <div style={cardStyle(theme, 2)}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 900, color: textPrimary(theme) }}>SOLO</div>
                    <StatusPill theme={theme} tone="warning">High variance</StatusPill>
                  </div>
                  <div style={{ color: textMuted(theme), lineHeight: 1.6 }}>Better for larger hashrate if you want the chance to capture a full block win instead of shared rewards.</div>
                </div>
              </div>
            </ScreenCard>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
            <CopyCard theme={theme} title="Windows · PPLNS" body={pplnsCommand} />
            <CopyCard theme={theme} title="Windows · SOLO" body={soloCommand} />
            <CopyCard theme={theme} title="Linux · PPLNS" body={linuxCommand} />
          </div>
        </>
      ) : null}
    </div>
  );
}
