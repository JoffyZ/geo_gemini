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

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

def _load_api_keys():
    global GPTPROTO_API_KEY, GEMINI_API_KEY
    if not GPTPROTO_API_KEY:
        p = os.path.expanduser("~/.config/gptproto/api_key")
        if os.path.exists(p):
            GPTPROTO_API_KEY = open(p).read().strip()
    if not GEMINI_API_KEY:
        p = os.path.expanduser("~/.config/aistudio/api_key")
        if os.path.exists(p):
            GEMINI_API_KEY = open(p).read().strip()

_load_api_keys()

# 超时配置
WEB_SEARCH_TIMEOUT = 90
GEMINI_TIMEOUT = 60

# ============ 引擎配置 ============

ENGINES = {
    "gptproto-gpt": {
        "name": "ChatGPT",
        "model": "gpt-5-mini",
        "provider": "gptproto",
        "api_style": "responses",
        "cost_input": 0.15,  # $/1M tokens
        "cost_output": 0.60,
    },
    "gptproto-claude": {
        "name": "Claude",
        "model": "claude-haiku-4-5-20251001",
        "provider": "gptproto",
        "api_style": "chat",
        "cost_input": 0.80,
        "cost_output": 4.00,
    },
    "gptproto-gemini": {
        "name": "Gemini",
        "model": "gemini-2.5-flash",
        "provider": "aistudio",
        "api_style": "aistudio",
        "cost_input": 0.15,
        "cost_output": 0.60,
    },
}

# ============ 工具函数 ============

def extract_domain(url: str) -> str:
    try:
        m = re.search(r'https?://([^/]+)', url)
        return m.group(1).replace('www.', '') if m else url
    except:
        return url


def detect_brand_mention(text: str, brand: str = "HelloTalk") -> tuple:
    """返回: (是否提及, 第几个被提及)
    
    位置值规则：
    - 只接受 1-20 范围内的整数（超出视为无效，避免年份误识别）
    - 如果 brand_mentioned=False，brand_position 强制为 0
    """
    if not text:
        return False, 0
    text_lower = text.lower()
    brand_lower = brand.lower()
    if brand_lower not in text_lower:
        return False, 0

    # 数字列表 "1. HelloTalk" 或 "1) HelloTalk"
    # 只接受 1-20 范围内的位置数字（避免年份如 2025、2026 被误识别）
    m = re.search(r'(\d+)[.\)]\s*[^\n]*?' + re.escape(brand_lower), text_lower)
    if m:
        pos = int(m.group(1))
        if 1 <= pos <= 20:
            return True, pos

    # 序数词
    for word, pos in [('first',1),('second',2),('third',3),('fourth',4),('fifth',5),
                      ('sixth',6),('seventh',7),('eighth',8),('ninth',9),('tenth',10)]:
        if re.search(word + r'[^\n]*?' + re.escape(brand_lower), text_lower):
            return True, pos

    return True, 0


# ============ 引擎调用 ============

def _gptproto_headers():
    return {
        "Authorization": GPTPROTO_API_KEY,
        "Content-Type": "application/json",
        "User-Agent": "OpenClaw-GEO/1.0"
    }


def _call_gptproto_responses(prompt: str, model: str) -> dict:
    url = f"{GPTPROTO_BASE_URL}/responses"
    payload = {
        "model": model,
        "tools": [{"type": "web_search_preview"}],
        "input": [{"role": "user", "content": [{"type": "input_text", "text": prompt}]}]
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), method='POST')
    for k, v in _gptproto_headers().items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=WEB_SEARCH_TIMEOUT) as r:
        return json.loads(r.read())


def _call_gptproto_chat(prompt: str, model: str) -> dict:
    url = f"{GPTPROTO_BASE_URL}/chat/completions"
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 2048
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), method='POST')
    for k, v in _gptproto_headers().items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=WEB_SEARCH_TIMEOUT) as r:
        return json.loads(r.read())


