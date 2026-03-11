-- Create "tenants" table
CREATE TABLE "tenants" ("id" uuid NOT NULL, "name" character varying NOT NULL, "slug" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'active', "contact_email" character varying NULL, "contact_phone" character varying NULL, "logo_url" character varying NULL, "website" character varying NULL, "country" character varying NULL DEFAULT 'KE', "timezone" character varying NULL DEFAULT 'Africa/Nairobi', "brand_colors" jsonb NULL, "org_size" character varying NULL, "use_case" character varying NULL, "subscription_plan" character varying NULL, "subscription_status" character varying NULL, "subscription_expires_at" timestamptz NULL, "subscription_id" character varying NULL, "tier_limits" jsonb NULL, "metadata" jsonb NULL, "created_at" timestamptz NOT NULL, "updated_at" timestamptz NOT NULL, PRIMARY KEY ("id"));
-- Create index "tenant_slug" to table: "tenants"
CREATE UNIQUE INDEX "tenant_slug" ON "tenants" ("slug");
-- Create index "tenant_status" to table: "tenants"
CREATE INDEX "tenant_status" ON "tenants" ("status");
-- Create index "tenants_slug_key" to table: "tenants"
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants" ("slug");
