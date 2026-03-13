import { pgTable, uuid, text, timestamp, boolean, pgEnum, jsonb, integer, doublePrecision } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const aiPlatformEnum = pgEnum('ai_platform', ['chatgpt', 'perplexity', 'gemini', 'google_ai_overviews']);
export const monitoringStatusEnum = pgEnum('monitoring_status', ['pending', 'success', 'failed']);
export const intentCategoryEnum = pgEnum('intent_category', ['informational', 'commercial', 'transactional']);

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const brands = pgTable('brands', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  isCompetitor: boolean('is_competitor').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const prompts = pgTable('prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  countryCode: text('country_code'),
  isActive: boolean('is_active').default(true).notNull(),
  searchVolume: integer('search_volume'),
  difficultyScore: integer('difficulty_score'),
  lastVolumeSyncAt: timestamp('last_volume_sync_at'),
  cpsScore: doublePrecision('cps_score'),
  intentCategory: intentCategoryEnum('intent_category'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const promptRelations = relations(prompts, ({ one }) => ({
  category: one(categories, {
    fields: [prompts.categoryId],
    references: [categories.id],
  }),
}));

export const categoryRelations = relations(categories, ({ many }) => ({
  prompts: many(prompts),
}));

export const monitoringLogs = pgTable('monitoring_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  promptId: uuid('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  aiPlatform: aiPlatformEnum('ai_platform').notNull(),
  countryCode: text('country_code').notNull(),
  status: monitoringStatusEnum('status').notNull().default('pending'),
  durationMs: integer('duration_ms'),
  errorMessage: text('error_message'),
  errorStack: text('error_stack'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const monitoringResults = pgTable('monitoring_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  promptId: uuid('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  logId: uuid('log_id').references(() => monitoringLogs.id, { onDelete: 'set null' }),
  aiPlatform: aiPlatformEnum('ai_platform').notNull(),
  countryCode: text('country_code').notNull(),
  content: jsonb('content').notNull(), // { brands: Array<{ name: string, rank: number, sentiment: string }>, ... }
  rawResponse: text('raw_response').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const monitoringConfigs = pgTable('monitoring_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  activeCountries: jsonb('active_countries').notNull().default([]), // Array<string> (country codes)
  activeCategories: jsonb('active_categories').notNull().default([]), // Array<string> (category ids)
  proxyConfig: jsonb('proxy_config').default({}), // { host, port, username, password }
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const brandMetricsDaily = pgTable('brand_metrics_daily', {
  tenantId: uuid('tenant_id').notNull(),
  brandId: uuid('brand_id').notNull(),
  categoryId: uuid('category_id').notNull(),
  countryCode: text('country_code').notNull(),
  aiPlatform: aiPlatformEnum('ai_platform').notNull(),
  day: timestamp('day').notNull(),
  mentionCount: integer('mention_count').notNull(),
  totalResults: integer('total_results').notNull(),
  rankSum: integer('rank_sum').notNull(),
  avgRank: doublePrecision('avg_rank').notNull(),
  shareOfVoice: doublePrecision('share_of_voice').notNull(),
  lastRefreshedAt: timestamp('last_refreshed_at').notNull(),
});

export const tenantRelations = relations(tenants, ({ many }) => ({
  categories: many(categories),
  brands: many(brands),
  prompts: many(prompts),
  monitoringLogs: many(monitoringLogs),
  monitoringResults: many(monitoringResults),
  monitoringConfigs: many(monitoringConfigs),
}));

