import { ethers } from "ethers";

export type ParsedTypedData = {
  raw: any;
  domain: Record<string, any>;
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, any>;
};

function parseJsonLoose(value: any) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeDomain(domain: Record<string, any>) {
  const next = { ...(domain || {}) };
  if (next.chainId !== undefined && next.chainId !== null && next.chainId !== "") {
    const n = Number(next.chainId);
    if (Number.isFinite(n)) next.chainId = n;
  }
  return next;
}

export function parseTypedDataPayload(method: string, params: any): ParsedTypedData {
  const arr = Array.isArray(params) ? params : [params];

  let payload: any;

  if (method === "eth_signTypedData_v4" || method === "eth_signTypedData_v3") {
    payload = parseJsonLoose(arr[1] ?? arr[0]);
  } else {
    payload = parseJsonLoose(arr[0] ?? arr[1]);
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid typed data payload");
  }

  const rawTypes = typeof payload.types === "object" && payload.types ? payload.types : {};
  const types = { ...rawTypes } as Record<string, Array<{ name: string; type: string }>>;
  delete (types as any).EIP712Domain;

  const primaryType =
    payload.primaryType ||
    Object.keys(types).find((key) => Array.isArray(types[key]) && key !== "EIP712Domain") ||
    "Message";

  return {
    raw: payload,
    domain: normalizeDomain(payload.domain || {}),
    types,
    primaryType,
    message: typeof payload.message === "object" && payload.message ? payload.message : {},
  };
}

export function getTypedDataRiskHints(parsed: ParsedTypedData) {
  const hints: string[] = [];
  const domain = parsed.domain || {};
  const message = parsed.message || {};
  const fieldCount = Object.keys(message).length;

  if (!domain.name) hints.push("Domain name is missing.");
  if (!domain.verifyingContract) hints.push("No verifying contract declared.");
  if (fieldCount >= 8) hints.push("Large structured message with many fields.");

  for (const [key, value] of Object.entries(message)) {
    if (typeof value === "string" && value.startsWith("0x") && value.length > 90) {
      hints.push(`Field \"${key}\" contains long hex data.`);
      break;
    }
  }

  return hints;
}

export async function signTypedDataFromRequest(args: {
  method: string;
  params: any;
  privateKey: string;
}) {
  const parsed = parseTypedDataPayload(args.method, args.params);
  const wallet = new ethers.Wallet(args.privateKey);
  return wallet.signTypedData(parsed.domain, parsed.types, parsed.message);
}

export function formatValuePreview(value: any): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") {
    if (value.length > 84) return `${value.slice(0, 42)}…${value.slice(-12)}`;
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    const json = JSON.stringify(value);
    if (json.length > 84) return `${json.slice(0, 84)}…`;
    return json;
  } catch {
    return String(value);
  }
}
