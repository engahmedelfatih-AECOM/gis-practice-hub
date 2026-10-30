-- Business constraints that Drizzle cannot express declaratively.

-- 1. The audit log is append-only regardless of the connecting role.
CREATE OR REPLACE FUNCTION gh_reject_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% on % is not permitted (append-only table)', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END $$;
--> statement-breakpoint
CREATE TRIGGER audit_log_append_only_trg
  BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION gh_reject_mutation();
--> statement-breakpoint

-- 2. Search support.
CREATE INDEX "project_name_trgm_idx" ON "project" USING gin ((coalesce(name, '') || ' ' || coalesce(client, '') || ' ' || coalesce(job_no, '')) gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "schema_feature_fc_trgm_idx" ON "schema_feature" USING gin ((coalesce(feature_class, '') || ' ' || coalesce(grouping_name, '')) gin_trgm_ops);
