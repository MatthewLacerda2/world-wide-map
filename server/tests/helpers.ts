import { Repository } from "typeorm";
import { Hop } from "../entities/Hop.js";
import { CreateHopInput } from "../schemas/hopSchema.js";

/**
 * Example hop data for testing
 */
export const exampleHops = {
  hop1: {
    origin: "10.40.64.1",
    destination: "142.250.78.163",
    ping_time: 32,
  },
  hop2: {
    origin: "192.168.1.1",
    destination: "8.8.8.8",
    ping_time: 10,
  },
  hop3: {
    origin: "192.168.1.2",
    destination: "8.8.4.4",
    ping_time: 15,
  },
  // For testing updates - same origin/destination as hop1 but different ping_time
  hop1Updated: {
    origin: "10.40.64.1",
    destination: "142.250.78.163",
    ping_time: 25, // Smaller than hop1
  },
  hop1Larger: {
    origin: "10.40.64.1",
    destination: "142.250.78.163",
    ping_time: 50, // Larger than hop1
  },
} as const;

/**
 * Create a hop in the database
 */
export async function createHop(
  repository: Repository<Hop> | any,
  hopData: CreateHopInput,
  storedAt?: Date
): Promise<Hop> {
  const hop = repository.create({
    ...hopData,
    stored_at: storedAt || new Date(),
  });
  return await (repository as Repository<Hop>).save(hop);
}

/**
 * Create multiple hops in the database
 */
export async function createHops(
  repository: Repository<Hop> | any,
  hopsData: CreateHopInput[],
  storedAt?: Date
): Promise<Hop[]> {
  const hops = hopsData.map((hopData) =>
    repository.create({
      ...hopData,
      stored_at: storedAt || new Date(),
    })
  );
  return await (repository as Repository<Hop>).save(hops);
}

/**
 * Get example hops as an array for POST requests
 */
export function getExampleHopsArray(): CreateHopInput[] {
  return [exampleHops.hop1, exampleHops.hop2, exampleHops.hop3];
}
