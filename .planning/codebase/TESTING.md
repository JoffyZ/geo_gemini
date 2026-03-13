# Testing Patterns

**Analysis Date:** 2026-03-13

## Current State: No Formal Testing Framework

**Status:** No automated tests found in codebase

**Test Framework:** Not detected

**Test Files:** None found
- No `test_*.py` or `*_test.py` files
- No `pytest.ini`, `setup.py`, or `pyproject.toml` configuration
- No `tox.ini` or test runner configuration

**This is a testing opportunity:** The codebase is a pure data collection and reporting system with no automated test coverage. Tests are critical for:
- API integration verification
- Data parsing validation
- Error handling confirmation
- Database consistency checks

## Manual Testing Patterns Observed

**Type: Integration Testing**
- All testing is manual via script execution
- Scripts accept `--dry-run` flag for safe testing
- Example from `run_full.py`:
```python
parser.add_argument('--dry-run', action='store_true')

if dry_run:
    results.append({
        "prompt": prompt, "engine": engine,
        "model": ENGINES.get(engine, {}).get('model', ''),
        "raw_text": "[DRY RUN]",
        "brand_mentioned": False,
        "brand_position": 0,
        "citations": [],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "duration_ms": 0,
        "error": None,
        "dry_run": True,
        "tokens_input": 0,
        "tokens_output": 0,
        "tokens_total": 0,
        "samples_attempted": 1,
        "samples_successful": 1
    })
else:
    r = collect_median(prompt, engine, brand, samples_per_prompt)
    results.append(r)
```

**Type: Module-level Testing**
- Main modules include inline test sections
- Example from `analyzer.py` (lines 149-153):
```python
if __name__ == "__main__":
    # 简单测试
    test_text = "HelloTalk is a great language exchange app. It connects you with native speakers. However, some users report spam issues. Duolingo and Tandem are popular alternatives."
    result = analyze_response(test_text)
    print(json.dumps(result, indent=2, ensure_ascii=False))
```

**Execution:** Run scripts directly with test parameters:
```bash
python3 src/run_demo.py                    # Demo with 2 prompts
python3 src/run_collection_only.py         # Just collection
python3 src/run_full.py --dry-run          # Dry run (no API calls)
python3 src/analyzer.py                    # Test analyzer directly
python3 src/analyzer_report_v2.py --help   # Test report generation
```

## Module Testing Approach

### Data Collection Module: `collector.py`

**Testable Components:**
- `extract_domain()` — URL parsing
- `detect_brand_mention()` — Text analysis
- `collect_one()` — Single API call with error handling
- `collect_with_retry()` — Retry logic
- `collect_median()` — Median aggregation of results
- `calculate_cost()` — Token cost calculation

**Current Error Handling Verification:**
Done manually by running with API unavailable or malformed responses

**Suggested Test Patterns:**

Unit test for `detect_brand_mention()`:
```python
# Test detection with various positions
assert detect_brand_mention("1. HelloTalk is great", brand="HelloTalk") == (True, 1)
assert detect_brand_mention("Second option: HelloTalk works", brand="HelloTalk") == (True, 2)
assert detect_brand_mention("No brand here", brand="HelloTalk") == (False, 0)

# Test position range validation (1-20 only)
text_with_year = "In 2025, HelloTalk was released"
mentioned, pos = detect_brand_mention(text_with_year, brand="HelloTalk")
assert mentioned == True and pos == 0  # 2025 should not be detected as position
```

Unit test for `extract_domain()`:
```python
assert extract_domain("https://www.example.com/path") == "example.com"
assert extract_domain("https://api.example.com") == "api.example.com"
assert extract_domain("invalid") == "invalid"
```

Unit test for `calculate_cost()`:
```python
# Cost calculation verification
cost = calculate_cost("gptproto-gpt", tokens_input=1000000, tokens_output=1000000)
# GPT: 0.15 + 0.60 = 0.75 per 1M tokens
assert abs(cost - 0.75) < 0.01
```

### Analyzer Module: `analyzer.py`

**Testable Components:**
- `analyze_response()` — LLM-based sentiment analysis
- JSON response parsing and validation
- Default result generation on errors

**Current Error Handling:**
API failures return default result dict:
```python
default_result = {
    "sentiment": "neutral",
    "sentiment_confidence": 0.5,
    "recommendation_reason": [],
    "negative_flags": [],
    "competitor_mentions": [],
    "key_descriptors": []
}

try:
    # API call and parsing
except json.JSONDecodeError:
    return default_result
except Exception as e:
    return {**default_result, "error": f"Error: {str(e)}"}
```

**Suggested Test Patterns:**

