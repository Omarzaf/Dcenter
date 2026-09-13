import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  // Browser workers share one GPU; serial scenes avoid artificial contention.
  workers: 1,
  // Hosted runners render WebGL in software; keep the same assertions with
  // enough time for shader compilation and full story interactions.
  timeout: process.env.CI ? 90_000 : 30_000,
  expect: { timeout: process.env.CI ? 15_000 : 5_000 },
  maxFailures: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    // Exercise full Chromium's current headless mode, including its browser GPU
    // path, rather than the separate legacy headless-shell implementation.
    channel: "chromium",
    baseURL: "http://127.0.0.1:4180",
    // Recording every frame of every 3D test overwhelms software rendering.
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: "pnpm preview --host 127.0.0.1 --port 4180 --strictPort",
    url: "http://127.0.0.1:4180",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
