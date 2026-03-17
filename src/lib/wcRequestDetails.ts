import { ethers } from "ethers";
import { getStoredNetwork } from "./network";

function shorten(value: string, left = 8, right = 6) {
  if (!value) return "-";
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

function hexToBigIntSafe(value?: string | null): bigint | undefined {
  if (!value) return undefined;
  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
}

function formatUnitsSafe(value: bigint | undefined, decimals = 18, maxDecimals = 6) {
  if (value === undefined) return "-";
  try {
    const raw = ethers.formatUnits(value, decimals);
    const [intPart, frac = ""] = raw.split(".");
    const trimmed = frac.slice(0, maxDecimals).replace(/0+$/, "");
    return trimmed ? `${intPart}.${trimmed}` : intPart;
  } catch {
    return value.toString();
  }
}

function formatGwei(value: bigint | undefined) {
  if (value === undefined) return "-";
  try {
    return `${formatUnitsSafe(value, 9, 4)} Gwei`;
  } catch {
    return value.toString();
  }
}

function parseJsonSafe(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function summarizeTypedData(payload: any) {
  if (!payload) return null;
  const domainName = payload?.domain?.name || "Unknown domain";
  const primaryType = payload?.primaryType || "Unknown type";
  const keys = Object.keys(payload?.message || {});

  return {
    domainName,
    primaryType,
    fieldCount: keys.length,
    fields: keys.slice(0, 8),
  };
}

function getMethodLabel(method: string) {
  switch (method) {
    case "eth_sendTransaction":
      return "sendTransaction";
    case "personal_sign":
      return "personalSign";
    case "eth_signTypedData_v4":
      return "signTypedData_v4";
    default:
      return method;
  }
}

export function buildWcRequestDetails(request: any) {
  const network = getStoredNetwork();
  const chainId = Number(network?.chainId || 3777);
  const method = request?.method || "unknown";

  const base = {
    method,
    methodLabel: getMethodLabel(method),
    chainLabel: request?.chainId || `eip155:${chainId}`,
    networkName: network?.name || "Current network",
    networkIcon: network?.logo || "",
    dappName: request?.peerMetadata?.name || "Unknown dApp",
    dappUrl: request?.peerMetadata?.url || "",
    dappIcon: request?.peerMetadata?.icons?.[0] || "",
    rawParams: request?.params,
    riskItems: [] as string[],
  };

  if (method === "eth_sendTransaction") {
    const tx = Array.isArray(request?.params) ? request.params[0] : request?.params;
    const value = hexToBigIntSafe(tx?.value) ?? 0n;
    const gasLimit = hexToBigIntSafe(tx?.gas);
    const gasPrice = hexToBigIntSafe(tx?.gasPrice);
    const maxFeePerGas = hexToBigIntSafe(tx?.maxFeePerGas);
    const maxPriorityFeePerGas = hexToBigIntSafe(tx?.maxPriorityFeePerGas);
    const effectiveGasPrice = maxFeePerGas ?? gasPrice;
    const estimatedFee =
      gasLimit !== undefined && effectiveGasPrice !== undefined
        ? gasLimit * effectiveGasPrice
        : undefined;
    const hasData = !!tx?.data && tx.data !== "0x";

    const riskItems: string[] = [];
    if (!tx?.to) riskItems.push("Contract creation or malformed transaction without destination.");
    if (hasData) riskItems.push("This transaction calls contract code. Review method intent carefully.");
    if (value > 0n) riskItems.push("This will move native funds from your wallet.");

    return {
      ...base,
      kind: "transaction",
      title: `${network?.name || "Wallet"} send transaction`,
      subtitle: "Review the action before sending it on-chain.",
      from: tx?.from ? shorten(tx.from) : "Current wallet",
      to: tx?.to ? shorten(tx.to) : "New contract",
      toFull: tx?.to || "",
      contractInteraction: hasData,
      valueNative: `${formatUnitsSafe(value, 18, 6)} ${network?.symbol || "INRI"}`,
      valueWei: value.toString(),
      gasLimit: gasLimit?.toString() || "Auto",
      gasPrice: gasPrice ? formatGwei(gasPrice) : "-",
      maxFeePerGas: maxFeePerGas ? formatGwei(maxFeePerGas) : "-",
      maxPriorityFeePerGas: maxPriorityFeePerGas ? formatGwei(maxPriorityFeePerGas) : "-",
      estimatedFeeNative:
        estimatedFee !== undefined
          ? `${formatUnitsSafe(estimatedFee, 18, 6)} ${network?.symbol || "INRI"}`
          : "Will be estimated by network",
      dataPreview: hasData ? shorten(tx.data, 14, 10) : "No calldata",
      rawTx: tx,
      riskItems,
    };
  }

  if (method === "personal_sign") {
    const rawMessage = Array.isArray(request?.params)
      ? (request.params[0] ?? request.params[1])
      : "";

    const messageText =
      typeof rawMessage === "string" && rawMessage.startsWith("0x")
        ? (() => {
            try {
              return ethers.toUtf8String(rawMessage);
            } catch {
              return rawMessage;
            }
          })()
        : String(rawMessage ?? "");

    return {
      ...base,
      kind: "message",
      title: `${network?.name || "Wallet"} sign message`,
      subtitle: "Signing proves wallet control but does not send funds by itself.",
      preview: messageText,
      riskItems: [
        "Only sign messages you trust. They can authorize off-chain actions.",
      ],
    };
  }

  if (method === "eth_signTypedData_v4") {
    const payloadRaw = Array.isArray(request?.params) ? request.params[1] : null;
    const payload = typeof payloadRaw === "string" ? parseJsonSafe(payloadRaw) : payloadRaw;
    const summary = summarizeTypedData(payload);

    return {
      ...base,
      kind: "typedData",
      title: `${network?.name || "Wallet"} sign typed data`,
      subtitle: "Typed data is commonly used for permits, login, and advanced dApp actions.",
      summary,
      riskItems: [
        "Typed data can authorize spending permissions or delegated actions.",
        "Check the domain and primary type before approving.",
      ],
    };
  }

  return {
    ...base,
    kind: "raw",
    title: "Confirm request",
    subtitle: "Unsupported request preview. Review the raw payload before approving.",
    riskItems: ["Unknown or advanced method. Approve only if you fully trust this dApp."],
  };
}
