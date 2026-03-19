import { ethers } from "ethers";
import { getAllSupportedNetworks, getNetworkByChainId, getNetworkByNamespaceChain, getStoredNetwork, type NetworkItem } from "./network";

export function getSupportedNamespaces(address: string) {
  const networks = getAllSupportedNetworks();
  const chains = networks.map((network) => `eip155:${Number(network.chainId)}`);

  return {
    eip155: {
      chains,
      methods: [
        "eth_accounts",
        "eth_requestAccounts",
        "eth_chainId",
        "eth_sendTransaction",
        "personal_sign",
        "eth_sign",
        "eth_signTypedData",
        "eth_signTypedData_v3",
        "eth_signTypedData_v4",
      ],
      events: ["accountsChanged", "chainChanged"],
      accounts: chains.map((chain) => `${chain}:${address}`),
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

function resolveNetwork(args: { chainId?: string | number | null; params?: any }): NetworkItem {
  const chainFromNamespace = getNetworkByNamespaceChain(typeof args.chainId === "string" ? args.chainId : null);
  if (chainFromNamespace) return chainFromNamespace;

  const tx = Array.isArray(args.params) ? args.params[0] : args.params;
  const txChainId = tx?.chainId;
  if (txChainId !== undefined && txChainId !== null) {
    const numeric = typeof txChainId === "string" ? Number(txChainId) : Number(txChainId);
    const fromTx = getNetworkByChainId(numeric);
    if (fromTx) return fromTx;
  }

  return getStoredNetwork();
}

function parseTypedDataPayload(method: string, params: any) {
  if (!Array.isArray(params)) return null;

  let payloadRaw: any = null;
  if (method === "eth_signTypedData") {
    payloadRaw = params[1] ?? params[0] ?? null;
  } else {
    payloadRaw = params[1] ?? null;
  }

  if (!payloadRaw) return null;
  return typeof payloadRaw === "string" ? JSON.parse(payloadRaw) : payloadRaw;
}

export async function handleRequestMethod(args: {
  method: string;
  params: any;
  address: string;
  privateKey: string;
  chainId?: string | number | null;
}) {
  const { method, params, address, privateKey, chainId } = args;

  if (method === "eth_accounts" || method === "eth_requestAccounts") {
    return [address];
  }

  if (method === "eth_chainId") {
    const net = resolveNetwork({ chainId, params });
    return ethers.toQuantity(Number(net.chainId));
  }

  if (method === "personal_sign" || method === "eth_sign") {
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

  if (
    method === "eth_signTypedData" ||
    method === "eth_signTypedData_v3" ||
    method === "eth_signTypedData_v4"
  ) {
    const wallet = new ethers.Wallet(privateKey);
    const payload = parseTypedDataPayload(method, params);

    if (!payload) {
      throw new Error("Invalid typed data payload");
    }

    const types = { ...(payload.types || {}) };
    delete types.EIP712Domain;

    return await wallet.signTypedData(
      payload.domain || {},
      types,
      payload.message || {}
    );
  }

  if (method === "eth_sendTransaction") {
    const tx = Array.isArray(params) ? params[0] : params;
    const net = resolveNetwork({ chainId, params });

    if (!net?.rpcUrl) {
      throw new Error("RPC URL not configured for requested network");
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
