import { readFile } from "node:fs/promises";
import type { AppConfig } from "./types";

export async function loadConfig(path: string): Promise<AppConfig> {
  const raw = await readFile(path, "utf8");
  const config = JSON.parse(raw) as AppConfig;
  assertConfig(config);
  return config;
}

function assertConfig(value: AppConfig) {
  if (!value.issuer || !URL.canParse(value.issuer)) {
    throw new Error("config.issuer must be an absolute public URL");
  }

  if (!value.keyPath) {
    throw new Error("config.keyPath is required");
  }

  for (const client of value.clients) {
    if (!client.id) {
      throw new Error("Every client requires an id");
    }

    if (!client.redirectUris.length) {
      throw new Error(`Client ${client.id} requires at least one redirect URI`);
    }
  }

  for (const site of value.sites) {
    if (!site.id || !site.name || !site.passwords.length || !site.grants.length) {
      throw new Error("Every site requires id, name, at least one password, and at least one grant");
    }
  }
}
