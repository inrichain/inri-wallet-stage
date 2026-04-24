import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import ScreenCard from "../components/ScreenCard";
import SectionTitle from "../components/SectionTitle";
import ActionButton from "../components/ActionButton";
import StatusPill from "../components/StatusPill";
import EmptyState from "../components/EmptyState";
import LogoImage from "../components/LogoImage";
import { EXPLORER_ADDRESS_URL, EXPLORER_TX_URL, getProvider } from "../lib/inri";
import { getInriNetwork, getStoredNetwork, saveStoredNetwork } from "../lib/network";
import { resolveTokenAsset } from "../lib/assets";
import { showAppToast } from "../lib/ui";
import type { Tab } from "../lib/navigation";

const FACTORY_ADDRESS = "0x1D760E78D92aA5B46b484bc054Bbfae11198B751";
const CUSTOM_TOKENS_KEY = "wallet_custom_tokens";
const CREATE_TOKEN_SIGNATURES = [
  "createToken(string,string,uint8,uint256)",
  "createToken(string,string,uint256,uint8)",
] as const;
const TOTAL_TOKENS_SIGNATURE = "totalTokens()";
const ALL_TOKENS_SIGNATURE = "allTokens(uint256)";

const initialForm = {
  name: "",
  symbol: "",
  decimals: "18",
  supply: "",
};

type FormState = typeof initialForm;
type ResolvedCreateCall = {
  signature: (typeof CREATE_TOKEN_SIGNATURES)[number];
  data: string;
  gas: bigint;
};
type FactoryStats = { total: bigint; latest: string | null };
type CustomTokenItem = {
  symbol: string;
  subtitle: string;
  balance: string;
  logo: string;
  isDefault: boolean;
  address: string;
  decimals: number;
  networkKey: string;
};

function selector(signature: string) {
  return ethers.id(signature).slice(2, 10);
}

function strip0x(value: string) {
  return value.startsWith("0x") ? value.slice(2) : value;
}

function encodeUint(value: bigint) {
  return value.toString(16).padStart(64, "0");
}

function utf8ToHex(value: string) {
  return Array.from(new TextEncoder().encode(value))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function encodeString(value: string) {
  const dataHex = utf8ToHex(value);
  const byteLength = BigInt(dataHex.length / 2);
  const paddedHexLength = Math.ceil((dataHex.length || 2) / 64) * 64;
  return `${encodeUint(byteLength)}${dataHex.padEnd(paddedHexLength, "0")}`;
}

function encodeCreateToken(signature: string, name: string, symbol: string, decimals: number, supply: bigint) {
  const encodedName = encodeString(name);
  const encodedSymbol = encodeString(symbol);
  const nameOffset = 32n * 4n;
  const symbolOffset = nameOffset + BigInt(encodedName.length / 2);
  const thirdArg = signature === "createToken(string,string,uint256,uint8)" ? encodeUint(supply) : encodeUint(BigInt(decimals));
  const fourthArg = signature === "createToken(string,string,uint256,uint8)" ? encodeUint(BigInt(decimals)) : encodeUint(supply);
  return `0x${selector(signature)}${encodeUint(nameOffset)}${encodeUint(symbolOffset)}${thirdArg}${fourthArg}${encodedName}${encodedSymbol}`;
}

function sanitizeSupply(input: string) {
  return input.replace(/[,_\s]/g, "");
}

function shortAddress(address?: string | null, size = 4) {
  if (!address) return "—";
  return `${address.slice(0, 2 + size)}...${address.slice(-size)}`;
}

function parseHexToBigInt(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("0x")) return 0n;
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

function isValidAddress(value?: string | null) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function withGasBuffer(value: bigint, minimum = 650000n) {
  const buffered = (value * 130n) / 100n + 50000n;
  return buffered > minimum ? buffered : minimum;
}

async function getLegacyGasPrice(provider: ethers.JsonRpcProvider) {
  try {
    const raw = await provider.send("eth_gasPrice", []);
    if (typeof raw === "string" && raw.startsWith("0x")) {
      const parsed = BigInt(raw);
      if (parsed > 0n) return parsed;
    }
  } catch {}
  try {
    const fee = await provider.getFeeData();
    if (fee.gasPrice && fee.gasPrice > 0n) return fee.gasPrice;
  } catch {}
  return 1_000_000_000n;
}

async function estimateFactoryGas(provider: ethers.JsonRpcProvider, tx: Record<string, unknown>) {
  const raw = await provider.send("eth_estimateGas", [tx]);
  if (typeof raw !== "string" || !raw.startsWith("0x")) {
    throw new Error("Invalid gas estimate returned by INRI RPC");
  }
  const estimated = BigInt(raw);
  if (estimated <= 0n) throw new Error("Invalid zero gas estimate returned by INRI RPC");
  return withGasBuffer(estimated);
}

function readCustomTokens() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_TOKENS_KEY) || "[]");
    return Array.isArray(parsed) ? (parsed as CustomTokenItem[]) : [];
  } catch {
    return [] as CustomTokenItem[];
  }
}

