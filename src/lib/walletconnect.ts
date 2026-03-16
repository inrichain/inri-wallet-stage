import { Core } from "@walletconnect/core";
import { Web3Wallet } from "@walletconnect/web3wallet";
import { buildApprovedNamespaces } from "@walletconnect/utils";

export const projectId = "bfc7a39282888507c8c1dca6d8b2dbfe";

let web3wallet: any = null;

export async function initWalletConnect(address: string) {
  if (!address) return null;
  if (web3wallet) return web3wallet;

  const origin = window.location.origin;
  const base = import.meta.env.BASE_URL || "/";
  const iconUrl = `${origin}${base}pwa-512.png`;

  const core = new Core({
    projectId,
  });

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
            "eip155:3777",
          ],
          methods: [
            "eth_sendTransaction",
            "eth_sign",
            "personal_sign",
            "eth_signTypedData",
          ],
          events: ["accountsChanged", "chainChanged"],
          accounts: [
            `eip155:1:${address}`,
            `eip155:10:${address}`,
            `eip155:56:${address}`,
            `eip155:137:${address}`,
            `eip155:8453:${address}`,
            `eip155:42161:${address}`,
            `eip155:3777:${address}`,
          ],
        },
      },
    });

    await web3wallet.approveSession({
      id: proposal.id,
      namespaces: approvedNamespaces,
    });
  });

  return web3wallet;
}
