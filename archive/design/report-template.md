# GEO 周报 | HelloTalk | {YYYY-WNN}

> 数据区间: {run_ids} | 生成时间: {timestamp} | 引擎覆盖: {engines}

---

## 📋 执行摘要（30秒速览）

| 核心指标 | 本周 | 上周 | 变化 |
|---------|------|------|------|
| 品牌提及率 | {brand_mention_rate}% | {prev_brand_mention_rate}% | {brand_mention_change} |
| 平均排名 | #{avg_position} | #{prev_avg_position} | {position_change} |
| 最佳引擎 | {best_engine} | | |
| 最大机会 | {top_opportunity_prompt} | | |

**本周结论（1-2句话）：**
{weekly_summary}

---

## 🏷️ 品牌直查（必看）

品牌直查类 Prompt 表现矩阵（5 Prompt × 3 引擎）：

| Prompt | Claude | Gemini | GPT | 平均排名 |
|--------|--------|--------|-----|----------|
| What is HelloTalk? | {pos_1} | {pos_2} | {pos_3} | {avg_1} |
| Is HelloTalk safe? | {pos_4} | {pos_5} | {pos_6} | {avg_2} |
| Is HelloTalk free? | {pos_7} | {pos_8} | {pos_9} | {avg_3} |
| How does HelloTalk work? | {pos_10} | {pos_11} | {pos_12} | {avg_4} |
| HelloTalk review | {pos_13} | {pos_14} | {pos_15} | {avg_5} |

> ✓ = 提及但无排名 / ✗ = 未提及 / #N = 具体排名

---

## 📊 分引擎对比

| 引擎 | 请求数 | 成功率 | 提及率 | 平均排名 | Avg Tokens | Avg Duration | Est. Cost |
|------|--------|--------|--------|----------|------------|--------------|-----------|
| Claude | {claude_queries} | {claude_success}% | {claude_mention}% | #{claude_position} | {claude_tokens} | {claude_duration}ms | ${claude_cost} |
| Gemini | {gemini_queries} | {gemini_success}% | {gemini_mention}% | #{gemini_position} | {gemini_tokens} | {gemini_duration}ms | ${gemini_cost} |
| GPT | {gpt_queries} | {gpt_success}% | {gpt_mention}% | #{gpt_position} | {gpt_tokens} | {gpt_duration}ms | ${gpt_cost} |

---

## 🔍 分类别表现

5 类 Prompt 的提及率对比：

| 类别 | 查询数 | 提及率 | 平均排名 | 最佳Prompt | 最差Prompt |
|------|--------|--------|----------|------------|------------|
| brand_direct | {bd_queries} | {bd_mention}% | #{bd_position} | {bd_best} | {bd_worst} |
| category_general | {cg_queries} | {cg_mention}% | #{cg_position} | {cg_best} | {cg_worst} |
| competitor | {comp_queries} | {comp_mention}% | #{comp_position} | {comp_best} | {comp_worst} |
| ai_scene | {ai_queries} | {ai_mention}% | #{ai_position} | {ai_best} | {ai_worst} |
| long_tail | {lt_queries} | {lt_mention}% | #{lt_position} | {lt_best} | {lt_worst} |

---

## 🎯 机会矩阵（行动优先级）

按机会分排序的 Prompt 列表（机会分 = (1-提及率)×5 + max(0,平均排名-3) + 竞品独占×2）：

| 排名 | Prompt | 类别 | 提及率 | 平均排名 | 竞品独占 | 机会分 |
|------|--------|------|--------|----------|----------|--------|
| 1 | {opp1_prompt} | {opp1_cat} | {opp1_mention}% | #{opp1_pos} | {opp1_exclusive} | {opp1_score} |
| 2 | {opp2_prompt} | {opp2_cat} | {opp2_mention}% | #{opp2_pos} | {opp2_exclusive} | {opp2_score} |
| 3 | {opp3_prompt} | {opp3_cat} | {opp3_mention}% | #{opp3_pos} | {opp3_exclusive} | {opp3_score} |
| ... | ... | ... | ... | ... | ... | ... |

