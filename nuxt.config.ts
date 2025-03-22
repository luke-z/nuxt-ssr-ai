import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  modules: ["@nuxtjs/color-mode"],
  colorMode: {
    classSuffix: "",
  },
  app: {
    head: {
      script: [
        {
          type: "importmap",
          innerHTML: JSON.stringify({
            imports: {
              // vue: "https://unpkg.com/vue@3.5.13/dist/vue.esm-browser.js",
              vue: "/_nuxt/node_modules/vue/dist/vue.esm-bundler.js",
              // Add more dependencies as needed
            }
          })
        },
      ],
    },
  },
  // vue: {
  //   runtimeCompiler: true,
  // },
  vite: {
    plugins: [tailwindcss()],
  },
});
