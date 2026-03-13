---
phase: 03-automation-scheduled-jobs
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [
  "src/app/api/cron/dispatch/route.ts",
  "src/lib/queue/worker.ts",
  "src/db/schema.ts",
  "src/lib/queue/index.ts",
  "src/app/api/stats/failures/route.ts"
]
autonomous: true
requirements: [3.1, 3.2]
---

<objective>
实现 GEO 监测系统的全球化定时任务调度与异常监控体系。
通过 Vercel Cron 触发 Master Dispatcher，将监测任务按国家、平台、分类维度分发至 BullMQ 分布式队列，并建立完善的日志与失败率分析机制。
</objective>

<execution_context>
@./.gemini/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@tasks/T012.md
@tasks/T013.md
@tasks/T014.md
@tasks/T015.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Vercel Cron Dispatcher (T012)</name>
  <files>src/app/api/cron/dispatch/route.ts</files>
  <action>
    实现基于 Vercel Cron 的任务分发中心。
    1. 校验 CRON_SECRET。
    2. 获取所有 active prompts。
    3. 按照国家 (US, GB, CN) 和平台 (GPT, Perplexity 等) 矩阵生成任务。
    4. 批量添加至 BullMQ 队列。
  </action>
  <verify>curl -H "Authorization: Bearer test_secret" http://localhost:3000/api/cron/dispatch</verify>
  <done>所有维度的监测任务成功进入队列，并能防止同一周期内的重复分发。</done>
</task>

<task type="auto">
  <name>Task 2: Global Worker Integration (T013)</name>
  <files>src/lib/queue/worker.ts</files>
  <action>
    将 BullMQ Worker 与实际的监测引擎（Adapter + Parser）打通。
    1. 解析 Job Data。
    2. 实例化对应国家/平台的 Adapter。
    3. 执行 AI 查询与 LLM 解析。
    4. 结果存入 monitoring_results 表。
  </action>
  <verify>npm run dev (并观察 worker 日志输出)</verify>
  <done>Worker 能自动处理队列中的全球化任务并将解析结果持久化。</done>
</task>

<task type="auto">
  <name>Task 3: Logging & Error Analytics (T014, T015)</name>
  <files>src/db/schema.ts, src/lib/queue/index.ts, src/app/api/stats/failures/route.ts</files>
  <action>
    建立监控指标与异常处理体系。
    1. 在 schema 中增加 monitoring_job_logs 表。
    2. 在 Worker 中集成详细的执行日志记录（状态、耗时、错误码）。
    3. 实现 /api/stats/failures API 提供按国家维度的成功率统计。
    4. 优化 BullMQ 的退避策略 (Backoff) 处理地理代理常见的暂时性网络错误。
  </action>
  <verify>访问 /api/stats/failures 查看聚合后的监控报表数据。</verify>
  <done>系统具备可观测性，能清晰识别不同国家、平台的失败原因分布。</done>
</task>

</tasks>

<must_haves>
  truths:
    - "定时任务能通过 API 安全触发"
    - "监测任务能按国家和平台并行分发"
    - "任务执行结果及错误详情有据可查"
    - "支持按国家维度查看任务解析成功率"
  artifacts:
    - path: "src/app/api/cron/dispatch/route.ts"
      provides: "Dispatcher endpoint"
    - path: "src/db/schema.ts"
      provides: "Monitoring logs table"
    - path: "src/lib/queue/worker.ts"
      provides: "Core task processor"
  key_links:
    - from: "Vercel Cron"
      to: "/api/cron/dispatch"
      via: "HTTP GET"
    - from: "/api/cron/dispatch"
      to: "BullMQ Queue"
      via: "queue.add"
</must_haves>

<success_criteria>
- 通过一次 Cron 触发，自动在分布式队列中生成并执行多维度的监测任务。
- 所有的执行记录（无论成功失败）均在数据库中有详细日志。
- 统计 API 能够正确反映出地理性监测的运行健康度。
</success_criteria>

<output>
After completion, create `.planning/phases/03-automation-scheduled-jobs/03-01-SUMMARY.md`
</output>
