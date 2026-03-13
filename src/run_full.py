#!/usr/bin/env python3
"""
GEO M2+ 全量运行脚本
支持多引擎、多 Prompt 批量采集

v2: 支持 token 汇总 + 成本计算
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from collector import collect_batch, ENGINES, calculate_cost
from analyzer import analyze_response
from storage import init_db, start_run, finish_run, save_response

DEFAULT_PROMPTS_FILE = "/root/projects/geo/config/prompts.json"
DEFAULT_REPORTS_DIR = "/root/projects/geo/reports"


def load_prompts(prompts_file: str, priority_filter: int = None, 
                  category_filter: str = None, limit: int = None) -> list:
    with open(prompts_file) as f:
        data = json.load(f)
    
    prompts = data.get('prompts', [])
    
    if priority_filter:
        prompts = [p for p in prompts if p.get('priority') == priority_filter]
    
    if category_filter:
        prompts = [p for p in prompts if p.get('category') == category_filter]
    
    if limit:
        prompts = prompts[:limit]
    
    return [p['text'] for p in prompts]


def progress_callback(current: int, total: int, prompt: str, engine: str):
    print(f"[{current}/{total}] {engine}: {prompt[:50]}...")


def run_collection(prompts: list, engines: list, samples: int = 3,
                   dry_run: bool = False, brand: str = "HelloTalk") -> dict:
    
    print("=" * 60)
    print("GEO Collection - Full Run")
    print("=" * 60)
    print(f"Time: {datetime.now(timezone.utc).isoformat()}")
    print(f"Engines: {engines}")
    print(f"Prompts: {len(prompts)}")
    print(f"Samples per prompt: {samples}")
    print(f"Dry run: {dry_run}")
    print(f"Brand: {brand}")
    print("=" * 60)
    
    if not dry_run:
        init_db()
    
    run_id = None
    if not dry_run:
        run_id = start_run(
            run_type='manual',
            config={
                'engines': engines,
                'samples': samples,
                'prompts_count': len(prompts),
                'brand': brand
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
    skipped = sum(1 for r in results if r.get('dry_run'))
    
    # Token 和成本汇总
    total_tokens = sum(r.get('tokens_total', 0) for r in results if not r.get('dry_run'))
    total_cost = 0
    
    # 按引擎计算成本
    for engine in engines:
        engine_results = [r for r in results if r['engine'] == engine and not r.get('dry_run')]
        tokens_in = sum(r.get('tokens_input', 0) for r in engine_results)
        tokens_out = sum(r.get('tokens_output', 0) for r in engine_results)
        total_cost += calculate_cost(engine, tokens_in, tokens_out)
    
    # 分析并存储
    if not dry_run and run_id:
        print("\nAnalyzing and saving results...")
        for i, result in enumerate(results, 1):
            if result.get('error') or result.get('dry_run'):
                save_response(run_id, result, None)
                continue
            
            analysis = None
            if result.get('raw_text'):
                analysis = analyze_response(result['raw_text'], brand)
            
            save_response(run_id, result, analysis)
            
            if i % 10 == 0:
                print(f"  Saved {i}/{len(results)}")
        
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
    if skipped:
        print(f"Skipped (dry run): {skipped}")
    
    print(f"Total tokens: {total_tokens:,}")
    print(f"Total cost: ${total_cost:.4f}")
    
    if run_id:
        print(f"Run ID: {run_id}")
    
    print("\nBy Engine:")
    for engine in engines:
        engine_results = [r for r in results if r['engine'] == engine]
        engine_success = sum(1 for r in engine_results if not r.get('error'))
        engine_failed = sum(1 for r in engine_results if r.get('error'))
        engine_mentions = sum(1 for r in engine_results if r.get('brand_mentioned'))
        engine_tokens = sum(r.get('tokens_total', 0) for r in engine_results if not r.get('dry_run'))
        
        print(f"  {engine}:")
        print(f"    Success: {engine_success}, Failed: {engine_failed}")
        print(f"    Brand mentions: {engine_mentions}/{len(engine_results)}")
        print(f"    Tokens: {engine_tokens:,}")
    
    return {
        'run_id': run_id,
        'total': len(results),
        'successful': successful,
        'failed': failed,
        'total_tokens': total_tokens,
        'total_cost': total_cost,
        'results': results
    }


def main():
    parser = argparse.ArgumentParser(description="GEO Full Collection Run")
    
    parser.add_argument('--engines', nargs='+', 
                        default=list(ENGINES.keys()),
                        choices=list(ENGINES.keys()),
                        help='Engines to use')
    
    parser.add_argument('--prompts-file', default=DEFAULT_PROMPTS_FILE)
    parser.add_argument('--priority', type=int, choices=[1, 2, 3])
    parser.add_argument('--category', type=str,
                        choices=['brand_direct', 'category_general', 'competitor', 
                                'ai_scene', 'long_tail'])
    parser.add_argument('--limit', type=int)
    parser.add_argument('--samples', type=int, default=3)
    parser.add_argument('--brand', type=str, default='HelloTalk')
    parser.add_argument('--dry-run', action='store_true')
    
    args = parser.parse_args()
    
    try:
        prompts = load_prompts(
            args.prompts_file,
            priority_filter=args.priority,
            category_filter=args.category,
            limit=args.limit
        )
    except FileNotFoundError:
        print(f"Error: Prompts file not found: {args.prompts_file}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON: {e}")
        sys.exit(1)
    
    if not prompts:
        print("Error: No prompts to process")
        sys.exit(1)
    
    print(f"Loaded {len(prompts)} prompts")
    
    result = run_collection(
        prompts=prompts,
        engines=args.engines,
        samples=args.samples,
        dry_run=args.dry_run,
        brand=args.brand
    )
    
    return result


if __name__ == "__main__":
    main()
