# ⚠️ DEPRECATED — 请使用新版脚本，本文件不再维护
#!/usr/bin/env python3
"""
GEO 报告推送脚本 - 独立飞书推送，不依赖 OpenClaw 通道
用法：python3 src/notify.py --report reports/xxx.md --type weekly

升级版：上传完整报告到飞书云文档，发送摘要+链接
Markdown 渲染：支持标题、列表、引用、分隔线、行内样式
"""

import argparse
import json
import os
import re
import urllib.request
import urllib.parse
import urllib.error

CONFIG_PATH = "/root/projects/geo/config/notify.json"

# ============================================================
# Markdown → 飞书 Blocks 转换函数
# ============================================================

def parse_inline(text: str) -> list:
    """解析行内样式，返回 text_run elements 列表
    
    支持：**bold**、*italic*、`code`、~~strike~~
    """
    if not text:
        return [{"text_run": {"content": ""}}]
    
    elements = []
    # 按标记切割：**bold**、*italic*、`code`、~~strike~~
    parts = re.split(r'(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~)', text)
    
    for part in parts:
        if not part:
            continue
        
        style = {}
        content = part
        
        if part.startswith('**') and part.endswith('**'):
            content = part[2:-2]
            style['bold'] = True
        elif part.startswith('*') and part.endswith('*') and not part.startswith('**'):
            content = part[1:-1]
            style['italic'] = True
        elif part.startswith('`') and part.endswith('`'):
            content = part[1:-1]
            style['inline_code'] = True
        elif part.startswith('~~') and part.endswith('~~'):
            content = part[2:-2]
            style['strikethrough'] = True
        
        elem = {"text_run": {"content": content}}
        if style:
            elem["text_run"]["text_element_style"] = style
        elements.append(elem)
    
    return elements if elements else [{"text_run": {"content": text}}]


def text_block(block_type: int, text: str) -> dict:
    """创建 Text block (block_type: 2=Text)"""
    elements = parse_inline(text)
    return {
        "block_type": block_type,
        "text": {"elements": elements, "style": {}}
    }


def heading_block(block_type: int, text: str) -> dict:
    """创建 Heading block
    
    block_type=3 → heading1, block_type=4 → heading2, block_type=5 → heading3
    """
    field_name = {3: "heading1", 4: "heading2", 5: "heading3"}.get(block_type, "heading1")
    return {
        "block_type": block_type,
        field_name: {"elements": [{"text_run": {"content": text}}], "style": {}}
    }


def bullet_block(text: str) -> dict:
    """创建 Bullet list block (block_type=12)"""
    elements = parse_inline(text)
    return {
        "block_type": 12,
        "bullet": {"elements": elements, "style": {}}
    }


def ordered_block(text: str, index: int = 1) -> dict:
    """创建 Ordered list block (block_type=13)"""
    elements = parse_inline(text)
    return {
        "block_type": 13,
        "ordered": {"elements": elements, "style": {}}
    }


def md_line_to_block(line: str) -> dict:
    """把一行 Markdown 转成飞书 Block
    
    返回 None 表示跳过该行（如表格分隔行）
    """
    stripped = line.strip()
    
    # 空行
    if not stripped:
        return text_block(2, "")
    
    # 标题
    if stripped.startswith('### '):
        return heading_block(5, stripped[4:])
    elif stripped.startswith('## '):
        return heading_block(4, stripped[3:])
    elif stripped.startswith('# '):
        return heading_block(3, stripped[2:])
    
    # 分隔线
    if stripped in ('---', '***', '___'):
        return {"block_type": 22, "divider": {}}
    
    # 引用 - 转为普通文本（加缩进符号）
    if stripped.startswith('> '):
        return text_block(2, "▎ " + stripped[2:])
    
    # 无序列表
    if stripped.startswith('- ') or stripped.startswith('* '):
        return bullet_block(stripped[2:])
    
    # 有序列表
    match = re.match(r'^(\d+)\.\s+(.+)$', stripped)
    if match:
        return ordered_block(match.group(2))
    
    # 表格行（跳过分隔行 |---|，其他行转纯文本）
    if stripped.startswith('|'):
        if re.match(r'^\|[\s\-:|]+\|$', stripped):
            return None  # 跳过表格分隔行
        # 表格内容行转为普通文本
        cells = [c.strip() for c in stripped.strip('|').split('|')]
        return text_block(2, ' | '.join(cells))
    
    # 普通段落
    return text_block(2, stripped)


def markdown_to_blocks(content: str) -> list:
    """将 Markdown 内容转换为飞书 Blocks 列表"""
    lines = content.split('\n')
    blocks = []
    
    for line in lines:
        block = md_line_to_block(line)
        if block is not None:
            blocks.append(block)
    
    return blocks


