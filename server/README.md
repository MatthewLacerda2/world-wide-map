# World Wide Map Server

Express.js server for the crowdsourced internet topology mapping project.

## Setup

### 1. Start PostgreSQL Database (Docker)

```bash
# From the project root directory
docker-compose up -d
```

This will start a PostgreSQL 16 container on port 5432 with:

- **User**: `postgres`
- **Password**: `postgres`
- **Database**: `world_wide_map`

### 2. Create `.env` file

Create a `.env` file in the `server/` directory:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/world_wide_map

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 3. Install Dependencies

```bash
cd server
npm install
```

### 4. Run Database Migrations

```bash
# Generate initial migration from your entity
npm run migrate:generate src/migrations/InitialMigration

# Apply migrations
npm run migrate:run
```

### 5. Start Development Server

```bash
npm run dev
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
