import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildServer } from "../server";

describe("local asset routes", () => {
  it("streams a local audio file for Mac listening playback", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-local-audio-"));
    const audioPath = join(tempDir, "section-1.mp3");
    writeFileSync(audioPath, Buffer.from("fake-mp3"));
    const server = buildServer();

    try {
      const response = await server.inject({
        method: "GET",
        url: `/api/assets/local?path=${encodeURIComponent(audioPath)}`
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("audio/mpeg");
      expect(response.body).toBe("fake-mp3");
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects unsupported local file types", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ielts-local-asset-reject-"));
    const textPath = join(tempDir, "private.txt");
    writeFileSync(textPath, "not an importable media asset");
    const server = buildServer();

    try {
      const response = await server.inject({
        method: "GET",
        url: `/api/assets/local?path=${encodeURIComponent(textPath)}`
      });

      expect(response.statusCode).toBe(415);
      expect(response.json()).toMatchObject({ message: "Unsupported local asset type." });
    } finally {
      await server.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
