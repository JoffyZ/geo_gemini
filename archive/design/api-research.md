# AI 引擎 API 能力调研

## 结论摘要（3-5 条）

1. **Google AI Overviews 无官方 API**：Google 不提供官方的 AI Overviews API，但可通过第三方 SERP API（如 SerpApi、SearchApi、ScrapingDog）获取，这些服务通过模拟 Google 搜索实时抓取 AI Overview 数据。

2. **主流引擎均支持联网搜索 API**：OpenAI、Perplexity、Anthropic、Google Gemini 均提供官方联网搜索 API，DeepSeek 暂无原生联网能力（需自行集成）。

3. **引用源数据格式标准化**：各引擎均返回结构化 citations 数据（URL、标题、摘要），OpenAI 使用 `annotations` 数组，Perplexity 使用 `citations` 数组，Gemini 使用 `groundingMetadata`。

4. **定价差异显著**：OpenAI 和 Anthropic 的联网搜索均为 $10/1K 次搜索 + token 费用；Perplexity 按 token + 请求费计费（$5-14/1K 请求）；Gemini Grounding 约 $35/1K 请求；DeepSeek 最便宜（$0.28/1M 输入 token，但无原生搜索）。

5. **GEO 工具数据采集方案**：ZipTie 等工具通过大规模模拟真实用户搜索（多 IP、多设备、多地理位置）来采集 AI Overviews 数据，检测率可达传统 SEO 工具（如 Semrush）的 17 倍。

---

## Google AI Overviews 专项分析

### 官方 API 方案

**结论：无官方 API**

Google 未提供直接访问 AI Overviews 的官方 API。Google Cloud 的 Gemini API 支持 "Grounding with Google Search"，但这返回的是 Gemini 生成的带引用回答，而非 Google 搜索结果页面上的 AI Overview 摘要。

### 非官方方案

#### 1. SERP API 服务商（推荐）

| 服务商 | 端点 | 特点 |
|--------|------|------|
| **SerpApi** | `/search?engine=google_ai_overview` | 支持 page_token 获取独立 AI Overview，1 分钟过期，JSON 结构化输出 |
| **SearchApi.io** | `/google-ai-overview` | 支持 markdown 格式，包含引用链接 |
| **ScrapingDog** | `/google/ai_overview` | 提供地理位置、设备类型参数 |
| **SERPHouse** | `/ai-overview` | 实时提取，含来源链接和时间戳 |
| **DataForSEO** | SERP API 内嵌 | 2024 年 9 月新增 AI Overview 支持 |

**SerpApi 响应示例结构：**
```json
{
  "ai_overview": {
    "text_blocks": [
      {"type": "paragraph", "snippet": "...", "reference_indexes": [0,2,3]},
      {"type": "list", "list": [...]}
    ],
    "references": [
      {"title": "...", "link": "...", "source": "...", "index": 0}
    ]
  }
}
```

#### 2. 直接爬虫（不推荐）

- Google 有严格的反爬机制（CAPTCHA、IP 封禁）
- AI Overview 结构频繁变化，维护成本高
- 需要大量代理 IP 和浏览器指纹模拟

#### 3. ZipTie 方案（行业标杆）

根据 ZipTie 官方博客（2024-09-13）：
- **核心优势**：完全模拟 Google 用户体验（极难复制）
- **检测率**：比 Semrush 高 17 倍（28% vs 1.6%）
- **技术要点**：
  - 频繁适应 AI Overview 布局变化
  - 多地理位置、多设备类型模拟
  - 实时追踪 AI Overview 出现频率

### 推荐方案

**对于 GEO 项目：采用 SERP API + 自建爬虫混合方案**

1. **主力**：使用 SerpApi 或 SearchApi 获取 AI Overviews（稳定、结构化）
2. **补充**：针对高频关键词，用 Selenium/Playwright 自建爬虫验证
3. **监控**：参考 ZipTie 方法，建立多 IP 池模拟真实用户搜索

---

## 各引擎 API 能力对比表

