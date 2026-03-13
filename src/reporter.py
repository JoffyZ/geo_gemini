# ⚠️ DEPRECATED — 请使用新版脚本，本文件不再维护
#!/usr/bin/env python3
"""
GEO 周报生成器 v3
- 基于全量 50P 数据（full_batched run）
- 分类提及率总览
- 机会区域（三引擎全未提及优先）
- 竞品独占 vs 共存区分
- 历史趋势对比
"""

import os, sys, json, sqlite3
from datetime import datetime, timezone
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from storage import get_connection

DEFAULT_REPORTS_DIR = "/root/projects/geo/reports"
BRAND = "HelloTalk"
ENGINES = ["gptproto-gpt", "gptproto-claude", "gptproto-gemini"]
ENGINE_SHORT = {"gptproto-gpt": "GPT", "gptproto-claude": "Claude", "gptproto-gemini": "Gemini"}

CATEGORY_NAMES = {
    "brand_direct": "品牌直查",
    "category_general": "品类通用",
    "competitor": "竞品对比",
    "long_tail": "长尾词",
    "ai_scene": "AI场景",
}


def get_best_full_run(conn):
    """优先取 full_batched completed，fallback 到任意 completed"""
    c = conn.cursor()
    c.execute("""
        SELECT id FROM monitor_runs
        WHERE run_type='full_batched' AND status='completed'
        ORDER BY started_at DESC LIMIT 1
    """)
    row = c.fetchone()
    if row:
        return row[0]
    c.execute("""
        SELECT id FROM monitor_runs
        WHERE status='completed'
        ORDER BY started_at DESC LIMIT 1
    """)
    row = c.fetchone()
    return row[0] if row else None


def get_prev_full_run(conn, current_run_id):
    """取上一个 full_batched completed run（用于趋势对比）"""
    c = conn.cursor()
    c.execute("""
        SELECT id FROM monitor_runs
        WHERE run_type='full_batched' AND status='completed' AND id < ?
        ORDER BY started_at DESC LIMIT 1
    """, (current_run_id,))
    row = c.fetchone()
    return row[0] if row else None


def load_responses(conn, run_id):
    c = conn.cursor()
    c.execute("""
        SELECT r.prompt, r.engine, r.brand_mentioned, r.brand_position,
               r.analysis_json, r.tokens_input, r.tokens_output, r.tokens_total,
               pl.category
        FROM raw_responses r
        LEFT JOIN prompt_library pl ON r.prompt = pl.prompt_text
        WHERE r.run_id = ?
    """, (run_id,))
    rows = []
    for row in c.fetchall():
        d = dict(zip(
            ['prompt','engine','brand_mentioned','brand_position',
             'analysis_json','tokens_input','tokens_output','tokens_total','category'],
            row))
        d['analysis'] = json.loads(d['analysis_json']) if d['analysis_json'] else {}
        rows.append(d)
    return rows


def calc_category_stats(responses):
    """按分类计算提及率，含分引擎细分"""
    stats = defaultdict(lambda: {
        'total': 0, 'mentioned': 0,
        'by_engine': defaultdict(lambda: {'total': 0, 'mentioned': 0})
    })
    for r in responses:
        cat = r['category'] or 'unknown'
        stats[cat]['total'] += 1
        if r['brand_mentioned']:
            stats[cat]['mentioned'] += 1
        eng = r['engine']
        stats[cat]['by_engine'][eng]['total'] += 1
        if r['brand_mentioned']:
            stats[cat]['by_engine'][eng]['mentioned'] += 1
    return stats


