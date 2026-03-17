import { ethers } from "ethers";
import { getStoredNetwork } from "./network";
import { signTypedDataFromRequest } from "./wcTypedData";

export function getSupportedNamespaces(address: string) {
  const network = getStoredNetwork();
  const chainId = Number(network?.chainId || 3777);
  const chain = `eip155:${chainId}`;

  return {
    eip155: {
      chains: [chain],
      methods: [
        "eth_accounts",
        "eth_requestAccounts",
        "eth_chainId",
        "personal_sign",
        "eth_signTypedData",
        "eth_signTypedData_v3",
        "eth_signTypedData_v4",
        "eth_sendTransaction",
      ],
      events: ["accountsChanged", "chainChanged"],
      accounts: [`${chain}:${address}`],
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

export async function handleRequestMethod(args: {
  method: string;
  params: any;
  address: string;
  privateKey: string;
}) {
  const { method, params, address, privateKey } = args;

  if (method === "eth_accounts" || method === "eth_requestAccounts") {
    return [address];
  }

  if (method === "eth_chainId") {
    const net = getStoredNetwork();
    return ethers.toQuantity(Number(net.chainId));
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

  if (method === "eth_signTypedData" || method === "eth_signTypedData_v3" || method === "eth_signTypedData_v4") {
    return signTypedDataFromRequest({ method, params, privateKey });
  }

  if (method === "eth_sendTransaction") {
    const tx = Array.isArray(params) ? params[0] : params;
    const net = getStoredNetwork();

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
