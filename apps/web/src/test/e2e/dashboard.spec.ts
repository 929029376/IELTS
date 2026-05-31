import { expect, test } from "@playwright/test";

test("renders the local IELTS dashboard and exam preview across desktop widths", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "IELTS Local Practice" })).toBeVisible();
    await expect(page.getByText("Mock Exam Center")).toBeVisible();
    await expect(page.getByText("Intensive Practice Center")).toBeVisible();
    await expect(page.getByRole("region", { name: "IELTS-style exam preview" })).toBeVisible();
    await expect(page.getByText("The History of Tea")).toBeVisible();
    await expect(page.getByText("60:00")).toBeVisible();
    await page.getByRole("button", { name: "Submit test" }).click();
    await page.getByRole("button", { name: "Submit anyway" }).click();
    await expect(page.getByRole("region", { name: "Score report" })).toBeVisible();
    await expect(page.getByText("1/40")).toBeVisible();
  }
});
