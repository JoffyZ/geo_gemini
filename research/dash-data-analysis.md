# GEO 数据分析报告 - Dash
> 分析时间: 2026-03-10 | 数据范围: 2026-03-09 至 2026-03-10

---

## 一、数据概况

| 指标 | 数值 |
|------|------|
| 总记录数 | 67 条 |
| 采集时间跨度 | 约 13 小时 |
| 引擎数量 | 4 个 (含1个早期测试引擎) |
| 唯一 Prompt 数 | 10 个 |
| 成功响应 | 61 条 (91.0%) |
| 失败响应 | 6 条 (9.0%) |

### 数据分布
- **gptproto-claude**: 24 条 (35.8%)
- **gptproto-gemini**: 19 条 (28.4%)
- **gptproto-gpt**: 19 条 (28.4%)
- **gptproto** (早期测试): 5 条 (7.5%)

---

## 二、引擎表现对比

### 2.1 核心指标汇总

| 引擎 | 请求数 | 成功数 | 提及率 | 平均排名 | 平均响应时长(ms) | 平均Token消耗 |
|------|--------|--------|--------|----------|------------------|---------------|
| gptproto-gemini | 19 | 19 | **100.0%** | 2.6 | 3,994 | 130.7 |
| gptproto-gpt | 19 | 18 | **94.7%** | 2.2 | 14,910 | 142.7 |
| gptproto-claude | 24 | 15 | **62.5%** | 1.5 | 2,245 | 90.3 |
| gptproto (旧) | 5 | 3 | 60.0% | - | 39,923 | 0.0 |

### 2.2 品牌提及位置分布

#### gptproto-gemini (19条)
| 位置 | 数量 | 占比 |
|------|------|------|
| 位置2 | 2 | 10.5% |
| 位置3 | 3 | 15.8% |
| 未提及 | 14 | 73.7% |

#### gptproto-gpt (19条)
| 位置 | 数量 | 占比 |
|------|------|------|
| 位置1 | 4 | 21.1% |
| 位置6-10 | 1 | 5.3% |
| 位置>10 | 3 | 15.8% |
| 未提及 | 11 | 57.9% |

#### gptproto-claude (24条)
| 位置 | 数量 | 占比 |
|------|------|------|
| 位置1 | 2 | 8.3% |
| 位置2 | 2 | 8.3% |
| 未提及 | 20 | 83.3% |

**关键发现**: 
- **Gemini 提及率最高 (100%)**，但平均排名较后 (2.6)
- **GPT 排名表现最佳**，位置1占比21.1%，平均排名2.2
- **Claude 提及率最低 (62.5%)**，但响应速度最快 (2.2s)

---

## 三、Prompt 表现排名

### 3.1 按提及率排序

| Prompt | 总查询次数 | 提及次数 | 提及率 | 最佳排名 | 最差排名 | 平均响应时长(ms) |
|--------|------------|----------|--------|----------|----------|------------------|
| Best app to learn Japanese | 3 | 3 | **100.0%** | - | - | 21,794 |
| Best language exchange app | 1 | 1 | **100.0%** | - | - | 33,043 |
| Free Japanese learning app | 1 | 1 | **100.0%** | - | - | 36,569 |
| What is HelloTalk? | 13 | 12 | **92.3%** | 1 | 3 | 4,126 |
| How does HelloTalk work? | 10 | 9 | **90.0%** | 1 | 1 | 4,795 |
| Is HelloTalk safe? | 13 | 11 | **84.6%** | 2 | 3 | 9,353 |
| Is HelloTalk free? | 13 | 10 | **76.9%** | 7 | 7 | 6,451 |
| HelloTalk review | 11 | 8 | **72.7%** | 2 | 2 | 5,524 |
| Duolingo alternatives for Japanese | 1 | 0 | **0.0%** | - | - | 60,089 |
| What is the best app to learn Japanese? | 1 | 0 | **0.0%** | - | - | 49,797 |

