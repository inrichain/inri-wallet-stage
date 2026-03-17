import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "favicon.png",
        "apple-touch-icon.png",
        "brand-inri.png",
        "pwa-192.png",
        "pwa-512.png"
      ],
      manifest: {
        id: "/",
        name: "INRI Wallet",
        short_name: "INRI",
        description: "Professional multichain wallet for the INRI ecosystem",
        theme_color: "#0b1120",
        background_color: "#0b1120",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "favicon.png",
            sizes: "32x32",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any"
          }
        ]
      }
    })
  ]
});
