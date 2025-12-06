import "reflect-metadata";
import { AppDataSource } from "./data-source.js";

export { AppDataSource };

export async function initializeDatabase() {
  try {
    await AppDataSource.initialize();
    console.log("✅ Database connection established via TypeORM");
    return AppDataSource;
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    throw error;
  }
}

export async function closeDatabase() {
  try {
    await AppDataSource.destroy();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error closing database:", error);
  }
}
