#!/bin/bash
# GEO 周报自动化任务
# 用法：bash weekly_job.sh [--dry-run]

set -e
LOG_DIR="/root/projects/geo/logs"
LOG_FILE="$LOG_DIR/weekly_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$LOG_DIR"

exec >> "$LOG_FILE" 2>&1
echo "[$(date)] GEO weekly job started"

# 1. 全量采集
echo "[$(date)] Step 1: Running collection..."
python3 /root/projects/geo/src/run_all_batched.py

# 获取最新 run_id
RUN_ID=$(python3 -c "
import sys; sys.path.insert(0, '/root/projects/geo/src')
from storage import get_connection
conn = get_connection()
c = conn.cursor()
c.execute('SELECT id FROM monitor_runs WHERE status=\"completed\" ORDER BY id DESC LIMIT 1')
r = c.fetchone()
print(r[0] if r else 'none')
conn.close()
")
echo "[$(date)] Latest completed run_id: $RUN_ID"

if [ "$RUN_ID" = "none" ]; then
  echo "[$(date)] ERROR: No completed run found, aborting"
  exit 1
fi

# 2. 生成报告
echo "[$(date)] Step 2: Generating report..."
REPORT_PATH=$(python3 /root/projects/geo/src/analyzer_report.py --run-ids "$RUN_ID" --output "/root/projects/geo/reports/weekly_$(date +%Y-W%V).md" 2>&1 | tail -1)
echo "[$(date)] Report: $REPORT_PATH"

# 3. 推送报告（独立脚本，不依赖 OpenClaw 飞书通道）
echo "[$(date)] Step 3: Pushing report..."
python3 /root/projects/geo/src/notify.py --report "$REPORT_PATH" --type weekly
PUSH_STATUS=$?
if [ $PUSH_STATUS -eq 0 ]; then
    echo "[$(date)] Report pushed successfully"
else
    echo "[$(date)] Push failed or no targets configured (exit $PUSH_STATUS)"
fi

echo "[$(date)] GEO weekly job completed"
