import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "enum_payload_jobs_log_task_slug" ADD VALUE IF NOT EXISTS 'deterministic-score';
   ALTER TYPE "enum_payload_jobs_task_slug" ADD VALUE IF NOT EXISTS 'deterministic-score';
   CREATE TABLE "scoring_runs" ("id" serial PRIMARY KEY NOT NULL, "submission_id" integer NOT NULL, "questionnaire_version_id" integer NOT NULL, "run_number" numeric NOT NULL, "state" varchar NOT NULL, "answer_snapshot" jsonb NOT NULL, "answer_snapshot_hash" varchar NOT NULL, "definition_snapshot" jsonb NOT NULL, "engine_version" varchar NOT NULL, "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL, "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL);
   CREATE TABLE "scoring_results" ("id" serial PRIMARY KEY NOT NULL, "scoring_run_id" integer NOT NULL, "category_key" varchar NOT NULL, "normalized" numeric, "points" numeric, "coverage" numeric, "eligible" boolean NOT NULL, "components" jsonb NOT NULL, "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL, "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL);
   CREATE TABLE "assessment_outbox" ("id" serial PRIMARY KEY NOT NULL, "work_key" varchar NOT NULL, "type" varchar NOT NULL, "payload" jsonb NOT NULL, "state" varchar NOT NULL, "attempts" numeric DEFAULT 0 NOT NULL, "lease_token" varchar, "lease_expires_at" timestamp(3) with time zone, "payload_job_id" integer, "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL, "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL);
   ALTER TABLE "submissions" ADD COLUMN "submitted_snapshot" jsonb;
   ALTER TABLE "submissions" ADD COLUMN "submitted_snapshot_hash" varchar;
   ALTER TABLE "submissions" ADD COLUMN "submit_mutation_id" varchar;
   ALTER TABLE "submissions" ADD COLUMN "submit_payload_hash" varchar;
   ALTER TABLE "scoring_runs" ADD CONSTRAINT "scoring_runs_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade;
   ALTER TABLE "scoring_runs" ADD CONSTRAINT "scoring_runs_questionnaire_version_id_questionnaire_versions_id_fk" FOREIGN KEY ("questionnaire_version_id") REFERENCES "public"."questionnaire_versions"("id") ON DELETE restrict;
   ALTER TABLE "scoring_results" ADD CONSTRAINT "scoring_results_scoring_run_id_scoring_runs_id_fk" FOREIGN KEY ("scoring_run_id") REFERENCES "public"."scoring_runs"("id") ON DELETE cascade;
   CREATE UNIQUE INDEX "scoring_run_number_idx" ON "scoring_runs" USING btree ("submission_id", "run_number");
   CREATE INDEX "scoring_runs_submission_idx" ON "scoring_runs" USING btree ("submission_id");
   CREATE UNIQUE INDEX "scoring_result_category_idx" ON "scoring_results" USING btree ("scoring_run_id", "category_key");
   CREATE INDEX "scoring_results_run_idx" ON "scoring_results" USING btree ("scoring_run_id");
   CREATE UNIQUE INDEX "assessment_outbox_work_key_idx" ON "assessment_outbox" USING btree ("work_key");
   CREATE INDEX "assessment_outbox_dispatch_idx" ON "assessment_outbox" USING btree ("state", "lease_expires_at");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "scoring_results" CASCADE;
   DROP TABLE "scoring_runs" CASCADE;
   DROP TABLE "assessment_outbox" CASCADE;
   ALTER TABLE "submissions" DROP COLUMN "submitted_snapshot";
   ALTER TABLE "submissions" DROP COLUMN "submitted_snapshot_hash";
   ALTER TABLE "submissions" DROP COLUMN "submit_mutation_id";
   ALTER TABLE "submissions" DROP COLUMN "submit_payload_hash";`)
}
