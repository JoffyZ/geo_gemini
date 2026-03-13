# External Integrations

**Analysis Date:** 2026-03-13

## APIs & External Services

**LLM Model APIs (via GPTProto Gateway):**
- **GPTProto Gateway** - Unified LLM API proxy
  - Base URL: `https://gptproto.com/v1`
  - SDK/Client: stdlib `urllib.request`
  - Auth: Bearer token via `GPTPROTO_API_KEY` environment variable or `~/.config/gptproto/api_key`
  - Models supported:
    - `gpt-5-mini` (ChatGPT) - Cost: $0.15/1M input, $0.60/1M output tokens
    - `claude-haiku-4-5-20251001` (Claude) - Cost: $0.80/1M input, $4.00/1M output tokens
  - API Style: Supports both "responses" (ChatGPT) and "chat" (Claude) formats
  - Files: `src/collector.py` (lines 22-72), `src/analyzer.py` (lines 12-24)
  - Usage: Web search + LLM analysis in `collect_batch()` and `analyze_response()`

**Google Gemini API:**
- **Google AI Studio** - Gemini model API
  - Base URL: `https://generativelanguage.googleapis.com/v1beta`
  - SDK/Client: stdlib `urllib.request`
  - Auth: Bearer token via `GEMINI_API_KEY` environment variable or `~/.config/aistudio/api_key`
  - Model: `gemini-2.5-flash` - Cost: $0.15/1M input, $0.60/1M output tokens
  - API Style: "aistudio" format with Google Search tool integration
  - Files: `src/collector.py` (lines 25-26, 64-72)
  - Usage: Web search + LLM analysis via `collect_batch()`
  - Features: Includes Google Search tool (`{"googleSearch": {}}`) for web results

**Web Search:**
- **Integrated Web Search** - Via LLM API tools:
  - ChatGPT: Web search capability enabled in prompts
  - Claude: Web search capability enabled in prompts
  - Gemini: Google Search tool integrated (`tools: [{"googleSearch": {}}]`)
  - Timeout: 90 seconds for web search operations
  - Files: `src/collector.py` (line 42, function `_search_web()` and `collect_batch()`)

## Data Storage

**Databases:**
- **SQLite** - Local embedded database
  - Location: `/Users/joffy/Site/geo/data/geo.db` (target) or `/root/projects/geo/data/geo.db` (production)
  - Connection: stdlib `sqlite3`
  - Client: Direct connection via `sqlite3.connect(DB_PATH)`
  - Tables:
    - `monitor_runs` - Tracks collection runs (run_type, status, token counts, costs)
    - `raw_responses` - Stores LLM responses (prompt, engine, model, raw_text, brand_mentioned, citations, analysis_json)
    - `prompt_library` - Prompt catalog (50 monitoring prompts with categories and priorities)
  - Indexes: `idx_responses_run_id`, `idx_responses_brand`, `idx_prompts_category`
  - Files: `src/storage.py` (initialization), `src/collector.py`, `src/analyzer_report_v2.py`

**File Storage:**
- **Local Filesystem** - No cloud storage
  - Configuration: `config/` directory
    - `config/prompts.json` - Prompt library (50 GEO keywords across 5 categories)
    - `config/notify.json` - Notification targets (Feishu webhook/app credentials)
    - `config/notify.example.json` - Example configuration template
  - Reports: `reports/` directory
    - Markdown format: `2026-W11-full-analysis.md`, `2026-W11-brand-analysis.md`, etc.
  - Data: `data/geo.db`
  - Logs: `logs/` directory (created by `weekly_job.sh`)
  - Files: `src/run_full.py`, `src/analyzer_report_v2.py`

**Caching:**
- Not detected - No caching layer configured

## Authentication & Identity

**Auth Provider:**
- **Custom** - Environment variable based
  - API key management:
    - `GPTPROTO_API_KEY` - GPTProto gateway token (loads from env or `~/.config/gptproto/api_key`)
    - `GEMINI_API_KEY` - Google AI Studio token (loads from env or `~/.config/aistudio/api_key`)
  - Implementation: Direct Bearer token headers in HTTP requests
  - Files: `src/collector.py` (lines 28-39)
  - No OAuth, JWT, or managed identity service

**Internal Secrets:**
- Location: `~/.config/gptproto/api_key`, `~/.config/aistudio/api_key`
- Backup: `~/.config/geo/secrets` (mentioned in CONTEXT.md for manual sync)

## Monitoring & Observability

**Error Tracking:**
- Not detected - No third-party error tracking service