### 3.2 关键洞察

**高表现 Prompt (提及率>90%)**:
- 品牌直接相关: "What is HelloTalk?", "How does HelloTalk work?"
- 品类通用: "Best app to learn Japanese"

**低表现 Prompt (提及率<80%)**:
- "Duolingo alternatives for Japanese" (0%) - **最高优化价值**
- "What is the best app to learn Japanese?" (0%) - **最高优化价值**
- "HelloTalk review" (72.7%) - 需要优化

---

## 四、竞品分析

### 4.1 竞品共现频率 TOP 10

| 竞品 | 总提及次数 | Claude | Gemini | GPT | 备注 |
|------|------------|--------|--------|-----|------|
| **Tandem** | 39 | 11 | 11 | 14 | **最大威胁** |
| **Duolingo** | 37 | 13 | 10 | 12 | **第二大威胁** |
| italki | 6 | 0 | 1 | 3 | 付费教学平台 |
| Speaky | 5 | 0 | 0 | 3 | 语言交换 |
| Anki | 4 | 1 | 0 | 1 | 记忆卡片 |
| Memrise | 3 | 1 | 0 | 1 | 语言学习 |
| WaniKani | 2 | 0 | 0 | 1 | 日语专用 |
| Preply | 2 | 0 | 0 | 1 | 付费教学 |
| Pimsleur | 2 | 1 | 0 | 1 | 音频课程 |
| LingoDeer | 2 | 0 | 0 | 1 | 亚洲语言 |

### 4.2 竞品格局分析

**第一梯队 (高频共现)**:
- **Tandem**: 39次提及，与HelloTalk直接竞争语言交换市场
- **Duolingo**: 37次提及，综合语言学习平台标杆

**第二梯队 (中频共现)**:
- italki, Speaky, Anki, Memrise - 细分场景竞争者

### 4.3 高价值机会 (HelloTalk未被提及但竞品被提及)

| Prompt | 引擎 | 错失次数 | 被提及竞品 |
|--------|------|----------|------------|
| Is HelloTalk free? | gptproto-claude | 2 | Duolingo, Tandem |
| HelloTalk review | gptproto-claude | 2 | Duolingo, Tandem |

**分析**: 
- "Is HelloTalk free?" 和 "HelloTalk review" 这两个Prompt存在4次"竞品被提及但HelloTalk未被提及"的情况
- 这些是最需要优先优化的场景

---

## 五、情感分析

### 5.1 情感分布 (引擎 × 情感类型)

| 引擎 | Positive | Neutral | 未分类 |
|------|----------|---------|--------|
| gptproto-claude | 5 (20.8%) | 4 (16.7%) | 15 (62.5%) |
| gptproto-gemini | 6 (31.6%) | 3 (15.8%) | 10 (52.6%) |
| gptproto-gpt | 5 (26.3%) | 4 (21.1%) | 10 (52.6%) |
| gptproto | 3 (60.0%) | 1 (20.0%) | 1 (20.0%) |

### 5.2 情感置信度分布

| 置信度 | 数量 | 占比 |
|--------|------|------|
| 0.75 | 12 | 52.2% |
| 0.85 | 16 | 69.6% |
| 1.0 | 1 | 4.3% |

### 5.3 负面风险词 (Negative Flags)

#### 高频负面标签 (出现3次以上)
| 风险词 | 出现次数 | 涉及Prompt |
|--------|----------|------------|
| Safety/Privacy concerns | 6 | Is HelloTalk safe?, What is HelloTalk? |
| Scams/Catfishing | 5 | Is HelloTalk safe? |
| Limited free version | 4 | Is HelloTalk free?, HelloTalk review |
| Inappropriate messages | 4 | Is HelloTalk safe? |
| Quality varies by partner | 3 | HelloTalk review, How does HelloTalk work? |

#### 按Prompt分类的负面风险