# ============================================================
# 飞书 API 交互函数
# ============================================================

def load_config():
    if not os.path.exists(CONFIG_PATH):
        print(f"Config not found: {CONFIG_PATH}")
        print("Copy config/notify.example.json to config/notify.json and fill in credentials")
        return None
    with open(CONFIG_PATH) as f:
        return json.load(f)


def send_webhook(webhook_url: str, text: str) -> bool:
    """飞书 Webhook 推送"""
    payload = {
        "msg_type": "text",
        "content": {"text": text}
    }
    data = json.dumps(payload).encode()
    req = urllib.request.Request(webhook_url, data=data, method='POST')
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            result = json.loads(r.read())
            return result.get("code") == 0 or result.get("StatusCode") == 0
    except Exception as e:
        print(f"Webhook error: {e}")
        return False


def get_feishu_token(app_id: str, app_secret: str) -> str:
    """获取飞书 tenant_access_token"""
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    payload = json.dumps({"app_id": app_id, "app_secret": app_secret}).encode()
    req = urllib.request.Request(url, data=payload, method='POST')
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            result = json.loads(r.read())
            if result.get("code") != 0:
                print(f"Token error: {result}")
                return ""
            return result.get("tenant_access_token", "")
    except Exception as e:
        print(f"Token request error: {e}")
        return ""


def create_feishu_doc(token: str, title: str) -> tuple:
    """创建飞书文档，返回 (document_id, url)"""
    url = "https://open.feishu.cn/open-apis/docx/v1/documents"
    payload = json.dumps({"title": title}).encode()
    req = urllib.request.Request(url, data=payload, method='POST')
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            result = json.loads(r.read())
            if result.get("code") != 0:
                print(f"Create doc error: {result}")
                return (None, None)
            doc = result.get("data", {}).get("document", {})
            doc_id = doc.get("document_id")
            # 飞书文档 URL 格式（使用企业自定义域名）
            doc_url = f"https://hellotalk.feishu.cn/docx/{doc_id}"
            return (doc_id, doc_url)
    except Exception as e:
        print(f"Create doc request error: {e}")
        return (None, None)


def write_doc_content(token: str, document_id: str, content: str) -> bool:
    """将 Markdown 内容写入飞书文档（转换为飞书原生 Blocks）
    
    支持：标题、列表、引用、分隔线、行内样式（粗体、斜体、代码、删除线）
    表格转为纯文本行
    """
    blocks = markdown_to_blocks(content)
    
    if not blocks:
        print("No blocks to write")
        return False
    
    print(f"Total blocks to write: {len(blocks)}")
    
    # 飞书 API 每批最多 50 个 block
    batch_size = 50
    all_success = True
    
    for batch_idx in range(0, len(blocks), batch_size):
        batch = blocks[batch_idx:batch_idx + batch_size]
        
        url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{document_id}/blocks/{document_id}/children"
        payload = json.dumps({"children": batch, "index": -1}).encode()
        
        req = urllib.request.Request(url, data=payload, method='POST')
        req.add_header("Content-Type", "application/json")
        req.add_header("Authorization", f"Bearer {token}")
        
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                result = json.loads(r.read())
                if result.get("code") != 0:
                    print(f"Write block error at batch {batch_idx // batch_size}: {result}")
                    all_success = False
                else:
                    print(f"  Batch {batch_idx // batch_size + 1}: {len(batch)} blocks written")
        except urllib.error.HTTPError as e:
            error_body = e.read().decode()
            print(f"HTTP Error {e.code} at batch {batch_idx // batch_size}: {error_body}")
            all_success = False
        except Exception as e:
            print(f"Write block request error at batch {batch_idx // batch_size}: {e}")
            all_success = False
    
    return all_success


