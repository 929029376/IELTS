import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type DatabaseHandle } from "../db/database";
import { migrate } from "../db/migrate";
import { createQuestionRepo } from "../db/questionRepo";
import { importFrequencyCsv, importFrequencyRows, importFrequencyXlsx } from "../importers/frequencyImporter";
import { importListeningDirectory, importListeningZip } from "../importers/listeningZipImporter";
import { importReadingDirectory, importReadingPdf } from "../importers/readingPdfImporter";

describe("question bank importers", () => {
  let db: DatabaseHandle;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "ielts-importers-"));
    db = openDatabase(":memory:");
    migrate(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("imports listening zip assets with part and frequency from the path", async () => {
    const zip = new JSZip();
    const folder = zip.folder("17. P1 Birthday Party Arrangement");
    folder?.file("17. P1 Birthday Party Arrangement.html", "<h1>Birthday Party</h1>");
    folder?.file("17. P1 Birthday Party Arrangement.pdf", "PDF bytes");
    folder?.file("audio.mp3", "audio bytes");
    const zipBytes = await zip.generateAsync({ type: "nodebuffer" });

    const zipDir = join(tempDir, "IELTS Listening 虾滑", "P1", "高频");
    await mkdir(zipDir, { recursive: true });
    const zipPath = join(zipDir, "17. P1 Birthday Party Arrangement.zip");
    writeFileSync(zipPath, zipBytes);

    const result = await importListeningZip(db, {
      zipPath,
      assetRoot: join(tempDir, "assets")
    });
    const repo = createQuestionRepo(db);
    const passage = repo.getPassageWithQuestions(result.passageId);
    const assets = repo.listSourceAssets(result.sourceId);

    expect(result.importStatus).toBe("needs_review");
    expect(result.part).toBe("P1");
    expect(result.frequencyClass).toBe("high");
    expect(passage).toMatchObject({
      title: "Birthday Party Arrangement",
      subject: "listening",
      part: "P1",
      frequencyClass: "high"
    });
    expect(assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ assetKind: "html", textContent: "<h1>Birthday Party</h1>" }),
        expect.objectContaining({ assetKind: "pdf" }),
        expect.objectContaining({ assetKind: "audio" })
      ])
    );
    expect(readFileSync(assets.find((asset) => asset.assetKind === "audio")?.filePath ?? "")).toEqual(
      Buffer.from("audio bytes")
    );
  });

  it("dedupes listening zips by checksum", async () => {
    const zip = new JSZip();
    zip.file("audio.mp3", "audio bytes");
    const zipBytes = await zip.generateAsync({ type: "nodebuffer" });
    const zipPath = join(tempDir, "IELTS Listening 虾滑", "P2", "次高频", "1. P2 Map.zip");
    await mkdir(dirname(zipPath), { recursive: true });
    writeFileSync(zipPath, zipBytes);

    const first = await importListeningZip(db, { zipPath, assetRoot: join(tempDir, "assets") });
    const second = await importListeningZip(db, { zipPath, assetRoot: join(tempDir, "assets") });

    expect(second.sourceId).toBe(first.sourceId);
    expect(second.deduped).toBe(true);
  });

  it("batch imports listening and reading directories into searchable passage records", async () => {
    const listeningZip = new JSZip();
    listeningZip.file("audio.mp3", "audio bytes");
    const zipBytes = await listeningZip.generateAsync({ type: "nodebuffer" });
    const listeningDir = join(tempDir, "listening", "IELTS Listening 虾滑", "P3", "非高频");
    await mkdir(listeningDir, { recursive: true });
    writeFileSync(join(listeningDir, "2. P3 Group Project.zip"), zipBytes);

    const readingDir = join(tempDir, "reading", "ReadingPractice", "PDF");
    await mkdir(readingDir, { recursive: true });
    await writeFile(join(readingDir, "31. P1 - William Gilbert and Magnetism 电磁学之父.pdf"), "PDF bytes");

    const listeningResult = await importListeningDirectory(db, {
      rootDir: join(tempDir, "listening"),
      assetRoot: join(tempDir, "assets")
    });
    const readingResult = await importReadingDirectory(db, {
      rootDir: readingDir,
      assetRoot: join(tempDir, "assets")
    });
    const repo = createQuestionRepo(db);
    const passages = repo.listPassages();

    expect(listeningResult.imported).toHaveLength(1);
    expect(readingResult.imported).toHaveLength(1);
    expect(passages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Group Project", subject: "listening", frequencyClass: "low" }),
        expect.objectContaining({
          title: "William Gilbert and Magnetism",
          subject: "reading",
          frequencyClass: "unknown"
        })
      ])
    );
  });

  it("imports reading PDF metadata from the filename", async () => {
    const pdfDir = join(tempDir, "ReadingPractice", "PDF");
    await mkdir(pdfDir, { recursive: true });
    const pdfPath = join(pdfDir, "18. P1 - The History of Tea 茶叶的历史.pdf");
    await writeFile(pdfPath, "PDF bytes");

    const result = await importReadingPdf(db, {
      pdfPath,
      assetRoot: join(tempDir, "assets")
    });
    const repo = createQuestionRepo(db);
    const passage = repo.getPassageWithQuestions(result.passageId);
    const assets = repo.listSourceAssets(result.sourceId);

    expect(result).toMatchObject({
      part: "P1",
      englishTitle: "The History of Tea",
      chineseTitle: "茶叶的历史",
      importStatus: "needs_review"
    });
    expect(passage).toMatchObject({
      subject: "reading",
      part: "P1",
      title: "The History of Tea",
      frequencyClass: "unknown"
    });
    expect(assets[0]).toMatchObject({
      assetKind: "pdf",
      originalName: basename(pdfPath)
    });
  });

  it("imports structured frequency CSV rows", async () => {
    const csvPath = join(tempDir, "frequency.csv");
    writeFileSync(
      csvPath,
      [
        "subject,part,englishTitle,chineseTitle,frequencyClass,difficulty,sourceMonth",
        "reading,P1,The History of Tea,茶叶的历史,high,2.5,2026-05",
        "listening,P2,Map of Ocean Edge Hotel,海洋酒店地图,medium,3,2026-05"
      ].join("\n")
    );

    const result = await importFrequencyCsv(db, { csvPath });
    const entries = result.entries;

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      subject: "reading",
      part: "P1",
      englishTitle: "The History of Tea",
      frequencyClass: "high",
      difficulty: 2.5
    });
  });

  it("updates matching passage frequency classes after frequency rows are imported", () => {
    const repo = createQuestionRepo(db);
    const source = repo.createSource({
      checksum: "reading-tea-frequency",
      importStatus: "needs_review",
      originalPath: "/Users/musheng/Desktop/IELTS/reading/ReadingPractice/PDF/The History of Tea.pdf",
      sourceType: "reading_pdf",
      version: 1
    });
    const passage = repo.createPassage({
      frequencyClass: "unknown",
      part: "P1",
      sourceId: source.id,
      subject: "reading",
      title: "The History of Tea"
    });

    importFrequencyRows(db, [
      {
        subject: "reading",
        part: "P1",
        englishTitle: "The History of Tea",
        chineseTitle: "茶叶的历史",
        frequencyClass: "high",
        difficulty: 2.5,
        sourceMonth: "2026-05"
      }
    ]);

    expect(repo.getPassageWithQuestions(passage.id)).toMatchObject({
      frequencyClass: "high"
    });
  });

  it("imports structured frequency XLSX rows and manually corrected rows", async () => {
    const xlsxPath = join(tempDir, "frequency.xlsx");
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([
      {
        subject: "reading",
        part: "P2",
        englishTitle: "Bird Migration",
        chineseTitle: "鸟类迁徙",
        frequencyClass: "high",
        difficulty: 3.5,
        sourceMonth: "2026-05"
      }
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "frequency");
    XLSX.writeFile(workbook, xlsxPath);

    const xlsxResult = await importFrequencyXlsx(db, { xlsxPath });
    const manualResult = importFrequencyRows(db, [
      {
        subject: "reading",
        part: "P3",
        englishTitle: "Sign, Baby, Sign!",
        chineseTitle: "美国手语",
        frequencyClass: "medium",
        difficulty: 3.5,
        sourceMonth: "2026-05"
      }
    ]);

    expect(xlsxResult.entries[0]).toMatchObject({
      englishTitle: "Bird Migration",
      frequencyClass: "high"
    });
    expect(manualResult.entries[0]).toMatchObject({
      englishTitle: "Sign, Baby, Sign!",
      frequencyClass: "medium"
    });
  });
});