**Is HelloTalk safe?** (最严重)
- 安全风险: catfishing, scams, sextortion, inappropriate messages
- 隐私风险: data collection, location sharing, personal info exposure
- 审核风险: limited moderation, unverified users

**HelloTalk review**
- 功能限制: premium features behind paywall
- 用户质量: inconsistent partners, varying teaching ability

**Is HelloTalk free?**
- 免费版限制: limited translations, ads, restricted features

**How does HelloTalk work?**
- 使用门槛: requires basic language understanding
- 匹配问题: finding reliable partners

---

## 六、成本效益分析

### 6.1 Token消耗统计

| 引擎 | 总Token消耗 | 平均Token/请求 | 品牌提及次数 |
|------|-------------|----------------|--------------|
| gptproto-claude | 2,168 | 90.3 | 15 |
| gptproto-gemini | 2,484 | 130.7 | 19 |
| gptproto-gpt | 2,712 | 142.7 | 18 |
| gptproto | 0 | 0.0 | 3 |

### 6.2 成本效益估算

基于市场定价估算 (GPT-4: \$0.03/1K tokens, Claude: \$0.03/1K tokens, Gemini: \$0.001/1K tokens):

| 引擎 | 估算成本 | 品牌提及次数 | 单次提及成本 |
|------|----------|--------------|--------------|
| gptproto-gemini | ~\$0.0025 | 19 | **\$0.00013** |
| gptproto-claude | ~\$0.065 | 15 | **\$0.0043** |
| gptproto-gpt | ~\$0.081 | 18 | **\$0.0045** |

**结论**: Gemini 成本效益最高，单次品牌提及成本仅为其他引擎的1/30。

---

## 七、关键发现与洞察

### 7.1 引擎友好度排名

| 排名 | 引擎 | 综合评分 | 理由 |
|------|------|----------|------|
| 🥇 | Gemini | 9/10 | 提及率100%，成本最低，响应速度中等 |
| 🥈 | GPT | 7/10 | 排名表现最佳(位置1占比21%)，但成本高、响应慢 |
| 🥉 | Claude | 5/10 | 响应最快，但提及率最低(62.5%) |

### 7.2 Prompt优化优先级

| 优先级 | Prompt | 当前提及率 | 优化建议 |
|--------|--------|------------|----------|
| 🔴 高 | Duolingo alternatives for Japanese | 0% | 最高价值机会，竞品场景 |
| 🔴 高 | What is the best app to learn Japanese? | 0% | 品类头部关键词 |
| 🟡 中 | HelloTalk review | 72.7% | 评价类内容，影响决策 |
| 🟡 中 | Is HelloTalk free? | 76.9% | 价格敏感场景 |

### 7.3 竞品威胁评估

| 威胁等级 | 竞品 | 威胁理由 |
|----------|------|----------|
| 🔴 极高 | Tandem | 39次共现，直接竞品，语言交换场景 |
| 🔴 极高 | Duolingo | 37次共现，品类标杆，品牌认知度高 |
| 🟡 中等 | italki | 付费教学场景，差异化竞争 |
| 🟢 低 | Anki/Memrise | 工具类，非直接竞品 |

### 7.4 安全风险预警

**"Is HelloTalk safe?" Prompt 风险最高**:
- 84.6%提及率，但负面标签密集
- 主要风险: scams (诈骗), privacy (隐私), inappropriate content (不当内容)
- **建议**: 需要针对性优化安全相关内容

---

## 八、周报优化建议

### 8.1 当前周报缺失维度

| 缺失维度 | 重要性 | 决策价值 |
|----------|--------|----------|
| **竞品威胁指数** | ⭐⭐⭐⭐⭐ | 识别最大竞争威胁，指导差异化策略 |
| **Prompt机会评分** | ⭐⭐⭐⭐⭐ | 发现"HelloTalk未提及但竞品被提及"的高价值场景 |
| **情感风险预警** | ⭐⭐⭐⭐ | 及时发现负面舆情，快速响应 |
| **成本效益追踪** | ⭐⭐⭐⭐ | 优化采集预算分配 |
| **排名趋势分析** | ⭐⭐⭐ | 追踪品牌位置变化，评估优化效果 |

