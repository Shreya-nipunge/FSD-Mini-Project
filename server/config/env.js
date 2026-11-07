import dotenv from "dotenv";

dotenv.config({ path: process.env.ENV_FILE || "../.env" });

const parsePort = (value, fallback) => {
  const port = Number.parseInt(value, 10);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parsePort(process.env.PORT, 5000),
  host: process.env.HOST || "127.0.0.1",
  clientOrigins: (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
