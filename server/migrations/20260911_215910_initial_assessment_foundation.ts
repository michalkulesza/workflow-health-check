import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_questionnaire_versions_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_submissions_state" AS ENUM('in_progress', 'submitted', 'processing', 'awaiting_clarification', 'ready', 'partial', 'failed');
  CREATE TYPE "public"."enum_answers_state" AS ENUM('answered', 'skipped');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'fixture');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'fixture');
  CREATE TABLE "admins_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "admins" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "questionnaires" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"public_id" varchar NOT NULL,
  	"current_published_version_id" integer,
  	"draft_version_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "questionnaire_versions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"questionnaire_id" integer NOT NULL,
  	"version_number" numeric NOT NULL,
  	"status" "enum_questionnaire_versions_status" DEFAULT 'draft' NOT NULL,
  	"definition" jsonb NOT NULL,
  	"content_hash" varchar NOT NULL,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"external_id" varchar NOT NULL,
  	"questionnaire_version_id" integer NOT NULL,
  	"state" "enum_submissions_state" DEFAULT 'in_progress' NOT NULL,
  	"revision" numeric DEFAULT 0 NOT NULL,
  	"current_step" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "answers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"submission_id" integer NOT NULL,
  	"question_key" varchar NOT NULL,
  	"state" "enum_answers_state" NOT NULL,
  	"selected_option_keys" jsonb NOT NULL,
  	"text" varchar,
  	"option_text" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"questionnaires_id" integer,
  	"questionnaire_versions_id" integer,
  	"submissions_id" integer,
  	"answers_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "admins_sessions" ADD CONSTRAINT "admins_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_current_published_version_id_questionnaire_versions_id_fk" FOREIGN KEY ("current_published_version_id") REFERENCES "public"."questionnaire_versions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_draft_version_id_questionnaire_versions_id_fk" FOREIGN KEY ("draft_version_id") REFERENCES "public"."questionnaire_versions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "questionnaire_versions" ADD CONSTRAINT "questionnaire_versions_questionnaire_id_questionnaires_id_fk" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "submissions" ADD CONSTRAINT "submissions_questionnaire_version_id_questionnaire_versions_id_fk" FOREIGN KEY ("questionnaire_version_id") REFERENCES "public"."questionnaire_versions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "answers" ADD CONSTRAINT "answers_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_questionnaires_fk" FOREIGN KEY ("questionnaires_id") REFERENCES "public"."questionnaires"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_questionnaire_versions_fk" FOREIGN KEY ("questionnaire_versions_id") REFERENCES "public"."questionnaire_versions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_submissions_fk" FOREIGN KEY ("submissions_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_answers_fk" FOREIGN KEY ("answers_id") REFERENCES "public"."answers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "admins_sessions_order_idx" ON "admins_sessions" USING btree ("_order");
  CREATE INDEX "admins_sessions_parent_id_idx" ON "admins_sessions" USING btree ("_parent_id");
  CREATE INDEX "admins_updated_at_idx" ON "admins" USING btree ("updated_at");
  CREATE INDEX "admins_created_at_idx" ON "admins" USING btree ("created_at");
  CREATE UNIQUE INDEX "admins_email_idx" ON "admins" USING btree ("email");
  CREATE UNIQUE INDEX "questionnaires_public_id_idx" ON "questionnaires" USING btree ("public_id");
  CREATE INDEX "questionnaires_current_published_version_idx" ON "questionnaires" USING btree ("current_published_version_id");
  CREATE INDEX "questionnaires_draft_version_idx" ON "questionnaires" USING btree ("draft_version_id");
  CREATE INDEX "questionnaires_updated_at_idx" ON "questionnaires" USING btree ("updated_at");
  CREATE INDEX "questionnaires_created_at_idx" ON "questionnaires" USING btree ("created_at");
  CREATE INDEX "questionnaire_versions_questionnaire_idx" ON "questionnaire_versions" USING btree ("questionnaire_id");
  CREATE INDEX "questionnaire_versions_updated_at_idx" ON "questionnaire_versions" USING btree ("updated_at");
  CREATE INDEX "questionnaire_versions_created_at_idx" ON "questionnaire_versions" USING btree ("created_at");
  CREATE UNIQUE INDEX "questionnaire_versionNumber_idx" ON "questionnaire_versions" USING btree ("questionnaire_id","version_number");
  CREATE UNIQUE INDEX "submissions_external_id_idx" ON "submissions" USING btree ("external_id");
  CREATE INDEX "submissions_questionnaire_version_idx" ON "submissions" USING btree ("questionnaire_version_id");
  CREATE INDEX "submissions_updated_at_idx" ON "submissions" USING btree ("updated_at");
  CREATE INDEX "submissions_created_at_idx" ON "submissions" USING btree ("created_at");
  CREATE INDEX "answers_submission_idx" ON "answers" USING btree ("submission_id");
  CREATE INDEX "answers_updated_at_idx" ON "answers" USING btree ("updated_at");
  CREATE INDEX "answers_created_at_idx" ON "answers" USING btree ("created_at");
  CREATE UNIQUE INDEX "submission_questionKey_idx" ON "answers" USING btree ("submission_id","question_key");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_admins_id_idx" ON "payload_locked_documents_rels" USING btree ("admins_id");
  CREATE INDEX "payload_locked_documents_rels_questionnaires_id_idx" ON "payload_locked_documents_rels" USING btree ("questionnaires_id");
  CREATE INDEX "payload_locked_documents_rels_questionnaire_versions_id_idx" ON "payload_locked_documents_rels" USING btree ("questionnaire_versions_id");
  CREATE INDEX "payload_locked_documents_rels_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("submissions_id");
  CREATE INDEX "payload_locked_documents_rels_answers_id_idx" ON "payload_locked_documents_rels" USING btree ("answers_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_admins_id_idx" ON "payload_preferences_rels" USING btree ("admins_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "admins_sessions" CASCADE;
  DROP TABLE "admins" CASCADE;
  DROP TABLE "questionnaires" CASCADE;
  DROP TABLE "questionnaire_versions" CASCADE;
  DROP TABLE "submissions" CASCADE;
  DROP TABLE "answers" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_questionnaire_versions_status";
  DROP TYPE "public"."enum_submissions_state";
  DROP TYPE "public"."enum_answers_state";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