Unit test for response parsing:
```python
# Mock LLM response with markdown code block
mock_response = '```json\n{"sentiment": "positive", ...}\n```'
# Verify extraction works correctly
json_str = mock_response.split('```json')[1].split('```')[0].strip()
result = json.loads(json_str)
assert result['sentiment'] == 'positive'

# Test with plain JSON
mock_response = '{"sentiment": "negative", "sentiment_confidence": 0.9}'
result = json.loads(mock_response)
assert result['sentiment'] == 'negative'
```

Verify default result on error:
```python
result = analyze_response("")  # Empty text
assert result['sentiment'] == 'neutral'
assert result['recommendation_reason'] == []

result = analyze_response("<malformed JSON>")  # JSON error
assert 'error' in result
```

### Storage Module: `storage.py`

**Testable Components:**
- Database initialization (`init_db()`)
- CRUD operations (`start_run()`, `finish_run()`, `save_response()`)
- Query functions (`get_prompts()`, `get_run_stats()`)
- Consistency validation

**Critical Pattern: Data Consistency**
```python
# From save_response()
def save_response(run_id: int, result: dict, analysis: dict = None):
    """保存一条采集结果

    一致性保护：如果 brand_mentioned=False，强制 brand_position=0
    """
    brand_mentioned = 1 if result.get('brand_mentioned') else 0
    brand_position = result.get('brand_position', 0)

    # 一致性保护
    if not brand_mentioned:
        brand_position = 0
```

**Suggested Test Patterns:**

Integration test for database lifecycle:
```python
import tempfile
import sqlite3

# Use temp DB for testing
DB_PATH = tempfile.mktemp(suffix='.db')

# Test initialization
init_db()
conn = get_connection()
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
assert 'monitor_runs' in tables
assert 'raw_responses' in tables
assert 'prompt_library' in tables
conn.close()

# Test run lifecycle
run_id = start_run(run_type='test', config={'test': True})
assert isinstance(run_id, int)

finish_run(run_id=run_id, status='completed', total=10, successful=10)

# Test consistency constraint
result = {
    'brand_mentioned': False,
    'brand_position': 5,  # Invalid: should be 0 when not mentioned
    'raw_text': 'test',
    'engine': 'test-engine',
    'timestamp': datetime.now(timezone.utc).isoformat()
}
save_response(run_id, result)

# Verify constraint was enforced
conn = get_connection()
cursor = conn.cursor()
cursor.execute("SELECT brand_position FROM raw_responses WHERE run_id = ?", (run_id,))
position = cursor.fetchone()[0]
assert position == 0  # Constraint enforced
conn.close()
```

### Reporter Module: `analyzer_report_v2.py`

**Testable Components:**
- Category metric calculations (`calculate_category_metrics()`)
- Trend comparison (`calculate_trend_comparison()`)
- Statistical aggregations

**Current Implementation Pattern:**
Uses raw SQL queries and tuple indexing (brittle):
```python
def calculate_category_metrics(data):
    """按分类计算指标"""
    categories = defaultdict(list)
    for row in data:
        category = row[18]  # category 字段（JOIN后的第18列）
        categories[category].append(row)

    result = {}
    for cat, rows in categories.items():
        total = len(rows)
        mentioned = [r for r in rows if r[6] == 1]  # brand_mentioned
        mention_rate = len(mentioned) / total * 100 if total > 0 else 0
```

**Suggested Test Patterns:**

Unit test for metric calculation:
```python
# Mock data with known values
mock_rows = [
    (..., 'gptproto-gpt', ..., 1, ..., 'brand_direct'),  # mentioned
    (..., 'gptproto-gpt', ..., 0, ..., 'brand_direct'),  # not mentioned
    (..., 'gptproto-gpt', ..., 1, ..., 'brand_direct'),  # mentioned
]

metrics = calculate_category_metrics(mock_rows)
brand_direct = metrics['brand_direct']

assert brand_direct['total'] == 3
assert brand_direct['mentioned'] == 2
assert abs(brand_direct['mention_rate'] - 66.67) < 0.1
```

## Testing Best Practices for This Codebase

### 1. Test Utilities

**Dry-run Pattern Already Present:**
```python
# From run_full.py
parser.add_argument('--dry-run', action='store_true')

if dry_run:
    results.append({...})  # Mock result without API call
else:
    r = collect_median(prompt, engine, brand)
    results.append(r)
```

**Extend with:**
- Mock API responses for unit testing
- Temporary SQLite databases for integration tests
- Fixture data for known inputs/outputs

### 2. Coverage Areas Needed

