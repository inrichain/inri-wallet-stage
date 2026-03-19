import { ethers } from "ethers";
import { DEFAULT_NETWORKS, getNetworkByChainId, getStoredNetwork } from "./network";

export function getSupportedNamespaces(address: string) {
  const chains = DEFAULT_NETWORKS.map((network) => `eip155:${Number(network.chainId)}`);
  const accounts = DEFAULT_NETWORKS.map((network) => `eip155:${Number(network.chainId)}:${address}`);

  return {
    eip155: {
      chains,
      methods: [
        "eth_accounts",
        "eth_requestAccounts",
        "eth_chainId",
        "personal_sign",
        "eth_sendTransaction",
        "eth_signTypedData_v4",
        "wallet_switchEthereumChain",
      ],
      events: ["accountsChanged", "chainChanged"],
      accounts,
    },
  };
}

function hexToBigIntSafe(value?: string | null): bigint | undefined {
  if (!value) return undefined;
  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
}

function resolveNetworkFromRequest(params: any) {
  if (Array.isArray(params) && params[0]?.chainId) {
    const numeric = Number(params[0].chainId);
    return getNetworkByChainId(numeric) || getStoredNetwork();
  }
  return getStoredNetwork();
}

export async function handleRequestMethod(args: {
  method: string;
  params: any;
  address: string;
  privateKey: string;
  chainId?: string;
}) {
  const { method, params, address, privateKey } = args;

  if (method === "eth_accounts" || method === "eth_requestAccounts") {
    return [address];
  }

  if (method === "eth_chainId") {
    const net = getStoredNetwork();
    return ethers.toQuantity(Number(net.chainId));
  }

  if (method === "wallet_switchEthereumChain") {
    const target = resolveNetworkFromRequest(params);
    localStorage.setItem("wallet_active_network", JSON.stringify(target));
    window.dispatchEvent(new Event("wallet-network-updated"));
    return null;
  }

  if (method === "personal_sign") {
    const wallet = new ethers.Wallet(privateKey);
    const rawMessage = Array.isArray(params) ? (params[0] ?? params[1]) : "";
    const message = typeof rawMessage === "string" && rawMessage.startsWith("0x") ? ethers.getBytes(rawMessage) : String(rawMessage ?? "");
    return await wallet.signMessage(message);
  }

  if (method === "eth_signTypedData_v4") {
    const wallet = new ethers.Wallet(privateKey);
    const payloadRaw = Array.isArray(params) ? params[1] : null;
    const payload = typeof payloadRaw === "string" ? JSON.parse(payloadRaw) : payloadRaw;
    if (!payload) throw new Error("Invalid typed data payload");
    return await wallet.signTypedData(payload.domain || {}, payload.types || {}, payload.message || {});
  }

  if (method === "eth_sendTransaction") {
    const tx = Array.isArray(params) ? params[0] : params;
    const net = getStoredNetwork();
    if (!net?.rpcUrl) throw new Error("RPC URL not configured for current network");
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
      nonce: tx?.nonce !== undefined && tx?.nonce !== null ? Number(tx.nonce) : undefined,
      chainId: Number(net.chainId),
    };
    const sent = await wallet.sendTransaction(txRequest);
    return sent.hash;
  }

  throw new Error(`Unsupported method: ${method}`);
}
