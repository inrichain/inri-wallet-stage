import { ethers } from "ethers";
import { getAllNetworks, getNetworkByChainId, getStoredNetwork } from "./network";

export function getSupportedNamespaces(address: string) {
  const networks = getAllNetworks();
  const chains = networks.map((n) => `eip155:${Number(n.chainId)}`);
  const accounts = networks.map((n) => `eip155:${Number(n.chainId)}:${address}`);

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
      ],
      events: ["accountsChanged", "chainChanged"],
      accounts,
    },
  };
}

function hexToBigIntSafe(value?: string | null): bigint | undefined {
  if (!value) return undefined;
  try { return BigInt(value); } catch { return undefined; }
}

export async function handleRequestMethod(args: { method: string; params: any; address: string; privateKey: string; chainId?: string; }) {
  const { method, params, address, privateKey, chainId } = args;
  const requestChainId = chainId?.startsWith("eip155:") ? Number(chainId.split(":")[1]) : undefined;
  const net = requestChainId ? getNetworkByChainId(requestChainId) || getStoredNetwork() : getStoredNetwork();

  if (method === "eth_accounts" || method === "eth_requestAccounts") return [address];
  if (method === "eth_chainId") return ethers.toQuantity(Number(net.chainId));

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
