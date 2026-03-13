#!/usr/bin/env python3
"""
GEO 报告推送脚本 v2 - 使用 feishu-docx 库实现完整 Markdown 渲染
用法：python3 src/notify_v2.py --report reports/xxx.md --type weekly

与 notify.py 的区别：
- 使用 feishu-docx 库代替自己实现的 Markdown → Blocks 转换
- 完整支持 Markdown 渲染，包括表格、标题、粗体、分隔线等
- 接口保持一致：notify(report_path, report_type)
"""

import argparse
import json
import os
import urllib.request
import urllib.parse
import urllib.error

CONFIG_PATH = "/root/projects/geo/config/notify.json"


def load_config():
    """加载配置文件"""
    if not os.path.exists(CONFIG_PATH):
        print(f"Config not found: {CONFIG_PATH}")
        print("Copy config/notify.example.json to config/notify.json and fill in credentials")
        return None
    with open(CONFIG_PATH) as f:
        return json.load(f)


def send_webhook(webhook_url: str, text: str) -> bool:
    """飞书 Webhook 推送消息"""
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


def set_doc_permissions(token: str, doc_id: str, feishu_cfg: dict) -> bool:
    """设置文档权限（三层权限）
    
    1. 组织内有链接可读 (tenant_readable)
    2. 报告群成员可查看 (view)
    3. 主人可管理 (full_access)
    """
    success = True
    
    # 1. 组织内有链接可读
    try:
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
                print("  Permission set: tenant_readable")
            else:
                print(f"  Permission warning: {perm_result}")
    except Exception as e:
        print(f"  Permission set warning: {e}")
        success = False
    
    # 2. 报告群成员可查看
    for target in feishu_cfg.get("targets", []):
        if target.get("enabled") and target.get("chat_id"):
            try:
                mem_url = f"https://open.feishu.cn/open-apis/drive/v1/permissions/{doc_id}/members?type=docx&need_notification=false"
                mem_payload = json.dumps({
                    "member_type": "openchat",
                    "member_id": target["chat_id"],
                    "perm": "view"
                }).encode()
                mem_req = urllib.request.Request(mem_url, data=mem_payload, method='POST')
                mem_req.add_header("Content-Type", "application/json")
                mem_req.add_header("Authorization", f"Bearer {token}")
                with urllib.request.urlopen(mem_req, timeout=10) as r:
                    r_result = json.loads(r.read())
                    if r_result.get("code") == 0:
                        print(f"  Doc shared to chat: {target['name']}")
            except Exception as e:
                print(f"  Share to chat warning: {e}")
    
    # 3. 主人可管理（full_access）
    owner_id = feishu_cfg.get("owner_openid", "")
    if owner_id:
        try:
            mem_url = f"https://open.feishu.cn/open-apis/drive/v1/permissions/{doc_id}/members?type=docx&need_notification=false"
            mem_payload = json.dumps({
                "member_type": "openid",
                "member_id": owner_id,
                "perm": "full_access"
            }).encode()
            mem_req = urllib.request.Request(mem_url, data=mem_payload, method='POST')
            mem_req.add_header("Content-Type", "application/json")
            mem_req.add_header("Authorization", f"Bearer {token}")
            with urllib.request.urlopen(mem_req, timeout=10) as r:
                r_result = json.loads(r.read())
                if r_result.get("code") == 0:
                    print(f"  Doc owner set: full_access")
        except Exception as e:
            print(f"  Set owner permission warning: {e}")
    
    return success


def upload_report_to_feishu(app_id: str, app_secret: str, title: str, content: str, feishu_cfg: dict) -> str:
    """上传报告到飞书文档，返回文档 URL
    
    使用 feishu-docx 库实现完整的 Markdown 渲染
    修复：docx.v1.document.convert 不支持 tenant_access_token，
         改用本地 converter（use_native_api=False）绕过该 API
    """
    from feishu_docx.auth.tenant import TenantAuthenticator
    from feishu_docx.core.sdk import FeishuSDK
    from feishu_docx.core.writer import FeishuWriter
    
    # 1. 获取 tenant_access_token
    print("Getting tenant access token...")
    auth = TenantAuthenticator(app_id=app_id, app_secret=app_secret)
    token = auth.get_token()
    print(f"  Token obtained (expires in ~2 hours)")
    
    # 2. 创建 SDK（token_type=tenant，与 TenantAuthenticator 匹配）
    sdk = FeishuSDK(token_type="tenant")
    writer = FeishuWriter(sdk)
    
    # 3. 先创建空白文档
    print(f"Creating document: {title}")
    doc = sdk.docx.create_document(title=title, access_token=token)
    doc_id = doc["document_id"]

    # 4. 用本地 converter 写入（绕过不支持 tenant token 的 convert_markdown API）
    writer.write_content(
        document_id=doc_id,
        content=content,
        user_access_token=token,
        use_native_api=False,
    )

    result = {"document_id": doc_id}
    
    doc_id = result["document_id"]
    # 使用企业自定义域名构建 URL
    tenant_domain = feishu_cfg.get("tenant_domain", "hellotalk")
    doc_url = f"https://{tenant_domain}.feishu.cn/docx/{doc_id}"
    
    print(f"  Document created: {doc_url}")
    
    # 4. 设置权限
    print("Setting permissions...")
    set_doc_permissions(token, doc_id, feishu_cfg)
    
    return doc_url


def format_report(report_path: str) -> str:
    """读取报告完整内容"""
    with open(report_path) as f:
        return f.read()


def notify(report_path: str, report_type: str = "weekly") -> bool:
    """推送报告到飞书
    
    Args:
        report_path: 报告文件路径
        report_type: 报告类型 (weekly/brand_check/daily)
    
    Returns:
        是否推送成功
    """
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
            try:
                doc_url = upload_report_to_feishu(app_id, app_secret, title, content, feishu_cfg)
                
                # 提取摘要（前300字）
                summary = content[:300]
                if len(content) > 300:
                    summary += "..."
                msg = f"📊 GEO 周报已生成\n\n{summary}\n\n📄 完整报告：{doc_url}"
                ok = send_webhook(webhook, msg)
            except Exception as e:
                print(f"  Doc upload failed: {e}")
                # 降级：发送简短错误通知
                msg = f"📊 GEO 周报生成失败\n\n错误：{e}\n\n请检查日志"
                ok = send_webhook(webhook, msg)
        elif webhook:
            # 降级：分段发送纯文本
            print("  No app credentials, falling back to text-only send")
            max_chunk = 3000
            if len(content) <= max_chunk:
                ok = send_webhook(webhook, content)
            else:
                chunks = []
                for i in range(0, len(content), max_chunk):
                    chunk = content[i:i+max_chunk]
                    if i + max_chunk < len(content):
                        chunk += f"\n\n...(第 {i//max_chunk + 1} 段，共 {(len(content) + max_chunk - 1)//max_chunk} 段)"
                    chunks.append(chunk)
                
                ok = True
                for i, chunk in enumerate(chunks):
                    prefix = f"【{title} - 第{i+1}/{len(chunks)}段】\n\n"
                    if not send_webhook(webhook, prefix + chunk):
                        ok = False
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
    parser = argparse.ArgumentParser(description="GEO 报告推送 - 使用 feishu-docx 库")
    parser.add_argument("--report", required=True, help="报告文件路径")
    parser.add_argument("--type", default="weekly", help="报告类型 (weekly/brand_check/daily)")
    args = parser.parse_args()

    if not os.path.exists(args.report):
        print(f"Report not found: {args.report}")
        exit(1)

    success = notify(args.report, args.type)
    exit(0 if success else 1)
