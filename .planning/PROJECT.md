# GEO 监测与运营系统

## What This Is

一个多行业通用的 GEO（生成式引擎优化）监测和运营平台。系统自动监测品牌在 AI 搜索引擎（ChatGPT, Perplexity, Gemini, Google AI Overviews）中的全球表现，包括提及率、排名、情感分析和引用来源。系统支持对 Prompt 进行精细化归类和多国家配置，帮助运营团队量化品牌在不同地区、不同业务线下的可见度。

## Core Value

**知道该优化哪些问题。** 通过智能问题库生成、AI Volume 计算和全球化监测，让运营团队明确优先级。支持**分类运营**（针对不同性质的 Prompt 采取不同优化动作）和**区域差异分析**（监测不同国家的 AI 推荐差异），实现精细化运营，追踪优化 ROI。

## Requirements

### Active

**问题库管理（核心）**
- [ ] 用户可以手动输入问题进行单次 AI 测试（Prompt Explorer）
- [ ] 系统可以基于关键词自动生成相关问题集（Prompt Generator）
- [ ] 系统显示每个问题的 AI Volume（搜索热度/流量预估）
- [ ] 用户可以管理问题库（CRUD、层级化归类、标签、批量导入）
- [ ] **问题归类**：支持按业务性质（品牌词、竞品词、行业词等）进行层级化归类

**AI 自动监测**
- [ ] 系统每天自动向 AI 平台提问并抓取回答
- [ ] **全球化支持**：支持配置不同国家（US, CN, UK 等）的请求，监测全球表现
- [ ] 系统解析 AI 回答中的品牌名称、排名、情感、引用来源
- [ ] 系统量化监测指标（提及率、平均排名、情感得分）
- [ ] 支持多 AI 平台监测（ChatGPT, Perplexity, Gemini, Google AI Overviews）
- [ ] 支持定时任务调度和失败重试

**总览看板**
- [ ] 用户可以在 Dashboard 看到核心指标卡片（支持 AI 平台/时间/国家/分类多维筛选）
- [ ] 用户可以看到品牌 vs 竞品的提及率/排名/情感趋势图
- [ ] 用户可以查看全球及分类下的 Top 引用来源详情

### Out of Scope

- AI 内容自动生成功能
- 实时流式监测（v1 每天执行即可）
- **移动端原生 App**（本系统仅提供高度适配的 **Web 端**）
- 多语言本地化（v1 仅支持中英界面）

## Context

**行业背景：**
随着 AI 搜索引擎的兴起，用户获取信息的方式正在转变。GEO（Generative Engine Optimization）成为新的优化方向，但缺乏有效的量化监测工具。

**竞品参考：**
- 国内：AIbase（监测国内 AI 平台）
- 海外：Topify AI（功能最完善）、Otterly.ai（侧重引用分析）

**技术挑战：**
1. **AI Volume 数据源**：问题的搜索热度如何准确获取？
   - 策略：集成 Google Trends API (初期) → 引入第三方 SEO 关键词工具 API (后期)。
2. **多国家请求模拟**：如何稳定模拟不同国家的 AI 响应？
   - 策略：配置全球代理节点 + 利用 AI 平台原生地理位置参数。
3. **AI 回答鲁棒解析**：不同平台、不同格式、不同国家的回答差异巨大。
   - 策略：使用小参数 LLM (如 GPT-4o-mini) 进行 Schema 结构化提取，而非正则。
4. **数据存储与压力**：每日多平台、多国家的数据会迅速膨胀。
   - 策略：使用 TimescaleDB  hypertables 管理时间序列数据，配置自动压缩与清理策略。

## Constraints

- **时间**：1-2 个月完成 v1 完整功能体系。
- **目标平台**：**仅限 Web 端**（Responsive Web Design），不考虑原生 App。
- **成本**：初期控制 API 费用，针对简单解析任务使用廉价模型。

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 先作为内部工具，架构预留 SaaS 能力 | 快速验证价值，避免过度设计；但必须确保数据隔离 | — Pending |
| 放弃正则解析，采用 LLM 解析器 | AI 响应格式多变，正则维护成本极高，LLM 更具鲁棒性 | — Pending |
| 使用 TimescaleDB | 核心业务是趋势分析，时间序列优化是性能关键 | — Pending |

---
*Last updated: 2026-03-13 after initialization with context restoration*
