# Requirements

## Vision & Scope

构建一个多行业通用的 GEO（生成式引擎优化）监测和运营平台，量化品牌在主流 AI 平台（ChatGPT, Perplexity, Gemini, Google AI Overviews）中的全球可见度，支持按问题性质精细化归类，识别高价值优化机会。

### Target Audience
- 品牌运营团队（监测全球品牌声量）
- SEO/GEO 专家（针对不同类别 Prompt 执行优化）
- 市场分析师（竞品及行业趋势分析）

---

## Functional Requirements

### 1. 问题库管理 (Prompt Management)
- **[MUST]** 支持问题的 CRUD 操作及搜索过滤。
- **[MUST]** **问题归类 (Categorization)**: 支持按业务性质（如：品牌词、竞品词、行业通用词）或漏斗阶段进行层级化归类。
- **[MUST]** 支持 CSV/Excel 批量导入导出，包含分类信息。
- **[SHOULD]** **Prompt Generator**: 基于核心关键词自动生成符合特定归类性质的问题集。
- **[SHOULD]** **AI Volume**: 集成搜索热度指标，支持按热度排序。

### 2. AI 自动监测 (Automated Monitoring)
- **[MUST]** 支持多平台监测：ChatGPT, Perplexity, Gemini, Google AI Overviews。
- **[MUST]** **多国家/地区 (Multi-Country)**: 支持为每个监测计划配置目标国家（如：美国、中国、英国），利用代理或平台原生参数模拟当地请求。
- **[MUST]** 支持定时任务调度及指数退避重试。
- **[MUST]** **Structured Extraction**: 结构化提取品牌、排名、情感、引用。

### 3. 总览看板 (Dashboard & Analytics)
- **[MUST]** 核心指标卡片，支持按 **AI 平台、国家、问题分类、时间** 进行多维联动筛选。
- **[MUST]** 趋势可视化：展示各分类、各国家下品牌提及率和排名的变化轨迹。
- **[SHOULD]** 竞品对比分析：在特定分类和国家维度下的品牌竞争力对比。

### 4. 引用来源分析 (Citation Analysis)
- **[MUST]** 提取并去重 AI 引用的域名和具体 URL。
- **[SHOULD]** 引用来源按国家/分类进行分布分析。

### 5. 运营工具 (Operation Tools)
- **[MUST]** **Prompt Explorer**: 支持指定国家、指定平台进行单次测试。
- **[COULD]** **Action Logging**: 记录针对特定分类问题的优化动作。

### 6. 数据与 SaaS 基础 (Data & SaaS)
- **[MUST]** **Multi-Tenancy**: 租户隔离，预留 SaaS 能力。
- **[MUST]** **Country-Level Data Partitioning**: 数据存储需包含 country_code 维度。

---

## Non-Functional Requirements

### 1. Performance & Reliability
- **聚合查询**: 针对分类和国家的复杂聚合查询响应时间 < 2s。
- **全球代理**: 监测任务需具备稳定切换不同国家 IP 的能力。

### 2. Maintainability
- **Logging**: 日志需携带 tenant_id, prompt_id, country_code 等关键追踪维度。

---

## Technical Stack (Recommended)

- **Frontend**: Next.js 15, Shadcn UI, Recharts.
- **Backend**: Node.js, TypeScript, Drizzle ORM.
- **Database**: PostgreSQL + TimescaleDB (含 country_code 索引), Redis.
- **AI/LLM**: OpenAI/Google SDKs, Playwright (用于 Google AI Overviews 等复杂解析)。

---

## Out of Scope (v1)

- 视频/图片内容解析。
- 实时流式监测。
- 移动端原生 App。
