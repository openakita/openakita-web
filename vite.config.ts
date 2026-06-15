import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",           // 改为 0.0.0.0 允许外部访问
    port: 5173,
    allowedHosts: [            // 添加这个配置
      'p7f925ee.natappfree.cc',
      '.natappfree.cc'         // 允许所有 natapp 域名
    ]
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
});
