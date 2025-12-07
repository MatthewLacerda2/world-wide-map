import dotenv from "dotenv";
import { dirname, resolve } from "path";
import pg from "pg";
import { QueryRunner } from "typeorm";
import { fileURLToPath } from "url";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set NODE_ENV to test BEFORE loading environment and importing AppDataSource
// This ensures AppDataSource uses the correct test database URL
process.env.NODE_ENV = "test";

// Load .env.test file if it exists (before anything else)
dotenv.config({ path: resolve(__dirname, "../.env.test") });
// Also load .env as fallback (but .env.test takes precedence)
dotenv.config();

// Import AppDataSource AFTER setting NODE_ENV so it uses the test database URL
import { AppDataSource } from "../config/data-source.js";

let queryRunner: QueryRunner;

/**
 * Ensure the test database exists, creating it if necessary.
 * This is a PostgreSQL-level operation - it creates the empty database.
 * Migrations (run later) will create the tables within this database.
 */
async function ensureTestDatabaseExists(): Promise<void> {
  // Parse the database URL to get connection details
  const databaseUrl =
    process.env.TEST_DATABASE_URL ||
    (() => {
      const host = process.env.DB_HOST || "localhost";
      const port = process.env.DB_PORT || "5433";
      const database = process.env.TEST_DB_NAME || "world_wide_map_test";
      const user = process.env.DB_USER || "postgres";
      const password = process.env.DB_PASSWORD || "postgres";
      return `postgresql://${user}:${password}@${host}:${port}/${database}`;
    })();

  const url = new URL(databaseUrl);
  const databaseName = url.pathname.slice(1); // Remove leading '/'

  // Connect to the default 'postgres' database to check/create the test database
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres"; // Connect to default postgres database

  const adminClient = new pg.Client(adminUrl.toString());

  try {
    await adminClient.connect();

    // Check if database exists
    const result = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName]
    );

    if (result.rows.length === 0) {
      // Database doesn't exist, create it
      // Note: Database names in CREATE DATABASE cannot be parameterized, so we escape it manually
      const escapedDbName = `"${databaseName.replace(/"/g, '""')}"`;
      await adminClient.query(`CREATE DATABASE ${escapedDbName}`);
      console.log(`✅ Created test database: ${databaseName}`);
    } else {
      console.log(`✅ Test database already exists: ${databaseName}`);
    }
  } catch (error) {
    console.error("❌ Error ensuring test database exists:", error);
    throw error;
  } finally {
    await adminClient.end();
  }
}

/**
 * Setup test database connection before all tests
 */
beforeAll(async () => {
  // Step 1: Create the database if it doesn't exist (PostgreSQL-level)
  await ensureTestDatabaseExists();

  // Step 2: Initialize AppDataSource (connects to the test database)
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  // Step 3: Run migrations to create tables (uses the same migrations as production)
  await AppDataSource.runMigrations();

  // Step 4: Clear all data from tables before starting tests
  // This ensures a clean slate for test isolation
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.query("TRUNCATE TABLE hops RESTART IDENTITY CASCADE");
  await queryRunner.release();
});

/**
 * Cleanup database connection after all tests
 */
afterAll(async () => {
  if (queryRunner) {
    await queryRunner.release();
  }
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});

/**
 * Start a transaction before each test for isolation
 */
beforeEach(async () => {
  queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  // Mock AppDataSource.getRepository to use our transaction's manager
  // This ensures all operations in a test are isolated within the transaction
  vi.spyOn(AppDataSource, "getRepository").mockImplementation((entity) => {
    return queryRunner.manager.getRepository(entity);
  });
});

/**
 * Rollback transaction after each test to ensure test isolation
 */
afterEach(async () => {
  // Rollback transaction BEFORE restoring mocks so the rollback uses the mocked repository
  if (queryRunner && queryRunner.isTransactionActive) {
    await queryRunner.rollbackTransaction();
  }
  if (queryRunner) {
    await queryRunner.release();
  }

  // Restore mocks after transaction cleanup
  vi.restoreAllMocks();
});

/**
 * Get a repository that uses the current transaction
 * This ensures all operations in a test are isolated
 */
export function getRepository<T>(entity: new () => T) {
  return queryRunner.manager.getRepository(entity);
}

/**
 * Get the test data source
 */
export function getTestDataSource() {
  return AppDataSource;
}
