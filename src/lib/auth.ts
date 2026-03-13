import { createClient } from './supabase-server'

/**
 * getTenantId:
 * 1. 从 Supabase Session 中提取当前登录用户的 UID。
 * 2. 在 v1 版中，我们假设 user.id 即为 tenant_id。
 */
export async function getTenantId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // 简化方案: 对于 v1 版，假设 user.id 即为 tenant_id
  return user.id
}

/**
 * getSession:
 * 获取当前用户的会话信息
 */
export async function getSession() {
  const supabase = await createClient()
  return supabase.auth.getSession()
}

/**
 * getUser:
 * 获取当前用户信息
 */
export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
