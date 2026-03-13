#!/usr/bin/env python3
"""
GEO 文本分析模块
使用 LLM 分析回答文本的情感、推荐理由等
"""

import urllib.request
import urllib.error
import json
from typing import Optional

# API 配置
GPTPROTO_BASE_URL = "https://gptproto.com/v1"
GPTPROTO_API_KEY = "sk-e14a21c7215b470f9432b07ed48a5940"

# 分析调用超时
ANALYSIS_TIMEOUT = 20

# 请求头
HEADERS = {
    "Authorization": GPTPROTO_API_KEY,
    "Content-Type": "application/json",
    "User-Agent": "OpenClaw-Gateway/1.0"
}

# 分析用的系统提示词
ANALYSIS_SYSTEM_PROMPT = """You are a brand sentiment analyzer. Analyze the given text about a brand.

Your task is to:
1. Determine overall sentiment towards the brand (positive/neutral/negative)
2. Identify reasons why the brand is recommended (if mentioned positively)
3. Find any negative words or concerns raised
4. List competitor brands mentioned in the same context
5. Extract key descriptors/adjectives used for the brand

Return a JSON object with this exact structure:
{
    "sentiment": "positive|neutral|negative",
    "sentiment_confidence": 0.0-1.0,
    "recommendation_reason": ["reason1", "reason2", "reason3"],
    "negative_flags": ["concern1", "concern2"],
    "competitor_mentions": ["competitor1", "competitor2"],
    "key_descriptors": ["adjective1", "adjective2", "adjective3"]
}

Important:
- recommendation_reason: max 3 items, only if brand is recommended
- negative_flags: any concerns, warnings, or negative aspects mentioned
- competitor_mentions: other apps/tools mentioned in the same context
- key_descriptors: adjectives used to describe the brand (max 5)
- If brand is not mentioned, set sentiment to "neutral" and empty arrays
- Be strict: only include items that are clearly stated in the text"""


def analyze_response(raw_text: str, brand: str = "HelloTalk") -> dict:
    """
    使用 LLM 分析回答文本
    
    Args:
        raw_text: 原始回答文本
        brand: 目标品牌名
    
    Returns:
        分析结果字典
    """
    default_result = {
        "sentiment": "neutral",
        "sentiment_confidence": 0.5,
        "recommendation_reason": [],
        "negative_flags": [],
        "competitor_mentions": [],
        "key_descriptors": []
    }
    
    if not raw_text or not raw_text.strip():
        return default_result
    
    try:
        url = f"{GPTPROTO_BASE_URL}/chat/completions"
        
        user_prompt = f"""Analyze this text for mentions of "{brand}":

---
{raw_text[:4000]}
---

Brand: {brand}
Return only the JSON object, no other text."""
        
        payload = {
            "model": "claude-haiku-4-5-20251001",  # 使用便宜的模型
            "messages": [
                {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.1,  # 低温度，更稳定
            "max_tokens": 1000
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            method='POST'
        )
        
        for key, value in HEADERS.items():
            req.add_header(key, value)
        
        with urllib.request.urlopen(req, timeout=ANALYSIS_TIMEOUT) as response:
            data = json.loads(response.read().decode('utf-8'))
        
        # 解析响应
        if 'choices' in data and len(data['choices']) > 0:
            content = data['choices'][0].get('message', {}).get('content', '')
            
            # 提取 JSON（可能被 markdown 代码块包裹）
            json_str = content
            if '```json' in content:
                json_str = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                json_str = content.split('```')[1].split('```')[0].strip()
            
            try:
                result = json.loads(json_str)
                
                # 验证并标准化结果
                return {
                    "sentiment": result.get('sentiment', 'neutral'),
                    "sentiment_confidence": float(result.get('sentiment_confidence', 0.5)),
                    "recommendation_reason": list(result.get('recommendation_reason', []))[:3],
                    "negative_flags": list(result.get('negative_flags', [])),
                    "competitor_mentions": list(result.get('competitor_mentions', [])),
                    "key_descriptors": list(result.get('key_descriptors', []))[:5]
                }
            except json.JSONDecodeError:
                # JSON 解析失败，返回默认结果
                return default_result
        
        return default_result
        
    except urllib.error.HTTPError as e:
        return {**default_result, "error": f"HTTP {e.code}"}
    except urllib.error.URLError as e:
        return {**default_result, "error": f"URL Error: {str(e)}"}
    except Exception as e:
        return {**default_result, "error": f"Error: {str(e)}"}


if __name__ == "__main__":
    # 简单测试
    test_text = "HelloTalk is a great language exchange app. It connects you with native speakers. However, some users report spam issues. Duolingo and Tandem are popular alternatives."
    result = analyze_response(test_text)
    print(json.dumps(result, indent=2, ensure_ascii=False))
