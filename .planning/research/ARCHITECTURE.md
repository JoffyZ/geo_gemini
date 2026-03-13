# Architecture Patterns

**Domain:** GEO Monitoring System
**Researched:** 2026-03-13

## Recommended Architecture

GEO monitoring systems follow a **scheduled data collection and processing pipeline** architecture, combining:
- **Event-driven background job processing** for scheduled AI querying
- **Multi-layered data parsing and transformation** for structured extraction
- **Time-series data storage** for trend analysis
- **Multi-tenant data isolation** for future SaaS readiness

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                              │
│  (Dashboard, Prompt Explorer, Prompt Generator, Analytics)          │
└───────────────┬─────────────────────────────────────────────────────┘
                │ HTTP/REST API
┌───────────────▼─────────────────────────────────────────────────────┐
│                      Backend API Layer                              │
│  - Authentication & Authorization                                   │
│  - Request Validation & Rate Limiting                               │
│  - Business Logic Orchestration                                     │
│  - Multi-tenant Context Management                                  │
└─────┬─────────────┬──────────────┬──────────────┬───────────────────┘
      │             │              │              │
      │             │              │              │
┌─────▼─────┐ ┌─────▼──────┐ ┌────▼──────┐ ┌────▼──────────────────┐
│  Prompt   │ │  Query     │ │ Analytics │ │  Job Queue (BullMQ)   │
│  Manager  │ │  Executor  │ │  Engine   │ │  - Scheduled Jobs     │
│           │ │  (Single)  │ │           │ │  - Retry Logic        │
└───────────┘ └────────────┘ └───────────┘ └───────┬───────────────┘
                                                    │
                                          ┌─────────▼─────────────┐
                                          │  Background Workers   │
                                          │  - AI Query Runner    │
                                          │  - Response Parser    │
                                          │  - Metrics Calculator │
                                          └───────┬───────────────┘
                                                  │
              ┌───────────────────────────────────┼────────────────┐
              │                                   │                │
      ┌───────▼─────────┐              ┌──────────▼──────────┐     │
      │  AI Integrations│              │   Parser Service    │     │
      │  - ChatGPT API  │              │  - LLM Extraction   │     │
      │  - Perplexity   │              │  - Brand Detection  │     │
      │  - Gemini       │              │  - Ranking Logic    │     │
      │  - Claude       │              │  - Citation Parse   │     │
      │  - Rate Limit   │              └─────────────────────┘     │
      │  - Retry Queue  │                                          │
      └─────────────────┘                                          │
                                                                   │
                                      ┌────────────────────────────▼────┐
                                      │     Database Layer               │
                                      │  - PostgreSQL (Core Data)        │
                                      │  - TimescaleDB (Time-Series)     │
                                      │  - Redis (Job Queue & Cache)     │
                                      └──────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With | Data Ownership |
|-----------|---------------|-------------------|----------------|
| **Frontend** | User interface, visualization, user input validation | Backend API (REST) | None (stateless) |
| **Backend API** | Authentication, request routing, business logic orchestration, multi-tenant context | All backend services | Users, Brands, Competitors, Configurations |
| **Prompt Manager** | Generate, validate, store, and manage prompt library | Backend API, Database | Prompts, Categories, AI Volume metadata |
| **Query Executor** | Single-time AI query execution (Prompt Explorer) | AI Integrations, Parser Service | None (stateless) |
| **Job Queue (BullMQ)** | Schedule and manage background jobs, retry failed tasks | Background Workers, Redis | Job metadata, schedules |
| **Background Workers** | Execute scheduled AI queries, parse responses, calculate metrics | AI Integrations, Parser Service, Database | None (stateless processors) |
| **AI Integrations** | Rate-limited API calls to AI platforms, response caching | External AI APIs (ChatGPT, Perplexity, etc.) | API rate limit state, response cache |
| **Parser Service** | Extract structured data from AI responses using LLMs | AI Integrations (for extraction), Database | None (stateless) |
| **Analytics Engine** | Aggregate metrics, trend calculations, competitor comparisons | Database (read-heavy) | Calculated aggregations (materialized views) |
| **Database Layer** | Persist all application data, time-series metrics, job state | All backend services | All persistent data |

### Data Flow

#### Flow 1: Prompt Generation (Prompt Generator)

```
User Input (Keyword)
    ↓
Frontend → Backend API
    ↓
LLM API (Prompt Generation)
    ↓
Display Generated Prompts + AI Volume
    ↓
User Selection → Save to Prompt Library
    ↓
Database (prompts table with tenant_id)
```