def _call_gemini(prompt: str, model: str) -> dict:
    url = f"{GEMINI_BASE_URL}/models/{model}:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "tools": [{"googleSearch": {}}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 4096}
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), method='POST')
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=GEMINI_TIMEOUT) as r:
        return json.loads(r.read())


# ============ 响应解析 ============

def _parse_responses_api(data: dict) -> tuple:
    raw_text, citations = "", []
    for item in data.get('output', []):
        for c in item.get('content', []):
            if 'text' in c:
                raw_text += c['text']
            for ann in c.get('annotations', []):
                if 'url' in ann:
                    citations.append({
                        "title": ann.get('title', ''),
                        "url": ann['url'],
                        "domain": extract_domain(ann['url'])
                    })
    if not raw_text:
        for ch in data.get('choices', []):
            raw_text += ch.get('message', {}).get('content', '') or ''
    usage = data.get('usage', {})
    tokens_input = usage.get('input_tokens', 0)
    tokens_output = usage.get('output_tokens', 0)
    return raw_text, citations, tokens_input, tokens_output


def _parse_chat_api(data: dict) -> tuple:
    raw_text = ""
    for ch in data.get('choices', []):
        content = ch.get('message', {}).get('content', '')
        if content:
            raw_text += content
    usage = data.get('usage', {})
    tokens_input = usage.get('prompt_tokens', 0)
    tokens_output = usage.get('completion_tokens', 0)
    return raw_text, [], tokens_input, tokens_output


def _parse_gemini(data: dict) -> tuple:
    raw_text, citations = "", []
    for cand in data.get('candidates', []):
        for part in cand.get('content', {}).get('parts', []):
            raw_text += part.get('text', '')
        gm = cand.get('groundingMetadata', {})
        for chunk in gm.get('groundingChunks', []):
            web = chunk.get('web', {})
            if web.get('uri'):
                citations.append({
                    "title": web.get('title', ''),
                    "url": web['uri'],
                    "domain": extract_domain(web['uri'])
                })
    usage_meta = data.get('usageMetadata', {})
    tokens_input = usage_meta.get('promptTokenCount', 0)
    tokens_output = usage_meta.get('candidatesTokenCount', 0)
    return raw_text, citations, tokens_input, tokens_output


# ============ 公开采集函数 ============

def collect_one(prompt: str, engine: str = "gptproto-gpt",
                brand: str = "HelloTalk") -> dict:
    start = time.time()
    ts = datetime.now(timezone.utc).isoformat()

    result = {
        "prompt": prompt, "engine": engine,
        "model": ENGINES.get(engine, {}).get('model', ''),
        "raw_text": "", "brand_mentioned": False, "brand_position": 0,
        "citations": [], "timestamp": ts, "duration_ms": 0, "error": None,
        "tokens_input": 0, "tokens_output": 0, "tokens_total": 0
    }

    if engine not in ENGINES:
        result['error'] = f"Unknown engine: {engine}"
        result['duration_ms'] = int((time.time() - start) * 1000)
        return result

    cfg = ENGINES[engine]
    model = cfg['model']
    style = cfg['api_style']

    try:
        if style == "responses":
            data = _call_gptproto_responses(prompt, model)
            text, cits, tin, tout = _parse_responses_api(data)
        elif style == "chat":
            data = _call_gptproto_chat(prompt, model)
            text, cits, tin, tout = _parse_chat_api(data)
        elif style == "aistudio":
            data = _call_gemini(prompt, model)
            text, cits, tin, tout = _parse_gemini(data)
        else:
            raise ValueError(f"Unknown api_style: {style}")

        result['raw_text'] = text
        result['citations'] = cits
        result['tokens_input'] = tin
        result['tokens_output'] = tout
        result['tokens_total'] = tin + tout
        
        mentioned, position = detect_brand_mention(text, brand)
        result['brand_mentioned'] = mentioned
        result['brand_position'] = position

    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8') if e.fp else ''
        result['error'] = f"HTTP {e.code}: {body[:300]}"
    except urllib.error.URLError as e:
        result['error'] = f"URL Error: {e}"
    except json.JSONDecodeError as e:
        result['error'] = f"JSON Error: {e}"
    except Exception as e:
        result['error'] = f"Error: {e}"

    result['duration_ms'] = int((time.time() - start) * 1000)
    return result


