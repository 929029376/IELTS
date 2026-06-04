import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { DatabaseHandle } from "../db/database";
import { createQuestionRepo } from "../db/questionRepo";
import { cleanTitle, inferPartFromPath, sha256, writeAssetFile } from "./importUtils";

export interface ReadingPdfImportOptions {
  pdfPath: string;
  assetRoot: string;
}

export interface ReadingPdfImportResult {
  sourceId: string;
  passageId: string;
  importStatus: "needs_review";
  part: "P1" | "P2" | "P3" | "P4";
  englishTitle: string;
  chineseTitle: string | null;
  deduped: boolean;
}

function parseReadingTitle(fileName: string): { englishTitle: string; chineseTitle: string | null } {
  const cleaned = cleanTitle(fileName);
  const match = cleaned.match(/^(.+?)\s+([\u3400-\u9fff].*)$/);
  if (!match) {
    return { englishTitle: cleaned, chineseTitle: null };
  }
  return {
    englishTitle: match[1].trim(),
    chineseTitle: match[2].trim()
  };
}

export async function importReadingPdf(
  db: DatabaseHandle,
  options: ReadingPdfImportOptions
): Promise<ReadingPdfImportResult> {
  const repo = createQuestionRepo(db);
  const pdfBytes = await readFile(options.pdfPath);
  const checksum = sha256(pdfBytes);
  const existingSource = repo.findSourceByChecksum(checksum);
  const part = inferPartFromPath(options.pdfPath);
  const { englishTitle, chineseTitle } = parseReadingTitle(basename(options.pdfPath));

  if (existingSource) {
    const existingPassage = repo.getFirstPassageBySource(existingSource.id);
    if (!existingPassage) {
      throw new Error(`Existing source ${existingSource.id} has no passage record.`);
    }
    return {
      sourceId: existingSource.id,
      passageId: existingPassage.id,
      importStatus: "needs_review",
      part,
      englishTitle,
      chineseTitle,
      deduped: true
    };
  }

  const source = repo.createSource({
    sourceType: "reading_pdf",
    originalPath: options.pdfPath,
    checksum,
    importStatus: "needs_review",
    version: repo.nextSourceVersion({
      originalPath: options.pdfPath,
      sourceType: "reading_pdf"
    })
  });
  const passage = repo.createPassage({
    sourceId: source.id,
    subject: "reading",
    part,
    title: englishTitle,
    frequencyClass: "unknown"
  });
  const filePath = await writeAssetFile({
    assetRoot: options.assetRoot,
    category: "reading",
    sourceId: source.id,
    originalName: options.pdfPath,
    bytes: pdfBytes
  });

  repo.createSourceAsset({
    sourceId: source.id,
    assetKind: "pdf",
    originalName: basename(options.pdfPath),
    filePath,
    textContent: null,
    checksum
  });

  return {
    sourceId: source.id,
    passageId: passage.id,
    importStatus: "needs_review",
    part,
    englishTitle,
    chineseTitle,
    deduped: false
  };
}

async function findPdfFiles(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return findPdfFiles(fullPath);
      }
      return entry.isFile() && entry.name.toLowerCase().endsWith(".pdf") ? [fullPath] : [];
    })
  );
  return nested.flat();
}

export async function importReadingDirectory(
  db: DatabaseHandle,
  options: { rootDir: string; assetRoot: string }
): Promise<{ imported: ReadingPdfImportResult[] }> {
  const pdfFiles = await findPdfFiles(options.rootDir);
  const imported: ReadingPdfImportResult[] = [];

  for (const pdfPath of pdfFiles) {
    imported.push(await importReadingPdf(db, { pdfPath, assetRoot: options.assetRoot }));
  }

  return { imported };
}
