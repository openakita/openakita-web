import { defineConfig } from "vite";

const devProxy = {
  "/dl-api": {
    target: "https://dl-openakita.fzstack.com",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/dl-api/, ""),
  },
  "/gh-api": {
    target: "https://api.github.com",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/gh-api/, ""),
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "openakita-web-dev",
    },
  },
};

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    allowedHosts: [
      "p7f925ee.natappfree.cc",
      ".natappfree.cc",
    ],
    proxy: devProxy,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    proxy: devProxy,
  },
});