def collect_with_retry(prompt: str, engine: str = "gptproto-gpt",
                        brand: str = "HelloTalk",
                        retries: int = 2, delay: float = 3.0) -> dict:
    last = None
    for attempt in range(retries):
        r = collect_one(prompt, engine, brand)
        if not r.get('error'):
            return r
        last = r
        if attempt < retries - 1:
            time.sleep(delay)
    return last


def collect_median(prompt: str, engine: str = "gptproto-gpt",
                    brand: str = "HelloTalk", samples: int = 3) -> dict:
    results = []
    for i in range(samples):
        r = collect_with_retry(prompt, engine, brand)
        results.append(r)
        if i < samples - 1:
            time.sleep(1.5)

    successful = [r for r in results if not r.get('error')]
    if not successful:
        return results[-1]

    texts = [r['raw_text'] for r in successful if r['raw_text']]
    mentions = [r['brand_mentioned'] for r in successful]
    positions = [r['brand_position'] for r in successful if r['brand_position'] > 0]
    durations = [r['duration_ms'] for r in successful]
    tokens_inputs = [r['tokens_input'] for r in successful]
    tokens_outputs = [r['tokens_output'] for r in successful]

    seen, unique_cits = set(), []
    for r in successful:
        for c in r.get('citations', []):
            if c.get('url') and c['url'] not in seen:
                seen.add(c['url'])
                unique_cits.append(c)

    brand_mentioned = sum(mentions) > len(mentions) // 2
    brand_position  = int(statistics.median(positions)) if positions else 0
    
    # 一致性保护
    if not brand_mentioned:
        brand_position = 0

    return {
        "prompt": prompt,
        "engine": engine,
        "model": ENGINES.get(engine, {}).get('model', ''),
        "raw_text": max(texts, key=len) if texts else "",
        "brand_mentioned": brand_mentioned,
        "brand_position": brand_position,
        "citations": unique_cits[:20],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "duration_ms": int(statistics.mean(durations)) if durations else 0,
        "samples": len(successful),
        "samples_attempted": samples,
        "samples_successful": len(successful),
        "tokens_input": sum(tokens_inputs) if tokens_inputs else 0,
        "tokens_output": sum(tokens_outputs) if tokens_outputs else 0,
        "tokens_total": sum(tokens_inputs) + sum(tokens_outputs) if tokens_inputs else 0,
        "error": None
    }


def collect_batch(prompts: List[str], engines: List[str] = None,
                   brand: str = "HelloTalk", samples_per_prompt: int = 3,
                   dry_run: bool = False, progress_callback=None) -> List[dict]:
    if engines is None:
        engines = list(ENGINES.keys())

    total = len(prompts) * len(engines)
    results, current = [], 0

    for prompt in prompts:
        for engine in engines:
            current += 1
            if progress_callback:
                progress_callback(current, total, prompt, engine)

            if dry_run:
                results.append({
                    "prompt": prompt, "engine": engine,
                    "model": ENGINES.get(engine, {}).get('model', ''),
                    "raw_text": "[DRY RUN]", "brand_mentioned": False,
                    "brand_position": 0, "citations": [],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "duration_ms": 0, "error": None, "dry_run": True,
                    "tokens_input": 0, "tokens_output": 0, "tokens_total": 0,
                    "samples_attempted": 1, "samples_successful": 1
                })
            else:
                r = collect_median(prompt, engine, brand, samples_per_prompt)
                results.append(r)
                time.sleep(0.5)

    return results


def calculate_cost(engine: str, tokens_input: int, tokens_output: int) -> float:
    """计算成本（美元）"""
    cfg = ENGINES.get(engine, {})
    cost_input = cfg.get('cost_input', 0)
    cost_output = cfg.get('cost_output', 0)
    return (tokens_input * cost_input + tokens_output * cost_output) / 1_000_000
