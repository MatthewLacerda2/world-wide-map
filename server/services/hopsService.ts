import { AppDataSource } from "../config/data-source.js";
import { Hop } from "../entities/Hop.js";

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
}
