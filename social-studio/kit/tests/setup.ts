import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { afterAll } from "vitest";

// Base de datos y vídeos en un directorio temporal por archivo de test
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ss-test-"));
process.env.DATA_DIR = dir;
process.env.TOKEN_ENC_KEY = randomBytes(32).toString("base64");
process.env.SIGNUP_MODE = "invite";

afterAll(async () => {
  const { closeDbForTests } = await import("@/lib/db");
  closeDbForTests();
  fs.rmSync(dir, { recursive: true, force: true });
});
