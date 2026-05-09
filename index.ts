import { loadConfig } from "./src/config";
import { createLogger } from "./src/logger";
import { createOidcServer } from "./src/oidc";
import { setupPage } from "./src/pages";
import { htmlResponse, jsonResponse, textResponse } from "./src/responses";
import { loadOrCreateSigningKey } from "./src/signing";

const logger = createLogger();
const port = Number(process.env.PORT ?? "3000");
const configPath = process.env.CONFIG_PATH ?? "./config.json";

async function main() {
  const server = await createServer();

  Bun.serve({
    port,
    fetch: server.fetch,
  });

  logger.info("server_started", {
    port,
    configPath,
    mode: server.mode,
  });
}

async function createServer() {
  try {
    const config = await loadConfig(configPath);
    const signing = await loadOrCreateSigningKey(config.keyPath, logger);
    return {
      mode: "oidc",
      fetch: createOidcServer({ config, signing, logger }).fetch,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("setup_required", { configPath, error: message });
    return {
      mode: "setup",
      fetch: setupFetch(message),
    };
  }
}

function setupFetch(error: string) {
  return async (request: Request) => {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ ok: true, mode: "setup", configPath });
    }

    if (request.method === "GET" && url.pathname === "/") {
      return htmlResponse(setupPage(configPath, error), 503);
    }

    return textResponse(`Setup required. Create a valid config at ${configPath}. Error: ${error}`, 503);
  };
}

main().catch((error) => {
  logger.warn("server_start_failed", { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
