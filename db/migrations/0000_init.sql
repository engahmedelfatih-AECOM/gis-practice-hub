CREATE EXTENSION IF NOT EXISTS citext;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" "citext" NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"auth_provider" text DEFAULT 'LOCAL' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_user_email_unique" UNIQUE("email"),
	CONSTRAINT "app_user_auth_provider_chk" CHECK ("app_user"."auth_provider" in ('LOCAL', 'ENTRA'))
);
--> statement-breakpoint
CREATE TABLE "auth_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "auth_rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" uuid,
	"granted_by" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_by" uuid,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "role_assignment_role_chk" CHECK ("role_assignment"."role" in ('ADMINISTRATOR', 'GIS_MANAGER', 'GIS_LEAD', 'GIS_SPECIALIST', 'VIEWER')),
	CONSTRAINT "role_assignment_scope_type_chk" CHECK ("role_assignment"."scope_type" in ('GLOBAL', 'REGION')),
	CONSTRAINT "role_assignment_scope_id_chk" CHECK (("role_assignment"."scope_type" = 'GLOBAL' and "role_assignment"."scope_id" is null) or ("role_assignment"."scope_type" <> 'GLOBAL' and "role_assignment"."scope_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"actor_ip" "inet",
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"correlation_id" uuid
);
--> statement-breakpoint
CREATE TABLE "api_key" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" text[] DEFAULT '{hub:read}'::text[] NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid
);
--> statement-breakpoint
CREATE TABLE "app_setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_domain" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_schema_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"domain_name" text NOT NULL,
	"domain_type" text,
	"domain_values" text
);
--> statement-breakpoint
CREATE TABLE "client_feature_class" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_schema_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"grouping_abbr" text,
	"grouping_name" text,
	"feature_class" text NOT NULL,
	"feature_class_alias" text,
	"geometry_type" text,
	"discipline" text,
	"discipline_individual" text,
	"availability" text,
	"gis_comments" text,
	"status" text,
	"notes" text,
	"source_file_url" text,
	"share_folder_url" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_field" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_schema_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"grouping" text,
	"feature_class" text NOT NULL,
	"geometry_type" text,
	"field_name" text NOT NULL,
	"field_alias" text,
	"description" text,
	"esri_type" text,
	"text_length" integer,
	"numeric_precision" integer,
	"numeric_scale" integer,
	"domain_hint" text,
	"nullable" text,
	"default_value" text,
	"units" text
);
--> statement-breakpoint
CREATE TABLE "client_schema" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_name" text NOT NULL,
	"project_label" text,
	"gis_lead" text,
	"schema_version" text,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_subtype" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_schema_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"feature_class" text NOT NULL,
	"code" text,
	"name" text
);
--> statement-breakpoint
CREATE TABLE "enterprise_app" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"file_name" text NOT NULL,
	"dry_run" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'RUNNING' NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"started_by" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "import_run_kind_chk" CHECK ("import_run"."kind" in ('HUB_WORKBOOK', 'CLIENT_SCHEMA')),
	CONSTRAINT "import_run_status_chk" CHECK ("import_run"."status" in ('RUNNING', 'SUCCEEDED', 'FAILED'))
);
--> statement-breakpoint
CREATE TABLE "innovation_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"date" date,
	"category" text,
	"initiative" text NOT NULL,
	"description" text,
	"status" text,
	"owner" text,
	"benefit" text,
	"url" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "list_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_key" text NOT NULL,
	"value" text NOT NULL,
	"group" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "list_item_key_chk" CHECK ("list_item"."list_key" in ('designStage', 'projectStatus', 'packageStatus', 'region', 'discipline', 'updateType', 'rag', 'dimension', 'riskStatus', 'standardStatus', 'innovationCategory', 'innovationStatus', 'availability', 'workflowStatus', 'rfiStatus', 'gisLead', 'gisRole', 'clientReviewStatus', 'revisionNo', 'schemaStatus', 'availabilityFlag', 'geometryType'))
);
--> statement-breakpoint
CREATE TABLE "package" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"design_stage" text NOT NULL,
	"discipline" text NOT NULL,
	"description" text,
	"dimension" text,
	"status" text DEFAULT 'Not Started' NOT NULL,
	"planned_submission" date,
	"actual_submission" date,
	"approval_date" date,
	"progress_pct" integer DEFAULT 0 NOT NULL,
	"assigned_to" text,
	"remarks" text,
	"design_approval_date" date,
	"gis_start_date" date,
	"qaqc_result" text,
	"client_review_status" text,
	"client_comment_ref" text,
	"revision_no" text,
	"resubmission_date" date,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "package_progress_chk" CHECK ("package"."progress_pct" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"client" text,
	"job_no" text,
	"current_design_stage" text,
	"status" text DEFAULT 'Not Started' NOT NULL,
	"gis_lead" text,
	"stage_states" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"qaqc_checklist_url" text,
	"rfi_log_url" text,
	"milestone_override" text,
	"last_updated" date,
	"remarks" text,
	"data_share_folder_url" text,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"location_label" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qaqc_checklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"project_id" uuid,
	"design_stage" text,
	"discipline" text,
	"package_submission" text,
	"reviewer" text,
	"review_date" date,
	"checks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"comments" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_period" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_period_range_chk" CHECK ("report_period"."end_date" >= "report_period"."start_date")
);
--> statement-breakpoint
CREATE TABLE "resource_row" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"hub" text,
	"project_id" uuid,
	"allocated_from" date,
	"allocated_to" date,
	"planned_hours" numeric(8, 2),
	"actual_hours" numeric(8, 2),
	"availability_next" text,
	"remarks" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"rfi_no" text NOT NULL,
	"project_id" uuid,
	"design_stage" text,
	"discipline" text,
	"question" text,
	"raised_by" text,
	"raised_to" text,
	"date_raised" date,
	"due_date" date,
	"response" text,
	"responded_by" text,
	"response_date" date,
	"status" text DEFAULT 'Open' NOT NULL,
	"remarks" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"project_id" uuid,
	"impact" text,
	"mitigation" text,
	"owner" text,
	"support_needed_from" text,
	"due_date" date,
	"rag" text,
	"status" text DEFAULT 'Open' NOT NULL,
	"date_raised" date,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schema_feature" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"project_label" text NOT NULL,
	"project_id" uuid,
	"grouping_abbr" text,
	"grouping_name" text,
	"feature_class" text NOT NULL,
	"feature_class_alias" text,
	"geometry_type" text,
	"discipline" text,
	"discipline_individual" text,
	"availability" text,
	"gis_comments" text,
	"status" text,
	"notes" text,
	"source_file_url" text,
	"share_folder_url" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standard_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"file_name" text,
	"version_label" text,
	"status" text,
	"owner" text,
	"purpose" text,
	"url" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "update_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"meeting_date" date,
	"period_from" date NOT NULL,
	"period_to" date,
	"project_id" uuid NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"mitigation" text,
	"owner" text,
	"due_date" date,
	"rag" text,
	"entered_by" text,
	"date_entered" date,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_step" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"step_no" integer NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'Not Started' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_granted_by_app_user_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_revoked_by_app_user_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_app_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_revoked_by_app_user_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_setting" ADD CONSTRAINT "app_setting_updated_by_app_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_domain" ADD CONSTRAINT "client_domain_client_schema_id_client_schema_id_fk" FOREIGN KEY ("client_schema_id") REFERENCES "public"."client_schema"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_feature_class" ADD CONSTRAINT "client_feature_class_client_schema_id_client_schema_id_fk" FOREIGN KEY ("client_schema_id") REFERENCES "public"."client_schema"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_field" ADD CONSTRAINT "client_field_client_schema_id_client_schema_id_fk" FOREIGN KEY ("client_schema_id") REFERENCES "public"."client_schema"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_subtype" ADD CONSTRAINT "client_subtype_client_schema_id_client_schema_id_fk" FOREIGN KEY ("client_schema_id") REFERENCES "public"."client_schema"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise_app" ADD CONSTRAINT "enterprise_app_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_run" ADD CONSTRAINT "import_run_started_by_app_user_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package" ADD CONSTRAINT "package_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qaqc_checklist" ADD CONSTRAINT "qaqc_checklist_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_row" ADD CONSTRAINT "resource_row_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfi" ADD CONSTRAINT "rfi_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk" ADD CONSTRAINT "risk_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_feature" ADD CONSTRAINT "schema_feature_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "update_item" ADD CONSTRAINT "update_item_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step" ADD CONSTRAINT "workflow_step_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_user_is_active_idx" ON "app_user" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "auth_account_user_id_idx" ON "auth_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_session_user_id_idx" ON "auth_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_verification_identifier_idx" ON "auth_verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "role_assignment_user_idx" ON "role_assignment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "role_assignment_scope_idx" ON "role_assignment" USING btree ("role","scope_type","scope_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_assignment_active_uniq" ON "role_assignment" USING btree ("user_id","role","scope_type",coalesce("scope_id", '00000000-0000-0000-0000-000000000000'::uuid)) WHERE "role_assignment"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_log_occurred_idx" ON "audit_log" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_hash_uq" ON "api_key" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_key_prefix_idx" ON "api_key" USING btree ("prefix");--> statement-breakpoint
