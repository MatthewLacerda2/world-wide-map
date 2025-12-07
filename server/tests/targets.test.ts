import cors from "cors";
import express, { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { addTargets, getAllTargets } from "../controllers/targetsController.js";
import { Hop } from "../entities/Hop.js";
import { errorHandler, notFoundHandler } from "../middleware/errorHandler.js";
import { validate } from "../middleware/validation.js";
import { createHopsArraySchema } from "../schemas/hopSchema.js";
import {
  createHop,
  createHops,
  exampleHops,
  getExampleHopsArray,
} from "./helpers.js";
import { getRepository } from "./setup.js";

/**
 * Create a test Express app with the same middleware and routes as the real app
 */
function createTestApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mock the routes
  app.get("/targets", getAllTargets);
  app.post("/targets", validate(createHopsArraySchema), addTargets);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

describe("GET /targets", () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  it("should return empty array when no hops exist", async () => {
    const response = await request(app).get("/targets");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [],
      count: 0,
    });
  });

  it("should return all hops when they exist", async () => {
    const hopRepository = getRepository(Hop);

    // Create test hops using helper
    await createHops(hopRepository, [exampleHops.hop2, exampleHops.hop3]);

    const response = await request(app).get("/targets");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.count).toBe(2);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          origin: exampleHops.hop2.origin,
          destination: exampleHops.hop2.destination,
          ping_time: exampleHops.hop2.ping_time,
        }),
        expect.objectContaining({
          origin: exampleHops.hop3.origin,
          destination: exampleHops.hop3.destination,
          ping_time: exampleHops.hop3.ping_time,
        }),
      ])
    );
  });
});

describe("POST /targets", () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  it("should create multiple hops", async () => {
    const hopsData = getExampleHopsArray();

    const response = await request(app)
      .post("/targets")
      .send(hopsData)
      .expect(201);

    expect(response.body).toEqual({
      success: true,
      message: "Successfully processed 3 hop(s)",
    });

    // Verify all hops were created
    const hopRepository = getRepository(Hop);
    const createdHops = await hopRepository.find();

    expect(createdHops).toHaveLength(3);
  });

  it("should update existing hop with new stored_at and smaller ping_time", async () => {
    const hopRepository = getRepository(Hop);

    // Create an existing hop using helper
    const existingHop = await createHop(
      hopRepository,
      { ...exampleHops.hop1, ping_time: 50 },
      new Date("2024-01-01")
    );
    const originalStoredAt = existingHop.stored_at;

    // Wait a bit to ensure new timestamp is different
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Post a hop with same origin/destination but smaller ping_time
    const response = await request(app)
      .post("/targets")
      .send([exampleHops.hop1Updated])
      .expect(201);

    expect(response.body.success).toBe(true);

    // Verify the hop was updated
    const updatedHop = await hopRepository.findOne({
      where: {
        origin: exampleHops.hop1.origin,
        destination: exampleHops.hop1.destination,
      },
    });

    expect(updatedHop).toBeTruthy();
    expect(updatedHop?.ping_time).toBe(exampleHops.hop1Updated.ping_time); // Should be updated to smaller value
    expect(updatedHop?.stored_at.getTime()).toBeGreaterThan(
      originalStoredAt.getTime()
    ); // Should be updated to current time
  });

  it("should not update ping_time if new one is larger", async () => {
    const hopRepository = getRepository(Hop);

    // Create an existing hop with ping_time 20 using helper
    const existingHop = await createHop(
      hopRepository,
      { ...exampleHops.hop1, ping_time: 20 },
      new Date("2024-01-01")
    );

    // Post a hop with same origin/destination but larger ping_time
    const response = await request(app)
      .post("/targets")
      .send([exampleHops.hop1Larger])
      .expect(201);

    expect(response.body.success).toBe(true);

    // Verify the ping_time was NOT updated (should still be 20)
    const updatedHop = await hopRepository.findOne({
      where: {
        origin: exampleHops.hop1.origin,
        destination: exampleHops.hop1.destination,
      },
    });

    expect(updatedHop).toBeTruthy();
    expect(updatedHop?.ping_time).toBe(20); // Should remain 20, not updated to larger value
    expect(updatedHop?.stored_at.getTime()).toBeGreaterThan(
      existingHop.stored_at.getTime()
    ); // But stored_at should be updated
  });

  it("should return 400 for empty array", async () => {
    const response = await request(app).post("/targets").send([]).expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe("Validation error");
  });
});
