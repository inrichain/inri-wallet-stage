import { Core } from "@walletconnect/core";
import { Web3Wallet } from "@walletconnect/web3wallet";
import { buildApprovedNamespaces } from "@walletconnect/utils";
import { CHAIN_ID } from "./inri";

export const projectId = "3ec8f1c2261a7eb46e33e0368a6be0e8";
const WC_LOGS_KEY = "inri_wc_logs";

let web3wallet: any = null;
let currentAddress = "";

function pushLog(type: string, payload: any) {
  try {
    const current = JSON.parse(localStorage.getItem(WC_LOGS_KEY) || "[]");
    const next = [
      {
        at: new Date().toISOString(),
        type,
        payload,
      },
      ...current,
    ].slice(0, 60);
    localStorage.setItem(WC_LOGS_KEY, JSON.stringify(next));
  } catch {
    // ignore log failures
  }
}

function getMetadata() {
  const origin = window.location.origin;
  return {
    name: "INRI Wallet",
    description: "Secure wallet for INRI ecosystem",
    url: origin,
    icons: [`${origin}/inri-wallet-stage/token-inri.png`],
  };
}

function buildNamespaces(address: string, proposal: any) {
  const chains = [
    "eip155:1",
    "eip155:10",
    "eip155:56",
    "eip155:137",
    "eip155:8453",
    "eip155:42161",
    `eip155:${CHAIN_ID}`,
  ];

  const accounts = chains.map((chain) => `${chain}:${address}`);

  return buildApprovedNamespaces({
    proposal,
    supportedNamespaces: {
      eip155: {
        chains,
        methods: [
          "eth_sendTransaction",
          "eth_sign",
          "personal_sign",
          "eth_signTypedData",
          "eth_signTypedData_v4",
          "wallet_switchEthereumChain",
        ],
        events: ["accountsChanged", "chainChanged"],
        accounts,
      },
    },
  });
}

function attachListeners(instance: any) {
  if ((instance as any).__inriAttached) return;
  (instance as any).__inriAttached = true;

  instance.on("session_proposal", async (proposal: any) => {
    pushLog("session_proposal", proposal);
    try {
      const namespaces = buildNamespaces(currentAddress, proposal);
      await instance.approveSession({ id: proposal.id, namespaces });
      pushLog("session_approved", { id: proposal.id });
    } catch (error: any) {
      pushLog("session_approve_error", { message: error?.message || String(error) });
      try {
        await instance.rejectSession({ id: proposal.id, reason: { code: 5000, message: "Rejected by wallet" } });
      } catch {
        // ignore
      }
    }
  });

  instance.on("session_request", async (event: any) => {
    pushLog("session_request", event);
  });

  instance.on("session_delete", (event: any) => pushLog("session_delete", event));
  instance.on("session_expire", (event: any) => pushLog("session_expire", event));
  instance.on("session_ping", (event: any) => pushLog("session_ping", event));
}

export async function initWalletConnect(address: string) {
  if (!address) return null;
  currentAddress = address;

  if (web3wallet) {
    attachListeners(web3wallet);
    return web3wallet;
  }

  const core = new Core({ projectId });

  web3wallet = await Web3Wallet.init({
    core,
    metadata: getMetadata(),
  });

  pushLog("walletconnect_init", { address });
  attachListeners(web3wallet);
  return web3wallet;
}

export async function pairWalletConnect(uri: string, address: string) {
  const wallet = await initWalletConnect(address);
  if (!wallet) throw new Error("WalletConnect not initialized");
  pushLog("pair_attempt", { uri });
  await wallet.core.pairing.pair({ uri });
  pushLog("pair_success", { uri });
  return true;
}

export function getWalletConnectLogs() {
  try {
    return JSON.parse(localStorage.getItem(WC_LOGS_KEY) || "[]");
  } catch {
    return [];
  }
}
