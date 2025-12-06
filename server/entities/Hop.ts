import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("hops")
export class Hop {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 64, nullable: false })
  origin!: string;

  @Column({ type: "varchar", length: 64, nullable: false })
  destination!: string;

  @Column({ name: "ping_time", type: "integer", nullable: false })
  ping_time!: number;

  @CreateDateColumn({ name: "stored_at", type: "timestamp" })
  stored_at: Date = new Date();
}
