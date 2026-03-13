
## gptproto 调用格式速查（已验证）

### 1. GPT-5-mini web search（Responses API）
- Endpoint: POST https://gptproto.com/v1/responses
- Headers: Authorization: {key}, Content-Type: application/json, User-Agent: OpenClaw-Gateway/1.0
- Body: {"model": "gpt-5-mini", "tools": [{"type": "web_search_preview"}], "input": [...]}
- 响应: output[].content[].annotations = 引用源
- 耗时: ~35s, 引用源: 4个

### 2. Claude haiku-4-5 web search（Anthropic Messages API）⭐推荐
- Endpoint: POST https://gptproto.com/v1/messages
- Headers: Authorization: {key}, Content-Type: application/json, anthropic-version: 2023-06-01, User-Agent: OpenClaw-Gateway/1.0
- Body: {"model": "claude-haiku-4-5-20251001", "max_tokens": 1024, "messages": [...], "tools": [{"type": "web_search_20250305", "name": "web_search", "max_uses": 5}]}
- 响应: content[] 中 type=web_search_tool_result 包含引用
- 耗时: ~10s ⚡, 成本更低

### 3. Gemini 2.5 Flash（直接 aistudio key）
- Endpoint: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key}
- Body: {"contents": [...], "tools": [{"google_search": {}}]}
- 响应: candidates[0].groundingMetadata.groundingChunks = 引用源
- 耗时: ~5s ⚡⚡, 引用源: 15个（URL被包装）
