# GEO 项目 API 配置清单

> 此文件是你需要准备的所有 API Key 和配置的完整清单。
> 不要在此文件中填写真实 Key，Key 存入环境变量或 ~/.config/geo/secrets。
> 状态说明：⬜ 待申请 / 🔄 申请中 / ✅ 已配置 / ❌ 暂不需要

---

## 必须优先准备（MVP 核心）

### 1. Perplexity API ⬜
- **用途**：最重要的引用源数据，citations 字段完整
- **联网能力**：✅ 天然实时联网
- **引用源**：✅ 结构化 JSON，直接可用
- **申请地址**：https://www.perplexity.ai/settings/api
- **推荐模型**：`llama-3.1-sonar-large-128k-online`
- **估算成本**：约 $5/1000次请求
- **环境变量名**：`PERPLEXITY_API_KEY`
- **备注**：

---

### 2. OpenAI API ⬜
- **用途**：ChatGPT 监控，联网版需要 search 模型
- **联网能力**：✅ 需使用 `gpt-4o-search-preview` 模型
- **引用源**：⚠️ 部分可获取（不稳定）
- **申请地址**：https://platform.openai.com/api-keys
- **推荐模型（联网）**：`gpt-4o-search-preview`
- **推荐模型（分析）**：`gpt-4o-mini`（文本分析用，成本低）
- **估算成本**：search 约 $0.03/次，mini 约 $0.001/次
- **环境变量名**：`OPENAI_API_KEY`
- **备注**：

---

## 次优先准备

### 3. Anthropic API ⬜
- **用途**：Claude 监控（无联网，仅静态知识）
- **联网能力**：❌ 暂无官方联网 API
- **引用源**：❌ 不支持
- **申请地址**：https://console.anthropic.com/
- **推荐模型**：`claude-3-5-haiku-20241022`（成本低）
- **估算成本**：约 $0.001/次
- **环境变量名**：`ANTHROPIC_API_KEY`
- **备注**：Claude 无联网，但可作为对比（静态知识中的品牌认知）

---

### 4. Google Gemini API ⬜
- **用途**：Gemini 监控 + Google AI Overviews 数据（待调研确认）
- **联网能力**：✅ 需启用 Search Grounding
- **引用源**：⚠️ 需额外配置
- **申请地址**：https://aistudio.google.com/app/apikey
- **推荐模型**：`gemini-1.5-flash`（Search Grounding 支持）
- **估算成本**：免费额度较大，超出后约 $0.002/次
- **环境变量名**：`GEMINI_API_KEY`
- **备注**：Search Grounding 需额外申请或付费

---

## 待调研后决定

### 5. Google AI Overviews（专项）⬜
- **用途**：采集 Google 搜索结果中的 AI Overview 内容
- **官方 API**：🔍 待 Scout 调研确认
- **非官方方案**：SerpAPI / ValueSERP / DataForSEO（第三方）
- **申请地址**：待确认
- **估算成本**：待确认
- **环境变量名**：`SERP_API_KEY`（暂定）
- **备注**：Scout 正在调研可行性

---

### 6. DeepSeek API ⬜（中国市场备用）
- **用途**：国内 AI 引擎监控（v2 版本）
- **联网能力**：待确认
- **申请地址**：https://platform.deepseek.com/
- **环境变量名**：`DEEPSEEK_API_KEY`
- **备注**：优先级低，v2 再配置

---

## 配置方式

API Key 统一存入系统环境变量或专用配置文件：

```bash
# 方式一：环境变量（推荐）
export PERPLEXITY_API_KEY="pplx-xxxxx"
export OPENAI_API_KEY="sk-xxxxx"
export ANTHROPIC_API_KEY="sk-ant-xxxxx"
export GEMINI_API_KEY="AIzaSy-xxxxx"

# 或存入 ~/.config/geo/secrets（不提交 git）
```

代码中读取：
```python
import os
PERPLEXITY_KEY = os.environ.get("PERPLEXITY_API_KEY")
```

---

## 进度追踪

| API | 状态 | 申请日期 | 配置日期 | 备注 |
|-----|------|---------|---------|------|
| Perplexity | ⬜ 待申请 | | | |
| OpenAI | ⬜ 待申请 | | | |
| Anthropic | ⬜ 待申请 | | | |
| Gemini | ⬜ 待申请 | | | |
| Google AI Overviews | 🔍 调研中 | | | Scout 正在调研 |
| DeepSeek | ❌ 暂缓 | | | v2 再配置 |
