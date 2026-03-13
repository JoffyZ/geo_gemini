#!/usr/bin/env python3
"""
GEO 品牌直查专用入口
只跑 5 个品牌直查 Prompt，每 Prompt 跑 1 次（3 引擎）

用法：
    python3 src/run_brand_check.py           # 正常运行
    python3 src/run_brand_check.py --dry-run # 模拟运行
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from collector import collect_batch, ENGINES, calculate_cost
from analyzer import analyze_response
from storage import init_db, start_run, finish_run, save_response
from reporter import generate_report

DEFAULT_PROMPTS_FILE = "/root/projects/geo/config/prompts.json"
DEFAULT_REPORTS_DIR = "/root/projects/geo/reports"


def load_brand_direct_prompts(prompts_file: str) -> list:
    """只加载 brand_direct 类别的 Prompts"""
    with open(prompts_file) as f:
        data = json.load(f)
    
    prompts = [p['text'] for p in data.get('prompts', []) 
               if p.get('category') == 'brand_direct']
    return prompts


def progress_callback(current: int, total: int, prompt: str, engine: str):
    print(f"[{current}/{total}] {engine}: {prompt[:50]}...")


def run_brand_check(dry_run: bool = False, brand: str = "HelloTalk") -> dict:
    """执行品牌直查"""
    
    prompts = load_brand_direct_prompts(DEFAULT_PROMPTS_FILE)
    engines = ['gptproto-gpt', 'gptproto-claude', 'gptproto-gemini']
    samples = 1  # 品牌直查只跑 1 次
    
    print("=" * 60)
    print("GEO Brand Direct Check")
    print("=" * 60)
    print(f"Time: {datetime.now(timezone.utc).isoformat()}")
    print(f"Prompts: {len(prompts)} (brand_direct)")
    print(f"Engines: {engines}")
    print(f"Dry run: {dry_run}")
    print(f"Brand: {brand}")
    print("=" * 60)
    
    if not dry_run:
        init_db()
    
    run_id = None
    if not dry_run:
        run_id = start_run(
            run_type='brand_check',
            config={
                'engines': engines,
                'samples': samples,
                'prompts_count': len(prompts),
                'brand': brand,
                'type': 'brand_direct'
            }
        )
        print(f"Run ID: {run_id}")
    
    results = collect_batch(
        prompts=prompts,
        engines=engines,
        brand=brand,
        samples_per_prompt=samples,
        dry_run=dry_run,
        progress_callback=progress_callback
    )
    
    successful = sum(1 for r in results if not r.get('error') and not r.get('dry_run'))
    failed = sum(1 for r in results if r.get('error'))
    
    # Token 和成本汇总
    total_tokens = sum(r.get('tokens_total', 0) for r in results if not r.get('dry_run'))
    total_cost = 0
    
    for engine in engines:
        engine_results = [r for r in results if r['engine'] == engine and not r.get('dry_run')]
        tokens_in = sum(r.get('tokens_input', 0) for r in engine_results)
        tokens_out = sum(r.get('tokens_output', 0) for r in engine_results)
        total_cost += calculate_cost(engine, tokens_in, tokens_out)
    
    # 存储结果
    if not dry_run and run_id:
        print("\nSaving results...")
        for result in results:
            if result.get('error') or result.get('dry_run'):
                save_response(run_id, result, None)
                continue
            
            analysis = None
            if result.get('raw_text'):
                analysis = analyze_response(result['raw_text'], brand)
            
            save_response(run_id, result, analysis)
        
        finish_run(
            run_id=run_id,
            status='completed' if failed == 0 else 'partial',
            total=len(prompts) * len(engines),
            successful=successful,
            failed=failed,
            total_tokens=total_tokens,
            total_cost_usd=total_cost,
            engines_used=engines
        )
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total queries: {len(results)}")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    print(f"Total tokens: {total_tokens:,}")
    print(f"Total cost: ${total_cost:.4f}")
    
    # 品牌直查统计
    print("\nBrand Direct Results:")
    for prompt in prompts:
        print(f"\n  {prompt}:")
        for engine in engines:
            r = next((x for x in results if x['prompt'] == prompt and x['engine'] == engine), None)
            if r:
                mentioned = "✅" if r.get('brand_mentioned') else "❌"
                position = f" #{r.get('brand_position', 0)}" if r.get('brand_position', 0) > 0 else ""
                print(f"    {engine}: {mentioned}{position}")
    
    # 生成报告
    report_path = None
    if run_id:
        print("\nGenerating report...")
        report_path = generate_report(run_id, brand, DEFAULT_REPORTS_DIR)
        if report_path:
            print(f"Report: {report_path}")
    
    return {
        'run_id': run_id,
        'total': len(results),
        'successful': successful,
        'failed': failed,
        'total_tokens': total_tokens,
        'total_cost': total_cost,
        'report_path': report_path,
        'results': results
    }


def main():
    parser = argparse.ArgumentParser(description="GEO Brand Direct Check")
    parser.add_argument('--dry-run', action='store_true', help='Dry run mode')
    parser.add_argument('--brand', default='HelloTalk', help='Brand name')
    
    args = parser.parse_args()
    
    result = run_brand_check(dry_run=args.dry_run, brand=args.brand)
    
    if result.get('report_path'):
        print(f"\n✅ Report generated: {result['report_path']}")
    
    return result


if __name__ == "__main__":
    main()
