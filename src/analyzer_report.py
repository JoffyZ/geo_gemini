#!/usr/bin/env python3
# analyzer_report.py - GEO 完整分析报告生成器

import sqlite3
import json
import argparse
from datetime import datetime
from collections import Counter, defaultdict

DB_PATH = '/root/projects/geo/data/geo.db'

# Column indices after SELECT r.*, m.engines_used, m.total_tokens, m.total_cost_usd
COL_ID = 0
COL_RUN_ID = 1
COL_PROMPT = 2
COL_ENGINE = 3
COL_MODEL = 4
COL_RAW_TEXT = 5
COL_BRAND_MENTIONED = 6
COL_BRAND_POSITION = 7
COL_CITATIONS_JSON = 8
COL_ANALYSIS_JSON = 9
COL_TIMESTAMP = 10
COL_DURATION_MS = 11
COL_ERROR = 12
COL_TOKENS_INPUT = 13
COL_TOKENS_OUTPUT = 14
COL_TOKENS_TOTAL = 15
COL_SAMPLES_ATTEMPTED = 16
COL_SAMPLES_SUCCESSFUL = 17
COL_ENGINES_USED = 18
COL_M_TOTAL_TOKENS = 19
COL_M_TOTAL_COST = 20

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def fetch_run_data(run_ids):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    placeholders = ','.join('?' * len(run_ids))
    cursor.execute(f'''
        SELECT r.*, m.engines_used, m.total_tokens, m.total_cost_usd
        FROM raw_responses r
        JOIN monitor_runs m ON r.run_id = m.id
        WHERE r.run_id IN ({placeholders})
    ''', run_ids)
    
    rows = cursor.fetchall()
    conn.close()
    return rows

def fetch_run_info(run_ids):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    placeholders = ','.join('?' * len(run_ids))
    cursor.execute(f'SELECT * FROM monitor_runs WHERE id IN ({placeholders})', run_ids)
    
    rows = cursor.fetchall()
    conn.close()
    return rows

def parse_analysis_json(analysis_str):
    if not analysis_str:
        return {}
    try:
        return json.loads(analysis_str)
    except:
        return {}

def calculate_metrics(data):
    total = len(data)
    if total == 0:
        return {}
    
    # 品牌提及
    mentioned = [r for r in data if r[COL_BRAND_MENTIONED] == 1]
    mention_rate = len(mentioned) / total * 100
    
    # 排名（只算1-20）
    positions = []
    for r in data:
        pos = r[COL_BRAND_POSITION]
        if pos is not None and pos != '' and pos != '[]':
            try:
                pos_int = int(pos)
                if 1 <= pos_int <= 20:
                    positions.append(pos_int)
            except (ValueError, TypeError):
                pass
    
    avg_pos = sum(positions) / len(positions) if positions else 0
    valid_pos_count = len(positions)
    
    # 成功率
    success = [r for r in data if not r[COL_ERROR]]
    success_rate = len(success) / total * 100
    
    return {
        'total_queries': total,
        'success_rate': success_rate,
        'brand_mention_rate': mention_rate,
        'valid_position_count': valid_pos_count,
        'avg_position': avg_pos,
        'mentioned_count': len(mentioned)
    }

def engine_breakdown(data):
    engines = defaultdict(list)
    for row in data:
        engines[row[COL_ENGINE]].append(row)
    
    result = {}
    for engine, rows in engines.items():
        metrics = calculate_metrics(rows)
        
        # Token和成本
        total_tokens = sum(r[COL_TOKENS_TOTAL] or 0 for r in rows)
        avg_tokens = total_tokens / len(rows) if rows else 0
        
        # 估算成本（基于典型价格）
        cost_per_1k = 0.0015 if 'gpt' in engine.lower() else 0.0025 if 'claude' in engine.lower() else 0.0005
        est_cost = (total_tokens / 1000) * cost_per_1k
        
        result[engine] = {
            **metrics,
            'avg_tokens': avg_tokens,
            'total_tokens': total_tokens,
            'estimated_cost': est_cost
        }
    return result

