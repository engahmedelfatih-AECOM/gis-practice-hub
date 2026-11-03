ALTER TABLE "package" ALTER COLUMN "progress_pct" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "package" ALTER COLUMN "progress_pct" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rfi" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "rfi" ALTER COLUMN "status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "resource_row" ADD COLUMN "utilisation_pct" integer;--> statement-breakpoint
ALTER TABLE "resource_row" ADD CONSTRAINT "resource_row_utilisation_chk" CHECK ("resource_row"."utilisation_pct" between 0 and 120);--> statement-breakpoint
-- The audit log is append-only: block TRUNCATE as well (UPDATE and DELETE are blocked by 0001).
-- Test databases reset themselves inside a transaction that sets gh.allow_truncate = 'on'.
CREATE OR REPLACE FUNCTION gh_reject_truncate() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(current_setting('gh.allow_truncate', true), '') = 'on' THEN
    RETURN NULL;
  END IF;
  RAISE EXCEPTION 'TRUNCATE on % is not permitted (append-only table)', TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END $$;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_truncate_trg
  BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION gh_reject_truncate();
