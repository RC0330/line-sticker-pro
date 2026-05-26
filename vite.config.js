import { defineConfig }
from "vite";

import { VitePWA }
from "vite-plugin-pwa";

export default defineConfig({

  plugins: [

    VitePWA({

      registerType:
        "autoUpdate",

      manifest: {

        name:
          "LINE貼圖 AI 工作站 PRO",

        short_name:
          "LINE AI",

        theme_color:
          "#00c853",

        icons: [

          {
            src:
              "icon-192.png",

            sizes:
              "192x192",

            type:
              "image/png"
          },

          {
            src:
              "icon-512.png",

            sizes:
              "512x512",

            type:
              "image/png"
          }
        ]
      }
    })
  ]
});