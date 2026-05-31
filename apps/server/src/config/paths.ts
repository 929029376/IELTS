import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const serverSrcDir = resolve(dirname(currentFile), "..");
const workspaceRoot = resolve(serverSrcDir, "../../..");

export const dataDir = resolve(workspaceRoot, "data");
export const defaultDatabasePath = resolve(dataDir, "ielts.db");