function addCreatedTokenToWallet(token: { address: string; name: string; symbol: string; decimals: number }) {
  const networkKey = "inri";
  const cleanSymbol = token.symbol.trim().toUpperCase().slice(0, 24);
  const cleanName = token.name.trim();
  const tokenKey = `${networkKey}:${token.address.toLowerCase()}`;
  const current = readCustomTokens();
  const nextToken: CustomTokenItem = {
    symbol: cleanSymbol,
    subtitle: cleanName || `factory token • ${shortAddress(token.address)}`,
    balance: "0.000000",
    logo: resolveTokenAsset({ symbol: cleanSymbol, name: cleanName || cleanSymbol, networkKey }),
    isDefault: false,
    address: token.address,
    decimals: token.decimals,
    networkKey,
  };
  const filtered = current.filter((item) => `${item.networkKey || networkKey}:${String(item.address || "").toLowerCase()}` !== tokenKey);
  localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify([nextToken, ...filtered]));
  window.dispatchEvent(new Event("wallet-tokens-updated"));
  window.dispatchEvent(new Event("wallet-assets-updated"));
}

function ExplorerLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="wallet-link-like" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function FactoryInput({
  label,
  value,
  onChange,
  placeholder,
  helper,
  inputMode,
  uppercase = false,
  theme = "dark",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  helper: string;
  inputMode?: "text" | "numeric";
  uppercase?: boolean;
  theme?: "dark" | "light";
}) {
  const isLight = theme === "light";
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span className="wallet-ui-subtle" style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: ".14em" }}>{label}</span>
      <input
        className={`wallet-ui-input ${isLight ? "light" : ""}`.trim()}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={uppercase ? { textTransform: "uppercase" } : undefined}
      />
      <span className="wallet-ui-subtle" style={{ lineHeight: 1.55 }}>{helper}</span>
    </label>
  );
}

function MiniStat({ theme = "dark", label, value, sub }: { theme?: "dark" | "light"; label: string; value: string; sub?: string }) {
  const isLight = theme === "light";
  return (
    <div className="wallet-token-stat-card" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#dbe2f0" : "#202635" }}>
      <span className="wallet-ui-subtle" style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: ".12em" }}>{label}</span>
      <strong style={{ color: isLight ? "#10131a" : "#fff", fontSize: 20, overflowWrap: "anywhere" }}>{value}</strong>
      {sub ? <span className="wallet-ui-subtle">{sub}</span> : null}
    </div>
  );
}

