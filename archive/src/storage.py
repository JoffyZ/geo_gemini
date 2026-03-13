#!/usr/bin/env python3
"""
GEO 数据存储模块 - SQLite 存储
管理监控运行记录、原始回答、分析结果

v2: 新增 token 监控字段 + 成本跟踪
"""

import sqlite3
import json
import os
from datetime import datetime, timezone
from typing import Optional, List, Any

DB_PATH = "/root/projects/geo/data/geo.db"


def get_connection() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """初始化数据库表结构"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. 监控运行记录表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS monitor_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_type TEXT NOT NULL DEFAULT 'manual',
            started_at TEXT NOT NULL,
            finished_at TEXT,
            status TEXT NOT NULL DEFAULT 'running',
            total_prompts INTEGER DEFAULT 0,
            successful INTEGER DEFAULT 0,
            failed INTEGER DEFAULT 0,
            config_json TEXT,
            notes TEXT,
            total_tokens INTEGER DEFAULT 0,
            total_cost_usd REAL DEFAULT 0,
            engines_used TEXT
        )
    """)
    
    # 2. 原始回答表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS raw_responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER NOT NULL,
            prompt TEXT NOT NULL,
            engine TEXT NOT NULL,
            model TEXT NOT NULL,
            raw_text TEXT,
            brand_mentioned INTEGER DEFAULT 0,
            brand_position INTEGER DEFAULT 0,
            citations_json TEXT,
            analysis_json TEXT,
            timestamp TEXT NOT NULL,
            duration_ms INTEGER DEFAULT 0,
            error TEXT,
            tokens_input INTEGER DEFAULT 0,
            tokens_output INTEGER DEFAULT 0,
            tokens_total INTEGER DEFAULT 0,
            samples_attempted INTEGER DEFAULT 1,
            samples_successful INTEGER DEFAULT 1,
            FOREIGN KEY (run_id) REFERENCES monitor_runs(id)
        )
    """)
    
    # 3. Prompt 库表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS prompt_library (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt_text TEXT NOT NULL UNIQUE,
            category TEXT,
            priority INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT
        )
    """)
    
    # 创建索引
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_responses_run_id ON raw_responses(run_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_responses_brand ON raw_responses(brand_mentioned, brand_position)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompt_library(category, active)")
    
    # 检查并添加新字段（兼容已有数据库）
    cursor.execute("PRAGMA table_info(raw_responses)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'tokens_input' not in columns:
        cursor.execute("ALTER TABLE raw_responses ADD COLUMN tokens_input INTEGER DEFAULT 0")
    if 'tokens_output' not in columns:
        cursor.execute("ALTER TABLE raw_responses ADD COLUMN tokens_output INTEGER DEFAULT 0")
    if 'tokens_total' not in columns:
        cursor.execute("ALTER TABLE raw_responses ADD COLUMN tokens_total INTEGER DEFAULT 0")
    if 'samples_attempted' not in columns:
        cursor.execute("ALTER TABLE raw_responses ADD COLUMN samples_attempted INTEGER DEFAULT 1")
    if 'samples_successful' not in columns:
        cursor.execute("ALTER TABLE raw_responses ADD COLUMN samples_successful INTEGER DEFAULT 1")
    
    cursor.execute("PRAGMA table_info(monitor_runs)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'total_tokens' not in columns:
        cursor.execute("ALTER TABLE monitor_runs ADD COLUMN total_tokens INTEGER DEFAULT 0")
    if 'total_cost_usd' not in columns:
        cursor.execute("ALTER TABLE monitor_runs ADD COLUMN total_cost_usd REAL DEFAULT 0")
    if 'engines_used' not in columns:
        cursor.execute("ALTER TABLE monitor_runs ADD COLUMN engines_used TEXT")
    
    conn.commit()
    conn.close()


def start_run(run_type: str = 'manual', config: dict = None) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO monitor_runs (run_type, started_at, status, config_json)
        VALUES (?, ?, 'running', ?)
    """, (
        run_type,
        datetime.now(timezone.utc).isoformat(),
        json.dumps(config) if config else None
    ))
    
    run_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return run_id


def finish_run(run_id: int, status: str = 'completed', 
               total: int = 0, successful: int = 0, failed: int = 0,
               total_tokens: int = 0, total_cost_usd: float = 0.0,
               engines_used: list = None,
               notes: str = None):
    """结束一次监控运行
    
    Args:
        run_id: 运行 ID
        status: 状态 ('completed', 'partial', 'failed')
        total: 总请求数
        successful: 成功数
        failed: 失败数
        total_tokens: 总 token 消耗
        total_cost_usd: 总成本（美元）
        engines_used: 使用的引擎列表
        notes: 备注
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE monitor_runs 
        SET finished_at = ?, status = ?, 
            total_prompts = ?, successful = ?, failed = ?,
            total_tokens = ?, total_cost_usd = ?, engines_used = ?,
            notes = ?
        WHERE id = ?
    """, (
        datetime.now(timezone.utc).isoformat(),
        status, total, successful, failed,
        total_tokens, total_cost_usd,
        json.dumps(engines_used) if engines_used else None,
        notes, run_id
    ))
    
    conn.commit()
    conn.close()


def save_response(run_id: int, result: dict, analysis: dict = None):
    """保存一条采集结果
    
    一致性保护：如果 brand_mentioned=False，强制 brand_position=0
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    brand_mentioned = 1 if result.get('brand_mentioned') else 0
    brand_position = result.get('brand_position', 0)
    
    # 一致性保护
    if not brand_mentioned:
        brand_position = 0
    
    cursor.execute("""
        INSERT INTO raw_responses 
        (run_id, prompt, engine, model, raw_text, brand_mentioned, 
         brand_position, citations_json, analysis_json, timestamp, 
         duration_ms, error, tokens_input, tokens_output, tokens_total,
         samples_attempted, samples_successful)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        run_id,
        result.get('prompt', ''),
        result.get('engine', ''),
        result.get('model', ''),
        result.get('raw_text', ''),
        brand_mentioned,
        brand_position,
        json.dumps(result.get('citations', []), ensure_ascii=False),
        json.dumps(analysis, ensure_ascii=False) if analysis else None,
        result.get('timestamp', ''),
        result.get('duration_ms', 0),
        result.get('error'),
        result.get('tokens_input', 0),
        result.get('tokens_output', 0),
        result.get('tokens_total', 0),
        result.get('samples_attempted', 1),
        result.get('samples_successful', 1)
    ))
    
    conn.commit()
    conn.close()


def get_prompts(category: str = None, priority: int = None, 
                active_only: bool = True) -> List[str]:
    conn = get_connection()
    cursor = conn.cursor()
    
    sql = "SELECT prompt_text FROM prompt_library WHERE 1=1"
    params = []
    
    if active_only:
        sql += " AND active = 1"
    if category:
        sql += " AND category = ?"
        params.append(category)
    if priority:
        sql += " AND priority = ?"
        params.append(priority)
    
    sql += " ORDER BY priority, id"
    
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [row['prompt_text'] for row in rows]


def add_prompt(prompt_text: str, category: str = None, priority: int = 2):
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO prompt_library (prompt_text, category, priority, created_at)
            VALUES (?, ?, ?, ?)
        """, (prompt_text, category, priority, datetime.now(timezone.utc).isoformat()))
        conn.commit()
    except sqlite3.IntegrityError:
        pass
    finally:
        conn.close()


def get_run_stats(run_id: int) -> dict:
    """获取某次运行的统计信息"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM monitor_runs WHERE id = ?", (run_id,))
    run = cursor.fetchone()
    
    if not run:
        conn.close()
        return None
    
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(brand_mentioned) as mentioned,
            AVG(CASE WHEN brand_mentioned = 1 AND brand_position > 0 AND brand_position <= 20 
                THEN brand_position END) as avg_position,
            AVG(duration_ms) as avg_duration,
            SUM(tokens_total) as total_tokens
        FROM raw_responses
        WHERE run_id = ? AND error IS NULL
    """, (run_id,))
    stats = cursor.fetchone()
    
    conn.close()
    
    return {
        'run': dict(run),
        'stats': {
            'total': stats['total'] or 0,
            'mentioned': stats['mentioned'] or 0,
            'mention_rate': (stats['mentioned'] or 0) / max(stats['total'] or 1, 1),
            'avg_position': round(stats['avg_position'] or 0, 2),
            'avg_duration_ms': round(stats['avg_duration'] or 0),
            'total_tokens': stats['total_tokens'] or 0
        }
    }


def init_default_prompts():
    """初始化默认 Prompt 库"""
    prompts = [
        ("What is HelloTalk?", "brand_direct", 1),
        ("Is HelloTalk safe?", "brand_direct", 1),
        ("Is HelloTalk free?", "brand_direct", 1),
        ("How does HelloTalk work?", "brand_direct", 1),
        ("HelloTalk review", "brand_direct", 1),
        ("Best app to learn Japanese", "category_general", 1),
        ("Best language learning app 2025", "category_general", 2),
        ("Best free language learning app", "category_general", 2),
        ("Best AI language learning app", "category_general", 2),
        ("Duolingo alternatives", "category_general", 2),
        ("Best app to learn Japanese for beginners", "category_general", 2),
        ("Best Japanese learning app for adults", "category_general", 2),
        ("Free Japanese learning app", "category_general", 2),
        ("AI language tutor app", "category_general", 2),
        ("Best app to practice speaking Japanese", "category_general", 2),
        ("Best language exchange app", "category_general", 2),
        ("How to learn Japanese fast", "category_general", 3),
        ("Best app for Japanese conversation practice", "category_general", 3),
        ("Best Japanese learning app for iPhone", "category_general", 3),
        ("Best Japanese learning app for Android", "category_general", 3),
        ("HelloTalk vs Duolingo", "competitor", 2),
        ("HelloTalk vs Tandem", "competitor", 2),
        ("HelloTalk vs iTalki", "competitor", 2),
        ("HelloTalk vs Pimsleur", "competitor", 3),
        ("HelloTalk vs Babbel for Japanese", "competitor", 3),
        ("Duolingo vs AI language apps", "competitor", 3),
        ("Best Duolingo alternative for Japanese", "competitor", 2),
        ("TalkPal vs HelloTalk", "competitor", 3),
        ("Speak app vs HelloTalk", "competitor", 3),
        ("Best language exchange app vs Duolingo", "competitor", 3),
        ("AI language learning app", "ai_scene", 2),
        ("AI conversation practice app", "ai_scene", 2),
        ("ChatGPT for language learning", "ai_scene", 3),
        ("Best AI tutor for Japanese", "ai_scene", 3),
        ("AI Japanese speaking practice", "ai_scene", 3),
        ("Can AI replace language tutors?", "ai_scene", 3),
        ("AI app to improve Japanese pronunciation", "ai_scene", 3),
        ("Best AI app for language exchange", "ai_scene", 3),
        ("AI-powered Japanese learning", "ai_scene", 3),
        ("ChatGPT alternatives for language learning", "ai_scene", 3),
        ("Best app to learn Japanese from scratch", "long_tail", 3),
        ("Learn Japanese while commuting app", "long_tail", 3),
        ("Japanese learning app with speech recognition", "long_tail", 3),
        ("Japanese learning app with native speakers", "long_tail", 3),
        ("Social app to practice Japanese", "long_tail", 3),
        ("Japanese learning app with grammar correction", "long_tail", 3),
        ("Best app to learn Japanese Hiragana", "long_tail", 3),
        ("Japanese learning app for business Japanese", "long_tail", 3),
        ("Learn Japanese online free app", "long_tail", 3),
        ("Japanese learning community app", "long_tail", 3),
    ]
    
    for prompt, category, priority in prompts:
        add_prompt(prompt, category, priority)


if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("Adding default prompts...")
    init_default_prompts()
    prompts = get_prompts(priority=1)
    print(f"Core prompts (priority 1): {len(prompts)}")
    for p in prompts:
        print(f"  - {p}")
