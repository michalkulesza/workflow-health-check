import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "questionnaire_versions_categories" ADD COLUMN "scored" boolean DEFAULT false;
  ALTER TABLE "questionnaire_versions_categories" ADD COLUMN "max_points" numeric DEFAULT 20;
  ALTER TABLE "questionnaire_versions_categories" ADD COLUMN "attention_threshold" numeric DEFAULT 0.6;
  ALTER TABLE "questionnaire_versions_categories" ADD COLUMN "minimum_coverage" numeric DEFAULT 0.6;
  ALTER TABLE "questionnaire_versions_questions_options" ADD COLUMN "value" numeric;
  ALTER TABLE "questionnaire_versions_questions_options" ADD COLUMN "penalty" numeric;
  ALTER TABLE "questionnaire_versions_questions_options" ADD COLUMN "not_applicable" boolean DEFAULT false;
  ALTER TABLE "questionnaire_versions_questions" ADD COLUMN "scoring" jsonb DEFAULT '{"strategy":"none","weight":0}'::jsonb NOT NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "questionnaire_versions_categories" DROP COLUMN "scored";
  ALTER TABLE "questionnaire_versions_categories" DROP COLUMN "max_points";
  ALTER TABLE "questionnaire_versions_categories" DROP COLUMN "attention_threshold";
  ALTER TABLE "questionnaire_versions_categories" DROP COLUMN "minimum_coverage";
  ALTER TABLE "questionnaire_versions_questions_options" DROP COLUMN "value";
  ALTER TABLE "questionnaire_versions_questions_options" DROP COLUMN "penalty";
  ALTER TABLE "questionnaire_versions_questions_options" DROP COLUMN "not_applicable";
  ALTER TABLE "questionnaire_versions_questions" DROP COLUMN "scoring";`)
}
