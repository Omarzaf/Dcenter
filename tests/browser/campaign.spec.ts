import { expect, test, type Page } from "@playwright/test";
import { createGame, type StrategyState } from "../../src/strategy/model.ts";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on("pageerror", (error) => list.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page), "No unhandled browser errors").toEqual([]);
});

async function state(page: Page): Promise<StrategyState> {
  return page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("core.strategy.v1")!)
        .game as StrategyState,
  );
}
async function start(page: Page) {
  await page.goto("/?mode=legacy");
  await page.getByRole("button", { name: "Start campaign" }).click();
  await expect(
    page.getByRole("button", { name: "Advance quarter 1", exact: true }),
  ).toBeVisible();
}
async function buildModule(page: Page, name: string, lot: string) {
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
  await page
    .getByRole("button", { name: new RegExp(`^Lot ${lot}: empty`) })
    .click();
  await expect(
    page.getByRole("button", { name: new RegExp(`^Lot ${lot}: ${name}`, "i") }),
  ).toHaveCount(1);
}

test("setup, keyboard guide, and responsive layout are usable", async ({
  page,
}, info) => {
  await page.goto("/?mode=legacy");
  await expect(
    page.getByRole("heading", { name: "Build for an uncertain world." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "How to play" })).toBeFocused();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  await page.screenshot({ path: info.outputPath("setup.png"), fullPage: true });
});

test("construction, forecasts, and a complete winning campaign", async ({
  page,
}, info) => {
  await start(page);
  await buildModule(page, "Compute hall", "A1");
  await buildModule(page, "Compute hall", "A2");
  await buildModule(page, "Cooling plant", "A3");
  await buildModule(page, "Grid connection", "A4");
  await buildModule(page, "Network exchange", "A5");
  expect((await state(page)).cash).toBe(89);
  for (let quarter = 1; quarter <= 12; quarter++) {
    const advance = page.getByRole("button", {
      name: `Advance quarter ${quarter}`,
      exact: true,
    });
    if (quarter % 2 === 0) {
      await expect(advance).toBeDisabled();
      await page.getByRole("radio").nth(1).check();
      await expect(advance).toBeEnabled();
    }
    const before = await state(page);
    const forecast = await page.locator(".finance-total strong").innerText();
    await advance.click();
    await expect
      .poll(async () => (await state(page)).history.length)
      .toBe(quarter);
    const after = await state(page);
    const net = after.history.at(-1)!.profit;
    expect(after.cash).toBeCloseTo(before.cash + net, 2);
    expect(forecast).toBe(`${net < 0 ? "−" : ""}$${Math.abs(net).toFixed(0)}m`);
    if (quarter === 2)
      await page.screenshot({
        path: info.outputPath("campus.png"),
        fullPage: true,
      });
  }
  await expect(
    page.getByText("MISSION COMPLETE", { exact: true }),
  ).toBeVisible();
  expect((await state(page)).status).toBe("won");
  await page.getByRole("button", { name: "Read your debrief" }).click();
  await expect(page.locator(".journal-entries article")).toHaveCount(12);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export campaign journal", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe(
    "core-atlantic-q12-journal.json",
  );
});

test("checkpoint branches preserve outcomes and survive reload", async ({
  page,
}) => {
  await start(page);
  const initial = await state(page);
  await page.getByRole("button", { name: "Scenario lab", exact: true }).click();
  await page.getByRole("button", { name: "Save checkpoint" }).click();
  await page.getByRole("button", { name: "Campus", exact: true }).click();
  await buildModule(page, "Compute hall", "B1");
  await page
    .getByRole("button", { name: "Advance quarter 1", exact: true })
    .click();
  const originalBranch = await state(page);
  await page.getByRole("button", { name: "Scenario lab", exact: true }).click();
  await page.getByRole("button", { name: "Branch from checkpoint" }).click();
  await expect.poll(async () => (await state(page)).quarter).toBe(1);
  expect(await state(page)).toEqual(initial);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("core.strategy.v1")!).comparison.cash,
    ),
  ).toBe(originalBranch.cash);
  await page.reload();
  expect(await state(page)).toEqual(initial);
  await page.getByRole("button", { name: "Scenario lab", exact: true }).click();
  await expect(
    page.getByText("Your two branches", { exact: true }),
  ).toBeVisible();
});