| 引擎 | 联网能力 | 引用源格式 | 定价 | 申请地址 |
|------|----------|------------|------|----------|
| **OpenAI (ChatGPT)** | ✅ `web_search` 工具（Responses API） | `annotations` 数组（url, title, start_index, end_index） | $10/1K 搜索 + token 费用（GPT-5: $2.5/$15 每 1M tokens） | https://platform.openai.com |
| **Perplexity** | ✅ Sonar 系列原生联网 | `citations` 数组（url, title, text） | Sonar: $1/1M input + $1/1M output + $5-12/1K 请求 | https://docs.perplexity.ai |
| **Anthropic (Claude)** | ✅ `web_search` 工具（2025-11 推出） | `citations` 数组（url, title） | $10/1K 搜索 + token 费用（Sonnet 4.5: $3/$15 每 1M tokens） | https://platform.claude.com |
| **Google (Gemini)** | ✅ Grounding with Google Search | `groundingMetadata`（search_query, web_results） | $35/1K grounded prompts（Gemini 3: 500-1500 RPD 免费） | https://ai.google.dev |
| **DeepSeek** | ❌ 无原生联网（需自行集成） | N/A | $0.28/1M input (cache miss) + $0.42/1M output | https://api-docs.deepseek.com |

---

## 各引擎详细说明

### 1. OpenAI (ChatGPT)

**联网能力：**
- **API**：Responses API + `web_search` 工具
- **模型支持**：GPT-5, GPT-4.1, o4-mini（不支持 gpt-5-nano, gpt-4o-mini）
- **搜索模式**：
  - 非推理搜索：快速查找，直接返回结果
  - 推理搜索（agentic）：模型主动规划多次搜索
  - Deep Research：数百来源，运行数分钟（o3-deep-research, o4-mini-deep-research）

**引用源格式：**
```json
{
  "output": [
    {
      "type": "message",
      "content": [{
        "type": "output_text",
        "text": "...",
        "annotations": [
          {
            "type": "url_citation",
            "start_index": 2606,
            "end_index": 2758,
            "url": "https://...",
            "title": "..."
          }
        ]
      }]
    }
  ]
}
```

**定价（2025-11 起）：**
- Web Search 工具调用：$10/1K calls
- Search content tokens：按模型输入 token 费率计费
- GPT-5：$2.5/1M input, $15/1M output
- GPT-5 mini：$0.25/1M input, $2/1M output

**申请地址：** https://platform.openai.com

---

### 2. Perplexity

**联网能力：**
- **API**：Sonar API（原生联网搜索模型）
- **模型**：
  - `sonar`：基础联网搜索
  - `sonar-pro`：深度搜索，多步推理
  - `sonar-reasoning-pro`：带推理链
  - `sonar-deep-research`：研究级，自动多查询

**引用源格式：**
```json
{
  "citations": [
    "https://example.com/source1",
    "https://example.com/source2"
  ],
  "search_results": [
    {
      "url": "...",
      "title": "...",
      "content": "..."
    }
  ]
}
```

**定价：**
| 模型 | Input ($/1M) | Output ($/1M) | 请求费 (Low/Med/High per 1K) |
|------|--------------|---------------|------------------------------|
| Sonar | $1 | $1 | $5 / $8 / $12 |
| Sonar Pro | $3 | $15 | $6 / $10 / $14 |
| Sonar Reasoning Pro | $2 | $8 | $6 / $10 / $14 |
| Sonar Deep Research | $2 | $8 | + $5/1K queries + $3/1M reasoning |

**Pro Search**（多步工具调用）：$14-22/1K 请求（按复杂度自动分类）

**申请地址：** https://docs.perplexity.ai

---

### 3. Anthropic (Claude)

**联网能力：**
- **API**：Messages API + `web_search` 工具（2025-11-04 发布）
- **模型支持**：Claude 3.7 Sonnet, Claude 3.5 Sonnet (upgraded), Claude 3.5 Haiku
- **功能**：
  - 自动判断是否需要搜索
  - 支持多轮渐进式搜索（agentic）
  - 域名白名单/黑名单控制
  - `max_uses` 参数控制最大搜索次数

**引用源格式：**
```json
{
  "content": [
    {
      "type": "text",
      "text": "... [1](url) [2](url) ..."
    }
  ],
  "citations": [
    {"url": "...", "title": "..."}
  ]
}
```

**定价：**
- Web Search：$10/1K searches + 标准 token 费用
- Claude Sonnet 4.5：$3/1M input, $15/1M output
- Claude Haiku 4.5：$1/1M input, $5/1M output
- Web Fetch 工具：免费（仅 token 费用）

**申请地址：** https://platform.claude.com

---

### 4. Google (Gemini)

**联网能力：**
- **API**：Gemini API + Grounding with Google Search
- **配置方式**：
  ```json
  {
    "generationConfig": {
      "temperature": 0.7
    },
    "tools": [{
      "googleSearch": {}
    }]
  }
  ```
- **AI Overviews 获取**：**不可直接获取**。Grounding 返回的是 Gemini 生成的带引用回答，不是 Google 搜索结果页的 AI Overview 摘要。