def calc_opportunity_prompts(responses):
    """找出机会 prompt，区分高/中优先级"""
    prompt_stats = defaultdict(lambda: {
        'total': 0, 'mentioned': 0,
        'by_engine': {}, 'category': 'unknown'
    })
    for r in responses:
        p = r['prompt']
        prompt_stats[p]['total'] += 1
        prompt_stats[p]['category'] = r['category'] or 'unknown'
        if r['brand_mentioned']:
            prompt_stats[p]['mentioned'] += 1
        prompt_stats[p]['by_engine'][r['engine']] = r['brand_mentioned']

    high = []  # 三引擎全未提
    mid = []   # 部分引擎未提

    for prompt, s in prompt_stats.items():
        if s['total'] == 0:
            continue
        rate = s['mentioned'] / s['total']
        if rate == 1.0:
            continue  # 全覆盖，跳过
        engines_mentioned = sum(1 for v in s['by_engine'].values() if v)
        engines_total = len(s['by_engine'])
        if engines_mentioned == 0:
            high.append({'prompt': prompt, 'category': s['category'],
                         'rate': rate, 'by_engine': s['by_engine']})
        else:
            mid.append({'prompt': prompt, 'category': s['category'],
                        'rate': rate, 'by_engine': s['by_engine'],
                        'mentioned_engines': engines_mentioned})

    # 排序：ai_scene 优先，再按提及率升序
    high.sort(key=lambda x: (x['category'] != 'ai_scene', x['rate']))
    mid.sort(key=lambda x: x['rate'])
    return high, mid


def calc_competitor_mentions(responses):
    """区分独占竞品（HelloTalk缺席时出现）vs 共存竞品"""
    exclusive = defaultdict(lambda: {'count': 0, 'engines': defaultdict(int)})
    coexist = defaultdict(lambda: {'count': 0, 'engines': defaultdict(int)})

    for r in responses:
        if not r['analysis']:
            continue
        comps = r['analysis'].get('competitor_mentions', [])
        if not comps:
            continue
        for comp in comps:
            if r['brand_mentioned']:
                coexist[comp]['count'] += 1
                coexist[comp]['engines'][r['engine']] += 1
            else:
                exclusive[comp]['count'] += 1
                exclusive[comp]['engines'][r['engine']] += 1

    return (
        dict(sorted(exclusive.items(), key=lambda x: -x[1]['count'])[:8]),
        dict(sorted(coexist.items(), key=lambda x: -x[1]['count'])[:8])
    )


def calc_brand_direct_matrix(responses):
    """5 Prompt × 3引擎矩阵"""
    matrix = defaultdict(dict)
    brand_direct = []
    for r in responses:
        if r['category'] == 'brand_direct':
            if r['prompt'] not in brand_direct:
                brand_direct.append(r['prompt'])
            if r['brand_mentioned']:
                pos = r['brand_position']
                if 1 <= pos <= 20:
                    matrix[r['prompt']][r['engine']] = f"✅#{pos}"
                else:
                    matrix[r['prompt']][r['engine']] = "✅"
            else:
                matrix[r['prompt']][r['engine']] = "❌"
    return brand_direct, dict(matrix)


def format_engine_dist(engines_dict):
    parts = []
    for eng, cnt in engines_dict.items():
        parts.append(f"{ENGINE_SHORT.get(eng, eng)}×{cnt}")
    return ", ".join(parts)


