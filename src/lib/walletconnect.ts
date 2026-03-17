import { Core } from "@walletconnect/core";
import { Web3Wallet } from "@walletconnect/web3wallet";
import { buildApprovedNamespaces, getSdkError } from "@walletconnect/utils";
import { wcStoreSetProposal, wcStoreSetRequest } from "./wcSessionStore";
import { getSupportedNamespaces } from "./wcRequestHandlers";

export const projectId = "bfc7a39282888507c8c1dca6d8b2dbfe";

let web3wallet: any = null;
let currentAddress = "";
let currentChainId = 3777;
let approvingProposalIds = new Set<number>();

function isIgnorableWcError(err: any) {
  const msg = String(err?.message || err || "").toLowerCase();

  return (
    msg.includes("recently deleted") ||
    msg.includes("missing or invalid") ||
    msg.includes("no proposal") ||
    msg.includes("no matching key") ||
    msg.includes("record was recently deleted")
  );
}

export async function initWalletConnect(address: string, chainId = 3777) {
  if (!address) return null;

  currentAddress = address;
  currentChainId = chainId;

  if (web3wallet) return web3wallet;

  const origin = window.location.origin;
  const base = import.meta.env.BASE_URL || "/";
  const iconUrl = `${origin}${base}pwa-512.png`;

  const core = new Core({ projectId });

  web3wallet = await Web3Wallet.init({
    core,
    metadata: {
      name: "INRI Wallet",
      description: "Secure wallet for INRI ecosystem",
      url: origin,
      icons: [iconUrl],
    },
  });

  web3wallet.on("session_proposal", async (proposal: any) => {
    try {
      const meta = proposal?.params?.proposer?.metadata;
      const requiredNamespaces = proposal?.params?.requiredNamespaces || {};
      const optionalNamespaces = proposal?.params?.optionalNamespaces || {};

      wcStoreSetProposal({
        id: proposal.id,
        proposerName: meta?.name || "Unknown dApp",
        proposerUrl: meta?.url || "",
        proposerIcons: meta?.icons || [],
        requiredNamespaces,
        optionalNamespaces,
        raw: proposal,
      });
    } catch (err) {
      if (!isIgnorableWcError(err)) {
        console.error("WalletConnect session_proposal error:", err);
      }
    }
  });

  web3wallet.on("session_request", async (event: any) => {
    try {
      const { topic, params, id } = event;
      const req = params?.request;

      wcStoreSetRequest({
        topic,
        id,
        chainId: params?.chainId,
        method: req?.method,
        params: req?.params,
        raw: event,
      });
    } catch (err) {
      if (!isIgnorableWcError(err)) {
        console.error("WalletConnect session_request error:", err);
      }
    }
  });

  web3wallet.on("session_delete", async () => {
    wcStoreSetProposal(null);
    wcStoreSetRequest(null);
  });

  return web3wallet;
}

export async function pairWalletConnect(uri: string) {
  if (!web3wallet) throw new Error("WalletConnect not initialized");

  const cleanUri = String(uri || "").trim();
  if (!cleanUri.startsWith("wc:")) {
    throw new Error("Invalid WalletConnect URI");
  }

  await web3wallet.pair({ uri: cleanUri });
}

export async function approveSessionProposal(proposal: any, address: string) {
  if (!web3wallet) throw new Error("WalletConnect not initialized");
  if (!proposal?.id || !proposal?.raw) throw new Error("Invalid session proposal");
  if (approvingProposalIds.has(proposal.id)) return;

  approvingProposalIds.add(proposal.id);

  try {
    const supportedNamespaces = getSupportedNamespaces(address);
    let approvedNamespaces: any;

    try {
      approvedNamespaces = buildApprovedNamespaces({
        proposal: proposal.raw,
        supportedNamespaces,
      });
    } catch {
      const eip155 = supportedNamespaces.eip155;

      approvedNamespaces = {
        eip155: {
          accounts: eip155.accounts,
          methods: eip155.methods,
          events: eip155.events,
        },
      };
    }

    await web3wallet.approveSession({
      id: proposal.id,
      namespaces: approvedNamespaces,
    });

    wcStoreSetProposal(null);
  } catch (err) {
    if (isIgnorableWcError(err)) {
      wcStoreSetProposal(null);
      return;
    }
    throw err;
  } finally {
    approvingProposalIds.delete(proposal.id);
  }
}

export async function rejectSessionProposal(proposalId: number) {
  if (!web3wallet) throw new Error("WalletConnect not initialized");

  try {
    await web3wallet.rejectSession({
      id: proposalId,
      reason: getSdkError("USER_REJECTED"),
    });
  } catch (err) {
    if (!isIgnorableWcError(err)) {
      throw err;
    }
  } finally {
    wcStoreSetProposal(null);
  }
}

export async function approveSessionRequest(request: any, result: any) {
  if (!web3wallet) throw new Error("WalletConnect not initialized");

  try {
    await web3wallet.respondSessionRequest({
      topic: request.raw.topic,
      response: {
        id: request.raw.id,
        jsonrpc: "2.0",
        result,
      },
    });
  } catch (err) {
    if (!isIgnorableWcError(err)) {
      throw err;
    }
  } finally {
    wcStoreSetRequest(null);
  }
}

export async function rejectSessionRequest(request: any) {
  if (!web3wallet) throw new Error("WalletConnect not initialized");

  try {
    await web3wallet.respondSessionRequest({
      topic: request.raw.topic,
      response: {
        id: request.raw.id,
        jsonrpc: "2.0",
        error: {
          code: 4001,
          message: "User rejected the request",
        },
      },
    });
  } catch (err) {
    if (!isIgnorableWcError(err)) {
      throw err;
    }
  } finally {
    wcStoreSetRequest(null);
  }
}

export function getWalletConnectInstance() {
  return web3wallet;
}

export function getCurrentWcAddress() {
  return currentAddress;
}

export function getCurrentWcChainId() {
  return currentChainId;
}

export function getActiveSessions() {
  if (!web3wallet) return [];

  const sessionsObj = web3wallet.getActiveSessions?.() || {};
  const topics = Object.keys(sessionsObj);

  return topics.map((topic) => {
    const s = sessionsObj[topic];
    return {
      topic,
      name: s?.peer?.metadata?.name || "Unknown dApp",
      url: s?.peer?.metadata?.url || "",
      icons: s?.peer?.metadata?.icons || [],
      namespaces: s?.namespaces || {},
    };
  });
}

export async function disconnectSession(topic: string) {
  if (!web3wallet) throw new Error("WalletConnect not initialized");

  await web3wallet.disconnectSession({
    topic,
    reason: getSdkError("USER_DISCONNECTED"),
  });
}

export async function disconnectAllSessions() {
  const sessions = getActiveSessions();
  for (const s of sessions) {
    try {
      await disconnectSession(s.topic);
    } catch (err) {
      if (!isIgnorableWcError(err)) {
        throw err;
      }
    }
  }
}
