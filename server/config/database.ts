import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

function getDatabaseConfig(): DatabaseConfig {
  // Support both DATABASE_URL and individual environment variables
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || "5432"),
      database: url.pathname.slice(1), // Remove leading '/'
      user: url.username,
      password: url.password,
    };
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "world_wide_map",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
  };
}

const config = getDatabaseConfig();

export const pool = new Pool(config);

// Test the connection
pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await pool.end();
  console.log("Database pool closed");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await pool.end();
  console.log("Database pool closed");
  process.exit(0);
});
