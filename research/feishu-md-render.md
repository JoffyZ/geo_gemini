# 飞书文档 Markdown 渲染实现路径调研报告

**调研时间**: 2026-03-10  
**调研人**: Scout  
**目标**: 找到 Python 脚本将 Markdown 报告写入飞书云文档并正确渲染的最优方案

---

## 📌 核心结论（TL;DR）

| 路径 | 可行性 | 推荐度 | 落地难度 |
|------|--------|--------|----------|
| **A. 原生 Blocks API** | ✅ 可行 | ⭐⭐⭐ 推荐 | 中等 |
| **B. feishu-docx 库** | ✅ 可行 | ⭐⭐⭐⭐⭐ **强烈推荐** | **极低（今天可用）** |
| **C. 导入接口** | ❌ 不可行 | - | - |
| **D. HTML 导入** | ⚠️ 需验证 | ⭐⭐ 备选 | 高 |

**最快落地方案**: 使用 `feishu-docx` 库的 `write` 命令直接追加 Markdown 内容到飞书文档。

---

## 路径 A：飞书原生 docx blocks API

### 可行性评估
**✅ 可行，但工作量大**

### 技术细节

飞书 docx API 使用 Block 结构来组织文档内容，支持 30+ 种 block_type：

| Markdown 元素 | 对应 Block Type | 说明 |
|---------------|-----------------|------|
| 文档标题 | `1` (page) | 根节点 |
| 一级标题 | `2` (heading1) | heading1 字段 |
| 二级标题 | `3` (heading2) | heading2 字段 |
| 三级标题 | `4` (heading3) | heading3 字段 |
| 正文段落 | `5` (text) | text 字段，支持 text_run 样式 |
| 无序列表 | `6` (bulleted_list) | 列表项 |
| 有序列表 | `7` (numbered_list) | 列表项 |
| 代码块 | `14` (code) | code 字段，支持 language 属性 |
| 表格 | `18` (table) | table 字段，需定义行列结构 |
| 引用 | `24` (quote) | quote 字段 |
| 分割线 | `22` (divider) | 简单块 |

### 写入 API
```
POST /docx/v1/documents/{id}/blocks/{id}/children
```

### 典型坑点
1. **嵌套结构复杂**: 列表项需要嵌套 paragraph 块，表格需要 cell → paragraph 层级
2. **样式需单独配置**: 粗体、斜体等通过 `text_element_style` 字段控制
3. **图片需先上传**: 图片 block 需要 file_token，需先调用上传接口
4. **API 调用次数限制**: 大量 blocks 需要批量创建

### 工作量评估
- 需自行实现 Markdown parser → Block 结构转换
- 约需 200-500 行代码处理各种边界情况
- 测试调试周期较长

---

## 路径 B：现成的 Python 库 `feishu-docx`

### 可行性评估
**✅ 可行，强烈推荐**

### 库信息
- **GitHub**: https://github.com/leemysw/feishu-docx
- **PyPI**: `pip install feishu-docx`
- **维护状态**: ⭐ 活跃（最近更新 2026-01，支持 Claude Skills）
- **License**: MIT

### 核心功能
该库已经实现了 **Markdown → 飞书 Blocks** 的完整转换：

| 功能 | 支持情况 |
|------|----------|
| 标题 (H1-H3) | ✅ 完全支持 |
| 粗体/斜体/删除线 | ✅ 完全支持 |
| 有序/无序列表 | ✅ 完全支持 |
| 代码块 | ✅ 支持 70+ 语言 |
| 表格 | ✅ 支持 |
| 图片 | ✅ 自动上传 |
| 引用块 | ✅ 支持 |
| 分割线 | ✅ 支持 |

### 使用方法

**CLI 方式（最简单）**:
```bash
# 安装
pip install feishu-docx

# 配置凭证（一次）
feishu-docx config set --app-id YOUR_APP_ID --app-secret YOUR_APP_SECRET

# 写入 Markdown 到飞书文档
feishu-docx write "https://xxx.feishu.cn/docx/xxx" --content "$(cat report.md)"
```

**Python API 方式**:
```python
from feishu_docx import FeishuExporter

exporter = FeishuExporter(app_id="xxx", app_secret="xxx")

# 追加 Markdown 内容到文档
exporter.write("https://xxx.feishu.cn/docx/xxx", content="# 报告标题\n\n内容...")

# 或创建新文档
exporter.create(title="新报告", content="# 标题\n正文...")
```

