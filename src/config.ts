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

  if (!value.passwords || Object.keys(value.passwords).length === 0) {
    throw new Error("config.passwords must contain at least one password entry");
  }

  for (const [password, grants] of Object.entries(value.passwords)) {
    if (!password || !Array.isArray(grants) || grants.length === 0) {
      throw new Error("Every config.passwords entry requires a non-empty password and at least one grant");
    }

    for (const grant of grants) {
      if (!grant) {
        throw new Error("Password grants must be non-empty strings");
      }
    }
  }
}
