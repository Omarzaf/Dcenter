import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createMission, transition } from "../../src/firstlight/model";
import {
  createCampaign,
  campaignChoices,
  transitionCampaign,
  campaignMetrics,
} from "../../src/campaign/model";
import type { CampaignState, CampaignStage } from "../../src/campaign/types";

const WRONG = new Set([
  "promise-hardware",
  "explain-count",
  "explain-add-delays",
  "explain-power",
]);
const PREPARED: Partial<Record<CampaignStage, string>> = {
  "cooling-design": "cooling-hybrid",
  procurement: "procurement-qualified",
  "network-design": "network-diverse",
  "power-design": "power-battery",
  "shipment-response": "qualified-alternate",
  "client-commitment": "promise-revised",
  "shift-one": "shift-one-critical",
  "shift-two": "shift-two-critical",
  "shift-three": "shift-three-battery",
  "cable-response": "use-diverse",
};
function origin() {
  let state = createMission();
  for (const command of [
    { type: "enter" },
    { type: "inspect" },
    { type: "install", bay: 1 },
    { type: "connect", utility: "power" },
    { type: "connect", utility: "cooling" },
    { type: "connect", utility: "network" },
    { type: "test" },
    { type: "repair" },
    { type: "test" },
    { type: "activate" },
    { type: "reflect", answer: "controls" },
    { type: "expansion", choice: "reserve" },
  ] as const) {
    const result = transition(state, command);
    if (result.error) throw new Error(result.error);
    state = result.state;
  }
  return state;
}
function nextId(state: CampaignState, path = PREPARED) {
  return (
    path[state.stage] ??
    campaignChoices(state).find((c) => !c.disabledReason && !WRONG.has(c.id))!
      .id
  );
}
function fixture(stop: CampaignStage, path = PREPARED) {
  let state = createCampaign(origin());
  for (let i = 0; state.stage !== stop && i < 33; i++) {
    const result = transitionCampaign(state, nextId(state, path));
    if (result.error) throw new Error(result.error);
    state = result.state;
  }
  if (state.stage !== stop) throw new Error(`Cannot reach ${stop}`);
  return state;
}
async function saved(page: Page): Promise<CampaignState> {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("core.campaign.v1")!),
  );
}
async function seed(page: Page, state: CampaignState) {
  await page.addInitScript(
    ({ state }) => {
      if (!sessionStorage.getItem("campaign-test-seeded")) {
        localStorage.setItem("core.campaign.v1", JSON.stringify(state));
        localStorage.setItem(
          "core.firstlight.presentation.v1",
          JSON.stringify({
            cameraView: "campus",
            timeMode: "day",
            reducedMotion: true,
          }),
        );
        sessionStorage.setItem("campaign-test-seeded", "true");
      }
    },
    { state },
  );
  await page.goto("/");
  await expect(page.locator("#campaign-objective")).toBeVisible();
}
async function choose(page: Page, state: CampaignState, id = nextId(state)) {
  await page.getByTestId(`choice-${id}`).click();
  const expected = transitionCampaign(state, id);
  if (expected.error) throw new Error(expected.error);
  await expect.poll(() => saved(page)).toEqual(expected.state);
  return expected.state;
}
async function keyboardActivate(page: Page, testId: string) {
  const button = page.getByTestId(testId);
  for (let i = 0; i < 70; i++) {
    if (await button.evaluate((e) => e === document.activeElement)) {
      await page.keyboard.press("Enter");
      return;
    }
    await page.keyboard.press("Tab");
  }
  await expect(button).toBeFocused();
}
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on("pageerror", (error) => list.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

test("First Light continues into all five new chapters and one evolving campus", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const first = origin();
  await page.addInitScript(
    (first) =>
      localStorage.setItem(
        "core.firstlight.v1",
        JSON.stringify({ version: 1, mission: first }),
      ),
    first,
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Continue your story", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Continue to Chapter 02", exact: true })
    .click();
  let state = createCampaign(first);
  await expect.poll(() => saved(page)).toEqual(state);
  await expect(page.locator("#campaign-objective")).toBeVisible();
  await expect(page.locator(".fl-facility-scene")).toHaveClass(/is-ready/);
  const canvas = await page.locator("canvas").elementHandle();
  if (page.viewportSize()!.width < 760) {
    const marker = page.getByRole("button", {
      name: "Inspect the expansion",
      exact: true,
    });
    await expect(marker).toBeVisible();
    const bounds = (await marker.boundingBox())!;
    const caption = (await page.locator(".cp-chapter-caption").boundingBox())!;
    const panels = (await page.locator(".cp-panels").boundingBox())!;
    expect(bounds.y).toBeGreaterThan(caption.y + caption.height);
    expect(bounds.y + bounds.height).toBeLessThan(panels.y);
  }
  const chapters = new Set<number>();
  for (let i = 0; state.stage !== "complete" && i < 33; i++) {
    if (!chapters.has(state.chapter)) {
      chapters.add(state.chapter);
      await expect(
        page.getByRole("region", { name: "Current chapter" }),
      ).toContainText(`CHAPTER 0${state.chapter}`);
      await page.screenshot({
        path: info.outputPath(`chapter-${state.chapter}.png`),
      });
    }
    if (state.stage === "open-expansion") {
      expect(state.expansionPhase).toBe("commissioned");
      expect(campaignMetrics(state).serviceKw).toBe(6);
    }
    state = await choose(page, state);
    expect(
      await canvas!.evaluate(
        (e) => e.isConnected && e === document.querySelector("canvas"),
      ),
    ).toBe(true);
  }
  expect([...chapters]).toEqual([2, 3, 4, 5, 6]);
  expect(state.journal).toHaveLength(32);
  expect(state.expansionPhase).toBe("online");
  expect(state.recoveryTested).toBe(true);
  await expect(
    page.getByRole("button", { name: "Read your operating record" }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("full-campaign-ending.png") });
  await page
    .getByRole("button", { name: "Read your operating record" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Original service commissioned",
  );
  expect(await page.locator(".cp-journal > li").count()).toBe(34);
  await page.getByRole("button", { name: "Close Field notebook" }).click();
  await page.reload();
  await expect.poll(() => saved(page)).toEqual(state);
  await expect(
    page.getByRole("button", { name: "Read your operating record" }),
  ).toBeVisible();
});

