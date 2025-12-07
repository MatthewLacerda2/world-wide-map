import { QueryRunner } from "typeorm";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { AppDataSource } from "../config/data-source.js";

let queryRunner: QueryRunner;

/**
 * Setup test database connection before all tests
 */
beforeAll(async () => {
  // Ensure NODE_ENV is set to test
  process.env.NODE_ENV = "test";

  // Initialize AppDataSource (which will use test database in test mode)
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  // Run migrations to ensure schema is up to date
  await AppDataSource.runMigrations();
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
  // Restore mocks
  vi.restoreAllMocks();

  if (queryRunner && queryRunner.isTransactionActive) {
    await queryRunner.rollbackTransaction();
  }
  if (queryRunner) {
    await queryRunner.release();
  }
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
