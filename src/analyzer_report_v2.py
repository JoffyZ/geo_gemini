#!/usr/bin/env python3
# analyzer_report_v2.py - GEO 完整分析报告生成器 v2
# 基于真实数据、全量 50P 的系统性分析报告
# v2.1: 新增周报趋势对比功能

import sqlite3
import json
import argparse
from datetime import datetime
from collections import Counter, defaultdict

DB_PATH = '/root/projects/geo/data/geo.db'

# 分类名称映射
CATEGORY_NAMES = {
    'brand_direct': '品牌直查',
    'category_general': '品类通用',
    'competitor': '竞品相关',
    'long_tail': '长尾场景',
    'ai_scene': 'AI场景'
}

# 分类优先级（用于排序）
CATEGORY_ORDER = ['brand_direct', 'category_general', 'competitor', 'long_tail', 'ai_scene']


def get_db_connection():
    return sqlite3.connect(DB_PATH)


def get_latest_full_run_id():
    """获取最新的 full_batched + completed 的 run_id"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id FROM monitor_runs
        WHERE run_type = 'full_batched' AND status = 'completed'
        ORDER BY id DESC LIMIT 1
    ''')
    row = cursor.fetchone()
    conn.close()
    if row:
        return row[0]
    return None


def get_any_completed_run_id():
    """fallback：获取任意 completed 的 run_id"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id FROM monitor_runs
        WHERE status = 'completed'
        ORDER BY id DESC LIMIT 1
    ''')
    row = cursor.fetchone()
    conn.close()
    if row:
        return row[0]
    return None


def get_previous_run_id(current_run_id, min_responses=50):
    """获取上一个有效的 run_id（用于趋势对比）
    
    Args:
        current_run_id: 当前 run_id
        min_responses: 最小响应数阈值，用于过滤不完整的 run
    
    Returns:
        上一个有效 run_id 或 None
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 获取比当前 run_id 小的所有已完成 run，按 ID 降序
    cursor.execute('''
        SELECT m.id, COUNT(r.id) as response_count
        FROM monitor_runs m
        LEFT JOIN raw_responses r ON r.run_id = m.id
        WHERE m.id < ? AND m.status = 'completed'
        GROUP BY m.id
        HAVING response_count >= ?
        ORDER BY m.id DESC
        LIMIT 1
    ''', (current_run_id, min_responses))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return row[0]
    return None


def fetch_run_data(run_id):
    """获取指定 run_id 的所有数据，并 JOIN prompt_library 获取 category"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT r.*, p.category, m.started_at, m.engines_used
        FROM raw_responses r
        JOIN prompt_library p ON r.prompt = p.prompt_text
        JOIN monitor_runs m ON r.run_id = m.id
        WHERE r.run_id = ?
    ''', (run_id,))
    rows = cursor.fetchall()
    conn.close()
    return rows


