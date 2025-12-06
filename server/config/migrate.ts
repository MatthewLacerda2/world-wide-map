import { pool } from "./database.js";

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create hops table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS hops (
        id SERIAL PRIMARY KEY,
        origin VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        ping_time INTEGER NOT NULL,
        stored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      );
    `);

    await client.query("COMMIT");
    console.log("Migration completed successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

migrate()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
