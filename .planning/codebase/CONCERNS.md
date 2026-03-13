# Codebase Concerns

**Analysis Date:** 2026-03-13

## Security Issues

**Hardcoded API Key in Source Code:**
- Issue: API key embedded directly in `src/analyzer.py` line 14
- Files: `src/analyzer.py`
- Risk: API credentials exposed in version control history and any shared code
- Current mitigation: None
- Recommendations: Move to environment variable `GPTPROTO_API_KEY`, use `os.environ.get()` pattern like `collector.py` does. Remove from git history with `git filter-branch` or `BFG Repo-Cleaner`.

**Insecure API Key Loading:**
- Issue: `.env` files loaded but no validation that keys exist or are valid
- Files: `src/collector.py` (lines 28-39)
- Risk: Silent failures if key files missing, no error indication to users
- Current mitigation: Fallback to environment variables exists
- Recommendations: Add explicit error handling and user feedback when API keys cannot be loaded

## Tech Debt

**Multiple Deprecated/Backup Files:**
- Issue: Code duplication with v1/v2 variants and `.bak` files
- Files: `src/analyzer_report.py`, `src/analyzer_report_v2.py`, `src/analyzer_report_v2.py.bak`, `src/notify.py`, `src/notify_v2.py`, `src/reporter.py`, `src/reporter_v3.py`
- Impact: Maintenance burden, unclear which version is production, increased codebase complexity
- Fix approach: Audit which versions are actually used in workflows, delete inactive versions, consolidate active ones

**Hardcoded Database Path:**
- Issue: Database path hardcoded to `/root/projects/geo/data/geo.db` in multiple files
- Files: `src/analyzer_report_v2.py` (line 12), `src/storage.py` (line 15), `src/analyzer.py` (line 14 - in notify)
- Impact: Not portable, breaks in non-root environments, difficult to test
- Fix approach: Use environment variable `GEO_DB_PATH` with fallback, pass through all function calls

**Hardcoded Configuration Paths:**
- Issue: Multiple hardcoded paths in source code
- Files: `src/notify.py` (line 19, 328), `src/run_full.py` (lines 22-23), `src/run_collection_only.py`
- Examples: `/root/projects/geo/config/notify.json`, `/root/projects/geo/reports/`
- Impact: Environment-dependent, not deployable elsewhere
- Fix approach: Create `.env` config file or environment variable system

**Direct urllib Usage Without Constants:**
- Issue: API URLs hardcoded in multiple places, timeout values scattered
- Files: `src/collector.py`, `src/notify.py`
- Impact: Difficult to update endpoints, inconsistent behavior
- Fix approach: Create centralized config module with all API endpoints and timeouts

## Performance Bottlenecks

**Database Queries Without Pagination:**
- Issue: `fetch_run_data()` in `analyzer_report_v2.py` loads entire dataset into memory
- Files: `src/analyzer_report_v2.py` (lines 96-109)
- Cause: Large runs (50 prompts × 3 engines = 150+ rows) load all at once
- Impact: Memory usage grows linearly with data volume, potential OOM on large datasets
- Improvement path: Implement streaming/pagination for > 100 rows

**JSON Parsing Overhead:**
- Issue: All JSON data (citations, analysis) stored as TEXT in SQLite, parsed on every read
- Files: `src/storage.py` (raw_responses table), `src/analyzer_report_v2.py` (parse_analysis_json lines 122-129)
- Impact: Repeated parsing on same data, unused fields parsed (e.g., citations rarely used)
- Improvement path: Store only needed fields, cache parsed results, or use JSON1 SQLite extension

**Multiple HTTP Requests Per Prompt:**
- Issue: `collect_median()` makes 3 HTTP calls per prompt to get median values
- Files: `src/collector.py` (lines 298-349)
- Impact: 150 prompts × 3 engines × 3 samples = 1350 API calls per full run (90 min+ runtime)
- Improvement path: Consider confidence-based adaptive sampling (stop early if consistent)

