import {
  defineConfig
} from "vite";

import {
  VitePWA
} from "vite-plugin-pwa";

export default defineConfig({

  build: {

    chunkSizeWarningLimit: 20000,

    rollupOptions: {

      output: {

        manualChunks: {

          opencv: [
            "@techstark/opencv-js"
          ],

          zip: [
            "jszip",
            "file-saver"
          ]
        }
      }
    }
  },

  plugins: [

    VitePWA({

      registerType:
        "autoUpdate",

      workbox: {

        maximumFileSizeToCacheInBytes:
          20 * 1024 * 1024
      },

      manifest: {

        name:
          "LINE Sticker AI PRO",

        short_name:
          "StickerAI",

        theme_color:
          "#0f172a",

        background_color:
          "#0f172a",

        display:
          "standalone",

        icons: [

          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },

          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })
  ]
});