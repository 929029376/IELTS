import { expect, test } from "@playwright/test";

test("renders the local IELTS dashboard in the browser", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "IELTS Local Practice" })).toBeVisible();
  await expect(page.getByText("Mock Exam Center")).toBeVisible();
  await expect(page.getByText("Intensive Practice Center")).toBeVisible();
});