**N+1 Queries in Analysis:**
- Issue: `find_opportunity_prompts()` loads full data then filters in memory instead of SQL
- Files: `src/analyzer_report_v2.py` (lines 375-412)
- Impact: Loads all 150+ rows, iterates multiple times for different metrics
- Improvement path: Use SQL GROUP BY and HAVING for filtering

## Fragile Areas

**Brand Mention Detection Regex:**
- Files: `src/collector.py` (lines 84-112)
- Why fragile: Complex regex assumes specific numbering format (1-20 range), only handles English ordinals, could miss mentions in tables/lists
- Safe modification: Add unit tests for edge cases (year numbers, multiple ordinals, unusual layouts)
- Test coverage: No tests found
- Risk: Position values may be incorrect, affecting analytics

**API Response Parsing:**
- Files: `src/collector.py` (lines 169-220)
- Why fragile: Different parsing logic for each API style (responses/chat/aistudio), no schema validation, fields may be missing
- Safe modification: Add response validation schema, common parsing pipeline
- Test coverage: No tests, only handles "happy path"
- Risk: API changes break data collection silently

**JSON Analysis Response Handling:**
- Files: `src/analyzer.py` (lines 113-137)
- Why fragile: Multiple fallback regex patterns to extract JSON from markdown, no strict validation
- Safe modification: Use `json.JSONDecodeError` catch-all could hide actual issues
- Risk: If LLM changes format, analysis silently fails or returns defaults without indication

