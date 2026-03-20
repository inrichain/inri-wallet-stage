import React, { useEffect, useMemo, useState } from "react";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import EmptyState from "../components/EmptyState";
import ActionButton from "../components/ActionButton";
import StatusPill from "../components/StatusPill";
import LogoImage from "../components/LogoImage";
import ConfirmModal from "../components/ConfirmModal";
import { getStoredNetwork, saveStoredNetwork, getInriNetwork } from "../lib/network";
import { showAppToast } from "../lib/ui";
import { EXPLORER_TX_URL } from "../lib/inri";
import {
  P2P_MARKET_ADDRESS,
  P2P_IUSD_ADDRESS,
  appendP2PActivity,
  approveIusd,
  cancelP2POrderTx,
  createBuyOrderTx,
  createSellOrderTx,
  fillBuyOrderTx,
  fillSellOrderTx,
  formatInri,
  formatIusd,
  getIusdAllowance,
  getIusdBalance,
  getP2PStats,
  loadP2PEvents,
  loadRecentP2POrders,
  parseInriAmount,
  parseIusdAmount,
  parsePrice,
  shortenAddress,
  type P2POrder,
  type P2PEventItem,
  updateP2PPriceTx,
  updateP2PDeadlineTx,
  addInriToSellOrderTx,
  removeInriFromSellOrderTx,
  addIusdToBuyOrderTx,
  reduceBuyOrderTx,
} from "../lib/p2p";

const iusdLogo = `${import.meta.env.BASE_URL || "/"}token-iusd.png`;
const inriLogo = `${import.meta.env.BASE_URL || "/"}token-inri.png`;

type ViewMode = "create" | "market" | "mine";
type FilterSide = "all" | "sell" | "buy";
type FilterStatus = "all" | "active" | "closed" | "expired";
type PendingAction =
  | { kind: "fill"; order: P2POrder }
  | { kind: "cancel"; order: P2POrder }
  | null;

