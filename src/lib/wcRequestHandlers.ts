import { ethers } from "ethers";
import { getAllNetworks, getNetworkByChainId, getStoredNetwork, resolveNetworkLogo } from "./network";
import { resolveTokenAsset } from "./assets";

export function getSupportedNamespaces(address: string) {
  const chains = getAllNetworks().map((item) => `eip155:${Number(item.chainId)}`);

  return {
    eip155: {
      chains,
      methods: [
        "eth_accounts",
        "eth_requestAccounts",
        "eth_chainId",
        "personal_sign",
        "eth_sign",
        "eth_sendTransaction",
        "eth_signTypedData",
        "eth_signTypedData_v3",
        "eth_signTypedData_v4",
        "wallet_switchEthereumChain",
        "wallet_addEthereumChain",
        "wallet_watchAsset",
      ],
      events: ["accountsChanged", "chainChanged"],
      accounts: chains.map((chain) => `${chain}:${address}`),
    },
  };
}


const CUSTOM_TOKENS_KEY = "wallet_custom_tokens";

function readCustomTokensFromStorage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_TOKENS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function shortTokenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function normalizeWatchAssetParams(params: any) {
  const request = Array.isArray(params) ? params[0] : params;
  const type = String(request?.type || "").toUpperCase();
  const options = request?.options || {};
  const address = String(options?.address || "").trim();
  const symbol = String(options?.symbol || "").trim().toUpperCase().slice(0, 24);
  const name = String(options?.name || options?.tokenName || options?.label || "").trim();
  const image = String(options?.image || options?.logo || "").trim();
  const decimals = Number(options?.decimals ?? 18);

  if (type !== "ERC20") {
    throw new Error("Only ERC20 assets are supported");
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error("Invalid token address");
  }

  if (!symbol) {
    throw new Error("Invalid token symbol");
  }

  if (!Number.isFinite(decimals) || decimals < 0 || decimals > 36) {
    throw new Error("Invalid token decimals");
  }

  return { address, symbol, name, image, decimals };
}

export function addWatchedAssetToWallet(params: any, chainId?: string | null) {
  const asset = normalizeWatchAssetParams(params);
  const net = getNetworkForChainId(chainId);
  const networkKey = net?.key || getStoredNetwork().key || "inri";
  const existing = readCustomTokensFromStorage();
  const tokenKey = `${networkKey}:${asset.address.toLowerCase()}`;

  const nextToken = {
    symbol: asset.symbol,
    subtitle: asset.name || `custom token • ${shortTokenAddress(asset.address)}`,
    balance: "0.000000",
    logo: resolveTokenAsset({
      symbol: asset.symbol,
      name: asset.name || asset.symbol,
      networkKey,
      logo: asset.image,
    }),
    isDefault: false,
    address: asset.address,
    decimals: asset.decimals,
    networkKey,
  };

  const filtered = existing.filter((item: any) => {
    const itemNetwork = item?.networkKey || networkKey;
    const itemAddress = String(item?.address || "").toLowerCase();
    const itemKey = `${itemNetwork}:${itemAddress}`;
    return itemKey !== tokenKey;
  });

  localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify([...filtered, nextToken]));
  window.dispatchEvent(new Event("wallet-tokens-updated"));
  window.dispatchEvent(new Event("wallet-assets-updated"));
  return true;
}


