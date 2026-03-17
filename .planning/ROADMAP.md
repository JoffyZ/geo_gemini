# Roadmap

## Archived Milestones
- [v1.0 - MVP 搭建完成](./milestones/v1.0-ROADMAP.md) (2026-03-13)

## Current Milestone: v1.1 - 客观归因与官方体验复刻

### Phase 8: 官方数据管道升级 (Week 1)
*Goal: 接入具有 Grounding 能力的官方 API，获取高精度引用数据。*

- **8.1 Vertex AI Integration**
  - [ ] 封装 Vertex AI SDK 适配器。
  - [ ] 实现 Google Search Grounding 参数注入。
- **8.2 Azure & Perplexity Refinement**
  - [ ] 接入 Azure OpenAI (On Your Data) 和 Perplexity (Sonar)。
- **8.3 GeoMatrix Implementation**
  - [ ] 构建全球主要城市物理坐标库。

### Phase 9: 归因引擎与存储扩展 (Week 2)
*Goal: 建立“信息源 -> 品牌影响”的深度归因数据模型。*

- **9.1 Schema Evolution**
  - [ ] 扩展 `monitoring_results` 存储引用片段、URL 锚点及搜索路径。
- **9.2 Attribution Logic**
  - [ ] 实现引用来源频次统计与分类逻辑。
  - [ ] 开发“行业权威源”预计算任务。

### Phase 10: 官方体验 UI 复刻 (Week 3)
*Goal: 交付沉浸式的引用交互体验与归因看板。*

- **10.1 Citation Component (Replication)**
  - [ ] 实现富文本渲染器，将 [1][2] 自动转为交互式角标。
  - [ ] 开发 Source Hover Card (展示来源摘要与原文片段)。
- **10.2 Authority Dashboard**
  - [ ] 交付“归因地图”视图，展示 Top 信息源分布。
- **10.3 Security Hardening**
  - [ ] 实现 Supabase RLS 策略加固。

---
*Managed via .planning/ for Milestone v1.1*
