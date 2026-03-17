# Requirements (v1.1 - 客观归因与官方体验复刻)

## 1. 官方 API 深度集成

### 1.1 Vertex AI (Google Cloud) [MUST]
- **[MUST]** 接入 `gemini-1.5-flash` 和 `gemini-1.5-pro`。
- **[MUST]** 开启 `google_search` grounding 工具。
- **[MUST]** 结构化提取 `groundingMetadata` 中的引用块、URL 和搜索查询词。

### 1.2 Azure OpenAI [MUST]
- **[MUST]** 接入 `gpt-4o` 和 `gpt-4o-mini`。
- **[MUST]** 配置 `On Your Data` 结合 Bing Search。
- **[MUST]** 提取响应中的引用列表 (Citations)。

### 1.3 Perplexity API [MUST]
- **[MUST]** 接入 `sonar` 系列模型。
- **[MUST]** 结构化处理响应中的 `citations` 数组。

---

## 2. 客观归因分析引擎

### 2.1 引用来源深度提取 [MUST]
- **[MUST]** 将所有监测结果中的引用 URL 进行去重、域名提取和分类。
- **[MUST]** 存储引用片段 (Snippet)：记录 AI 到底引用了网页中的哪句话。

### 2.2 权威源清单 (Authority Map) [MUST]
- **[MUST]** 按“分类 + 国家”维度聚合引用频次最高的 Top 20 域名。
- **[SHOULD]** 标记“造王者”来源：识别出在多个 AI 平台中都被共同引用的核心信息源。

---

## 3. 官方体验复刻 UI (UX Replication)

### 3.1 引用角标交互 [MUST]
- **[MUST]** 在 Dashboard 的回答详情中，渲染可点击的引用角标 [1], [2]。
- **[MUST]** 悬浮展示来源卡片：包含网站 Favicon、标题、域名、以及被引用的原文片段。

### 3.2 供应商对比看板 [SHOULD]
- **[SHOULD]** 提供一个对比视图，展示同一问题在不同供应商（Vertex vs Azure vs Perplexity）下的引用重合度。

---

## 4. 全球化增强 [MUST]

### 4.1 物理坐标库 (GeoMatrix) [MUST]
- **[MUST]** 建立内置的全球主要城市坐标库。
- **[MUST]** 将坐标动态注入到 Vertex 和 Perplexity 的地理模拟参数中。

---

## 5. 稳定性与安全性 [SHOULD]

### 5.1 RLS 安全加固 [SHOULD]
- **[SHOULD]** 在 Supabase 中实现行级安全 (RLS) 策略，确保 `tenant_id` 在数据库层面强制隔离。
