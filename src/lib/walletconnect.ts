import { Core } from "@walletconnect/core"
import { WalletKit } from "@reown/walletkit"
import { buildApprovedNamespaces } from "@walletconnect/utils"

export const projectId = "3ec8f1c2261a7eb46e33e0368a6be0e8"

let walletKit: any = null

export async function initWalletConnect(address: string) {

  const core = new Core({
    projectId
  })

  walletKit = await WalletKit.init({
    core,

    metadata: {
      name: "INRI Wallet",
      description: "INRI ecosystem wallet",
      url: "https://iusd.inri.life",
      icons: ["https://iusd.inri.life/token-inri.png"]
    }
  })

  walletKit.on("session_proposal", async (proposal: any) => {

    const approvedNamespaces = buildApprovedNamespaces({

      proposal,

      supportedNamespaces: {

        eip155: {

          chains: [

            "eip155:1",
            "eip155:56",
            "eip155:137",
            "eip155:42161",
            "eip155:10",
            "eip155:8453",
            "eip155:3777"

          ],

          methods: [

            "eth_sendTransaction",
            "eth_signTransaction",
            "eth_sign",
            "personal_sign",
            "eth_signTypedData"

          ],

          events: [

            "accountsChanged",
            "chainChanged"

          ],

          accounts: [

            `eip155:1:${address}`,
            `eip155:56:${address}`,
            `eip155:137:${address}`,
            `eip155:42161:${address}`,
            `eip155:10:${address}`,
            `eip155:8453:${address}`,
            `eip155:3777:${address}`

          ]
        }
      }
    })

    await walletKit.approveSession({
      id: proposal.id,
      namespaces: approvedNamespaces
    })
  })

  walletKit.on("session_request", async (event: any) => {

    const { topic, params } = event
    const { request } = params

    console.log("WalletConnect request:", request)

    const response = {
      id: request.id,
      jsonrpc: "2.0",
      result: null
    }

    await walletKit.respondSessionRequest({
      topic,
      response
    })
  })

  return walletKit
}
