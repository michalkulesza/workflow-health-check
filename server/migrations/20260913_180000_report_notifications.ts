import {
  type MigrateDownArgs,
  type MigrateUpArgs,
  sql,
} from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "enum_payload_jobs_log_task_slug" ADD VALUE IF NOT EXISTS 'report-email';
    ALTER TYPE "enum_payload_jobs_task_slug" ADD VALUE IF NOT EXISTS 'report-email';
    CREATE TABLE "notification_requests" (
      "id" serial PRIMARY KEY NOT NULL,
      "submission_id" integer NOT NULL REFERENCES "submissions"("id") ON DELETE cascade,
      "purpose" varchar NOT NULL,
      "email" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "notification_requests_submission_purpose_unique" UNIQUE ("submission_id", "purpose")
    );
    CREATE TABLE "email_deliveries" (
      "id" serial PRIMARY KEY NOT NULL,
      "notification_request_id" integer NOT NULL REFERENCES "notification_requests"("id") ON DELETE cascade,
      "submission_id" integer NOT NULL REFERENCES "submissions"("id") ON DELETE cascade,
      "scoring_run_id" integer NOT NULL REFERENCES "scoring_runs"("id") ON DELETE cascade,
      "purpose" varchar NOT NULL,
      "email" varchar NOT NULL,
      "state" varchar NOT NULL,
      "idempotency_key" varchar NOT NULL,
      "provider_message_id" varchar,
      "failure_reason" varchar,
      "expires_at" timestamp(3) with time zone,
      "last_attempt_at" timestamp(3) with time zone,
      "sent_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "email_deliveries_notification_run_purpose_unique" UNIQUE ("notification_request_id", "scoring_run_id", "purpose"),
      CONSTRAINT "email_deliveries_idempotency_key_unique" UNIQUE ("idempotency_key")
    );
    CREATE TABLE "report_grants" (
      "id" serial PRIMARY KEY NOT NULL,
      "email_delivery_id" integer NOT NULL REFERENCES "email_deliveries"("id") ON DELETE cascade,
      "token_hash" varchar NOT NULL,
      "session_token_hash" varchar NOT NULL,
      "expires_at" timestamp(3) with time zone NOT NULL,
      "session_expires_at" timestamp(3) with time zone NOT NULL,
      "exchanged_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "report_grants_email_delivery_unique" UNIQUE ("email_delivery_id"),
      CONSTRAINT "report_grants_token_hash_unique" UNIQUE ("token_hash"),
      CONSTRAINT "report_grants_session_token_hash_unique" UNIQUE ("session_token_hash")
    );
    CREATE INDEX "notification_requests_submission_idx" ON "notification_requests" USING btree ("submission_id");
    CREATE INDEX "email_deliveries_state_idx" ON "email_deliveries" USING btree ("state");
    CREATE INDEX "report_grants_session_expiry_idx" ON "report_grants" USING btree ("session_token_hash", "session_expires_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "report_grants" CASCADE;
    DROP TABLE "email_deliveries" CASCADE;
    DROP TABLE "notification_requests" CASCADE;
  `)
}
