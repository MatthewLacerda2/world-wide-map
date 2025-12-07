import { AppDataSource } from "../config/data-source.js";
import { Hop } from "../entities/Hop.js";
import { CreateHopInput } from "../schemas/hopSchema.js";

export class HopsService {
  private hopRepository = AppDataSource.getRepository(Hop);

  /**
   * Get all hops from the database
   */
  async getAllHops(): Promise<Hop[]> {
    return await this.hopRepository.find({
      order: {
        stored_at: "DESC",
      },
    });
  }

  /**
   * Get a single hop by ID
   */
  async getHopById(id: number): Promise<Hop | null> {
    return await this.hopRepository.findOne({
      where: { id },
    });
  }

  /**
   * Find a hop by origin and destination
   */
  async findHopByOriginAndDestination(
    origin: string,
    destination: string
  ): Promise<Hop | null> {
    return await this.hopRepository.findOne({
      where: { origin, destination },
    });
  }

  /**
   * Create or update a hop
   * - If hop exists with same origin and destination: update stored_at and ping_time (if smaller)
   * - If hop doesn't exist: create new hop with current datetime
   */
  async upsertHop(hopData: CreateHopInput): Promise<Hop> {
    const existingHop = await this.findHopByOriginAndDestination(
      hopData.origin,
      hopData.destination
    );

    if (existingHop) {
      // Update stored_at to current datetime
      existingHop.stored_at = new Date();

      // Update ping_time only if the new one is smaller
      if (hopData.ping_time < existingHop.ping_time) {
        existingHop.ping_time = hopData.ping_time;
      }

      return await this.hopRepository.save(existingHop);
    }

    // Create new hop
    const newHop = new Hop();
    newHop.origin = hopData.origin;
    newHop.destination = hopData.destination;
    newHop.ping_time = hopData.ping_time;
    newHop.stored_at = new Date();

    return await this.hopRepository.save(newHop);
  }

  /**
   * Create or update multiple hops
   */
  async upsertHops(hopsData: CreateHopInput[]): Promise<Hop[]> {
    const results = await Promise.all(
      hopsData.map((hopData) => this.upsertHop(hopData))
    );
    return results;
  }
}