#### Flow 2: Single Query Execution (Prompt Explorer)

```
User Input (Question + AI Platform)
    ↓
Frontend → Backend API → Query Executor
    ↓
AI Integration Service (Rate Limit Check)
    ↓
AI Platform API Call
    ↓
Raw Response → Parser Service
    ↓
LLM Structured Extraction (brands, rankings, citations)
    ↓
Return Structured Result → Frontend Display
```

#### Flow 3: Scheduled Monitoring (Core Background Loop)

```
Cron Trigger (Daily at configured time)
    ↓
Job Queue (BullMQ) → Create Jobs per (Prompt × AI Platform)
    ↓
Background Worker Pool (Parallel Processing)
    │
    ├─→ Job 1: Query AI Platform for Prompt A on ChatGPT
    │       ↓
    │   AI Integration → Rate Limit → API Call → Raw Response
    │       ↓
    │   Parser Service → Structured Extraction
    │       ↓
    │   Save to Database (monitoring_results table)
    │       - tenant_id, prompt_id, ai_platform, timestamp
    │       - brands_mentioned, rankings, sentiment, citations
    │
    ├─→ Job 2: Query AI Platform for Prompt A on Perplexity
    │       ↓ (same flow)
    │
    └─→ Job N: Query AI Platform for Prompt Z on Gemini
            ↓ (same flow)

All Jobs Complete
    ↓
Metrics Calculation Job
    ↓
Analytics Engine → Aggregate Metrics
    - Mention rate per brand/platform
    - Average ranking
    - Sentiment scores
    - Citation counts
    ↓
Save to TimescaleDB (time-series metrics)
```

#### Flow 4: Dashboard Visualization

```
User opens Dashboard → Frontend Request
    ↓
Backend API → Analytics Engine
    ↓
Query Database (time-series metrics)
    - Filter by tenant_id, date range, AI platform
    - Aggregate mention rates, rankings, sentiment
    ↓
Return JSON → Frontend Renders Charts
```

#### Flow 5: Multi-Tenant Data Isolation

```
All Database Queries Include tenant_id Filter
    ↓
Row-Level Security (Optional PostgreSQL RLS)
    ↓
Application-Level Enforcement (Backend API)
    - Extract tenant_id from authenticated user
    - Inject into all queries
    - Prevent cross-tenant data access
```

## Patterns to Follow

### Pattern 1: Idempotent Job Processing
**What:** Every background job can be safely retried without side effects

**When:** All scheduled monitoring jobs, AI query execution

**Why:** Network failures, API rate limits, and service restarts are common in distributed systems

**Example:**
```typescript
// Use unique job IDs based on content, not random generation
const jobId = `query_${promptId}_${aiPlatform}_${dateString}`;

// Check if result already exists before processing
async function processAIQuery(job) {
  const existing = await db.query(
    'SELECT id FROM monitoring_results WHERE prompt_id = $1 AND ai_platform = $2 AND DATE(timestamp) = $3',
    [job.data.promptId, job.data.aiPlatform, job.data.date]
  );

  if (existing.rows.length > 0) {
    logger.info('Result already exists, skipping');
    return existing.rows[0];
  }

  // Process AI query...
}
```

### Pattern 2: Circuit Breaker for AI APIs
**What:** Prevent cascading failures when AI APIs are down or rate-limited

**When:** All external AI API calls

**Why:** AI APIs can be unpredictable (rate limits, outages, slow responses). Circuit breaker prevents wasting resources on failing calls.

**Example:**
```typescript
// Using opossum or similar circuit breaker library
const CircuitBreaker = require('opossum');

const options = {
  timeout: 30000, // 30s timeout
  errorThresholdPercentage: 50, // Open circuit at 50% failure rate
  resetTimeout: 60000 // Retry after 1 minute
};

const breaker = new CircuitBreaker(callAIAPI, options);

breaker.on('open', () => {
  logger.error('Circuit breaker opened for AI API');
  // Alert monitoring system
});

// Use breaker instead of direct API call
const result = await breaker.fire(prompt, platform);
```

### Pattern 3: Exponential Backoff with Jitter
**What:** Retry failed API calls with increasing delays and randomization

**When:** AI API calls fail due to rate limits or transient errors

**Why:** Prevents thundering herd problem, respects rate limits, increases success rate

