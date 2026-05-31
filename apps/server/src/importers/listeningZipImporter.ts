import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import JSZip from "jszip";
import mammoth from "mammoth";
import type { DatabaseHandle } from "../db/database";
import { createQuestionRepo } from "../db/questionRepo";
import {
  assetKindFromName,
  cleanTitle,
  inferFrequencyFromPath,
  inferPartFromPath,
  sha256,
  writeAssetFile
} from "./importUtils";

export interface ListeningZipImportOptions {
  zipPath: string;
  assetRoot: string;
}

export interface ListeningZipImportResult {
  sourceId: string;
  passageId: string;
  importStatus: "needs_review";
  part: "P1" | "P2" | "P3" | "P4";
  frequencyClass: "high" | "medium" | "low" | "unknown";
  deduped: boolean;
}

export async function importListeningZip(
  db: DatabaseHandle,
  options: ListeningZipImportOptions
): Promise<ListeningZipImportResult> {
  const repo = createQuestionRepo(db);
  const zipBytes = await readFile(options.zipPath);
  const checksum = sha256(zipBytes);
  const existingSource = repo.findSourceByChecksum(checksum);
  const part = inferPartFromPath(options.zipPath);
  const frequencyClass = inferFrequencyFromPath(options.zipPath);

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
      frequencyClass,
      deduped: true
    };
  }

  const source = repo.createSource({
    sourceType: "listening_zip",
    originalPath: options.zipPath,
    checksum,
    importStatus: "needs_review",
    version: 1
  });
  const passage = repo.createPassage({
    sourceId: source.id,
    subject: "listening",
    part,
    title: cleanTitle(basename(options.zipPath)),
    frequencyClass
  });

  const zip = await JSZip.loadAsync(zipBytes);
  const files = Object.values(zip.files).filter((file) => !file.dir);

  for (const file of files) {
    const bytes = await file.async("nodebuffer");
    const assetKind = assetKindFromName(file.name);
    const filePath =
      assetKind === "html" || assetKind === "docx"
        ? null
        : await writeAssetFile({
            assetRoot: options.assetRoot,
            category: "listening",
            sourceId: source.id,
            originalName: file.name,
            bytes
          });
    let textContent: string | null = null;

    if (assetKind === "html") {
      textContent = bytes.toString("utf8");
    }
    if (assetKind === "docx") {
      try {
        textContent = (await mammoth.extractRawText({ buffer: bytes })).value;
      } catch {
        textContent = null;
      }
    }

    repo.createSourceAsset({
      sourceId: source.id,
      assetKind,
      originalName: file.name,
      filePath,
      textContent,
      checksum: sha256(bytes)
    });

    if (assetKind === "audio" && filePath) {
      repo.createListeningAudio({
        passageId: passage.id,
        filePath,
        durationSeconds: null,
        checksum: sha256(bytes)
      });
    }
  }

  return {
    sourceId: source.id,
    passageId: passage.id,
    importStatus: "needs_review",
    part,
    frequencyClass,
    deduped: false
  };
}

async function findZipFiles(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return findZipFiles(fullPath);
      }
      return entry.isFile() && entry.name.toLowerCase().endsWith(".zip") ? [fullPath] : [];
    })
  );
  return nested.flat();
}

export async function importListeningDirectory(
  db: DatabaseHandle,
  options: { rootDir: string; assetRoot: string }
): Promise<{ imported: ListeningZipImportResult[] }> {
  const zipFiles = await findZipFiles(options.rootDir);
  const imported: ListeningZipImportResult[] = [];

  for (const zipPath of zipFiles) {
    imported.push(await importListeningZip(db, { zipPath, assetRoot: options.assetRoot }));
  }

  return { imported };
}
