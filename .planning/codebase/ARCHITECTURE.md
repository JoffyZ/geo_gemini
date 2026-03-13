# Architecture

**Analysis Date:** 2026-03-13

## Pattern Overview

**Overall:** Pipeline/ETL (Extract-Transform-Load) with closed-loop monitoring

**Key Characteristics:**
- Multi-engine data collection with consensus via median sampling
- Modular layer design: collection → analysis → storage → reporting
- Configuration-driven prompt management (50 prompts across 5 categories)
- Three LLM backends (ChatGPT, Claude, Gemini) unified through adapter pattern
- SQLite-based historical data persistence for trend analysis
- Feishu integration for automated weekly reporting

## Layers

**Collection Layer:**
- Purpose: Fetch responses from multiple LLM engines via web search APIs
- Location: `src/collector.py`
- Contains: Multi-engine adapter functions, brand mention detection, token tracking
- Depends on: gptproto.com API (ChatGPT/Claude), Google Generative AI API (Gemini)
- Used by: Run orchestration scripts (`run_full.py`, `run_all_batched.py`)

**Analysis Layer:**
- Purpose: Extract sentiment, competitor mentions, and recommendation reasons via LLM analysis
- Location: `src/analyzer.py`
- Contains: LLM-based text analysis with structured JSON output, sentiment classification
- Depends on: Collection layer outputs (raw_text), Claude API for analysis
- Used by: Run orchestration scripts during result storage

**Storage Layer:**
- Purpose: Persist raw responses, analysis results, and historical runs to SQLite
- Location: `src/storage.py`
- Contains: Database schema (monitor_runs, raw_responses, prompt_library), ORM functions
- Depends on: Python sqlite3, datetime utilities
- Used by: All data-persisting components (collection, analysis, reporting)

**Reporting Layer:**
- Purpose: Generate weekly aggregation reports with category breakdowns and trend analysis
- Location: `src/reporter.py`, `src/reporter_v3.py`
- Contains: Category statistics, mention rate calculations, competitor tracking, historical comparison
- Depends on: Storage layer (queries), Markdown generation
- Used by: Weekly automation and manual report generation

**Notification Layer:**
- Purpose: Push generated reports to Feishu with Markdown rendering and document upload
- Location: `src/notify.py`, `src/notify_v2.py`
- Contains: Markdown-to-Feishu block conversion, document creation, permission management
- Depends on: Feishu Open API, report files
- Used by: Automated scheduling and manual distribution

## Data Flow

**Collection Run (Full Pipeline):**

1. Load 50 prompts from `config/prompts.json` (5 categories: brand_direct, category_general, competitor, ai_scene, long_tail)
2. For each prompt × engine combination:
   - Call `collect_median()`: execute 3 samples with retry logic
   - Extract brand mention status and position (1-20 range)
   - Collect citations and token counts
   - Detect position anomalies (enforced 1-20 range to avoid year misidentification)
3. Analyze each response via LLM:
   - Sentiment classification (positive/neutral/negative)
   - Recommendation reasons (max 3)
   - Negative flags and competitor mentions
   - Key descriptors
4. Store raw responses + analysis to SQLite raw_responses table with run_id reference
5. Finalize run record with aggregated stats (tokens, cost, success count)

**Report Generation:**

1. Query latest completed full_batched run
2. Load all responses from run with category join
3. Calculate category-level statistics:
   - Overall mention rate per category
   - Per-engine breakdown
   - Average position calculations
   - Total token and cost rollup
4. Compare with previous full_batched run for trend analysis
5. Generate Markdown report with category tables and opportunity analysis
6. (Optional) Upload report to Feishu, send summary message

**State Management:**
- In-memory: Prompt lists, engine configurations, API keys (from environment)
- Persistent: SQLite database (`data/geo.db`) stores all historical runs and responses
- Configuration: JSON files (`config/prompts.json`) define prompt catalog and metadata
- Transient: Reports generated in `reports/` directory as Markdown files

## Key Abstractions