CREATE INDEX "client_domain_idx" ON "client_domain" USING btree ("client_schema_id","domain_name");--> statement-breakpoint
CREATE UNIQUE INDEX "client_feature_class_uq" ON "client_feature_class" USING btree ("client_schema_id","feature_class");--> statement-breakpoint
CREATE INDEX "client_field_fc_idx" ON "client_field" USING btree ("client_schema_id","feature_class");--> statement-breakpoint
CREATE UNIQUE INDEX "client_schema_name_uq" ON "client_schema" USING btree ("client_name");--> statement-breakpoint
CREATE INDEX "client_subtype_fc_idx" ON "client_subtype" USING btree ("client_schema_id","feature_class");--> statement-breakpoint
CREATE INDEX "enterprise_app_project_idx" ON "enterprise_app" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "import_run_started_idx" ON "import_run" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "list_item_key_value_uq" ON "list_item" USING btree ("list_key","value");--> statement-breakpoint
CREATE INDEX "package_project_idx" ON "package" USING btree ("project_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "project_name_uq" ON "project" USING btree ("name");--> statement-breakpoint
CREATE INDEX "project_status_idx" ON "project" USING btree ("status");--> statement-breakpoint
CREATE INDEX "qaqc_project_idx" ON "qaqc_checklist" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_period_start_uq" ON "report_period" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "resource_row_project_idx" ON "resource_row" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "resource_row_name_idx" ON "resource_row" USING btree ("name");--> statement-breakpoint
CREATE INDEX "rfi_project_idx" ON "rfi" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "rfi_status_idx" ON "rfi" USING btree ("status");--> statement-breakpoint
CREATE INDEX "risk_project_idx" ON "risk" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "risk_status_idx" ON "risk" USING btree ("status");--> statement-breakpoint
CREATE INDEX "schema_feature_project_idx" ON "schema_feature" USING btree ("project_label","sort_order");--> statement-breakpoint
CREATE INDEX "update_item_project_period_idx" ON "update_item" USING btree ("project_id","period_from");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_step_project_no_uq" ON "workflow_step" USING btree ("project_id","step_no");