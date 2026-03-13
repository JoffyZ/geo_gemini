#!/usr/bin/env python3
"""
GEO M1 演示脚本
运行 5 个测试 Prompt，采集 + 分析 + 存储
"""

import sys
import os

# 添加 src 目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from collector import collect_one
from analyzer import analyze_response
from storage import init_db, start_run, finish_run, save_response

# 测试 Prompt
TEST_PROMPTS = [
    "What is the best app to learn Japanese?",
    "HelloTalk review",
    "Best language exchange app",
    "Duolingo alternatives for Japanese",
    "Free Japanese learning app",
]


def run_demo():
    """运行演示"""
    print("=" * 60)
    print("GEO M1 Demo - Data Collection")
    print("=" * 60)
    
    # 初始化数据库
    print("\n[1/3] Initializing database...")
    init_db()
    
    # 开始运行记录
    run_id = start_run(
        run_type='demo',
        config={
            'model': 'gpt-5-mini',
            'engine': 'gptproto',
            'prompts': TEST_PROMPTS
        }
    )
    print(f"  Run ID: {run_id}")
    
    # 采集数据
    print("\n[2/3] Collecting data...")
    successful = 0
    failed = 0
    
    for i, prompt in enumerate(TEST_PROMPTS, 1):
        print(f"\n[{i}/{len(TEST_PROMPTS)}] Prompt: \"{prompt}\"")
        
        # 采集
        result = collect_one(prompt, model="gpt-5-mini", engine="gptproto")
        
        if result.get('error'):
            print(f"  ❌ Collection failed: {result['error']}")
            failed += 1
            save_response(run_id, result, None)
            continue
        
        # 分析（只对有内容的回答）
        analysis = None
        if result.get('raw_text'):
            print(f"  ⏳ Analyzing...")
            analysis = analyze_response(result['raw_text'])
        
        # 存储
        save_response(run_id, result, analysis)
        successful += 1
        
        # 打印摘要
        print(f"  Engine: {result['engine']}/{result['model']}")
        mentioned = "Yes" if result['brand_mentioned'] else "No"
        position = f" (position: {result['brand_position']})" if result['brand_mentioned'] else ""
        print(f"  HelloTalk mentioned: {mentioned}{position}")
        
        if result.get('citations'):
            domains = [c.get('domain', c.get('url', '')) for c in result['citations'][:5]]
            print(f"  Citations: {', '.join(domains)}")
        
        if analysis:
            print(f"  Sentiment: {analysis.get('sentiment', 'N/A')}")
            if analysis.get('competitor_mentions'):
                print(f"  Competitor mentions: {', '.join(analysis['competitor_mentions'])}")
        
        print(f"  Duration: {result['duration_ms']}ms")
    
    # 结束运行记录
    print("\n[3/3] Finishing run...")
    finish_run(
        run_id=run_id,
        status='completed',
        total=len(TEST_PROMPTS),
        successful=successful,
        failed=failed
    )
    
    # 打印最终摘要
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total prompts: {len(TEST_PROMPTS)}")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    print(f"Run ID: {run_id}")
    print(f"Database: /root/projects/geo/data/geo.db")
    print("\nDone!")


if __name__ == "__main__":
    run_demo()