function normalizeWcChainId(value?: string | null) {
  if (!value) return null;
  if (String(value).startsWith("eip155:")) {
    const parsed = Number(String(value).split(":")[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getNetworkForChainId(chainId?: string | null) {
  const requested = normalizeWcChainId(chainId);
  if (requested !== null) {
    const known = getNetworkByChainId(requested);
    if (known?.rpcUrl) return known;
  }
  return getStoredNetwork();
}

function hexToBigIntSafe(value?: string | null): bigint | undefined {
  if (!value) return undefined;
  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
}

export async function handleRequestMethod(args: {
  method: string;
  params: any;
  address: string;
  privateKey: string;
  chainId?: string | null;
}) {
  const { method, params, address, privateKey, chainId } = args;

  if (method === "eth_accounts" || method === "eth_requestAccounts") {
    return [address];
  }

  if (method === "eth_chainId") {
    const net = getNetworkForChainId(chainId);
    return ethers.toQuantity(Number(net.chainId));
  }

  if (method === "wallet_switchEthereumChain") {
    const nextChainRaw = Array.isArray(params) ? params?.[0]?.chainId : params?.chainId;
    const nextChainId = typeof nextChainRaw === "string" && nextChainRaw.startsWith("0x") ? Number(BigInt(nextChainRaw)) : Number(nextChainRaw);
    const next = Number.isFinite(nextChainId) ? getNetworkByChainId(nextChainId) : null;
    if (!next) {
      throw new Error("Requested chain is not configured in INRI Wallet");
    }
    localStorage.setItem("wallet_active_network", JSON.stringify(next));
    window.dispatchEvent(new Event("wallet-network-updated"));
    return null;
  }

  if (method === "wallet_watchAsset") {
    return addWatchedAssetToWallet(params, chainId);
  }

  if (method === "wallet_addEthereumChain") {
    const item = Array.isArray(params) ? params?.[0] : params;
    if (!item?.chainId || !item?.rpcUrls?.[0]) {
      throw new Error("Invalid add network request");
    }
    const chainId = String(item.chainId).startsWith("0x") ? Number(BigInt(item.chainId)) : Number(item.chainId);
    const network = {
      key: `custom-${chainId}`,
      name: item.chainName || `Chain ${chainId}`,
      chainId,
      symbol: item?.nativeCurrency?.symbol || "ETH",
      rpcUrl: item.rpcUrls[0],
      explorerAddressUrl: item?.blockExplorerUrls?.[0] ? `${String(item.blockExplorerUrls[0]).replace(/\/$/, "")}/address/` : "",
      explorerTxUrl: item?.blockExplorerUrls?.[0] ? `${String(item.blockExplorerUrls[0]).replace(/\/$/, "")}/tx/` : "",
      logo: getNetworkByChainId(chainId)?.logo || resolveNetworkLogo({ key: `custom-${chainId}`, name: item.chainName || `Chain ${chainId}`, symbol: item.nativeCurrency?.symbol || "ETH" }),
      isCustom: true,
    };
    localStorage.setItem("wallet_active_network", JSON.stringify(network));
    const existing = (() => {
      try { return JSON.parse(localStorage.getItem("wallet_custom_networks_v1") || "[]"); } catch { return []; }
    })();
    const next = Array.isArray(existing) ? existing.filter((entry: any) => Number(entry.chainId) !== chainId) : [];
    next.push(network);
    localStorage.setItem("wallet_custom_networks_v1", JSON.stringify(next));
    window.dispatchEvent(new Event("wallet-network-updated"));
    return null;
  }

  if (method === "personal_sign") {
    const wallet = new ethers.Wallet(privateKey);

    const rawMessage = Array.isArray(params)
      ? (params[0] ?? params[1])
      : "";

    const message =
      typeof rawMessage === "string" && rawMessage.startsWith("0x")
        ? ethers.getBytes(rawMessage)
        : String(rawMessage ?? "");

    return await wallet.signMessage(message);
  }

  if (method === "eth_sign") {
    const wallet = new ethers.Wallet(privateKey);
    const rawMessage = Array.isArray(params) ? (params[1] ?? params[0]) : "";
    const messageBytes = typeof rawMessage === "string" && rawMessage.startsWith("0x")
      ? ethers.getBytes(rawMessage)
      : ethers.toUtf8Bytes(String(rawMessage ?? ""));
    return await wallet.signMessage(messageBytes);
  }

  if (method === "eth_signTypedData" || method === "eth_signTypedData_v3" || method === "eth_signTypedData_v4") {
    const wallet = new ethers.Wallet(privateKey);
    const payloadRaw = Array.isArray(params) ? params[1] : null;
    const payload = typeof payloadRaw === "string" ? JSON.parse(payloadRaw) : payloadRaw;

    if (!payload) {
      throw new Error("Invalid typed data payload");
    }

    return await wallet.signTypedData(
      payload.domain || {},
      payload.types || {},
      payload.message || {}
    );
  }

  if (method === "eth_sendTransaction") {
    const tx = Array.isArray(params) ? params[0] : params;
    const net = getNetworkForChainId(chainId);

    if (!net?.rpcUrl) {
      throw new Error("RPC URL not configured for current network");
    }

    const provider = new ethers.JsonRpcProvider(net.rpcUrl, Number(net.chainId));
    const wallet = new ethers.Wallet(privateKey, provider);

    const txRequest: ethers.TransactionRequest = {
      to: tx?.to || undefined,
      data: tx?.data || undefined,
      value: hexToBigIntSafe(tx?.value) ?? 0n,
      gasLimit: hexToBigIntSafe(tx?.gas),
      gasPrice: hexToBigIntSafe(tx?.gasPrice),
      maxFeePerGas: hexToBigIntSafe(tx?.maxFeePerGas),
      maxPriorityFeePerGas: hexToBigIntSafe(tx?.maxPriorityFeePerGas),
      nonce:
        tx?.nonce !== undefined && tx?.nonce !== null
          ? Number(tx.nonce)
          : undefined,
      chainId: Number(net.chainId),
    };

    const sent = await wallet.sendTransaction(txRequest);
    return sent.hash;
  }

  throw new Error(`Unsupported method: ${method}`);
}
