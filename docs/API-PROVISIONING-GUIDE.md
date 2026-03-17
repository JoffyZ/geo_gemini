# GEO 监测系统 API 开通与联网激活全指南 (小白级)

本指南涵盖了获取 Key 以及**激活联网搜索能力**的关键配置步骤。

---

## 1. 谷歌云 (Google Cloud / Vertex AI)
**核心动作**：获取 Key 并确保服务账号有权“联网”。

### A. 获取 Key (略，参考前文)
### B. 关键授权 (必做)
1.  在 Google Cloud Console 搜索 **"IAM & Admin"**。
2.  在列表中找到你创建的 Service Account。
3.  点击右侧的编辑图标，确保角色（Role）包含：
    *   **Vertex AI User** (允许调用模型)
    *   **Service Usage Consumer** (允许使用 Google 基础资源)
4.  搜索 **"Vertex AI"** -> "Dashboard"，确保页面顶部没有“API 已禁用”的警告。

---

## 2. 微软 Azure (Azure OpenAI)
**核心动作**：部署模型并**手动关联 Bing 搜索插件**。

### A. 获取 Key & Endpoint (略，参考前文)
### B. 激活联网搜索 (必做)
1.  进入 [Azure AI Foundry](https://ai.azure.com/)。
2.  选择你的项目，点击左侧 **"Chat"**。
3.  在中间面板找到 **"Add your data (preview)"** 选项卡。
4.  点击 **"+ Add a data source"**。
5.  在下拉菜单选择 **"Web search"**。
6.  系统会提示你连接一个 Bing 搜索资源（如果没有，点击新建一个，通常选 F0 免费层即可）。
7.  **保存配置**：确保在 "Chat" 页面勾选了 "Limit responses to your data content" 旁边的搜索开关。

---

## 3. Perplexity AI
**核心动作**：Key + 充值。

1.  访问 [Perplexity Settings](https://www.perplexity.ai/settings/api)。
2.  **必做**：点击 **"Buy Credits"** 充值至少 5 美元（它没有免费额度，余额为 0 时 Key 无效）。

---

## 4. SerpApi (Google 搜索抓取)
**核心动作**：注册并获取 Key（用于 GAIO 专项监测）。

1.  **注册账号**：访问 [SerpApi 官网](https://serpapi.com/) 并注册。
2.  **获取 Key**：登录后，在 Dashboard 顶部正中间找到 `Your API Key`。
3.  **动作**：复制这个以 `api_key=` 开头的字符串（初始有 100 次/月免费额度）。

---

## 5. 坐标库 (GeoMatrix) —— 系统内置说明
为了让 API 模拟不同国家，系统代码已内置以下默认坐标：

| 国家 | 模拟城市 | 坐标 (Lat, Lng) |
| :--- | :--- | :--- |
| 美国 (US) | 纽约 | 40.7128, -74.0060 |
| 英国 (GB) | 伦敦 | 51.5074, -0.1278 |
| 中国 (CN) | 上海 | 31.2304, 121.4737 |
| 日本 (JP) | 东京 | 35.6895, 139.6917 |

---

## 💡 凭证汇总清单 (发给 Gemini CLI 使用)

当你配置完成后，请将以下信息填入 `.env` 文件：
- **Vertex**: `JSON Key 路径` + `Project ID`
- **Azure**: `API Key` + `Endpoint` + `Deployment Name`
- **Perplexity**: `API Key`
- **SerpApi**: `API Key`

---
*再次为之前的遗漏道歉。现在这份指南包含了所有四个厂商的完整闭环流程。*

GEO 项目检测prompt 品牌提及率和排名，联网搜索网址引用来源追踪，每日监测问题数：~100 个，暂时先按照每日监测的频率预估