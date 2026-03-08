import { createHash, randomBytes } from "node:crypto";

export function createApiKey(): string {
  const payload = randomBytes(24).toString("hex");
  return `edk_${payload}`;
}

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}
