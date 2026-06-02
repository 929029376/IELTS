import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../server";

describe("import routes", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "ielts-import-routes-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("imports listening directories, reading directories, and corrected frequency rows from local paths", async () => {
    const zip = new JSZip();
    zip.file("audio.mp3", "audio bytes");
    const zipBytes = await zip.generateAsync({ type: "nodebuffer" });
    const listeningZipPath = join(tempDir, "listening", "IELTS Listening 虾滑", "P1", "高频", "1. P1 Enquiry.zip");
    await mkdir(dirname(listeningZipPath), { recursive: true });
    writeFileSync(listeningZipPath, zipBytes);

    const readingPdfPath = join(tempDir, "reading", "ReadingPractice", "PDF", "18. P1 - The History of Tea 茶叶的历史.pdf");
    await mkdir(dirname(readingPdfPath), { recursive: true });
    writeFileSync(readingPdfPath, "PDF bytes");

    const server = buildServer({
      assetRoot: join(tempDir, "assets"),
      databasePath: join(tempDir, "ielts.db")
    });

    try {
      const listening = await server.inject({
        method: "POST",
        url: "/api/import/listening-directory",
        payload: { rootDir: join(tempDir, "listening") }
      });
      expect(listening.statusCode).toBe(200);
      expect(listening.json()).toMatchObject({
        importedCount: 1,
        imported: [expect.objectContaining({ frequencyClass: "high", part: "P1", deduped: false })]
      });

      const reading = await server.inject({
        method: "POST",
        url: "/api/import/reading-directory",
        payload: { rootDir: join(tempDir, "reading", "ReadingPractice", "PDF") }
      });
      expect(reading.statusCode).toBe(200);
      expect(reading.json()).toMatchObject({
        importedCount: 1,
        imported: [expect.objectContaining({ englishTitle: "The History of Tea", part: "P1" })]
      });

      const frequency = await server.inject({
        method: "POST",
        url: "/api/import/frequency-rows",
        payload: {
          rows: [
            {
              subject: "reading",
              part: "P1",
              englishTitle: "The History of Tea",
              chineseTitle: "茶叶的历史",
              frequencyClass: "high",
              difficulty: 2.5,
              sourceMonth: "2026-06"
            }
          ]
        }
      });
      expect(frequency.statusCode).toBe(200);
      expect(frequency.json()).toMatchObject({
        importedCount: 1,
        entries: [expect.objectContaining({ englishTitle: "The History of Tea", frequencyClass: "high" })]
      });
    } finally {
      await server.close();
    }
  });
});
