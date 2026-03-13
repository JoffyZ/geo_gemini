# Coding Conventions

**Analysis Date:** 2026-03-13

## Language & Framework

**Primary Language:** Python 3 (`#!/usr/bin/env python3`)

**Version Requirements:** Python 3.6+

**Module System:** Standard library focus with external API clients (urllib, json, sqlite3)

## Naming Patterns

**Files:**
- Pattern: `snake_case.py`
- Scripts: Executable scripts at root of `src/` (`run_full.py`, `run_demo.py`, etc.)
- Modules: Named by functionality (`collector.py`, `analyzer.py`, `storage.py`, `reporter.py`)
- Versioning: Files use `_v2`, `_v3` suffixes for updated versions
  - Example: `reporter.py` (deprecated) → `reporter_v3.py` (deprecated) → Current active version
  - Deprecated files marked with comment: `# ⚠️ DEPRECATED — 请使用新版脚本，本文件不再维护`

**Functions:**
- Pattern: `snake_case`
- Private functions: Prefixed with single underscore `_function_name()`
  - Example: `_load_api_keys()`, `_gptproto_headers()`, `_parse_responses_api()`
- Public functions: No underscore prefix
  - Example: `collect_one()`, `analyze_response()`, `get_connection()`

**Variables & Constants:**
- Constants: `UPPERCASE_WITH_UNDERSCORES`
  - Examples: `GPTPROTO_BASE_URL`, `WEB_SEARCH_TIMEOUT`, `DB_PATH`
- Variables: `snake_case`
  - Examples: `brand_mentioned`, `tokens_input`, `run_id`

**Database & Dicts:**
- Pattern: `snake_case` (never camelCase)
- Examples: `brand_mentioned`, `brand_position`, `tokens_input`, `tokens_output`, `tokens_total`

## Code Organization & Structure

**Module Structure:**
Each module follows this layout:
1. Shebang + Module docstring
2. Imports (standard library first, then local)
3. Configuration/Constants section (marked with comment dividers)
4. Helper/Private functions
5. Public functions
6. Main script (if applicable)

**Example from `collector.py`:**
```python
#!/usr/bin/env python3
"""
GEO 数据采集模块 - 核心采集器
支持多引擎：gptproto-gpt, gptproto-claude, gptproto-gemini
每个 Prompt 跑 3 次取中位数

v2: 修复 avg_position bug + 新增 token 监控
"""

import urllib.request
import urllib.error
import json
import time
import re
import os
import statistics
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

# ============ API 配置 ============
GPTPROTO_BASE_URL = "https://gptproto.com/v1"
GPTPROTO_API_KEY = os.environ.get("GPTPROTO_API_KEY", "")

# ============ 引擎配置 ============
ENGINES = { ... }

# ============ 工具函数 ============
def extract_domain(url: str) -> str:
    ...

# ============ 引擎调用 ============
def _call_gptproto_responses(prompt: str, model: str) -> dict:
    ...
```

**Comment Dividers:**
- Use comment blocks to organize code sections: `# ============ Section Name ============`
- Example: `# ============ API 配置 ============`

## Type Hints

**Usage:** Type hints used consistently on function signatures

**Pattern:**
```python
def function_name(param: type, optional_param: Optional[type] = None) -> return_type:
    ...
```

**Examples from codebase:**
- `def collect_one(prompt: str, engine: str = "gptproto-gpt", brand: str = "HelloTalk") -> dict:`
- `def extract_domain(url: str) -> str:`
- `def detect_brand_mention(text: str, brand: str = "HelloTalk") -> tuple:`
- `def save_response(run_id: int, result: dict, analysis: dict = None):`
- `def collect_batch(prompts: List[str], engines: List[str] = None, ...) -> List[dict]:`

**Import Convention:**
```python
from typing import Optional, List, Dict, Any
```

## Documentation

**Module Docstrings:**
- Located after shebang
- Format: Triple-quoted string with description
- Include version/changelog info if applicable
- Example from `analyzer.py`:
```python
"""
GEO 文本分析模块
使用 LLM 分析回答文本的情感、推荐理由等
"""
```

