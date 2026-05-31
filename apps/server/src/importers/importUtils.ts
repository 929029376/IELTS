import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

export function sha256(buffer: Buffer | string): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function cleanTitle(title: string): string {
  return title
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\bP[1-4]\b\s*-?\s*/i, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferPartFromPath(pathValue: string): "P1" | "P2" | "P3" | "P4" {
  const match = pathValue.match(/\bP([1-4])\b/i);
  if (!match) {
    throw new Error(`Could not infer IELTS part from path: ${pathValue}`);
  }
  return `P${match[1]}` as "P1" | "P2" | "P3" | "P4";
}

export function inferFrequencyFromPath(pathValue: string): "high" | "medium" | "low" | "unknown" {
  if (pathValue.includes("非高频")) {
    return "low";
  }
  if (pathValue.includes("次高频")) {
    return "medium";
  }
  if (pathValue.includes("高频")) {
    return "high";
  }
  return "unknown";
}

export function assetKindFromName(name: string): "html" | "docx" | "pdf" | "audio" | "other" {
  const lowerName = name.toLowerCase();
  const extension = extname(lowerName);

  if (extension === ".html" || extension === ".htm") {
    return "html";
  }
  if (extension === ".docx") {
    return "docx";
  }
  if (extension === ".pdf") {
    return "pdf";
  }
  if ([".mp3", ".wav", ".m4a", ".aac", ".ogg"].includes(extension)) {
    return "audio";
  }
  return "other";
}

export async function writeAssetFile(input: {
  assetRoot: string;
  category: string;
  sourceId: string;
  originalName: string;
  bytes: Buffer;
}): Promise<string> {
  const targetDir = join(input.assetRoot, input.category, input.sourceId);
  await mkdir(targetDir, { recursive: true });
  const safeName = basename(input.originalName).replace(/[/:\\]/g, "_");
  const targetPath = join(targetDir, safeName);
  await writeFile(targetPath, input.bytes);
  return targetPath;
}
