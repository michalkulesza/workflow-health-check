import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "anonymous_sessions" (
    "id" serial PRIMARY KEY NOT NULL,
    "token_hash" varchar NOT NULL,
    "csrf_token_hash" varchar NOT NULL,
    "expires_at" timestamp(3) with time zone NOT NULL,
    "last_seen_at" timestamp(3) with time zone NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "answer_mutations" (
    "id" serial PRIMARY KEY NOT NULL,
    "submission_id" integer NOT NULL,
    "mutation_id" varchar NOT NULL,
    "payload_hash" varchar NOT NULL,
    "result_revision" numeric NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "submissions" ADD COLUMN "session_id" integer NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "anonymous_sessions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "answer_mutations_id" integer;
  ALTER TABLE "answer_mutations" ADD CONSTRAINT "answer_mutations_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "anonymous_sessions_token_hash_idx" ON "anonymous_sessions" USING btree ("token_hash");
  CREATE INDEX "anonymous_sessions_updated_at_idx" ON "anonymous_sessions" USING btree ("updated_at");
  CREATE INDEX "anonymous_sessions_created_at_idx" ON "anonymous_sessions" USING btree ("created_at");
  CREATE INDEX "answer_mutations_submission_idx" ON "answer_mutations" USING btree ("submission_id");
  CREATE INDEX "answer_mutations_updated_at_idx" ON "answer_mutations" USING btree ("updated_at");
  CREATE INDEX "answer_mutations_created_at_idx" ON "answer_mutations" USING btree ("created_at");
  CREATE UNIQUE INDEX "submission_mutationId_idx" ON "answer_mutations" USING btree ("submission_id","mutation_id");
  ALTER TABLE "submissions" ADD CONSTRAINT "submissions_session_id_anonymous_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."anonymous_sessions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_anonymous_sessions_fk" FOREIGN KEY ("anonymous_sessions_id") REFERENCES "public"."anonymous_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_answer_mutations_fk" FOREIGN KEY ("answer_mutations_id") REFERENCES "public"."answer_mutations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "submissions_session_idx" ON "submissions" USING btree ("session_id");
  CREATE INDEX "payload_locked_documents_rels_anonymous_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("anonymous_sessions_id");
  CREATE INDEX "payload_locked_documents_rels_answer_mutations_id_idx" ON "payload_locked_documents_rels" USING btree ("answer_mutations_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "anonymous_sessions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "answer_mutations" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "anonymous_sessions" CASCADE;
  DROP TABLE "answer_mutations" CASCADE;
  ALTER TABLE "submissions" DROP CONSTRAINT "submissions_session_id_anonymous_sessions_id_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_anonymous_sessions_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_answer_mutations_fk";

  DROP INDEX "submissions_session_idx";
  DROP INDEX "payload_locked_documents_rels_anonymous_sessions_id_idx";
  DROP INDEX "payload_locked_documents_rels_answer_mutations_id_idx";
  ALTER TABLE "submissions" DROP COLUMN "session_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "anonymous_sessions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "answer_mutations_id";`)
}
