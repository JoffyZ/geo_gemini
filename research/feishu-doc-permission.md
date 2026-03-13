# 飞书文档权限调研报告

## 结论（最重要，放最前）

### 要让 Bot 创建的文档对租户内所有人可读，需要：
1. **调用 `PATCH /drive/v1/permissions/{token}/public?type=docx` 设置链接分享权限**
   - 设置 `link_share_entity: tenant_readable`（组织内获得链接的人可阅读）
   - 或设置 `link_share_entity: anyone_readable`（互联网上获得链接的任何人可阅读，完全公开）
2. **关键：同时需要设置 `external_access: true` 和 `share_entity`**
3. **必须开通的权限 scope**：`drive:drive` 或 `drive:drive:readonly`（已具备）

### 要添加指定用户为协作者，需要：
- **API**: `POST /drive/v1/permissions/{token}/members?type=docx`
- **参数**：
  - `member_type`: `openid` / `userid` / `email` / `openchat`
  - `member_id`: 对应类型的用户标识
  - `perm`: `view`（可阅读）/ `edit`（可编辑）/ `full_access`（所有权限）
- **注意**：使用 `tenant_access_token` 时不支持 `opendepartmentid`

### 需要额外开通的权限 scope：
- **当前已有权限足够**，无需额外 scope
- 但建议确认是否开通：
  - `drive:drive`（查看、评论、编辑和管理云空间中所有文件）- **已具备**
  - `docx:document`（创建及编辑新版文档）- **已具备**

---

## 问题根因分析

### 为什么 `PATCH /drive/v1/permissions/{doc_id}/public` 返回成功但用户仍无法打开？

**可能原因：**

1. **文档归属问题**：
   - 使用 `tenant_access_token` 创建的文档，**归属为应用（Bot）本身**，而非某个具体用户
   - 文档 owner 是应用，这本身不是问题

2. **权限设置不完整**：
   - 仅设置 `link_share_entity: tenant_readable` 不够
   - 需要同时设置 `external_access: true` 才能允许组织内访问
   - 需要设置 `share_entity` 控制谁可以添加协作者

3. **用户不在应用可用范围内**：
   - 检查应用的"可用范围"设置，确保目标用户在应用可见范围内
   - 如果用户不在应用可用范围内，即使设置了 `tenant_readable` 也无法访问

4. **企业安全策略限制**：
   - 企业管理员可能在飞书管理后台设置了文档分享限制
   - 例如：禁止文档被分享到组织外，或限制链接分享

---

## 正确的 API 调用方式

### 1. 设置文档公开权限（组织内可读）

```bash
PATCH https://open.feishu.cn/open-apis/drive/v1/permissions/{token}/public?type=docx

Headers:
  Authorization: Bearer {tenant_access_token}
  Content-Type: application/json

Body:
{
  "external_access": true,              // 允许内容被分享到组织外（租户内分享需要）
  "security_entity": "anyone_can_view", // 谁可以复制/下载：拥有可阅读权限的用户
  "comment_entity": "anyone_can_view",  // 谁可以评论：拥有可阅读权限的用户
  "share_entity": "anyone",             // 谁可以添加协作者：所有可阅读或编辑的用户
  "link_share_entity": "tenant_readable", // 链接分享：组织内获得链接的人可阅读
  "invite_external": true               // 允许非管理权限的人分享到组织外
}
```

**`link_share_entity` 可选值：**
- `tenant_readable`: 组织内获得链接的人可阅读 ✅ **推荐**
- `tenant_editable`: 组织内获得链接的人可编辑
- `anyone_readable`: 互联网上获得链接的任何人可阅读（完全公开）
- `anyone_editable`: 互联网上获得链接的任何人可编辑
- `closed`: 关闭链接分享

### 2. 添加指定用户为协作者

```bash
POST https://open.feishu.cn/open-apis/drive/v1/permissions/{token}/members?type=docx&need_notification=false

Headers:
  Authorization: Bearer {tenant_access_token}
  Content-Type: application/json

Body:
{
  "member_type": "openid",      // 可选：openid / userid / email / openchat
  "member_id": "ou_xxxxxxxx",   // 用户的 openid
  "perm": "view"                // 可选：view / edit / full_access
}
```