**Function Docstrings:**
- Used for complex/public functions
- Format: Triple-quoted string describing purpose
- Args section lists parameters with types and descriptions
- Returns section describes return value
- Example from `storage.py`:
```python
def finish_run(run_id: int, status: str = 'completed',
               total: int = 0, successful: int = 0, failed: int = 0,
               total_tokens: int = 0, total_cost_usd: float = 0.0,
               engines_used: list = None,
               notes: str = None):
    """结束一次监控运行

    Args:
        run_id: 运行 ID
        status: 状态 ('completed', 'partial', 'failed')
        total: 总请求数
        successful: 成功数
        failed: 失败数
        total_tokens: 总 token 消耗
        total_cost_usd: 总成本（美元）
        engines_used: 使用的引擎列表
        notes: 备注
    """
```

**Inline Comments:**
- Minimal — code should be self-documenting
- Used to explain WHY not WHAT
- Chinese language preferred in this codebase
- Example from `collector.py`:
```python
# 数字列表 "1. HelloTalk" 或 "1) HelloTalk"
# 只接受 1-20 范围内的位置数字（避免年份如 2025、2026 被误识别）
m = re.search(r'(\d+)[.\)]\s*[^\n]*?' + re.escape(brand_lower), text_lower)
```

## Import Organization

**Order:**
1. Standard library imports
2. Type hints (from typing)
3. Local/internal imports

**Example from `collector.py`:**
```python
import urllib.request
import urllib.error
import json
import time
import re
import os
import statistics
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

# ... constants ...

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from storage import get_connection
```

## Error Handling

**Strategy:** Try-except with specific exception types, return error in result dict

**Pattern:**
```python
result = {
    "error": None,
    # ... other fields ...
}

try:
    # operation
except SpecificException as e:
    result['error'] = f"Error type: {str(e)}"
    return result
except Exception as e:
    result['error'] = f"Error: {str(e)}"
    return result

return result
```

**Examples from `collector.py`:**
```python
try:
    # HTTP request
    with urllib.request.urlopen(req, timeout=WEB_SEARCH_TIMEOUT) as response:
        data = json.loads(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8') if e.fp else ''
    result['error'] = f"HTTP {e.code}: {body[:300]}"
except urllib.error.URLError as e:
    result['error'] = f"URL Error: {e}"
except json.JSONDecodeError as e:
    result['error'] = f"JSON Error: {e}"
except Exception as e:
    result['error'] = f"Error: {e}"
```

**No Raising in Collectors:**
- `collector.py` functions never raise exceptions — they return error in result dict
- Allows graceful degradation and progress tracking
- Example: `collect_one()` returns dict with `'error'` field instead of raising

## Logging

**Framework:** `print()` for stdout logging (no logging module used)

**Patterns:**
- Progress messages to stdout with `print()`
- Examples from `run_full.py`:
```python
def progress_callback(current: int, total: int, prompt: str, engine: str):
    print(f"[{current}/{total}] {engine}: {prompt[:50]}...")

print("=" * 60)
print("GEO Collection - Full Run")
print("=" * 60)
print(f"Time: {datetime.now(timezone.utc).isoformat()}")
print(f"Engines: {engines}")
print(f"Prompts: {len(prompts)}")
```

**Error Reporting:**
- Errors printed to stdout with context
- Example from `run_full.py`:
```python
except FileNotFoundError:
    print(f"Error: Prompts file not found: {args.prompts_file}")
    sys.exit(1)
except json.JSONDecodeError as e:
    print(f"Error: Invalid JSON: {e}")
    sys.exit(1)
```

## Default Values & Optional Parameters

**Pattern:** Use `= None` for optional parameters, then check with `if param:` or `param or default`

**Examples:**
```python
def collect_batch(prompts: List[str], engines: List[str] = None, ...) -> List[dict]:
    if engines is None:
        engines = list(ENGINES.keys())
```

```python
def load_prompts(prompts_file: str, priority_filter: int = None,
                  category_filter: str = None, limit: int = None) -> list:
    # ...
    if priority_filter:
        prompts = [p for p in prompts if p.get('priority') == priority_filter]

    if category_filter:
        prompts = [p for p in prompts if p.get('category') == category_filter]
```

