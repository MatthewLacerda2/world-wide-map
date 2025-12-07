import { NextFunction, Request, Response } from "express";
import { CreateHopsArrayInput } from "../schemas/hopSchema.js";
import { HopsService } from "../services/hopsService.js";

const hopsService = new HopsService();

/**
 * Get all targets
 * GET /targets
 */
export const getAllTargets = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hops = await hopsService.getAllHops();
    res.status(200).json({
      success: true,
      data: hops,
      count: hops.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add new targets (array of hops)
 * POST /targets
 *
 * Request body format:
 * [
 *   { "origin": "string", "destination": "string", "pingTime": number },
 *   ...
 * ]
 *
 * Logic:
 * - For each hop, find if one exists with same origin and destination
 * - If exists: update stored_at to current datetime, update ping_time if new one is smaller
 * - If not exists: create new hop with current datetime
 */
export const addTargets = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hopsData: CreateHopsArrayInput = req.body;
    const hops = await hopsService.upsertHops(hopsData);

    res.status(201).json({
      success: true,
      message: `Successfully processed ${hops.length} hop(s)`,
    });
  } catch (error) {
    next(error);
  }
};
