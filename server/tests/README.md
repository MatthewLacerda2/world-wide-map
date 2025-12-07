# Testing Setup

## Test Database

The tests use a separate test database to avoid interfering with your development database. By default, the test database is named `world_wide_map_test`.

### Setting up the test database

You have two options:

#### Option 1: Using Docker Compose (Recommended)

The easiest way is to use the test database service in docker-compose:

```bash
# Start the test database (runs on port 5433)
docker-compose --profile test up -d postgres-test
```

This will create a separate PostgreSQL container specifically for testing on port 5433.

**Note:** If using the docker-compose test database, set the port in your environment:

```bash
# Windows PowerShell
$env:DB_PORT="5433"
npm test

# Linux/Mac
DB_PORT=5433 npm test
```

#### Option 2: Using the same PostgreSQL instance

You can also create the test database in your existing PostgreSQL instance:

```sql
CREATE DATABASE world_wide_map_test;
```

Or using psql:

```bash
psql -U postgres -c "CREATE DATABASE world_wide_map_test;"
```

### Configure test database (optional)

You can customize the test database connection by setting environment variables:

- `TEST_DATABASE_URL`: Full connection string (e.g., `postgresql://user:pass@host:port/db`)
- `TEST_DB_NAME`: Database name (default: `world_wide_map_test`)
- `DB_HOST`: Database host (default: `localhost`)
- `DB_PORT`: Database port (default: `5432`, or `5433` if using docker-compose test service)
- `DB_USER`: Database user (default: `postgres`)
- `DB_PASSWORD`: Database password (default: `postgres`)

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Test Isolation

Tests are isolated using database transactions:

- Each test runs inside a transaction
- After each test, the transaction is rolled back
- This ensures tests don't interfere with each other
- No manual cleanup needed!

## Test Structure

- `setup.ts`: Test configuration and database setup
- `targets.test.ts`: Tests for GET and POST `/targets` endpoints

## Writing New Tests

When writing new tests, the database is automatically cleaned between tests. Just write your test logic - no cleanup needed!

Example:

```typescript
it("should do something", async () => {
  // Create test data
  const hop = await getRepository(Hop).save({...});

  // Test your code
  const response = await request(app).get("/targets");

  // Assertions
  expect(response.status).toBe(200);
  // Test data is automatically cleaned up after this test
});
```
