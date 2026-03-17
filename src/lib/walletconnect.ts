import { Core } from "@walletconnect/core";
import { Web3Wallet } from "@walletconnect/web3wallet";
import { buildApprovedNamespaces, getSdkError } from "@walletconnect/utils";
import { wcStoreSetProposal, wcStoreSetRequest } from "./wcSessionStore";
import {
  approveRequestWithResult,
  rejectRequestUserRejected,
  getSupportedNamespaces,
} from "./wcRequestHandlers";

export const projectId = "bfc7a39282888507c8c1dca6d8b2dbfe";

let web3wallet: any = null;
let currentAddress = "";
let currentChainId = 3777;

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
      url: `${origin}${base}`,
      icons: [iconUrl],
    },
  });

  web3wallet.on("session_proposal", async (proposal: any) => {
    const meta = proposal?.params?.proposer?.metadata;

    wcStoreSetProposal({
      id: proposal.id,
      proposerName: meta?.name || "Unknown dApp",
      proposerUrl: meta?.url || "",
      proposerIcons: meta?.icons || [],
      requiredNamespaces: proposal.params?.requiredNamespaces,
      optionalNamespaces: proposal.params?.optionalNamespaces,
      raw: proposal,
    });
  });

  web3wallet.on("session_request", async (event: any) => {
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
  });

  web3wallet.on("session_delete", async () => {
    wcStoreSetProposal(null);
    wcStoreSetRequest(null);
  });

  return web3wallet;
}

export async function pairWalletConnect(uri: string) {
  if (!web3wallet) throw new Error("WalletConnect not initialized");
  await web3wallet.pair({ uri });
}

export async function approveSessionProposal(proposal: any, address: string) {
  if (!web3wallet) throw new Error("WalletConnect not initialized");

  const approvedNamespaces = buildApprovedNamespaces({
    proposal: proposal.raw,
    supportedNamespaces: getSupportedNamespaces(address),
  });

  await web3wallet.approveSession({
    id: proposal.id,
    namespaces: approvedNamespaces,
  });

  wcStoreSetProposal(null);
}

export async function rejectSessionProposal(proposalId: number) {
  if (!web3wallet) throw new Error("WalletConnect not initialized");

  await web3wallet.rejectSession({
    id: proposalId,
    reason: getSdkError("USER_REJECTED"),
  });

  wcStoreSetProposal(null);
}

export async function approveSessionRequest(request: any, result: any) {
  if (!web3wallet) throw new Error("WalletConnect not initialized");
  await approveRequestWithResult(web3wallet, request.raw, result);
  wcStoreSetRequest(null);
}

export async function rejectSessionRequest(request: any) {
  if (!web3wallet) throw new Error("WalletConnect not initialized");
  await rejectRequestUserRejected(web3wallet, request.raw);
  wcStoreSetRequest(null);
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
