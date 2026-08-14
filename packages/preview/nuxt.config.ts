export default defineNuxtConfig({
  compatibilityDate: "2025-07-01",
  devtools: { enabled: false },
  modules: ["@nuxt/ui"],
  css: ["~/assets/css/main.css"],
  colorMode: { preference: "dark" },
  app: {
    head: {
      title: "Cool Teach · 课程预览",
      htmlAttrs: { lang: "zh-CN" },
    },
  },
});
