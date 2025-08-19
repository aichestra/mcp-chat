-- Create local_models table
CREATE TABLE "local_models" (
  "id" text PRIMARY KEY DEFAULT nanoid(),
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "base_url" text NOT NULL,
  "api_key" text,
  "is_active" boolean DEFAULT false,
  "endpoint_type" text NOT NULL DEFAULT 'ollama',
  "health_status" text DEFAULT 'unknown',
  "last_health_check" timestamp,
  "available_models" jsonb DEFAULT '[]',
  "last_model_discovery" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX "idx_local_models_user_active" ON "local_models"("user_id", "is_active");
CREATE INDEX "idx_local_models_health" ON "local_models"("health_status", "last_health_check");

-- Add foreign key constraint (assuming users table exists)
-- ALTER TABLE "local_models" ADD CONSTRAINT "local_models_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