export default function TokenFactoryScreen({
  theme = "dark",
  lang = "en",
  address = "",
  privateKey = "",
  setTab,
}: {
  theme?: "dark" | "light";
  lang?: string;
  address?: string;
  privateKey?: string;
  setTab?: (tab: Tab) => void;
}) {
  const isLight = theme === "light";
  const [network, setNetwork] = useState(getStoredNetwork());
  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState("Create ERC-20 tokens directly from INRI Wallet.");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [createdToken, setCreatedToken] = useState("");
  const [factoryCount, setFactoryCount] = useState("-");
  const [latestToken, setLatestToken] = useState<string | null>(null);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [resolvedSignature, setResolvedSignature] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [copied, setCopied] = useState(false);

  const networkReady = Number(network.chainId) === 3777;
  const provider = useMemo(() => getProvider("inri"), []);
  const previewItems = useMemo(() => [
    { label: "Token name", value: form.name || "Your token name" },
    { label: "Symbol", value: form.symbol || "TICKER" },
    { label: "Decimals", value: form.decimals || "18" },
    { label: "Initial supply", value: form.supply || "0" },
  ], [form]);

  useEffect(() => {
    const sync = () => setNetwork(getStoredNetwork());
    window.addEventListener("storage", sync);
    window.addEventListener("wallet-network-updated", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("wallet-network-updated", sync as EventListener);
    };
  }, []);

  const refreshFactoryStats = useCallback(async (): Promise<FactoryStats> => {
    try {
      const totalRaw = await provider.call({ to: FACTORY_ADDRESS, data: `0x${selector(TOTAL_TOKENS_SIGNATURE)}` });
      const total = parseHexToBigInt(totalRaw);
      setFactoryCount(total.toString());

      let latest: string | null = null;
      if (total > 0n) {
        const latestRaw = await provider.call({ to: FACTORY_ADDRESS, data: `0x${selector(ALL_TOKENS_SIGNATURE)}${encodeUint(total - 1n)}` });
        const clean = strip0x(String(latestRaw || ""));
        if (clean.length >= 64) {
          latest = ethers.getAddress(`0x${clean.slice(-40)}`);
        }
      }
      setLatestToken(latest);
      return { total, latest };
    } catch {
      setFactoryCount("-");
      setLatestToken(null);
      return { total: 0n, latest: null };
    }
  }, [provider]);

  useEffect(() => {
    refreshFactoryStats().catch(() => undefined);
  }, [refreshFactoryStats]);

  const resolveCreateCall = useCallback(async (): Promise<ResolvedCreateCall> => {
    if (!address) throw new Error("Unlock your wallet first.");
    if (!networkReady) throw new Error("Switch to INRI network first.");

    const cleanSupply = sanitizeSupply(form.supply);
    const decimals = Number(form.decimals);
    const name = form.name.trim();
    const symbol = form.symbol.trim().toUpperCase();

    if (!name) throw new Error("Token name is required.");
    if (!symbol) throw new Error("Token symbol is required.");
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error("Decimals must be an integer between 0 and 255.");
    if (!/^\d+$/.test(cleanSupply) || BigInt(cleanSupply) <= 0n) throw new Error("Supply must be a whole number greater than zero.");

    const supply = BigInt(cleanSupply);
    const failures: string[] = [];
    for (const signature of CREATE_TOKEN_SIGNATURES) {
      const data = encodeCreateToken(signature, name, symbol, decimals, supply);
      try {
        const gas = await estimateFactoryGas(provider, { from: address, to: FACTORY_ADDRESS, data });
        setResolvedSignature(signature);
        return { signature, data, gas };
      } catch (cause) {
        failures.push(`${signature}: ${cause instanceof Error ? cause.message : String(cause)}`);
      }
    }
    throw new Error(failures[0] || "The token factory call could not be prepared with the live contract.");
  }, [address, form.decimals, form.name, form.supply, form.symbol, networkReady, provider]);

  const estimateGas = useCallback(async () => {
    if (!address || !networkReady || !form.name.trim() || !form.symbol.trim() || !form.supply.trim()) {
      setGasEstimate(null);
      return;
    }
    try {
      setEstimating(true);
      const resolved = await resolveCreateCall();
      setGasEstimate(resolved.gas.toString());
    } catch {
      setGasEstimate(null);
    } finally {
      setEstimating(false);
    }
  }, [address, form.name, form.supply, form.symbol, networkReady, resolveCreateCall]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      estimateGas().catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [estimateGas]);

  function switchToInri() {
    saveStoredNetwork(getInriNetwork());
    setNetwork(getInriNetwork());
    window.dispatchEvent(new Event("wallet-network-updated"));
    showAppToast({ message: "INRI network selected", type: "success" });
  }

  async function createToken() {
    if (!privateKey || !address) {
      setError("Unlock your wallet before creating a token.");
      return;
    }
    if (!networkReady) {
      setError("Token Factory runs on INRI CHAIN only. Switch network first.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      setTxHash("");
      setCreatedToken("");
      setStatus("Preparing token launch transaction...");

      const before = await refreshFactoryStats();
      const resolved = await resolveCreateCall();
      const gasPrice = await getLegacyGasPrice(provider);
      const wallet = new ethers.Wallet(privateKey, provider);

      setGasEstimate(resolved.gas.toString());
      setResolvedSignature(resolved.signature);
      setStatus("Sending transaction from INRI Wallet...");

      const tx = await wallet.sendTransaction({
        to: FACTORY_ADDRESS,
        data: resolved.data,
        gasLimit: resolved.gas,
        gasPrice,
        type: 0,
        chainId: 3777,
      });

      setTxHash(tx.hash);
      setStatus("Transaction sent. Waiting for confirmation on INRI CHAIN...");
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error("Transaction reverted. Review the token fields and try again.");

      const after = await refreshFactoryStats();
      const inferredToken = after.total > before.total && isValidAddress(after.latest) ? after.latest : null;
      if (inferredToken) {
        setCreatedToken(inferredToken);
        addCreatedTokenToWallet({
          address: inferredToken,
          name: form.name.trim(),
          symbol: form.symbol.trim().toUpperCase(),
          decimals: Number(form.decimals),
        });
        setStatus("Token created and added to this INRI Wallet.");
        showAppToast({ message: "Token created and added to wallet", type: "success" });
      } else {
        setStatus("Token created. Open the transaction on explorer to confirm the new token address.");
        showAppToast({ message: "Token created", type: "success" });
      }
    } catch (cause: any) {
      const message = cause?.shortMessage || cause?.reason || cause?.message || "Token creation failed.";
      setError(message);
      setStatus("Action needs attention.");
      showAppToast({ message, type: "error" });
    } finally {
      setBusy(false);
    }
  }

  function addLatestTokenAgain() {
    if (!createdToken) return;
    addCreatedTokenToWallet({
      address: createdToken,
      name: form.name.trim(),
      symbol: form.symbol.trim().toUpperCase(),
      decimals: Number(form.decimals),
    });
    showAppToast({ message: "Token added to wallet", type: "success" });
  }

  async function copyFactory() {
    try {
      await navigator.clipboard.writeText(FACTORY_ADDRESS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme}>
        <SectionTitle
          title="Token Factory"
          subtitle="Create ERC-20 tokens on INRI CHAIN directly inside your wallet. Created tokens are automatically added to your token list."
          theme={theme}
          actions={<StatusPill theme={theme} tone={networkReady ? "primary" : "warning"}>{networkReady ? "INRI ready" : "Switch needed"}</StatusPill>}
        />

        <div className="wallet-token-stats-grid">
          <MiniStat theme={theme} label="Factory" value={shortAddress(FACTORY_ADDRESS, 5)} sub="official deployment" />
          <MiniStat theme={theme} label="Created" value={factoryCount} sub="tokens tracked by factory" />
          <MiniStat theme={theme} label="Latest token" value={latestToken ? shortAddress(latestToken, 5) : "—"} sub="last factory deployment" />
          <MiniStat theme={theme} label="Wallet" value={shortAddress(address, 5)} sub={privateKey ? "unlocked" : "locked"} />
        </div>

        {!networkReady ? (
          <div className="wallet-empty-state" style={{ padding: 18, marginTop: 14 }}>
            <div className="wallet-empty-title">Token Factory works only on INRI</div>
            <div className="wallet-empty-description">Current network: {network.name}. Switch to INRI before launching a token.</div>
            <div className="wallet-action-row">
              <ActionButton theme={theme} tone="primary" onClick={switchToInri}>Switch to INRI</ActionButton>
              {setTab ? <ActionButton theme={theme} tone="ghost" onClick={() => setTab("networks")}>Open Networks</ActionButton> : null}
            </div>
          </div>
        ) : null}
      </ScreenCard>

      <div className="wallet-factory-layout">
        <ScreenCard theme={theme} className="wallet-factory-main">
          <SectionTitle title="Launch panel" subtitle="Fill the token data, review the preview and confirm the transaction." theme={theme} compact />

          <div className="wallet-form-grid">
            <FactoryInput theme={theme} label="Token name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} placeholder="Example: INRI COMMUNITY TOKEN" helper="Visible name users will see in wallets and explorer." />
            <FactoryInput theme={theme} label="Symbol" value={form.symbol} onChange={(value) => setForm((current) => ({ ...current, symbol: value.toUpperCase().slice(0, 12) }))} placeholder="Example: ICT" helper="Ticker usually has 3 to 8 characters." uppercase />
            <FactoryInput theme={theme} label="Decimals" value={form.decimals} onChange={(value) => setForm((current) => ({ ...current, decimals: value.replace(/[^0-9]/g, "").slice(0, 3) }))} placeholder="18" helper="Most ERC-20 tokens use 18 decimals." inputMode="numeric" />
            <FactoryInput theme={theme} label="Initial supply" value={form.supply} onChange={(value) => setForm((current) => ({ ...current, supply: value.replace(/[^0-9,_\s]/g, "") }))} placeholder="1000000" helper="Use whole numbers only. The live factory determines final supply scaling." inputMode="numeric" />
          </div>

          <div className="wallet-list-row wallet-token-form-preview" style={{ marginTop: 14, background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#e6ecf5" : "#202635" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <LogoImage src={resolveTokenAsset({ symbol: form.symbol || "TOK", name: form.name || "Token", networkKey: "inri" })} alt={form.symbol || "Token"} kind="token" label={form.name || form.symbol || "Token"} symbol={form.symbol || "TOK"} size={42} rounded={false} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#fff", fontSize: 16 }}>{form.symbol || "TOKEN"}</div>
                <div className="wallet-ui-subtle">{form.name || "Token preview"}</div>
              </div>
            </div>
            <div className="wallet-ui-subtle" style={{ textAlign: "right" }}>
              {form.supply || "0"} supply<br />{form.decimals || "18"} decimals
            </div>
          </div>

          <div className="wallet-action-row" style={{ marginTop: 14 }}>
            <ActionButton theme={theme} tone="primary" onClick={createToken} disabled={busy || !networkReady || !address}>
              {busy ? "Creating token..." : "Create token"}
            </ActionButton>
            <ActionButton theme={theme} tone="secondary" onClick={() => setForm(initialForm)} disabled={busy}>Clear</ActionButton>
            <ActionButton theme={theme} tone="ghost" onClick={() => refreshFactoryStats()} disabled={busy}>Refresh</ActionButton>
          </div>
        </ScreenCard>

        <ScreenCard theme={theme} className="wallet-factory-side">
          <SectionTitle title="Launch summary" subtitle="Review before signing." theme={theme} compact />
          <div style={{ display: "grid", gap: 10 }}>
            {previewItems.map((item) => (
              <div key={item.label} className="wallet-token-stat-card" style={{ background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#dbe2f0" : "#202635" }}>
                <span className="wallet-ui-subtle" style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: ".12em" }}>{item.label}</span>
                <strong style={{ color: isLight ? "#10131a" : "#fff", overflowWrap: "anywhere" }}>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="wallet-list-row" style={{ marginTop: 14, alignItems: "flex-start", background: isLight ? "#f8fbff" : "#0f1520", borderColor: isLight ? "#dbe2f0" : "#202635" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 900, color: isLight ? "#10131a" : "#fff" }}>{status}</div>
              <div className="wallet-ui-subtle" style={{ marginTop: 8, overflowWrap: "anywhere" }}>Factory: {FACTORY_ADDRESS}</div>
              {resolvedSignature ? <div className="wallet-ui-subtle" style={{ marginTop: 6 }}>Method: {resolvedSignature}</div> : null}
              {estimating ? <div className="wallet-ui-subtle" style={{ marginTop: 6 }}>Estimating gas...</div> : gasEstimate ? <div className="wallet-ui-subtle" style={{ marginTop: 6 }}>Estimated gas: {gasEstimate}</div> : null}
              {error ? <div style={{ marginTop: 10, color: "#ff7b7b", fontWeight: 800, lineHeight: 1.6 }}>{error}</div> : null}
            </div>
          </div>

          {txHash ? (
            <div className="wallet-list-row" style={{ marginTop: 12, justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#fff" }}>Transaction</div>
                <div className="wallet-ui-subtle" style={{ overflowWrap: "anywhere" }}>{txHash}</div>
              </div>
              <ExplorerLink href={`${EXPLORER_TX_URL}${txHash}`}>Open tx</ExplorerLink>
            </div>
          ) : null}

          {createdToken ? (
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <div className="wallet-list-row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#fff" }}>Created token</div>
                  <div className="wallet-ui-subtle" style={{ overflowWrap: "anywhere" }}>{createdToken}</div>
                </div>
                <ExplorerLink href={`${EXPLORER_ADDRESS_URL}${createdToken}`}>Explorer</ExplorerLink>
              </div>
              <div className="wallet-action-row">
                <ActionButton theme={theme} tone="primary" onClick={addLatestTokenAgain}>Add token again</ActionButton>
                {setTab ? <ActionButton theme={theme} tone="secondary" onClick={() => setTab("tokens")}>Open Tokens</ActionButton> : null}
              </div>
            </div>
          ) : null}

          <div className="wallet-action-row" style={{ marginTop: 12 }}>
            <ActionButton theme={theme} tone="ghost" onClick={copyFactory}>{copied ? "Copied" : "Copy factory"}</ActionButton>
            <a href={`${EXPLORER_ADDRESS_URL}${FACTORY_ADDRESS}`} target="_blank" rel="noreferrer" className="wallet-link-like">Factory explorer</a>
          </div>
        </ScreenCard>
      </div>

      <ScreenCard theme={theme}>
        <SectionTitle title="Token Factory notes" subtitle="Safe launch checklist." theme={theme} compact />
        <EmptyState theme={theme} title="Review before launch" description="Token name, symbol, decimals and supply are permanent after creation. Test with small community tokens first, then share the explorer address after the transaction confirms." />
      </ScreenCard>
    </div>
  );
}
