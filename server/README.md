# World Wide Map Server

Express.js server for the crowdsourced internet topology mapping project.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Set up the database and run migrations:

```bash
# Generate migration from entity changes (auto-generates like Alembic!)
npm run migrate:generate src/migrations/InitialMigration

# Run pending migrations
npm run migrate:run

# Or use the shorthand
npm run migrate
```

**TypeORM Migration Commands:**

- `npm run migrate:generate src/migrations/MigrationName` - Auto-generate migration from entity changes (like `alembic revision --autogenerate`)
- `npm run migrate:run` - Run pending migrations
- `npm run migrate:revert` - Revert the last migration
- `npm run migrate:show` - Show migration status

4. Start the development server:

```bash
npm run dev
```

Or build and run in production:

```bash
npm run build
npm start
```

## API Endpoints

### GET /targets

Returns all hops from the database.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "origin": "192.168.0.1",
      "destination": "target.com",
      "created_at": "2024-01-01T00:00:00.000Z",
      "ping_time": 10
    }
  ],
  "count": 1
}
```

### GET /health

Health check endpoint that verifies database connectivity.

## Database Schema

The database schema is defined using TypeORM entities in `entities/Hop.ts`. The `hops` table structure:

- `id` (SERIAL PRIMARY KEY)
- `origin` (VARCHAR(255) NOT NULL)
- `destination` (VARCHAR(255) NOT NULL)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `ping_time` (NUMBER NOT NULL)

**To modify the schema:**

1. Edit `entities/Hop.ts` (add/remove/modify columns)
2. Run `npm run migrate:generate src/migrations/YourMigrationName`
3. TypeORM will compare your entity with the database and auto-generate the migration file
4. Review the generated migration in `src/migrations/`
5. Run `npm run migrate:run` to apply the migration

## Project Structure

```
server/
├── app.ts                 # Main application entry point
├── entities/
│   └── Hop.ts            # TypeORM entity definition
├── src/
│   └── migrations/       # Auto-generated migration files
├── config/
│   ├── data-source.ts    # TypeORM data source configuration
│   ├── typeorm.ts        # Database initialization
│   ├── database.ts       # Legacy PostgreSQL pool (can be removed)
│   └── migrate.ts        # Legacy migration script (can be removed)
├── controllers/
│   └── targetsController.ts  # Route handlers
├── routes/
│   └── targets.ts        # Route definitions
├── services/
│   └── hopsService.ts    # Business logic and database operations
├── middleware/
│   └── errorHandler.ts   # Error handling middleware
└── types/
    └── index.ts          # TypeScript type definitions
```