**Example:**
```typescript
async function callAIWithRetry(prompt, platform, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await callAIAPI(prompt, platform);
    } catch (error) {
      if (error.code === 'RATE_LIMIT' && attempt < maxRetries - 1) {
        // Exponential backoff: 2^attempt seconds + random jitter
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;

        logger.warn(`Rate limited, retrying in ${delay}ms`);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
}
```

### Pattern 4: Structured Output with Schema Validation
**What:** Use LLM structured output APIs with Pydantic/Zod schemas for parsing

**When:** Extracting brand mentions, rankings, citations from AI responses

**Why:** Modern LLMs (GPT-4, Claude, Gemini) have native structured output support, providing more reliable extraction than regex or string parsing

**Example:**
```typescript
// Define schema using Zod
const AIResponseSchema = z.object({
  brands_mentioned: z.array(z.object({
    name: z.string(),
    rank: z.number().optional(),
    sentiment: z.enum(['positive', 'neutral', 'negative'])
  })),
  citations: z.array(z.object({
    url: z.string().url(),
    domain: z.string(),
    title: z.string().optional()
  }))
});

// Use OpenAI structured output
const completion = await openai.beta.chat.completions.parse({
  model: "gpt-4o-2024-08-06",
  messages: [
    { role: "system", content: "Extract brand mentions and citations from this AI response" },
    { role: "user", content: rawAIResponse }
  ],
  response_format: zodResponseFormat(AIResponseSchema, "ai_response")
});

const parsed = completion.choices[0].message.parsed;
// parsed is typed and validated
```

### Pattern 5: Time-Series Hypertables for Metrics
**What:** Use TimescaleDB hypertables for storing time-indexed monitoring metrics

**When:** Storing daily/hourly metrics (mention rates, rankings, sentiment over time)

**Why:** Optimized for time-based queries, automatic partitioning, compression, retention policies

**Example:**
```sql
-- Create hypertable for metrics
CREATE TABLE monitoring_metrics (
  time TIMESTAMPTZ NOT NULL,
  tenant_id UUID NOT NULL,
  brand_id UUID NOT NULL,
  ai_platform VARCHAR(50) NOT NULL,
  mention_rate DECIMAL(5,2),
  avg_ranking DECIMAL(4,2),
  sentiment_score DECIMAL(3,2),
  citation_count INTEGER
);

SELECT create_hypertable('monitoring_metrics', 'time');

-- Add indexes for common query patterns
CREATE INDEX idx_metrics_tenant_brand ON monitoring_metrics (tenant_id, brand_id, time DESC);
CREATE INDEX idx_metrics_platform ON monitoring_metrics (ai_platform, time DESC);

-- Enable compression for old data
ALTER TABLE monitoring_metrics SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'tenant_id, brand_id, ai_platform'
);

-- Auto-compress data older than 7 days
SELECT add_compression_policy('monitoring_metrics', INTERVAL '7 days');

-- Auto-delete data older than 1 year
SELECT add_retention_policy('monitoring_metrics', INTERVAL '1 year');
```

### Pattern 6: Multi-Tenant Row-Level Security
**What:** Enforce tenant data isolation at the database level

**When:** All multi-tenant data tables (prompts, brands, competitors, results)

**Why:** Defense-in-depth security, prevents application bugs from leaking data across tenants

**Example:**
```sql
-- Enable RLS on tenant tables
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_results ENABLE ROW LEVEL SECURITY;

-- Create policy to only show rows matching current tenant
CREATE POLICY tenant_isolation_policy ON prompts
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON monitoring_results
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- In application code, set tenant context per request
await db.query('SET LOCAL app.current_tenant_id = $1', [tenantId]);
```

### Pattern 7: Materialized Views for Dashboard Aggregations
**What:** Pre-compute expensive aggregations for dashboard queries

**When:** Displaying trend charts, competitor comparisons, top citations

**Why:** Dashboard queries can be complex (multi-table joins, aggregations across time). Materialized views cache results.

