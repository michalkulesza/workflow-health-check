import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_questionnaire_versions_questions_type" AS ENUM('single', 'multi', 'text');
  CREATE TABLE "questionnaire_versions_categories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"order" numeric NOT NULL
  );
  
  CREATE TABLE "questionnaire_versions_questions_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"exclusive" boolean DEFAULT false,
  	"requires_text" boolean DEFAULT false
  );
  
  CREATE TABLE "questionnaire_versions_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"number" numeric NOT NULL,
  	"category_key" varchar NOT NULL,
  	"prompt" varchar NOT NULL,
  	"type" "enum_questionnaire_versions_questions_type" NOT NULL,
  	"required" boolean DEFAULT false NOT NULL,
  	"instructions" varchar,
  	"max_selections" numeric
  );
  
  CREATE TABLE "landing_page_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "landing_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"page_title" varchar NOT NULL,
  	"meta_description" varchar NOT NULL,
  	"headline" varchar NOT NULL,
  	"supporting" varchar NOT NULL,
  	"audience_title" varchar NOT NULL,
  	"audience" varchar NOT NULL,
  	"button_label" varchar NOT NULL,
  	"questionnaire_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "questionnaire_versions" ALTER COLUMN "version_number" DROP NOT NULL;
  ALTER TABLE "questionnaire_versions_categories" ADD CONSTRAINT "questionnaire_versions_categories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."questionnaire_versions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "questionnaire_versions_questions_options" ADD CONSTRAINT "questionnaire_versions_questions_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."questionnaire_versions_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "questionnaire_versions_questions" ADD CONSTRAINT "questionnaire_versions_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."questionnaire_versions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_steps" ADD CONSTRAINT "landing_page_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page" ADD CONSTRAINT "landing_page_questionnaire_id_questionnaires_id_fk" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "questionnaire_versions_categories_order_idx" ON "questionnaire_versions_categories" USING btree ("_order");
  CREATE INDEX "questionnaire_versions_categories_parent_id_idx" ON "questionnaire_versions_categories" USING btree ("_parent_id");
  CREATE INDEX "questionnaire_versions_questions_options_order_idx" ON "questionnaire_versions_questions_options" USING btree ("_order");
  CREATE INDEX "questionnaire_versions_questions_options_parent_id_idx" ON "questionnaire_versions_questions_options" USING btree ("_parent_id");
  CREATE INDEX "questionnaire_versions_questions_order_idx" ON "questionnaire_versions_questions" USING btree ("_order");
  CREATE INDEX "questionnaire_versions_questions_parent_id_idx" ON "questionnaire_versions_questions" USING btree ("_parent_id");
  CREATE INDEX "landing_page_steps_order_idx" ON "landing_page_steps" USING btree ("_order");
  CREATE INDEX "landing_page_steps_parent_id_idx" ON "landing_page_steps" USING btree ("_parent_id");
  CREATE INDEX "landing_page_questionnaire_idx" ON "landing_page" USING btree ("questionnaire_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "questionnaire_versions_categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "questionnaire_versions_questions_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "questionnaire_versions_questions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "landing_page_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "landing_page" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "questionnaire_versions_categories" CASCADE;
  DROP TABLE "questionnaire_versions_questions_options" CASCADE;
  DROP TABLE "questionnaire_versions_questions" CASCADE;
  DROP TABLE "landing_page_steps" CASCADE;
  DROP TABLE "landing_page" CASCADE;
  UPDATE "questionnaire_versions" SET "version_number" = "id" WHERE "version_number" IS NULL;
  ALTER TABLE "questionnaire_versions" ALTER COLUMN "version_number" SET NOT NULL;
  DROP TYPE "public"."enum_questionnaire_versions_questions_type";`)
}
