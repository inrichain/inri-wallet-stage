export type SitePermission = {
  id: string;
  origin: string;
  name: string;
  type: "walletconnect" | "browser";
  createdAt: number;
  lastUsedAt: number;
  accounts: string[];
  chains: number[];
  methods: string[];
  icon?: string;
};

const KEY = "inri_wallet_site_permissions_v1";

function read(): SitePermission[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: SitePermission[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("wallet-site-permissions-updated"));
}

export function listSitePermissions() {
  return read().sort((a, b) => b.lastUsedAt - a.lastUsedAt);
}

export function grantSitePermission(input: Omit<SitePermission, "id" | "createdAt" | "lastUsedAt">) {
  const items = read();
  const origin = String(input.origin || "unknown").trim() || "unknown";
  const existing = items.find((item) => item.origin === origin && item.type === input.type);
  const now = Date.now();

  if (existing) {
    existing.name = input.name || existing.name;
    existing.accounts = Array.from(new Set([...(existing.accounts || []), ...(input.accounts || [])]));
    existing.chains = Array.from(new Set([...(existing.chains || []), ...(input.chains || [])]));
    existing.methods = Array.from(new Set([...(existing.methods || []), ...(input.methods || [])]));
    existing.icon = input.icon || existing.icon;
    existing.lastUsedAt = now;
    write(items);
    return existing;
  }

  const created: SitePermission = {
    id: `${origin}:${input.type}:${now}`,
    origin,
    name: input.name || origin,
    type: input.type,
    createdAt: now,
    lastUsedAt: now,
    accounts: Array.from(new Set(input.accounts || [])),
    chains: Array.from(new Set(input.chains || [])),
    methods: Array.from(new Set(input.methods || [])),
    icon: input.icon,
  };

  items.push(created);
  write(items);
  return created;
}

export function revokeSitePermission(id: string) {
  write(read().filter((item) => item.id !== id));
}
