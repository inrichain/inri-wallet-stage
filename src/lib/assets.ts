const BASE = import.meta.env.BASE_URL || "/";

export type AssetKind = "network" | "token" | "dapp" | "wallet";

export type AssetRegistryEntry = {
  path: string;
  label?: string;
  updatedAt: number;
};

export type AssetRegistry = {
  networks: Record<string, AssetRegistryEntry>;
  tokens: Record<string, AssetRegistryEntry>;
  dapps: Record<string, AssetRegistryEntry>;
  wallets: Record<string, AssetRegistryEntry>;
};

export const ASSET_REGISTRY_KEY = "inri_wallet_asset_registry_v1";

const NETWORK_ALIASES: Record<string, string[]> = {
  bsc: ["bnb", "bsc"],
  binance: ["bnb", "bsc"],
  zksync: ["zksyncera", "zksync"],
  sei: ["seievm", "sei"],
  op: ["optimism", "op"],
};

const TOKEN_ALIASES: Record<string, string[]> = {
  inri: ["inri"],
  iusd: ["iusd"],
  winri: ["winri"],
  dnr: ["dnr"],
  usdt: ["usdt", "tether"],
  usdc: ["usdc", "usdcoin"],
  eth: ["eth", "ethereum"],
  pol: ["pol", "matic", "polygon"],
  bnb: ["bnb", "bsc"],
  avax: ["avax", "avalanche"],
  celo: ["celo"],
  sei: ["sei", "seievm"],
};


const WALLET_ALIASES: Record<string, string[]> = {
  ledger: ["ledger"],
  trezor: ["trezor"],
  lattice: ["lattice", "gridpluslattice"],
  qr: ["qr", "qrbased", "walletconnectqr"],
  qrbased: ["qr", "qrbased", "walletconnectqr"],
  seedimport: ["seedimport", "import", "seed"],
  browsersync: ["browsersync", "sync", "browser"],
  walletconnect: ["walletconnect", "wc"],
};

const DEFAULT_PUBLIC_REGISTRY: AssetRegistry = {
  networks: {
    inri: { path: "network-inri.png", updatedAt: 0 },
    ethereum: { path: "network-ethereum.png", updatedAt: 0 },
    polygon: { path: "network-polygon.png", updatedAt: 0 },
    bnb: { path: "network-bnb.png", updatedAt: 0 },
    bsc: { path: "network-bnb.png", updatedAt: 0 },
    arbitrum: { path: "network-arbitrum.png", updatedAt: 0 },
    optimism: { path: "network-optimism.png", updatedAt: 0 },
    base: { path: "network-base.png", updatedAt: 0 },
    avalanche: { path: "network-avalanche.png", updatedAt: 0 },
    fantom: { path: "network-fantom.png", updatedAt: 0 },
    gnosis: { path: "network-gnosis.png", updatedAt: 0 },
    linea: { path: "network-linea.png", updatedAt: 0 },
    mantle: { path: "network-mantle.png", updatedAt: 0 },
    zksyncera: { path: "network-zksyncera.png", updatedAt: 0 },
    zksync: { path: "network-zksyncera.png", updatedAt: 0 },
    scroll: { path: "network-scroll.png", updatedAt: 0 },
    zora: { path: "network-zora.png", updatedAt: 0 },
    blast: { path: "network-blast.png", updatedAt: 0 },
    mode: { path: "network-mode.png", updatedAt: 0 },
    celo: { path: "network-celo.png", updatedAt: 0 },
    seievm: { path: "network-seievm.png", updatedAt: 0 },
    sei: { path: "network-seievm.png", updatedAt: 0 },
    berachain: { path: "network-berachain.png", updatedAt: 0 },
  },
  tokens: {
    inri: { path: "token-inri.png", updatedAt: 0 },
    iusd: { path: "token-iusd.png", updatedAt: 0 },
    winri: { path: "token-winri.png", updatedAt: 0 },
    dnr: { path: "token-dnr.png", updatedAt: 0 },
    usdt: { path: "token-usdt.png", updatedAt: 0 },
    usdc: { path: "token-usdc.png", updatedAt: 0 },
    eth: { path: "token-eth.png", updatedAt: 0 },
    pol: { path: "token-pol.png", updatedAt: 0 },
    bnb: { path: "token-bnb.png", updatedAt: 0 },
    avax: { path: "token-avax.png", updatedAt: 0 },
    celo: { path: "token-celo.png", updatedAt: 0 },
    sei: { path: "token-sei.png", updatedAt: 0 },
  },
  dapps: {
    inri: { path: "brand-inri.png", updatedAt: 0 },
    walletconnect: { path: "brand-walletconnect.png", updatedAt: 0 },
  },
  wallets: {
    ledger: { path: "wallet-ledger.png", updatedAt: 0 },
    trezor: { path: "wallet-trezor.png", updatedAt: 0 },
    lattice: { path: "wallet-lattice.png", updatedAt: 0 },
    qr: { path: "wallet-qrbased.png", updatedAt: 0 },
    qrbased: { path: "wallet-qrbased.png", updatedAt: 0 },
    seedimport: { path: "wallet-seedimport.png", updatedAt: 0 },
    browsersync: { path: "wallet-browsersync.png", updatedAt: 0 },
  },
};

