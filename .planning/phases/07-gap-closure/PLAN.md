---
phase: 07-gap-closure
plan: 01
type: execute
wave: 1
depends_on: [06-03]
files_modified: [src/lib/actions/brands.ts, src/app/dashboard/brands/page.tsx, src/app/dashboard/layout.tsx, src/app/page.tsx]
autonomous: true
requirements: [GAP-001, GAP-002]

must_haves:
  truths:
    - "用户可以在 UI 中自由添加、编辑和删除自家品牌及竞品"
    - "侧边栏导航包含‘品牌管理’入口"
    - "访问首页自动跳转至 Dashboard"
---

<objective>
补全 Milestone v1.0 审计中发现的核心缺口：实现品牌管理 UI 及优化首页导航逻辑。
</objective>

<tasks>

<task type="auto">
  <name>T033: Brand CRUD Server Actions</name>
  <files>src/lib/actions/brands.ts</files>
  <action>
    1. 在 `src/lib/actions/brands.ts` 中实现：
       - `getBrands()`: 获取当前租户下的所有品牌。
       - `createBrand(data)`: 创建品牌，支持 `isCompetitor` 标记。
       - `updateBrand(id, data)`: 修改品牌信息。
       - `deleteBrand(id)`: 删除品牌。
    2. 确保集成 `getTenantId()` 认证。
  </action>
  <done>后端品牌管理逻辑交付。</done>
</task>

<task type="auto">
  <name>T034: Brand Management UI & Sidebar Integration</name>
  <files>src/app/dashboard/brands/page.tsx, src/app/dashboard/layout.tsx</files>
  <action>
    1. 创建 `src/app/dashboard/brands/page.tsx`：实现包含 Data Table 和 Form 的管理页面。
    2. 页面需支持按“品牌”和“竞品”进行分类展示。
    3. 修改 `src/app/dashboard/layout.tsx`：在导航栏中增加“品牌管理”项（使用 Shield 或 Building 磁贴图标）。
  </action>
  <done>前端品牌管理界面交付。</done>
</task>

<task type="auto">
  <name>T035: Home Page Redirection</name>
  <files>src/app/page.tsx</files>
  <action>
    1. 修改根页面 `src/app/page.tsx`。
    2. 实现 Next.js `redirect('/dashboard')` 逻辑，确保用户进入应用后直达核心看板。
  </action>
  <done>入口导航优化完成。</done>
</task>

</tasks>
