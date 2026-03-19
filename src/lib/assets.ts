const BASE = import.meta.env.BASE_URL || "/";

export type AssetKind = "network" | "token" | "dapp";

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

export function sanitizeAssetKey(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
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

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
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

export function resolveNetworkAsset(input: {
  key?: string;
  name?: string;
  symbol?: string;
  logo?: string;
  color?: string;
}) {
  if (input.logo) return input.logo;
  const candidates = networkCandidates(input.key, input.name);
  if (candidates[0]) return `${BASE}network-${candidates[0]}.png`;
  return buildBadgeImage({ label: input.name || "Network", symbol: input.symbol || "NET", color: input.color || "#3f7cff" });
}

export function resolveTokenAsset(input: {
  symbol?: string;
  name?: string;
  networkKey?: string;
  logo?: string;
  color?: string;
}) {
  if (input.logo) return input.logo;
  const candidates = tokenCandidates(input.symbol, input.name, input.networkKey);
  if (candidates.length) {
    const primary = candidates[0];
    return `${BASE}token-${primary}.png`;
  }
  return buildBadgeImage({ label: input.name || input.symbol || "Token", symbol: input.symbol || "TOK", color: input.color || "#06b6d4", rounded: false });
}

export function resolveDappAsset(icon?: string, name?: string) {
  if (icon) return icon;
  return buildDappBadge(name || "dApp");
}

export function fallbackAsset(kind: AssetKind, options?: { label?: string; symbol?: string; color?: string }) {
  if (kind === "token") {
    return buildBadgeImage({ label: options?.label || "Token", symbol: options?.symbol || "TOK", color: options?.color || "#06b6d4", rounded: false });
  }
  if (kind === "dapp") {
    return buildDappBadge(options?.label || "dApp", options?.color || "#8b5cf6");
  }
  return buildBadgeImage({ label: options?.label || "Network", symbol: options?.symbol || "NET", color: options?.color || "#3f7cff" });
}
