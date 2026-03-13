#!/usr/bin/env python3
"""
GEO M3 全量采集 - 分批执行版
50 Prompts × 3 引擎，每批 15 个 Prompt，批次间等待 10 秒
"""

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from collector import collect_batch, ENGINES, calculate_cost
from analyzer import analyze_response
from storage import init_db, start_run, finish_run, save_response, get_connection

PROMPTS_FILE = "/root/projects/geo/config/prompts.json"
REPORTS_DIR = "/root/projects/geo/reports"
BATCH_SIZE = 15
BATCH_DELAY = 10  # seconds
ENGINES_TO_USE = ["gptproto-gpt", "gptproto-claude", "gptproto-gemini"]
BRAND = "HelloTalk"


def load_prompts():
    with open(PROMPTS_FILE) as f:
        data = json.load(f)
    return [p['text'] for p in data.get('prompts', [])]


def run_batched_collection():
    print("=" * 60)
    print("GEO M3 - Full Collection (Batched)")
    print("=" * 60)
    print(f"Time: {datetime.now(timezone.utc).isoformat()}")
    print(f"Engines: {ENGINES_TO_USE}")
    print(f"Batch size: {BATCH_SIZE}")
    print(f"Batch delay: {BATCH_DELAY}s")
    print(f"Samples per prompt: 1 (single run, no median)")
    print("=" * 60)
    
    init_db()
    
    prompts = load_prompts()
    print(f"Loaded {len(prompts)} prompts")
    
    # 分批
    batches = [prompts[i:i+BATCH_SIZE] for i in range(0, len(prompts), BATCH_SIZE)]
    print(f"Split into {len(batches)} batches")
    
    # 创建 run
    run_id = start_run(
        run_type='full_batched',
        config={
            'engines': ENGINES_TO_USE,
            'samples': 1,
            'prompts_count': len(prompts),
            'batch_size': BATCH_SIZE,
            'brand': BRAND
        }
    )
    print(f"Run ID: {run_id}")
    
    all_results = []
    total_tokens = 0
    total_cost = 0
    errors = []
    
    for batch_idx, batch_prompts in enumerate(batches, 1):
        print(f"\n{'='*40}")
        print(f"Batch {batch_idx}/{len(batches)} - {len(batch_prompts)} prompts")
        print(f"{'='*40}")
        
        try:
            results = collect_batch(
                prompts=batch_prompts,
                engines=ENGINES_TO_USE,
                brand=BRAND,
                samples_per_prompt=1,
                dry_run=False,
                progress_callback=lambda c, t, p, e: print(f"  [{c}/{t}] {e}: {p[:40]}...")
            )
            
            all_results.extend(results)
            
            # 分析并保存
            for result in results:
                analysis = None
                if not result.get('error') and result.get('raw_text'):
                    try:
                        analysis = analyze_response(result['raw_text'], BRAND)
                    except Exception as e:
                        print(f"    Analysis error: {e}")
                
                save_response(run_id, result, analysis)
                
                if result.get('error'):
                    errors.append({
                        'engine': result['engine'],
                        'prompt': result['prompt'][:50],
                        'error': result['error']
                    })
            
            # 累计 tokens 和成本
            for engine in ENGINES_TO_USE:
                engine_results = [r for r in results if r['engine'] == engine and not r.get('error')]
                tokens_in = sum(r.get('tokens_input', 0) for r in engine_results)
                tokens_out = sum(r.get('tokens_output', 0) for r in engine_results)
                total_tokens += tokens_in + tokens_out
                total_cost += calculate_cost(engine, tokens_in, tokens_out)
            
            batch_success = sum(1 for r in results if not r.get('error'))
            batch_failed = sum(1 for r in results if r.get('error'))
            print(f"\nBatch {batch_idx} done: {batch_success} success, {batch_failed} failed")
            
        except Exception as e:
            print(f"Batch {batch_idx} ERROR: {e}")
            # 记录错误继续
            for prompt in batch_prompts:
                for engine in ENGINES_TO_USE:
                    err_result = {
                        'prompt': prompt,
                        'engine': engine,
                        'error': f"Batch error: {e}",
                        'timestamp': datetime.now(timezone.utc).isoformat()
                    }
                    all_results.append(err_result)
                    save_response(run_id, err_result, None)
                    errors.append({
                        'engine': engine,
                        'prompt': prompt[:50],
                        'error': str(e)
                    })
        
        # 批次间等待（最后一批不等待）
        if batch_idx < len(batches):
            print(f"Waiting {BATCH_DELAY}s before next batch...")
            time.sleep(BATCH_DELAY)
    
    # 完成统计
    successful = sum(1 for r in all_results if not r.get('error'))
    failed = sum(1 for r in all_results if r.get('error'))
    
    finish_run(
        run_id=run_id,
        status='completed' if failed == 0 else 'partial',
        total=len(prompts) * len(ENGINES_TO_USE),
        successful=successful,
        failed=failed,
        total_tokens=total_tokens,
        total_cost_usd=total_cost,
        engines_used=ENGINES_TO_USE
    )
    
    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    print(f"Run ID: {run_id}")
    print(f"Total queries: {len(all_results)}")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    print(f"Total tokens: {total_tokens:,}")
    print(f"Total cost: ${total_cost:.4f}")
    
    print("\nBy Engine:")
    for engine in ENGINES_TO_USE:
        engine_results = [r for r in all_results if r['engine'] == engine]
        engine_success = sum(1 for r in engine_results if not r.get('error'))
        engine_failed = sum(1 for r in engine_results if r.get('error'))
        engine_mentions = sum(1 for r in engine_results if r.get('brand_mentioned'))
        engine_tokens = sum(r.get('tokens_total', 0) for r in engine_results if not r.get('error'))
        print(f"  {engine}:")
        print(f"    Success: {engine_success}, Failed: {engine_failed}")
        print(f"    Brand mentions: {engine_mentions}/{len(engine_results)}")
        print(f"    Tokens: {engine_tokens:,}")
    
    if errors:
        print(f"\nErrors ({len(errors)}):")
        for e in errors[:10]:  # 只显示前 10 个
            print(f"  [{e['engine']}] {e['prompt']}... : {e['error'][:80]}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more errors")
    
    return run_id, successful, failed, total_tokens, total_cost, errors


if __name__ == "__main__":
    run_id, success, failed, tokens, cost, errors = run_batched_collection()
    
    # 输出 run_id 供后续脚本使用
    print(f"\nRUN_ID={run_id}")
