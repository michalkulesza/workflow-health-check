import {
  type MigrateDownArgs,
  type MigrateUpArgs,
  sql,
} from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "scoring_ai_evaluations" ADD COLUMN "provider_usage" jsonb;
    ALTER TABLE "scoring_runs" ADD COLUMN "narrative_usage" jsonb;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "scoring_runs" DROP COLUMN "narrative_usage";
    ALTER TABLE "scoring_ai_evaluations" DROP COLUMN "provider_usage";
  `)
}