**`member_type` 说明：**
- `openid`: 开放平台 ID（推荐）
- `userid`: 用户自定义 ID
- `email`: 飞书邮箱
- `openchat`: 开放平台群组 ID
- ~~`opendepartmentid`~~: 不支持（tenant_access_token 模式下）

**`perm` 权限级别：**
- `view`: 可阅读
- `edit`: 可编辑
- `full_access`: 所有权限（包括管理权限）

### 3. 批量添加协作者

```bash
POST https://open.feishu.cn/open-apis/drive/v1/permissions/{token}/members/batch_create?type=docx

Body:
{
  "members": [
    {
      "member_type": "openid",
      "member_id": "ou_xxxx1",
      "perm": "view"
    },
    {
      "member_type": "openid",
      "member_id": "ou_xxxx2",
      "perm": "edit"
    }
  ]
}
```

---

## 替代方案

### 方案1：在共享文件夹下创建文档

**优点**：文件夹内的文件会**默认继承文件夹的协作者和权限设置**

**步骤**：
1. 创建共享文件夹并设置权限
2. 在该文件夹下创建文档
3. 文档自动继承文件夹的协作者

**API**：
```bash
# 创建文件夹
POST /drive/v1/files/create_folder

# 设置文件夹权限
PATCH /drive/v1/permissions/{folder_token}/public?type=folder

# 在文件夹下创建文档
POST /docx/v1/documents
Body: { "folder_token": "foldxxxx" }
```

### 方案2：使用 Wiki（知识库）

**优点**：
- Wiki 天然支持组织内共享
- 可以设置"组织内所有人可见"
- 权限管理更灵活

**权限 scope 需要**：`wiki:wiki` 或 `wiki:wiki:readonly`

**API**：
```bash
# 创建 Wiki 节点
POST /wiki/v2/spaces/{space_id}/nodes

# 添加 Wiki 协作者
POST /drive/v1/permissions/{wiki_token}/members
```

**注意**：Wiki 暂不支持 `link_share_entity` 的 `anyone_readable`/`anyone_editable` 设置

### 方案3：创建时直接指定协作者

在创建文档后，立即调用添加协作者 API，将需要访问的用户添加为协作者。

---

## 故障排查建议

### 如果用户仍无法打开文档：

1. **检查应用可用范围**
   - 进入飞书开发者后台 → 应用 → 可用范围
   - 确保目标用户在使用范围内

2. **检查企业安全设置**
   - 飞书管理后台 → 云文档 → 安全设置
   - 确认没有限制文档分享

3. **验证权限设置是否成功**
   ```bash
   GET /drive/v1/permissions/{token}/public?type=docx
   ```

4. **检查用户身份**
   - 确保用户已登录飞书
   - 用户必须属于同一租户

5. **文档类型匹配**
   - 确保 `type` 参数与文档实际类型匹配
   - docx 文档使用 `type=docx`，不是 `type=doc`

---

## 参考文档链接

1. **更新云文档权限设置 API**: https://open.feishu.cn/document/server-docs/docs/drive-v1/permission/public-settings/patch
2. **增加权限（添加协作者）API**: https://open.feishu.cn/document/server-docs/docs/drive-v1/permission/member/create
3. **权限概述**: https://open.feishu.cn/document/server-docs/docs/drive-v1/permission/overview
4. **API 权限列表**: https://open.feishu.cn/document/ukTMukTMukTM/uYTM5UjL2ETO14iNxkTN/scope-list
5. **飞书 API 文档（Apifox）**: https://feishu.apifox.cn/

---

## 关键结论总结

| 问题 | 解决方案 |
|------|----------|
| Bot 创建文档默认归属 | 归属应用（Bot）本身，这是正常行为 |
| `tenant_readable` 无效 | 需同时设置 `external_access: true`，并检查应用可用范围 |
| 完全公开（无需登录） | 使用 `link_share_entity: anyone_readable` |
| 添加协作者 | 使用 `POST /drive/v1/permissions/{token}/members`，支持 openid/userid/email |
| 需要额外 scope | 当前已有权限足够，无需额外申请 |
| 文件夹继承 | 在共享文件夹下创建文档可自动继承权限 |
| Wiki 替代 | Wiki 更适合组织内共享，但不支持完全公开 |
