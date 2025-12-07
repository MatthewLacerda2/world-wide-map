import dotenv from "dotenv";
import { dirname } from "path";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { fileURLToPath } from "url";
import { Hop } from "../entities/Hop.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const database = process.env.DB_NAME || "world_wide_map";
  const user = process.env.DB_USER || "postgres";
  const password = process.env.DB_PASSWORD || "";

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

export const AppDataSource = new DataSource({
  type: "postgres",
  url: getDatabaseUrl(),
  entities: [Hop],
  migrations: [
    __dirname + "/../src/migrations/*.ts",
    __dirname + "/../dist/migrations/*.js",
  ],
  synchronize: false, // Never use synchronize in production - use migrations!
  logging: process.env.NODE_ENV === "development",
});
