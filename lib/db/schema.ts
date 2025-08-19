import { timestamp, pgTable, text, primaryKey, json, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid/non-secure";

// Message role enum type
export enum MessageRole {
  USER = "user",
  ASSISTANT = "assistant",
  TOOL = "tool"
}

export const chats = pgTable('chats', {
  id: text('id').primaryKey().notNull().$defaultFn(() => nanoid()),
  userId: text('user_id').notNull(),
  title: text('title').notNull().default('New Chat'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey().notNull().$defaultFn(() => nanoid()),
  chatId: text('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // user, assistant, or tool
  parts: json('parts').notNull(), // Store parts as JSON in the database
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Types for structured message content
export type MessagePart = {
  type: string;
  text?: string;
  toolCallId?: string;
  toolName?: string;
  args?: any;
  result?: any;
  [key: string]: any;
};

export type Attachment = {
  type: string;
  [key: string]: any;
};

export type Chat = typeof chats.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type DBMessage = {
  id: string;
  chatId: string;
  role: string;
  parts: MessagePart[];
  createdAt: Date;
};

// Local models schema
export const localModels = pgTable('local_models', {
  id: text('id').primaryKey().notNull().$defaultFn(() => nanoid()),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  apiKey: text('api_key'),
  isActive: boolean('is_active').default(false),
  endpointType: text('endpoint_type').notNull().default('ollama'),
  healthStatus: text('health_status').default('unknown'),
  lastHealthCheck: timestamp('last_health_check'),
  availableModels: jsonb('available_models').$type<string[]>().default([]),
  lastModelDiscovery: timestamp('last_model_discovery'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Types for local models
export type LocalModel = typeof localModels.$inferSelect;
export type NewLocalModel = typeof localModels.$inferInsert; 