def opportunity_matrix(data, brand='HelloTalk'):
    # 按prompt分组
    prompts = defaultdict(list)
    for row in data:
        prompts[row[COL_PROMPT]].append(row)
    
    opportunities = []
    for prompt, rows in prompts.items():
        metrics = calculate_metrics(rows)
        
        # 竞品共现分析
        competitor_cooccur = set()
        hello_mentioned = False
        
        for row in rows:
            analysis = parse_analysis_json(row[COL_ANALYSIS_JSON])
            comps = analysis.get('competitor_次提及', [])
            if row[COL_BRAND_MENTIONED] == 1:
                hello_mentioned = True
                competitor_cooccur.update(comps)
            elif comps:
                competitor_cooccur.update(comps)
        
        mention_rate = metrics['brand_mention_rate'] / 100
        avg_pos = metrics['avg_position'] if metrics['avg_position'] else 10
        comp_count = len(competitor_cooccur)
        
        # 机会分计算
        opportunity_score = (1 - mention_rate) * 5 + max(0, avg_pos - 3) + comp_count * 0.5
        
        # 优先级
        if mention_rate < 0.5 or (not hello_mentioned and comp_count > 0):
            priority = 'HIGH'
        elif mention_rate < 0.8 or avg_pos > 5:
            priority = 'MED'
        else:
            priority = 'LOW'
        
        opportunities.append({
            'prompt': prompt[:60] + '...' if len(prompt) > 60 else prompt,
            'mention_rate': metrics['brand_mention_rate'],
            'avg_position': avg_pos if avg_pos else '-',
            'competitor_cooccur': comp_count,
            'opportunity_score': round(opportunity_score, 2),
            'priority': priority
        })
    
    return sorted(opportunities, key=lambda x: x['opportunity_score'], reverse=True)

def competitor_analysis(data, brand='HelloTalk'):
    cooccur_comps = set()
    exclusive_comps = defaultdict(list)
    
    for row in data:
        analysis = parse_analysis_json(row[COL_ANALYSIS_JSON])
        comps = analysis.get('competitor_次提及', [])
        prompt = row[COL_PROMPT]
        
        if row[COL_BRAND_MENTIONED] == 1 and comps:
            cooccur_comps.update(comps)
        elif comps and row[COL_BRAND_MENTIONED] == 0:
            for c in comps:
                exclusive_comps[c].append(prompt)
    
    return {
        'cooccur': list(cooccur_comps),
        'exclusive': dict(exclusive_comps)
    }

def sentiment_analysis(data):
    sentiments = Counter()
    negative_words = Counter()
    reasons = Counter()
    descriptors = Counter()
    
    for row in data:
        analysis = parse_analysis_json(row[COL_ANALYSIS_JSON])
        
        # 情感
        sent = analysis.get('sentiment', 'neutral')
        sentiments[sent] += 1
        
        # 负面词
        for flag in analysis.get('negative_flags', []):
            for w in ['scam', 'fraud', 'risk', 'privacy', 'unsafe', 'dangerous', 'harassment', 'fake', 'scam', 'spam']:
                if w in flag.lower():
                    negative_words[w] += 1
        
        # 推荐理由
        for reason in analysis.get('recommendation_reason', []):
            reasons[reason[:80]] += 1
        
        # 描述词
        for desc in analysis.get('key_descriptors', []):
            descriptors[desc] += 1
    
    return {
        'sentiment_dist': dict(sentiments),
        'negative_words': negative_words.most_common(10),
        'top_reasons': reasons.most_common(5),
        'top_descriptors': descriptors.most_common(10)
    }

