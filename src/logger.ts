type LogFields = Record<string, unknown>;

export type Logger = {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
};

export function createLogger(): Logger {
  return {
    info(event, fields = {}) {
      console.info(formatLog("info", event, fields));
    },
    warn(event, fields = {}) {
      console.warn(formatLog("warn", event, fields));
    },
  };
}

function formatLog(level: string, event: string, fields: LogFields) {
  return JSON.stringify({
    level,
    event,
    time: new Date().toISOString(),
    ...fields,
  });
}
