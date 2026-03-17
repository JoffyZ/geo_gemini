# GEO 监测与运营系统

## What This Is

一个多行业通用的 GEO（生成式引擎优化）监测和运营平台。系统自动监测品牌在 AI 搜索引擎（ChatGPT, Perplexity, Gemini, Google AI Overviews）中的全球表现，包括提及率、排名、情感分析和引用来源。系统支持对 Prompt 进行精细化归类和多国家配置，帮助运营团队量化品牌在不同地区、不同业务线下的可见度。

## Core Value

**不仅是监测，更是内容的“认知溯源”。** 通过高精度接入 Vertex AI, Azure 和 Perplexity，系统不仅量化品牌排名，更深度挖掘 AI 的信息来源。系统复刻官方桌面端交互体验，提供**客观归因分析**（AI 正在看谁的内容？），帮助运营团队通过事实数据指导内容分发策略。

## Current State
- **Shipped Version**: v1.0 (MVP) - 2026-03-13
- **Active Version**: v1.1 (客观归因与官方体验复刻) - 📋 In Progress

## Next Milestone Goals (v1.1)
- **Authenticity**: 接入官方原生 API (Vertex Grounding, Azure, Perplexity)，替代模拟逻辑。
- **Attribution**: 实现高精度的引用来源溯源与原文透视。
- **UX**: 在 Dashboard 复刻官方 Web 端的引用角标与来源卡片交互。

## Requirements (v1.1 Summary)

**高精度数据接入**
- [ ] 接入 Vertex AI 并开启 Google Search Grounding。
- [ ] 接入 Azure OpenAI 并关联 Bing 搜索数据源。
- [ ] 接入 Perplexity sonar 模型并配置 Web 搜索。

**客观归因分析**
- [ ] 系统提取引用原文片段 (Snippets) 与对应 URL。
- [ ] 系统生成“行业权威源清单”，展示特定分类下被引用最频繁的网站。
- [ ] 支持横向对比不同 AI 供应商的“信息源偏好”。

**官方体验复刻**
- [ ] 在 Dashboard 渲染引用角标 [1], [2] 及其对应的悬浮卡片。
- [ ] 优化首页重定向与全局侧边栏导航。

## Technical Stack

- **Frontend**: Next.js 15, Shadcn UI, Recharts.
- **Backend**: Next.js Server Actions, TypeScript, Drizzle ORM.
- **Database**: Supabase (PostgreSQL), Materialized Views.
- **AI/LLM**: Vertex AI (Google), Azure OpenAI, Perplexity API.

---
*Last updated: 2026-03-13 for Milestone v1.1 Planning*