| Component | Type | Priority | Notes |
|-----------|------|----------|-------|
| `collector.detect_brand_mention()` | Unit | High | Core logic, many edge cases |
| `collector.extract_domain()` | Unit | Medium | URL parsing |
| `collector.collect_one()` | Unit | High | Error handling coverage |
| `analyzer.analyze_response()` | Unit | High | LLM response parsing |
| `storage.save_response()` | Integration | High | Data consistency |
| `storage.init_db()` | Integration | Medium | Schema creation |
| `analyzer_report_v2.calculate_category_metrics()` | Unit | Medium | Math validation |
| API integration | Integration | Medium | Test with real APIs in CI |

### 3. Test Organization

**Suggested Structure:**
```
tests/
├── __init__.py
├── conftest.py                    # pytest fixtures and config
├── fixtures/
│   ├── api_responses.json        # Mock LLM responses
│   ├── test_data.db              # Test database schema
│   └── prompts.json              # Test prompt library
├── unit/
│   ├── test_collector.py         # Unit tests for collector
│   ├── test_analyzer.py          # Unit tests for analyzer
│   └── test_storage.py           # Unit tests for storage
└── integration/
    ├── test_full_workflow.py     # End-to-end tests
    └── test_api_integration.py   # Tests with real APIs (CI only)
```

### 4. Mock Patterns

**API Mocking Example:**
```python
import json
from unittest.mock import Mock, patch

@patch('urllib.request.urlopen')
def test_collect_one_success(mock_urlopen):
    # Mock successful API response
    mock_response = Mock()
    mock_response.read.return_value = json.dumps({
        'choices': [{
            'message': {'content': 'HelloTalk is great...'}
        }],
        'usage': {
            'input_tokens': 100,
            'output_tokens': 200
        }
    }).encode()
    mock_response.__enter__.return_value = mock_response
    mock_urlopen.return_value = mock_response

    result = collect_one("Test prompt", engine="gptproto-claude")

    assert result['brand_mentioned'] == True
    assert result['error'] is None
    assert result['tokens_input'] == 100

@patch('urllib.request.urlopen')
def test_collect_one_http_error(mock_urlopen):
    # Mock HTTP error
    import urllib.error
    mock_urlopen.side_effect = urllib.error.HTTPError(
        url='http://test',
        code=503,
        msg='Service Unavailable',
        hdrs={},
        fp=None
    )

    result = collect_one("Test prompt")

    assert result['error'] is not None
    assert 'HTTP 503' in result['error']
    assert result['brand_mentioned'] == False
```

### 5. Database Testing Pattern

```python
import tempfile
import os

@pytest.fixture
def temp_db():
    """Provide isolated temp DB for testing"""
    temp_path = tempfile.mktemp(suffix='.db')

    # Patch DB_PATH before importing storage
    with patch('storage.DB_PATH', temp_path):
        yield temp_path

    # Cleanup
    if os.path.exists(temp_path):
        os.remove(temp_path)

def test_data_consistency(temp_db):
    """Test consistency constraint enforcement"""
    run_id = start_run(run_type='test')

    # Create result with invalid brand_position
    invalid_result = {
        'brand_mentioned': False,
        'brand_position': 10,  # Should be 0
        'raw_text': 'test',
        'engine': 'test',
        'timestamp': datetime.now(timezone.utc).isoformat()
    }

    save_response(run_id, invalid_result)

    # Verify constraint was enforced
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT brand_position FROM raw_responses WHERE run_id = ?",
        (run_id,)
    )
    stored_position = cursor.fetchone()[0]
    conn.close()

    assert stored_position == 0
```

## Run Commands (Current Manual Approach)

```bash
# Demo run with 2 sample prompts
python3 src/run_demo.py

# Dry-run without API calls
python3 src/run_full.py --dry-run

# Full run with custom parameters
python3 src/run_full.py --engines gptproto-gpt gptproto-claude --samples 3

# Run by category
python3 src/run_full.py --category brand_direct --limit 5

# Test analyzer directly
python3 src/analyzer.py

# Generate report from existing data
python3 src/analyzer_report_v2.py --run-id 1
```

## Recommended Testing Setup

**Framework:** pytest with pytest-cov for coverage

**Configuration (pytest.ini):**
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --cov=src --cov-report=html
markers =
    unit: Unit tests
    integration: Integration tests (may require DB/network)
    slow: Slow tests (API calls, file I/O)
```

**Fixture Database:**
Use consistent test data across all tests with `conftest.py`:
```python
import pytest
from storage import init_db

@pytest.fixture(scope='session')
def test_db():
    """Initialize test database once per session"""
    init_db()
    yield
    # Cleanup if needed
```

---

*Testing analysis: 2026-03-13*