export default function P2PScreen({
  theme = "dark",
  setTab,
  address = "",
  privateKey = "",
}: {
  theme?: "dark" | "light";
  lang?: string;
  setTab?: (tab: any) => void;
  address?: string;
  privateKey?: string;
}) {
  const isLight = theme === "light";
  const [view, setView] = useState<ViewMode>("create");
  const [network, setNetwork] = useState(getStoredNetwork());
  const [stats, setStats] = useState<{ nextOrderId: number; feeBps: number; treasury: string } | null>(null);
  const [orders, setOrders] = useState<P2POrder[]>([]);
  const [events, setEvents] = useState<P2PEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [side, setSide] = useState<"sell" | "buy">("sell");
  const [inriAmount, setInriAmount] = useState("");
  const [pricePerInri, setPricePerInri] = useState("");
  const [deadlineMinutes, setDeadlineMinutes] = useState("120");
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [iusdBalance, setIusdBalance] = useState<bigint>(0n);
  const [fillAmounts, setFillAmounts] = useState<Record<number, string>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [sideFilter, setSideFilter] = useState<FilterSide>("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [searchMaker, setSearchMaker] = useState("");
  const [recentTx, setRecentTx] = useState<{ hash: string; label: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editDeadlineMinutes, setEditDeadlineMinutes] = useState("");
  const [resizeValue, setResizeValue] = useState<Record<number, string>>({});

  const inriAmountRaw = useMemo(() => {
    try { return parseInriAmount(inriAmount); } catch { return 0n; }
  }, [inriAmount]);
  const priceRaw = useMemo(() => {
    try { return parsePrice(pricePerInri); } catch { return 0n; }
  }, [pricePerInri]);
  const deadline = useMemo(() => {
    const minutes = Math.max(0, Number(deadlineMinutes || 0));
    if (!minutes) return 0;
    return Math.floor(Date.now() / 1000) + minutes * 60;
  }, [deadlineMinutes]);
  const iusdNeeded = useMemo(() => {
    if (!inriAmountRaw || !priceRaw) return 0n;
    return (inriAmountRaw * priceRaw) / 10n ** 18n;
  }, [inriAmountRaw, priceRaw]);
  const feeIusd = useMemo(() => (iusdNeeded * BigInt(stats?.feeBps || 0)) / 10000n, [iusdNeeded, stats?.feeBps]);
  const totalEstimateText = useMemo(() => `${formatIusd(iusdNeeded)} iUSD`, [iusdNeeded]);

  const visibleOrders = useMemo(() => {
    const base = view === "mine" ? orders.filter((item) => item.maker.toLowerCase() === address.toLowerCase()) : orders;
    return base
      .filter((item) => (view === "market" ? item.active || item.expired : true))
      .filter((item) => (sideFilter === "all" ? true : item.side === sideFilter))
      .filter((item) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "active") return item.active && !item.expired;
        if (statusFilter === "expired") return item.expired;
        return !item.active;
      })
      .filter((item) => !searchMaker.trim() ? true : item.maker.toLowerCase().includes(searchMaker.trim().toLowerCase()));
  }, [orders, view, address, sideFilter, statusFilter, searchMaker]);

  async function refreshBalances() {
    if (!address) return;
    try {
      const [nextAllowance, nextIusdBalance] = await Promise.all([
        getIusdAllowance(address),
        getIusdBalance(address),
      ]);
      setAllowance(nextAllowance);
      setIusdBalance(nextIusdBalance);
    } catch {}
  }

  async function loadData(nextPage = page) {
    setLoading(true);
    try {
      const [nextStats, ordersResp, nextEvents] = await Promise.all([
        getP2PStats(),
        loadRecentP2POrders({ limit: 12, page: nextPage }),
        loadP2PEvents(12).catch(() => []),
      ]);
      setStats(nextStats);
      setOrders(ordersResp.items);
      setHasMore(Boolean(ordersResp.hasMore));
      setEvents(nextEvents);
      await refreshBalances();
    } catch (error: any) {
      showAppToast({ message: error?.message || "Unable to load P2P market", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(page);
    const sync = () => setNetwork(getStoredNetwork());
    window.addEventListener("wallet-network-updated", sync as EventListener);
    return () => window.removeEventListener("wallet-network-updated", sync as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, page]);

  const needsApproval = side === "buy" && iusdNeeded > 0n && allowance < iusdNeeded;
  const wrongNetwork = network.chainId !== 3777;

  async function handleSwitchToInri() {
    saveStoredNetwork(getInriNetwork());
    setNetwork(getInriNetwork());
    showAppToast({ message: "Switched to INRI network for P2P trading", type: "success" });
  }

  function rememberTx(hash: string, label: string) {
    setRecentTx({ hash, label });
  }

  async function handleApprove() {
    if (!privateKey || !iusdNeeded) return;
    setBusy(true);
    try {
      const { hash } = await approveIusd(privateKey, iusdNeeded);
      rememberTx(hash, "Approval confirmed");
      appendP2PActivity({ hash, from: address, amount: formatIusd(iusdNeeded), symbol: "iUSD", kind: "p2p-approve" });
      showAppToast({ message: "iUSD approval confirmed", type: "success" });
      await refreshBalances();
      await loadData(page);
    } catch (error: any) {
      showAppToast({ message: error?.shortMessage || error?.message || "Approval failed", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateOrder() {
    if (!privateKey || !address) {
      showAppToast({ message: "Unlock your wallet first", type: "warning" });
      return;
    }
    if (wrongNetwork) {
      showAppToast({ message: "P2P runs on INRI network only", type: "warning" });
      return;
    }
    if (inriAmountRaw <= 0n || priceRaw <= 0n) {
      showAppToast({ message: "Enter a valid INRI amount and price", type: "warning" });
      return;
    }
    if (side === "buy" && iusdNeeded > iusdBalance) {
      showAppToast({ message: "Not enough iUSD to create this buy order", type: "warning" });
      return;
    }
    if (side === "buy" && allowance < iusdNeeded) {
      showAppToast({ message: "Approve iUSD before creating the buy order", type: "warning" });
      return;
    }
    setBusy(true);
    try {
      const tx = side === "sell"
        ? await createSellOrderTx({ privateKey, priceRaw, deadline, inriAmount: inriAmountRaw })
        : await createBuyOrderTx({ privateKey, priceRaw, deadline, inriWanted: inriAmountRaw });
      rememberTx(tx.hash, `Order created`);
      appendP2PActivity({ hash: tx.hash, from: address, amount: formatInri(inriAmountRaw), symbol: side === "sell" ? "INRI" : "iUSD", kind: `p2p-create-${side}` });
      showAppToast({ message: `P2P ${side} order created`, type: "success" });
      setInriAmount("");
      setPricePerInri("");
      await loadData(page);
      setView("mine");
    } catch (error: any) {
      showAppToast({ message: error?.shortMessage || error?.message || "Could not create order", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function executeFill(order: P2POrder) {
    const amountText = fillAmounts[order.id] || "";
    let inriToFill = 0n;
    try { inriToFill = parseInriAmount(amountText); } catch { inriToFill = 0n; }
    if (!privateKey || !address) {
      showAppToast({ message: "Unlock your wallet first", type: "warning" });
      return;
    }
    if (!inriToFill || inriToFill <= 0n) {
      showAppToast({ message: "Enter how much INRI you want to fill", type: "warning" });
      return;
    }
    if (inriToFill > order.remainingInri) {
      showAppToast({ message: "Amount is larger than remaining order size", type: "warning" });
      return;
    }
    setBusy(true);
    try {
      if (order.side === "sell") {
        const iusdGross = (inriToFill * order.priceRaw) / 10n ** 18n;
        const currentAllowance = await getIusdAllowance(address);
        if (currentAllowance < iusdGross) {
          showAppToast({ message: "Approve more iUSD before filling this sell order", type: "warning" });
          return;
        }
        const tx = await fillSellOrderTx({ privateKey, orderId: order.id, inriToBuy: inriToFill, maxIusdGross: iusdGross });
        rememberTx(tx.hash, `Order #${order.id} filled`);
        appendP2PActivity({ hash: tx.hash, from: address, to: order.maker, amount: formatInri(inriToFill), symbol: "INRI", kind: "p2p-fill-sell" });
      } else {
        const iusdGross = (inriToFill * order.priceRaw) / 10n ** 18n;
        const fee = (iusdGross * BigInt(stats?.feeBps || 0)) / 10000n;
        const minNet = iusdGross - fee;
        const tx = await fillBuyOrderTx({ privateKey, orderId: order.id, inriToSell: inriToFill, minIusdNet: minNet });
        rememberTx(tx.hash, `Order #${order.id} filled`);
        appendP2PActivity({ hash: tx.hash, from: address, to: order.maker, amount: formatInri(inriToFill), symbol: "INRI", kind: "p2p-fill-buy" });
      }
      showAppToast({ message: `Order #${order.id} filled`, type: "success" });
      setFillAmounts((prev) => ({ ...prev, [order.id]: "" }));
      await loadData(page);
    } catch (error: any) {
      showAppToast({ message: error?.shortMessage || error?.message || "Fill failed", type: "error" });
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  async function executeCancel(order: P2POrder) {
    if (!privateKey) return;
    setBusy(true);
    try {
      const tx = await cancelP2POrderTx({ privateKey, orderId: order.id });
      rememberTx(tx.hash, `Order #${order.id} cancelled`);
      appendP2PActivity({ hash: tx.hash, from: address, amount: order.remainingInriDisplay, symbol: order.side === "sell" ? "INRI" : "iUSD", kind: "p2p-cancel" });
      showAppToast({ message: `Order #${order.id} cancelled`, type: "success" });
      await loadData(page);
    } catch (error: any) {
      showAppToast({ message: error?.shortMessage || error?.message || "Cancel failed", type: "error" });
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  function openEdit(order: P2POrder) {
    setEditingOrderId(order.id);
    setEditPrice(order.priceDisplay.replace(/,/g, ""));
    setEditDeadlineMinutes(order.deadline && order.deadline > Math.floor(Date.now()/1000) ? String(Math.round((order.deadline - Math.floor(Date.now()/1000)) / 60)) : "0");
  }

  async function saveEdit(order: P2POrder) {
    if (!privateKey) return;
    setBusy(true);
    try {
      const newPriceRaw = parsePrice(editPrice);
      const newDeadline = Number(editDeadlineMinutes || 0) > 0 ? Math.floor(Date.now()/1000) + Number(editDeadlineMinutes) * 60 : 0;
      if (newPriceRaw > 0n && editPrice !== order.priceDisplay.replace(/,/g, "")) {
        const tx = await updateP2PPriceTx({ privateKey, orderId: order.id, newPriceRaw });
        rememberTx(tx.hash, `Order #${order.id} price updated`);
      }
      const currentRemainingMinutes = order.deadline ? Math.round((order.deadline - Math.floor(Date.now()/1000))/60) : 0;
      if (String(Math.max(0,currentRemainingMinutes)) !== String(Number(editDeadlineMinutes || 0))) {
        const tx = await updateP2PDeadlineTx({ privateKey, orderId: order.id, newDeadline });
        rememberTx(tx.hash, `Order #${order.id} deadline updated`);
      }
      showAppToast({ message: `Order #${order.id} updated`, type: "success" });
      setEditingOrderId(null);
      await loadData(page);
    } catch (error: any) {
      showAppToast({ message: error?.shortMessage || error?.message || "Update failed", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function resizeOrder(order: P2POrder, mode: "add" | "remove") {
    if (!privateKey) return;
    const rawValue = resizeValue[order.id] || "";
    if (!rawValue) return;
    setBusy(true);
    try {
      if (order.side === "sell") {
        const inriRaw = parseInriAmount(rawValue);
        const tx = mode === "add"
          ? await addInriToSellOrderTx({ privateKey, orderId: order.id, inriAmount: inriRaw })
          : await removeInriFromSellOrderTx({ privateKey, orderId: order.id, inriAmount: inriRaw });
        rememberTx(tx.hash, `Order #${order.id} size updated`);
      } else {
        if (mode === "add") {
          const iusdRaw = parseIusdAmount(rawValue);
          const currentAllowance = await getIusdAllowance(address);
          if (currentAllowance < iusdRaw) {
            showAppToast({ message: "Approve enough iUSD before adding to buy order", type: "warning" });
            return;
          }
          const tx = await addIusdToBuyOrderTx({ privateKey, orderId: order.id, iusdAmount: iusdRaw });
          rememberTx(tx.hash, `Order #${order.id} size updated`);
        } else {
          const inriRaw = parseInriAmount(rawValue);
          const tx = await reduceBuyOrderTx({ privateKey, orderId: order.id, inriAmount: inriRaw });
          rememberTx(tx.hash, `Order #${order.id} size reduced`);
        }
      }
      showAppToast({ message: `Order #${order.id} updated`, type: "success" });
      setResizeValue((prev) => ({ ...prev, [order.id]: "" }));
      await loadData(page);
    } catch (error: any) {
      showAppToast({ message: error?.shortMessage || error?.message || "Resize failed", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}>
        <SectionTitle
          title="P2P Market"
          subtitle="Partial fills are supported. A 1,000 INRI order can be filled in smaller fractions by multiple takers."
          theme={theme}
          actions={<StatusPill theme={theme} tone={wrongNetwork ? "warning" : "primary"}>{wrongNetwork ? network.symbol : "INRI"}</StatusPill>}
        />

        <div style={{ display: "grid", gap: 12 }}>
          <div className="wallet-home-actions-grid wallet-home-actions-grid-single" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
            <ActionButton theme={theme} onClick={() => setView("create")} tone={view === "create" ? "primary" : "secondary"} compact>Create</ActionButton>
            <ActionButton theme={theme} onClick={() => setView("market")} tone={view === "market" ? "primary" : "secondary"} compact>Market</ActionButton>
            <ActionButton theme={theme} onClick={() => setView("mine")} tone={view === "mine" ? "primary" : "secondary"} compact>My Orders</ActionButton>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            <StatBox theme={theme} label="Contract" value={shortenAddress(P2P_MARKET_ADDRESS, 5)} sub="INRI chain" />
            <StatBox theme={theme} label="Fee" value={`${((stats?.feeBps || 0) / 100).toFixed(2)}%`} sub={`${stats?.feeBps || 0} bps`} />
            <StatBox theme={theme} label="iUSD balance" value={formatIusd(iusdBalance)} sub={shortenAddress(P2P_IUSD_ADDRESS, 5)} />
            <StatBox theme={theme} label="Allowance" value={formatIusd(allowance)} sub="for market contract" />
          </div>

          {recentTx ? (
            <div className="wallet-list-row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#fff" }}>{recentTx.label}</div>
                <div className="wallet-ui-subtle">{shortenAddress(recentTx.hash, 6)}</div>
              </div>
              <a href={`${EXPLORER_TX_URL}${recentTx.hash}`} target="_blank" rel="noreferrer" className="wallet-link-like">Open tx</a>
            </div>
          ) : null}

          {wrongNetwork ? (
            <div className="wallet-empty-state" style={{ padding: 18 }}>
              <div className="wallet-empty-title">P2P works only on INRI</div>
              <div className="wallet-empty-description">Your current network is {network.name}. Switch to INRI to create, fill and manage orders.</div>
              <div className="wallet-action-row">
                <ActionButton theme={theme} tone="primary" onClick={handleSwitchToInri}>Switch to INRI</ActionButton>
                {setTab ? <ActionButton theme={theme} tone="ghost" onClick={() => setTab("networks")}>Open Networks</ActionButton> : null}
              </div>
            </div>
          ) : null}
        </div>
      </ScreenCard>

      {view === "create" ? (
        <ScreenCard theme={theme}>
          <SectionTitle title="Create order" subtitle="Sell INRI for iUSD or create a bid that locks iUSD to buy INRI." theme={theme} compact />

          <div style={{ display: "grid", gap: 14 }}>
            <div className="wallet-home-actions-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
              <ActionButton theme={theme} tone={side === "sell" ? "primary" : "secondary"} onClick={() => setSide("sell")}>Sell INRI</ActionButton>
              <ActionButton theme={theme} tone={side === "buy" ? "primary" : "secondary"} onClick={() => setSide("buy")}>Buy INRI</ActionButton>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              <Field theme={theme} label={side === "sell" ? "INRI to deposit" : "INRI wanted"}>
                <input value={inriAmount} onChange={(e) => setInriAmount(e.target.value)} placeholder="0.0" className="wallet-ui-input" inputMode="decimal" />
              </Field>
              <Field theme={theme} label="Price per 1 INRI in iUSD">
                <input value={pricePerInri} onChange={(e) => setPricePerInri(e.target.value)} placeholder="0.050000" className="wallet-ui-input" inputMode="decimal" />
              </Field>
              <Field theme={theme} label="Deadline (minutes, 0 = none)">
                <input value={deadlineMinutes} onChange={(e) => setDeadlineMinutes(e.target.value)} placeholder="120" className="wallet-ui-input" inputMode="numeric" />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
              <TokenStat theme={theme} logo={inriLogo} label="INRI size" value={formatInri(inriAmountRaw)} />
              <TokenStat theme={theme} logo={iusdLogo} label={side === "sell" ? "Buyer pays" : "iUSD to lock"} value={formatIusd(iusdNeeded)} />
              <TokenStat theme={theme} logo={iusdLogo} label="Protocol fee" value={formatIusd(feeIusd)} />
              <TokenStat theme={theme} logo={iusdLogo} label="Estimated total" value={totalEstimateText} />
            </div>

            <div className="wallet-ui-subtle" style={{ lineHeight: 1.6 }}>
              {side === "buy"
                ? `Buy orders lock ${formatIusd(iusdNeeded)} iUSD. You can later add more iUSD, reduce the requested INRI, or update price and deadline.`
                : `Sell orders escrow ${formatInri(inriAmountRaw)} INRI. Takers may buy only a fraction of your order, so the remaining size stays open until filled or cancelled.`}
            </div>

            <div className="wallet-action-row">
              {side === "buy" && needsApproval ? (
                <ActionButton theme={theme} tone="secondary" onClick={handleApprove} disabled={busy || wrongNetwork || !address}>Approve iUSD</ActionButton>
              ) : null}
              <ActionButton theme={theme} tone="primary" onClick={handleCreateOrder} disabled={busy || wrongNetwork || !address}>
                {busy ? "Working..." : side === "sell" ? "Create sell order" : "Create buy order"}
              </ActionButton>
            </div>
          </div>
        </ScreenCard>
      ) : null}

      {(view === "market" || view === "mine") ? (
        <ScreenCard theme={theme}>
          <SectionTitle
            title={view === "mine" ? "My recent orders" : "Market"}
            subtitle={view === "mine" ? "Update price, deadline, and order size directly from the wallet." : "Filter active bids and asks. Partial fills are allowed for every order."}
            theme={theme}
            compact
            actions={<ActionButton theme={theme} compact onClick={() => loadData(page)}>Refresh</ActionButton>}
          />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 12 }}>
            <Field theme={theme} label="Side">
              <select className="wallet-ui-input" value={sideFilter} onChange={(e) => setSideFilter(e.target.value as FilterSide)}>
                <option value="all">All</option>
                <option value="sell">Sell</option>
                <option value="buy">Buy</option>
              </select>
            </Field>
            <Field theme={theme} label="Status">
              <select className="wallet-ui-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="closed">Closed</option>
              </select>
            </Field>
            <Field theme={theme} label="Maker filter">
              <input className="wallet-ui-input" value={searchMaker} onChange={(e) => setSearchMaker(e.target.value)} placeholder="0x maker..." />
            </Field>
          </div>

          {loading ? (
            <EmptyState theme={theme} title="Loading market" description="Fetching orders from the INRI P2P contract." />
          ) : visibleOrders.length === 0 ? (
            <EmptyState theme={theme} title="No orders found" description={view === "mine" ? "Create your first order to see it here." : "No recent orders matched your current filters."} />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {visibleOrders.map((order) => {
                const mine = order.maker.toLowerCase() === address.toLowerCase();
                const fillValue = fillAmounts[order.id] || "";
                const fillRaw = (() => { try { return parseInriAmount(fillValue); } catch { return 0n; } })();
                const fillIusdGross = fillRaw > 0n ? (fillRaw * order.priceRaw) / 10n ** 18n : 0n;
                const fillFee = (fillIusdGross * BigInt(stats?.feeBps || 0)) / 10000n;
                const tone = order.side === "sell" ? "primary" : "success";
                return (
                  <div key={order.id} className="wallet-list-row" style={{ alignItems: "stretch", gap: 14, flexDirection: "column", borderRadius: 22 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <div style={{ fontWeight: 900, fontSize: 17, color: isLight ? "#10131a" : "#fff" }}>Order #{order.id}</div>
                          <StatusPill theme={theme} tone={tone as any}>{order.side === "sell" ? "SELL INRI" : "BUY INRI"}</StatusPill>
                          {!order.active ? <StatusPill theme={theme} tone="danger">Closed</StatusPill> : order.expired ? <StatusPill theme={theme} tone="warning">Expired</StatusPill> : <StatusPill theme={theme} tone="success">Active</StatusPill>}
                          {mine ? <StatusPill theme={theme} tone="primary">Mine</StatusPill> : null}
                        </div>
                        <div className="wallet-ui-subtle" style={{ marginTop: 6 }}>Maker {shortenAddress(order.maker)} • Price {order.priceDisplay} iUSD / INRI</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#fff", fontSize: 18 }}>{order.remainingInriDisplay} INRI</div>
                        <div className="wallet-ui-subtle">Total est. {formatIusd((order.remainingInri * order.priceRaw) / 10n ** 18n)} iUSD</div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
                      <StatBox theme={theme} label="Price" value={`${order.priceDisplay} iUSD`} sub="per 1 INRI" />
                      <StatBox theme={theme} label="Remaining INRI" value={order.remainingInriDisplay} sub={order.side === "sell" ? "escrowed" : "wanted"} />
                      <StatBox theme={theme} label="Remaining iUSD" value={order.remainingIusdDisplay} sub={order.side === "buy" ? "locked" : "partial fills allowed"} />
                      <StatBox theme={theme} label="Deadline" value={order.deadline ? new Date(order.deadline * 1000).toLocaleString() : "No deadline"} sub={order.expired ? "expired" : "open"} />
                    </div>

                    {mine ? (
                      <div style={{ display: "grid", gap: 12 }}>
                        <div className="wallet-action-row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                          <div className="wallet-ui-subtle">You created this order from {shortenAddress(address)}.</div>
                          <div className="wallet-action-row" style={{ gap: 8 }}>
                            {editingOrderId === order.id ? null : <ActionButton theme={theme} compact tone="secondary" onClick={() => openEdit(order)}>Edit price/deadline</ActionButton>}
                            {order.active ? <ActionButton theme={theme} tone="danger" compact onClick={() => setPendingAction({ kind: "cancel", order })} disabled={busy}>Cancel</ActionButton> : null}
                          </div>
                        </div>

                        {editingOrderId === order.id ? (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                            <Field theme={theme} label="New price iUSD / INRI">
                              <input className="wallet-ui-input" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} inputMode="decimal" />
                            </Field>
                            <Field theme={theme} label="New deadline (minutes)">
                              <input className="wallet-ui-input" value={editDeadlineMinutes} onChange={(e) => setEditDeadlineMinutes(e.target.value)} inputMode="numeric" />
                            </Field>
                            <div className="wallet-action-row" style={{ alignSelf: "end" }}>
                              <ActionButton theme={theme} compact tone="ghost" onClick={() => setEditingOrderId(null)}>Close</ActionButton>
                              <ActionButton theme={theme} compact onClick={() => saveEdit(order)} disabled={busy}>Save</ActionButton>
                            </div>
                          </div>
                        ) : null}

                        {order.active ? (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                            <Field theme={theme} label={order.side === "sell" ? "INRI add/remove" : "Add iUSD or reduce INRI"}>
                              <input className="wallet-ui-input" value={resizeValue[order.id] || ""} onChange={(e) => setResizeValue((prev) => ({ ...prev, [order.id]: e.target.value }))} placeholder={order.side === "sell" ? "0.0 INRI" : "add: iUSD, remove: INRI"} />
                            </Field>
                            <div className="wallet-action-row" style={{ alignSelf: "end", gap: 8 }}>
                              <ActionButton theme={theme} compact tone="secondary" onClick={() => resizeOrder(order, "add")} disabled={busy}>Add size</ActionButton>
                              <ActionButton theme={theme} compact tone="ghost" onClick={() => resizeOrder(order, "remove")} disabled={busy}>Reduce</ActionButton>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : order.active && !order.expired ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "end" }}>
                          <Field theme={theme} label={order.side === "sell" ? "INRI to buy" : "INRI to sell"}>
                            <input
                              value={fillValue}
                              onChange={(e) => setFillAmounts((prev) => ({ ...prev, [order.id]: e.target.value }))}
                              placeholder={`max ${order.remainingInriDisplay}`}
                              className="wallet-ui-input"
                              inputMode="decimal"
                            />
                          </Field>
                          <ActionButton theme={theme} tone="primary" compact onClick={() => setPendingAction({ kind: "fill", order })} disabled={busy || wrongNetwork}>Fill fraction</ActionButton>
                        </div>
                        {fillRaw > 0n ? (
                          <div className="wallet-ui-subtle" style={{ lineHeight: 1.6 }}>
                            {order.side === "sell"
                              ? `This partial fill spends about ${formatIusd(fillIusdGross)} iUSD to receive ${formatInri(fillRaw)} INRI.`
                              : `This partial fill sends ${formatInri(fillRaw)} INRI and receives about ${formatIusd(fillIusdGross - fillFee)} iUSD net after fee.`}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <div className="wallet-action-row" style={{ justifyContent: "space-between", gap: 10 }}>
                <ActionButton theme={theme} compact tone="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || busy}>Previous</ActionButton>
                <div className="wallet-ui-subtle">Page {page}</div>
                <ActionButton theme={theme} compact tone="secondary" onClick={() => setPage((p) => p + 1)} disabled={!hasMore || busy}>Next</ActionButton>
              </div>
            </div>
          )}
        </ScreenCard>
      ) : null}

      <ScreenCard theme={theme}>
        <SectionTitle title="Recent market events" subtitle="Created, filled and cancelled orders read from contract events." theme={theme} compact />
        {events.length === 0 ? (
          <EmptyState theme={theme} title="No recent events" description="When orders are created or filled, they will show here." />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {events.map((event) => (
              <div key={`${event.txHash}-${event.orderId}-${event.kind}`} className="wallet-list-row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#fff" }}>Order #{event.orderId} • {event.kind}</div>
                  <div className="wallet-ui-subtle">{event.inri ? `${event.inri} INRI` : ""}{event.iusd ? ` • ${event.iusd} iUSD` : ""}{event.fee ? ` • fee ${event.fee}` : ""}</div>
                </div>
                <a href={`${EXPLORER_TX_URL}${event.txHash}`} target="_blank" rel="noreferrer" className="wallet-link-like">View tx</a>
              </div>
            ))}
          </div>
        )}
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle title="How this P2P works" subtitle="Adapted for the wallet from your INRI P2P market contract." theme={theme} compact />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
          <InfoPanel theme={theme} title="Sell order" description="Maker deposits native INRI into the contract and asks iUSD in return. Takers can fill all or only part of the order." />
          <InfoPanel theme={theme} title="Buy order" description="Maker locks iUSD and waits for takers to send native INRI. The taker receives net iUSD after the protocol fee." />
          <InfoPanel theme={theme} title="Current fee" description={`The contract charges ${(stats?.feeBps || 0) / 100}% on iUSD gross amount and forwards it to treasury ${shortenAddress(stats?.treasury)}.`} />
        </div>
      </ScreenCard>

      <ConfirmModal
        open={pendingAction?.kind === "cancel"}
        theme={theme}
        title={`Cancel order #${pendingAction?.order.id || ""}?`}
        description="This closes the order and refunds the remaining escrow back to the maker wallet."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        tone="danger"
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction?.order ? executeCancel(pendingAction.order) : undefined}
      />
      <ConfirmModal
        open={pendingAction?.kind === "fill"}
        theme={theme}
        title={`Fill order #${pendingAction?.order.id || ""}?`}
        description="This executes a partial or full fill, depending on the INRI amount entered in the order card."
        confirmLabel="Fill now"
        cancelLabel="Go back"
        tone="primary"
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction?.order ? executeFill(pendingAction.order) : undefined}
      />
    </div>
  );
}

function Field({ label, children, theme }: { label: string; children: React.ReactNode; theme: "dark" | "light" }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: theme === "light" ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: ".03em" }}>{label}</div>
      {children}
    </div>
  );
}

function StatBox({ label, value, sub, theme }: { label: string; value: string; sub?: string; theme: "dark" | "light" }) {
  const isLight = theme === "light";
  return (
    <div style={{ border: `1px solid ${isLight ? "#e2e8f0" : "#1f2937"}`, borderRadius: 16, padding: 14, background: isLight ? "#f8fbff" : "#0b1120", display: "grid", gap: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: isLight ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: ".03em" }}>{label}</div>
      <div style={{ fontWeight: 900, fontSize: 18, color: isLight ? "#10131a" : "#ffffff", overflowWrap: "anywhere" }}>{value}</div>
      {sub ? <div style={{ fontSize: 12, color: isLight ? "#64748b" : "#94a3b8", overflowWrap: "anywhere" }}>{sub}</div> : null}
    </div>
  );
}

function TokenStat({ logo, label, value, theme }: { logo: string; label: string; value: string; theme: "dark" | "light" }) {
  const isLight = theme === "light";
  return (
    <div style={{ border: `1px solid ${isLight ? "#e2e8f0" : "#1f2937"}`, borderRadius: 16, padding: 14, background: isLight ? "#f8fbff" : "#0b1120", display: "flex", gap: 12, alignItems: "center" }}>
      <LogoImage src={logo} alt={label} kind="token" label={label} symbol={label} size={38} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: isLight ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: ".03em" }}>{label}</div>
        <div style={{ fontWeight: 900, fontSize: 18, color: isLight ? "#10131a" : "#ffffff", overflowWrap: "anywhere" }}>{value}</div>
      </div>
    </div>
  );
}

function InfoPanel({ theme, title, description }: { theme: "dark" | "light"; title: string; description: string }) {
  const isLight = theme === "light";
  return (
    <div style={{ border: `1px solid ${isLight ? "#e2e8f0" : "#1f2937"}`, borderRadius: 16, padding: 14, background: isLight ? "#f8fbff" : "#0b1120", display: "grid", gap: 8 }}>
      <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#ffffff", fontSize: 16 }}>{title}</div>
      <div style={{ color: isLight ? "#475569" : "#94a3b8", lineHeight: 1.6 }}>{description}</div>
    </div>
  );
}
