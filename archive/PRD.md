# GEO 运营系统 PRD v0.1

> 状态：草稿，待主人确认
> 作者：零一
> 日期：2026-03-09

---

## 一、背景与目标

### 问题

我们委托代理公司（96geo.com）负责 HelloTalk 的 GEO 优化，存在三个核心问题：
1. **无法验证数据**：代理给的是情感标签（"积极/消极"），没有排名位置和量化指标
2. **缺过程指标**：不知道做了哪些优化动作、效果如何归因
3. **覆盖不足**：只监控 ChatGPT + Gemini，缺 Perplexity；只有 11 个 Prompt，缺长尾场景

### 目标

建立内部 GEO 运营系统，实现：
- 自主监控：自己跑数据，不依赖代理报告
- 可追踪归因：优化动作 → 指标变化的因果链可见
- 新品 GEO 从零建立：为 Japanese AI App、capsu.AI 等新品上线前建立基准

### 范围

- **MVP**：HelloTalk 作为标杆，跑通完整监控链路，出第一份可信数据报告
- **v2**：接入新品，支持多品牌并行监控
- **不在范围**：UI 界面、对外 SaaS

---

## 二、用户与场景

唯一用户（当前）：主人（负责新品 GEO 工作）

| 场景 | 频率 | 用户需求 |
|------|------|---------|
| 查看周报 | 每周一次 | 了解品牌在各 AI 引擎的曝光变化 |
| 验证代理数据 | 随时 | 用自己的数据交叉核验代理报告 |
| 发现优化机会 | 每周 | 找到"热度高但引用低"的 Prompt |
| 追踪优化效果 | 持续 | 对比优化前后指标变化 |

---

## 三、核心功能（MVP）

### 3.1 Prompt 库（50个）

**品牌直查（5个）**
1. What is HelloTalk?
2. Is HelloTalk safe?
3. Is HelloTalk free?
4. How does HelloTalk work?
5. HelloTalk review

**品类通用（15个）**
6. Best app to learn Japanese
7. Best language learning app 2025
8. Best free language learning app
9. Best AI language learning app
10. Duolingo alternatives
11. Best app to learn Japanese for beginners
12. Best Japanese learning app for adults
13. Free Japanese learning app
14. AI language tutor app
15. Best app to practice speaking Japanese
16. Best language exchange app
17. How to learn Japanese fast
18. Best app for Japanese conversation practice
19. Best Japanese learning app for iPhone
20. Best Japanese learning app for Android

**竞品对比（10个）**
21. HelloTalk vs Duolingo
22. HelloTalk vs Tandem
23. HelloTalk vs iTalki
24. HelloTalk vs Pimsleur
25. HelloTalk vs Babbel for Japanese
26. Duolingo vs AI language apps
27. Best Duolingo alternative for Japanese
28. TalkPal vs HelloTalk
29. Speak app vs HelloTalk
30. Best language exchange app vs Duolingo

**AI 辅助学习场景（10个）**
31. AI language learning app
32. AI conversation practice app
33. ChatGPT for language learning
34. Best AI tutor for Japanese
35. AI Japanese speaking practice
36. Can AI replace language tutors?
37. AI app to improve Japanese pronunciation
38. Best AI app for language exchange
39. AI-powered Japanese learning
40. ChatGPT alternatives for language learning

**长尾/细分（10个）**
41. Best app to learn Japanese from scratch
42. Learn Japanese while commuting app
43. Japanese learning app with speech recognition
44. Japanese learning app with native speakers
45. Social app to practice Japanese
46. Japanese learning app with grammar correction
47. Best app to learn Japanese Hiragana
48. Japanese learning app for business Japanese
49. Learn Japanese online free app
50. Japanese learning community app

### 3.2 监控引擎

- 覆盖：ChatGPT、Perplexity、Claude、Gemini（4个）
- 数据采集：完整回答原文 + 是否提及品牌 + 排名位置 + 引用来源
- 频率：每周一次（cron），支持手动触发

### 3.3 核心指标

| 指标 | 定义 |
|------|------|
| 提及率 | 被提及次数 / 总 Prompt 数 |
| 平均排名 | 被提及时的平均位置 |
| 引擎覆盖 | 有提及的引擎数 / 4 |
| Prompt 机会分 | 热度 × (1 / 排名)，越高越值得优化 |

竞品同步追踪：Duolingo、Talkai、Tandem

### 3.4 周报

