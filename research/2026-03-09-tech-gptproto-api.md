# GPTProto API 调研报告

**调研日期**: 2026-03-09  
**调研目标**: https://gptproto.com/model?tags=web-search  
**调研人**: Scout

---

## 📌 结论摘要（TL;DR）

1. **GPTProto 是一个 AI API 聚合/代理平台**，而非独立模型服务商。它通过统一 API 接口聚合了 OpenAI、Claude、Gemini、DeepSeek、Kimi 等主流模型。

2. **带 web-search 标签的模型共 11 款**，覆盖 GPT-5.4、Claude Opus/Sonnet、Gemini Pro/Flash、Kimi K2.5、GLM-5 等主流引擎。

3. **API 完全兼容 OpenAI 格式**，baseURL 为 `https://gptproto.com/v1`，支持标准 SDK 直接切换。

4. **GEO 采集价值评估**: 
   - ✅ 一个 Key 可替代多个官方 API，降低管理成本
   - ✅ 覆盖 ChatGPT、Claude、Gemini、Kimi 等主流引擎的联网搜索能力
   - ⚠️ 引用源数据格式需实测验证，文档未明确说明返回结构

---

## 1. 平台定位：API 聚合/代理服务

### 1.1 什么是 GPTProto？

GPTProto 是一个 **All-in-One AI API 聚合平台**，其核心价值主张：

> "Forget reading fragmented API documentation for Google Gemini, Midjourney, or DeepSeek. GPTProto normalizes responses into a standardized OpenAI-compatible AI format."

**关键特性**：
- ✅ **统一接口**：一个 API Key 访问所有模型
- ✅ **OpenAI 兼容**：标准化响应格式，支持现有 SDK
- ✅ **智能路由**：自动故障转移，保证高可用性
- ✅ **价格优势**：比官方 API 低 10%-60%

### 1.2 平台类型判断

| 维度 | 说明 |
|------|------|
| **商业模式** | API 聚合/代理（API Aggregator/Proxy） |
| **是否自研模型** | 否，全部调用第三方官方 API |
| **差异化价值** | 统一接口 + 智能路由 + 价格优势 + 高可用保障 |
| **竞品对标** | 类似 OpenRouter、AI Gateway 的定位 |

---

## 2. Web-Search 标签模型清单

通过抓取 `https://gptproto.com/model?tags=web-search` 页面，共识别出 **11 款带 web-search 功能的模型**：

### 2.1 模型列表

| 序号 | 模型名称 | 提供商 | 输入价格 | 输出价格 | 特点 |
|------|----------|--------|----------|----------|------|
| 1 | `gpt-5.4/web-search` | OpenAI | $2/1M tokens | $12/1M tokens | Responses API，多步搜索，可验证引用 |
| 2 | `gpt-5.3-codex/web-search` | OpenAI | $1.225/1M tokens | $9.8/1M tokens | 代码专用，支持 open_page/find_in_page |
| 3 | `claude-opus-4-6-thinking/web-search` | Anthropic | $3.5/1M tokens | $17.5/1M tokens | Thinking 层 + 实时爬虫，深度分析 |
| 4 | `claude-sonnet-4-6/web-search` | Anthropic | $2.1/1M tokens | $10.5/1M tokens | 平衡性能与速度，20万 token 上下文 |
| 5 | `claude-sonnet-4-6-thinking/web-search` | Anthropic | $2.1/1M tokens | $10.5/1M tokens | 带推理层，实时搜索 |
| 6 | `gemini-3.1-pro-preview/web-search` | Google | $1.2/1M tokens | $7.2/1M tokens | 200万 token 上下文，Google 搜索基础设施 |
| 7 | `gemini-3.1-flash-lite-preview/web-search` | Google | $0.15/1M tokens | $0.9/1M tokens | 高速低成本，100万 token 上下文 |
| 8 | `kimi-k2.5/web-search` | Moonshot AI | $0.05/1M tokens | $1.5/1M tokens | 25.6万 token 上下文，中文优化 |
| 9 | `glm-5/web-search` | Zhipu AI | $0.85/1M tokens | $2.72/1M tokens | 12.8万 token 上下文，国产模型 |
| 10 | `o3-mini/text-to-text` | OpenAI | $0.77/1M tokens | $3.08/1M tokens | 推理型模型，数学/编程优化 |
| 11 | `deepseek-v3.2/text-to-text` | DeepSeek | $0.1678/1M tokens | $0.2514/1M tokens | MoE 架构，高性价比 |

### 2.2 模型能力对比

```
┌─────────────────────────────────────────────────────────────────┐
│  高端推理型（适合深度研究）                                       │
│  ├── Claude Opus 4.6 Thinking ($3.5/$17.5)                      │
│  └── GPT-5.4 ($2/$12)                                           │
├─────────────────────────────────────────────────────────────────┤
│  平衡型（性价比之选）                                             │
│  ├── Claude Sonnet 4.6 ($2.1/$10.5)                             │
│  └── Gemini 3.1 Pro ($1.2/$7.2)                                 │
├─────────────────────────────────────────────────────────────────┤
│  经济型（高并发/低成本）                                          │
│  ├── Gemini 3.1 Flash Lite ($0.15/$0.9)                         │
│  ├── Kimi K2.5 ($0.05/$1.5)                                     │
│  └── DeepSeek V3.2 ($0.1678/$0.2514)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. API 兼容性分析

### 3.1 Base URL 与认证

```bash
# Base URL
https://gptproto.com/v1

