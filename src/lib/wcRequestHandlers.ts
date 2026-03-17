import { ethers } from "ethers";
import { getStoredNetwork } from "./network";
import { sendNativeTransaction } from "./inri";

export function getSupportedNamespaces(address: string) {
  const chains = [1, 10, 56, 137, 42161, 3777];

  return {
    eip155: {
      chains: chains.map((id) => `eip155:${id}`),
      methods: [
        "eth_accounts",
        "eth_requestAccounts",
        "eth_chainId",
        "personal_sign",
        "eth_sendTransaction",
      ],
      events: ["accountsChanged", "chainChanged"],
      accounts: chains.map((id) => `eip155:${id}:${address}`),
    },
  };
}

export async function approveRequestWithResult(
  web3wallet: any,
  event: any,
  result: any
) {
  await web3wallet.respondSessionRequest({
    topic: event.topic,
    response: {
      id: event.id,
      jsonrpc: "2.0",
      result,
    },
  });
}

export async function rejectRequestUserRejected(web3wallet: any, event: any) {
  await web3wallet.respondSessionRequest({
    topic: event.topic,
    response: {
      id: event.id,
      jsonrpc: "2.0",
      error: {
        code: 4001,
        message: "User rejected the request",
      },
    },
  });
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
    return ethers.toQuantity(net.chainId);
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

  if (method === "eth_sendTransaction") {
    const tx = Array.isArray(params) ? params[0] : params;

    return await sendNativeTransaction({
      privateKey,
      to: tx?.to,
      value: tx?.value || "0x0",
      data: tx?.data || "0x",
      gasLimit: tx?.gas,
      maxFeePerGas: tx?.maxFeePerGas,
      maxPriorityFeePerGas: tx?.maxPriorityFeePerGas,
      gasPrice: tx?.gasPrice,
    });
  }

  throw new Error(`Unsupported method: ${method}`);
}
