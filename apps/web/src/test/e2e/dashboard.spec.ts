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
    await expect(page.getByRole("region", { name: "Local study queue" })).toBeVisible();
    await expect(page.getByRole("region", { name: "IELTS-style exam preview" })).toBeVisible();
    await expect(page.getByText("The History of Tea")).toBeVisible();
    await expect(page.getByText("60:00")).toBeVisible();
    await page.getByRole("button", { name: "Submit test" }).click();
    await page.getByRole("button", { name: "Submit anyway" }).click();
    const scoreReport = page.getByRole("region", { name: "Score report" });
    await expect(scoreReport).toBeVisible();
    await expect(scoreReport.getByText("1/40", { exact: true })).toBeVisible();
  }
});

test("covers V1 dashboard, import, practice, history, and sync regression anchors", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "IELTS Local Practice" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Local study queue" })).toContainText("Question-bank readiness");
  await expect(page.getByRole("region", { name: "Question bank import" })).toContainText("Local import and frequency updates");
  await expect(page.getByLabel("Listening directory path")).toHaveValue("/Users/musheng/Desktop/IELTS/listening");
  await expect(page.getByLabel("Reading PDF directory path")).toHaveValue("/Users/musheng/Desktop/IELTS/reading/ReadingPractice/PDF");
  await expect(page.getByRole("region", { name: "Import failure report" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Question-bank completeness" })).toBeVisible();
  await expect(page.getByText("No completed attempts yet")).toBeVisible();
  await expect(page.getByRole("region", { name: "Intensive practice preview" })).toBeVisible();
  await expect(page.getByRole("region", { name: "IELTS-style exam preview" })).toBeVisible();
  await expect(page.getByRole("region", { name: "History and reports preview" })).toContainText("Reports");
  await expect(page.getByRole("region", { name: "Sync settings" })).toContainText("Baidu Cloud JSONL sync");
});
