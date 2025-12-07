# Environment Variables Setup

Create a `.env` file in the `server/` directory with the following variables:

```env
# Database Configuration
# Option 1: Use DATABASE_URL (recommended)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/world_wide_map

# Option 2: Use individual variables (alternative)
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=world_wide_map
# DB_USER=postgres
# DB_PASSWORD=postgres

# Server Configuration
PORT=3000
NODE_ENV=development
```

## Quick Start

1. Copy this content to `server/.env`
2. Make sure your Docker PostgreSQL container is running: `docker-compose up -d`
3. Adjust the database credentials if you changed the Docker defaults