def fetch_run_info(run_id):
    """获取 run 的基本信息"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM monitor_runs WHERE id = ?', (run_id,))
    row = cursor.fetchone()
    conn.close()
    return row


def parse_analysis_json(analysis_str):
    """解析 analysis_json 字段"""
    if not analysis_str:
        return {}
    try:
        return json.loads(analysis_str)
    except:
        return {}


def calculate_category_metrics(data):
    """按分类计算指标"""
    categories = defaultdict(list)
    for row in data:
        category = row[18]  # category 字段（JOIN后的第18列）
        categories[category].append(row)
    
    result = {}
    for cat, rows in categories.items():
        total = len(rows)
        mentioned = [r for r in rows if r[6] == 1]  # brand_mentioned
        mention_rate = len(mentioned) / total * 100 if total > 0 else 0
        
        # 按引擎细分
        engine_breakdown = defaultdict(lambda: {'total': 0, 'mentioned': 0})
        for r in rows:
            engine = r[3]  # engine
            engine_breakdown[engine]['total'] += 1
            if r[6] == 1:
                engine_breakdown[engine]['mentioned'] += 1
        
        # 计算各引擎提及率
        engine_rates = {}
        for engine, counts in engine_breakdown.items():
            engine_rates[engine] = counts['mentioned'] / counts['total'] * 100 if counts['total'] > 0 else 0
        
        result[cat] = {
            'total': total,
            'mentioned': len(mentioned),
            'mention_rate': mention_rate,
            'engine_breakdown': engine_rates
        }
    
    return result


def calculate_trend_comparison(current_run_id, previous_run_id=None):
    """计算两个 run 之间的趋势对比
    
    Args:
        current_run_id: 当前 run_id
        previous_run_id: 上一个 run_id，如果为 None 则自动查找
    
    Returns:
        dict: {
            'current': {category: metrics},
            'previous': {category: metrics} or None,
            'trend': {category: {'delta': float, 'arrow': str}} or None,
            'previous_run_id': int or None
        }
    """
    # 获取当前 run 数据
    current_data = fetch_run_data(current_run_id)
    current_metrics = calculate_category_metrics(current_data)
    
    # 如果没有提供 previous_run_id，自动查找
    if previous_run_id is None:
        previous_run_id = get_previous_run_id(current_run_id)
    
    if previous_run_id is None:
        return {
            'current': current_metrics,
            'previous': None,
            'trend': None,
            'previous_run_id': None
        }
    
    # 获取上一个 run 数据
    previous_data = fetch_run_data(previous_run_id)
    previous_metrics = calculate_category_metrics(previous_data)
    
    # 计算趋势
    trend = {}
    all_categories = set(current_metrics.keys()) | set(previous_metrics.keys())
    
    for cat in all_categories:
        current_rate = current_metrics.get(cat, {}).get('mention_rate', 0)
        previous_rate = previous_metrics.get(cat, {}).get('mention_rate', 0)
        delta = current_rate - previous_rate
        
        # 生成箭头符号
        if delta > 5:
            arrow = '↑↑'
        elif delta > 0:
            arrow = '↑'
        elif delta < -5:
            arrow = '↓↓'
        elif delta < 0:
            arrow = '↓'
        else:
            arrow = '→'
        
        trend[cat] = {
            'delta': delta,
            'arrow': arrow,
            'current_rate': current_rate,
            'previous_rate': previous_rate
        }
    
    return {
        'current': current_metrics,
        'previous': previous_metrics,
        'trend': trend,
        'previous_run_id': previous_run_id
    }


def generate_trend_section(trend_data, current_run_id):
    """生成趋势对比部分的 Markdown
    
    Args:
        trend_data: calculate_trend_comparison 的返回值
        current_run_id: 当前 run_id
    
    Returns:
        list: Markdown 行列表
    """
    lines = []
    
    # 检查是否有对比数据
    if trend_data['previous'] is None:
        lines.append("## 📈 周报趋势对比")
        lines.append("")
        lines.append("> ⚠️ 暂无历史数据可对比。这是首次完整报告或没有足够的上期数据。")
        lines.append("")
        lines.append("### 本周分类提及率")
        lines.append("")
        lines.append("| 分类 | 提及率 | 状态 |")
        lines.append("|------|--------|------|")
        
        for cat in CATEGORY_ORDER:
            if cat in trend_data['current']:
                metrics = trend_data['current'][cat]
                cat_name = CATEGORY_NAMES.get(cat, cat)
                
                if metrics['mention_rate'] < 20:
                    status = "⚠️ 严重缺失"
                elif metrics['mention_rate'] < 40:
                    status = "🟡 需关注"
                else:
                    status = "✅ 正常"
                
                lines.append(f"| {cat_name} | {metrics['mention_rate']:.1f}% | {status} |")
        
        lines.append("")
        return lines
    
    # 有对比数据，生成完整趋势表格
    prev_run_id = trend_data['previous_run_id']
    
    lines.append("## 📈 周报趋势对比")
    lines.append("")
    lines.append(f"> 对比周期：Run #{prev_run_id} → Run #{current_run_id}")
    lines.append("")
    lines.append("### 分类提及率变化")
    lines.append("")
    lines.append("| 分类 | 上周 | 本周 | Δ 变化 | 趋势 |")
    lines.append("|------|------|------|--------|------|")
    
    # 计算整体提及率
    current_total = sum(m['mentioned'] for m in trend_data['current'].values())
    current_count = sum(m['total'] for m in trend_data['current'].values())
    current_overall = current_total / current_count * 100 if current_count > 0 else 0
    
    previous_total = sum(m['mentioned'] for m in trend_data['previous'].values())
    previous_count = sum(m['total'] for m in trend_data['previous'].values())
    previous_overall = previous_total / previous_count * 100 if previous_count > 0 else 0
    
    overall_delta = current_overall - previous_overall
    if overall_delta > 5:
        overall_arrow = '↑↑'
    elif overall_delta > 0:
        overall_arrow = '↑'
    elif overall_delta < -5:
        overall_arrow = '↓↓'
    elif overall_delta < 0:
        overall_arrow = '↓'
    else:
        overall_arrow = '→'
    
    # 整体行
    lines.append(f"| **整体** | **{previous_overall:.1f}%** | **{current_overall:.1f}%** | **{overall_delta:+.1f}%** | **{overall_arrow}** |")
    
    # 各分类行
    for cat in CATEGORY_ORDER:
        if cat in trend_data['trend']:
            cat_name = CATEGORY_NAMES.get(cat, cat)
            t = trend_data['trend'][cat]
            
            # 高亮变化超过 10% 的
            delta_str = f"{t['delta']:+.1f}%"
            if abs(t['delta']) > 10:
                delta_str = f"**{t['delta']:+.1f}%**"
            
            lines.append(f"| {cat_name} | {t['previous_rate']:.1f}% | {t['current_rate']:.1f}% | {delta_str} | {t['arrow']} |")
    
    lines.append("")
    
    # 趋势解读
    lines.append("### 趋势解读")
    lines.append("")
    
    # 找出变化最大的分类
    significant_changes = []
    for cat, t in trend_data['trend'].items():
        if abs(t['delta']) >= 5:
            significant_changes.append((cat, t))
    
    significant_changes.sort(key=lambda x: abs(x[1]['delta']), reverse=True)
    
    if significant_changes:
        for cat, t in significant_changes[:3]:
            cat_name = CATEGORY_NAMES.get(cat, cat)
            if t['delta'] > 0:
                lines.append(f"- 📈 **{cat_name}** 提及率上升 {t['delta']:.1f}%，需确认是否为有效提升")
            else:
                lines.append(f"- 📉 **{cat_name}** 提及率下降 {abs(t['delta']):.1f}%，需关注原因")
    else:
        lines.append("- 各分类提及率变化不大，整体表现稳定")
    
    lines.append("")
    
    return lines


def calculate_brand_direct_matrix(data):
    """计算品牌直查矩阵（5P × 3引擎）"""
    brand_direct_rows = [r for r in data if r[18] == 'brand_direct']
    
    matrix = defaultdict(dict)
    prompts = sorted(set(r[2] for r in brand_direct_rows))  # prompt
    engines = sorted(set(r[3] for r in brand_direct_rows))  # engine
    
    for row in brand_direct_rows:
        prompt = row[2]
        engine = row[3]
        mentioned = row[6] == 1
        position = row[7] if row[7] and row[7] != '[]' else None
        matrix[prompt][engine] = {'mentioned': mentioned, 'position': position}
    
    return matrix, prompts, engines


def find_opportunity_prompts(data):
    """找出机会区域 Prompt"""
    # 按 prompt 分组
    prompts = defaultdict(lambda: {'engines': {}, 'category': ''})
    for row in data:
        prompt = row[2]
        engine = row[3]
        category = row[18]
        mentioned = row[6] == 1
        position = row[7] if row[7] and row[7] != '[]' else None
        
        prompts[prompt]['engines'][engine] = {'mentioned': mentioned, 'position': position}
        prompts[prompt]['category'] = category
    
    high_priority = []  # 三引擎全未提及
    medium_priority = []  # 部分引擎未提及
    
    for prompt, info in prompts.items():
        engines = info['engines']
        total_engines = len(engines)
        mentioned_count = sum(1 for e in engines.values() if e['mentioned'])
        
        if mentioned_count == 0 and total_engines == 3:
            high_priority.append({
                'prompt': prompt,
                'category': info['category']
            })
        elif mentioned_count < total_engines:
            missing_engines = [e for e, v in engines.items() if not v['mentioned']]
            medium_priority.append({
                'prompt': prompt,
                'category': info['category'],
                'missing_engines': missing_engines,
                'mentioned_count': mentioned_count,
                'total_engines': total_engines
            })
    
    return high_priority, medium_priority


def analyze_competitors(data):
    """分析竞品情况"""
    exclusive_comps = defaultdict(lambda: {'count': 0, 'prompts': [], 'engines': set()})
    cooccur_comps = defaultdict(lambda: {'count': 0, 'prompts': [], 'engines': set()})
    
    for row in data:
        analysis = parse_analysis_json(row[9])  # analysis_json
        competitors = analysis.get('competitor_mentions', [])
        if not competitors:
            competitors = analysis.get('competitor_次提及', [])
        
        prompt = row[2]
        engine = row[3]
        hello_mentioned = row[6] == 1
        
        for comp in competitors:
            if hello_mentioned:
                cooccur_comps[comp]['count'] += 1
                cooccur_comps[comp]['prompts'].append(prompt)
                cooccur_comps[comp]['engines'].add(engine)
            else:
                exclusive_comps[comp]['count'] += 1
                exclusive_comps[comp]['prompts'].append(prompt)
                exclusive_comps[comp]['engines'].add(engine)
    
    return dict(exclusive_comps), dict(cooccur_comps)


def calculate_engine_performance(data):
    """计算各引擎表现"""
    engines = defaultdict(lambda: {'total': 0, 'mentioned': 0, 'tokens': 0})
    
    for row in data:
        engine = row[3]
        engines[engine]['total'] += 1
        engines[engine]['tokens'] += row[15] or 0  # tokens_total
        if row[6] == 1:
            engines[engine]['mentioned'] += 1
    
    result = {}
    for engine, counts in engines.items():
        result[engine] = {
            'total': counts['total'],
            'mentioned': counts['mentioned'],
            'mention_rate': counts['mentioned'] / counts['total'] * 100 if counts['total'] > 0 else 0,
            'tokens': counts['tokens']
        }
    
    return result


def generate_action_suggestions(category_metrics, high_priority_opps, exclusive_comps):
    """生成行动建议"""
    suggestions = []
    
    # 1. 提及率 < 20% 的分类
    for cat, metrics in category_metrics.items():
        if metrics['mention_rate'] < 20:
            suggestions.append({
                'target': f'{CATEGORY_NAMES.get(cat, cat)} 分类',
                'root_cause': f'提及率仅 {metrics["mention_rate"]:.1f}%，严重缺失',
                'action': f'针对 {CATEGORY_NAMES.get(cat, cat)} 的 {metrics["total"]} 个 Prompt 进行内容优化，确保 AI 能识别并推荐 HelloTalk',
                'criteria': f'{CATEGORY_NAMES.get(cat, cat)} 分类提及率提升至 40% 以上'
            })
    
    # 2. 三引擎全未提及的 prompt（取前3个）
    for i, opp in enumerate(high_priority_opps[:3], 1):
        suggestions.append({
            'target': f'"{opp["prompt"][:40]}..."' if len(opp['prompt']) > 40 else f'"{opp["prompt"]}"',
            'root_cause': '三引擎全未提及，存在严重内容缺口',
            'action': f'针对该 Prompt 创建专项内容资产，优化 SEO 和 AI 可抓取性',
            'criteria': '至少有一个引擎开始提及 HelloTalk'
        })
    
    # 3. 最活跃的独占竞品
    if exclusive_comps:
        top_exclusive = sorted(exclusive_comps.items(), key=lambda x: x[1]['count'], reverse=True)[0]
        comp_name = top_exclusive[0]
        comp_info = top_exclusive[1]
        suggestions.append({
            'target': f'竞品 {comp_name}',
            'root_cause': f'在 {comp_info["count"]} 个 HelloTalk 缺席的 Prompt 中被提及，威胁度高',
            'action': f'分析 {comp_name} 的内容策略，制定差异化内容方案，在相关场景建立存在感',
            'criteria': f'在 {comp_name} 独占的 Prompt 中，至少 30% 开始提及 HelloTalk'
        })
    
    return suggestions


def generate_action_cards(category_metrics, high_priority_opps, exclusive_comps, data):
    """生成本周行动卡（按 GEO-SOP.md 模板格式）
    
    输出格式：
    【行动指令 #XX】
    目标 Prompt：[prompt]
    当前状态：[status]
    根因：[root cause]
    本周行动：
      - 内容：[action 1]
      - SEO：[action 2]
    验收标准：[criteria]
    跟踪人：[name]
    """
    cards = []
    card_num = 1
    
    # 1. 最弱分类行动卡（提及率 < 20% 时必出）
    for cat in CATEGORY_ORDER:
        if cat in category_metrics:
            metrics = category_metrics[cat]
            if metrics['mention_rate'] < 20:
                cat_name = CATEGORY_NAMES.get(cat, cat)
                
                # 根据分类类型生成针对性建议
                if cat == 'ai_scene':
                    action_content = "官网首页增加 'AI-powered language learning' 描述；发布博客《HelloTalk AI Features: Your 24/7 Language Tutor》"
                    action_seo = "App Store 描述加入 'AI tutor', 'AI conversation' 关键词；更新 Wikipedia 词条 AI 功能描述"
                    criteria = f"4周后 {cat_name} 提及率从 {metrics['mention_rate']:.1f}% 提升至 30%"
                elif cat == 'long_tail':
                    action_content = "针对细分场景创建专题内容（如 '学日语从零开始'）；在 Reddit/Quora 发布真实用户体验"
                    action_seo = "优化垂直场景的 SEO 关键词覆盖"
                    criteria = f"4周后 {cat_name} 提及率从 {metrics['mention_rate']:.1f}% 提升至 55%"
                else:
                    action_content = f"针对 {cat_name} 分类创建内容资产，提升 AI 可识别度"
                    action_seo = "优化相关页面的 SEO 结构化数据"
                    criteria = f"4周后 {cat_name} 提及率提升至 40%"
                
                card = f"""【行动指令 #{card_num}】
