import { createClient } from './supabase-server'
import { db } from '@/db'
import { tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * getTenantId:
 * 1. 从 Supabase Session 中提取当前登录用户的 UID。
 * 2. 检查 tenants 表中是否存在该 UID 对应的记录。
 * 3. 如果不存在，则自动创建一个个人租户（UID 即 TenantID），确保后续操作不违反外键约束。
 */
export async function getTenantId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Check if tenant exists
  const existingTenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, user.id)
  })

  if (!existingTenant) {
    console.log(`[Auth] Creating missing tenant record for user: ${user.id}`)
    try {
      await db.insert(tenants).values({
        id: user.id,
        name: `${user.email?.split('@')[0]}'s Personal Tenant`
      })
    } catch (error) {
      console.error('[Auth] Failed to auto-create tenant:', error)
      // If it fails due to race condition, it might already exist now
    }
  }

  return user.id
}

/**
 * getSession:
 * 获取当前会话
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
