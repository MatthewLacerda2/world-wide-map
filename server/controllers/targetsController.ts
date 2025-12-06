import { NextFunction, Request, Response } from "express";
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
