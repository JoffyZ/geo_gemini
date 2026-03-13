# Technology Stack

**Analysis Date:** 2026-03-13

## Languages

**Primary:**
- Python 3.9.6 - Backend processing, data collection, analysis, and reporting

## Runtime

**Environment:**
- Python 3.9.6 (available via system python3)
- Unix-based OS (compatible with bash scripts)

**Package Manager:**
- pip (Python dependency management)
- Lockfile: Not detected (project uses standard library only)

## Frameworks

**Core:**
- Standard Library urllib - HTTP requests via `urllib.request`, `urllib.error` for API calls
- Standard Library json - JSON serialization/deserialization
- Standard Library sqlite3 - Local database operations
- Standard Library argparse - CLI argument parsing

**Testing:**
- Not detected

**Build/Dev:**
- Bash shell scripting for automation (`weekly_job.sh`)

## Key Dependencies

**Critical:**
- sqlite3 (stdlib) - Data persistence in `geo.db`
- urllib (stdlib) - HTTP client for API communication with GPTProto and Google APIs
- json (stdlib) - Configuration and API payload handling
- datetime (stdlib) - Timestamp management for monitoring runs
- typing (stdlib) - Type hints for Python code
- statistics (stdlib) - Used for calculating median positions across multiple samples
- collections (stdlib) - Counter and defaultdict for analysis
- pathlib (stdlib) - Cross-platform file path handling

**Infrastructure:**
- None detected - project uses standard library exclusively, no third-party package dependencies

## Configuration

**Environment:**
- Configuration files in `config/` directory
- API keys loaded from environment variables or local config files:
  - `GPTPROTO_API_KEY` - Set via env var or `~/.config/gptproto/api_key`
  - `GEMINI_API_KEY` - Set via env var or `~/.config/aistudio/api_key`
- Database path: `/root/projects/geo/data/geo.db` (hardcoded in `storage.py`)
- Prompt library: `config/prompts.json` - 50 GEO monitoring prompts across 5 categories
- Notification config: `config/notify.json` - Feishu webhook/app credentials (when configured)

**Build:**
- No build system required - pure Python scripts
- Entry points: `src/run_full.py`, `src/run_all_batched.py`, `src/analyzer_report_v2.py`

## Platform Requirements

**Development:**
- Python 3.9+
- Bash shell
- File system access to `~/.config/` for API keys
- Network access for HTTP requests to:
  - `https://gptproto.com/v1` - ChatGPT/Claude API gateway
  - `https://generativelanguage.googleapis.com/v1beta` - Google Gemini API
  - `https://open.feishu.cn` - Feishu (optional, for report notifications)

**Production:**
- Same as development environment
- Network connectivity required for:
  - LLM API calls (gptproto-gpt, gptproto-claude, gptproto-gemini)
  - Feishu webhook delivery (if notifications enabled)
- File system: Write access to `data/`, `reports/`, `logs/` directories
- Scheduler: cron or equivalent for `weekly_job.sh` (weekly Monday 08:00 Asia/Shanghai)

---

*Stack analysis: 2026-03-13*
