import { loadConfig } from "./src/config";
import { createLogger } from "./src/logger";
import { createOidcServer } from "./src/oidc";
import { loadOrCreateSigningKey } from "./src/signing";

const logger = createLogger();
const port = Number(process.env.PORT ?? "3000");
const configPath = process.env.CONFIG_PATH ?? "./config.json";

async function main() {
  const config = await loadConfig(configPath);
  const signing = await loadOrCreateSigningKey(config.keyPath, logger);
  const server = createOidcServer({ config, signing, logger });

  Bun.serve({
    port,
    fetch: server.fetch,
  });

  logger.info("server_started", {
    issuer: config.issuer,
    port,
    configPath,
  });
}

main().catch((error) => {
  logger.warn("server_start_failed", { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
