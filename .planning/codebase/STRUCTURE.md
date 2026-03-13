# Codebase Structure

**Analysis Date:** 2026-03-13

## Directory Layout

```
/Users/joffy/Site/geo/
├── src/                    # Core application code (Python)
├── config/                 # Configuration and prompts
├── data/                   # SQLite database
├── reports/                # Generated weekly reports (Markdown)
├── design/                 # Architecture and API documentation
├── docs/                   # GEO operating SOP and requirements
├── research/               # Scout research output
├── tasks/                  # Task specifications and subtasks
├── notes/                  # Decision logs and notes
├── CONTEXT.md              # Project context (mandatory pre-read for all agents)
├── PRD.md                  # Product requirement document v0.1
├── README.md               # Project overview
├── TASKS.md                # Task management hub (milestone status)
├── weekly_job.sh           # Cron job script for weekly automation
└── .planning/codebase/     # GSD codebase documentation (this directory)
```

## Directory Purposes

**`src/` - Core Application Code:**
- Purpose: Primary Python modules implementing the collection, analysis, storage, and reporting pipeline
- Contains: Executable scripts and reusable modules
- Key files:
  - `collector.py`: Multi-engine data collection with retry and median sampling
  - `analyzer.py`: LLM-based sentiment and metadata extraction
  - `storage.py`: SQLite database schema and persistence functions
  - `reporter.py`, `reporter_v3.py`: Report generation with aggregation logic
  - `notify.py`, `notify_v2.py`: Feishu integration for report distribution
  - `run_full.py`: Main entry point for full collection runs
  - `run_all_batched.py`: Multi-run orchestration for weekly batch processing
  - `run_demo.py`: M1 demo script (reference/legacy)
  - `run_brand_check.py`: Brand-specific monitoring runs
  - `run_collection_only.py`: Collection without analysis/storage (testing)
  - `analyzer_report.py`, `analyzer_report_v2.py`: Report analysis utilities

**`config/` - Configuration and Prompt Management:**
- Purpose: Store application configuration and the canonical prompt library
- Contains: JSON files and documentation
- Key files:
  - `prompts.json`: 50 monitoring prompts organized by category (brand_direct, category_general, competitor, ai_scene, long_tail) with priority levels 1-3
  - `notify.example.json`: Template for Feishu notification config
  - `API-CHECKLIST.md`: API endpoint verification guide

**`data/` - Data Persistence:**
- Purpose: SQLite database for all collected data and historical runs
- Contains: `geo.db` (database file)
- Schema: Three main tables (monitor_runs, raw_responses, prompt_library) with indexes on run_id, brand_mentioned, category

**`reports/` - Report Output:**
- Purpose: Weekly aggregation reports generated for distribution
- Contains: Markdown files named by week and report type (e.g., `2026-W11-full-analysis.md`)
- Naming pattern: `YYYY-WXX-{type}.md` where type = full-analysis, brand-analysis, run-specific

**`design/` - Architecture Documentation:**
- Purpose: API research, verified integration formats, report template examples
- Contains:
  - `api-research.md`: Initial API investigation notes
  - `api-verified.md`: Confirmed endpoint formats (gptproto responses/chat, Gemini aistudio)
  - `report-template.md`: Markdown template for weekly reports

**`docs/` - Project Documentation:**
- Purpose: GEO operating SOP, requirement specifications, milestone documentation
- Contains:
  - `GEO-SOP.md`: Complete operating procedure for GEO workflow
  - `REQ-M4.md`: Requirement doc for milestone 4 (first complete weekly report)

**`research/` - Market Intelligence:**
- Purpose: Competitive analysis and market research output from Scout agent
- Contains: Research notes on competitors, market trends, product analysis

**`tasks/` - Task Specifications:**
- Purpose: Detailed task breakdowns and subtask documentation
- Contains: Individual task files for T001, T002, T003, etc. with acceptance criteria

**`notes/` - Decision Logs:**
- Purpose: Record of architectural and product decisions with rationale
- Contains: `decisions.md` documenting key decisions and their justification

## Key File Locations

**Entry Points:**
- `src/run_full.py`: Primary entry for full collection runs (150 requests: 50P × 3 engines)
- `src/run_all_batched.py`: Batch orchestration entry point (multiple runs with intervals)
- `src/reporter.py`: Report generation entry (deprecated but functional)
- `src/reporter_v3.py`: Latest report generation implementation
- `src/notify_v2.py`: Report distribution to Feishu (latest version)

**Configuration:**
- `config/prompts.json`: Canonical prompt library (50 items, 5 categories, priorities 1-3)
- `.env` (if present): Environment variables (not tracked in git, read by collector.py)
- API key paths: `~/.config/gptproto/api_key`, `~/.config/aistudio/api_key`

