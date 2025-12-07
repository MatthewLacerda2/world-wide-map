import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1765072639202 implements MigrationInterface {
    name = 'InitialMigration1765072639202'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "hops" ("id" SERIAL NOT NULL, "origin" character varying(64) NOT NULL, "destination" character varying(64) NOT NULL, "ping_time" integer NOT NULL, "stored_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_64485b30ab294b7484fb396f4e8" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "hops"`);
    }

}