> 💡 本周优先优化：
> - **{top1_prompt}** — 原因：{top1_reason} → 建议：{top1_suggestion}
> - **{top2_prompt}** — 原因：{top2_reason} → 建议：{top2_suggestion}
> - **{top3_prompt}** — 原因：{top3_reason} → 建议：{top3_suggestion}

---

## ⚔️ 竞品威胁分析

### 竞品独占 Prompt 列表（最高优先级）

| 竞品 | 独占次数 | 威胁等级 | 独占Prompt示例 |
|------|----------|----------|----------------|
| {comp1_name} | {comp1_exclusive} | 🔴 高 | {comp1_prompts} |
| {comp2_name} | {comp2_exclusive} | 🟡 中 | {comp2_prompts} |
| {comp3_name} | {comp3_exclusive} | 🟢 低 | {comp3_prompts} |

### 竞品共现频率

| 竞品 | 总出现 | 与HT共现 | 独占次数 | 威胁指数 |
|------|--------|----------|----------|----------|
| {comp_a_name} | {comp_a_total} | {comp_a_co} | {comp_a_exclusive} | {comp_a_threat} |
| {comp_b_name} | {comp_b_total} | {comp_b_co} | {comp_b_exclusive} | {comp_b_threat} |
| {comp_c_name} | {comp_c_total} | {comp_c_co} | {comp_c_exclusive} | {comp_c_threat} |

---

## 💬 AI 如何描述 HelloTalk

### 推荐理由 TOP 5

1. {reason1} ({reason1_count}次)
2. {reason2} ({reason2_count}次)
3. {reason3} ({reason3_count}次)
4. {reason4} ({reason4_count}次)
5. {reason5} ({reason5_count}次)

### 负面风险词 TOP 10

| 排名 | 风险词 | 出现次数 | 涉及引擎 |
|------|--------|----------|----------|
| 1 | {risk1} | {risk1_count} | {risk1_engines} |
| 2 | {risk2} | {risk2_count} | {risk2_engines} |
| 3 | {risk3} | {risk3_count} | {risk3_engines} |
| ... | ... | ... | ... |

### 情感分布

| 引擎 | 正面 | 中性 | 负面 | 主要情感 |
|------|------|------|------|----------|
| Claude | {claude_pos} | {claude_neu} | {claude_neg} | {claude_dominant} |
| Gemini | {gemini_pos} | {gemini_neu} | {gemini_neg} | {gemini_dominant} |
| GPT | {gpt_pos} | {gpt_neu} | {gpt_neg} | {gpt_dominant} |

### 关键描述词对比

**正面特征：** {positive_descriptors}

**负面特征：** {negative_descriptors}

---

## 💰 运营成本

### 本次成本明细

| 项目 | 数值 |
|------|------|
| 本次总成本 | ${total_cost} |
| Claude 成本 | ${claude_cost_detail} |
| Gemini 成本 | ${gemini_cost_detail} |
| GPT 成本 | ${gpt_cost_detail} |
| 单次有效提及成本 | ${cost_per_mention} |
| 周成本预测(50×3) | ${weekly_cost} |

### 成本趋势

{cost_trend_chart}

---

## 📝 行动建议

### 本周 Top 3 优化目标

1. **[{action1_prompt}]** — 原因：{action1_reason} → 建议：{action1_suggestion}
2. **[{action2_prompt}]** — 原因：{action2_reason} → 建议：{action2_suggestion}
3. **[{action3_prompt}]** — 原因：{action3_reason} → 建议：{action3_suggestion}

### 下次采集建议

- **新增/调整 Prompt：** {new_prompts}
- **重点关注：** {focus_areas}
- **技术优化：** {tech_improvements}

---

## 📈 附录

### 原始数据

- 数据库: `/root/projects/geo/data/geo.db`
- 分析 run_ids: {run_ids}
- 分析脚本: `/root/projects/geo/src/analyzer_report.py`

### 数据质量说明

- 部分排名数据异常（>20），已标记为无效排名
- Claude 无实时联网能力，数据基于训练知识
- GPT/Gemini 有实时搜索，数据更接近真实用户场景

---

*数据说明：引擎 Claude 无实时联网，数据基于训练知识；GPT/Gemini 有实时 Web 搜索，数据更接近真实。*
*报告生成时间: {timestamp}*
