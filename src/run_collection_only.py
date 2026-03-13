#!/usr/bin/env python3
"""
GEO M3 全量采集 - 仅采集版本（不分析）
50 Prompts × 3 引擎，每批 15 个 Prompt
"""

import json
import os
import sys
import time
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from collector import collect_batch, ENGINES, calculate_cost
from storage import init_db, start_run, finish_run, save_response

PROMPTS_FILE = "/root/projects/geo/config/prompts.json"
BATCH_SIZE = 15
BATCH_DELAY = 10
ENGINES_TO_USE = ["gptproto-gpt", "gptproto-claude", "gptproto-gemini"]
BRAND = "HelloTalk"


def load_prompts():
    with open(PROMPTS_FILE) as f:
        data = json.load(f)
    return [p['text'] for p in data.get('prompts', [])]


def main():
    print("=" * 60)
    print("GEO M3 - Collection Only (No Analysis)")
    print(f"Time: {datetime.now(timezone.utc).isoformat()}")
    print(f"Engines: {ENGINES_TO_USE}")
    print(f"Batch size: {BATCH_SIZE}")
    print("=" * 60)
    
    init_db()
    prompts = load_prompts()
    print(f"Loaded {len(prompts)} prompts")
    
    batches = [prompts[i:i+BATCH_SIZE] for i in range(0, len(prompts), BATCH_SIZE)]
    print(f"Split into {len(batches)} batches")
    
    run_id = start_run(
        run_type='collection_only',
        config={
            'engines': ENGINES_TO_USE,
            'samples': 1,
            'prompts_count': len(prompts),
            'batch_size': BATCH_SIZE,
            'brand': BRAND,
            'with_analysis': False
        }
    )
    print(f"Run ID: {run_id}")
    
    all_results = []
    total_tokens = 0
    total_cost = 0
    
    for batch_idx, batch_prompts in enumerate(batches, 1):
        print(f"\n--- Batch {batch_idx}/{len(batches)} ({len(batch_prompts)} prompts) ---")
        
        try:
            results = collect_batch(
                prompts=batch_prompts,
                engines=ENGINES_TO_USE,
                brand=BRAND,
                samples_per_prompt=1,
                dry_run=False,
                progress_callback=lambda c, t, p, e: print(f"  [{c}/{t}] {e}: {p[:40]}...")
            )
            
            for result in results:
                save_response(run_id, result, None)  # 不分析
                all_results.append(result)
            
            for engine in ENGINES_TO_USE:
                engine_results = [r for r in results if r['engine'] == engine and not r.get('error')]
                tokens_in = sum(r.get('tokens_input', 0) for r in engine_results)
                tokens_out = sum(r.get('tokens_output', 0) for r in engine_results)
                total_tokens += tokens_in + tokens_out
                total_cost += calculate_cost(engine, tokens_in, tokens_out)
            
            batch_success = sum(1 for r in results if not r.get('error'))
            batch_failed = sum(1 for r in results if r.get('error'))
            print(f"Batch {batch_idx} done: {batch_success} OK, {batch_failed} failed")
            
        except Exception as e:
            print(f"Batch {batch_idx} ERROR: {e}")
            for prompt in batch_prompts:
                for engine in ENGINES_TO_USE:
                    err = {
                        'prompt': prompt, 'engine': engine,
                        'error': str(e), 'timestamp': datetime.now(timezone.utc).isoformat()
                    }
                    save_response(run_id, err, None)
                    all_results.append(err)
        
        if batch_idx < len(batches):
            print(f"Waiting {BATCH_DELAY}s...")
            time.sleep(BATCH_DELAY)
    
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
    print("SUMMARY")
    print(f"Run ID: {run_id}")
    print(f"Total: {len(all_results)}, Success: {successful}, Failed: {failed}")
    print(f"Tokens: {total_tokens:,}, Cost: ${total_cost:.4f}")
    
    for engine in ENGINES_TO_USE:
        er = [r for r in all_results if r['engine'] == engine]
        es = sum(1 for r in er if not r.get('error'))
        em = sum(1 for r in er if r.get('brand_mentioned'))
        print(f"  {engine}: {es}/{len(er)} OK, {em} mentions")
    
    print(f"\nRUN_ID={run_id}")
    return run_id


if __name__ == "__main__":
    main()