目标分类：{cat_name}（{metrics['total']} 个 Prompt）
当前状态：提及率 **{metrics['mention_rate']:.1f}%**，三引擎全线缺席
根因：HelloTalk 未被 AI 归类为该场景的解决方案，内容资产严重缺失
本周行动：
  - 内容：{action_content}
  - SEO：{action_seo}
验收标准：{criteria}
跟踪人：GEO 负责人"""
                cards.append(card)
                card_num += 1
    
    # 2. 高优先级 Prompt 行动卡（三引擎全未提及，取前3个，排除已在分类行动中处理的）
    processed_prompts = set()
    for opp in high_priority_opps[:5]:
        if opp['prompt'] in processed_prompts:
            continue
        # 跳过 ai_scene 分类（已在分类行动卡中处理）
        if opp['category'] == 'ai_scene':
            continue
            
        processed_prompts.add(opp['prompt'])
        
        cat_name = CATEGORY_NAMES.get(opp['category'], opp['category'])
        short_prompt = opp['prompt'][:50] + "..." if len(opp['prompt']) > 50 else opp['prompt']
        
        # 根据分类生成针对性建议
        if opp['category'] == 'long_tail':
            action_content = f"针对 '{short_prompt}' 创建博客/社区内容，覆盖用户真实搜索意图"
            action_seo = "Reddit/Quora 发布相关问答，建立垂直场景权威"
        elif opp['category'] == 'category_general':
            action_content = "创建对比内容（vs Tandem, vs Duolingo），突出 HelloTalk 独特价值"
            action_seo = "官网核心页面增加结构化 FAQ，提升 AI 引用概率"
        else:
            action_content = "创建专项内容资产，优化 AI 可抓取性"
            action_seo = "第三方平台发布评测内容"
        
        card = f"""【行动指令 #{card_num}】
