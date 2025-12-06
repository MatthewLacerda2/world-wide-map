import cors from "cors";
import dotenv from "dotenv";
import express, { Express, Request, Response } from "express";
import "reflect-metadata";
import {
  AppDataSource,
  closeDatabase,
  initializeDatabase,
} from "./config/typeorm.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import targetsRoutes from "./routes/targets.js";

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", async (req: Request, res: Response) => {
  try {
    // Test database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.query("SELECT 1");
      res.status(200).json({
        success: true,
        message: "Server is healthy",
        database: "connected",
      });
    } else {
      res.status(503).json({
        success: false,
        message: "Server is unhealthy",
        database: "not initialized",
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "Server is unhealthy",
      database: "disconnected",
    });
  }
});

// API Routes
app.use("/targets", targetsRoutes);

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "World Wide Map API",
    version: "1.0.0",
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database and start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGINT", async () => {
  await closeDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeDatabase();
  process.exit(0);
});

export default app;