### 优势
- ✅ **今天就能用** - pip install 后直接可用
- ✅ **自动处理 Token** - 支持 tenant_access_token，无需 OAuth 交互
- ✅ **完整 Markdown 支持** - 已处理各种边界情况
- ✅ **活跃维护** - 作者持续更新，支持 Claude Skills

### 劣势
- 需要申请飞书应用权限
- 依赖外部库（但依赖很轻）

---

## 路径 C：飞书导入接口

### 可行性评估
**❌ 不可行**

### 调研结果

飞书 Drive 导入 API (`POST /drive/v1/import_tasks`) **不支持 Markdown 格式**。

**官方支持的导入格式**（根据飞书帮助文档）：
- ✅ Word (.doc, .docx)
- ✅ Excel (.xls, .xlsx)
- ✅ PowerPoint (.ppt, .pptx)
- ✅ PDF (.pdf)
- ❌ **不支持 Markdown (.md)**
- ❌ **不支持 HTML (.html)**

### 结论
此路径无法直接使用，需先转换为 Word 格式再导入，但这样会增加格式丢失风险。

---

## 路径 D：转成 HTML 再导入

### 可行性评估
**⚠️ 需验证，不推荐**

### 技术路径
```
Markdown → Python markdown 库 → HTML → 飞书导入
```

### 问题
1. **飞书不支持 HTML 导入** - 导入接口只支持 docx/xlsx/pptx/pdf
2. **HTML 粘贴方案** - 可以尝试将 HTML 粘贴到飞书文档，但：
   - 飞书文档的粘贴 HTML 支持有限
   - 复杂表格、代码块格式可能丢失
   - 需要模拟剪贴板操作，不稳定

### 结论
此路径风险高，不建议采用。

---

## 🏆 推荐方案

### 最快落地方案（今天可用）

**使用 `feishu-docx` 库**

```python
# notify.py 示例代码
import subprocess
import os

def write_to_feishu(doc_url, markdown_content, app_id, app_secret):
    """将 Markdown 报告写入飞书文档"""
    
    # 方式1: 使用 CLI（最简单）
    # 先配置凭证
    subprocess.run([
        "feishu-docx", "config", "set",
        "--app-id", app_id,
        "--app-secret", app_secret
    ], check=True)
    
    # 写入内容
    subprocess.run([
        "feishu-docx", "write", doc_url,
        "--content", markdown_content
    ], check=True)

# 方式2: 使用 Python API
from feishu_docx import FeishuExporter

def write_report(doc_url, markdown_file):
    exporter = FeishuExporter(
        app_id=os.getenv("FEISHU_APP_ID"),
        app_secret=os.getenv("FEISHU_APP_SECRET")
    )
    
    with open(markdown_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    exporter.write(doc_url, content=content)
```

### 实施步骤

1. **申请飞书应用权限**（10分钟）
   - 访问 https://open.feishu.cn/
   - 创建企业自建应用
   - 申请权限：`docx:document:write`, `docx:document:readonly`

2. **安装依赖**（1分钟）
   ```bash
   pip install feishu-docx
   ```

3. **修改 notify.py**（30分钟）
   - 集成 feishu-docx 写入功能
   - 测试各种 Markdown 元素渲染效果

---

## 备选方案

如果无法使用 `feishu-docx` 库（如网络限制），可考虑：

1. **自行实现 Blocks API 调用**
   - 参考 feishu-docx 源码实现转换逻辑
   - 工作量约 2-3 天

2. **Markdown → Word → 飞书**
   - 使用 `python-docx` 或 `pandoc` 转换
   - 格式可能丢失，不推荐

---

## 参考资料

1. feishu-docx GitHub: https://github.com/leemysw/feishu-docx
2. 飞书文档 Block 数据结构: https://open.feishu.cn/document/server-docs/docs/docs/docx-v1/docx-structure
3. 飞书导入 API 文档: https://open.feishu.cn/document/server-docs/docs/drive-v1/import_task/import-user-guide
4. 飞书导出 API 文档: https://open.feishu.cn/document/server-docs/docs/drive-v1/export_task/export-user-guide

---

**报告完成时间**: 2026-03-10 09:15 UTC
