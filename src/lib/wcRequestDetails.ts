import { ethers } from "ethers";
import { tr, trf } from "../i18n/translations";
import { getNetworkByChainId, getStoredNetwork } from "./network";
import { analyzeTransactionCalldata } from "./txAnalysis";

function shorten(value: string, left = 8, right = 6) {
  if (!value) return "-";
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

function prettyMethod(method: string, lang = "en") {
  if (!method) return tr(lang, "wc_details_unknown");
  return method.replace(/^eth_/, "").replace(/^personal_/, "").replace(/^wallet_/, "");
}

function titleCase(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
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

function resolveNetwork(requestChainId?: string | null) {
  const raw = String(requestChainId || "");
  const parsed = raw.startsWith("eip155:") ? Number(raw.split(":")[1]) : Number(raw);
  if (Number.isFinite(parsed)) {
    const known = getNetworkByChainId(parsed);
    if (known) return known;
  }
  return getStoredNetwork();
}

function summarizeTypedData(payload: any, lang = "en") {
  if (!payload) return null;
  const domainName = payload?.domain?.name || tr(lang, "wc_details_unknown_domain");
  const primaryType = payload?.primaryType || tr(lang, "wc_details_unknown_type");
  const keys = Object.keys(payload?.message || {});

  return {
    domainName,
    primaryType,
    fieldCount: keys.length,
    fields: keys.slice(0, 8),
  };
}

export function buildWcRequestDetails(request: any, lang = "en") {
  const network = resolveNetwork(request?.chainId);
  const chainId = Number(network?.chainId || 3777);
  const method = request?.method || tr(lang, "wc_details_unknown");
  const cleanMethod = prettyMethod(method, lang);
  const cleanMethodLabel = titleCase(cleanMethod);

  const base = {
    method,
    methodLabel: cleanMethod,
    chainLabel: request?.chainId || `eip155:${chainId}`,
    networkName: network?.name || tr(lang, "wc_details_current_network"),
    networkLogo: network?.logo || "",
    dappName: request?.peerMetadata?.name || tr(lang, "wc_details_unknown_dapp"),
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
    const estimatedFee = gasLimit !== undefined && effectiveGasPrice !== undefined ? gasLimit * effectiveGasPrice : undefined;
    const hasData = !!tx?.data && tx.data !== "0x";
    const analysis = analyzeTransactionCalldata(tx?.data);

    const riskItems: string[] = [];
    if (!tx?.to) riskItems.push(tr(lang, "wc_details_contract_creation"));
    if (hasData) riskItems.push(tr(lang, "wc_details_calls_contract"));
    if (value > 0n) riskItems.push(tr(lang, "wc_details_moves_funds"));
    if (analysis?.warnings?.length) riskItems.push(...analysis.warnings);
    if (riskItems.length === 0) riskItems.push(tr(lang, "wc_details_confirm_destination"));

    return {
      ...base,
      kind: "transaction",
      title: trf(lang, "wc_details_send_title", { network: network?.name || "Wallet" }),
      subtitle: analysis ? `${analysis.action} • ${analysis.functionName}` : tr(lang, "wc_details_send_subtitle"),
      from: tx?.from ? shorten(tx.from) : tr(lang, "wc_details_current_wallet"),
      to: tx?.to ? shorten(tx.to) : tr(lang, "wc_details_new_contract"),
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
          : tr(lang, "wc_details_estimated_by_network"),
      dataPreview: hasData ? shorten(tx.data, 14, 10) : tr(lang, "wc_details_no_calldata"),
      rawTx: tx,
      riskItems,
      analysis,
      riskLevel: analysis?.riskLevel || (hasData ? "medium" : "low"),
      displayMethod: analysis?.action || cleanMethodLabel,
    };
  }

  if (method === "wallet_switchEthereumChain") {
    const requested = Array.isArray(request?.params) ? request.params?.[0]?.chainId : request?.params?.chainId;
    const parsed = typeof requested === "string" && requested.startsWith("0x") ? Number(BigInt(requested)) : Number(requested);
    const target = Number.isFinite(parsed) ? resolveNetwork(`eip155:${parsed}`) : network;
    return {
      ...base,
      kind: "networkSwitch",
      title: `Switch to ${target?.name || "requested network"}`,
      subtitle: `The dApp wants to switch from ${network?.name || "current network"} to ${target?.name || "another network"}.`,
      requestedNetwork: target?.name || "Unknown network",
      requestedChainId: Number(target?.chainId || parsed || 0),
      currentNetwork: getStoredNetwork().name,
      riskItems: [
        "Confirm the requested network before continuing.",
        "Only approve network switches you trust.",
      ],
      displayMethod: cleanMethodLabel,
    };
  }

  if (method === "wallet_addEthereumChain") {
    const payload = Array.isArray(request?.params) ? request.params?.[0] : request?.params;
    return {
      ...base,
      kind: "networkAdd",
      title: `Add network ${payload?.chainName || "custom chain"}`,
      subtitle: "The dApp wants to add a custom RPC network to the wallet.",
      requestedNetwork: payload?.chainName || "Custom network",
      requestedChainId: payload?.chainId,
      requestedRpc: payload?.rpcUrls?.[0] || "-",
      riskItems: [
        "Check the RPC URL and chain ID carefully.",
        "Only add custom networks from trusted sources.",
      ],
      rawParams: payload,
      displayMethod: cleanMethodLabel,
    };
  }

  if (method === "personal_sign" || method === "eth_sign") {
    const rawMessage = Array.isArray(request?.params) ? request.params[0] ?? request.params[1] : "";

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
      title: trf(lang, "wc_details_sign_message_title", { network: network?.name || "Wallet" }),
      subtitle: tr(lang, "wc_details_sign_message_subtitle"),
      preview: messageText,
      riskItems: [tr(lang, "wc_details_sign_message_risk")],
      displayMethod: cleanMethodLabel,
    };
  }

  if (method === "eth_signTypedData" || method === "eth_signTypedData_v3" || method === "eth_signTypedData_v4") {
    const payloadRaw = Array.isArray(request?.params) ? request.params[1] : null;
    const payload = typeof payloadRaw === "string" ? parseJsonSafe(payloadRaw) : payloadRaw;
    const summary = summarizeTypedData(payload, lang);
    const analysis = analyzeTransactionCalldata(payload?.message?.data || payload?.message?.input || payload?.message?.calldata);

    return {
      ...base,
      kind: "typedData",
      title: trf(lang, "wc_details_sign_typed_title", { network: network?.name || "Wallet" }),
      subtitle: analysis ? `${summary?.primaryType || "Typed data"} • ${analysis.action}` : tr(lang, "wc_details_sign_typed_subtitle"),
      summary,
      analysis,
      riskItems: [
        tr(lang, "wc_details_typed_risk1"),
        tr(lang, "wc_details_typed_risk2"),
        ...(analysis?.warnings || []),
      ],
      displayMethod: cleanMethodLabel,
    };
  }

  return {
    ...base,
    kind: "raw",
    title: `${network?.name || "Wallet"} request`,
    subtitle: tr(lang, "wc_details_confirm_subtitle"),
    riskItems: [tr(lang, "wc_details_unknown_method_risk")],
    displayMethod: cleanMethodLabel,
  };
}
