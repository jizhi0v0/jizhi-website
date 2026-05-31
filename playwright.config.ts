import { defineConfig } from "@playwright/test";

// 端到端回归:布局类 bug（横向溢出、CSS Grid 列被撑宽）只有真实浏览器
// 布局引擎能复现，jsdom 无布局计算（getBoundingClientRect 恒为 0），抓不到。
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
  },
  // 用 production build 跑：既贴近线上行为，又顺带把 build 当冒烟测试。
  // 本地复用已起的 dev server，CI 里每次全新构建。
  webServer: {
    command: "bun run build && bun run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