## Data Structure Conventions

**Dictionary Keys:**
- Always `snake_case` (never camelCase)
- Consistent across all modules
- Standard response structure example:
```python
result = {
    "prompt": prompt,
    "engine": engine,
    "model": model,
    "raw_text": "",
    "brand_mentioned": False,
    "brand_position": 0,
    "citations": [],
    "timestamp": ts,
    "duration_ms": 0,
    "error": None,
    "tokens_input": 0,
    "tokens_output": 0,
    "tokens_total": 0
}
```

**JSON Serialization:**
- Use `ensure_ascii=False` for Chinese text
- Example from `storage.py`:
```python
json.dumps(result.get('citations', []), ensure_ascii=False)
json.dumps(analysis, ensure_ascii=False) if analysis else None
```

## Configuration Management

**Environment Variables:**
- Read with `os.environ.get("VARIABLE_NAME", "")`
- Fallback files in home directory: `~/.config/service/api_key`
- Example from `collector.py`:
```python
GPTPROTO_API_KEY = os.environ.get("GPTPROTO_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

def _load_api_keys():
    global GPTPROTO_API_KEY, GEMINI_API_KEY
    if not GPTPROTO_API_KEY:
        p = os.path.expanduser("~/.config/gptproto/api_key")
        if os.path.exists(p):
            GPTPROTO_API_KEY = open(p).read().strip()
```

**Config Files:**
- JSON files in `config/` directory
- Loaded with standard `json.load()` pattern
- Example: `config/prompts.json`, `config/notify.json`

## Script Entry Points

**Pattern:**
```python
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--option', type=str, default='value')
    args = parser.parse_args()
    # Main logic

if __name__ == "__main__":
    main()
```

**Argument Parsing:**
- Use `argparse` module
- Document default values in code
- Examples from `run_full.py`:
```python
parser.add_argument('--prompts-file', type=str, default=DEFAULT_PROMPTS_FILE)
parser.add_argument('--engines', type=str, nargs='+', default=['gptproto-gpt'])
parser.add_argument('--samples', type=int, default=3)
parser.add_argument('--dry-run', action='store_true')
```

## String Formatting

**Pattern:** f-strings exclusively

**Examples:**
```python
url = f"{GPTPROTO_BASE_URL}/chat/completions"
result['error'] = f"HTTP {e.code}: {body[:300]}"
print(f"[{current}/{total}] {engine}: {prompt[:50]}...")
```

## Database Interaction

**Pattern:** SQLite with context managers, manual commit/close

**Example from `storage.py`:**
```python
def get_connection() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def start_run(run_type: str = 'manual', config: dict = None) -> int:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO monitor_runs (run_type, started_at, status, config_json)
        VALUES (?, ?, 'running', ?)
    """, (
        run_type,
        datetime.now(timezone.utc).isoformat(),
        json.dumps(config) if config else None
    ))

    run_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return run_id
```

**No ORM:** Uses raw SQL with parameterized queries for SQL injection prevention

## Data Consistency Patterns

**Validation on Write:**
- Enforce consistency constraints when saving data
- Example from `storage.py` — `save_response()`:
```python
# 一致性保护：如果 brand_mentioned=False，强制 brand_position=0
brand_mentioned = 1 if result.get('brand_mentioned') else 0
brand_position = result.get('brand_position', 0)

if not brand_mentioned:
    brand_position = 0
```

**Median Aggregation:**
- When collecting multiple samples, use `statistics.median()` for position values
- Example from `collector.py`:
```python
positions = [r['brand_position'] for r in successful if r['brand_position'] > 0]
brand_position = int(statistics.median(positions)) if positions else 0

# Apply consistency check
if not brand_mentioned:
    brand_position = 0
```

## Chinese Language Convention

**Documentation & Comments:**
- Written in simplified Chinese (简体中文)
- Module docstrings describe purpose in Chinese
- Comments explain logic in Chinese
- String literals (prompts, descriptions) in Chinese

**Database Fields & Keys:**
- Always in English (snake_case)
- Never use Chinese in database column names or dictionary keys

---

*Convention analysis: 2026-03-13*