### 8.2 具体改进建议

#### 建议1: 新增"竞品威胁指数"看板
- **内容**: 统计各竞品被提及次数、与HelloTalk共现率
- **决策价值**: 识别最大威胁竞品，调整竞争策略
- **当前发现**: Tandem (39次) > Duolingo (37次) 是最直接威胁

#### 建议2: 新增"Prompt机会评分"模块
- **内容**: 列出"HelloTalk未提及但竞品被提及"的Prompt
- **决策价值**: 发现最高优化价值的场景
- **当前发现**: "Duolingo alternatives" 和 "best app to learn Japanese" 是最高价值机会

#### 建议3: 新增"情感风险预警"板块
- **内容**: 汇总负面标签，按严重程度分级
- **决策价值**: 及时发现舆情风险，指导公关/产品改进
- **当前发现**: "Is HelloTalk safe?" 存在严重安全风险标签

#### 建议4: 新增"成本效益分析"图表
- **内容**: 对比各引擎的\$成本/提及次数
- **决策价值**: 优化采集预算分配
- **当前发现**: Gemini成本效益最高，建议增加采集量

#### 建议5: 新增"排名分布热力图"
- **内容**: 展示品牌在各引擎中的位置分布
- **决策价值**: 直观了解品牌可见度
- **当前发现**: GPT引擎位置1占比最高(21.1%)

---

## 九、数据质量评估

### 9.1 数据异常

| 问题 | 数量 | 影响 | 建议 |
|------|------|------|------|
| HTTP 401错误 | 5条 | 认证失败，数据缺失 | 检查API Key配置 |
| 超时错误 | 1条 | 数据缺失 | 增加超时重试机制 |
| avg_position异常值 | 存在 | 排名计算可能有误 | 已记录为已知Bug |

### 9.2 数据完整性

| 维度 | 完整度 | 说明 |
|------|--------|------|
| 引擎覆盖 | ✅ 良好 | 3个主要引擎均有数据 |
| Prompt覆盖 | ⚠️ 有限 | 仅10个Prompt，建议扩展到50个 |
| 时间跨度 | ⚠️ 不足 | 仅1天数据，无法分析趋势 |
| Token数据 | ⚠️ 部分缺失 | gptproto旧引擎无Token数据 |
| Analysis JSON | ✅ 良好 | 大部分记录有分析数据 |

### 9.3 数据量评估

| 指标 | 当前值 | 建议最小值 | 评估 |
|------|--------|------------|------|
| 总记录数 | 67 | 500+ | ⚠️ 不足 |
| 每Prompt样本 | 6.7 | 30+ | ⚠️ 不足 |
| 时间跨度 | 1天 | 7天+ | ⚠️ 不足 |
| 引擎覆盖 | 3 | 3+ | ✅ 达标 |

**结论**: 当前数据量**不足以做出可信结论**。建议：
1. 完成M3全量50 Prompt采集
2. 采集至少7天数据以分析趋势
3. 修复已知Bug后重新采集

---

## 附录: 原始数据查询

### A.1 数据库Schema
- 主表: `raw_responses` (67条记录)
- 运行记录: `monitor_runs`
- Prompt库: `prompt_library`

### A.2 关键字段说明
- `brand_mentioned`: 是否提及品牌 (0/1)
- `brand_position`: 品牌位置 (1-20有效，0未提及)
- `analysis_json`: JSON格式，包含sentiment, competitor_mentions, negative_flags等
- `duration_ms`: 响应时长(毫秒)
- `tokens_total`: Token消耗

---

*报告生成: Dash | GEO项目数据分析*
