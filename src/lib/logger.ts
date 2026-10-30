import pino from "pino";

const level = process.env.LOG_LEVEL ?? "info";
const pretty = process.env.NODE_ENV === "development";

/**
 * Structured JSON logger. In development it is piped through pino-pretty.
 * Never log secrets, passwords, tokens or full request bodies.
 */
export const logger = pino({
  level,
  base: { service: "resource-planner" },
  redact: {
    paths: ["password", "*.password", "token", "*.token", "authorization", "cookie"],
    censor: "[redacted]",
  },
  ...(pretty ? { transport: { target: "pino-pretty", options: { colorize: true } } } : {}),
});

export type Logger = typeof logger;