目标 Prompt：「{short_prompt}」
当前状态：三引擎全未提及（提及率 0%）
根因：AI 模型训练数据中缺乏 HelloTalk 在此场景的相关内容
本周行动：
  - 内容：{action_content}
  - SEO：{action_seo}
验收标准：至少一个引擎开始提及 HelloTalk
跟踪人：内容团队"""
        cards.append(card)
        card_num += 1
        
        if card_num > 4:  # 最多生成5条
            break
    
    # 3. 竞品对抗行动卡（最活跃的独占竞品）
    if exclusive_comps and card_num <= 5:
        top_exclusive = sorted(exclusive_comps.items(), key=lambda x: x[1]['count'], reverse=True)[0]
        comp_name = top_exclusive[0]
        comp_info = top_exclusive[1]
        
        card = f"""【行动指令 #{card_num}】
目标竞品：{comp_name}
当前状态：在 {comp_info['count']} 个 HelloTalk 缺席的 Prompt 中被独占提及
根因：{comp_name} 在相关场景建立了更强的 AI 可引用内容资产
本周行动：
  - 内容：分析 {comp_name} 内容策略，发布差异化对比内容（HelloTalk vs {comp_name}）
  - SEO：在 {comp_name} 独占的 Prompt 场景建立第三方评测引用