def upload_report_to_feishu(app_id: str, app_secret: str, title: str, content: str) -> str:
    """上传报告到飞书文档，返回文档 URL"""
    token = get_feishu_token(app_id, app_secret)
    if not token:
        print("Failed to get feishu token")
        return None
    
    print("Creating Feishu document...")
    doc_id, doc_url = create_feishu_doc(token, title)
    if not doc_id:
        print("Failed to create document")
        return None
    
    print(f"Doc created: {doc_url}")

    # 设置三层权限：组织内有链接可读 + 报告群可查看 + 主人可管理
    try:
        # 1. 组织内有链接可读
        perm_url = f"https://open.feishu.cn/open-apis/drive/v1/permissions/{doc_id}/public?type=docx"
        perm_payload = json.dumps({
            "link_share_entity": "tenant_readable",
            "security_entity": "anyone_can_view",
            "comment_entity": "anyone_can_view"
        }).encode()
        perm_req = urllib.request.Request(perm_url, data=perm_payload, method='PATCH')
        perm_req.add_header("Content-Type", "application/json")
        perm_req.add_header("Authorization", f"Bearer {token}")
        with urllib.request.urlopen(perm_req, timeout=10) as r:
            perm_result = json.loads(r.read())
            if perm_result.get("code") == 0:
                print("Doc permission set: tenant_readable")
            else:
                print(f"Permission warning: {perm_result}")

        def add_doc_member(member_type, member_id, perm):
            mem_url = f"https://open.feishu.cn/open-apis/drive/v1/permissions/{doc_id}/members?type=docx&need_notification=false"
            mem_payload = json.dumps({"member_type": member_type, "member_id": member_id, "perm": perm}).encode()
            mem_req = urllib.request.Request(mem_url, data=mem_payload, method='POST')
            mem_req.add_header("Content-Type", "application/json")
            mem_req.add_header("Authorization", f"Bearer {token}")
            with urllib.request.urlopen(mem_req, timeout=10) as r:
                return json.loads(r.read())

        # 2. 报告群成员可查看
        feishu_cfg = json.load(open(CONFIG_PATH)).get("feishu", {})
        for target in feishu_cfg.get("targets", []):
            if target.get("enabled") and target.get("chat_id"):
                r = add_doc_member("openchat", target["chat_id"], "view")
                if r.get("code") == 0:
                    print(f"Doc shared to chat: {target['name']}")

        # 3. 主人可管理（full_access）
        owner_id = feishu_cfg.get("owner_openid", "")
        if owner_id:
            r = add_doc_member("openid", owner_id, "full_access")
            if r.get("code") == 0:
                print(f"Doc owner set: full_access")

    except Exception as e:
        print(f"Permission set warning (non-fatal): {e}")

    print("Uploading content...")
    write_doc_content(token, doc_id, content)

    return doc_url


def send_webhook_chunked(webhook_url: str, title: str, content: str):
    """分段发送长文本（降级方案）"""
    max_chunk = 3000
    if len(content) <= max_chunk:
        return send_webhook(webhook_url, content)
    
    # 分段发送
    chunks = []
    for i in range(0, len(content), max_chunk):
        chunk = content[i:i+max_chunk]
        if i + max_chunk < len(content):
            chunk += f"\n\n...(第 {i//max_chunk + 1} 段，共 {(len(content) + max_chunk - 1)//max_chunk} 段)"
        chunks.append(chunk)
    
    success = True
    for i, chunk in enumerate(chunks):
        prefix = f"【{title} - 第{i+1}/{len(chunks)}段】\n\n"
        if not send_webhook(webhook_url, prefix + chunk):
            success = False
    return success


def format_report(report_path: str) -> str:
    """读取报告完整内容"""
    with open(report_path) as f:
        return f.read()


def notify(report_path: str, report_type: str = "weekly"):
    config = load_config()
    if not config:
        return False

    feishu_cfg = config.get("feishu", {})
    content = format_report(report_path)
    title = os.path.basename(report_path).replace('.md', '')

    success_count = 0
    for target in feishu_cfg.get("targets", []):
        if not target.get("enabled"):
            continue
        if report_type not in target.get("report_types", [report_type]):
            continue

        print(f"Sending to: {target['name']} ({target['chat_id']})")

        webhook = feishu_cfg.get("webhook_url", "")
        app_id = feishu_cfg.get("app_id")
        app_secret = feishu_cfg.get("app_secret")

        # 如果配置了 app_id/secret，上传文档并发链接
        if app_id and app_secret and webhook:
            print("Uploading to Feishu doc...")
            doc_url = upload_report_to_feishu(app_id, app_secret, title, content)
            
            if doc_url:
                # 提取摘要（前300字）
                summary = content[:300]
                if len(content) > 300:
                    summary += "..."
                msg = f"📊 GEO 周报已生成\n\n{summary}\n\n📄 完整报告：{doc_url}"
                ok = send_webhook(webhook, msg)
            else:
                # 降级：分段发送
                print("Doc upload failed, falling back to chunked send")
                ok = send_webhook_chunked(webhook, title, content)
        # 否则降级分段文字发送
        elif webhook:
            ok = send_webhook_chunked(webhook, title, content)
        else:
            print(f"  No webhook configured for {target['name']}, skipping")
            continue

        if ok:
            print(f"  ✅ Sent successfully")
            success_count += 1
        else:
            print(f"  ❌ Failed")

    return success_count > 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", required=True, help="Report file path")
    parser.add_argument("--type", default="weekly", help="Report type (weekly/brand_check/daily)")
    args = parser.parse_args()

    if not os.path.exists(args.report):
        print(f"Report not found: {args.report}")
        exit(1)

    success = notify(args.report, args.type)
    exit(0 if success else 1)