**Example:**
```sql
-- Materialized view for daily brand metrics
CREATE MATERIALIZED VIEW daily_brand_metrics AS
SELECT
  DATE(m.time) as date,
  m.tenant_id,
  m.brand_id,
  b.name as brand_name,
  m.ai_platform,
  AVG(m.mention_rate) as avg_mention_rate,
  AVG(m.avg_ranking) as avg_ranking,
  AVG(m.sentiment_score) as avg_sentiment
FROM monitoring_metrics m
JOIN brands b ON m.brand_id = b.id
GROUP BY DATE(m.time), m.tenant_id, m.brand_id, b.name, m.ai_platform;

-- Refresh automatically (TimescaleDB continuous aggregates preferred)
CREATE INDEX ON daily_brand_metrics (tenant_id, date DESC);

-- Refresh policy (or use TimescaleDB continuous aggregates)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_brand_metrics;
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Synchronous AI API Calls in Request-Response Cycle
**What:** Calling AI APIs directly in HTTP request handlers

**Why bad:** AI APIs can take 10-30+ seconds to respond. This blocks the request thread, causes timeouts, and creates terrible UX.

**Instead:** Always use background jobs for AI queries (except Prompt Explorer for single-user testing). Return job ID immediately, poll for results or use WebSockets for updates.

**Example:**
```typescript
// BAD: Synchronous API call
app.post('/api/prompts/:id/test', async (req, res) => {
  const result = await callAIAPI(prompt, platform); // ⚠️ Blocks for 30s
  res.json(result);
});

// GOOD: Async job queue
app.post('/api/prompts/:id/test', async (req, res) => {
  const job = await queue.add('ai-query', { promptId, platform });
  res.json({ jobId: job.id, status: 'processing' });
});

app.get('/api/jobs/:id', async (req, res) => {
  const job = await queue.getJob(req.params.id);
  const state = await job.getState();
  res.json({ status: state, result: job.returnvalue });
});
```

### Anti-Pattern 2: Storing Raw AI Responses Without Structured Extraction
**What:** Saving entire AI response text blobs to database without parsing

**Why bad:** Makes querying impossible (can't filter by brand, ranking, etc.), wastes storage, requires parsing on every read

**Instead:** Parse responses immediately using LLM structured extraction, store normalized data in relational tables

### Anti-Pattern 3: Global Cron Jobs Without Tenant Scoping
**What:** Running scheduled jobs globally without considering multi-tenant context

**Why bad:** When you add second tenant, jobs run for all tenants simultaneously, causing resource spikes and rate limit issues

**Instead:** Enqueue one job per tenant per prompt, with proper rate limiting and parallelism control

**Example:**
```typescript
// BAD: Global job
cron.schedule('0 2 * * *', async () => {
  const prompts = await db.query('SELECT * FROM prompts'); // ⚠️ All tenants
  for (const prompt of prompts) {
    await queryAI(prompt); // ⚠️ No rate limiting across tenants
  }
});

// GOOD: Tenant-scoped jobs
cron.schedule('0 2 * * *', async () => {
  const tenants = await db.query('SELECT id FROM tenants WHERE active = true');

  for (const tenant of tenants) {
    const prompts = await db.query(
      'SELECT * FROM prompts WHERE tenant_id = $1 AND active = true',
      [tenant.id]
    );

    for (const prompt of prompts) {
      // Add to queue with tenant context
      await queue.add('ai-query', {
        tenantId: tenant.id,
        promptId: prompt.id,
        platforms: ['chatgpt', 'perplexity', 'gemini']
      }, {
        priority: tenant.priority_level, // Premium tenants first
        rateLimiter: { max: 10, duration: 1000 } // Per-tenant rate limit
      });
    }
  }
});
```

### Anti-Pattern 4: No Retry or Error Handling for AI APIs
**What:** Assuming AI API calls always succeed, no retry logic

**Why bad:** AI APIs frequently fail (rate limits, timeouts, service errors). Lost data, incomplete monitoring.

**Instead:** Implement robust retry logic with exponential backoff, circuit breakers, and dead letter queues for persistent failures

### Anti-Pattern 5: Storing Time-Series Data in Regular Tables Without Indexes
**What:** Using standard PostgreSQL tables for metrics without time-based partitioning

**Why bad:** As data grows (daily metrics × prompts × platforms × tenants), queries slow down exponentially

**Instead:** Use TimescaleDB hypertables with automatic time-based partitioning, compression, and retention policies

### Anti-Pattern 6: Hard-Coding AI Platform Logic
**What:** Separate code paths for each AI platform (if/else for ChatGPT, Perplexity, etc.)

**Why bad:** Adding new platforms requires code changes, testing is harder, inconsistent behavior

**Instead:** Use adapter pattern with common interface, configuration-driven platform definitions

**Example:**
```typescript
// BAD: Hard-coded platforms
if (platform === 'chatgpt') {
  const response = await fetch('https://api.openai.com/v1/chat/completions', { ... });
} else if (platform === 'perplexity') {
  const response = await fetch('https://api.perplexity.ai/chat/completions', { ... });
}

