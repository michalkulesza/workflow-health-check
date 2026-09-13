import {
  type MigrateDownArgs,
  type MigrateUpArgs,
  sql,
} from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "enum_payload_jobs_log_task_slug" ADD VALUE IF NOT EXISTS 'ai-evaluation';
    ALTER TYPE "enum_payload_jobs_task_slug" ADD VALUE IF NOT EXISTS 'ai-evaluation';
    ALTER TABLE "questionnaire_versions" ADD COLUMN "ai_evaluations" jsonb DEFAULT '[]'::jsonb NOT NULL;
    CREATE TABLE "scoring_ai_evaluations" (
      "id" serial PRIMARY KEY NOT NULL,
      "scoring_run_id" integer NOT NULL REFERENCES "scoring_runs"("id") ON DELETE cascade,
      "evaluation_key" varchar NOT NULL,
      "state" varchar NOT NULL,
      "output" jsonb,
      "clarification_prompt" varchar,
      "clarification_response" varchar,
      "attempts" numeric DEFAULT 0 NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "scoring_ai_evaluation_unique" UNIQUE ("scoring_run_id", "evaluation_key")
    );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "scoring_ai_evaluations" CASCADE;
    ALTER TABLE "questionnaire_versions" DROP COLUMN "ai_evaluations";
  `)
}