**Engine Adapter Pattern:**
- Purpose: Unify three heterogeneous LLM APIs (gptproto responses/chat, Gemini aistudio)
- Examples: `_call_gptproto_responses()`, `_call_gptproto_chat()`, `_call_gemini()` in `src/collector.py`
- Pattern: Separate call and parse functions per engine, routed by `collect_one()` based on api_style config

**Median Consensus:**
- Purpose: Reduce noise by running each prompt 3 times and selecting median values
- Examples: `collect_median()` in `src/collector.py` (lines 298-349)
- Pattern: Collect successful results, compute statistics.median() for position/duration/tokens, take longest text

**Brand Mention Detection:**
- Purpose: Identify and rank product mentions in LLM responses
- Examples: `detect_brand_mention()` in `src/collector.py` (lines 84-112)
- Pattern: Sequential detection (numbered list → ordinal words), sanitize to 1-20 range, fallback to boolean if no position found

**Run Lifecycle:**
- Purpose: Track collection execution with start/finish markers and aggregated metrics
- Examples: `start_run()`, `finish_run()`, `get_run_stats()` in `src/storage.py`
- Pattern: Create monitor_runs record at start, update with final status/stats at completion

## Entry Points

**Manual Collection:**
- Location: `src/run_full.py`
- Triggers: `python3 src/run_full.py --engines gptproto-gpt,gptproto-claude,gptproto-gemini`
- Responsibilities: Load prompts, orchestrate collection, store results, print summary

**Batch Collection (Multiple Runs):**
- Location: `src/run_all_batched.py`
- Triggers: Cron job or manual execution for weekly full runs
- Responsibilities: Execute multiple full runs with interval spacing, aggregate metrics

**Report Generation:**
- Location: `src/reporter.py` (deprecated but functional), `src/reporter_v3.py`
- Triggers: `python3 src/reporter.py --latest --brand HelloTalk --output-dir reports`
- Responsibilities: Query database, compute statistics, generate Markdown report

**Report Distribution:**
- Location: `src/notify.py`, `src/notify_v2.py`
- Triggers: `python3 src/notify_v2.py --report reports/2026-W11.md --type weekly`
- Responsibilities: Parse Markdown, convert to Feishu blocks, upload document, send message

**Database Initialization:**
- Location: `src/storage.py` (main block)
- Triggers: `python3 src/storage.py` (one-time setup)
- Responsibilities: Create tables, add indexes, initialize default prompts

## Error Handling

**Strategy:** Collect-then-log with partial success recovery

**Patterns:**
- Retry mechanism: `collect_with_retry()` in `src/collector.py` (lines 284-295) performs up to 2 retries with 3-second delay
- Graceful degradation: `collect_median()` filters out failed samples, returns best attempt if all fail
- Error logging: HTTP errors, JSON decode errors, timeouts stored in `error` field of response record
- Consistency protection: If brand_mentioned=False, brand_position forced to 0 to prevent orphaned positions
- Position validation: Only accept 1-20 integer positions; treat out-of-range values as "position unknown" (0)

## Cross-Cutting Concerns

**Logging:**
- Approach: Print progress to stdout during runs (collection progress, savings progress), store error details in database error field
- No persistent logging framework; errors accessible via query of raw_responses.error field

**Validation:**
- Approach: Input validation in `collect_one()` checks engine name against ENGINES dict, position validation enforces 1-20 range
- Brand mention detection uses regex patterns with fallback to simple substring match

**Authentication:**
- Approach: Load API keys from environment variables or disk cache paths:
  - gptproto (ChatGPT/Claude): `~/.config/gptproto/api_key`
  - Gemini: `~/.config/aistudio/api_key`
- Fallback order: ENVIRON → disk paths → empty string (API calls will fail)
- No token refresh mechanism; assumes keys are long-lived

**Cost Tracking:**
- Approach: Calculate per-engine cost based on token counts and configured rates (input/output pricing per 1M tokens)
- Store total_cost_usd in monitor_runs for billing tracking
- Cost calculation: `calculate_cost()` in `src/collector.py` (lines 386-391)

**Token Management:**
- Approach: Track input_tokens, output_tokens, tokens_total per response and aggregate to run level
- Used for cost calculation, performance analysis (tokens per duration), and API usage monitoring