// GOOD: Adapter pattern
interface AIPlatformAdapter {
  query(prompt: string): Promise<string>;
  parseResponse(raw: string): ParsedResponse;
  getRateLimit(): { requests: number, window: number };
}

class ChatGPTAdapter implements AIPlatformAdapter { ... }
class PerplexityAdapter implements AIPlatformAdapter { ... }

const platforms = {
  chatgpt: new ChatGPTAdapter(config.openai),
  perplexity: new PerplexityAdapter(config.perplexity)
};

// Use common interface
const adapter = platforms[platform];
const response = await adapter.query(prompt);
```

### Anti-Pattern 7: Missing Multi-Tenant Context in Logs and Monitoring
**What:** Generic error logs without tenant_id, making debugging impossible

**Why bad:** When error occurs, can't identify which tenant is affected, can't trace requests across services

**Instead:** Include tenant_id, prompt_id, platform in all logs, traces, and metrics

**Example:**
```typescript
// BAD: Generic logging
logger.error('AI API call failed', { error: err.message });

// GOOD: Contextual logging
logger.error('AI API call failed', {
  error: err.message,
  tenantId,
  promptId,
  platform,
  jobId,
  attempt: retryCount,
  timestamp: new Date().toISOString()
});
```

## Scalability Considerations

| Concern | At 1 Tenant (100 prompts) | At 10 Tenants (1000 prompts) | At 100 Tenants (10K prompts) |
|---------|---------------------------|------------------------------|------------------------------|
| **AI API Calls** | ~400/day (100 prompts × 4 platforms) | ~4,000/day | ~40,000/day |
| **Rate Limiting** | Single API key per platform | Multiple API keys, round-robin | Distributed rate limiter (Redis), key pools |
| **Job Queue** | Single worker, sequential processing | 5-10 workers, parallel processing | 50+ workers, auto-scaling, priority queues |
| **Database** | Single PostgreSQL instance | Read replicas for analytics queries | Sharding by tenant_id, separate analytics DB |
| **Storage** | ~1GB/month (compressed metrics) | ~10GB/month | ~100GB/month, aggressive compression + retention |
| **Monitoring** | Basic logs, manual dashboards | APM (Datadog/New Relic), error tracking | Distributed tracing, tenant-level SLAs, alerting |

### Scaling Strategy Progression

**Phase 1 (1-10 tenants):**
- Single PostgreSQL + TimescaleDB instance
- BullMQ with 5-10 workers
- Single Redis instance
- Manual API key rotation

**Phase 2 (10-50 tenants):**
- PostgreSQL read replicas for analytics
- Horizontal worker scaling (10-50 workers)
- Redis Cluster for job queue
- Automated API key pools
- CDN for frontend assets

**Phase 3 (50+ tenants):**
- Database sharding by tenant_id
- Separate analytics database (ClickHouse/BigQuery)
- Auto-scaling worker pools (Kubernetes)
- Distributed rate limiter (Redis Cluster)
- Multi-region deployment for global latency
- Tenant-specific rate limits and priorities

## Suggested Build Order

### Phase 1: Core Infrastructure (Week 1-2)
**Dependencies:** None
**Components:**
1. Database schema (PostgreSQL + TimescaleDB)
   - Users, tenants, brands, competitors tables
   - Prompts table with tenant_id
   - Monitoring results table (hypertable)
2. Backend API skeleton
   - Authentication middleware
   - Tenant context injection
   - Basic CRUD endpoints
3. Redis + BullMQ setup
   - Job queue configuration
   - Single worker scaffold

**Why first:** Everything depends on database and API foundation. Must establish multi-tenant patterns early.

### Phase 2: Prompt Management (Week 2-3)
**Dependencies:** Phase 1
**Components:**
1. Prompt Explorer (single query)
   - Manual prompt input
   - AI platform selection
   - Query executor service
2. AI Integration Layer
   - ChatGPT adapter
   - Basic rate limiting
   - Response caching
3. Parser Service (basic)
   - LLM-based structured extraction
   - Brand mention detection

**Why second:** Validates end-to-end flow (user input → AI query → parsing → display) before adding complexity.

### Phase 3: Prompt Generator (Week 3-4)
**Dependencies:** Phase 2
**Components:**
1. LLM-based prompt generation from keywords
2. AI Volume data integration (Google Trends API)
3. Prompt library CRUD operations
4. Prompt categorization

**Why third:** Depends on working AI integration layer. Adds value on top of manual testing.

### Phase 4: Scheduled Monitoring (Week 4-5)
**Dependencies:** Phase 3
**Components:**
1. Background job scheduler (cron → BullMQ)
2. Batch AI query processing
3. Retry logic and error handling
4. Metrics calculation and storage

**Why fourth:** Core monitoring loop requires robust job queue, AI integrations, and parsing—all built in previous phases.

### Phase 5: Dashboard & Analytics (Week 5-6)
**Dependencies:** Phase 4
**Components:**
1. Time-series metrics queries
2. Trend visualization (mention rate, ranking over time)
3. Competitor comparison
4. Citation analysis

**Why fifth:** Requires time-series data generated by scheduled monitoring. Frontend visualization consumes backend analytics.

### Phase 6: Citation & Advanced Features (Week 6-7)
**Dependencies:** Phase 5
**Components:**
1. Citation source extraction and categorization
2. Official website content tracking
3. Data export (CSV/Excel)
4. Advanced filtering

**Why sixth:** Polish and advanced features. Not blocking for core value.

### Phase 7: Optimization & Scaling (Week 7-8)
**Dependencies:** All previous
**Components:**
1. Materialized views for dashboard queries
2. TimescaleDB compression and retention policies
3. Performance tuning
4. Monitoring and alerting setup

**Why last:** Optimize based on real usage patterns. Premature optimization wastes time.

### Critical Path Dependencies

```
Database + API → AI Integration → Prompt Explorer → Prompt Generator
                                                           ↓
                                                    Scheduled Jobs
                                                           ↓
                                                      Dashboard
                                                           ↓
                                                   Advanced Features
