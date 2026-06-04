import { createReadStream, existsSync, statSync } from "node:fs";
import { extname } from "node:path";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const assetQuerySchema = z.object({
  path: z.string().min(1)
});

const contentTypes: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".wav": "audio/wav",
  ".webp": "image/webp"
};

export function registerAssetRoutes(server: FastifyInstance): void {
  server.get("/api/assets/local", async (request, reply) => {
    const input = assetQuerySchema.parse(request.query);
    if (!existsSync(input.path)) {
      return reply.code(404).send({ message: "Local asset not found." });
    }

    const stats = statSync(input.path);
    if (!stats.isFile()) {
      return reply.code(404).send({ message: "Local asset not found." });
    }

    const extension = extname(input.path).toLowerCase();
    const contentType = contentTypes[extension];
    if (!contentType) {
      return reply.code(415).send({ message: "Unsupported local asset type." });
    }

    reply.header("Content-Length", String(stats.size));
    reply.type(contentType);
    return reply.send(createReadStream(input.path));
  });
}
