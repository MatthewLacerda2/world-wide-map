import { z } from "zod";

/**
 * Schema for a single hop item in the request array
 */
export const createHopSchema = z.object({
  origin: z
    .string()
    .min(7, "Origin is required")
    .max(64, "Origin must be 64 characters or less"),
  destination: z
    .string()
    .min(7, "Destination is required")
    .max(64, "Destination must be 64 characters or less"),
  ping_time: z.number().int().positive("Ping time must be a positive integer"),
});

/**
 * Schema for the POST /targets request body (array of hops)
 */
export const createHopsArraySchema = z
  .array(createHopSchema)
  .min(1, "At least one hop is required");

/**
 * Type inference from schema
 */
export type CreateHopInput = z.infer<typeof createHopSchema>;
export type CreateHopsArrayInput = z.infer<typeof createHopsArraySchema>;
