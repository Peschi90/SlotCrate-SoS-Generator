import { test, expect } from "@playwright/test";

/**
 * Wichtigster Sicherheitspfad: Nicht-Admin bekommt für Admin-APIs 403,
 * auch bei manipuliertem Client-Zustand. Wird ohne gültige Session
 * ausgeführt.
 */
test("admin API rejects unauthenticated requests", async ({ request }) => {
  const get = await request.get("/api/admin/settings");
  expect(get.status()).toBe(403);
  const post = await request.post("/api/admin/settings", {
    data: { csrfToken: "fake", payload: {} }
  });
  expect(post.status()).toBe(403);
});

test("admin page redirects unauthenticated user to login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});
