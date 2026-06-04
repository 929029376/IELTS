import { buildServer } from "./server";
import { createRuntimeServerOptions } from "./config/runtimeServerOptions";

const port = Number(process.env.PORT ?? 5174);
const host = process.env.HOST ?? "127.0.0.1";

const server = buildServer(createRuntimeServerOptions());

try {
  await server.listen({ host, port });
  console.log(`IELTS local API listening on http://${host}:${port}`);
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