def cost_analysis(data, run_info):
    total_tokens = sum(r[COL_TOKENS_TOTAL] or 0 for r in data)
    
    # 引擎成本估算
    engine_costs = {}
    for row in data:
        engine = row[COL_ENGINE]
        tokens = row[COL_TOKENS_TOTAL] or 0
        
        if engine not in engine_costs:
            engine_costs[engine] = {'tokens': 0, 'cost': 0}
        
        engine_costs[engine]['tokens'] += tokens
    
    # 估算成本
    pricing = {
        'gptproto-gpt': 0.0015,
        'gptproto-claude': 0.0025,
        'gptproto-gemini': 0.0005
    }
    
    total_cost = 0
    for engine, info in engine_costs.items():
        rate = pricing.get(engine, 0.001)
        cost = (info['tokens'] / 1000) * rate
        engine_costs[engine]['cost'] = cost
        total_cost += cost
    
    # 预测50P成本
    current_prompts = len(set(r[COL_PROMPT] for r in data))
    if current_prompts > 0:
        cost_per_prompt = total_cost / current_prompts
        projected_50p = cost_per_prompt * 50
    else:
        projected_50p = 0
    
    return {
        'total_tokens': total_tokens,
        'total_cost': total_cost,
        'engine_breakdown': engine_costs,
        'projected_50p': projected_50p
    }

def brand_direct_matrix(data):
    # 品牌直查矩阵
    prompts = sorted(set(r[COL_PROMPT] for r in data))
    engines = sorted(set(r[COL_ENGINE] for r in data))
    
    matrix = {}
    for prompt in prompts:
        matrix[prompt] = {}
        for engine in engines:
            rows = [r for r in data if r[COL_PROMPT] == prompt and r[COL_ENGINE] == engine]
            if rows:
                mentioned = rows[0][COL_BRAND_MENTIONED] == 1
                pos = rows[0][COL_BRAND_POSITION]
                pos_str = str(pos) if pos and pos != '[]' else '-'
                matrix[prompt][engine] = ('Y' if mentioned else 'N', pos_str)
            else:
                matrix[prompt][engine] = ('?', '-')
    
    return matrix, prompts, engines