验收标准：在 {comp_name} 独占的 Prompt 中，至少 30% 开始提及 HelloTalk
跟踪人：GEO 负责人 + 内容团队"""
        cards.append(card)
    
    return cards


def generate_action_cards_section(category_metrics, high_priority_opps, exclusive_comps, data):
    """生成完整的本周行动卡板块（Markdown 格式）"""
    lines = []
    lines.append("## 📋 本周行动卡")
    lines.append("")
    lines.append("> 以下行动指令基于数据自动生成，按优先级排序。格式参考 GEO-SOP.md 行动指令模板。")
    lines.append("")
    
    cards = generate_action_cards(category_metrics, high_priority_opps, exclusive_comps, data)
    
    if not cards:
        lines.append("本周无高优先级行动指令，各分类表现良好。")
        lines.append("")
        return lines
    
    for card in cards:
        lines.append(card)
        lines.append("")
    
    # 添加复制提示
    lines.append("---")
    lines.append("")
    lines.append("### 📋 快速复制（Markdown 格式）")
    lines.append("")
    lines.append("```")
    for card in cards[:3]:  # 最多复制前3条
        lines.append(card)
        lines.append("")
    lines.append("```")
    lines.append("")
    
    return lines



def calculate_cost(data):
    """计算成本"""
    total_tokens = sum(r[15] or 0 for r in data)  # tokens_total
    
    # 引擎成本估算（USD per 1K tokens）
    pricing = {
        'gptproto-gpt': 0.0015,
        'gptproto-claude': 0.0025,
        'gptproto-gemini': 0.0005
    }
    
    engine_costs = {}
    for row in data:
        engine = row[3]
        tokens = row[15] or 0
        if engine not in engine_costs:
            engine_costs[engine] = {'tokens': 0, 'cost': 0}
        engine_costs[engine]['tokens'] += tokens
    
    total_cost = 0
    for engine, info in engine_costs.items():
        rate = pricing.get(engine, 0.001)
        cost = (info['tokens'] / 1000) * rate
        engine_costs[engine]['cost'] = cost
        total_cost += cost
    
    return {
        'total_tokens': total_tokens,
        'total_cost': total_cost,
        'engine_breakdown': engine_costs
    }


def generate_report(run_id, output_path):
    """生成完整报告"""
    data = fetch_run_data(run_id)
    run_info = fetch_run_info(run_id)
    
    if not data:
        print(f"No data found for run_id: {run_id}")
        return None
    
    if not run_info:
        print(f"No run info found for run_id: {run_id}")
        return None
    
    # 计算各项指标
    category_metrics = calculate_category_metrics(data)
    brand_matrix, brand_prompts, brand_engines = calculate_brand_direct_matrix(data)
    high_priority_opps, medium_priority_opps = find_opportunity_prompts(data)
    exclusive_comps, cooccur_comps = analyze_competitors(data)
    engine_perf = calculate_engine_performance(data)
    cost_info = calculate_cost(data)
    action_suggestions = generate_action_suggestions(category_metrics, high_priority_opps, exclusive_comps)
    
    # 计算趋势对比
    trend_data = calculate_trend_comparison(run_id)
    
    # 计算整体指标
    total_queries = len(data)
    total_mentioned = sum(1 for r in data if r[6] == 1)
    overall_mention_rate = total_mentioned / total_queries * 100 if total_queries > 0 else 0
    
    # 找出最弱分类
    weakest_category = min(category_metrics.items(), key=lambda x: x[1]['mention_rate'])
    
    # 找出最弱引擎
    weakest_engine = min(engine_perf.items(), key=lambda x: x[1]['mention_rate'])
    
    # 生成报告
    now = datetime.now()
    year, week, _ = now.isocalendar()
    
    report_lines = []
    report_lines.append(f"# GEO 周报 | HelloTalk | {year}-W{week:02d}")
    report_lines.append(f"> 生成时间：{now.strftime('%Y-%m-%d %H:%M UTC')} | Run #{run_id} | 全量 50P × 3引擎")
    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")
    
    # 执行摘要
    report_lines.append("## 执行摘要")
    report_lines.append("")
    report_lines.append("| 指标 | 数值 | 说明 |")
    report_lines.append("|------|------|------|")
    report_lines.append(f"| 整体提及率 | {overall_mention_rate:.1f}% | {total_mentioned}/{total_queries} 次提及 |")
    report_lines.append(f"| 最弱分类 | {CATEGORY_NAMES.get(weakest_category[0], weakest_category[0])} | 提及率 {weakest_category[1]['mention_rate']:.1f}% |")
    report_lines.append(f"| 高优先级机会数 | {len(high_priority_opps)} | 三引擎全未提及 |")
    report_lines.append(f"| 独占竞品数 | {len(exclusive_comps)} | HelloTalk 缺席时出现 |")
    report_lines.append("")
    
    # 趋势对比板块（新增）
    trend_section = generate_trend_section(trend_data, run_id)
    report_lines.extend(trend_section)
    
    # 品牌直查矩阵
    report_lines.append("## 🏷️ 品牌直查矩阵（5P × 3引擎）")
    report_lines.append("")
    
    if brand_prompts and brand_engines:
        # 表头
        header = "| Prompt | " + " | ".join(brand_engines) + " |"
        report_lines.append(header)
        sep = "|--------|" + "|".join(["------"] * len(brand_engines)) + "|"
        report_lines.append(sep)
        
        for prompt in brand_prompts:
            cells = []
            for engine in brand_engines:
                info = brand_matrix.get(prompt, {}).get(engine, {})
                if info.get('mentioned'):
                    pos = info.get('position')
                    if pos and pos != '[]':
                        cells.append(f"✅#{pos}")
                    else:
                        cells.append("✅")
                else:
                    cells.append("❌")
            short_prompt = prompt[:35] + "..." if len(prompt) > 35 else prompt
            report_lines.append(f"| {short_prompt} | {' | '.join(cells)} |")
    else:
        report_lines.append("无品牌直查数据")
    
    report_lines.append("")
    
    # 分类提及率分析
    report_lines.append("## 📊 分类提及率分析")
    report_lines.append("")
    report_lines.append("| 分类 | 总查询 | 提及数 | 提及率 | GPT | Claude | Gemini | 状态 |")
    report_lines.append("|------|--------|--------|--------|-----|--------|--------|------|")
    
    for cat in CATEGORY_ORDER:
        if cat in category_metrics:
            metrics = category_metrics[cat]
            cat_name = CATEGORY_NAMES.get(cat, cat)
            
            # 各引擎提及率
            gpt_rate = metrics['engine_breakdown'].get('gptproto-gpt', 0)
            claude_rate = metrics['engine_breakdown'].get('gptproto-claude', 0)
            gemini_rate = metrics['engine_breakdown'].get('gptproto-gemini', 0)
            
            # 状态标注
            if metrics['mention_rate'] < 20:
                status = "⚠️ 严重缺失"
            elif metrics['mention_rate'] < 40:
                status = "🟡 需关注"
            else:
                status = "✅ 正常"
            
            # ai_scene 特殊标注
            if cat == 'ai_scene':
                status = "⚠️ 最弱分类"
            
            report_lines.append(
                f"| {cat_name} | {metrics['total']} | {metrics['mentioned']} | "
                f"{metrics['mention_rate']:.1f}% | {gpt_rate:.0f}% | {claude_rate:.0f}% | "
                f"{gemini_rate:.0f}% | {status} |"
            )
    
    report_lines.append("")
    report_lines.append(f"**文字分析：**")
    report_lines.append(f"- 最弱分类：**{CATEGORY_NAMES.get(weakest_category[0], weakest_category[0])}**（提及率 {weakest_category[1]['mention_rate']:.1f}%）")
    report_lines.append(f"- 原因：该分类的 Prompt 主要关注 AI 场景下的语言学习需求，HelloTalk 在这些新兴场景中的内容资产不足")
    report_lines.append(f"- 影响：随着 AI 驱动的语言学习工具兴起，该分类将成为用户决策的关键入口，缺失将导致长期流量损失")
    report_lines.append("")
    
    # 机会区域
    report_lines.append("## 🚨 机会区域：优先优化的 Prompt")
    report_lines.append("")
    
    report_lines.append("### 高优先级（三引擎全未提及）")
    report_lines.append("")
    if high_priority_opps:
        report_lines.append("| Prompt | 分类 |")
        report_lines.append("|--------|------|")
        for opp in high_priority_opps:
            short_prompt = opp['prompt'][:50] + "..." if len(opp['prompt']) > 50 else opp['prompt']
            report_lines.append(f"| {short_prompt} | {CATEGORY_NAMES.get(opp['category'], opp['category'])} |")
    else:
        report_lines.append("无")
    report_lines.append("")
    
    report_lines.append("### 中优先级（部分引擎未提及）")
    report_lines.append("")
    if medium_priority_opps:
        report_lines.append("| Prompt | 分类 | 缺失引擎 | 提及情况 |")
        report_lines.append("|--------|------|----------|----------|")
        for opp in medium_priority_opps[:10]:  # 只显示前10个
            short_prompt = opp['prompt'][:40] + "..." if len(opp['prompt']) > 40 else opp['prompt']
            missing = ", ".join(opp['missing_engines'])
            report_lines.append(
                f"| {short_prompt} | {CATEGORY_NAMES.get(opp['category'], opp['category'])} | "
                f"{missing} | {opp['mentioned_count']}/{opp['total_engines']} |"
            )
    else:
        report_lines.append("无")
    report_lines.append("")
    
    # 竞品分析
    report_lines.append("## ⚔️ 竞品分析")
    report_lines.append("")
    
    report_lines.append("### 独占竞品（HelloTalk 缺席时出现的竞品）⚠️ 高威胁")
    report_lines.append("")
    if exclusive_comps:
        report_lines.append("| 竞品 | 出现次数 | 涉及 Prompt 数 | 主要引擎 |")
        report_lines.append("|------|----------|----------------|----------|")
        for comp, info in sorted(exclusive_comps.items(), key=lambda x: x[1]['count'], reverse=True):
            unique_prompts = len(set(info['prompts']))
            engines = ", ".join(info['engines'])
            report_lines.append(f"| {comp} | {info['count']} | {unique_prompts} | {engines} |")
    else:
        report_lines.append("无")
    report_lines.append("")
    
    report_lines.append("### 共存竞品（与 HelloTalk 同框出现的竞品）")
    report_lines.append("")
    if cooccur_comps:
        report_lines.append("| 竞品 | 出现次数 | 涉及 Prompt 数 | 主要引擎 |")
        report_lines.append("|------|----------|----------------|----------|")
        for comp, info in sorted(cooccur_comps.items(), key=lambda x: x[1]['count'], reverse=True):
            unique_prompts = len(set(info['prompts']))
            engines = ", ".join(info['engines'])
            report_lines.append(f"| {comp} | {info['count']} | {unique_prompts} | {engines} |")
    else:
        report_lines.append("无")
    report_lines.append("")
    
    # 竞品威胁分析文字
    if exclusive_comps:
        top_threat = sorted(exclusive_comps.items(), key=lambda x: x[1]['count'], reverse=True)[0]
        report_lines.append(f"**文字分析：**")
        report_lines.append(f"- 最大威胁竞品：**{top_threat[0]}**，在 {top_threat[1]['count']} 个 HelloTalk 缺席的 Prompt 中被提及")
        report_lines.append(f"- 主要引擎：{', '.join(top_threat[1]['engines'])}")
        
        # 找出该竞品主要针对的分类
        cat_counter = Counter()
        for r in data:
            analysis = parse_analysis_json(r[9])
            competitors = analysis.get('competitor_mentions', [])
            if not competitors:
                competitors = analysis.get('competitor_次提及', [])
            if top_threat[0] in competitors and r[6] == 0:  # HelloTalk 未被提及
                cat_counter[r[18]] += 1
        
        if cat_counter:
            top_cat = cat_counter.most_common(1)[0][0]
            report_lines.append(f"- 针对分类：{CATEGORY_NAMES.get(top_cat, top_cat)}")
        report_lines.append("")
    
    # 引擎表现对比
    report_lines.append("## 🔧 引擎表现对比")
    report_lines.append("")
    report_lines.append("| 引擎 | 查询数 | 提及数 | 提及率 | Token 消耗 |")
    report_lines.append("|------|--------|--------|--------|------------|")
    
    for engine, perf in sorted(engine_perf.items(), key=lambda x: x[1]['mention_rate'], reverse=True):
        report_lines.append(
            f"| {engine} | {perf['total']} | {perf['mentioned']} | "
            f"{perf['mention_rate']:.1f}% | {perf['tokens']:,} |"
        )
    
    report_lines.append("")
    report_lines.append(f"**分析：** 最弱引擎为 **{weakest_engine[0]}**（提及率 {weakest_engine[1]['mention_rate']:.1f}%），建议优先优化该引擎的内容可见性。")
    report_lines.append("")
    
    # 本周行动卡（新增：按 GEO-SOP.md 模板格式）
    action_cards_section = generate_action_cards_section(category_metrics, high_priority_opps, exclusive_comps, data)
    report_lines.extend(action_cards_section)
    
    # 本周行动建议（保留简化版）
    report_lines.append("## 💡 本周行动建议（简化版）")
    report_lines.append("")
    
    for i, suggestion in enumerate(action_suggestions[:5], 1):
        report_lines.append(f"### {i}. {suggestion['target']}")
        report_lines.append(f"- **根因：** {suggestion['root_cause']}")
        report_lines.append(f"- **建议动作：** {suggestion['action']}")
        report_lines.append(f"- **验收标准：** {suggestion['criteria']}")
        report_lines.append("")
    
    # 成本明细
    report_lines.append("## 💰 成本明细")
    report_lines.append("")
    report_lines.append(f"- **总 Token 消耗：** {cost_info['total_tokens']:,}")
    report_lines.append(f"- **预估总成本：** ${cost_info['total_cost']:.4f} USD")
    report_lines.append("")
    report_lines.append("**引擎明细：**")
    report_lines.append("")
    report_lines.append("| 引擎 | Token 消耗 | 预估成本 |")
    report_lines.append("|------|------------|----------|")
    
    for engine, info in cost_info['engine_breakdown'].items():
        report_lines.append(f"| {engine} | {info['tokens']:,} | ${info['cost']:.4f} |")
    
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
    print(f"Overall mention rate: {overall_mention_rate:.1f}%")
    print(f"Weakest category: {CATEGORY_NAMES.get(weakest_category[0], weakest_category[0])} ({weakest_category[1]['mention_rate']:.1f}%)")
    print(f"High priority opportunities: {len(high_priority_opps)}")
    print(f"Exclusive competitors: {len(exclusive_comps)}")
    
    # 输出趋势对比信息
    if trend_data['previous_run_id']:
        print(f"Trend comparison: Run #{trend_data['previous_run_id']} → Run #{run_id}")
    else:
        print("Trend comparison: No previous run data available")
    
    return output_path


def main():
    parser = argparse.ArgumentParser(description='GEO Analysis Report Generator v2')
    parser.add_argument('--run-id', type=int, help='指定 run ID（可选，默认取最新 full_batched completed）')
    parser.add_argument('--output', help='指定输出路径（可选，默认按周数生成）')
    args = parser.parse_args()
    
    # 确定 run_id
    if args.run_id:
        run_id = args.run_id
    else:
        run_id = get_latest_full_run_id()
        if not run_id:
            run_id = get_any_completed_run_id()
        if not run_id:
            print("Error: No completed run found in database")
            return
    
    print(f"Using run_id: {run_id}")
    
    # 确定输出路径
    if args.output:
        output_path = args.output
    else:
        now = datetime.now()
        year, week, _ = now.isocalendar()
        output_path = f"/root/projects/geo/reports/{year}-W{week:02d}-analysis.md"
    
    # 确保 reports 目录存在
    import os
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # 生成报告
    generate_report(run_id, output_path)


if __name__ == '__main__':
    main()