test("unprepared crisis path respects installation gates and temporary recovery limits", async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  const path = { "cable-response": "order-emergency" };
  let state = fixture("shipment-response", path);
  await seed(page, state);
  await expect(page.getByTestId("choice-qualified-alternate")).toBeDisabled();
  await expect(page.getByTestId("choice-reserved-slot")).toBeDisabled();
  while (state.stage !== "complete") {
    if (state.stage === "shift-one") {
      await expect(page.getByTestId("choice-shift-one-battery")).toBeDisabled();
      await expect(page.getByTestId("choice-shift-one-dry")).toBeDisabled();
    }
    if (state.stage === "cable-response")
      await expect(page.getByTestId("choice-use-diverse")).toBeDisabled();
    state = await choose(page, state, nextId(state, path));
  }
  expect(campaignMetrics(state).serviceKw).toBe(6);
  await expect(page.locator(".cp-decision-content")).toContainText(
    "Temporary critical route tested",
  );
  await page.screenshot({
    path: info.outputPath("temporary-route-ending.png"),
  });
});

test("what-if assumptions compare physical constraints without changing the timeline", async ({
  page,
}, info) => {
  const state = fixture("heat-signal", {});
  await seed(page, state);
  await page.getByRole("button", { name: "What if?", exact: true }).click();
  const table = page.locator(".cp-forecast");
  const before = await table.innerText();
  const slider = page.getByRole("slider", {
    name: "Physical grid power reduction",
  });
  await slider.fill("80");
  await page
    .getByRole("slider", { name: "Cooling water allocation reduction" })
    .fill("70");
  await page
    .getByRole("checkbox", { name: "Shared corridor unavailable" })
    .check();
  await expect(table).not.toHaveText(before);
  await expect(
    table.getByRole("row", { name: /^Critical service/ }),
  ).toContainText("0 kW");
  expect(await saved(page)).toEqual(state);
  await page.screenshot({ path: info.outputPath("what-if-planner.png") });
  await page.getByRole("button", { name: "Reset assumptions" }).click();
  expect(await table.innerText()).toBe(before);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("portable saves, checkpoint replay, and tampering preserve prior decisions", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const state = fixture("complete");
  await seed(page, state);
  await page.getByRole("button", { name: "Pause and campaign menu" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export campaign", exact: true })
    .click();
  const download = await downloadPromise;
  const bytes = await readFile((await download.path())!);
  expect(JSON.parse(bytes.toString())).toEqual(state);
  await page.getByRole("button", { name: "Resume campaign" }).click();
  await page.getByRole("button", { name: "Chapters", exact: true }).click();
  await page
    .getByRole("button", { name: "Replay The long week", exact: true })
    .click();
  expect(await saved(page)).toEqual(state);
  await page
    .getByRole("button", { name: "Confirm replay", exact: true })
    .click();
  const replay = await saved(page);
  expect(replay.stage).toBe("heat-signal");
  expect(replay.journal).toEqual(state.journal.filter((r) => r.chapter < 5));
  await page.getByRole("button", { name: "Chapters", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Replay The handover", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close The campaign" }).click();
  await page.getByRole("button", { name: "Pause and campaign menu" }).click();
  const input = page.getByLabel("Import campaign save", { exact: true });
  await input.setInputFiles({
    name: "tampered.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ ...state, budget: state.budget + 10 }),
    ),
  });
  await expect(page.getByRole("dialog")).toContainText(
    "could not be validated",
  );
  expect(await saved(page)).toEqual(replay);
  await input.setInputFiles({
    name: "campaign.json",
    mimeType: "application/json",
    buffer: bytes,
  });
  await expect(
    page.getByRole("dialog", { name: "Replace this timeline?" }),
  ).toBeVisible();
  expect(await saved(page)).toEqual(replay);
  await page
    .getByRole("button", { name: "Replace with imported save" })
    .click();
  await expect.poll(() => saved(page)).toEqual(state);
  await page.getByRole("button", { name: "Pause and campaign menu" }).click();
  await page
    .getByRole("button", { name: "Replay First Light", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm replay" }).click();
  await expect(
    page.getByRole("heading", { name: /First light\./ }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("core.campaign.v1")),
  ).toBeNull();
});

test("new chapters remain playable when the 3D bundle cannot load", async ({
  page,
}) => {
  await page.route(/\/assets\/FacilityScene-[^/]+\.js$/, (route) =>
    route.abort(),
  );
  const state = fixture("continuity-plan");
  await seed(page, state);
  await expect(page.locator(".fl-world-fallback")).toBeVisible();
  await choose(page, state);
  await expect(
    page.getByRole("button", { name: "Read your operating record" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Equipment", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Inspect the campus" }),
  ).toBeVisible();
});

test("campaign camera and day/night survive context restoration without advancing decisions", async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  const state = fixture("shift-one");
  await seed(page, state);
  await expect(page.locator(".fl-facility-scene")).toHaveClass(/is-ready/);
  await page.getByRole("button", { name: "Explore facility camera" }).click();
  const canvas = page.locator("canvas");
  await page.getByRole("button", { name: "Night", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-site-hour", "23.0000");
  await page.getByRole("button", { name: "Data hall", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-camera-view", "hall");
  await page.screenshot({ path: info.outputPath("campaign-night.png") });
  await page.getByRole("button", { name: "Day", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-site-hour", "12.0000");
  await page.getByRole("button", { name: "Campus", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-camera-view", "campus");
  await page.screenshot({ path: info.outputPath("campaign-campus-day.png") });
  const loss = await canvas.evaluate((element) => {
    const ext = (element as HTMLCanvasElement)
      .getContext("webgl2")
      ?.getExtension("WEBGL_lose_context");
    if (!ext) return false;
    ext.loseContext();
    setTimeout(() => ext.restoreContext(), 600);
    return true;
  });
  expect(loss).toBe(true);
  await expect(page.locator(".fl-world-fallback")).toBeVisible();
  await expect(page.locator(".fl-facility-scene")).toHaveClass(/is-ready/);
  await page.getByRole("button", { name: "Close view and lighting" }).click();
  expect(await saved(page)).toEqual(state);
  await choose(page, state);
});

test("keyboard decisions remain reachable and blocked storage retains session play", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const state = fixture("requirements");
  await seed(page, state);
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Blocked for test", "SecurityError");
    };
  });
  await keyboardActivate(page, `choice-${nextId(state)}`);
  await expect(page.locator(".cp-storage-warning")).toBeVisible();
  const second = transitionCampaign(state, nextId(state)).state;
  await keyboardActivate(page, `choice-${nextId(second)}`);
  await expect(page.getByTestId("choice-cooling-hybrid")).toBeVisible();
  await page.getByRole("button", { name: "Pause and campaign menu" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export campaign", exact: true })
    .click();
  const downloaded = JSON.parse(
    await readFile((await (await downloadPromise).path())!, "utf8"),
  );
  expect(downloaded.stage).toBe("cooling-design");
  expect(downloaded.journal).toHaveLength(2);
});