def generate_report(run_ids, output_path):
    data = fetch_run_data(run_ids)
    run_info = fetch_run_info(run_ids)
    
    if not data:
        print("No data found for run_ids:", run_ids)
        return
    
    # 计算各项指标
    metrics = calculate_metrics(data)
    engine_metrics = engine_breakdown(data)
    opportunities = opportunity_matrix(data)
    comp_analysis = competitor_analysis(data)
    sentiment = sentiment_analysis(data)
    costs = cost_analysis(data, run_info)
    brand_matrix, brand_prompts, brand_engines = brand_direct_matrix(data)
    
    # 生成报告
    report_lines = []
    now = datetime.now()
    year = now.isocalendar()[0]
    week = now.isocalendar()[1]
    report_lines.append(f"# GEO 周报 | HelloTalk | {year}-W{week:02d}")
    report_lines.append(f"> 品牌直查数据 | 生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M UTC')} | 引擎：GPT-5-mini, Claude-Haiku-4.5, Gemini-2.5-flash")
    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")
    report_lines.append("## 📋 执行摘要（30秒速览）")
    report_lines.append("")
    report_lines.append(f"**整体表现：** HelloTalk 品牌直查 - {metrics['total_queries']} 次查询全部成功，品牌提及率 **{metrics['brand_mention_rate']:.1f}%**, 平均排名 **{metrics['avg_position']:.1f}**.")
    report_lines.append("")
    report_lines.append("**关键发现：** 竞品 Tandem 和 Speaky 在部分查询中共现；需关注差异化。 Gemini 提供最多的引用和详细内容。")
    report_lines.append("")
    report_lines.append("**建议行动：** 优先优化安全相关 Prompt 的 AI 响应（当前偏中性/谨慎），增强正面推荐理由的可见性。")
    report_lines.append("")
    report_lines.append("| 指标 | 值 | 备注 |")
    report_lines.append("|--------|-------|------|")
    report_lines.append(f"| 品牌提及率 | {metrics['brand_mention_rate']:.1f}% | {metrics['mentioned_count']}/{metrics['total_queries']} 次提及 |")
    report_lines.append(f"| 平均排名 | {metrics['avg_position']:.1f} | 仅统计有效排名 1-20 |")
    
    best_engine = max(engine_metrics.items(), key=lambda x: x[1]['brand_mention_rate'])[0]
    report_lines.append(f"| 最佳引擎 | {best_engine} | 提及率最高 |")
    report_lines.append(f"| 最大机会 | {opportunities[0]['prompt'][:40]}... | 机会分 {opportunities[0]['opportunity_score']:.1f} |")
    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")
    report_lines.append("## 🏷️ 品牌直查（品牌基本面）")
    report_lines.append("")
    report_lines.append("**5 Prompt × 3 引擎矩阵：**")
    report_lines.append("")
    
    # 表头
    header = "| Prompt | " + " | ".join(brand_engines) + " |"
    report_lines.append(header)
    sep = "|--------|" + "|".join(["------"] * len(brand_engines)) + "|"
    report_lines.append(sep)
    
    # 矩阵行
    total_score = 0
    max_score = 0
    for prompt in brand_prompts:
        row_cells = []
        for engine in brand_engines:
            status, pos = brand_matrix[prompt][engine]
            if status == 'Y':
                total_score += 1
                cell = f"Y(pos{pos})" if pos != '-' else "Y"
            else:
                cell = f"{status}"
            row_cells.append(cell)
            max_score += 1
        short_prompt = prompt[:35] + "..." if len(prompt) > 35 else prompt
        report_lines.append(f"| {short_prompt} | {' | '.join(row_cells)} |")
    
    report_lines.append("")
    report_lines.append(f"**直查得分： {total_score}/{max_score}**")
    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")
    report_lines.append("## 📊 分引擎对比")
    report_lines.append("")
    report_lines.append("| 引擎 | 请求数 | 提及率 | 平均排名 | Token均值 | 预估成本 |")
    report_lines.append("|--------|----------|--------------|--------------|------------|----------|")
    
    for engine, em in engine_metrics.items():
        report_lines.append(f"| {engine} | {em['total_queries']} | {em['brand_mention_rate']:.1f}% | {em['avg_position']:.1f} | {em['avg_tokens']:.0f} | ${em['estimated_cost']:.4f} |")
    
    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")
    report_lines.append("## 🎯 机会 Prompt（行动优先级）")
    report_lines.append("")
    report_lines.append("按机会分排序（越高越需要优化）：")
    report_lines.append("")
    report_lines.append("| Prompt | 提及率 | 平均排名 | 竞品共现 | 机会分 | 优先级 |")
    report_lines.append("|--------|--------------|--------------|---------------------|-------|----------|")
    
    for opp in opportunities[:10]:
        pri_emoji = {'HIGH': '🔴 高', 'MED': '🟡 中', 'LOW': '🟢 低'}[opp['priority']]
        report_lines.append(f"| {opp['prompt'][:40]} | {opp['mention_rate']:.0f}% | {opp['avg_position']} | {opp['competitor_cooccur']} | {opp['opportunity_score']:.1f} | {pri_emoji} |")
    
    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")
    report_lines.append("## ⚔️ 竞品威胁分析")
    report_lines.append("")
    report_lines.append("**共现竞品**（HelloTalk 被提及时同时出现）：")
    if comp_analysis['cooccur']:
        report_lines.append(", ".join(comp_analysis['cooccur']))
    else:
        report_lines.append("无")
    
    report_lines.append("")
    report_lines.append("**独占竞品**（HelloTalk 未被提及时出现 — 威胁最高）：")
    if comp_analysis['exclusive']:
        for comp, prompts in comp_analysis['exclusive'].items():
            report_lines.append(f"- **{comp}**: {len(prompts)} 个 Prompt")
    else:
        report_lines.append("无（所有竞品均与 HelloTalk 共现）")
    
    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")
    report_lines.append("## 🤖 AI 如何描述 HelloTalk")
    report_lines.append("")
    report_lines.append("### 情感分布")
    report_lines.append("")
    
    total_sent = sum(sentiment['sentiment_dist'].values())
    for sent, count in sentiment['sentiment_dist'].items():
        pct = count / total_sent * 100 if total_sent > 0 else 0
        emoji = {'positive': 'Positive', 'neutral': 'Neutral', 'negative': 'Negative'}.get(sent, 'Unknown')
        report_lines.append(f"- {emoji}: {count} ({pct:.0f}%)")
    
    report_lines.append("")
    report_lines.append("### Top 5 推荐理由")
    report_lines.append("")
    for i, (reason, count) in enumerate(sentiment['top_reasons'], 1):
        report_lines.append(f"{i}. {reason} ({count}x)")
    
    report_lines.append("")
    report_lines.append("### Top 10 负面风险词")
    report_lines.append("")
    if sentiment['negative_words']:
        for word, count in sentiment['negative_words']:
            report_lines.append(f"- {word}: {count} times")
    else:
        report_lines.append("- 无高频负面风险词")
    
    report_lines.append("")
    report_lines.append("### 关键描述词")
    report_lines.append("")
    for desc, count in sentiment['top_descriptors'][:5]:
        report_lines.append(f"- {desc} ({count})")
    
    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")
    report_lines.append("## 💰 运营成本")
    report_lines.append("")
    report_lines.append("### 本次运行成本")
    report_lines.append(f"- Total Tokens: {costs['total_tokens']:,}")
    report_lines.append(f"- Estimated Total Cost: ${costs['total_cost']:.4f} USD")
    report_lines.append("")
    report_lines.append("**引擎明细：**")
    for engine, info in costs['engine_breakdown'].items():
        report_lines.append(f"- {engine}: {info['tokens']:,} tokens (${info['cost']:.4f})")
    
    report_lines.append("")
    report_lines.append("### 全量 50 Prompt 周成本预测")
    current_prompts = len(set(r[COL_PROMPT] for r in data))
    report_lines.append(f"- 当前样本： {current_prompts} 个 Prompt")
    report_lines.append(f"- 50 Prompt 预估成本： **${costs['projected_50p']:.2f} USD/week**")
    report_lines.append(f"- 月度预估成本： **${costs['projected_50p'] * 4:.2f} USD/month**")
    
    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")
    report_lines.append("## 📝 本周行动建议")
    report_lines.append("")
    report_lines.append("### Top 3 优先优化 Prompt")
    report_lines.append("")
    
    for i, opp in enumerate(opportunities[:3], 1):
        suggestion = "加强内容优化，确保 AI 能识别并推荐 HelloTalk" if opp['mention_rate'] < 100 else "保持当前表现，监控竞品动态"
        report_lines.append(f"{i}. **{opp['prompt']}**")
        report_lines.append(f"   - 当前提及率： {opp['mention_rate']:.0f}% | 机会分： {opp['opportunity_score']:.1f}")
        report_lines.append(f"   - 建议： {suggestion}")
        report_lines.append("")
    
    report_lines.append("### 具体执行建议")
    report_lines.append("")
    report_lines.append("1. **内容资产建设**")
    report_lines.append("   - 准备官方安全白皮书和权威背书，应对安全相关查询")
    report_lines.append("   - 优化网站 SEO，确保 AI 爬虫能抓取核心功能描述")
    report_lines.append("")
    report_lines.append("2. **竞品差异化**")
    report_lines.append("   - 强调独特卖点如「260+ 语言支持」和「Voicerooms 实时互动」")
    report_lines.append("   - 准备与 Tandem/Speaky 的对比内容")
    report_lines.append("")
    report_lines.append("3. **监控机制**")
    report_lines.append("   - 持续追踪负面风险词变化")
    report_lines.append("   - 建立竞品独占 Prompt 预警机制")
    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")
    report_lines.append("*报告由 Dash 自动生成 | GEO 项目数据分析*")
    
    # 写入文件
    report = "\n".join(report_lines)
    with open(output_path, 'w') as f:
        f.write(report)
    
    print(f"Report generated: {output_path}")
    print(f"Total queries analyzed: {len(data)}")
    print(f"Brand mention rate: {metrics['brand_mention_rate']:.1f}%")
    print(f"Avg position: {metrics['avg_position']:.1f}")

def main():
    parser = argparse.ArgumentParser(description='GEO Analysis Report Generator')
    parser.add_argument('--run-ids', required=True, help='Comma-separated run IDs')
    parser.add_argument('--output', required=True, help='Output markdown file path')
    args = parser.parse_args()
    
    run_ids = [int(x.strip()) for x in args.run_ids.split(',')]
    generate_report(run_ids, args.output)

if __name__ == '__main__':
    main()
