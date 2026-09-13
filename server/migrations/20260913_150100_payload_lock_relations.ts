import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "scoring_runs_id" integer;
   ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "scoring_results_id" integer;
   ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "assessment_outbox_id" integer;
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_scoring_runs_fk" FOREIGN KEY ("scoring_runs_id") REFERENCES "public"."scoring_runs"("id") ON DELETE cascade;
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_scoring_results_fk" FOREIGN KEY ("scoring_results_id") REFERENCES "public"."scoring_results"("id") ON DELETE cascade;
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_assessment_outbox_fk" FOREIGN KEY ("assessment_outbox_id") REFERENCES "public"."assessment_outbox"("id") ON DELETE cascade;
   CREATE INDEX "payload_locked_documents_rels_scoring_runs_id_idx" ON "payload_locked_documents_rels" USING btree ("scoring_runs_id");
   CREATE INDEX "payload_locked_documents_rels_scoring_results_id_idx" ON "payload_locked_documents_rels" USING btree ("scoring_results_id");
   CREATE INDEX "payload_locked_documents_rels_assessment_outbox_id_idx" ON "payload_locked_documents_rels" USING btree ("assessment_outbox_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_scoring_runs_fk";
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_scoring_results_fk";
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_assessment_outbox_fk";
   DROP INDEX "payload_locked_documents_rels_scoring_runs_id_idx";
   DROP INDEX "payload_locked_documents_rels_scoring_results_id_idx";
   DROP INDEX "payload_locked_documents_rels_assessment_outbox_id_idx";
   ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "scoring_runs_id";
   ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "scoring_results_id";
   ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "assessment_outbox_id";`)
}