自动生成 Markdown 报告，包含：
1. 摘要：本周 vs 上周变化
2. 引擎分布：各引擎提及率对比
3. Prompt 机会矩阵：热度高 × 排名低 = 优先优化
4. 竞品对比
5. 本周改善/退步的 Prompt 列表

保存至 `/root/projects/geo/reports/YYYY-WW.md` + 飞书推送

### 3.5 优化行动日志

记录每次优化动作（日期 + 内容 + 目标 Prompt + 预期影响），跑监控时自动关联，报告中体现"优化后变化"。

---

## 四、技术方案

| 层 | 选型 | 说明 |
|----|------|------|
| 语言 | Python 3.11+ | |
| 存储 | SQLite | 轻量，够用 |
| AI 调用 | OpenAI / Anthropic / Perplexity API | 各引擎官方 API |
| 调度 | OpenClaw cron | 已有基础设施 |
| 输出 | Markdown + 飞书消息 | 无需 UI |
| 仓库 | /root/projects/geo/ | 已初始化 git |

详细架构由 Rex 完成 → `/root/projects/geo/design/architecture.md`

---

## 五、验收标准（MVP Done）

- [ ] 能对 HelloTalk 运行完整监控（4引擎 × 50 Prompt）
- [ ] 数据正确存储，可查历史记录
- [ ] 自动生成周报，可与代理报告交叉核验
- [ ] Prompt 机会矩阵可识别优化机会
- [ ] 竞品（Duolingo）数据同步采集

---


### 3.6 监控节奏（分层）

| 层级 | 频率 | Prompt数 | 引擎 | 调用量 | 估算成本 |
|------|------|---------|------|--------|---------|
| 日报（核心） | 每天 | 10个核心 | 4个 × 3次 | 120次 | ~$0.15/天 |
| 周报（全量） | 每周 | 50个 | 4个 × 3次 | 600次 | ~$0.75/次 |
| 月报（深度） | 每月 | 50个+引用源分析 | 4个 × 3次 | 600次+ | ~$1/次 |

**说明：**
- 每个 Prompt 跑 3 次取中位数，减少 AI 随机性噪音
- 日报只推送"有变化"的内容，无变化不打扰
- 以报表（周报/月报）为权威数据，日报为预警信号

### 3.7 文本分析模板（预置，粗版）

每条回答原文存储后，用 LLM 执行以下分析，结果存入数据库：

```
1. 品牌提及检测     → 是/否 + 位置（第N个被推荐）
2. 情感判断         → 正面/中性/负面 + 置信度(0-1)
3. 推荐理由提取     → 被推荐的核心理由（最多3条）
4. 负面风险词检测   → 是否含转折+负面描述（是/否 + 原文摘录）
5. 竞品共现分析     → 同时提到了哪些竞品（列表）
6. 核心描述词       → 对品牌的关键形容词（最多5个）
```

第一期目标：**验证哪些维度可采集、哪些有实际价值**，报表设计在跑 2-3 周数据后决定。

### 3.8 API 依赖

| 引擎 | API | 联网能力 | 引用源 | 状态 |
|------|-----|---------|--------|------|
| Perplexity | Perplexity API | ✅ 天然联网 | ✅ citations 字段 | 待配置 |
| ChatGPT | OpenAI API (gpt-4o-search-preview) | ✅ 需 web_search tool | ⚠️ 不稳定 | 待配置 |
| Gemini | Gemini API + Search Grounding | ✅ 需启用 | ⚠️ 需额外配置 | 待配置 |
| Claude | Anthropic API | ❌ 无联网 | ❌ | 待配置，仅做文本分析 |

## 六、明确不做的事

- 不做 Web UI
- 不做实时监控（每周一次足够）
- 不做中文 AI 引擎（v2 再加）
- 不做内容生成（v2 再加）
- 不做多用户/权限系统

---

## 七、里程碑

| 里程碑 | 内容 | 负责人 | 预计 |
|--------|------|--------|------|
| M0 | PRD 确认 + 架构设计 | 零一 + Rex | 本周 |
| M1 | 数据采集脚本跑通（单引擎） | Rex | 本周 |
| M2 | 4引擎 × 50 Prompt 全量跑通 | Rex | 下周 |
| M3 | 第一份完整周报产出 | Rex + 零一 | 下周 |
| M4 | 与代理报告交叉核验 | 主人 | 下周 |

---

*待主人确认后，零一将拆解任务派给 Rex 开始开发。*
