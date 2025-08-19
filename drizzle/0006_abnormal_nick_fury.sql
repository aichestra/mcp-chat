CREATE TABLE "local_models" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"base_url" text NOT NULL,
	"api_key" text,
	"is_active" boolean DEFAULT false,
	"endpoint_type" text DEFAULT 'ollama' NOT NULL,
	"health_status" text DEFAULT 'unknown',
	"last_health_check" timestamp,
	"available_models" jsonb DEFAULT '[]'::jsonb,
	"last_model_discovery" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
