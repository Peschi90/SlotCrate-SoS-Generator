import { test, expect } from "@playwright/test";

test("planner drag creates a box and export becomes available", async ({ page }) => {
  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: /Layout-Planer/i })).toBeVisible();

  const svg = page.locator("svg").first();
  const box = await svg.boundingBox();
  if (!box) throw new Error("planner grid nicht gefunden");
  const cellPx = box.width / 10;
  const originX = box.x + cellPx * 1 + cellPx / 2;
  const originY = box.y + cellPx * 1 + cellPx / 2;
  const targetX = box.x + cellPx * 2 + cellPx / 2;
  const targetY = box.y + cellPx * 2 + cellPx / 2;

  await page.mouse.move(originX, originY);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 5 });
  await page.mouse.up();

  await expect(page.getByText("Anzahl Kästen: 1")).toBeVisible();
  await expect(page.getByRole("button", { name: /ZIP \+ Stückliste/ })).toBeEnabled();
});