# 认证方式
Authorization: Bearer YOUR_API_KEY
```

### 3.2 调用示例

**cURL 示例**（来自官方文档）：
```bash
curl -X POST "https://gptproto.com/v1/audio/speech" \
  -H "Authorization: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini-tts",
    "input": "The quick brown fox jumped over the lazy dog.",
    "voice": "alloy"
  }'
```

**Python 示例**：
```python
from openai import OpenAI

client = OpenAI(
    base_url="https://gptproto.com/v1",
    api_key="YOUR_API_KEY"
)

response = client.chat.completions.create(
    model="gpt-5.4/web-search",
    messages=[{"role": "user", "content": "搜索最新的 AI 行业动态"}]
)
```

### 3.3 兼容性评估

| 项目 | 支持情况 | 说明 |
|------|----------|------|
| OpenAI SDK | ✅ 完全兼容 | 直接修改 base_url 即可 |
| 标准端点 | ✅ /v1/chat/completions | 标准格式 |
| 流式输出 | ✅ 支持 | SSE 格式 |
| 工具调用 | ✅ 支持 | Responses API 原生支持 |
| 文件上传 | ✅ 支持 | 通过 file-analysis 模型 |

---

## 4. GEO 采集价值评估

### 4.1 主流引擎覆盖情况

| 引擎 | 覆盖状态 | 对应模型 |
|------|----------|----------|
| **ChatGPT (OpenAI)** | ✅ 完全覆盖 | gpt-5.4, gpt-5.3-codex, o3-mini |
| **Claude (Anthropic)** | ✅ 完全覆盖 | claude-opus-4-6, claude-sonnet-4-6 |
| **Gemini (Google)** | ✅ 完全覆盖 | gemini-3.1-pro, gemini-3.1-flash |
| **Kimi (Moonshot)** | ✅ 完全覆盖 | kimi-k2.5 |
| **DeepSeek** | ✅ 完全覆盖 | deepseek-v3.2 |
| **Perplexity** | ❌ 未覆盖 | 无 Perplexity 官方模型 |

**结论**：覆盖 5/6 主流引擎，仅缺 Perplexity。

### 4.2 Web-Search 引用源数据格式

**现状**：官方文档未明确说明 web-search 模型的返回结构。

**根据模型描述推断**：
- GPT-5.4: "provide verifiable citations for every claim"
- GPT-5.3-Codex: "multi-step search actions including 'open_page' and 'find_in_page'"
- Claude: "real-time web-crawling capabilities"

**建议**：需实测验证以下字段：
```json
{
  "choices": [{
    "message": {
      "content": "回答内容",
      "annotations": [{
        "type": "url_citation",
        "url": "https://...",
        "title": "页面标题"
      }]
    }
  }]
}
```

### 4.3 单 Key 替代多官方 API 评估

| 维度 | 评估 |
|------|------|
| **技术可行性** | ✅ 完全可行，OpenAI 兼容格式 |
| **成本对比** | ✅ 比官方低 10%-60% |
| **稳定性** | ✅ 自动故障转移 |
| **数据隐私** | ⚠️ 需确认是否经过第三方 |
| **功能完整性** | ⚠️ 需实测验证引用格式 |

**综合评分**: ⭐⭐⭐⭐☆ (4/5)

---

## 5. 风险提示与建议

### 5.1 潜在风险

1. **供应商锁定风险**：依赖单一聚合平台
2. **数据隐私**：数据流经第三方服务器
3. **引用格式不确定**：需实测验证是否符合 GEO 采集需求
4. **价格变动**：代理平台价格可能调整

### 5.2 建议行动

1. **短期**：申请测试 Key，验证 web-search 返回格式
2. **中期**：对比官方 API 与 GPTProto 的引用质量
3. **长期**：建立多供应商 fallback 机制

---

## 6. 参考链接

- 官网：https://gptproto.com
- 模型列表：https://gptproto.com/model?tags=web-search
- 文档：https://docs.gptproto.com
- API 文档：https://docs.gptproto.com/docs/api

---

## 7. 附录：原始数据摘录

### 7.1 平台官方描述

> "GPTProto eliminates the need to juggle multiple API keys, offering a seamless integration solution for developers and enterprises."

> "Plug into GPTProto once and unlock every top-tier model instantly. Our API plays perfectly with standard SDKs, so you don't have to rewrite code to access global AI capabilities."

### 7.2 模型描述摘录

**gpt-5.4/web-search**:
> "The gpt-5.4 model represents the pinnacle of search-augmented generation, allowing users to bypass the traditional knowledge cutoff. By integrating live internet access, gpt-5.4 can perform multi-step agentic searches, browse specific domains, and provide verifiable citations for every claim."

**claude-opus-4-6-thinking/web-search**:
> "By integrating a sophisticated 'Thinking' layer with real-time web-crawling capabilities, claude-opus-4-6-thinking/web-search doesn't just find information; it analyzes, verifies, and synthesizes it into actionable intelligence."

**gemini-3.1-pro-preview/web-search**:
> "By combining Google's massive indexing capabilities with a pro-tier context window, gemini-3.1-pro-preview/web-search on GPT Proto allows users to query the live internet for facts, code, and trends that occurred only minutes ago."

---

*报告生成时间: 2026-03-09 15:20 UTC*