**Core Logic:**
- `src/collector.py`: Lines 225-282 (collect_one), 284-295 (retry), 298-349 (median sampling), 352-383 (batch collection)
- `src/analyzer.py`: Lines 55-146 (analyze_response) - sentiment and metadata extraction
- `src/storage.py`: Lines 25-118 (init_db with schema), 181-224 (save_response), 269-306 (get_run_stats)

**Testing:**
- `src/run_demo.py`: Demo script for early validation (M1 phase, uses 4 prompts)
- `src/run_brand_check.py`: Brand-specific test runs
- `src/run_collection_only.py`: Collection without storage (debug mode)

## Naming Conventions

**Files:**
- `{module}.py`: Core module files (collector, analyzer, storage)
- `{module}_v{N}.py`: Version variants (reporter_v3.py, notify_v2.py, analyzer_report_v2.py)
- `run_{type}.py`: Executable entry point scripts (run_full, run_demo, run_all_batched)
- `{YYYY}-W{XX}-{type}.md`: Weekly reports with ISO week number
- `.{module}.py.bak`: Backup files (not tracked, kept locally)

**Directories:**
- `src/`, `config/`, `data/`, `reports/`: Lowercase for utility directories
- `design/`, `docs/`, `research/`, `notes/`, `tasks/`: Lowercase for documentation
- `.planning/codebase/`: GSD mapper output location

**Classes and Functions:**
- No classes defined; all functions are module-level
- Function naming: `collect_one()`, `collect_median()`, `_gptproto_headers()` (underscore prefix for internal helpers)
- Database functions: `get_connection()`, `init_db()`, `start_run()`, `save_response()`, `get_run_stats()`

## Where to Add New Code

**New Feature (e.g., new data source or output format):**
- Primary code: Add to appropriate layer module in `src/` (e.g., new engine adapter in `src/collector.py`)
- Tests: Create test script in `src/` with `test_` prefix (not currently used; integration tests via run scripts)
- Configuration: Update `config/prompts.json` if prompt changes needed

**New Engine/LLM Integration:**
- Implementation: Add engine config to `ENGINES` dict in `src/collector.py` lines 47-72
- Add call function: `_call_{provider}()` in collector.py
- Add parse function: `_parse_{provider}()` in collector.py
- Update `collect_one()` routing logic to handle new api_style
- Document format in `design/api-verified.md`

**New Report Type or Analysis:**
- Implementation: Create new function in `src/reporter_v3.py` or extend existing reporter
- Data queries: Use `get_connection()` from storage.py to query monitor_runs and raw_responses
- Output: Generate Markdown file in `reports/` directory
- Distribution: Use notify_v2.py to push to Feishu if needed

**New Prompt Category:**
- Add category definition to `config/prompts.json`
- Update `CATEGORY_NAMES` dict in `src/reporter.py` and `src/reporter_v3.py` for display names
- Update category filter choices in `src/run_full.py` argument parser if user-selectable

**Database Schema Changes:**
- Modification: Edit table creation SQL in `src/storage.py` lines 25-116
- Migration: Add `ALTER TABLE` statements in `init_db()` for backward compatibility (see lines 92-115)
- Index addition: Add CREATE INDEX statements in init_db() before conn.commit()

## Special Directories

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents (ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md)
- Generated: Yes, by `/gsd:map-codebase` command
- Committed: Yes, to track architectural decisions

**`reports/`:**
- Purpose: Generated weekly reports for distribution
- Generated: Yes, by reporter scripts
- Committed: Yes, to maintain historical record for trend analysis

**`data/`:**
- Purpose: SQLite database file (`geo.db`)
- Generated: Yes, by `python3 src/storage.py` initialization
- Committed: No (git ignored), recreated during deployment or populated during runs

**Hidden directories (`.claude/`, `.gemini/`, `.opencode/`, `.codex/`):**
- Purpose: Tool-specific working directories for AI agents (not part of core project)
- Generated: Yes, by respective tools
- Committed: No, gitignored

## Code Placement Guidelines

**Shared utilities/helpers:**
- Path: `src/{module}.py` functions available to import
- Example: `from collector import ENGINES, collect_batch`

**API integration code:**
- Path: Separate call/parse functions in `src/collector.py` for each engine
- Pattern: `_call_{engine}()` and `_parse_{engine}()` with unified return types

**Database queries:**
- Path: Parameterized SQL in `src/storage.py` with connection management in `get_connection()`
- Pattern: Always use `get_connection()`, always close() after cursor operations

**Reporting logic:**
- Path: Statistics calculation in `src/reporter_v3.py` (latest), output generation in same file
- Pattern: Query runs, aggregate by category/engine, format as Markdown

**LLM calls:**
- Path: Synchronous urllib.request calls in collector.py and analyzer.py
- No async framework; sequential execution with time.sleep() between requests to respect rate limits