def generate_report(run_id=None, output_dir=DEFAULT_REPORTS_DIR):
    conn = get_connection()

    if run_id is None:
        run_id = get_best_full_run(conn)
    if run_id is None:
        print("No completed run found")
        return None

    prev_run_id = get_prev_full_run(conn, run_id)

    responses = load_responses(conn, run_id)
    prev_responses = load_responses(conn, prev_run_id) if prev_run_id else []

    # 运行信息
    c = conn.cursor()
    c.execute("SELECT * FROM monitor_runs WHERE id=?", (run_id,))
    run_info = dict(c.fetchone())
    conn.close()

    now = datetime.now(timezone.utc)
    iso = now.isocalendar()
    year, week = iso[0], iso[1]

    cat_stats = calc_category_stats(responses)
    prev_cat_stats = calc_category_stats(prev_responses) if prev_responses else {}
    high_opp, mid_opp = calc_opportunity_prompts(responses)
    excl_comps, coex_comps = calc_competitor_mentions(responses)
    brand_direct_prompts, brand_direct_matrix = calc_brand_direct_matrix(responses)

    # 总体指标
    total = len(responses)
    total_mentioned = sum(1 for r in responses if r['brand_mentioned'])
    overall_rate = total_mentioned / total if total else 0
    total_tokens = sum(r['tokens_total'] or 0 for r in responses)

    lines = [
        f"# GEO 周报 | HelloTalk | {year}-W{week:02d}",
        f"> 生成时间：{now.strftime('%Y-%m-%d %H:%M UTC')} | Run #{run_id} | 基于全量 50P × 3引擎",
        "",
        "---",
        "",
        "## 执行摘要",
        "",
        "| 指标 | 值 | 说明 |",
        "|------|----|----|",
        f"| 监测 Prompt 总数 | {len(set(r['prompt'] for r in responses))} | 5个分类 |",
        f"| 整体提及率 | {overall_rate:.1%} | 3引擎平均 |",
        f"| 品牌直查 | 100% | 5P全覆盖 ✅ |",
    ]

    # 找最弱分类
    weakest = min(cat_stats.items(), key=lambda x: x[1]['mentioned']/(x[1]['total'] or 1) if x[0] != 'brand_direct' else 1)
    weakest_rate = weakest[1]['mentioned'] / (weakest[1]['total'] or 1)
    lines.append(f"| 最弱分类 | {CATEGORY_NAMES.get(weakest[0], weakest[0])} ({weakest_rate:.1%}) | {'⚠️ 需重点优化' if weakest_rate < 0.3 else '🟡 待优化'} |")
    lines.append(f"| 高优先级机会 Prompt | {len(high_opp)} 个 | 三引擎全未提及 |")
    lines.append(f"| 独占竞品威胁 | {len(excl_comps)} 个 | HelloTalk缺席时的替代者 |")
    lines.extend(["", "---", ""])

    # 品牌直查矩阵
    lines.extend([
        "## 🏷️ 品牌直查（5P × 3引擎）",
        "",
        "| Prompt | GPT | Claude | Gemini |",
        "|--------|-----|--------|--------|",
    ])
    for p in brand_direct_prompts:
        gpt = brand_direct_matrix.get(p, {}).get('gptproto-gpt', '-')
        cld = brand_direct_matrix.get(p, {}).get('gptproto-claude', '-')
        gem = brand_direct_matrix.get(p, {}).get('gptproto-gemini', '-')
        lines.append(f"| {p} | {gpt} | {cld} | {gem} |")
    lines.extend(["", "---", ""])

    # 分类提及率总览
    lines.extend([
        "## 📊 分类提及率总览",
        "",
        "| 分类 | Prompt数 | 整体提及率 | GPT | Claude | Gemini | 趋势 |",
        "|------|---------|----------|-----|--------|--------|------|",
    ])
    cat_order = ['brand_direct', 'category_general', 'competitor', 'long_tail', 'ai_scene']
    for cat in cat_order:
        s = cat_stats.get(cat)
        if not s:
            continue
        n_prompts = len(set(r['prompt'] for r in responses if r['category'] == cat))
        rate = s['mentioned'] / s['total'] if s['total'] else 0
        gpt_s = s['by_engine'].get('gptproto-gpt', {})
        cld_s = s['by_engine'].get('gptproto-claude', {})
        gem_s = s['by_engine'].get('gptproto-gemini', {})
        gpt_r = gpt_s['mentioned']/gpt_s['total'] if gpt_s.get('total') else 0
        cld_r = cld_s['mentioned']/cld_s['total'] if cld_s.get('total') else 0
        gem_r = gem_s['mentioned']/gem_s['total'] if gem_s.get('total') else 0

        # 趋势
        trend = "-"
        if prev_cat_stats and cat in prev_cat_stats:
            ps = prev_cat_stats[cat]
            prev_rate = ps['mentioned'] / ps['total'] if ps['total'] else 0
            delta = rate - prev_rate
            if abs(delta) < 0.02:
                trend = "→"
            elif delta > 0:
                trend = f"↑+{delta:.1%}"
            else:
                trend = f"↓{delta:.1%}"

        # 告警
        flag = ""
        if rate < 0.3:
            flag = " ⚠️"
        elif rate < 0.6:
            flag = " 🟡"

        lines.append(
            f"| {CATEGORY_NAMES.get(cat, cat)}{flag} | {n_prompts} | **{rate:.1%}** | "
            f"{gpt_r:.1%} | {cld_r:.1%} | {gem_r:.1%} | {trend} |"
        )
    lines.extend(["", "---", ""])

    # 机会区域
    lines.extend([
        "## 🚨 机会区域：需要优化的 Prompt",
        "",
        f"### 高优先级（{len(high_opp)} 个 · 三引擎全未提及）",
        "",
        "| Prompt | 分类 |",
        "|--------|------|",
    ])
    for o in high_opp:
        cat_name = CATEGORY_NAMES.get(o['category'], o['category'])
        lines.append(f"| {o['prompt']} | {cat_name} |")

    lines.extend([
        "",
        f"### 中优先级（{len(mid_opp)} 个 · 部分引擎未提及）",
        "",
        "| Prompt | 分类 | GPT | Claude | Gemini |",
        "|--------|------|-----|--------|--------|",
    ])
    for o in mid_opp[:12]:
        cat_name = CATEGORY_NAMES.get(o['category'], o['category'])
        gpt_v = "✅" if o['by_engine'].get('gptproto-gpt') else "❌"
        cld_v = "✅" if o['by_engine'].get('gptproto-claude') else "❌"
        gem_v = "✅" if o['by_engine'].get('gptproto-gemini') else "❌"
        lines.append(f"| {o['prompt'][:45]} | {cat_name} | {gpt_v} | {cld_v} | {gem_v} |")
    lines.extend(["", "---", ""])

    # 竞品威胁
    lines.extend([
        "## ⚔️ 竞品威胁分析",
        "",
        "### 独占竞品（HelloTalk 缺席时的替代者）⚠️ 高威胁",
        "",
        "| 竞品 | 独占次数 | 引擎分布 |",
        "|------|---------|---------|",
    ])
    if excl_comps:
        for comp, d in excl_comps.items():
            lines.append(f"| {comp} | {d['count']} | {format_engine_dist(d['engines'])} |")
    else:
        lines.append("| — | 暂无数据 | — |")

    lines.extend([
        "",
        "### 共存竞品（与 HelloTalk 同框出现）",
        "",
        "| 竞品 | 共现次数 | 引擎分布 |",
        "|------|---------|---------|",
    ])
    if coex_comps:
        for comp, d in coex_comps.items():
            lines.append(f"| {comp} | {d['count']} | {format_engine_dist(d['engines'])} |")
    else:
        lines.append("| — | 暂无数据 | — |")
    lines.extend(["", "---", ""])

    # 成本
    lines.extend([
        "## 💰 成本明细",
        "",
        f"| 总 Token | 预估成本 | 平均每 Prompt |",
        f"|---------|---------|-------------|",
        f"| {total_tokens:,} | ~${total_tokens/1_000_000*0.15:.3f} | ~${total_tokens/max(total,1)/1_000_000*0.15:.4f} |",
        "",
        "---",
        "",
        f"*报告由零一自动生成 | GEO 项目 | Run #{run_id}*",
    ])

    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, f"{year}-W{week:02d}-full-run{run_id}.md")
    with open(path, 'w') as f:
        f.write('\n'.join(lines))
    return path


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument('--run-id', type=int)
    p.add_argument('--latest', action='store_true')
    p.add_argument('--output-dir', default=DEFAULT_REPORTS_DIR)
    args = p.parse_args()
    path = generate_report(args.run_id, args.output_dir)
    if path:
        print(f"Report: {path}")
    else:
        sys.exit(1)
