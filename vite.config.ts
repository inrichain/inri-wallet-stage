import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({

  base: "/inri-wallet-stage/",

  plugins: [

    react(),

    VitePWA({

      registerType: "autoUpdate",

      manifest: {

        name: "INRI Wallet",
        short_name: "INRI Wallet",
        description: "Secure wallet for INRI ecosystem",

        theme_color: "#0b0f1a",
        background_color: "#0b0f1a",

        display: "standalone",

        icons: [
          {
            src: "/inri-wallet-stage/token-inri.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/inri-wallet-stage/token-inri.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]

      }

    })

  ]

})
