import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createMission, transition } from "../../src/firstlight/model";
import type { MissionState } from "../../src/firstlight/types";

const runtimeErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([]);
});

async function mission(page: Page): Promise<MissionState> {
  return page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("core.firstlight.v1")!)
        .mission as MissionState,
  );
}
async function start(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Enter the facility", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Meet your first delivery",
      exact: true,
    }),
  ).toBeVisible();
}
async function connectFirstRack(page: Page, bay: "A" | "B" | "C" = "A") {
  await page
    .getByRole("button", { name: "Find the delivery", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Inspect delivery", exact: true })
    .click();
  await page.getByRole("button", { name: "Choose a bay", exact: true }).click();
  await page
    .getByRole("button", { name: `Inspect Bay ${bay}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: `Install in Bay ${bay}`, exact: true })
    .click();
  for (const [find, connect] of [
    ["Find the electrical room", "Connect power circuit"],
    ["Find the cooling plant", "Connect cooling circuit"],
    ["Find the network exchange", "Connect fiber route"],
  ]) {
    await page.getByRole("button", { name: find, exact: true }).click();
    await page.getByRole("button", { name: connect, exact: true }).click();
  }
}
async function runTest(page: Page, result: string) {
  await page
    .getByRole("button", { name: "Inspect the rack", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run commissioning test", exact: true })
    .click();
  await expect.poll(async () => (await mission(page)).stage).toBe(result);
}

async function activateWithKeyboard(page: Page, name: string | RegExp) {
  const button = page.getByRole("button", { name, exact: true });
  await expect(button).toBeVisible();
  // Deliberately traverse the real tab order: locator.focus() would hide an
  // unreachable control, a focus trap, or an incorrect tabindex.
  for (let attempt = 0; attempt < 60; attempt++) {
    if (
      await button.evaluate((element) => element === document.activeElement)
    ) {
      await page.keyboard.press("Enter");
      return;
    }
    await page.keyboard.press("Tab");
  }
  await expect(
    button,
    `Keyboard could not reach ${String(name)}`,
  ).toBeFocused();
  await page.keyboard.press("Enter");
}

test("opening inhabits the viewport and presents one first assignment", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /First light\./ }),
  ).toBeVisible();
  await expect(page.locator(".fl-facility-scene")).toHaveClass(/is-ready/);
  expect(await page.locator("canvas").count()).toBe(1);
  const graphics = await page.evaluate(() => {
    const context = document.querySelector("canvas")?.getContext("webgl2");
    const debug = context?.getExtension("WEBGL_debug_renderer_info");
    return {
      viewport: [innerWidth, innerHeight],
      pixelRatio: devicePixelRatio,
      renderer: debug
        ? context?.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : "Not exposed",
    };
  });
  await info.attach("graphics-environment", {
    body: JSON.stringify(graphics),
    contentType: "application/json",
  });
  const bounds = await page.locator("canvas").boundingBox();
  expect(bounds?.width).toBe(page.viewportSize()!.width);
  expect(bounds?.height).toBe(page.viewportSize()!.height);
  await page.screenshot({ path: info.outputPath("first-light-opening.png") });
  await page
    .getByRole("button", { name: "Enter the facility", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Meet your first delivery",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".fl-mentor")).toContainText("facilities lead");
  await page
    .getByRole("button", { name: "Why start with an inspection?", exact: true })
    .click();
  await expect(page.locator(".fl-mentor")).toContainText("evidence of receipt");
  await page.reload();
  await page
    .getByRole("button", { name: "Continue your story", exact: true })
    .click();
  await expect(page.locator(".fl-mentor")).toContainText("evidence of receipt");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("complete first chapter preserves dependencies, teaches the fault, and records a geopolitical preparation", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  await connectFirstRack(page, "B");
  if (page.viewportSize()!.width <= 600) {
    await expect(page.locator(".fl-facility-scene")).toHaveClass(/is-ready/);
    const rackMarker = page.getByRole("button", {
      name: "Inspect the installed rack",
      exact: true,
    });
    await expect(rackMarker).toBeVisible();
    const rackBounds = (await rackMarker.boundingBox())!;
    const hudBounds = (await page.locator(".fl-mission-hud").boundingBox())!;
    const mentorBounds = (await page.locator(".fl-mentor").boundingBox())!;
    expect(rackBounds.y).toBeGreaterThan(hudBounds.y + hudBounds.height);
    expect(rackBounds.y + rackBounds.height).toBeLessThan(mentorBounds.y);
  }
  expect((await mission(page)).bay).toBe(1);
  expect((await mission(page)).serviceOnline).toBe(false);
  await runTest(page, "fault");
  expect((await mission(page)).commissioned).toBe(false);
  const assignmentBounds = await page.locator(".fl-assignment").boundingBox();
  const utilityBounds = await page
    .locator(".fl-system-readiness")
    .boundingBox();
  expect(assignmentBounds).not.toBeNull();
  expect(utilityBounds).not.toBeNull();
  expect(utilityBounds!.y).toBeGreaterThanOrEqual(
    assignmentBounds!.y + assignmentBounds!.height,
  );
  if (page.viewportSize()!.width <= 600) {
    const statusBounds = await page.locator(".fl-status-strip").boundingBox();
    expect(statusBounds!.y).toBeGreaterThanOrEqual(
      assignmentBounds!.y + assignmentBounds!.height,
    );
  }
  await page.screenshot({ path: info.outputPath("stopped-test.png") });
  await page
    .getByRole("button", { name: "Find the control panel", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enable automatic control", exact: true })
    .click();
  expect((await mission(page)).serviceOnline).toBe(false);
  await runTest(page, "handover");
  await page
    .getByRole("button", { name: "Inspect the rack", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Bring service online", exact: true })
    .click();
  await page.getByRole("button", { name: /We needed more servers/ }).click();
  expect((await mission(page)).stage).toBe("reflection");
  await expect(page.getByRole("status")).toContainText("cooling");
  await page
    .getByRole("button", { name: /The cooling control did not respond/ })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "The next hall needs more than a date.",
      exact: true,
    }),
  ).toBeVisible();
  const before = (await mission(page)).budget;
  await page
    .getByRole("button", { name: /Hold an alternate delivery slot/ })
    .click();
  const done = await mission(page);
  expect(done.stage).toBe("complete");
  expect(done.serviceOnline).toBe(true);
  expect(done.expansionChoice).toBe("reserve");
  expect(done.budget).toBe(before - 6);
  await page.screenshot({ path: info.outputPath("first-light-complete.png") });
  await page
    .getByRole("button", { name: "Read your debrief", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Commissioning test stopped safely",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "provisional alternate delivery slot",
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Pause and settings", exact: true })
    .click();
  const savedBeforeExport = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("core.firstlight.v1")!),
  );
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export progress", exact: true })
    .click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("core-first-light-save.json");
  const downloadPath = await download.path();
  if (!downloadPath)
    throw new Error("The exported save has no downloaded file");
  expect(JSON.parse(await readFile(downloadPath, "utf8"))).toEqual(
    savedBeforeExport,
  );

  // Replace the current mission before importing, so a no-op import cannot pass.
  await page.getByRole("button", { name: "Start again", exact: true }).click();
  await page
    .getByRole("button", { name: "Start new mission", exact: true })
    .click();
  await expect.poll(async () => (await mission(page)).stage).toBe("arrival");
  await page
    .getByRole("button", { name: "Pause and settings", exact: true })
    .click();
  const chooserEvent = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Import progress", exact: true })
    .click();
  await (await chooserEvent).setFiles(downloadPath);
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("core.firstlight.v1")!),
      ),
    )
    .toEqual(savedBeforeExport);
  await page
    .getByRole("button", { name: "Continue your story", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Read your debrief", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "provisional alternate delivery slot",
  );
});

test("a full keyboard chapter preserves focus, reduced motion and the original canvas", async ({
  page,
}) => {
  // A full chapter plus repeated real Tab traversal performs substantially more
  // input events than the pointer path, especially on the mobile viewport.
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".fl-facility-scene")).toHaveClass(/is-ready/);
  const originalCanvas = await page.locator("canvas").elementHandle();
  if (!originalCanvas) throw new Error("The facility canvas did not mount");
  await activateWithKeyboard(page, "Enter the facility");
  await activateWithKeyboard(page, "Find the delivery");
  await activateWithKeyboard(page, "Inspect delivery");
  await expect(
    page.getByRole("heading", { name: "Give the rack a home", exact: true }),
  ).toBeVisible();
  const settings = page.getByRole("button", {
    name: "Pause and settings",
    exact: true,
  });
  await activateWithKeyboard(page, "Pause and settings");
  await expect(
    page.getByRole("checkbox", { name: /Reduced motion/ }),
  ).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(settings).toBeFocused();
  for (let i = 0; i < 3; i++) {
    await activateWithKeyboard(page, "Pause and settings");
    await activateWithKeyboard(page, "Return to the facility");
    await expect(settings).toBeFocused();
  }
  for (const name of [
    "Choose a bay",
    "Install in Bay A",
    "Find the electrical room",
    "Connect power circuit",
    "Find the cooling plant",
    "Connect cooling circuit",
    "Find the network exchange",
    "Connect fiber route",
    "Inspect the rack",
    "Run commissioning test",
  ]) {
    await activateWithKeyboard(page, name);
  }
  await expect.poll(async () => (await mission(page)).stage).toBe("fault");
  expect((await mission(page)).serviceOnline).toBe(false);
  for (const name of [
    "Find the control panel",
    "Enable automatic control",
    "Inspect the rack",
    "Run commissioning test",
  ])
    await activateWithKeyboard(page, name);
  await expect.poll(async () => (await mission(page)).stage).toBe("handover");
  expect((await mission(page)).serviceOnline).toBe(false);
  await activateWithKeyboard(page, "Inspect the rack");
  await activateWithKeyboard(page, "Bring service online");
  await activateWithKeyboard(page, /The cooling control did not respond/);
  await activateWithKeyboard(page, /Plan a phased opening/);
  await expect.poll(async () => (await mission(page)).stage).toBe("complete");
  expect((await mission(page)).expansionChoice).toBe("phase");
  await expect(page.locator(".fl-facility-scene")).toHaveClass(/is-ready/);
  expect(await page.locator("canvas").count()).toBe(1);
  expect(
    await originalCanvas.evaluate(
      (canvas) =>
        canvas.isConnected && canvas === document.querySelector("canvas"),
    ),
  ).toBe(true);
});

test("malformed saves and denied storage remain playable", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("core.firstlight.v1", "{broken");
    } catch {
      /* Storage is denied in the second half of this check. */
    }
  });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText(
    "saved chapter could not be read",
  );
  await page
    .getByRole("button", { name: "Enter the facility", exact: true })
    .click();
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Denied for test");
      },
    }),
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Enter the facility", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Find the delivery", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Inspect delivery", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Give the rack a home", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".fl-game-footer")).toContainText("SESSION ONLY");
});

test("graphics failure retains the mission and an accessible equipment route", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]).startsWith("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await start(page);
  await expect(page.locator(".fl-world-fallback")).toBeVisible();
  await connectFirstRack(page, "C");
  expect((await mission(page)).bay).toBe(2);
  expect((await mission(page)).stage).toBe("commissioning");
});

test("a restored stopped test requires repair and retest; legacy saves stay separate", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let state = createMission();
  for (const command of [
    { type: "enter" },
    { type: "inspect" },
    { type: "install", bay: 2 },
    { type: "connect", utility: "power" },
    { type: "connect", utility: "cooling" },
    { type: "connect", utility: "network" },
    { type: "test" },
  ] as const)
    state = transition(state, command).state;
  await page.addInitScript((saved) => {
    localStorage.setItem(
      "core.firstlight.v1",
      JSON.stringify({ version: 1, mission: saved }),
    );
    localStorage.setItem("core.strategy.v1", "legacy-data-marker");
  }, state);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Continue your story", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Find the missing response",
      exact: true,
    }),
  ).toBeVisible();
  expect((await mission(page)).testRuns).toBe(1);
  expect((await mission(page)).serviceOnline).toBe(false);
  expect((await mission(page)).commissioned).toBe(false);
  await expect(
    page.getByRole("button", { name: "Bring service online", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Find the control panel", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enable automatic control", exact: true })
    .click();
  await expect.poll(async () => (await mission(page)).stage).toBe("retest");
  const repaired = await mission(page);
  expect(repaired.testRuns).toBe(1);
  expect(repaired.commissioned).toBe(false);
  expect(repaired.serviceOnline).toBe(false);
  await page
    .getByRole("button", { name: "Inspect the rack", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Bring service online", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Run commissioning test", exact: true })
    .click();
  await expect.poll(async () => (await mission(page)).stage).toBe("handover");
  const retested = await mission(page);
  expect(retested.testRuns).toBe(2);
  expect(retested.commissioned).toBe(true);
  expect(retested.serviceOnline).toBe(false);
  await page
    .getByRole("button", { name: "Inspect the rack", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Bring service online", exact: true })
    .click();
  await expect.poll(async () => (await mission(page)).serviceOnline).toBe(true);
  expect(
    await page.evaluate(() => localStorage.getItem("core.strategy.v1")),
  ).toBe("legacy-data-marker");
});

test("graphics context loss and recovery preserve the mission", async ({
  page,
}) => {
  await start(page);
  await expect(page.locator(".fl-facility-scene")).toHaveClass(/is-ready/);
  const before = await mission(page);
  const supported = await page.evaluate(() => {
    const context = document.querySelector("canvas")?.getContext("webgl2");
    const extension = context?.getExtension("WEBGL_lose_context");
    if (!extension) return false;
    document.addEventListener(
      "firstlight:restore-context",
      () => {
        extension.restoreContext();
      },
      { once: true },
    );
    extension.loseContext();
    return true;
  });
  test.skip(!supported, "This browser does not expose WEBGL_lose_context");
  await expect(page.locator(".fl-world-fallback")).toContainText("interrupted");
  expect(await mission(page)).toEqual(before);
  await page.evaluate(() =>
    document.dispatchEvent(new Event("firstlight:restore-context")),
  );
  await expect(page.locator(".fl-facility-scene")).toHaveClass(/is-ready/);
  await expect(page.locator(".fl-world-fallback")).toHaveCount(0);
  expect(await mission(page)).toEqual(before);
  expect(await page.locator("canvas").count()).toBe(1);
});

test("a failed 3D download preserves semantic gameplay", async ({ page }) => {
  await page.route("**/assets/FacilityScene-*.js", (route) => route.abort());
  await start(page);
  await expect(page.locator(".fl-world-fallback")).toContainText(
    "could not be downloaded",
  );
  await connectFirstRack(page);
  expect((await mission(page)).stage).toBe("commissioning");
});

test("asking for an explanation during a test preserves mentor memory", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-09-12T06:00:00Z") });
  await page.emulateMedia({ reducedMotion: "reduce" });
  let state = createMission();
  for (const command of [
    { type: "enter" },
    { type: "inspect" },
    { type: "install", bay: 0 },
    { type: "connect", utility: "power" },
    { type: "connect", utility: "cooling" },
    { type: "connect", utility: "network" },
  ] as const)
    state = transition(state, command).state;
  await page.addInitScript(
    (saved) =>
      localStorage.setItem(
        "core.firstlight.v1",
        JSON.stringify({ version: 1, mission: saved }),
      ),
    state,
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Continue your story", exact: true })
    .click();
  await expect(page.locator(".fl-facility-scene")).toHaveClass(/is-ready/);
  // Keep the demonstration open while asking the question. Real GPU startup
  // speed must not decide whether this regression exercises the stale-timer case.
  await page.clock.pauseAt(new Date("2026-09-12T07:00:00Z"));
  await page
    .getByRole("button", { name: "Inspect the rack", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run commissioning test", exact: true })
    .click();
  await page
    .getByRole("button", { name: "What are we checking?", exact: true })
    .click();
  await page.clock.resume();
  await expect.poll(async () => (await mission(page)).stage).toBe("fault");
  const remembered = await page.evaluate(
    () =>
      JSON.parse(
        JSON.parse(localStorage.getItem("core.firstlight.v1")!).dialogue.ink,
      ).variablesState.sought_explanation,
  );
  expect(remembered).toBe(true);
});

test("viewpoints, manual orbit and lighting stay separate from mission progress", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  const canvas = page.locator(".fl-world-canvas");
  await expect(page.locator(".fl-facility-scene")).toHaveClass(/is-ready/);
  const initialMission = await mission(page);
  const originalPosition = await canvas.getAttribute("data-camera-position");
  await page
    .getByRole("button", { name: "Find the delivery", exact: true })
    .click();
  await expect(page.locator(".fl-inspector")).toBeVisible();
  await page
    .getByRole("button", { name: "View and lighting controls", exact: true })
    .click();
  const controls = page.getByRole("region", {
    name: "View and lighting",
    exact: true,
  });
  await expect(page.locator(".fl-inspector")).not.toBeVisible();
  await expect(
    controls.getByRole("button", {
      name: "Close view and lighting",
      exact: true,
    }),
  ).toBeFocused();
  const blocksBrowserZoom = await canvas.evaluate((element) => {
    const event = new WheelEvent("wheel", {
      ctrlKey: true,
      deltaY: -100,
      cancelable: true,
    });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(blocksBrowserZoom).toBe(false);
  await controls
    .getByRole("button", { name: "Data hall", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-camera-view", "hall");
  await expect
    .poll(() => canvas.getAttribute("data-camera-position"))
    .not.toBe(originalPosition);
  await controls.getByRole("button", { name: "Night", exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-site-hour")))
    .toBeCloseTo(23, 1);
  await page.screenshot({ path: info.outputPath("hall-night.png") });
  await controls
    .getByRole("button", { name: "Cooling yard", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-camera-view", "plant");
  await controls.getByRole("button", { name: "Day", exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-site-hour")))
    .toBeCloseTo(12, 1);
  const plantPosition = await canvas.getAttribute("data-camera-position");
  await controls
    .getByRole("button", { name: "Orbit right", exact: true })
    .click();
  await expect
    .poll(() => canvas.getAttribute("data-camera-position"))
    .not.toBe(plantPosition);
  await controls
    .getByRole("button", { name: "Reset facility view", exact: true })
    .click();
  await expect
    .poll(() => canvas.getAttribute("data-camera-position"))
    .toBe(plantPosition);
  await page.keyboard.press("Escape");
  await expect(controls).not.toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "View and lighting controls",
      exact: true,
    }),
  ).toBeFocused();
  // Send real pointer events directly to an exposed piece of the scene on both layouts.
  const viewport = page.viewportSize()!;
  const x = viewport.width / 2,
    y = viewport.height * 0.47;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 55, y + 15, { steps: 6 });
  await page.mouse.up();
  await expect
    .poll(() => canvas.getAttribute("data-camera-position"))
    .not.toBe(plantPosition);
  const draggedPosition = await canvas.getAttribute("data-camera-position");
  await page.mouse.wheel(0, -120);
  await expect
    .poll(() => canvas.getAttribute("data-camera-position"))
    .not.toBe(draggedPosition);
  expect(await mission(page)).toEqual(initialMission);
  await page.reload();
  await expect(canvas).toHaveAttribute("data-camera-view", "plant");
  await expect(canvas).toHaveAttribute("data-time-mode", "day");
  expect(await mission(page)).toEqual(initialMission);
});

test("automatic atmosphere advances and freezes when paused or reduced motion is enabled", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const canvas = page.locator(".fl-world-canvas");
  await expect(page.locator(".fl-facility-scene")).toHaveClass(/is-ready/);
  const hour = Number(await canvas.getAttribute("data-site-hour"));
  const position = await canvas.getAttribute("data-camera-position");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-site-hour")))
    .toBeGreaterThan(hour + 0.03);
  await expect
    .poll(() => canvas.getAttribute("data-camera-position"))
    .not.toBe(position);
  await page
    .getByRole("button", { name: "Pause and settings", exact: true })
    .click();
  const frozenHour = await canvas.getAttribute("data-site-hour");
  const frozenPosition = await canvas.getAttribute("data-camera-position");
  // Deliberate observation window: a running world would advance by ~.08 hour.
  await page.waitForTimeout(800);
  expect(await canvas.getAttribute("data-site-hour")).toBe(frozenHour);
  expect(await canvas.getAttribute("data-camera-position")).toBe(
    frozenPosition,
  );
  await page.getByRole("checkbox", { name: /Reduced motion/ }).check();
  await page
    .getByRole("button", { name: "Return to the facility", exact: true })
    .click();
  const reducedHour = await canvas.getAttribute("data-site-hour");
  await page.waitForTimeout(800);
  expect(await canvas.getAttribute("data-site-hour")).toBe(reducedHour);
  await page.reload();
  await expect(page.locator(".fl-game")).toHaveClass(/fl-reduced-motion/);
  await page
    .getByRole("button", { name: "View and lighting controls", exact: true })
    .click();
  await page.getByRole("button", { name: "Night", exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-site-hour")))
    .toBeCloseTo(23, 1);
});

test("malformed display preferences cannot block the game", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "core.firstlight.presentation.v1",
      '{"cameraView":"invalid","timeMode":{},"reducedMotion":"yes"}',
    ),
  );
  await start(page);
  await expect(page.locator(".fl-world-canvas")).toHaveAttribute(
    "data-camera-view",
    "campus",
  );
  await expect(page.locator(".fl-world-canvas")).toHaveAttribute(
    "data-time-mode",
    "cycle",
  );
  expect((await mission(page)).stage).toBe("survey");
});
