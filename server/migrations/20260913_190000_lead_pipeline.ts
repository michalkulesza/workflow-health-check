import {
  type MigrateDownArgs,
  type MigrateUpArgs,
  sql,
} from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "leads" (
      "id" serial PRIMARY KEY NOT NULL,
      "submission_id" integer NOT NULL REFERENCES "submissions"("id") ON DELETE restrict,
      "scoring_run_id" integer REFERENCES "scoring_runs"("id") ON DELETE set null,
      "email" varchar NOT NULL, "name" varchar, "message" text,
      "stage" varchar NOT NULL DEFAULT 'new', "notes" text NOT NULL DEFAULT '',
      "stage_history" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "capture_mutation_id" varchar NOT NULL, "capture_payload_hash" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "leads_submission_unique" UNIQUE ("submission_id"),
      CONSTRAINT "leads_stage_check" CHECK ("stage" IN ('new', 'contacted', 'in_progress', 'closed'))
    );
    CREATE INDEX "leads_stage_updated_at_idx" ON "leads" USING btree ("stage", "updated_at");
    CREATE INDEX "leads_scoring_run_idx" ON "leads" USING btree ("scoring_run_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE "leads" CASCADE;`)
}
