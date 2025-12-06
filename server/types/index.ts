export interface Hop {
  id?: number;
  origin: string;
  destination: string;
  ping_time: number;
  stored_at?: Date;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}