```

**Parallel Development Opportunities:**
- Frontend (Dashboard UI) can be developed in parallel with backend once API contracts are defined
- Parser Service improvements (better extraction logic) can be iterated independently
- Additional AI platform adapters (Gemini, Claude) can be added incrementally

**De-risking Strategy:**
- Build Prompt Explorer first (simplest flow) to validate AI integration before committing to scheduled jobs
- Start with one AI platform (ChatGPT) and one parsing approach, then expand
- Implement multi-tenant data model from day 1 even for single tenant to avoid migration later

## Sources

### HIGH Confidence (Official Documentation & Current Tools)
- **BullMQ Official Docs** (2025): https://docs.bullmq.io/ - Background job queue architecture, retry patterns, rate limiting
- **TimescaleDB for PostgreSQL** (2025): https://github.com/timescale/timescaledb - Time-series data storage, hypertables, compression
- **OpenAI Structured Outputs** (2025): GPT-4 structured output API with schema validation
- **Microsoft Azure Well-Architected Framework** (2025): https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/observability - Monitoring system architecture patterns

### MEDIUM Confidence (Industry Best Practices, Multiple Sources)
- **Multi-Tenant Database Patterns** (2025): https://daily.dev/blog/multi-tenant-database-design-patterns-2024 - Shared schema vs database-per-tenant tradeoffs
- **API Rate Limiting Patterns** (2025): https://orq.ai/blog/api-rate-limit, https://api7.ai/blog/10-common-api-resilience-design-patterns - Circuit breakers, exponential backoff, token buckets
- **LLM Structured Extraction** (2025): https://simonwillison.net/2025/Feb/28/llm-schemas/ - Schema-based parsing with Pydantic/Zod
- **Node.js Cron Best Practices** (2025): https://betterstack.com/community/guides/scaling-nodejs/node-cron-scheduled-tasks/ - Idempotent jobs, monitoring, distributed systems

### LOW Confidence (WebSearch only, requires validation)
- **Webhooks vs Polling** (2025): Multiple sources suggest hybrid approach for modern systems - needs project-specific validation
- **PostgreSQL Row-Level Security for Multi-Tenancy**: Common pattern but performance implications need testing at scale

### Verification Notes
- All major libraries (BullMQ, TimescaleDB) verified via official GitHub repos and documentation (2025)
- Architecture patterns validated against multiple independent sources (Microsoft, API7, industry blogs)
- AI platform integration patterns based on current OpenAI/Anthropic API documentation
- Scalability numbers (API calls, storage) are estimates based on typical GEO monitoring workloads—should be validated with actual usage
