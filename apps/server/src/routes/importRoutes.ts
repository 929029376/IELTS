import { extname } from "node:path";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { DatabaseHandle } from "../db/database";
import { importFrequencyCsv, importFrequencyRows, importFrequencyXlsx } from "../importers/frequencyImporter";
import { importListeningDirectory, importListeningZip } from "../importers/listeningZipImporter";
import { importReadingDirectory, importReadingPdf } from "../importers/readingPdfImporter";
import type { SyncService } from "../sync/syncService";

const localPathSchema = z.string().min(1);

const frequencyRowSchema = z.object({
  subject: z.enum(["listening", "reading"]),
  part: z.enum(["P1", "P2", "P3", "P4"]),
  englishTitle: z.string().min(1),
  chineseTitle: z.string().nullable(),
  frequencyClass: z.enum(["high", "medium", "low", "unknown"]),
  difficulty: z.number().nullable(),
  sourceMonth: z.string().min(1)
});

function withImportedCount<T>(imported: T[]) {
  return {
    importedCount: imported.length,
    imported
  };
}

export function registerImportRoutes(
  server: FastifyInstance,
  db: DatabaseHandle,
  options: { assetRoot: string; sync?: SyncService }
): void {
  server.post("/api/import/listening-zip", async (request, reply) => {
    const input = z.object({ zipPath: localPathSchema }).parse(request.body);
    const result = await importListeningZip(db, {
      zipPath: input.zipPath,
      assetRoot: options.assetRoot
    });
    return reply.send(withImportedCount([result]));
  });

  server.post("/api/import/listening-directory", async (request, reply) => {
    const input = z.object({ rootDir: localPathSchema }).parse(request.body);
    const result = await importListeningDirectory(db, {
      rootDir: input.rootDir,
      assetRoot: options.assetRoot
    });
    return reply.send(withImportedCount(result.imported));
  });

  server.post("/api/import/reading-pdf", async (request, reply) => {
    const input = z.object({ pdfPath: localPathSchema }).parse(request.body);
    const result = await importReadingPdf(db, {
      pdfPath: input.pdfPath,
      assetRoot: options.assetRoot
    });
    return reply.send(withImportedCount([result]));
  });

  server.post("/api/import/reading-directory", async (request, reply) => {
    const input = z.object({ rootDir: localPathSchema }).parse(request.body);
    const result = await importReadingDirectory(db, {
      rootDir: input.rootDir,
      assetRoot: options.assetRoot
    });
    return reply.send(withImportedCount(result.imported));
  });

  server.post("/api/import/frequency-file", async (request, reply) => {
    const input = z.object({ filePath: localPathSchema }).parse(request.body);
    const extension = extname(input.filePath).toLowerCase();
    const result =
      extension === ".xlsx" || extension === ".xls"
        ? await importFrequencyXlsx(db, { xlsxPath: input.filePath })
        : await importFrequencyCsv(db, { csvPath: input.filePath });
    const createdAt = new Date().toISOString();
    for (const entry of result.entries) {
      options.sync?.appendFrequencyEntryEvent(entry, createdAt);
    }
    return reply.send({
      importedCount: result.entries.length,
      entries: result.entries
    });
  });

  server.post("/api/import/frequency-rows", async (request, reply) => {
    const input = z.object({ rows: z.array(frequencyRowSchema).min(1) }).parse(request.body);
    const result = importFrequencyRows(db, input.rows);
    const createdAt = new Date().toISOString();
    for (const entry of result.entries) {
      options.sync?.appendFrequencyEntryEvent(entry, createdAt);
    }
    return reply.send({
      importedCount: result.entries.length,
      entries: result.entries
    });
  });
}
