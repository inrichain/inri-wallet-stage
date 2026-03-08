import { Core } from "@walletconnect/core";
import { WalletKit } from "@reown/walletkit";
import { buildApprovedNamespaces, getSdkError } from "@walletconnect/utils";

export const projectId = "3ec8f1c2261a7eb46e33e0368a6be0e8";

let walletKitInstance: Awaited<ReturnType<typeof WalletKit.init>> | null = null;

export async function initWalletConnect(address: string) {
  if (!address) return null;
  if (walletKitInstance) return walletKitInstance;

  const core = new Core({
    projectId,
  });

  walletKitInstance = await WalletKit.init({
    core,
    metadata: {
      name: "INRI Wallet",
      description: "INRI ecosystem wallet",
      url: "https://iusd.inri.life",
      icons: ["https://iusd.inri.life/token-inri.png"],
    },
  });

  walletKitInstance.on("session_proposal", async (proposal) => {
    try {
      const approvedNamespaces = buildApprovedNamespaces({
        proposal,
        supportedNamespaces: {
          eip155: {
            chains: [
              "eip155:1",
              "eip155:10",
              "eip155:56",
              "eip155:137",
              "eip155:8453",
              "eip155:42161",
              "eip155:43114",
              "eip155:3777",
            ],
            methods: [
              "eth_sendTransaction",
              "eth_signTransaction",
              "eth_sign",
              "personal_sign",
              "eth_signTypedData",
              "eth_signTypedData_v4",
            ],
            events: ["accountsChanged", "chainChanged"],
            accounts: [
              `eip155:1:${address}`,
              `eip155:10:${address}`,
              `eip155:56:${address}`,
              `eip155:137:${address}`,
              `eip155:8453:${address}`,
              `eip155:42161:${address}`,
              `eip155:43114:${address}`,
              `eip155:3777:${address}`,
            ],
          },
        },
      });

      await walletKitInstance!.approveSession({
        id: proposal.id,
        namespaces: approvedNamespaces,
      });
    } catch (error) {
      await walletKitInstance!.rejectSession({
        id: proposal.id,
        reason: getSdkError("USER_REJECTED_METHODS"),
      });
      console.error("WalletConnect session proposal failed:", error);
    }
  });

  walletKitInstance.on("session_request", async (event) => {
    const { topic, params, id } = event;
    const method = params.request.method;

    try {
      if (
        method === "eth_sign" ||
        method === "personal_sign" ||
        method === "eth_signTypedData" ||
        method === "eth_signTypedData_v4"
      ) {
        await walletKitInstance!.respondSessionRequest({
          topic,
          response: {
            id,
            jsonrpc: "2.0",
            error: {
              code: 4001,
              message: "Signing flow not connected yet in this build.",
            },
          },
        });
        return;
      }

      if (method === "eth_sendTransaction" || method === "eth_signTransaction") {
        await walletKitInstance!.respondSessionRequest({
          topic,
          response: {
            id,
            jsonrpc: "2.0",
            error: {
              code: 4001,
              message: "WalletConnect transaction approval UI not connected yet in this build.",
            },
          },
        });
        return;
      }

      await walletKitInstance!.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: "2.0",
          error: {
            code: 4200,
            message: `Unsupported method: ${method}`,
          },
        },
      });
    } catch (error) {
      console.error("WalletConnect session request failed:", error);
    }
  });

  return walletKitInstance;
}

export function getWalletConnectInstance() {
  return walletKitInstance;
}