export function sanitizeAssetKey(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeAssetPath(path: string) {
  const raw = String(path || "").trim();
  if (!raw) return "";
  if (/^(data:|blob:|https?:\/\/|\/)/i.test(raw)) return raw;
  return `${BASE}${raw.replace(/^\.\//, "").replace(/^\//, "")}`;
}

function cloneRegistry(registry: AssetRegistry): AssetRegistry {
  return {
    networks: { ...(registry.networks || {}) },
    tokens: { ...(registry.tokens || {}) },
    dapps: { ...(registry.dapps || {}) },
    wallets: { ...(registry.wallets || {}) },
  };
}

function emptyRegistry(): AssetRegistry {
  return { networks: {}, tokens: {}, dapps: {}, wallets: {} };
}

export function getDefaultAssetRegistry() {
  return cloneRegistry(DEFAULT_PUBLIC_REGISTRY);
}

export function getAssetRegistry(): AssetRegistry {
  try {
    const parsed = JSON.parse(localStorage.getItem(ASSET_REGISTRY_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return getDefaultAssetRegistry();
    return {
      networks: { ...DEFAULT_PUBLIC_REGISTRY.networks, ...(parsed.networks || {}) },
      tokens: { ...DEFAULT_PUBLIC_REGISTRY.tokens, ...(parsed.tokens || {}) },
      dapps: { ...DEFAULT_PUBLIC_REGISTRY.dapps, ...(parsed.dapps || {}) },
      wallets: { ...DEFAULT_PUBLIC_REGISTRY.wallets, ...(parsed.wallets || {}) },
    };
  } catch {
    return getDefaultAssetRegistry();
  }
}

export function saveAssetRegistry(registry: AssetRegistry) {
  localStorage.setItem(ASSET_REGISTRY_KEY, JSON.stringify(registry));
  window.dispatchEvent(new Event("wallet-assets-updated"));
}

export function resetAssetRegistry() {
  saveAssetRegistry(getDefaultAssetRegistry());
}

export function updateAssetRegistryEntry(kind: AssetKind, key: string, path: string, label?: string) {
  const cleanKey = sanitizeAssetKey(key);
  if (!cleanKey) return null;
  const registry = getAssetRegistry();
  const bucket = kind === "network" ? registry.networks : kind === "token" ? registry.tokens : kind === "dapp" ? registry.dapps : registry.wallets;
  const cleanPath = String(path || "").trim();
  if (!cleanPath) {
    delete bucket[cleanKey];
  } else {
    bucket[cleanKey] = { path: cleanPath, label: label || bucket[cleanKey]?.label, updatedAt: Date.now() };
  }
  saveAssetRegistry(registry);
  return bucket[cleanKey] || null;
}

export function removeAssetRegistryEntry(kind: AssetKind, key: string) {
  return updateAssetRegistryEntry(kind, key, "");
}

function initialsFromText(value: string, fallback = "?") {
  const parts = String(value || "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return fallback;
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

function encodeSvg(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\n\s*/g, ""))}`;
}

export function buildBadgeImage({
  label,
  symbol,
  color = "#3f7cff",
  rounded = true,
}: {
  label: string;
  symbol?: string;
  color?: string;
  rounded?: boolean;
}) {
  const initials = initialsFromText(label, "N");
  const symbolSafe = String(symbol || initials || "NET").slice(0, 4).toUpperCase();
  const radius = rounded ? 32 : 22;
  return encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${color}" />
          <stop offset="100%" stop-color="#111827" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="${radius}" fill="url(#g)"/>
      <circle cx="64" cy="40" r="22" fill="rgba(255,255,255,.12)"/>
      <text x="64" y="49" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#ffffff">${initials}</text>
      <text x="64" y="90" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" fill="#ffffff">${symbolSafe}</text>
    </svg>
  `);
}

function buildDappBadge(name: string, color = "#8b5cf6") {
  const initials = initialsFromText(name, "D");
  return encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${color}" />
          <stop offset="100%" stop-color="#111827" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="30" fill="url(#g)"/>
      <circle cx="64" cy="64" r="32" fill="rgba(255,255,255,.12)"/>
      <text x="64" y="74" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="800" fill="#ffffff">${initials}</text>
    </svg>
  `);
}

function networkCandidates(key?: string, name?: string) {
  const cleanKey = sanitizeAssetKey(key || "");
  const cleanName = sanitizeAssetKey(name || "");
  const aliases = [...(NETWORK_ALIASES[cleanKey] || []), ...(NETWORK_ALIASES[cleanName] || [])];
  return unique([cleanKey, cleanName, ...aliases]);
}

function tokenCandidates(symbol?: string, name?: string, networkKey?: string) {
  const cleanSymbol = sanitizeAssetKey(symbol || "");
  const cleanName = sanitizeAssetKey(name || "");
  const cleanNetwork = sanitizeAssetKey(networkKey || "");
  const aliases = [
    ...(TOKEN_ALIASES[cleanSymbol] || []),
    ...(TOKEN_ALIASES[cleanName] || []),
    ...(TOKEN_ALIASES[cleanNetwork] || []),
  ];
  return unique([cleanSymbol, cleanName, cleanNetwork, ...aliases]);
}

function walletCandidates(key?: string, name?: string) {
  const cleanKey = sanitizeAssetKey(key || "");
  const cleanName = sanitizeAssetKey(name || "");
  const aliases = [...(WALLET_ALIASES[cleanKey] || []), ...(WALLET_ALIASES[cleanName] || [])];
  return unique([cleanKey, cleanName, ...aliases]);
}

function resolveRegistryPath(kind: AssetKind, candidates: string[]) {
  const registry = getAssetRegistry();
  const bucket = kind === "network" ? registry.networks : kind === "token" ? registry.tokens : kind === "dapp" ? registry.dapps : registry.wallets;
  for (const candidate of candidates) {
    const entry = bucket[sanitizeAssetKey(candidate)];
    if (entry?.path) return normalizeAssetPath(entry.path);
  }
  return "";
}

export function listRegistryEntries(kind: AssetKind) {
  const registry = getAssetRegistry();
  const bucket = kind === "network" ? registry.networks : kind === "token" ? registry.tokens : kind === "dapp" ? registry.dapps : registry.wallets;
  return Object.entries(bucket)
    .map(([key, value]) => ({ key, ...value, path: normalizeAssetPath(value.path) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function resolveNetworkAsset(input: {
  key?: string;
  name?: string;
  symbol?: string;
  logo?: string;
  color?: string;
}) {
  if (input.logo) return normalizeAssetPath(input.logo);
  const candidates = networkCandidates(input.key, input.name);
  const registryPath = resolveRegistryPath("network", candidates);
  if (registryPath) return registryPath;
  if (candidates[0]) return normalizeAssetPath(`network-${candidates[0]}.png`);
  return buildBadgeImage({ label: input.name || "Network", symbol: input.symbol || "NET", color: input.color || "#3f7cff" });
}

export function resolveTokenAsset(input: {
  symbol?: string;
  name?: string;
  networkKey?: string;
  logo?: string;
  color?: string;
}) {
  if (input.logo) return normalizeAssetPath(input.logo);
  const candidates = tokenCandidates(input.symbol, input.name, input.networkKey);
  const registryPath = resolveRegistryPath("token", candidates);
  if (registryPath) return registryPath;
  if (candidates.length) return normalizeAssetPath(`token-${candidates[0]}.png`);
  return buildBadgeImage({ label: input.name || input.symbol || "Token", symbol: input.symbol || "TOK", color: input.color || "#06b6d4", rounded: false });
}

export function resolveDappAsset(icon?: string, name?: string) {
  if (icon) return normalizeAssetPath(icon);
  const candidates = unique([sanitizeAssetKey(name || ""), "inri"]);
  const registryPath = resolveRegistryPath("dapp", candidates);
  if (registryPath) return registryPath;
  return buildDappBadge(name || "dApp");
}

export function resolveWalletAsset(input: {
  key?: string;
  name?: string;
  logo?: string;
  color?: string;
}) {
  if (input.logo) return normalizeAssetPath(input.logo);
  const candidates = walletCandidates(input.key, input.name);
  const registryPath = resolveRegistryPath("wallet", candidates);
  if (registryPath) return registryPath;
  if (candidates[0]) return normalizeAssetPath(`wallet-${candidates[0]}.png`);
  return buildBadgeImage({ label: input.name || input.key || "Wallet", symbol: "WAL", color: input.color || "#111827", rounded: false });
}

export function fallbackAsset(kind: AssetKind, options?: { label?: string; symbol?: string; color?: string }) {
  if (kind === "token") {
    return buildBadgeImage({ label: options?.label || "Token", symbol: options?.symbol || "TOK", color: options?.color || "#06b6d4", rounded: false });
  }
  if (kind === "dapp") {
    return buildDappBadge(options?.label || "dApp", options?.color || "#8b5cf6");
  }
  if (kind === "wallet") {
    return buildBadgeImage({ label: options?.label || "Wallet", symbol: options?.symbol || "WAL", color: options?.color || "#111827", rounded: false });
  }
  return buildBadgeImage({ label: options?.label || "Network", symbol: options?.symbol || "NET", color: options?.color || "#3f7cff" });
}

export function seedAssetRegistry(entries?: Partial<AssetRegistry>) {
  const base = emptyRegistry();
  const next = {
    networks: { ...base.networks, ...(entries?.networks || {}), ...DEFAULT_PUBLIC_REGISTRY.networks },
    tokens: { ...base.tokens, ...(entries?.tokens || {}), ...DEFAULT_PUBLIC_REGISTRY.tokens },
    dapps: { ...base.dapps, ...(entries?.dapps || {}), ...DEFAULT_PUBLIC_REGISTRY.dapps },
    wallets: { ...base.wallets, ...(entries?.wallets || {}), ...DEFAULT_PUBLIC_REGISTRY.wallets },
  };
  saveAssetRegistry(next);
}