**Database Schema Evolution:**
- Files: `src/storage.py` (lines 92-115)
- Why fragile: Uses ALTER TABLE to add missing columns, no version tracking
- Safe modification: Could fail if columns already exist (shouldn't), no rollback mechanism
- Risk: Schema drift if multiple instances run, data integrity issues

**Error Handling is Silent:**
- Issue: Most error returns are caught but only logged, exceptions swallowed
- Files: `src/analyzer.py` (lines 141-146), `src/collector.py` (lines 270-278), `src/notify.py` (lines 191-193)
- Impact: Failed analyses return `{"error": "..."}` but caller doesn't always check, continues with defaults
- Risk: Misleading reports with failed data marked as successful

## Scaling Limits

**SQLite Single-Writer Bottleneck:**
- Current capacity: ~10,000 rows per day (150 rows × 5 runs)
- Limit: SQLite locks on write, multiple `save_response()` calls will serialize; concurrent runs fail
- Files: `src/storage.py` (save_response function)
- Scaling path: Migrate to PostgreSQL for concurrent writers, implement connection pooling

**API Rate Limiting Not Implemented:**
- Current capacity: No backoff for rate limits, assumes unlimited quota
- Files: `src/collector.py` (lines 283-295)
- Limit: APIs will reject requests when rate limit hit, no recovery strategy
- Scaling path: Implement exponential backoff with jitter, queue retry mechanism, respect X-RateLimit headers

**In-Memory Report Generation:**
- Issue: `generate_report()` builds full 1000+ line report in memory before writing
- Files: `src/analyzer_report_v2.py` (lines 682-967)
- Limit: With more prompts/engines, list grows unbounded
- Scaling path: Stream report to file incrementally, reduce output verbosity

## Missing Critical Features

**No Run Validation:**
- Problem: Completed runs marked with status='completed' even if some queries failed
- Blocks: Can't distinguish partial failures from full success in downstream analysis
- Files: `src/run_full.py` (lines 120-129)
- Fix: Add explicit status enum (completed, partial, degraded) and validation checks

**No Data Consistency Checks:**
- Problem: If `brand_mentioned=False` but `brand_position > 0`, data is inconsistent
- Blocks: Analytics can't trust position data for filtering/sorting
- Files: `src/storage.py` (lines 191-194) implements one-way protection but doesn't check existing
- Fix: Add database constraint, validation before use

**No Credential Rotation:**
- Problem: Hardcoded/environment API keys never expire or rotate
- Blocks: Can't respond to key compromise without code changes
- Files: Multiple files with static key loading
- Fix: Implement key rotation system with versioning

**No Query Result Caching:**
- Problem: Same analysis queries run repeatedly (trending comparison checks full history each time)
- Blocks: Each report takes full query time, no incremental updates
- Files: `src/analyzer_report_v2.py` (get_previous_run_id, fetch_run_data)
- Fix: Cache query results keyed by run_id, implement invalidation on new data

**No Monitoring/Observability:**
- Problem: No logging of execution times, error rates, or performance metrics
- Blocks: Can't detect degradation, spot anomalies, or optimize
- Files: All modules have minimal logging
- Fix: Add structured logging with timestamps, durations, success rates

## Test Coverage Gaps

**No Test Suite Exists:**
- What's not tested: All core functions lack unit tests
- Files: `src/collector.py`, `src/storage.py`, `src/analyzer.py`, `src/analyzer_report_v2.py`
- Risk: Refactoring breaks silently, regressions undetected
- Priority: High - affects data quality

**API Integration Untested:**
- What's not tested: HTTP calls to gptproto, Feishu, Gemini APIs
- Files: `src/collector.py` (lines 125-164), `src/notify.py` (lines 196-281)
- Risk: API changes break collection, failed uploads not noticed
- Priority: High - core functionality

**Database Operations Untested:**
- What's not tested: SQL queries, schema migrations, concurrent access
- Files: `src/storage.py` entire module
- Risk: Data corruption, queries fail silently, schema conflicts
- Priority: High - data integrity

**Report Generation Untested:**
- What's not tested: Markdown formatting, table generation, calculations
- Files: `src/analyzer_report_v2.py` (lines 239-645)
- Risk: Formatting breaks for edge cases, calculations wrong for unusual data distributions
- Priority: Medium - mostly display logic

**Brand Mention Detection Untested:**
- What's not tested: Edge cases in regex, position extraction, language variations
- Files: `src/collector.py` (lines 84-112)
- Risk: False positives/negatives in core metric
- Priority: High - data quality affects all analytics

## Dependencies at Risk

**Deprecated notify.py Version:**
- Risk: Two active notify implementations (notify.py marked deprecated, notify_v2.py exists)
- Impact: Unclear which to use, maintenance burden, potential for wrong one to run
- Files: `src/notify.py`, `src/notify_v2.py`
- Migration plan: Consolidate to single notify module, add feature flags if needed during transition

**urllib vs requests:**
- Risk: Raw urllib used instead of requests library (no built-in retry, session management)
- Impact: More verbose code, more error handling needed, less resilient
- Files: All HTTP calling modules
- Migration plan: Migrate to requests library for robustness (or httpx for async when needed)

## Known Bugs

**Inconsistent Token Counting:**
- Symptoms: `tokens_total` sometimes calculated differently
- Files: `src/collector.py` (line 264: `tokens_total = tin + tout`), `src/storage.py` (line 218: also summed)
- Cause: Some paths calculate, others sum separately; unclear if both approaches match
- Workaround: None - data may be inconsistent
- Priority: High - affects cost reporting

**Average Position Calculation with Zero Values:**
- Symptoms: `avg_position` could be 0 when brand_position is 0 (unmentioned)
- Files: `src/storage.py` (lines 285-286)
- Cause: CASE statement allows 0 values to be averaged with valid positions
- Impact: Position metrics misleading when mention rate is low
- Priority: Medium - analytics impact

**Silent JSON Parse Failures in Analysis:**
- Symptoms: If LLM returns invalid JSON, defaults are returned without notification
- Files: `src/analyzer.py` (lines 123-137)
- Cause: JSONDecodeError caught broadly, returns defaults
- Impact: Reports don't indicate failed analysis
- Priority: Medium - quality assurance

---

*Concerns audit: 2026-03-13*