**Logs:**
- **File-based logging**
  - Output: `logs/weekly_*.log` directory with timestamp-based log files
  - Format: Plain text with timestamps (`[YYYY-MM-DD HH:MM:SS]` format)
  - Implementation: Bash script output redirection in `weekly_job.sh`
  - Files: `weekly_job.sh` (lines 7-8, 2>&1 redirection)
  - Verbosity: Tracks collection step, report generation, push status, completion

**Metrics:**
- **Token Usage Tracking**
  - Fields: `tokens_input`, `tokens_output`, `tokens_total`, `total_cost_usd`
  - Storage: `raw_responses` and `monitor_runs` tables in SQLite
  - Calculation: Per-response tracking with aggregation at run level
  - Files: `src/storage.py` (token fields in schema), `src/collector.py` (cost calculation)

## CI/CD & Deployment

**Hosting:**
- Not deployed - Internal tool running on local/private servers
- Execution: Manual Python scripts or scheduled cron jobs

**CI Pipeline:**
- Not detected - No CI/CD system configured
- Automation: Bash cron job for weekly execution
  - Job ID: `5ad55e40-...` (mentioned in CONTEXT.md)
  - Schedule: Every Monday 08:00 Asia/Shanghai timezone
  - Script: `weekly_job.sh`

**Scheduled Jobs:**
- **Weekly Report Generation**
  - Script: `/Users/joffy/Site/geo/weekly_job.sh`
  - Steps:
    1. Run full collection: `python3 src/run_all_batched.py`
    2. Generate report: `python3 src/analyzer_report.py --run-ids {RUN_ID}`
    3. Push to Feishu: `python3 src/notify.py --report {REPORT_PATH}`
  - Frequency: Weekly (Monday 08:00 Asia/Shanghai)
  - Logging: Timestamped logs in `logs/weekly_*.log`

## Environment Configuration

**Required env vars:**
- `GPTPROTO_API_KEY` - GPTProto gateway authentication (ChatGPT + Claude models)
- `GEMINI_API_KEY` - Google Gemini API authentication

**Optional env vars:**
- None detected - All optional configs use config file fallback

**Secrets location:**
- Environment variables: `$GPTPROTO_API_KEY`, `$GEMINI_API_KEY`
- File fallback:
  - `~/.config/gptproto/api_key` - GPTProto key
  - `~/.config/aistudio/api_key` - Gemini key
- Backup location: `~/.config/geo/secrets` (mentioned for manual sync in CONTEXT.md)

**Config file locations:**
- `config/prompts.json` - Prompt library (required for collection)
- `config/notify.json` - Feishu notification config (optional, auto-creates groups if missing)

## Webhooks & Callbacks

**Incoming:**
- Not detected - No webhook endpoints implemented

**Outgoing:**
- **Feishu Webhooks** - Report distribution
  - Service: Feishu (飞书) - Alibaba's enterprise communication platform
  - Configuration: `config/notify.json`
  - Auth Methods:
    - Webhook mode: Direct webhook URL (simpler, supports single group)
    - App mode: App ID + Secret (supports multiple groups/chats)
  - Targets: Group chats configured with `chat_id` and `enabled` flag
  - URL Format: `https://{tenant_domain}.feishu.cn/docx/{doc_id}`
  - Implementation: `src/notify.py`, `src/notify_v2.py`
  - Features:
    - Markdown to Feishu Blocks conversion (supports bold, italic, code, strikethrough)
    - Full report upload to Feishu Doc (docx API)
    - Permission management: `anyone_readable` link sharing + member access control
    - Report types: weekly, brand_check
  - Files: `src/notify.py` (deprecated, marked as DEPRECATED), `src/notify_v2.py` (active version)

**Feishu Integration Details:**
- **API Endpoints Used:**
  - `POST /im/v1/messages` - Send messages to chats
  - `POST /drive/v1/files` - Create documents
  - `PATCH /drive/v1/permissions/{doc_id}/public` - Set public sharing
  - `POST /drive/v1/permissions/{doc_id}/members` - Add member permissions
- **Bot Permissions Required:**
  - `docx:document` - Create/edit documents
  - `drive:file` - File operations
  - `docs:permission:member:create` - Member permission management
  - `im:chat` - Send messages to chats
- **Feishu Channels:** Group chat `oc_ca3c110b00634571ceafede013362cf5` (GEO报告群)

**Data Flow:**
1. Collection: `run_full.py` → SQLite `geo.db`
2. Analysis: `analyzer_report_v2.py` → Markdown file in `reports/`
3. Distribution: `notify_v2.py` → Feishu API → Group chat notifications

---

*Integration audit: 2026-03-13*
