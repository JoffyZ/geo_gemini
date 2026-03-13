# Roadmap

## Phase 1: Infrastructure & Data Model (Week 1)
*Goal: 建立支持多租户、多分类、多国家的数据库骨架。*

- **1.1 Database Architecture**
  - [ ] 配置 PostgreSQL + TimescaleDB + Redis。
  - [ ] 定义 Drizzle Schema：增加 `categories` 表和 `results` 中的 `country_code` 字段。
- **1.2 Backend Skeleton**
  - [ ] 初始化 Node.js TypeScript 环境，搭建租户与国家上下文。
  - [ ] BullMQ 队列初始化。

## Phase 2: Monitoring & Parsing Engine (Week 2-3)
*Goal: 实现支持地理位置模拟的 AI 监测引擎。*

- **2.1 Geo-Specific Adapters**
  - [ ] 实现支持 `country_code` 参数的适配器（通过 Proxy 或 API 原生 Location 参数）。
  - [ ] 集成 OpenAI, Perplexity, Gemini, Google AI Overviews。
- **2.2 Structured Parsing Service**
  - [ ] 优化 LLM 解析逻辑，确保存储结果包含国家维度。
- **2.3 Prompt Explorer (POC)**
  - [ ] 支持在 UI 选择国家并即时测试提问。

## Phase 3: Automation & Scheduled Jobs (Week 4)
*Goal: 实现全球化定时监测任务。*

- **3.1 Job Scheduler (Global)**
  - [ ] 实现按国家和分类并行的监测任务派发逻辑。
- **3.2 Error Handling & Logging**
  - [ ] 增加按国家维度的任务成功率统计。

## Phase 4: Core Management UI (Week 5)
*Goal: 交付分类管理与多国家配置界面。*

- **4.1 Category Management**
  - [ ] 实现分类的 CRUD 及问题关联。
- **4.2 Multi-Country Config**
  - [ ] 实现监测计划的国家选择与代理配置界面。
- **4.3 Prompt Library**
  - [ ] 支持按分类和国家筛选问题。

## Phase 5: Dashboard & Analytics (Week 6-7)
*Goal: 交付多维筛选看板。*

- **5.1 Multi-Dim Aggregation**
  - [ ] 优化聚合查询，支持平台/国家/分类的交叉分析。
- **5.2 Visualization Layer**
  - [ ] 实现 Dashboard 筛选器与多维趋势图表。
- **5.3 Data Export**
  - [x] 实现支持多维筛选的 CSV 数据导出接口。

## Phase 6: Differentiators (Week 8+)
- **6.1 AI Volume (Global)**: 不同国家的搜索热度差异分析。
- **6.2 Prompt Generator (Localized)**: 针对不同文化背景自动生成 localized prompts。