test("invalid saves recover and denied storage remains playable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("core.strategy.v1", "{broken");
    } catch {
      /* A later test step denies access. */
    }
  });
  await page.goto("/?mode=legacy");
  await expect(
    page.getByRole("button", { name: "Start campaign" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("could not be read");
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage denied");
      },
    }),
  );
  await page.reload();
  await page.getByRole("button", { name: "Start campaign" }).click();
  await page
    .getByRole("button", { name: "Advance quarter 1", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Advance quarter 2", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Storage unavailable");
});

test("map keyboard construction and reduced motion work", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  const tile = page.getByRole("button", { name: /^Lot A1: empty/ });
  await tile.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: /^Lot A2: empty/ }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: /^Lot A2: Compute hall/ }),
  ).toHaveCount(1);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: /^Lot A2: Compute hall/ }),
  ).not.toBeFocused();
  await page.getByRole("button", { name: "Large touch grid" }).click();
  const largeTile = page.getByRole("button", { name: /^Lot B2: empty/ });
  const bounds = await largeTile.boundingBox();
  expect(bounds!.width).toBeGreaterThanOrEqual(44);
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
  await largeTile.click();
  await expect(
    page.getByRole("button", { name: /^Lot B2: Compute hall/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "How to play" }).click();
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("spending after response selection cannot commit an unaffordable response", async ({
  page,
}) => {
  const game = createGame("atlantic", "balanced");
  // A legitimate Q1 save after a large construction budget is unnecessary here:
  // progress through the real interface and spend the remaining balance in Q2.
  await start(page);
  expect((await state(page)).siteId).toBe(game.siteId);
  await page
    .getByRole("button", { name: "Advance quarter 1", exact: true })
    .click();
  await page.getByRole("radio").nth(1).check();
  const emptyLots = [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5",
    "A6",
    "B1",
    "B2",
    "B3",
    "B4",
    "B5",
    "B6",
  ];
  for (const lot of emptyLots) {
    const button = page.getByRole("button", { name: /^Network exchange/ });
    if (!(await button.isEnabled())) break;
    await button.click();
    await page
      .getByRole("button", { name: new RegExp(`^Lot ${lot}: empty`) })
      .click();
  }
  expect((await state(page)).cash).toBeLessThan(18);
  await expect(
    page.getByRole("button", { name: "Advance quarter 2", exact: true }),
  ).toBeDisabled();
  await page.getByRole("radio").nth(0).check();
  await expect(
    page.getByRole("button", { name: "Advance quarter 2", exact: true }),
  ).toBeEnabled();
});

test("floor lab returns to the unchanged strategy campaign", async ({
  page,
}) => {
  await start(page);
  const before = await state(page);
  await page.getByRole("button", { name: /Floor lab/ }).click();
  await expect(
    page.getByRole("button", { name: /Return to strategy campaign/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Return to strategy campaign/ })
    .click();
  expect(await state(page)).toEqual(before);
  await expect(
    page.getByRole("button", { name: "Advance quarter 1", exact: true }),
  ).toBeVisible();
});

test("new scenario setup preserves the active campaign until a new start", async ({
  page,
}) => {
  await start(page);
  await page
    .getByRole("button", { name: "Advance quarter 1", exact: true })
    .click();
  const saved = await state(page);
  await page.getByRole("button", { name: "New campaign", exact: true }).click();
  await page.getByRole("button", { name: /Northern Reach/ }).click();
  expect(await state(page)).toEqual(saved);
  await page.getByRole("button", { name: "Resume current campaign" }).click();
  expect(await state(page)).toEqual(saved);
  await expect(
    page.getByRole("button", { name: "Advance quarter 2", exact: true }),
  ).toBeVisible();
});
