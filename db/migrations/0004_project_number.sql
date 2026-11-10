ALTER TABLE "project" ADD COLUMN "project_number" text;--> statement-breakpoint
CREATE UNIQUE INDEX "project_number_uq" ON "project" USING btree ("project_number");