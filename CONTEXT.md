# GEO 项目上下文

> 所有 agent 接到 GEO 任务时必须先读此文件。
> 最后更新：2026-03-10

---

## 飞书通道

| 用途 | 群组 ID |
|------|--------|
| GEO 日报 / 周报 / 数据报告推送 | `oc_ca3c110b00634571ceafede013362cf5` |
| GEO 项目工作群（零一接受指令） | `oc_13ec20cd51934f0d58241bce2e5397b6` |

---

## 项目定位

**内部工具**，用于 AI 搜索引擎优化（Generative Engine Optimization）的监控、分析和优化。

**核心价值：GEO 运营闭环，不是纯监控工具。**
```
发现问题（监控）→ 定位原因（分析）→ 执行优化（行动）→ 验证效果（追踪）
```

**背景：**
- 主人负责新品的 GEO 工作，目前委托代理公司（96geo.com）运营但不满意
- 核心痛点：无法自主验证代理数据、缺乏过程指标、优化动作与效果脱节
- 目标：建立内部 GEO SOP，验证新品 GEO 效果（标杆：HelloTalk）

**目标用户：** 内部使用优先，验证后考虑对外
**市场优先级：** 国际 > 国内

---

## 当前阶段：M2 链路验证完成，准备 M3 全量采集

| 里程碑 | 状态 | 说明 |
|--------|------|------|
| M0 PRD + 架构 | ✅ 完成 | PRD v0.1 确认，API 格式验证 |
| M1 单引擎跑通 | ✅ 完成 | collector/analyzer/storage 框架，demo 4/5 |
| M2 三引擎链路验证 | ✅ 完成 | 3引擎 × 3 Prompt，全部成功，第一份周报产出 |
| M3 全量 50 Prompt | ✅ 完成 | run#21，3引擎×50P=150条，整体提及率58.7% |
| M4 第一份完整周报（全量版） | 🔄 进行中 | reporter.py 重写中（T001），预计本周完成 |
| M5 GEO运营SOP落地 | 📋 pending | SOP文档已完成（docs/GEO-SOP.md），待M4完成后执行 |

---

## API Keys 配置（重要，agent 必读）

| 引擎 | 模型 | Key 路径 | 状态 |
|------|------|---------|------|
| ChatGPT | gpt-5-mini (web search) | `~/.config/gptproto/api_key` | ✅ 已配置 |
| Claude | claude-haiku-4-5 (web search) | `~/.config/gptproto/api_key`（同上） | ✅ 已配置 |
| Gemini | gemini-2.5-flash (Google Search) | `~/.config/aistudio/api_key` | ✅ 已配置 |
| Perplexity | sonar | 待获取 | ❌ 低优先级，暂缓 |

⚠️ 重要：secrets 原始文件在 `~/.config/geo/secrets`，collector.py 读的是上表路径。key 更新时两处都要同步。

调用接口详见 `/root/projects/geo/design/api-verified.md`。

---

## 代码结构

```
/root/projects/geo/
├── CONTEXT.md          ← 本文件，所有 agent 接任务前必读
├── PRD.md              ← 产品需求文档 v0.1
├── config/
│   └── prompts.json    ← 50 个监控 Prompt（5类）
├── src/
│   ├── collector.py    ← 多引擎采集，每 Prompt 跑3次取中位数
│   ├── analyzer.py     ← LLM 分析（情感/提及/竞品）
│   ├── storage.py      ← SQLite 存储
│   ├── reporter.py     ← 周报生成
│   ├── run_demo.py     ← M1 demo
│   └── run_full.py     ← M2+ 全量运行（支持 --engines --limit --dry-run）
├── data/geo.db         ← SQLite 数据库
├── reports/            ← 周报输出目录
├── research/           ← Scout 调研产出
├── design/             ← 架构文档、API 格式
└── notes/decisions.md  ← 决策日志
├── docs/
│   └── GEO-SOP.md      ← GEO运营行动SOP（用户场景+闭环流程+指标目标）
├── TASKS.md            ← 任务总线（项目管理核心）
```

**run_full.py 用法：**
```bash
# 全量跑（需先 source ~/.config/geo/secrets 或确认 key 路径）
python3 src/run_full.py --engines gptproto-claude,gptproto-gemini,gptproto-gpt

# 生成周报
python3 src/reporter.py --latest --brand HelloTalk --output-dir reports
```

---

## 分工

| Agent | 职责 |
|-------|------|
| 零一 | 项目调度、架构决策、阶段推进、记忆维护 |
| Rex | 工程实现、系统开发、bug 修复 |
| Scout | 情报收集、竞品调研、市场监控 |
| Dash | 数据分析、指标设计（M3 后介入） |
| 主人 | 产品决策、外部资源（账号/付费工具/一手信息） |

---

## 已知 Bug

| 问题 | 状态 |
|------|------|
| 排名位置 avg_position 出现异常值（1016等），存储逻辑 bug | ⏳ M3 前修复 |
| Rex 超时：450次 API 调用需分批执行（每批建议 ≤50次） | ⚠️ M3 注意 |

---

## 自动化任务状态

| 任务 | cron ID | 触发时间 | 状态 |
|------|---------|---------|------|
| GEO 周报生成+推送 | `5ad55e40-...` | 每周一 08:00 Asia/Shanghai | ✅ 运行中 |

## TODO（主人待处理）

- [ ] Perplexity API Key（低优先级）：https://www.perplexity.ai/settings/api
- [ ] Google AI Overview 采集方式决策（Search Console / 第三方工具 / 自动化）

---

## 关键决策

| 日期 | 决策 | 理由 |
|------|------|------|
| 2026-03-09 | 先做调研再设计 | 避免闭门造车 |
| 2026-03-09 | 内部工具优先 | 降低早期风险 |
| 2026-03-10 | Perplexity 降级低优先级 | 先跑通3引擎不阻塞进度 |
| 2026-03-10 | Google AI Overview 暂不纳入 MVP | 无官方 API |
| 2026-03-10 | 建立 GEO 专属项目工作群 | 多项目并行时保持上下文隔离 |

## 飞书文档 URL 拼接规则（2026-03-10 踩坑）

**Bot 创建文档后，URL 必须用企业域名拼接：**
```python
# ❌ 错误：open.feishu.cn 是 API 域名，用户打不开
doc_url = f"https://open.feishu.cn/docx/{doc_id}"

# ✅ 正确：用企业自定义域名
doc_url = f"https://hellotalk.feishu.cn/docx/{doc_id}"
```

**权限设置完整步骤（Bot 创建文档后）：**
1. PATCH `/drive/v1/permissions/{doc_id}/public?type=docx`，设置 `link_share_entity: anyone_readable`
2. POST `/drive/v1/permissions/{doc_id}/members?type=docx`，添加目标用户 openid 为 `full_access`
3. 所需 Bot 权限：`docx:document`, `drive:file`, `docs:permission:member:create`