**引用源格式（groundingMetadata）：**
```json
{
  "groundingMetadata": {
    "searchQueries": ["query1", "query2"],
    "webSearchResults": [
      {
        "uri": "https://...",
        "title": "...",
        "snippet": "..."
      }
    ]
  }
}
```

**定价：**
- Gemini 3 模型：$14/1K grounded queries
- Gemini 2.x 模型：$35/1K grounded prompts
- 免费额度：500-1500 RPD（按层级共享 Flash-Lite 限额）
- 基础模型：Gemini 2.5 Pro 免费层可用

**申请地址：** https://ai.google.dev/gemini-api

---

### 5. DeepSeek

**联网能力：**
- **无原生联网搜索**
- 需自行集成外部搜索 API（如 Bing Search API、SerpApi）
- 支持 Tool Calls，可自定义搜索工具

**定价（最具竞争力）：**
| 项目 | 价格（每 1M tokens） |
|------|---------------------|
| Input (Cache Hit) | $0.028 |
| Input (Cache Miss) | $0.28 |
| Output | $0.42 |

**模型规格：**
- DeepSeek-V3.2：128K context
- 支持 JSON Output, Tool Calls
- 最大输出：4K (default) / 8K (max)

**申请地址：** https://api-docs.deepseek.com

---

## 对我们采集方案的建议

### 1. AI Overviews 采集

**推荐架构：**
```
┌─────────────────────────────────────────────────────┐
│                 采集调度层                            │
│  - 关键词队列管理                                     │
│  - 地理位置/设备类型轮换                               │
│  - 频率控制（避免封禁）                                │
└─────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   SerpApi     │ │  SearchApi    │ │  自建爬虫     │
│   (主力)      │ │   (备用)      │ │  (验证)       │
└───────────────┘ └───────────────┘ └───────────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
              ┌───────────────────────┐
              │   数据标准化层          │
              │  - 统一 citations 格式  │
              │  - 去重/合并           │
              │  - 时间戳标记          │
              └───────────────────────┘
```

**关键决策：**
- 预算充足：直接用 SerpApi（$50-500/月，按量计费）
- 预算有限：自建爬虫 + 少量 SERP API 验证
- 高频监控：参考 ZipTie，建立分布式 IP 池

### 2. 引擎 API 选型建议

| 使用场景 | 推荐引擎 | 理由 |
|----------|----------|------|
| **高准确率 + 引用溯源** | Perplexity Sonar Pro | 原生搜索，citations 质量最高 |
| **成本敏感** | DeepSeek + 自研搜索 | token 价格最低，但需自建搜索层 |
| **多模态 + 搜索** | Gemini | 支持图像/视频 grounding |
| **企业级控制** | Claude | 域名白名单/黑名单，组织级管理 |
| **深度研究** | OpenAI Deep Research | 自动数百来源，适合长尾查询 |

### 3. 成本估算（月 10K 查询）

| 方案 | 月成本估算 |
|------|------------|
| OpenAI GPT-5 + Web Search | ~$150-300 |
| Perplexity Sonar (Low context) | ~$60-100 |
| Claude Sonnet + Web Search | ~$120-250 |
| Gemini Grounding | ~$350-500 |
| DeepSeek + SerpApi 混合 | ~$80-150 |

### 4. 风险与注意事项

1. **Google AI Overviews 结构变化频繁**：需建立监控机制，及时调整解析逻辑
2. **API 速率限制**：各引擎均有 RPM/RPD 限制，需实现请求队列和退避策略
3. **数据合规**：确保采集行为符合各平台 ToS，避免法律风险
4. **地理位置偏差**：AI Overviews 因地区而异，需明确目标市场

---

## 附录：API 申请与文档链接汇总

| 引擎 | API 文档 | 定价页面 | 控制台 |
|------|----------|----------|--------|
| OpenAI | https://platform.openai.com/docs | https://openai.com/api/pricing/ | https://platform.openai.com |
| Perplexity | https://docs.perplexity.ai | https://docs.perplexity.ai/docs/getting-started/pricing | https://www.perplexity.ai/api-platform |
| Anthropic | https://docs.anthropic.com | https://claude.com/pricing | https://console.anthropic.com |
| Google Gemini | https://ai.google.dev/gemini-api/docs | https://ai.google.dev/gemini-api/docs/pricing | https://aistudio.google.com |
| DeepSeek | https://api-docs.deepseek.com | https://api-docs.deepseek.com/quick_start/pricing | https://platform.deepseek.com |

---

*调研完成时间：2026-03-09*
*调研执行：Scout (OpenClaw)*
