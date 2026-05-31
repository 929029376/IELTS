import { readFile } from "node:fs/promises";
import * as XLSX from "xlsx";
import type { DatabaseHandle } from "../db/database";
import { createFrequencyRepo, type FrequencyEntryRecord } from "../db/frequencyRepo";

export type FrequencyImportRow = Omit<FrequencyEntryRecord, "id">;

export interface FrequencyImportResult {
  entries: FrequencyEntryRecord[];
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function normalizeFrequencyClass(value: string): "high" | "medium" | "low" | "unknown" {
  const normalized = value.trim().toLowerCase();
  if (["high", "高频"].includes(normalized)) {
    return "high";
  }
  if (["medium", "mid", "次高频"].includes(normalized)) {
    return "medium";
  }
  if (["low", "非高频"].includes(normalized)) {
    return "low";
  }
  return "unknown";
}

function rowFromRecord(record: Record<string, unknown>): FrequencyImportRow {
  return {
    subject: String(record.subject),
    part: String(record.part) as FrequencyImportRow["part"],
    englishTitle: String(record.englishTitle),
    chineseTitle: record.chineseTitle ? String(record.chineseTitle) : null,
    frequencyClass: normalizeFrequencyClass(String(record.frequencyClass)),
    difficulty:
      record.difficulty === undefined || record.difficulty === ""
        ? null
        : Number.parseFloat(String(record.difficulty)),
    sourceMonth: String(record.sourceMonth)
  } as FrequencyImportRow;
}

export function importFrequencyRows(
  db: DatabaseHandle,
  rows: FrequencyImportRow[]
): FrequencyImportResult {
  const repo = createFrequencyRepo(db);
  return {
    entries: rows.map((row) => repo.upsertFrequencyEntry(row))
  };
}

export async function importFrequencyCsv(
  db: DatabaseHandle,
  options: { csvPath: string }
): Promise<FrequencyImportResult> {
  const content = await readFile(options.csvPath, "utf8");
  const [headerLine, ...bodyLines] = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const headers = parseCsvLine(headerLine);
  const rows = bodyLines.map((line) => {
    const values = parseCsvLine(line);
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    return rowFromRecord(record);
  });
  return importFrequencyRows(db, rows);
}

export async function importFrequencyXlsx(
  db: DatabaseHandle,
  options: { xlsxPath: string }
): Promise<FrequencyImportResult> {
  const workbook = XLSX.readFile(options.xlsxPath);
  const firstSheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName]).map(
    rowFromRecord
  );
  return importFrequencyRows(db, rows);
}
