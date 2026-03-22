-- Create "permissions" table
CREATE TABLE "permissions" ("id" uuid NOT NULL, "name" character varying NOT NULL, "module" character varying NOT NULL, "description" character varying NULL, "created_at" timestamptz NOT NULL, "updated_at" timestamptz NOT NULL, PRIMARY KEY ("id"));
-- Create "roles" table
CREATE TABLE "roles" ("id" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying NULL, "scope" character varying NOT NULL DEFAULT 'tenant', "system_role" boolean NOT NULL DEFAULT true, "created_at" timestamptz NOT NULL, "updated_at" timestamptz NOT NULL, PRIMARY KEY ("id"));
-- Create "role_permissions" table
CREATE TABLE "role_permissions" ("role_id" character varying NOT NULL, "permission_id" uuid NOT NULL, PRIMARY KEY ("role_id", "permission_id"), CONSTRAINT "role_permissions_permission_id" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON UPDATE NO ACTION ON DELETE CASCADE, CONSTRAINT "role_permissions_role_id" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON UPDATE NO ACTION ON DELETE CASCADE);
-- Create "users" table
CREATE TABLE "users" ("id" uuid NOT NULL, "auth_service_user_id" uuid NULL, "email" character varying NOT NULL, "sync_status" character varying NOT NULL DEFAULT 'pending', "sync_at" timestamptz NULL, "full_name" character varying NOT NULL, "phone" character varying NULL, "status" character varying NOT NULL DEFAULT 'active', "primary_role" character varying NULL, "locale" character varying NOT NULL DEFAULT 'en', "last_login_at" timestamptz NULL, "metadata" jsonb NOT NULL, "created_at" timestamptz NOT NULL, "updated_at" timestamptz NOT NULL, "tenant_id" uuid NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "users_tenants_users" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION);
-- Create index "user_auth_service_user_id" to table: "users"
CREATE INDEX "user_auth_service_user_id" ON "users" ("auth_service_user_id");
-- Create index "user_created_at" to table: "users"
CREATE INDEX "user_created_at" ON "users" ("created_at");
-- Create index "user_email" to table: "users"
CREATE INDEX "user_email" ON "users" ("email");
-- Create index "user_sync_status" to table: "users"
CREATE INDEX "user_sync_status" ON "users" ("sync_status");
-- Create index "user_tenant_id_auth_service_user_id" to table: "users"
CREATE INDEX "user_tenant_id_auth_service_user_id" ON "users" ("tenant_id", "auth_service_user_id");
-- Create index "user_tenant_id_email" to table: "users"
CREATE UNIQUE INDEX "user_tenant_id_email" ON "users" ("tenant_id", "email");
-- Create index "user_tenant_id_status" to table: "users"
CREATE INDEX "user_tenant_id_status" ON "users" ("tenant_id", "status");
-- Create index "users_auth_service_user_id_key" to table: "users"
CREATE UNIQUE INDEX "users_auth_service_user_id_key" ON "users" ("auth_service_user_id");
-- Create "user_roles" table
CREATE TABLE "user_roles" ("user_id" uuid NOT NULL, "role_id" character varying NOT NULL, PRIMARY KEY ("user_id", "role_id"), CONSTRAINT "user_roles_role_id" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON UPDATE NO ACTION ON DELETE CASCADE, CONSTRAINT "user_roles_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE);
