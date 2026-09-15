import tailwindcss from "@tailwindcss/vite";

// Production address, served by the Vercel project `frontwire`.
const SITE_URL = "https://frontwire.giovannimanara.dev";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/eslint", "@nuxt/icon", "@nuxt/fonts"],
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    public: {
      // Evaluated when the site is built. Every bot commit on main redeploys, so this is when the archive last changed.
      builtAt: new Date().toISOString(),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      title: "Frontwire",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content: "The most interesting news in web development and AI, from frontend frameworks to new models.",
        },
        { property: "og:type", content: "website" },
        { property: "og:title", content: "Frontwire" },
        {
          property: "og:description",
          content: "The most interesting news in web development and AI, from frontend frameworks to new models.",
        },
        // Social previews don't resolve relative paths, so these point at the production site.
        { property: "og:url", content: SITE_URL },
        { property: "og:image", content: `${SITE_URL}/og.png` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      ],
    },
  },
});
